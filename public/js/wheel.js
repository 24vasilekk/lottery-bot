// Логика рулетки

class WheelManager {
    constructor() {
        this.wheel = document.getElementById('wheel');
        this.spinButton = document.getElementById('spin-button');
        this.isSpinning = false;
        this.rotation = 0;
        this.prizes = WHEEL_PRIZES;
        this.segmentAngle = 360 / this.prizes.length;
        
        this.init();
    }

    init() {
        this.createWheel();
        this.bindEvents();
    }

    createWheel() {
        // Очищаем колесо
        this.wheel.innerHTML = '';
        
        // Создаем сегменты
        this.prizes.forEach((prize, index) => {
            const segment = this.createSegment(prize, index);
            this.wheel.appendChild(segment);
        });
    }

    createSegment(prize, index) {
        const segment = document.createElement('div');
        segment.className = 'wheel-segment';
        
        const angle = this.segmentAngle * index;
        const rotation = angle + this.segmentAngle / 2;
        
        segment.style.transform = `rotate(${angle}deg)`;
        segment.style.background = this.createSegmentGradient(prize.color);
        segment.style.clipPath = this.createSegmentClipPath();
        
        // Создаем контент сегмента
        const content = document.createElement('div');
        content.className = 'segment-content';
        content.style.transform = `rotate(${rotation}deg)`;
        content.innerHTML = `
            <div class="segment-icon">${prize.icon}</div>
            <div class="segment-text">${prize.name}</div>
        `;
        
        segment.appendChild(content);
        return segment;
    }

    createSegmentGradient(baseColor) {
        // Создаем красивый градиент для сегмента
        const lighterColor = this.lightenColor(baseColor, 20);
        const darkerColor = this.darkenColor(baseColor, 20);
        
        return `linear-gradient(135deg, ${lighterColor} 0%, ${baseColor} 50%, ${darkerColor} 100%)`;
    }

    createSegmentClipPath() {
        // Создаем форму сегмента круга
        const angle = this.segmentAngle;
        const halfAngle = angle / 2;
        
        // Вычисляем точки для clip-path
        const startAngle = -halfAngle * Math.PI / 180;
        const endAngle = halfAngle * Math.PI / 180;
        
        const x1 = 50 + 40 * Math.cos(startAngle);
        const y1 = 50 + 40 * Math.sin(startAngle);
        const x2 = 50 + 40 * Math.cos(endAngle);
        const y2 = 50 + 40 * Math.sin(endAngle);
        
        return `polygon(50% 50%, ${x1}% ${y1}%, ${x2}% ${y2}%)`;
    }

    bindEvents() {
        this.spinButton.addEventListener('click', () => {
            this.spin();
        });
    }

    async spin() {
        if (this.isSpinning) return;
        
        // Проверяем подписки на каналы
        if (window.subscriptionChecker) {
            const hasSubscriptions = await window.subscriptionChecker.checkAllSubscriptions();
            if (!hasSubscriptions) {
                return; // Пользователь увидит модал с требованием подписки
            }
        }
        
        // Проверяем, достаточно ли звезд
        const userData = getUserData();
        const spinCost = APP_CONFIG.wheel.starCost; // 20 звезд за прокрутку
        
        if (userData.stats.stars < spinCost) {
            this.showNotification('Недостаточно звезд для прокрутки!', 'error');
            return;
        }

        this.isSpinning = true;
        this.spinButton.disabled = true;
        this.spinButton.innerHTML = '<span>Крутится...</span>';
        
        // Списываем звезды
        userData.stats.stars -= spinCost;
        updateUserData(userData);
        updateStarDisplay();

        // Добавляем эффекты
        this.addSpinEffects();

        // Определяем выигрышный сегмент
        const winningSegment = this.selectWinningSegment();
        const targetAngle = this.calculateTargetAngle(winningSegment);
        
        // Запускаем анимацию вращения
        await this.animateWheel(targetAngle);
        
        // Показываем результат
        await this.showResult(winningSegment);
        
        // Сбрасываем состояние
        this.resetSpin();
    }

    selectWinningSegment() {
        // Генерируем случайное число для определения приза
        const random = Math.random() * 100;
        let cumulativeProbability = 0;
        
        for (const prize of this.prizes) {
            cumulativeProbability += prize.probability;
            if (random <= cumulativeProbability) {
                return prize;
            }
        }
        
        // Fallback - возвращаем первый приз
        return this.prizes[0];
    }

    calculateTargetAngle(winningPrize) {
        const prizeIndex = this.prizes.findIndex(prize => prize.id === winningPrize.id);
        const prizeAngle = this.segmentAngle * prizeIndex + this.segmentAngle / 2;
        
        // Добавляем несколько полных оборотов + случайность
        const spins = APP_CONFIG.wheel.minSpins + Math.random() * (APP_CONFIG.wheel.maxSpins - APP_CONFIG.wheel.minSpins);
        const randomOffset = (Math.random() - 0.5) * (this.segmentAngle * 0.3); // Небольшая случайность
        
        return (spins * 360) + (360 - prizeAngle) + randomOffset;
    }

    async animateWheel(targetAngle) {
        return new Promise((resolve) => {
            const startRotation = this.rotation;
            const finalRotation = startRotation + targetAngle;
            
            // Устанавливаем CSS переменные для анимации
            this.wheel.style.setProperty('--wheel-rotation', `${finalRotation}deg`);
            this.wheel.style.setProperty('--spin-duration', `${APP_CONFIG.animations.wheelSpinDuration}ms`);
            
            // Добавляем класс для анимации
            this.wheel.classList.add('spinning');
            
            // Анимируем указатель
            this.animatePointer();
            
            setTimeout(() => {
                this.rotation = finalRotation % 360;
                this.wheel.classList.remove('spinning');
                resolve();
            }, APP_CONFIG.animations.wheelSpinDuration);
        });
    }

    animatePointer() {
        const pointer = document.querySelector('.wheel-pointer');
        pointer.classList.add('bouncing');
        
        setTimeout(() => {
            pointer.classList.remove('bouncing');
        }, 300);
    }

    async showResult(prize) {
        // Обновляем статистику пользователя
        const userData = getUserData();
        userData.stats.totalSpins++;
        
        if (prize.type !== 'empty') {
            userData.stats.prizesWon++;
            userData.prizes.unshift({
                ...prize,
                timestamp: new Date().toISOString(),
                id: Date.now()
            });
            
            // Добавляем звезды если это приз со звездами
            if (prize.type.includes('stars')) {
                const starReward = prize.value || 0;
                userData.stats.stars += starReward;
                userData.stats.totalStarsEarned += starReward;
                this.showStarGainEffect(starReward);
            }
        }
        
        updateUserData(userData);
        this.updatePrizeHistory();
        updateStarDisplay();
        
        // Показываем модальное окно с результатом
        this.showPrizeModal(prize);
        
        // Добавляем конфетти для хороших призов
        if (prize.type !== 'empty') {
            this.createConfetti();
        }
        
        // Проверяем достижения
        this.checkAchievements();
    }

    showPrizeModal(prize) {
        // Проверяем, является ли приз сертификатом
        if (prize.type.includes('golden-apple') || prize.type.includes('dolce')) {
            this.showCertificateModal(prize);
            return;
        }

        const modal = document.getElementById('prize-modal');
        const title = document.getElementById('prize-title');
        const description = document.getElementById('prize-description');
        const animation = modal.querySelector('.prize-animation i');
        
        if (prize.type === 'empty') {
            title.textContent = 'Упс!';
            description.textContent = prize.description;
            animation.className = 'fas fa-heart-broken';
        } else {
            title.textContent = 'Поздравляем!';
            description.textContent = `Вы выиграли: ${prize.description}`;
            animation.className = 'fas fa-gift';
        }
        
        modal.classList.add('active');
    }

    showCertificateModal(prize) {
        const modal = document.getElementById('certificate-modal');
        const description = document.getElementById('certificate-description');
        
        description.textContent = `Вы выиграли: ${prize.name}!`;
        
        // Обновляем Telegram ID пользователя
        if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
            document.getElementById('user-telegram-id').textContent = window.Telegram.WebApp.initDataUnsafe.user.id;
        }
        
        modal.classList.add('active');
    }

    resetSpin() {
        this.isSpinning = false;
        this.spinButton.disabled = false;
        this.spinButton.innerHTML = '<span>Крутить</span>';
    }

    addSpinEffects() {
        // Добавляем звездочки вокруг рулетки
        this.createStarEffects();
        
        // Добавляем эффект свечения
        this.wheel.classList.add('glow-effect');
        
        setTimeout(() => {
            this.wheel.classList.remove('glow-effect');
        }, APP_CONFIG.animations.wheelSpinDuration);
    }

    createStarEffects() {
        const wheelContainer = document.querySelector('.wheel-container');
        
        for (let i = 0; i < 5; i++) {
            const star = document.createElement('div');
            star.className = 'star-effect';
            star.innerHTML = '✨';
            star.style.position = 'absolute';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            
            wheelContainer.appendChild(star);
            
            setTimeout(() => {
                star.remove();
            }, 1500);
        }
    }

    createConfetti() {
        const colors = [APP_CONFIG.colors.primary, APP_CONFIG.colors.lime, APP_CONFIG.colors.purple];
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 5000);
        }
    }

    showStarGainEffect(amount) {
        const starElement = document.querySelector('.stars');
        starElement.classList.add('gaining');
        
        // Создаем плавающий текст
        const floatingText = document.createElement('div');
        floatingText.textContent = `+${amount}`;
        floatingText.style.cssText = `
            position: absolute;
            color: ${APP_CONFIG.colors.lime};
            font-weight: bold;
            font-size: 18px;
            pointer-events: none;
            z-index: 1000;
            animation: floatUp 2s ease-out forwards;
        `;
        
        starElement.appendChild(floatingText);
        
        setTimeout(() => {
            starElement.classList.remove('gaining');
            floatingText.remove();
        }, 2000);
    }

    updatePrizeHistory() {
        const historyContainer = document.getElementById('prize-history');
        const userData = getUserData();
        
        historyContainer.innerHTML = '';
        
        const recentPrizes = userData.prizes.slice(0, 5);
        
        recentPrizes.forEach(prize => {
            const prizeElement = document.createElement('div');
            prizeElement.className = 'prize-item new';
            prizeElement.innerHTML = `
                <div class="prize-info">
                    <span class="prize-icon">${prize.icon}</span>
                    <div>
                        <div class="prize-name">${prize.name}</div>
                        <div class="prize-time">${this.formatTime(prize.timestamp)}</div>
                    </div>
                </div>
                <div class="prize-rarity ${prize.rarity}">${this.getRarityText(prize.rarity)}</div>
            `;
            
            historyContainer.appendChild(prizeElement);
        });
    }

    checkAchievements() {
        const userData = getUserData();
        const unlockedAchievements = [];
        
        ACHIEVEMENTS.forEach(achievement => {
            if (!userData.stats.achievements.includes(achievement.id)) {
                let unlocked = false;
                
                switch (achievement.id) {
                    case 'first_spin':
                        unlocked = userData.stats.totalSpins >= 1;
                        break;
                    case 'lucky_streak':
                        unlocked = this.checkLuckyStreak(userData);
                        break;
                    case 'social_butterfly':
                        unlocked = userData.stats.referrals >= 10;
                        break;
                    case 'star_collector':
                        unlocked = userData.stats.totalStarsEarned >= 1000;
                        break;
                    case 'daily_champion':
                        unlocked = this.checkDailyChampion(userData);
                        break;
                }
                
                if (unlocked) {
                    userData.stats.achievements.push(achievement.id);
                    userData.stats.stars += achievement.reward;
                    unlockedAchievements.push(achievement);
                }
            }
        });
        
        if (unlockedAchievements.length > 0) {
            updateUserData(userData);
            this.showAchievementNotifications(unlockedAchievements);
        }
    }

    checkLuckyStreak(userData) {
        const recentPrizes = userData.prizes.slice(0, 3);
        return recentPrizes.length >= 3 && recentPrizes.every(prize => prize.type !== 'empty');
    }

    checkDailyChampion(userData) {
        // Здесь должна быть логика подсчета выполненных ежедневных заданий
        return false; // Пока что false
    }

    showAchievementNotifications(achievements) {
        achievements.forEach((achievement, index) => {
            setTimeout(() => {
                this.showNotification(
                    `Достижение разблокировано: ${achievement.title}! +${achievement.reward} звезд`,
                    'achievement'
                );
            }, index * 1000);
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">${NOTIFICATIONS.types[type]?.icon || 'ℹ️'}</div>
            <div class="notification-message">${message}</div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${APP_CONFIG.colors.cardBg};
            color: white;
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid ${APP_CONFIG.colors.primary};
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1001;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('hiding');
            setTimeout(() => notification.remove(), 300);
        }, NOTIFICATIONS.types[type]?.duration || 3000);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
        return `${Math.floor(diff / 86400000)} дн назад`;
    }

    getRarityText(rarity) {
        const rarityMap = {
            common: 'Обычный',
            uncommon: 'Необычный',
            rare: 'Редкий',
            epic: 'Эпический',
            legendary: 'Легендарный'
        };
        return rarityMap[rarity] || 'Обычный';
    }

    // Утилиты для работы с цветами
    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
            (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
            (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    }
}

// Функция для закрытия модального окна приза
function closePrizeModal() {
    const modal = document.getElementById('prize-modal');
    modal.classList.remove('active');
}

// Добавляем стили для floating animation
const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        0% {
            transform: translateY(0);
            opacity: 1;
        }
        100% {
            transform: translateY(-50px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
// public/js/screens/mega-roulette.js - ПОЛНЫЙ ФАЙЛ МЕГА РУЛЕТКИ

export class MegaRouletteScreen {
    constructor(app) {
        this.app = app;
        this.isSpinning = false;
        this.wheelRotation = 0;
        this.countdownInterval = null;
        this.lastCanSpinStatus = null;
        
        this.megaPrizes = [
            { id: 'airpods4', name: 'AirPods 4', icon: '🎧', rarity: 'legendary', value: 25000 },
            { id: 'cert5000', name: 'Сертификат 5000₽', icon: '💎', rarity: 'epic', value: 5000 },
            { id: 'cert3000', name: 'Сертификат 3000₽', icon: '💰', rarity: 'rare', value: 3000 },
            { id: 'powerbank', name: 'Повербанк', icon: '🔋', rarity: 'rare', value: 2000 },
            { id: 'cert2000', name: 'Сертификат 2000₽', icon: '💳', rarity: 'common', value: 2000 },
            { id: 'charger', name: 'Беспроводная зарядка', icon: '⚡', rarity: 'common', value: 1500 },
            { id: 'cert1000', name: 'Сертификат 1000₽', icon: '🎁', rarity: 'common', value: 1000 },
            { id: 'empty', name: 'Повезет в следующий раз', icon: '🌟', rarity: 'empty', value: 0 }
        ];
    }

    render() {
        const timeUntilNext = this.getTimeUntilNextSpin();
        const canSpin = timeUntilNext <= 0;
        const userStars = this.app.gameData.stars;
        const hasEnoughStars = userStars >= 5000;

        return `
            <div id="mega-roulette-screen" class="screen">
                <div class="mega-header">
                    <button class="back-btn" id="mega-back-btn">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="mega-title">
                        <h2>👑 МЕГА РУЛЕТКА</h2>
                        <p>Премиум призы для VIP игроков</p>
                    </div>
                    <div class="mega-stars">
                        <i class="fas fa-star"></i>
                        <span>${userStars}</span>
                    </div>
                </div>

                <div class="mega-prizes-showcase">
                    <h3>🏆 Призовой фонд</h3>
                    <div class="mega-prizes-grid">
                        <div class="mega-prize-item legendary">
                            <div class="prize-icon">🎧</div>
                            <div class="prize-name">AirPods 4</div>
                            <div class="prize-tag">ГЛАВНЫЙ ПРИЗ</div>
                        </div>
                        <div class="mega-prize-item epic">
                            <div class="prize-icon">💎</div>
                            <div class="prize-name">5000₽</div>
                        </div>
                        <div class="mega-prize-item rare">
                            <div class="prize-icon">🔋</div>
                            <div class="prize-name">PowerBank</div>
                        </div>
                        <div class="mega-prize-item rare">
                            <div class="prize-icon">⚡</div>
                            <div class="prize-name">Зарядка</div>
                        </div>
                    </div>
                </div>

                <div class="mega-wheel-container">
                    <div class="mega-wheel-wrapper">
                        <div id="mega-wheel" class="mega-wheel">
                            <div class="mega-wheel-segments" id="mega-wheel-segments">
                                <!-- Segments will be generated here -->
                            </div>
                            <div class="mega-wheel-center">
                                <div class="mega-center-crown">👑</div>
                                <span class="mega-center-text">MEGA</span>
                            </div>
                        </div>
                        <div class="mega-wheel-pointer"></div>
                        <div class="mega-wheel-glow"></div>
                    </div>
                </div>

                <div class="mega-spin-info">
                    <div class="mega-cost">
                        <i class="fas fa-star"></i>
                        <span>5000 звезд за прокрутку</span>
                    </div>
                    ${!canSpin ? `
                        <div class="mega-timer">
                            <i class="fas fa-clock"></i>
                            <span>Следующая прокрутка через: <span id="mega-countdown">${this.formatTime(timeUntilNext)}</span></span>
                        </div>
                    ` : ''}
                </div>

                <div class="mega-spin-action">
                    <button id="mega-spin-btn" class="mega-spin-button ${!canSpin || !hasEnoughStars ? 'disabled' : ''}" 
                            ${!canSpin || !hasEnoughStars ? 'disabled' : ''}>
                        <div class="mega-btn-bg"></div>
                        <div class="mega-btn-content">
                            ${!canSpin ? '<i class="fas fa-clock"></i> Недоступно' : 
                              !hasEnoughStars ? '<i class="fas fa-times"></i> Недостаточно звезд' :
                              '<i class="fas fa-crown"></i> КРУТИТЬ МЕГА РУЛЕТКУ'}
                        </div>
                    </button>
                </div>

                ${canSpin ? '' : '<div class="mega-next-spin-info">Мега рулетка доступна раз в месяц для особых игроков</div>'}
            </div>
        `;
    }

    init() {
        console.log('🎰 Инициализация мега рулетки...');
        this.generateMegaWheelSegments();
        this.setupEventListeners();
        if (this.getTimeUntilNextSpin() > 0) {
            this.startCountdown();
        }
        console.log('✅ Мега рулетка инициализирована');
    }

    setupEventListeners() {
        const backBtn = document.getElementById('mega-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.app.navigation.navigateTo('main');
            });
        }

        const spinBtn = document.getElementById('mega-spin-btn');
        if (spinBtn && !spinBtn.disabled) {
            spinBtn.addEventListener('click', () => {
                this.spinMegaWheel();
            });
        }
    }

    generateMegaWheelSegments() {
        const segmentsContainer = document.getElementById('mega-wheel-segments');
        if (!segmentsContainer) return;

        const segmentAngle = 360 / this.megaPrizes.length;
        let html = '';

        this.megaPrizes.forEach((prize, index) => {
            const rotation = index * segmentAngle;
            const rarityClass = prize.rarity;
            
            html += `
                <div class="mega-segment ${rarityClass}" 
                     style="transform: rotate(${rotation}deg)">
                    <div class="mega-segment-content">
                        <div class="mega-segment-icon">${prize.icon}</div>
                        <div class="mega-segment-name">${prize.name}</div>
                    </div>
                </div>
            `;
        });

        segmentsContainer.innerHTML = html;
    }

    async spinMegaWheel() {
        if (this.isSpinning) return;
        
        const userStars = this.app.gameData.stars;
        if (userStars < 5000) {
            this.app.showStatusMessage('Недостаточно звезд для мега рулетки!', 'error');
            return;
        }

        this.isSpinning = true;

        // Списываем звезды
        this.app.gameData.stars -= 5000;
        this.app.saveGameData();
        this.app.updateStarsDisplay();

        // Определяем выигрыш
        const wonPrize = this.calculateMegaPrize();
        const segmentAngle = 360 / this.megaPrizes.length;
        const winIndex = this.megaPrizes.findIndex(p => p.id === wonPrize.id);
        
        // Рассчитываем поворот
        const targetAngle = (winIndex * segmentAngle) + (segmentAngle / 2);
        const spins = 5 + Math.random() * 3; // 5-8 полных оборотов
        const finalRotation = (spins * 360) + targetAngle;

        // Крутим колесо
        const wheel = document.getElementById('mega-wheel');
        if (wheel) {
            wheel.style.transition = 'transform 4s cubic-bezier(0.23, 1, 0.320, 1)';
            wheel.style.transform = `rotate(${finalRotation}deg)`;
        }

        // Вибрация
        if (this.app.tg && this.app.tg.HapticFeedback) {
            this.app.tg.HapticFeedback.impactOccurred('heavy');
        }

        // Ждем завершения анимации
        setTimeout(() => {
            this.processMegaWin(wonPrize);
            this.isSpinning = false;
            
            // Устанавливаем время следующей прокрутки (месяц)
            const nextSpinTime = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 дней
            localStorage.setItem('megaRouletteNextSpin', nextSpinTime.toString());
            
            // Перезагружаем экран
            setTimeout(() => {
                this.refreshScreen();
            }, 3000);
        }, 4000);
    }

    calculateMegaPrize() {
        const random = Math.random() * 100;
        
        // Шансы выигрыша (более редкие призы)
        if (random < 0.1) return this.megaPrizes.find(p => p.id === 'airpods4'); // 0.1% AirPods 4
        if (random < 2) return this.megaPrizes.find(p => p.id === 'cert5000'); // 1.9% 5000₽
        if (random < 7) return this.megaPrizes.find(p => p.id === 'cert3000'); // 5% 3000₽
        if (random < 15) return this.megaPrizes.find(p => p.id === 'powerbank'); // 8% PowerBank
        if (random < 30) return this.megaPrizes.find(p => p.id === 'cert2000'); // 15% 2000₽
        if (random < 50) return this.megaPrizes.find(p => p.id === 'charger'); // 20% Зарядка
        if (random < 75) return this.megaPrizes.find(p => p.id === 'cert1000'); // 25% 1000₽
        
        return this.megaPrizes.find(p => p.id === 'empty'); // 25% пустой
    }

    processMegaWin(prize) {
        // Добавляем приз в коллекцию
        this.app.gameData.megaPrizes = this.app.gameData.megaPrizes || [];
        this.app.gameData.megaPrizes.push({
            ...prize,
            wonAt: Date.now(),
            claimed: false
        });

        // Обновляем статистику
        this.app.gameData.totalMegaSpins = (this.app.gameData.totalMegaSpins || 0) + 1;
        this.app.gameData.totalMegaWins = (this.app.gameData.totalMegaWins || 0) + (prize.value > 0 ? 1 : 0);

        this.app.saveGameData();

        // Показываем результат
        if (prize.value > 0) {
            this.showMegaWinAnimation(prize);
        } else {
            this.app.showStatusMessage('В этот раз не повезло, но вы получили опыт!', 'info');
        }
    }

    showMegaWinAnimation(prize) {
        const winModal = document.createElement('div');
        winModal.className = 'mega-win-modal';
        winModal.innerHTML = `
            <div class="mega-win-content">
                <div class="mega-win-fireworks"></div>
                <div class="mega-win-icon ${prize.rarity}">${prize.icon}</div>
                <h2>🎉 ПОЗДРАВЛЯЕМ!</h2>
                <h3>Вы выиграли:</h3>
                <div class="mega-win-prize">${prize.name}</div>
                <p>Приз будет отправлен администратором в течение 24 часов</p>
                <button class="mega-win-close">Забрать приз</button>
            </div>
        `;

        document.body.appendChild(winModal);

        // Закрытие модального окна
        winModal.querySelector('.mega-win-close').addEventListener('click', () => {
            winModal.remove();
        });

        // Фейерверк
        if (this.app.tg && this.app.tg.HapticFeedback) {
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    this.app.tg.HapticFeedback.notificationOccurred('success');
                }, i * 200);
            }
        }
    }

    getTimeUntilNextSpin() {
        const nextSpinTime = localStorage.getItem('megaRouletteNextSpin');
        if (!nextSpinTime) return 0;
        
        return Math.max(0, parseInt(nextSpinTime) - Date.now());
    }

    formatTime(ms) {
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) return `${days}д ${hours}ч`;
        if (hours > 0) return `${hours}ч ${minutes}м`;
        return `${minutes}м`;
    }

    startCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        this.countdownInterval = setInterval(() => {
            const timeLeft = this.getTimeUntilNextSpin();
            const countdownEl = document.getElementById('mega-countdown');
            
            if (countdownEl) {
                countdownEl.textContent = this.formatTime(timeLeft);
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.countdownInterval);
                this.refreshScreen();
            }
        }, 60000); // Обновляем каждую минуту
    }

    refreshScreen() {
        console.log('🔄 Обновление экрана мега рулетки...');
        
        // Очищаем интервал
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        
        // Перезагружаем содержимое экрана
        const screenContainer = document.getElementById('mega-roulette-screen');
        if (screenContainer) {
            const newContent = this.render();
            const parser = new DOMParser();
            const doc = parser.parseFromString(newContent, 'text/html');
            const newScreenContent = doc.getElementById('mega-roulette-screen');
            
            if (newScreenContent) {
                screenContainer.innerHTML = newScreenContent.innerHTML;
                this.init();
            }
        }
    }

    destroy() {
        console.log('🧹 Очистка мега рулетки...');
        
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        
        // Удаляем модальные окна если есть
        const modals = document.querySelectorAll('.mega-win-modal');
        modals.forEach(modal => modal.remove());
    }
}
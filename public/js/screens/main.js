// screens/main.js - Исправленная версия главного экрана

import { WHEEL_PRIZES, APP_CONFIG } from '../config.js';

export class MainScreen {
    constructor(app) {
        this.app = app;
        this.isSpinning = false;
        this.wheelRotation = 0;
        this.initialized = false;
    }

    render() {
        return `
            <div id="main-screen" class="screen active">
                <div class="header">
                    <div class="user-info">
                        <div id="profile-pic" class="profile-pic" tabindex="0" role="button" aria-label="Профиль">
                            ${this.app.tg?.initDataUnsafe?.user?.first_name?.charAt(0) || '👤'}
                        </div>
                        <div class="user-details">
                            <div class="user-name">${this.app.tg?.initDataUnsafe?.user?.first_name || 'Пользователь'}</div>
                            <div class="user-stars">
                                <span id="star-count">${this.app.gameData.stars}</span> ⭐
                            </div>
                        </div>
                    </div>
                    
                    <button id="mega-roulette-btn" class="mega-btn" aria-label="Мега рулетка">
                        👑 МЕГА
                    </button>
                </div>

                <div class="wheel-container">
                    <div class="wheel" id="wheel">
                        <div class="wheel-pointer"></div>
                        <svg id="wheel-svg" width="400" height="400" viewBox="0 0 400 400">
                            <g id="wheel-segments"></g>
                        </svg>
                        <div class="wheel-center">SPIN</div>
                    </div>

                    <div class="spin-controls">
                        <div class="spin-buttons">
                            <button id="spin-button-stars" class="spin-btn primary" type="button">
                                <i class="fas fa-star"></i>
                                <span>За 20 ⭐</span>
                            </button>
                            <button id="spin-button-friend" class="spin-btn secondary" type="button">
                                <i class="fas fa-heart"></i>
                                <span>За друга (${this.app.gameData.availableFriendSpins})</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="recent-wins">
                    <span class="recent-wins-title">Последние выигрыши</span>
                    <div class="recent-wins-list" id="recent-wins-list">
                        <!-- Recent wins will be shown here -->
                    </div>
                </div>
            </div>
        `;
    }

    init() {
        console.log('🎮 Инициализация главного экрана...');
        
        try {
            // Небольшая задержка для корректной инициализации DOM
            setTimeout(() => {
                this.generateWheelSVG();
                this.setupEventListeners();
                this.updateRecentWins();
                this.updateSpinButtons();
                this.initialized = true;
                console.log('✅ Главный экран инициализирован');
            }, 100);
            
        } catch (error) {
            console.error('❌ Ошибка инициализации главного экрана:', error);
        }
    }

    setupEventListeners() {
        console.log('🔗 Настройка обработчиков событий...');
        
        // Удаляем старые обработчики, если они есть
        this.removeEventListeners();
        
        // Кнопки прокрутки
        const spinStarsBtn = document.getElementById('spin-button-stars');
        const spinFriendBtn = document.getElementById('spin-button-friend');
        
        if (spinStarsBtn) {
            this.starsBtnHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!this.isSpinning && !spinStarsBtn.disabled) {
                    this.spinWheel('stars');
                }
            };
            spinStarsBtn.addEventListener('click', this.starsBtnHandler);
            spinStarsBtn.addEventListener('touchend', this.starsBtnHandler);
            console.log('✅ Обработчик кнопки звезд добавлен');
        } else {
            console.warn('⚠️ Кнопка звезд не найдена');
        }
        
        if (spinFriendBtn) {
            this.friendBtnHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!this.isSpinning && !spinFriendBtn.disabled) {
                    this.spinWheel('friend');
                }
            };
            spinFriendBtn.addEventListener('click', this.friendBtnHandler);
            spinFriendBtn.addEventListener('touchend', this.friendBtnHandler);
            console.log('✅ Обработчик кнопки друга добавлен');
        } else {
            console.warn('⚠️ Кнопка друга не найдена');
        }

        // Кнопка мега рулетки
        const megaBtn = document.getElementById('mega-roulette-btn');
        if (megaBtn) {
            this.megaBtnHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openMegaRoulette();
            };
            megaBtn.addEventListener('click', this.megaBtnHandler);
            megaBtn.addEventListener('touchend', this.megaBtnHandler);
            console.log('✅ Обработчик мега кнопки добавлен');
        }
        
        // Профиль
        const profilePic = document.getElementById('profile-pic');
        if (profilePic) {
            this.profileHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.app.navigation.navigateTo('profile');
            };
            profilePic.addEventListener('click', this.profileHandler);
            profilePic.addEventListener('touchend', this.profileHandler);
            profilePic.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.profileHandler(e);
                }
            });
            console.log('✅ Обработчик профиля добавлен');
        }

        console.log('✅ Все обработчики событий настроены');
    }

    removeEventListeners() {
        const spinStarsBtn = document.getElementById('spin-button-stars');
        const spinFriendBtn = document.getElementById('spin-button-friend');
        const megaBtn = document.getElementById('mega-roulette-btn');
        const profilePic = document.getElementById('profile-pic');

        if (spinStarsBtn && this.starsBtnHandler) {
            spinStarsBtn.removeEventListener('click', this.starsBtnHandler);
            spinStarsBtn.removeEventListener('touchend', this.starsBtnHandler);
        }

        if (spinFriendBtn && this.friendBtnHandler) {
            spinFriendBtn.removeEventListener('click', this.friendBtnHandler);
            spinFriendBtn.removeEventListener('touchend', this.friendBtnHandler);
        }

        if (megaBtn && this.megaBtnHandler) {
            megaBtn.removeEventListener('click', this.megaBtnHandler);
            megaBtn.removeEventListener('touchend', this.megaBtnHandler);
        }

        if (profilePic && this.profileHandler) {
            profilePic.removeEventListener('click', this.profileHandler);
            profilePic.removeEventListener('touchend', this.profileHandler);
        }
    }

    generateWheelSVG() {
        const container = document.getElementById('wheel-segments');
        if (!container) {
            console.error('❌ Контейнер сегментов рулетки не найден');
            return;
        }

        const centerX = 200;
        const centerY = 200;
        const radius = 180;
        const segments = WHEEL_PRIZES.length;
        const anglePerSegment = 360 / segments;

        let svgContent = '';

        WHEEL_PRIZES.forEach((prize, index) => {
            const startAngle = (index * anglePerSegment - 90) * Math.PI / 180;
            const endAngle = ((index + 1) * anglePerSegment - 90) * Math.PI / 180;

            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            const largeArc = anglePerSegment > 180 ? 1 : 0;

            const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

            // Текст иконки
            const textAngle = (startAngle + endAngle) / 2;
            const textRadius = radius * 0.7;
            const textX = centerX + textRadius * Math.cos(textAngle);
            const textY = centerY + textRadius * Math.sin(textAngle);

            svgContent += `
                <path 
                    d="${path}" 
                    fill="${prize.color}" 
                    stroke="rgba(255,255,255,0.2)" 
                    stroke-width="1"
                    class="wheel-segment-path"
                    data-prize-id="${prize.id}"
                />
                <text 
                    x="${textX}" 
                    y="${textY}" 
                    text-anchor="middle" 
                    dominant-baseline="middle" 
                    font-size="20" 
                    fill="white"
                    font-weight="bold"
                    class="segment-icon"
                >${prize.icon}</text>
            `;
        });

        container.innerHTML = svgContent;
        console.log('✅ SVG рулетки сгенерирован');
    }

    async spinWheel(type) {
        if (this.isSpinning) return;

        // Проверка возможности прокрутки
        if (type === 'stars' && this.app.gameData.stars < APP_CONFIG.wheel.starCost) {
            this.app.showStatusMessage('Недостаточно звезд для прокрутки!', 'error');
            return;
        }

        if (type === 'friend' && this.app.gameData.availableFriendSpins <= 0) {
            this.app.showStatusMessage('Нет доступных прокруток за друга!', 'error');
            return;
        }

        this.isSpinning = true;
        this.updateSpinButtons();

        // Списание ресурсов
        if (type === 'stars') {
            this.app.gameData.stars -= APP_CONFIG.wheel.starCost;
        } else if (type === 'friend') {
            this.app.gameData.availableFriendSpins -= 1;
        }

        // Обновление UI
        this.app.updateUI();

        try {
            // Определение выигрышного приза
            const winningPrize = this.selectRandomPrize();
            const prizeIndex = WHEEL_PRIZES.findIndex(p => p.id === winningPrize.id);
            
            // Расчет угла поворота
            const segmentAngle = 360 / WHEEL_PRIZES.length;
            const targetAngle = prizeIndex * segmentAngle + (segmentAngle / 2);
            const spins = Math.floor(Math.random() * 3) + APP_CONFIG.wheel.minSpins;
            const finalRotation = spins * 360 + (360 - targetAngle);

            // Анимация
            const wheel = document.getElementById('wheel-svg');
            if (wheel) {
                this.wheelRotation += finalRotation;
                wheel.style.transform = `rotate(${this.wheelRotation}deg)`;
                wheel.style.transition = `transform ${APP_CONFIG.animations.wheelSpinDuration}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
            }

            // Ожидание завершения анимации
            await new Promise(resolve => setTimeout(resolve, APP_CONFIG.animations.wheelSpinDuration));

            // Обработка выигрыша
            await this.handlePrizeWin(winningPrize);

        } catch (error) {
            console.error('❌ Ошибка прокрутки рулетки:', error);
            this.app.showStatusMessage('Ошибка при прокрутке рулетки', 'error');
        } finally {
            this.isSpinning = false;
            this.updateSpinButtons();
        }
    }

    selectRandomPrize() {
        const totalWeight = WHEEL_PRIZES.reduce((sum, prize) => sum + (100 - prize.probability), 0);
        let random = Math.random() * totalWeight;

        for (const prize of WHEEL_PRIZES) {
            random -= (100 - prize.probability);
            if (random <= 0) {
                return prize;
            }
        }

        return WHEEL_PRIZES[0]; // Fallback
    }

    async handlePrizeWin(prize) {
        console.log('🎁 Выигран приз:', prize);

        // Добавление приза в игровые данные
        if (prize.type.startsWith('stars-')) {
            const starsAmount = parseInt(prize.type.split('-')[1]);
            this.app.gameData.stars += starsAmount;
        }

        // Обновление статистики
        this.app.gameData.totalSpins = (this.app.gameData.totalSpins || 0) + 1;
        this.app.gameData.prizesWon = (this.app.gameData.prizesWon || 0) + 1;

        // Добавление в историю выигрышей
        if (!this.app.gameData.recentWins) {
            this.app.gameData.recentWins = [];
        }
        
        this.app.gameData.recentWins.unshift({
            prize: prize,
            timestamp: Date.now()
        });

        // Ограничение истории
        if (this.app.gameData.recentWins.length > 10) {
            this.app.gameData.recentWins = this.app.gameData.recentWins.slice(0, 10);
        }

        // Сохранение данных
        this.app.saveGameData();

        // Обновление UI
        this.app.updateUI();
        this.updateRecentWins();

        // Показ уведомления о выигрыше
        this.app.showStatusMessage(`🎉 Вы выиграли: ${prize.name}!`, 'success');

        // Запуск конфетти
        if (typeof this.app.showConfetti === 'function') {
            this.app.showConfetti();
        }
    }

    updateSpinButtons() {
        const spinStarsBtn = document.getElementById('spin-button-stars');
        const spinFriendBtn = document.getElementById('spin-button-friend');

        if (spinStarsBtn) {
            const canSpinStars = !this.isSpinning && this.app.gameData.stars >= APP_CONFIG.wheel.starCost;
            spinStarsBtn.disabled = !canSpinStars;
            spinStarsBtn.classList.toggle('disabled', !canSpinStars);
        }

        if (spinFriendBtn) {
            const canSpinFriend = !this.isSpinning && this.app.gameData.availableFriendSpins > 0;
            spinFriendBtn.disabled = !canSpinFriend;
            spinFriendBtn.classList.toggle('disabled', !canSpinFriend);
            
            // Обновление текста кнопки
            const span = spinFriendBtn.querySelector('span');
            if (span) {
                span.textContent = `За друга (${this.app.gameData.availableFriendSpins})`;
            }
        }
    }

    updateRecentWins() {
        const container = document.getElementById('recent-wins-list');
        if (!container) return;

        const recentWins = this.app.gameData.recentWins || [];
        
        if (recentWins.length === 0) {
            container.innerHTML = '<div class="recent-win-item empty">Выигрышей пока нет</div>';
            return;
        }

        container.innerHTML = recentWins.map(win => `
            <div class="recent-win-item">
                <span>${win.prize.icon}</span>
                <div class="win-description">${win.prize.name}</div>
            </div>
        `).join('');
    }

    openMegaRoulette() {
        if (this.app.navigation) {
            this.app.navigation.navigateTo('mega-roulette');
        }
    }

    destroy() {
        console.log('🧹 Очистка главного экрана...');
        this.removeEventListeners();
    }
}
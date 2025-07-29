// screens/main.js - ИСПРАВЛЕННАЯ ВЕРСИЯ с рабочими кнопками

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
                                <button id="deposit-btn" class="deposit-quick-btn" onclick="navigateToDeposit()" title="Пополнить звезды">
                                    <i class="fas fa-plus"></i>
                                </button>
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
                        <img id="wheel-image" src="images/custom-wheel.png" alt="Рулетка" width="400" height="400" 
                             onerror="this.style.display='none'; document.getElementById('wheel-svg').style.display='block';">
                        <svg id="wheel-svg" width="400" height="400" viewBox="0 0 400 400" style="display: none;">
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
                                <span id="friend-button-text">Прокрутка за друга</span>
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
        console.log('🧹 Удаление старых обработчиков событий...');
        
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
            profilePic.removeEventListener('keydown', this.profileHandler);
        }
    }

    generateWheelSVG() {
        const container = document.getElementById('wheel-segments');
        if (!container) {
            console.error('❌ Контейнер сегментов рулетки не найден');
            return;
        }

        const radius = 180;
        const centerX = 200;
        const centerY = 200;
        const anglePerSegment = (2 * Math.PI) / WHEEL_PRIZES.length;

        let svgContent = '';

        WHEEL_PRIZES.forEach((prize, index) => {
            const startAngle = index * anglePerSegment - Math.PI / 2;
            const endAngle = (index + 1) * anglePerSegment - Math.PI / 2;

            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            const largeArc = anglePerSegment > Math.PI ? 1 : 0;

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
        if (this.isSpinning) {
            console.log('⏳ Рулетка уже крутится');
            return;
        }

        console.log(`🎰 Начинаем прокрутку рулетки: ${type}`);
        this.lastSpinType = type; // Сохраняем тип прокрутки

        // Проверка возможности прокрутки
        if (type === 'stars' && this.app.gameData.stars < APP_CONFIG.wheel.starCost) {
            this.app.showStatusMessage('Недостаточно звезд для прокрутки!', 'error');
            console.log('❌ Недостаточно звезд');
            return;
        }

        if (type === 'friend') {
            const referralsCount = this.app.gameData.referrals || 0;
            const friendSpinsUsed = this.app.gameData.friendSpinsUsed || 0;
            
            if (referralsCount === 0) {
                this.showReferralLink();
                return;
            }
            
            if (friendSpinsUsed >= referralsCount) {
                this.showReferralLink();
                return;
            }
        }

        this.isSpinning = true;
        this.updateSpinButtons();

        // Списание ресурсов
        if (type === 'stars') {
            this.app.gameData.stars -= APP_CONFIG.wheel.starCost;
            console.log(`💰 Списано ${APP_CONFIG.wheel.starCost} звезд. Осталось: ${this.app.gameData.stars}`);
        } else if (type === 'friend') {
            this.app.gameData.friendSpinsUsed = (this.app.gameData.friendSpinsUsed || 0) + 1;
            console.log(`❤️ Использована прокрутка за друга. Использовано: ${this.app.gameData.friendSpinsUsed}`);
        }

        // Обновление UI
        this.app.updateUI();

        try {
            // Определение выигрышного приза
            const winningPrize = this.selectRandomPrize();
            const prizeIndex = WHEEL_PRIZES.findIndex(p => p.id === winningPrize.id);
            
            console.log(`🎁 Выпал приз: ${winningPrize.name} (индекс: ${prizeIndex})`);
            
            // Расчет угла поворота
            const segmentAngle = 360 / WHEEL_PRIZES.length;
            const targetAngle = prizeIndex * segmentAngle + (segmentAngle / 2);
            const spins = Math.floor(Math.random() * 3) + APP_CONFIG.wheel.minSpins;
            const finalRotation = spins * 360 + (360 - targetAngle);

            console.log(`🌀 Поворот на ${finalRotation} градусов (${spins} оборотов + ${360 - targetAngle})`);

            // Анимация - поддержка и PNG и SVG
            const wheelImage = document.getElementById('wheel-image');
            const wheelSvg = document.getElementById('wheel-svg');
            
            this.wheelRotation += finalRotation;
            const transform = `rotate(${this.wheelRotation}deg)`;
            const transition = `transform ${APP_CONFIG.animations.wheelSpinDuration}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
            
            if (wheelImage && wheelImage.style.display !== 'none') {
                wheelImage.style.transform = transform;
                wheelImage.style.transition = transition;
            } else if (wheelSvg) {
                wheelSvg.style.transform = transform;
                wheelSvg.style.transition = transition;
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
            console.log('✅ Прокрутка завершена');
        }
    }

    selectRandomPrize() {
        // Создаем массив с учетом вероятностей
        const prizePool = [];
        
        WHEEL_PRIZES.forEach(prize => {
            const weight = Math.round(prize.probability * 100);
            for (let i = 0; i < weight; i++) {
                prizePool.push(prize);
            }
        });

        // Выбираем случайный приз
        const randomIndex = Math.floor(Math.random() * prizePool.length);
        const selectedPrize = prizePool[randomIndex];
        
        console.log(`🎲 Выбран приз: ${selectedPrize.name} (вероятность: ${selectedPrize.probability}%)`);
        
        return selectedPrize;
    }

    async handlePrizeWin(prize) {
        console.log(`🏆 Обработка выигрыша: ${prize.name}`);

        // Сначала отправляем приз на сервер для сохранения в БД
        const serverSaved = await this.savePrizeToServer(prize);
        
        if (!serverSaved) {
            console.error('❌ Не удалось сохранить приз на сервере');
            this.app.showStatusMessage('❌ Ошибка сохранения приза', 'error', 3000);
            return;
        }

        // Только после успешного сохранения на сервере обновляем локальные данные
        this.updateLocalDataAfterPrize(prize);

        // Обновляем UI
        this.updateRecentWins();
        this.app.updateUI();
        
        // Сохраняем данные локально
        this.app.saveGameData();

        console.log('✅ Выигрыш обработан и сохранен на сервере');
    }

    // Замените функцию savePrizeToServer в public/js/screens/main.js:

    async savePrizeToServer(prize) {
        console.log('🎁 Попытка сохранения приза на сервере:', prize);
        
        if (!window.telegramIntegration?.sendToServer) {
            console.error('❌ telegramIntegration не инициализирован');
            return false;
        }
        
        if (!window.telegramIntegration.user?.id) {
            console.error('❌ Нет данных пользователя Telegram');
            return false;
        }
        
        try {
            // ИСПРАВЛЕНИЕ: Убеждаемся что данные корректны
            const spinData = {
                spinType: 'normal', // ФИКСИРОВАННОЕ значение вместо this.lastSpinType
                prize: {
                    id: prize.id || Math.floor(Math.random() * 1000000), // Генерируем ID если нет
                    name: prize.name || 'Неизвестный приз',
                    type: prize.type || 'empty',
                    value: Number(prize.value) || 0, // Убеждаемся что это число
                    probability: prize.probability || 0
                },
                timestamp: new Date().toISOString()
            };
            
            console.log('📤 Отправляемые данные на сервер:', spinData);
            console.log('👤 Пользователь:', window.telegramIntegration.user);
            
            const response = await window.telegramIntegration.sendToServer('wheel_spin', spinData);
            
            console.log('📥 Ответ сервера:', response);
            
            if (response && response.success === true) {
                console.log('✅ Приз успешно сохранен на сервере');
                return true;
            } else {
                console.error('❌ Сервер вернул ошибку:', response);
                
                // Показываем детальную ошибку если есть
                if (response?.error) {
                    console.error('📋 Детали ошибки:', response.error);
                    if (response.details) {
                        console.error('📋 Подробности:', response.details);
                    }
                    
                    // Показываем понятное сообщение пользователю
                    if (response.error.includes('Invalid') || response.error.includes('validation')) {
                        this.app.showStatusMessage('⚠️ Ошибка валидации данных', 'warning', 4000);
                    } else {
                        this.app.showStatusMessage(`❌ ${response.error}`, 'error', 4000);
                    }
                } else {
                    this.app.showStatusMessage('❌ Неизвестная ошибка сервера', 'error', 3000);
                }
                
                return false;
            }
            
        } catch (error) {
            console.error('❌ Ошибка отправки на сервер:', error);
            
            // Проверяем тип ошибки для понятного сообщения
            if (error.message?.includes('429')) {
                this.app.showStatusMessage('⏳ Слишком много запросов. Подождите.', 'warning', 4000);
            } else if (error.message?.includes('400')) {
                this.app.showStatusMessage('⚠️ Неверные данные запроса', 'warning', 4000);
            } else if (error.message?.includes('500')) {
                this.app.showStatusMessage('❌ Ошибка сервера', 'error', 3000);
            } else {
                this.app.showStatusMessage('❌ Ошибка подключения', 'error', 3000);
            }
            
            return false;
        }
    }

    // ДОБАВЬТЕ эту функцию для диагностики:
    async diagnosePrizeData(prize) {
        console.log('🔍 Диагностика данных приза:');
        console.log('  Prize object:', prize);
        console.log('  Prize type:', typeof prize);
        console.log('  Prize.id:', prize?.id, typeof prize?.id);
        console.log('  Prize.name:', prize?.name, typeof prize?.name);
        console.log('  Prize.type:', prize?.type, typeof prize?.type);
        console.log('  Prize.value:', prize?.value, typeof prize?.value);
        
        console.log('🔍 Диагностика Telegram Integration:');
        console.log('  telegramIntegration exists:', !!window.telegramIntegration);
        console.log('  sendToServer exists:', !!window.telegramIntegration?.sendToServer);
        console.log('  User exists:', !!window.telegramIntegration?.user);
        console.log('  User ID:', window.telegramIntegration?.user?.id);
        console.log('  User data:', window.telegramIntegration?.user);
        
        return true;
    }

    updateSpinButtons() {
        const spinStarsBtn = document.getElementById('spin-button-stars');
        const spinFriendBtn = document.getElementById('spin-button-friend');

        if (spinStarsBtn) {
            const canSpinStars = !this.isSpinning && this.app.gameData.stars >= APP_CONFIG.wheel.starCost;
            spinStarsBtn.disabled = !canSpinStars;
            spinStarsBtn.classList.toggle('disabled', !canSpinStars);
            
            if (this.isSpinning) {
                spinStarsBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Крутится...</span>`;
            } else {
                spinStarsBtn.innerHTML = `<i class="fas fa-star"></i><span>За 20 ⭐</span>`;
            }
        }

        if (spinFriendBtn) {
            const referralsCount = this.app.gameData.referrals || 0;
            const friendSpinsUsed = this.app.gameData.friendSpinsUsed || 0;
            const availableSpins = Math.max(0, referralsCount - friendSpinsUsed);
            
            // Кнопка всегда активна - либо для прокрутки, либо для приглашения
            const canInteract = !this.isSpinning;
            spinFriendBtn.disabled = !canInteract;
            spinFriendBtn.classList.toggle('disabled', !canInteract);
            
            // Обновление текста кнопки
            if (this.isSpinning) {
                spinFriendBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Крутится...</span>`;
            } else if (referralsCount === 0) {
                spinFriendBtn.innerHTML = `<i class="fas fa-share"></i><span>Пригласить друга</span>`;
            } else if (availableSpins === 0) {
                spinFriendBtn.innerHTML = `<i class="fas fa-heart"></i><span>Пригласи еще</span>`;
            } else {
                spinFriendBtn.innerHTML = `<i class="fas fa-heart"></i><span>За друга (${availableSpins})</span>`;
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
                <div class="win-time">${this.formatTime(win.timestamp)}</div>
            </div>
        `).join('');
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

    openMegaRoulette() {
        if (this.app.navigation) {
            this.app.navigation.navigateTo('mega-roulette');
        } else {
            this.app.showStatusMessage('Мега рулетка временно недоступна', 'info');
        }
    }

    refreshEventListeners() {
        console.log('🔄 Обновление обработчиков главного экрана...');
        this.setupEventListeners();
    }

    destroy() {
        console.log('🧹 Очистка главного экрана...');
        this.removeEventListeners();
    }

    showReferralLink() {
        // Генерируем реферальную ссылку
        const userId = this.app.tg?.initDataUnsafe?.user?.id || 'demo';
        const botUsername = 'kosmetichka_lottery_bot'; // Используем имя бота из telegram-bot-server.js
        const referralLink = `https://t.me/${botUsername}?start=ref_${userId}`;
        
        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'referral-modal';
        modal.innerHTML = `
            <div class="referral-modal-content">
                <div class="referral-header">
                    <h3>🎁 Пригласи друга и получи прокрутку!</h3>
                    <button class="close-modal">×</button>
                </div>
                <div class="referral-body">
                    <p>У вас пока нет приглашенных друзей. Поделитесь ссылкой с друзьями, чтобы получить бесплатные прокрутки!</p>
                    <div class="referral-link-container">
                        <input type="text" id="referral-link" value="${referralLink}" readonly>
                        <button class="copy-btn" id="copy-referral-btn">
                            <i class="fas fa-copy"></i> Копировать
                        </button>
                    </div>
                    <div class="referral-info">
                        <p>💫 За каждого друга вы получаете 1 бесплатную прокрутку колеса!</p>
                    </div>
                    <button class="share-btn" id="share-referral-btn">
                        <i class="fas fa-share"></i> Поделиться в Telegram
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчики событий
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#copy-referral-btn').addEventListener('click', () => {
            this.copyReferralLink(referralLink);
        });
        
        modal.querySelector('#share-referral-btn').addEventListener('click', () => {
            const shareText = '🎰 Привет! Присоединяйся к Kosmetichka Lottery Bot - крути рулетку и выигрывай призы! 💄✨';
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;
            
            if (this.app.tg && this.app.tg.openTelegramLink) {
                this.app.tg.openTelegramLink(shareUrl);
            } else {
                window.open(shareUrl, '_blank');
            }
        });
        
        // Автоматически копируем ссылку
        this.copyReferralLink(referralLink);
    }
    
    copyReferralLink(link) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(link).then(() => {
                this.app.showStatusMessage('Ссылка скопирована в буфер обмена!', 'success');
            }).catch(() => {
                this.fallbackCopyTextToClipboard(link);
            });
        } else {
            this.fallbackCopyTextToClipboard(link);
        }
    }
    
    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.app.showStatusMessage('Ссылка скопирована в буфер обмена!', 'success');
        } catch (err) {
            this.app.showStatusMessage('Не удалось скопировать ссылку', 'error');
        }
        
        document.body.removeChild(textArea);
    }
}

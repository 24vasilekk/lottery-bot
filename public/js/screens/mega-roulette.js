// public/js/screens/mega-roulette.js - ПОЛНЫЙ ФАЙЛ МЕГА РУЛЕТКИ

export class MegaRouletteScreen {
    constructor(app) {
        this.app = app;
        this.isSpinning = false;
        this.wheelRotation = 0;
        this.countdownInterval = null;
        this.lastCanSpinStatus = null;
        
        // Устанавливаем глобальную ссылку для onclick обработчиков
        window.megaRouletteScreen = this;
        
        this.megaPrizes = [
            { id: 'airpods4', name: 'AirPods 4', icon: '🎧', rarity: 'legendary', value: 25000 },
            { id: 'cert5000', name: 'Сертификат 5000₽', icon: '💎', rarity: 'epic', value: 5000 },
            { id: 'cert3000', name: 'Сертификат 3000₽', icon: '💰', rarity: 'rare', value: 3000 },
            { id: 'powerbank', name: 'Повербанк', icon: '🔋', rarity: 'rare', value: 2000 },
            { id: 'cert2000', name: 'Сертификат 2000₽', icon: '💳', rarity: 'common', value: 2000 },
            { id: 'charger', name: 'Беспроводная зарядка', icon: '⚡', rarity: 'common', value: 1500 },
            { id: 'cert1000', name: 'Сертификат 1000₽', icon: '🎁', rarity: 'common', value: 1000 },
            { id: 'stars100', name: '100 звезд', icon: '⭐', rarity: 'common', value: 100 },
            { id: 'empty', name: 'Повезет в следующий раз', icon: '🌟', rarity: 'empty', value: 0 }
        ];
    }

    // Найдите метод render() и замените блок с mega-spin-info на этот код:

    render() {
        const userStars = this.app.gameData.stars;
        
        return `
            <div class="mega-container">
                <div class="mega-header">
                    <button id="mega-back-btn" class="back-btn">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="mega-title">
                        <h2>🎰 МЕГА РУЛЕТКА</h2>
                        <p>Скоро запуск!</p>
                    </div>
                    <div class="mega-stars">
                        <i class="fas fa-star"></i>
                        <span>${userStars.toLocaleString()}</span>
                    </div>
                </div>

                <!-- ПРЕВЬЮ БЛОК -->
                <div class="mega-preview-card">
                    <div class="preview-icon">
                        <div class="coming-soon-badge">СКОРО</div>
                        <div class="mega-crown-animation">👑</div>
                    </div>
                    
                    <h3>МЕГА РУЛЕТКА</h3>
                    <p class="preview-subtitle">Эксклюзивная рулетка для VIP игроков</p>
                    
                    <div class="launch-countdown">
                        <div class="countdown-label">Запуск через:</div>
                        <div class="countdown-timer" id="mega-countdown">
                            <div class="time-unit">
                                <span class="time-value" id="days">30</span>
                                <span class="time-label">дней</span>
                            </div>
                            <div class="time-separator">:</div>
                            <div class="time-unit">
                                <span class="time-value" id="hours">00</span>
                                <span class="time-label">часов</span>
                            </div>
                            <div class="time-separator">:</div>
                            <div class="time-unit">
                                <span class="time-value" id="minutes">00</span>  
                                <span class="time-label">минут</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ПРИЗОВОЙ ФОНД -->
                <div class="mega-prizes-showcase">
                    <h3>💎 Призовой фонд</h3>
                    <div class="mega-prizes-grid">
                        <div class="mega-prize-card legendary preview">
                            <div class="prize-icon">🎧</div>
                            <div class="prize-name">AirPods 4</div>
                            <div class="preview-label">Главный приз</div>
                        </div>
                        <div class="mega-prize-card epic preview">
                            <div class="prize-icon">💎</div>
                            <div class="prize-name">Сертификат 5000₽</div>
                            <div class="preview-label">VIP приз</div>
                        </div>
                        <div class="mega-prize-card rare preview">
                            <div class="prize-icon">🔋</div>
                            <div class="prize-name">Повер-банк</div>
                            <div class="preview-label">Полезный приз</div>
                        </div>
                        <div class="mega-prize-card others preview">
                            <div class="prize-icon">✨</div>
                            <div class="prize-name">Другие призы</div>
                            <div class="preview-label">Сюрпризы</div>
                        </div>
                    </div>
                </div>

                <!-- УСЛОВИЯ ДОСТУПА -->
                <div class="access-conditions">
                    <h3>🔑 Как получить доступ</h3>
                    <div class="conditions-grid">
                        <div class="condition-card">
                            <div class="condition-icon">🏆</div>
                            <div class="condition-title">Топ 15 лидерборда</div>
                            <div class="condition-desc">Войди в топ 15 лучших игроков месяца</div>
                            <div class="condition-status monthly">Ежемесячно</div>
                        </div>
                        <div class="condition-or">ИЛИ</div>
                        <div class="condition-card">
                            <div class="condition-icon">⭐</div>
                            <div class="condition-title">5000 звезд</div>
                            <div class="condition-desc">Потрать 5000 звезд за одну прокрутку</div>
                            <div class="condition-status ${userStars >= 5000 ? 'available' : 'need-more'}">
                                ${userStars >= 5000 ? 'Доступно' : `Нужно еще ${(5000 - userStars).toLocaleString()}`}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ИНФОРМАЦИЯ О ЗАПУСКЕ -->
                <div class="launch-info">
                    <div class="info-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span><strong>Дата запуска:</strong> ${this.getLaunchDate()}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-trophy"></i>
                        <span><strong>Периодичность:</strong> Ежемесячно для топ игроков</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-star"></i>
                        <span><strong>Стоимость:</strong> 5000 звезд за прокрутку</span>
                    </div>
                </div>

                <!-- КНОПКА УВЕДОМЛЕНИЙ -->
                <div class="notification-section">
                    <button class="notify-btn" id="notify-btn">
                        <i class="fas fa-bell"></i>
                        <span>Уведомить о запуске</span>
                    </button>
                    <p class="notify-text">Получи уведомление в нашем Telegram канале, когда мега рулетка станет доступна!</p>
                </div>
            </div>
        `;
    }

    // Обновите метод init() для превью:
    init() {
        console.log('🎰 Инициализация превью мега рулетки...');
        this.setupEventListeners();
        this.startCountdown();
        console.log('✅ Превью мега рулетки инициализировано');
    }

    // Обновите setupEventListeners():
    setupEventListeners() {
        // Обработчик кнопки возврата
        const backBtn = document.getElementById('mega-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.app.navigation.navigateTo('main');
            });
        }

        // Обработчик кнопки уведомлений
        const notifyBtn = document.getElementById('notify-btn');
        if (notifyBtn) {
            notifyBtn.addEventListener('click', () => {
                this.subscribeToNotifications();
            });
        }
    }

    // Новый метод для подписки на уведомления:
    subscribeToNotifications() {
        if (this.app.tg?.openTelegramLink) {
            this.app.tg.openTelegramLink('https://t.me/kosmetichka_official');
            this.app.showStatusMessage('Переход в наш канал для уведомлений!', 'success');
        } else {
            this.app.showStatusMessage('Подпишись на @kosmetichka_official для уведомлений!', 'info');
        }
    }

    generateMegaWheelSegments() {
        const container = document.getElementById('mega-wheel-segments');
        if (!container) {
            console.error('❌ Контейнер сегментов мега рулетки не найден');
            return;
        }

        // ИДЕАЛЬНО РОВНЫЙ КРУГ - точные параметры
        const radius = 150;
        const centerX = 160;
        const centerY = 160;
        const segmentCount = this.megaPrizes.length;
        const anglePerSegment = (2 * Math.PI) / segmentCount;
        
        console.log(`🎯 Генерируем ${segmentCount} идеально ровных сегментов`);

        // Упрощенные градиенты для размытого эффекта
        const segmentColors = [
            { from: '#FFD700', to: '#FFA500' },
            { from: '#FF6347', to: '#FF4500' },
            { from: '#9370DB', to: '#8A2BE2' },
            { from: '#00BFFF', to: '#1E90FF' },
            { from: '#32CD32', to: '#228B22' },
            { from: '#FF1493', to: '#DC143C' },
            { from: '#FF8C00', to: '#FF7F50' },
            { from: '#DA70D6', to: '#BA55D3' },
            { from: '#20B2AA', to: '#008B8B' }
        ];

        let svgContent = '';
        
        // Создаем определения градиентов
        let defsContent = '<defs>';
        
        // Добавляем только градиенты без теней для чистоты
        for (let i = 0; i < segmentCount; i++) {
            const colorIndex = i % segmentColors.length;
            const color = segmentColors[colorIndex];
            
            defsContent += `
                <radialGradient id="megaGrad${i}" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:${color.from};stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:${color.to};stop-opacity:1" />
                </radialGradient>
            `;
        }
        
        defsContent += '</defs>';

        // Создаем идеально ровные сегменты БЕЗ иконок и текста
        for (let i = 0; i < segmentCount; i++) {
            const startAngle = i * anglePerSegment - Math.PI / 2; // Начинаем сверху
            const endAngle = (i + 1) * anglePerSegment - Math.PI / 2;

            // Точные координаты для идеального круга
            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            // Определяем большую дугу для правильного отображения
            const largeArcFlag = anglePerSegment > Math.PI ? 1 : 0;

            // Создаем идеально ровный путь сегмента
            const pathData = [
                `M ${centerX} ${centerY}`,                    // Центр
                `L ${x1.toFixed(3)} ${y1.toFixed(3)}`,       // Первая линия
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`, // Дуга
                'Z'                                           // Закрытие
            ].join(' ');

            // ЧИСТЫЙ сегмент без деталей
            svgContent += `
                <path 
                    d="${pathData}" 
                    fill="url(#megaGrad${i})" 
                    stroke="rgba(255,255,255,0.2)" 
                    stroke-width="0.5"
                    class="mega-segment-path"
                    data-prize-id="${this.megaPrizes[i].id}"
                    data-segment-index="${i}"
                />
            `;
        }

        // Собираем финальный SVG
        container.innerHTML = defsContent + svgContent;
        
        console.log('✅ Идеально ровное колесо создано');
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
        const wonPrize = await this.calculateMegaPrize();
        const segmentAngle = 360 / this.megaPrizes.length;
        const winIndex = this.megaPrizes.findIndex(p => p.id === wonPrize.id);
        
        // Рассчитываем поворот
        const targetAngle = (winIndex * segmentAngle) + (segmentAngle / 2);
        const spins = 5 + Math.random() * 3; // 5-8 полных оборотов
        const finalRotation = (spins * 360) + targetAngle;

        // Получаем элементы колеса
        const wheel = document.getElementById('mega-wheel-svg');
        const wheelContainer = document.getElementById('mega-wheel');
        
        if (wheel && wheelContainer) {
            // Добавляем класс spinning для дополнительного размытия
            wheelContainer.classList.add('spinning');
            
            // Крутим колесо
            this.wheelRotation += finalRotation;
            wheel.style.transition = 'transform 4s cubic-bezier(0.23, 1, 0.320, 1)';
            wheel.style.transform = `rotate(${this.wheelRotation}deg)`;
        }

        // Вибрация
        if (this.app.tg && this.app.tg.HapticFeedback) {
            this.app.tg.HapticFeedback.impactOccurred('heavy');
        }

        // Ждем завершения анимации
        setTimeout(() => {
            // Убираем класс spinning для возврата к обычному размытию
            if (wheelContainer) {
                wheelContainer.classList.remove('spinning');
            }
            
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

    async calculateMegaPrize() {
        try {
            // Получаем актуальные настройки шансов из публичного API
            const response = await fetch('/api/wheel-settings/mega');
            let prizeChances = [];
            
            if (response.ok) {
                const settings = await response.json();
                if (settings.prizes && settings.prizes.length > 0) {
                    // Используем настройки из админки
                    prizeChances = settings.prizes;
                } else {
                    // Используем дефолтные настройки
                    prizeChances = this.getDefaultMegaPrizeChances();
                }
            } else {
                // Если API недоступно, используем дефолтные настройки
                prizeChances = this.getDefaultMegaPrizeChances();
            }
            
            // Определяем выигрыш на основе шансов
            const random = Math.random() * 100;
            let cumulative = 0;
            
            for (const prizeChance of prizeChances) {
                cumulative += prizeChance.chance;
                if (random < cumulative) {
                    return this.megaPrizes.find(p => p.id === prizeChance.id);
                }
            }
            
            // Если ничего не выпало (не должно происходить), возвращаем пустой приз
            return this.megaPrizes.find(p => p.id === 'empty');
            
        } catch (error) {
            console.error('Ошибка получения настроек мега рулетки:', error);
            // В случае ошибки используем дефолтную логику
            return this.calculateMegaPrizeDefault();
        }
    }
    
    getDefaultMegaPrizeChances() {
        return [
            { id: 'airpods4', chance: 0.5 },
            { id: 'cert5000', chance: 2.5 },
            { id: 'cert3000', chance: 6.0 },
            { id: 'powerbank', chance: 9.0 },
            { id: 'cert2000', chance: 13.0 },
            { id: 'charger', chance: 16.0 },
            { id: 'cert1000', chance: 18.0 },
            { id: 'stars100', chance: 15.0 },
            { id: 'empty', chance: 20.0 }
        ];
    }
    
    calculateMegaPrizeDefault() {
        const random = Math.random() * 100;
        
        // Дефолтные шансы выигрыша
        if (random < 0.1) return this.megaPrizes.find(p => p.id === 'airpods4');
        if (random < 2) return this.megaPrizes.find(p => p.id === 'cert5000');
        if (random < 7) return this.megaPrizes.find(p => p.id === 'cert3000');
        if (random < 15) return this.megaPrizes.find(p => p.id === 'powerbank');
        if (random < 27) return this.megaPrizes.find(p => p.id === 'cert2000');
        if (random < 42) return this.megaPrizes.find(p => p.id === 'charger');
        if (random < 60) return this.megaPrizes.find(p => p.id === 'cert1000');
        if (random < 75) return this.megaPrizes.find(p => p.id === 'stars100');
        
        return this.megaPrizes.find(p => p.id === 'empty');
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
            this.showMegaWinModal(prize);
        } else {
            this.app.showStatusMessage('В этот раз не повезло, но вы получили опыт!', 'info');
        }
    }

    showMegaWinModal(prize) {
        const winModal = document.createElement('div');
        winModal.className = 'mega-win-modal';
        
        // Определяем тип приза и соответствующее сообщение
        let messageContent = '';
        let isStarsPrize = false;
        
        // Проверяем, является ли приз звездами (100 звезд)
        if (prize.id === 'stars100') {
            isStarsPrize = true;
            messageContent = `
                <div class="mega-win-content">
                    <div class="mega-win-fireworks"></div>
                    <div class="mega-win-icon">⭐</div>
                    <h2>ПОЗДРАВЛЯЕМ!</h2>
                    <h3>Вы выиграли 100 звезд!</h3>
                    <p class="mega-win-stars">Звезды уже зачислены на ваш баланс!</p>
                    <button class="mega-win-close btn-primary">Отлично!</button>
                </div>
            `;
            
            // ИСПРАВЛЕНО: НЕ добавляем звезды локально - сервер сделает это сам!
            console.log('⭐ Выиграно 100 звезд в мега-рулетке. Ожидаем обновления от сервера...');
        } else {
            // Для всех остальных призов (сертификаты, товары)
            const isCertificate = prize.id.includes('cert');
            const platform = isCertificate ? (
                prize.name.toLowerCase().includes('вб') ? 'Вайлдберриз' : 
                prize.name.toLowerCase().includes('я') ? 'Яндекс' : ''
            ) : '';
            
            messageContent = `
                <div class="mega-win-content">
                    <div class="mega-win-fireworks"></div>
                    <div class="mega-win-icon ${prize.rarity}">${prize.icon}</div>
                    <h2>🎉 ПОЗДРАВЛЯЕМ!</h2>
                    <h3>Вы выиграли:</h3>
                    <div class="mega-win-prize">${prize.name}</div>
                    <p class="mega-win-instruction">Для получения приза обратитесь в поддержку</p>
                    <div class="mega-prize-actions">
                        <button class="mega-support-btn" onclick="window.megaRouletteScreen?.openSupport()">
                            <i class="fas fa-headset"></i>
                            Связаться с поддержкой
                        </button>
                        <button class="mega-win-close">Понятно</button>
                    </div>
                </div>
            `;
        }
        
        winModal.innerHTML = messageContent;
        document.body.appendChild(winModal);

        // Закрытие модального окна
        const closeBtn = winModal.querySelector('.mega-win-close');
        closeBtn.addEventListener('click', () => {
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

    // Добавьте этот метод для получения даты запуска:
    getLaunchDate() {
        const launchDate = new Date();
        launchDate.setDate(launchDate.getDate() + 30);
        return launchDate.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
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

    // Обновленный метод обратного отсчета:
    startCountdown() {
        this.updateCountdown();
        this.countdownInterval = setInterval(() => {
            this.updateCountdown();
        }, 60000); // Обновляем каждую минуту
    }

    updateCountdown() {
        const now = new Date();
        const launchDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 дней от сейчас
        const timeDiff = launchDate.getTime() - now.getTime();
        
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        const daysEl = document.getElementById('days');
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        
        if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
        if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
        if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
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

    // Метод для открытия поддержки
    openSupport() {
        console.log('🎧 Открытие поддержки из мега рулетки');
        
        if (this.app.tg?.openTelegramLink) {
            this.app.tg.openTelegramLink('https://t.me/kosmetichkasupport');
            this.app.showStatusMessage('Переход в поддержку...', 'info');
        } else if (window.open) {
            // Fallback для браузера
            window.open('https://t.me/kosmetichkasupport', '_blank');
        } else {
            this.app.showStatusMessage('Поддержка: @kosmetichkasupport', 'info');
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

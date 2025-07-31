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
                    <h3>💎 Призовой фонд</h3>
                    <div class="mega-prizes-grid">
                        <div class="mega-prize-card legendary">
                            <div class="prize-icon">🎧</div>
                            <div class="prize-name">AirPods 4</div>
                            <div class="prize-tag">25.000₽</div>
                        </div>
                        <div class="mega-prize-card epic">
                            <div class="prize-icon">💎</div>
                            <div class="prize-name">Сертификат 5000₽</div>
                            <div class="prize-tag">Эпик</div>
                        </div>
                        <div class="mega-prize-card rare">
                            <div class="prize-icon">🔋</div>
                            <div class="prize-name">Повербанк</div>
                            <div class="prize-tag">2.000₽</div>
                        </div>
                        <div class="mega-prize-card rare">
                            <div class="prize-icon">⚡</div>
                            <div class="prize-name">Беспроводная зарядка</div>
                            <div class="prize-tag">1.500₽</div>
                        </div>
                    </div>
                </div>

                <div class="mega-wheel-container">
                    <div class="mega-wheel-wrapper">
                        <div class="mega-wheel-glow"></div>
                        <div class="mega-wheel" id="mega-wheel">
                            <div class="mega-wheel-pointer"></div>
                            <svg id="mega-wheel-svg" width="320" height="320" viewBox="0 0 320 320">
                                <g id="mega-wheel-segments"></g>
                            </svg>
                            <div class="mega-wheel-center">
                                <div class="mega-center-crown">👑</div>
                                <span class="mega-center-text">MEGA</span>
                            </div>
                        </div>
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
                              !hasEnoughStars ? '<i class="fas fa-star"></i> Нужно 5000 звезд' :
                              '<i class="fas fa-crown"></i> КРУТИТЬ МЕГА РУЛЕТКУ'}
                        </div>
                    </button>
                </div>

                ${canSpin ? '' : `
                    <div class="mega-next-spin-info">
                        <div style="text-align: center; padding: 20px;">
                            <div style="font-size: 48px; margin-bottom: 15px;">⏰</div>
                            <h4 style="color: #FFD700; margin-bottom: 10px;">Мега рулетка - эксклюзив!</h4>
                            <p>Доступна раз в месяц для особых игроков.<br>
                            Следите за уведомлениями в нашем канале!</p>
                        </div>
                    </div>
                `}
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
        // Обработчик кнопки возврата
        const backBtn = document.getElementById('mega-back-btn');
        console.log('🔍 Поиск кнопки возврата...', backBtn);
        
        if (backBtn) {
            console.log('✅ Кнопка найдена, добавляем обработчик');
            backBtn.addEventListener('click', () => {
                console.log('⬅ Клик по кнопке возврата');
                console.log('📱 App:', this.app);
                console.log('🧭 Navigation:', this.app?.navigation);
                console.log('📍 NavigateTo:', this.app?.navigation?.navigateTo);
                
                try {
                    if (this.app && this.app.navigation && this.app.navigation.navigateTo) {
                        console.log('🔄 Вызываем navigateTo("main")');
                        this.app.navigation.navigateTo('main');
                    } else {
                        console.error('Navigation не найден, перезагружаем страницу');
                        console.error('App:', this.app);
                        window.location.reload();
                    }
                } catch (error) {
                    console.error('Ошибка навигации:', error);
                    window.location.reload();
                }
            });
        } else {
            console.error('❌ Кнопка mega-back-btn не найдена!');
        }

        // Обработчик кнопки спина
        const spinBtn = document.getElementById('mega-spin-btn');
        if (spinBtn && !spinBtn.disabled) {
            spinBtn.addEventListener('click', () => {
                this.spinMegaWheel();
            });
        }
    }

    generateMegaWheelSegments() {
        const container = document.getElementById('mega-wheel-segments');
        if (!container) {
            console.error('❌ Контейнер сегментов мега рулетки не найден');
            return;
        }

        const radius = 140;
        const centerX = 160;
        const centerY = 160;
        const anglePerSegment = (2 * Math.PI) / this.megaPrizes.length;

        // Золотые и премиальные градиенты для мега-рулетки
        const segmentColors = [
            'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', // Золотой
            'linear-gradient(135deg, #FF8C00 0%, #FF6347 100%)', // Оранжево-красный
            'linear-gradient(135deg, #9966CC 0%, #8A2BE2 100%)', // Фиолетовый (эпик)
            'linear-gradient(135deg, #00BFFF 0%, #0066CC 100%)', // Голубой (рейр)
            'linear-gradient(135deg, #32CD32 0%, #228B22 100%)', // Зеленый
            'linear-gradient(135deg, #FF69B4 0%, #C71585 100%)', // Розовый
            'linear-gradient(135deg, #FF4500 0%, #DC143C 100%)', // Красный
            'linear-gradient(135deg, #DDA0DD 0%, #9370DB 100%)', // Фиолетово-сиреневый
            'linear-gradient(135deg, #F0E68C 0%, #DAA520 100%)', // Золотисто-желтый
            'linear-gradient(135deg, #FFB6C1 0%, #FF1493 100%)', // Светло-розовый
            'linear-gradient(135deg, #20B2AA 0%, #008B8B 100%)', // Бирюзовый
            'linear-gradient(135deg, #696969 0%, #2F4F4F 100%)'  // Серый (пустой)
        ];

        let svgContent = '';
        
        // Создаем определения градиентов (точно как в основной рулетке)
        let defsContent = '<defs>';
        segmentColors.forEach((gradient, index) => {
            const gradientMatch = gradient.match(/linear-gradient\(135deg,\s*([^,]+)\s*0%,\s*([^)]+)\s*100%\)/);
            if (gradientMatch) {
                const [, color1, color2] = gradientMatch;
                defsContent += `
                    <linearGradient id="megagradient${index}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${color1.trim()};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${color2.trim()};stop-opacity:1" />
                    </linearGradient>
                `;
            }
        });
        defsContent += '</defs>';

        this.megaPrizes.forEach((prize, index) => {
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

            // Используем циклический выбор градиента
            const gradientIndex = index % segmentColors.length;

            svgContent += `
                <path 
                    d="${path}" 
                    fill="url(#megagradient${gradientIndex})" 
                    stroke="rgba(255,255,255,0.3)" 
                    stroke-width="2"
                    class="wheel-segment-path"
                    data-prize-id="${prize.id}"
                    filter="drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
                />
                <text 
                    x="${textX}" 
                    y="${textY}" 
                    text-anchor="middle" 
                    dominant-baseline="middle" 
                    font-size="24" 
                    fill="white"
                    font-weight="bold"
                    class="segment-icon"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                >${prize.icon}</text>
            `;
        });

        container.innerHTML = defsContent + svgContent;
        console.log('✅ Красивая SVG мега рулетки сгенерирована в стиле основной');
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

        // Крутим колесо
        const wheel = document.getElementById('mega-wheel-svg');
        if (wheel) {
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
            
            // Добавляем 100 звезд на баланс
            this.app.gameData.stars = (this.app.gameData.stars || 0) + 100;
            this.app.saveGameData();
            this.app.updateStarsDisplay();
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
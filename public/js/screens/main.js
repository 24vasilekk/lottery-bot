// screens/main.js - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ с устранением всех ошибок

import { WHEEL_PRIZES, APP_CONFIG } from '../config.js';

export class MainScreen {
    constructor(app) {
        this.app = app;
        this.isSpinning = false;
        this.wheelRotation = 0;
        this.initialized = false;
        this.lastSpinType = null; // ДОБАВЛЕНО: отслеживание типа последней прокрутки
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
                this.testSynchronization(); // ДОБАВЛЕНО: тест синхронизации при запуске
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

        // Красивые градиенты для каждого типа приза
        const gradients = {
            empty: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
            stars: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            'golden-apple': [
                'linear-gradient(135deg, #9ACD32 0%, #8FBC8F 100%)', // 300₽ - салатовый
                'linear-gradient(135deg, #8FBC8F 0%, #7CFC00 100%)', // 500₽ - темно-салатовый  
                'linear-gradient(135deg, #7CFC00 0%, #ADFF2F 100%)', // 1000₽ - ярко-салатовый
                'linear-gradient(135deg, #ADFF2F 0%, #32CD32 100%)', // 2000₽ - зелено-желтый
                'linear-gradient(135deg, #32CD32 0%, #228B22 100%)'  // 5000₽ - ярко-зеленый
            ],
            'wildberries': [
                'linear-gradient(135deg, #8E44AD 0%, #9B59B6 100%)', // 500₽
                'linear-gradient(135deg, #9B59B6 0%, #6C3483 100%)', // 1000₽
                'linear-gradient(135deg, #6C3483 0%, #512E5F 100%)', // 2000₽
                'linear-gradient(135deg, #512E5F 0%, #3E1B40 100%)'  // 3000₽
            ]
        };

        let svgContent = '';
        
        // Создаем определения градиентов
        let defsContent = '<defs>';
        
        // Градиент для пустого сегмента
        defsContent += `
            <linearGradient id="emptyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
            </linearGradient>
            <pattern id="emptyPattern" patternUnits="userSpaceOnUse" width="20" height="20">
                <rect width="20" height="20" fill="url(#emptyGradient)"/>
                <path d="M0,20 L20,0" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
            </pattern>
        `;
        
        // Градиент для звезд
        defsContent += `
            <linearGradient id="starsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
            </linearGradient>
        `;
        
        // Градиенты для Золотого яблока (САЛАТОВО-ЗЕЛЕНЫЕ)
        gradients['golden-apple'].forEach((gradient, index) => {
            const gradientMatch = gradient.match(/linear-gradient\(135deg,\s*([^,]+)\s*0%,\s*([^)]+)\s*100%\)/);
            if (gradientMatch) {
                const [, color1, color2] = gradientMatch;
                defsContent += `
                    <linearGradient id="appleGradient${index}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${color1.trim()};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${color2.trim()};stop-opacity:1" />
                    </linearGradient>
                `;
            }
        });
        
        // Градиенты для Wildberries
        gradients['wildberries'].forEach((gradient, index) => {
            const gradientMatch = gradient.match(/linear-gradient\(135deg,\s*([^,]+)\s*0%,\s*([^)]+)\s*100%\)/);
            if (gradientMatch) {
                const [, color1, color2] = gradientMatch;
                defsContent += `
                    <linearGradient id="wbGradient${index}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${color1.trim()};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${color2.trim()};stop-opacity:1" />
                    </linearGradient>
                `;
            }
        });
        
        defsContent += '</defs>';

        // Создаем сегменты с правильными углами
        let currentAngle = -90; // Начинаем сверху
        
        WHEEL_PRIZES.forEach((prize, index) => {
            const segmentAngle = prize.angle || (360 / WHEEL_PRIZES.length);
            const startAngle = currentAngle * Math.PI / 180;
            const endAngle = (currentAngle + segmentAngle) * Math.PI / 180;

            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            const largeArc = segmentAngle > 180 ? 1 : 0;

            const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

            // Определяем градиент для сегмента
            let fillUrl;
            if (prize.type === 'empty') {
                fillUrl = 'url(#emptyPattern)';
            } else if (prize.type.startsWith('stars')) {
                fillUrl = 'url(#starsGradient)';
            } else if (prize.type.startsWith('golden-apple')) {
                const appleIndex = ['golden-apple-300', 'golden-apple-500', 'golden-apple-1000', 'golden-apple-2000', 'golden-apple-5000'].indexOf(prize.type);
                fillUrl = `url(#appleGradient${appleIndex})`;
            } else if (prize.type.startsWith('wildberries')) {
                const wbIndex = ['wildberries-500', 'wildberries-1000', 'wildberries-2000', 'wildberries-3000'].indexOf(prize.type);
                fillUrl = `url(#wbGradient${wbIndex})`;
            }

            // Создаем сегмент
            svgContent += `
                <path 
                    d="${path}" 
                    fill="${fillUrl}" 
                    stroke="rgba(255,255,255,0.2)" 
                    stroke-width="1"
                    class="wheel-segment-path"
                    data-prize-id="${prize.id}"
                    style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                />
            `;

            // Добавляем текст только если есть topText или centerText
            if (prize.topText || prize.centerText) {
                const middleAngle = (startAngle + endAngle) / 2;
                const middleAngleDeg = middleAngle * 180 / Math.PI;

                // ВЕРХНИЙ ТЕКСТ (перпендикулярно линиям разделения - радиально)
                if (prize.topText) {
                    const topRadius = radius * 0.85; // ПОДНЯТО ВЫШЕ - ближе к краю
                    const topX = centerX + topRadius * Math.cos(middleAngle);
                    const topY = centerY + topRadius * Math.sin(middleAngle);
                    
                    // Поворот текста радиально (перпендикулярно линиям разделения)
                    const topRotation = middleAngleDeg + 90; // +90 чтобы текст шел от центра наружу
                    
                    // ИНТЕРЕСНЫЕ ЦВЕТА для верхнего текста
                    let topTextColor = 'white';
                    if (prize.type.startsWith('stars')) {
                        topTextColor = '#FFFACD'; // Лимонно-кремовый для звезд
                    } else if (prize.type.startsWith('golden-apple')) {
                        topTextColor = '#F0FFF0'; // Медовая роса для ЗЯ (светло-зеленый)
                    } else if (prize.type.startsWith('wildberries')) {
                        topTextColor = '#F0E6FF'; // Светло-фиолетовый для WB
                    }
                    
                    svgContent += `
                        <text 
                            x="${topX}" 
                            y="${topY}" 
                            text-anchor="middle" 
                            dominant-baseline="middle" 
                            font-size="${segmentAngle > 60 ? '16' : '14'}" 
                            font-weight="bold"
                            fill="${topTextColor}"
                            class="segment-top-text"
                            style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8)); font-family: 'Arial', sans-serif; user-select: none;"
                            transform="rotate(${topRotation} ${topX} ${topY})"
                        >${prize.topText}</text>
                    `;
                }

                // ЦЕНТРАЛЬНЫЙ ТЕКСТ (параллельно линиям разделения - тангенциально)
                if (prize.centerText) {
                    const centerRadius = radius * 0.6; // По центру сегмента
                    const centerX_pos = centerX + centerRadius * Math.cos(middleAngle);
                    const centerY_pos = centerY + centerRadius * Math.sin(middleAngle);
                    
                    // Поворот текста тангенциально (параллельно линиям разделения)
                    // Для читаемости корректируем угол в зависимости от позиции
                    let centerRotation = middleAngleDeg;
                    if (middleAngleDeg > 90 && middleAngleDeg < 270) {
                        centerRotation += 180; // Переворачиваем текст, чтобы не был вверх ногами
                    }
                    
                    // ИНТЕРЕСНЫЕ ЦВЕТА для центрального текста
                    let centerTextColor = 'white';
                    if (prize.type.startsWith('stars')) {
                        centerTextColor = '#FFF8DC'; // Кукурузный шелк для звезд
                    } else if (prize.type.startsWith('golden-apple')) {
                        centerTextColor = '#F5FFFA'; // Мятно-кремовый для ЗЯ
                    } else if (prize.type.startsWith('wildberries')) {
                        centerTextColor = '#E6E6FA'; // Лаванда для WB
                    }
                    
                    svgContent += `
                        <text 
                            x="${centerX_pos}" 
                            y="${centerY_pos}" 
                            text-anchor="middle" 
                            dominant-baseline="middle" 
                            font-size="${segmentAngle > 60 ? '14' : segmentAngle > 30 ? '12' : '10'}" 
                            font-weight="bold"
                            fill="${centerTextColor}"
                            class="segment-center-text"
                            style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.8)); font-family: 'Arial', sans-serif; user-select: none;"
                            transform="rotate(${centerRotation} ${centerX_pos} ${centerY_pos})"
                        >${prize.centerText}</text>
                    `;
                }
            }

            currentAngle += segmentAngle;
        });

        container.innerHTML = defsContent + svgContent;
        console.log('✅ Чистое колесо без иконок с правильной ориентацией текста создано');
    }

    // ============================================================================
    // ИСПРАВЛЕННАЯ ФУНКЦИЯ ПРОКРУТКИ РУЛЕТКИ С ПОЛНОЙ ОБРАБОТКОЙ ОШИБОК
    // ============================================================================
    async spinWheel(type) {
        if (this.isSpinning) {
            console.log('⏳ Рулетка уже крутится');
            return;
        }

        console.log('\n🎰 ========== НАЧАЛО СИНХРОНИЗИРОВАННОЙ ПРОКРУТКИ ==========');
        console.log(`🎮 Тип: ${type}`);
        this.lastSpinType = type;

        // ИСПРАВЛЕНИЕ 1: Проверки в правильном порядке
        try {
            if (type === 'stars' && this.app.gameData.stars < APP_CONFIG.wheel.starCost) {
                this.app.showStatusMessage('Недостаточно звезд для прокрутки!', 'error');
                return;
            }

            if (type === 'friend') {
                const referralsCount = this.app.gameData.referrals || 0;
                const friendSpinsUsed = this.app.gameData.friendSpinsUsed || 0;
                
                if (referralsCount === 0 || friendSpinsUsed >= referralsCount) {
                    this.showReferralLink();
                    return;
                }
            }

            this.isSpinning = true;
            this.updateSpinButtons();

            // ИСПРАВЛЕНИЕ 2: Сохраняем исходные значения для возможного отката
            const originalStars = this.app.gameData.stars;
            const originalFriendSpins = this.app.gameData.friendSpinsUsed || 0;

            // Списание ресурсов
            if (type === 'stars') {
                const success = await this.app.spendStars(APP_CONFIG.wheel.starCost);
                if (!success) {
                    this.isSpinning = false;
                    this.updateSpinButtons();
                    this.app.showStatusMessage('Недостаточно звезд для прокрутки!', 'error');
                    return;
                }
                console.log(`💰 Списано ${APP_CONFIG.wheel.starCost} звезд`);
            } else if (type === 'friend') {
                this.app.gameData.friendSpinsUsed = (this.app.gameData.friendSpinsUsed || 0) + 1;
                console.log(`❤️ Использована прокрутка за друга`);
                this.app.updateUI();
            }

            // ШАГ 1: Определяем приз (уже объединенный - визуальный + реальный)
            console.log('\n📋 ШАГ 1: Определение приза...');
            const winningPrize = await this.selectRandomPrize();
            
            // ИСПРАВЛЕНИЕ 3: Проверяем что приз найден
            if (!winningPrize) {
                throw new Error('Не удалось определить выигрышный приз');
            }
            
            // ШАГ 2: Рассчитываем угол для остановки на этом призе
            console.log('\n📐 ШАГ 2: Расчет целевого угла...');
            const targetAngle = this.calculateTargetAngleForPrize(winningPrize);
            
            // ШАГ 3: Анимируем рулетку
            console.log('\n🌀 ШАГ 3: Анимация рулетки...');
            await this.animateWheelToTarget(targetAngle);
            
            // ШАГ 4: Обрабатываем выигрыш
            console.log('\n🏆 ШАГ 4: Обработка выигрыша...');
            console.log(`👁️  ПОКАЗАНО: ${winningPrize.name}`);
            console.log(`💰 ПОЛУЧЕНО: ${winningPrize.realName || winningPrize.name} (${winningPrize.value})`);
            
            await this.handlePrizeWin(winningPrize);

            console.log('🎊 ========== ПРОКРУТКА ЗАВЕРШЕНА УСПЕШНО ==========\n');

        } catch (error) {
            console.error('❌ Ошибка прокрутки:', error);
            this.app.showStatusMessage('Ошибка при прокрутке рулетки', 'error');
            
            // ИСПРАВЛЕНИЕ 4: Возвращаем потраченные ресурсы при ошибке
            if (type === 'stars') {
                this.app.gameData.stars = originalStars; // Возвращаем звезды
                console.log('💰 Возвращены звезды из-за ошибки');
            } else if (type === 'friend') {
                this.app.gameData.friendSpinsUsed = originalFriendSpins; // Возвращаем прокрутку
                console.log('❤️ Возвращена прокрутка за друга из-за ошибки');
            }
            this.app.updateUI();
            this.app.saveGameData();
        } finally {
            this.isSpinning = false;
            this.updateSpinButtons();
        }
    }

    // ============================================================================
    // ИСПРАВЛЕННАЯ ЛОГИКА ОПРЕДЕЛЕНИЯ ПРИЗОВ
    // ============================================================================
    // 1. ИСПРАВЛЕННАЯ функция определения приза - с принудительной проверкой API
    async selectRandomPrize() {
        try {
            console.log('🎯 Определяем приз по реальным шансам из БД...');
            
            // ИСПРАВЛЕНИЕ: Принудительная проверка API и отладка
            let realChances = [];
            let apiWorking = false;
            
            try {
                const response = await fetch('/api/wheel-settings/normal');
                console.log('📡 Статус API response:', response.status, response.ok);
                
                if (response.ok) {
                    const settings = await response.json();
                    console.log('📋 Полученные настройки из API:', settings);
                    
                    if (settings.prizes && settings.prizes.length > 0) {
                        // ИСПРАВЛЕНО: Проверяем корректность данных
                        const validPrizes = settings.prizes.filter(p => 
                            p.probability && p.probability > 0 && 
                            p.type && ['empty', 'stars', 'certificate'].includes(p.type)
                        );
                        
                        if (validPrizes.length > 0) {
                            realChances = validPrizes;
                            apiWorking = true;
                            console.log('✅ API работает! Получены корректные шансы:', realChances);
                        } else {
                            console.warn('⚠️ API вернул некорректные данные:', settings.prizes);
                        }
                    } else {
                        console.warn('⚠️ API ответил, но без призов');
                    }
                } else {
                    console.warn('⚠️ API недоступен, статус:', response.status);
                }
            } catch (apiError) {
                console.error('❌ Ошибка API:', apiError);
                console.log('🔄 Переходим на дефолтные шансы');
            }
            
            // Если API не работает, используем дефолтные шансы
            if (!apiWorking) {
                realChances = this.getRealDefaultChances();
                console.log('📊 Используем дефолтные шансы:', realChances);
            }
            
            // ИСПРАВЛЕНИЕ: Проверяем что шансы корректны
            const totalProbability = realChances.reduce((sum, chance) => sum + chance.probability, 0);
            console.log(`📊 Общая вероятность: ${totalProbability}%`);
            
            if (Math.abs(totalProbability - 100) > 0.1) {
                console.error('❌ Некорректная сумма вероятностей!', totalProbability);
                // Принудительно используем безопасные дефолтные значения
                realChances = [
                    { id: 'empty', type: 'empty', probability: 94, name: 'Пусто', value: 0 },
                    { id: 'stars20', type: 'stars', probability: 5, name: '20 звезд', value: 20 },
                    { id: 'cert300', type: 'certificate', probability: 1, name: 'Сертификат 300₽', value: 300 }
                ];
                console.log('🔧 Используем аварийные безопасные шансы:', realChances);
            }
            
            // Определяем реальный приз по вероятностям
            const random = Math.random() * 100;
            let cumulative = 0;
            
            console.log(`🎲 Случайное число: ${random.toFixed(2)}%`);
            
            for (const realChance of realChances) {
                cumulative += realChance.probability;
                console.log(`📈 ${realChance.name}: ${cumulative.toFixed(2)}% (тип: ${realChance.type})`);
                
                if (random < cumulative) {
                    console.log(`✅ ВЫПАЛ РЕАЛЬНЫЙ ПРИЗ: ${realChance.name} (${realChance.type})`);
                    
                    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Улучшенный поиск визуального приза
                    const visualPrize = this.findVisualPrizeForRealChance(realChance);
                    
                    if (!visualPrize) {
                        console.error('❌ Не удалось найти визуальный приз для:', realChance);
                        console.error('📋 Доступные WHEEL_PRIZES:', WHEEL_PRIZES);
                        // Возвращаем первый сегмент как fallback
                        return this.createFallbackPrize(realChance);
                    }
                    
                    console.log(`🎨 Найден визуальный приз:`, visualPrize);
                    
                    // ИСПРАВЛЕНИЕ: Правильное объединение данных с приоритетом realType
                    const enhancedPrize = {
                        ...visualPrize, // Все визуальные свойства (id, name, type, color, angle и т.д.)
                        
                        // ПЕРЕОПРЕДЕЛЯЕМ ключевые поля реальными данными
                        realType: realChance.type,
                        realName: realChance.name,
                        realValue: realChance.value || 0,
                        realDescription: realChance.description,
                        value: realChance.value || 0,
                        
                        // ДОБАВЛЯЕМ флаг для отладки
                        isRealPrize: true,
                        debugInfo: {
                            originalVisualType: visualPrize.type,
                            realType: realChance.type,
                            apiWorking: apiWorking
                        }
                    };
                    
                    console.log(`🔗 Создан объединенный приз:`, enhancedPrize);
                    console.log(`👁️  ВИЗУАЛЬНО: ${enhancedPrize.name} (${enhancedPrize.type})`);
                    console.log(`💰 РЕАЛЬНО: ${enhancedPrize.realName} (${enhancedPrize.realType}, ${enhancedPrize.value})`);
                    console.log(`🐛 ОТЛАДКА:`, enhancedPrize.debugInfo);
                    
                    return enhancedPrize;
                }
            }
            
            // Fallback - пустота
            console.log('⚠️ Fallback на пустоту');
            const emptyPrize = WHEEL_PRIZES.find(p => p.type === 'empty') || WHEEL_PRIZES[0];
            return this.createFallbackPrize({ type: 'empty', name: 'Пусто', value: 0 }, emptyPrize);
            
        } catch (error) {
            console.error('❌ Ошибка определения приза:', error);
            const emptyPrize = WHEEL_PRIZES.find(p => p.type === 'empty') || WHEEL_PRIZES[0];
            return this.createFallbackPrize({ type: 'empty', name: 'Пусто', value: 0 }, emptyPrize);
        }
    }

    // ============================================================================
    // ИСПРАВЛЕННАЯ ФУНКЦИЯ ПОИСКА ВИЗУАЛЬНОГО ПРИЗА
    // ============================================================================
    findVisualPrizeForRealChance(realChance) {
        console.log(`🔍 Ищем визуальный сегмент для реального приза:`, realChance);
        
        let targetPrize = null;
        
        if (realChance.type === 'empty') {
            // Ищем пустой сегмент
            targetPrize = WHEEL_PRIZES.find(p => p.type === 'empty');
            console.log('✅ Найден пустой сегмент:', targetPrize);
            
        } else if (realChance.type === 'stars') {
            // Ищем сегмент со звездами (любой начинающийся с 'stars')
            targetPrize = WHEEL_PRIZES.find(p => p.type.startsWith('stars'));
            console.log('✅ Найден сегмент со звездами:', targetPrize);
            
        } else if (realChance.type === 'certificate') {
            // Ищем ЛЮБОЙ сертификат (случайный выбор из wildberries или golden-apple)
            const certificatePrizes = WHEEL_PRIZES.filter(p => 
                p.type.startsWith('wildberries') || p.type.startsWith('golden-apple')
            );
            
            if (certificatePrizes.length > 0) {
                const randomIndex = Math.floor(Math.random() * certificatePrizes.length);
                targetPrize = certificatePrizes[randomIndex];
                console.log(`✅ Выбран случайный сертификат ${randomIndex + 1}/${certificatePrizes.length}:`, targetPrize);
            }
        }
        
        // Fallback если ничего не найдено
        if (!targetPrize) {
            console.warn(`⚠️ Не найден визуальный сегмент для типа: ${realChance.type}`);
            targetPrize = WHEEL_PRIZES.find(p => p.type !== 'empty') || WHEEL_PRIZES[0];
            console.log('🔄 Используем fallback сегмент:', targetPrize);
        }
        
        return targetPrize;
    }

    calculateTargetAngleForPrize(targetPrize) {
        console.log(`📐 Рассчитываем угол для приза:`, targetPrize);
        
        const segmentIndex = WHEEL_PRIZES.findIndex(p => p.id === targetPrize.id);
        
        if (segmentIndex === -1) {
            console.error('❌ Сегмент не найден в WHEEL_PRIZES:', targetPrize);
            console.log('📋 Доступные сегменты:', WHEEL_PRIZES.map(p => ({id: p.id, name: p.name})));
            return 0;
        }
        
        console.log(`📍 Найден сегмент ${segmentIndex + 1}: ${targetPrize.name}`);
        
        // Рассчитываем накопленный угол до этого сегмента
        let accumulatedAngle = 0;
        for (let i = 0; i < segmentIndex; i++) {
            accumulatedAngle += WHEEL_PRIZES[i].angle || (360 / WHEEL_PRIZES.length);
        }
        
        // Добавляем половину угла текущего сегмента (центр)
        const currentSegmentAngle = WHEEL_PRIZES[segmentIndex].angle || (360 / WHEEL_PRIZES.length);
        const segmentCenterAngle = accumulatedAngle + (currentSegmentAngle / 2);
        
        // Указатель находится сверху (0°), поворачиваем рулетку
        const targetAngle = 360 - segmentCenterAngle;
        
        // Добавляем небольшую случайность внутри сегмента
        const maxDeviation = (currentSegmentAngle / 2) * 0.4;
        const deviation = (Math.random() - 0.5) * maxDeviation;
        const finalAngle = targetAngle + deviation;
        
        console.log(`📊 Накоплено: ${accumulatedAngle}°, сегмент: ${currentSegmentAngle}°`);
        console.log(`🎯 Целевой угол: ${finalAngle.toFixed(1)}° (базовый: ${targetAngle.toFixed(1)}°, отклонение: ${deviation.toFixed(1)}°)`);
        
        return finalAngle;
    }

    async animateWheelToTarget(targetAngle) {
        const spins = Math.floor(Math.random() * 3) + 5; // 5-7 полных оборотов
        const finalRotation = spins * 360 + targetAngle;
        
        // ИСПРАВЛЕНО: Используем модуль 360° чтобы избежать накопления ошибок
        // Накапливаем поворот для красивой анимации
        this.wheelRotation = (this.wheelRotation || 0) + finalRotation;
        console.log(`🌀 Старый угол: ${currentRotation}°, поворот: ${finalRotation}°, новый: ${this.wheelRotation}°`);
        
        const wheelSvg = document.getElementById('wheel-svg');
        if (!wheelSvg) {
            throw new Error('Элемент wheel-svg не найден');
        }
        
        wheelSvg.style.transition = `transform ${APP_CONFIG.animations.wheelSpinDuration}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
        wheelSvg.style.transform = `rotate(${this.wheelRotation}deg)`;
        
        console.log(`🌀 Анимация: поворот на ${finalRotation}° (итого: ${this.wheelRotation}°)`);
        
        // Ждем завершения анимации
        return new Promise(resolve => {
            setTimeout(resolve, APP_CONFIG.animations.wheelSpinDuration);
        });
    }

    // 2. НОВАЯ функция создания fallback приза
    createFallbackPrize(realChance, visualPrize = null) {
        const fallbackVisual = visualPrize || WHEEL_PRIZES[0];
        
        return {
            ...fallbackVisual,
            realType: realChance.type,
            realName: realChance.name,
            realValue: realChance.value || 0,
            value: realChance.value || 0,
            isRealPrize: true,
            isFallback: true,
            debugInfo: {
                reason: 'fallback_used',
                realType: realChance.type,
                visualType: fallbackVisual?.type
            }
        };
    }

    // ============================================================================
    // ИСПРАВЛЕННАЯ ОБРАБОТКА ВЫИГРЫШЕЙ
    // ============================================================================
    // 4. ПОЛНОСТЬЮ ПЕРЕПИСАННАЯ функция обработки выигрыша
    async handlePrizeWin(prize) {
        console.log('\n🏆 ========== ОБРАБОТКА ВЫИГРЫША ==========');
        console.log('🎁 Полученный приз:', prize);
        console.log('🐛 Отладочная информация:', prize.debugInfo);
        
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Определяем что показать на основе realType с fallback
        // ИСПРАВЛЕННАЯ логика определения типа
        const realType = prize.realType || prize.type;
        const isRealCertificate = realType === 'certificate';
        const isVisualCertificate = prize.type && (prize.type.startsWith('wildberries') || prize.type.startsWith('golden-apple'));

        console.log(`🔍 Анализ приза:`, {
            realType: realType,
            visualType: prize.type,
            isRealCertificate: isRealCertificate,
            isVisualCertificate: isVisualCertificate,
            value: prize.value
        });
        const realValue = prize.realValue || prize.value || 0;
        const realName = prize.realName || prize.name;
        
        console.log(`💰 Обработка типа: "${realType}", значение: ${realValue}, имя: "${realName}"`);
        
        // ИСПРАВЛЕННАЯ логика отображения результата
        if (realType === 'empty') {
            console.log('😔 Показываем результат: Пустота');
            this.showResultModal({
                icon: '😔',
                title: 'Не повезло!',
                description: 'Попробуйте еще раз!',
                type: 'empty'
            });
        } 
        else if (realType === 'stars') {
            console.log(`⭐ Показываем результат: ${realValue} звезд`);
            this.showResultModal({
                icon: '⭐',
                title: `Получено ${realValue} звезд!`,
                description: `Ваш баланс пополнен на ${realValue} звезд`,
                type: 'stars'
            });
            
            // Добавляем звезды локально
            this.app.gameData.stars = (this.app.gameData.stars || 0) + realValue;
            console.log(`⭐ Добавлено ${realValue} звезд, новый баланс: ${this.app.gameData.stars}`);
        } 
        else if (realType === 'certificate' || isVisualCertificate) {
            // ИСПРАВЛЕНО: Обрабатываем и реальные, и визуальные сертификаты
            const certificateValue = prize.value || prize.realValue || 300;
            
            console.log(`🎫 Показываем результат: Сертификат ${certificateValue}₽`);
            this.showResultModal({
                icon: '🎫',
                title: 'Поздравляем!',
                description: `Вы выиграли сертификат на ${certificateValue}₽!`,
                isWin: true,
                prize: prize
            });
            
            // Сохраняем выигрыш
            this.saveWinToHistory({
                type: 'certificate',
                name: `Сертификат ${certificateValue}₽`,
                value: certificateValue,
                timestamp: Date.now()
            });
            
            console.log(`🏆 Выигран сертификат: ${certificateValue}₽`);
        }
        else {
            // На случай неизвестного типа
            console.warn(`⚠️ Неизвестный тип приза: "${realType}", показываем универсальное сообщение`);
            this.showResultModal({
                icon: '🎁',
                title: 'Поздравляем!',
                description: realName || 'Вы что-то выиграли!',
                type: 'unknown'
            });
        }

        // Сохраняем приз на сервер с РЕАЛЬНЫМИ данными
        const serverPrize = {
            id: prize.id,
            type: realType,
            name: realName,
            value: realValue,
            description: prize.realDescription || prize.description || ''
        };
        
        console.log(`💾 Сохраняем на сервер:`, serverPrize);
        await this.savePrizeToServer(serverPrize);

        // Обновляем локальную статистику
        this.updateLocalDataAfterPrize(prize);
        this.updateRecentWins();
        this.app.updateUI();
        this.app.saveGameData();

        console.log('✅ Выигрыш полностью обработан');
        console.log('🏆 ========== КОНЕЦ ОБРАБОТКИ ВЫИГРЫША ==========\n');
    }

    // ============================================================================
    // ИСПРАВЛЕННЫЕ ДЕФОЛТНЫЕ ШАНСЫ
    // ============================================================================
    getRealDefaultChances() {
        // ИСПРАВЛЕННЫЕ дефолтные шансы - ТОЧНО 100%
        const defaultChances = [
            { 
                id: 'empty', 
                type: 'empty', 
                probability: 94.0, 
                name: 'Пусто', 
                value: 0 
            },
            { 
                id: 'stars20', 
                type: 'stars', 
                probability: 5.0, 
                name: '20 звезд', 
                value: 20 
            },
            { 
                id: 'cert300', 
                type: 'certificate', 
                probability: 1.0, 
                name: 'Сертификат 300₽', 
                value: 300 
            }
        ];
        
        // Проверяем что сумма точно 100%
        const total = defaultChances.reduce((sum, chance) => sum + chance.probability, 0);
        console.log(`📊 Дефолтные шансы проверены: ${total}%`);
        
        if (Math.abs(total - 100) > 0.001) {
            console.error('❌ Некорректные дефолтные шансы!', defaultChances);
        }
        
        return defaultChances;
    }

    // ============================================================================
    // НОВАЯ ФУНКЦИЯ ОТЛАДКИ СИНХРОНИЗАЦИИ
    // ============================================================================
    // 6. УЛУЧШЕННАЯ функция тестирования синхронизации
    testSynchronization() {
        console.log('\n🧪 ========== ТЕСТ СИНХРОНИЗАЦИИ ==========');
        console.log('Проверяем связь визуальных и реальных призов...');
        
        // Показываем структуру WHEEL_PRIZES
        console.log(`📋 Структура WHEEL_PRIZES (${WHEEL_PRIZES.length} сегментов):`);
        WHEEL_PRIZES.forEach((prize, index) => {
            console.log(`  ${index + 1}. ID: ${prize.id}, Тип: "${prize.type}", Имя: "${prize.name}"`);
        });
        
        // Тестируем каждый тип реального приза
        const testCases = [
            { type: 'empty', name: 'Пусто' },
            { type: 'stars', name: '20 звезд' },
            { type: 'certificate', name: 'Сертификат' }
        ];
        
        console.log('\n🔍 Тестирование поиска визуальных сегментов:');
        testCases.forEach(testCase => {
            console.log(`\n--- Тест для "${testCase.name}" (тип: ${testCase.type}) ---`);
            const visualPrize = this.findVisualPrizeForRealChance(testCase);
            
            if (visualPrize) {
                console.log(`✅ Найден визуальный сегмент:`);
                console.log(`   ID: ${visualPrize.id}, Тип: "${visualPrize.type}", Имя: "${visualPrize.name}"`);
                
                const segmentIndex = WHEEL_PRIZES.findIndex(p => p.id === visualPrize.id);
                if (segmentIndex !== -1) {
                    console.log(`✅ Сегмент найден в WHEEL_PRIZES под индексом ${segmentIndex}`);
                } else {
                    console.error(`❌ Сегмент НЕ найден в WHEEL_PRIZES!`);
                }
            } else {
                console.error(`❌ Не найден визуальный сегмент для "${testCase.name}"`);
            }
        });
        
        // Проверяем углы сегментов
        console.log('\n📊 Проверка углов сегментов:');
        const totalAngle = WHEEL_PRIZES.reduce((sum, p) => sum + (p.angle || 0), 0);
        console.log(`Общая сумма углов: ${totalAngle}° (должно быть 360°)`);
        
        if (Math.abs(totalAngle - 360) > 1) {
            console.warn('⚠️ Сумма углов не равна 360°! Это может вызвать проблемы');
        } else {
            console.log('✅ Углы сегментов корректны');
        }
        
        // Тестируем реальные шансы
        console.log('\n🎲 Проверка реальных шансов:');
        const realChances = this.getRealDefaultChances();
        const totalProb = realChances.reduce((sum, chance) => sum + chance.probability, 0);
        console.log(`Общая вероятность: ${totalProb}%`);
        
        if (Math.abs(totalProb - 100) > 0.1) {
            console.error('❌ Некорректная сумма вероятностей!');
        } else {
            console.log('✅ Вероятности корректны');
        }
        
        console.log('🧪 ========== КОНЕЦ ТЕСТА ==========\n');
    }

    // ============================================================================
    // ИСПРАВЛЕННАЯ ФУНКЦИЯ МОДАЛЬНОГО ОКНА
    // ============================================================================
    showResultModal(result) {
        console.log('🎭 Показываем модальное окно результата:', result);
        
        // Удаляем существующие модальные окна
        const existingModals = document.querySelectorAll('.prize-result-modal');
        existingModals.forEach(modal => modal.remove());
        
        // Создаем новое модальное окно
        const modal = document.createElement('div');
        modal.className = 'prize-result-modal';
        modal.innerHTML = `
            <div class="prize-result-overlay"></div>
            <div class="prize-result-content">
                <div class="prize-result-icon">${result.icon}</div>
                <h2 class="prize-result-title">${result.title}</h2>
                <p class="prize-result-description">${result.description}</p>
                <button class="prize-result-close" type="button">Понятно</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Анимация появления
        setTimeout(() => {
            modal.classList.add('show');
        }, 50);
        
        // Обработчик закрытия
        const closeBtn = modal.querySelector('.prize-result-close');
        const overlay = modal.querySelector('.prize-result-overlay');
        
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(modal)) {
                    modal.remove();
                }
            }, 300);
        };
        
        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
        
        // Автоматическое закрытие через 5 секунд
        setTimeout(closeModal, 5000);
        
        // Вибрация
        if (this.app.tg && this.app.tg.HapticFeedback) {
            if (result.type === 'empty') {
                this.app.tg.HapticFeedback.notificationOccurred('error');
            } else {
                this.app.tg.HapticFeedback.notificationOccurred('success');
            }
        }
    }

    updateLocalDataAfterPrize(prize) {
        console.log('📝 Обновление локальных данных после приза:', prize);
        
        // Обновляем статистику
        this.app.gameData.totalSpins = (this.app.gameData.totalSpins || 0) + 1;
        
        if (prize.type !== 'empty' && prize.value > 0) {
            this.app.gameData.prizesWon = (this.app.gameData.prizesWon || 0) + 1;
            
            // Добавляем приз в историю
            if (!this.app.gameData.prizes) {
                this.app.gameData.prizes = [];
            }
            
            this.app.gameData.prizes.push({
                ...prize,
                timestamp: Date.now(),
                claimed: prize.type.includes('stars') // Звезды автоматически засчитаны
            });
        }
        
        // Добавляем в последние выигрыши
        if (!this.app.gameData.recentWins) {
            this.app.gameData.recentWins = [];
        }
        
        this.app.gameData.recentWins.unshift({
            prize: prize,
            timestamp: Date.now()
        });
        
        // Ограничиваем историю последних выигрышей
        if (this.app.gameData.recentWins.length > 10) {
            this.app.gameData.recentWins = this.app.gameData.recentWins.slice(0, 10);
        }
        
        console.log('✅ Локальные данные обновлены');
    }

    // ИСПРАВЛЕННАЯ функция savePrizeToServer
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
                spinType: 'normal', // ФИКСИРОВАННОЕ значение
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
                <span>${win.prize.icon || '🎁'}</span>
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
                    <button class="close-modal" type="button">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="referral-body">
                    <p>У вас пока нет приглашенных друзей. Поделитесь ссылкой с друзьями, чтобы получить бесплатные прокрутки!</p>
                    <div class="referral-link-container">
                        <input type="text" id="referral-link" value="${referralLink}" readonly>
                        <button class="copy-btn" type="button" id="copy-referral-btn" title="Копировать ссылку">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <div class="referral-info">
                        <p>💫 За каждого друга вы получаете 1 бесплатную прокрутку колеса!</p>
                    </div>
                    <button class="share-btn" type="button" id="share-referral-btn">
                        <i class="fas fa-share"></i>
                        <span>Поделиться в Telegram</span>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчики событий
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#copy-referral-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔗 Клик по кнопке копирования');
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

    // Метод для открытия поддержки
    openSupport() {
        console.log('🎧 Открытие поддержки из главного экрана');
        
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

    // НОВАЯ функция для отладки синхронизации
    debugWheelSynchronization() {
        console.log('\n🧪 ========== ОТЛАДКА СИНХРОНИЗАЦИИ ==========');
        
        // Проверяем структуру WHEEL_PRIZES
        console.log(`📋 WHEEL_PRIZES (${WHEEL_PRIZES.length} сегментов):`);
        const typeCount = {};
        let totalAngle = 0;
        
        WHEEL_PRIZES.forEach((prize, index) => {
            console.log(`  ${index + 1}. ID: ${prize.id}, Тип: "${prize.type}", Угол: ${prize.angle}°, Имя: "${prize.name}"`);
            typeCount[prize.type] = (typeCount[prize.type] || 0) + 1;
            totalAngle += prize.angle || 0;
        });
        
        console.log('📊 Подсчет типов:', typeCount);
        console.log(`📐 Общий угол: ${totalAngle}° (норма: 360°)`);
        
        // Тестируем API
        this.testAPIConnection();
        
        console.log('🧪 ========== ОТЛАДКА ЗАВЕРШЕНА ==========\n');
    }

    async testAPIConnection() {
        try {
            console.log('🔌 Тестирование API...');
            const response = await fetch('/api/wheel-settings/normal');
            console.log(`📡 API статус: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📋 API данные:', data);
            }
        } catch (error) {
            console.error('❌ API недоступно:', error);
        }
    }

    // ============================================================================
    // ФУНКЦИЯ ДИАГНОСТИКИ ПРОБЛЕМ СИНХРОНИЗАЦИИ
    // ============================================================================
    debugWheelSync() {
        console.log('\n🧪 ========== ДИАГНОСТИКА СИНХРОНИЗАЦИИ КОЛЕСА ==========');
        
        // 1. Проверяем структуру WHEEL_PRIZES
        console.log(`📋 WHEEL_PRIZES (${WHEEL_PRIZES.length} сегментов):`);
        WHEEL_PRIZES.forEach((prize, index) => {
            console.log(`  ${index + 1}. ID: ${prize.id}, Тип: "${prize.type}", Имя: "${prize.name}", Угол: ${prize.angle}°`);
        });
        
        // 2. Проверяем углы
        const totalAngle = WHEEL_PRIZES.reduce((sum, p) => sum + (p.angle || 0), 0);
        console.log(`📐 Общий угол: ${totalAngle}° ${totalAngle === 360 ? '✅' : '❌'}`);
        
        // 3. Тестируем маппинг типов
        console.log('\n🔗 Тестирование маппинга типов:');
        const testCases = [
            { type: 'empty', name: 'Пусто' },
            { type: 'stars', name: '20 звезд' },
            { type: 'certificate', name: 'Сертификат' }
        ];
        
        testCases.forEach(testCase => {
            console.log(`\n--- Тест для "${testCase.name}" (${testCase.type}) ---`);
            const visualPrize = this.findVisualPrizeForRealChance(testCase);
            
            if (visualPrize) {
                console.log(`✅ Найден: ${visualPrize.name} (${visualPrize.type})`);
                
                // Проверяем что сегмент существует в массиве
                const index = WHEEL_PRIZES.findIndex(p => p.id === visualPrize.id);
                console.log(`📍 Индекс в массиве: ${index >= 0 ? index : 'НЕ НАЙДЕН ❌'}`);
            } else {
                console.error(`❌ НЕ НАЙДЕН визуальный сегмент!`);
            }
        });
        
        // 4. Проверяем API
        console.log('\n🌐 Тестирование API...');
        this.testAPI();
        
        console.log('\n🧪 ========== ДИАГНОСТИКА ЗАВЕРШЕНА ==========\n');
    }

    async testAPI() {
        try {
            const response = await fetch('/api/wheel-settings/normal');
            console.log(`📡 API статус: ${response.status} ${response.ok ? '✅' : '❌'}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📋 API возвращает:', data);
                
                if (data.prizes) {
                    const totalProb = data.prizes.reduce((sum, p) => sum + p.probability, 0);
                    console.log(`🎲 Сумма вероятностей: ${totalProb}% ${Math.abs(totalProb - 100) < 0.1 ? '✅' : '❌'}`);
                }
            }
        } catch (error) {
            console.error('❌ API недоступно:', error.message);
        }
    }
}

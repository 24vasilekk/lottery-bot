// screens/main.js - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ с устранением проблемы смещения колеса

import { WHEEL_PRIZES, APP_CONFIG } from '../config.js';

export class MainScreen {
    constructor(app) {
        this.app = app;
        this.isSpinning = false;
        this.wheelRotation = 0;
        this.initialized = false;
        this.lastSpinType = null;
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
        
        // ИСПРАВЛЕНИЕ: Сбрасываем угол поворота при инициализации
        this.wheelRotation = 0;
        
        try {
            setTimeout(async () => {
                // Синхронизируем баланс при входе на главный экран
                if (this.app.syncBalanceFromServer) {
                    console.log('🔄 Синхронизация баланса при входе на главный экран...');
                    await this.app.syncBalanceFromServer();
                }
                
                this.generateWheelSVG();
                this.setupEventListeners();
                this.updateRecentWins();
                this.updateSpinButtons();
                this.testSynchronization();
                this.initialized = true;
                console.log('✅ Главный экран инициализирован');
            }, 100);
            
        } catch (error) {
            console.error('❌ Ошибка инициализации главного экрана:', error);
        }
    }

    setupEventListeners() {
        console.log('🔗 Настройка обработчиков событий...');
        
        this.removeEventListeners();
        
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
        }

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

        const gradients = {
            empty: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
            stars: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            'golden-apple': [
                'linear-gradient(135deg, #9ACD32 0%, #8FBC8F 100%)',
                'linear-gradient(135deg, #8FBC8F 0%, #7CFC00 100%)',
                'linear-gradient(135deg, #7CFC00 0%, #ADFF2F 100%)',
                'linear-gradient(135deg, #ADFF2F 0%, #32CD32 100%)',
                'linear-gradient(135deg, #32CD32 0%, #228B22 100%)'
            ],
            'wildberries': [
                'linear-gradient(135deg, #8E44AD 0%, #9B59B6 100%)',
                'linear-gradient(135deg, #9B59B6 0%, #6C3483 100%)',
                'linear-gradient(135deg, #6C3483 0%, #512E5F 100%)',
                'linear-gradient(135deg, #512E5F 0%, #3E1B40 100%)'
            ]
        };

        let svgContent = '';
        let defsContent = '<defs>';
        
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
        
        defsContent += `
            <linearGradient id="starsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
            </linearGradient>
        `;
        
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

        let currentAngle = -90;
        
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

            let fillUrl;
            if (prize.type === 'empty') {
                fillUrl = 'url(#emptyPattern)';
            } else if (prize.type === 'stars') {
                fillUrl = 'url(#starsGradient)';
            } else if (prize.type === 'certificate') {
                if (prize.name.includes('ЗЯ')) {
                    const appleValues = ['300₽', '500₽', '1000₽', '2000₽', '5000₽'];
                    const appleIndex = appleValues.findIndex(val => prize.name.includes(val));
                    fillUrl = `url(#appleGradient${Math.max(0, appleIndex)})`;
                } else if (prize.name.includes('WB')) {
                    const wbValues = ['500₽', '1000₽', '2000₽', '3000₽'];
                    const wbIndex = wbValues.findIndex(val => prize.name.includes(val));
                    fillUrl = `url(#wbGradient${Math.max(0, wbIndex)})`;
                } else {
                    fillUrl = 'url(#appleGradient0)';
                }
            } else {
                fillUrl = 'url(#emptyPattern)';
            }

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

            if (prize.topText || prize.centerText) {
                const middleAngle = (startAngle + endAngle) / 2;
                const middleAngleDeg = middleAngle * 180 / Math.PI;

                if (prize.topText) {
                    const topRadius = radius * 0.85;
                    const topX = centerX + topRadius * Math.cos(middleAngle);
                    const topY = centerY + topRadius * Math.sin(middleAngle);
                    
                    const topRotation = middleAngleDeg + 90;
                    
                    let topTextColor = 'white';
                    if (prize.type.startsWith('stars')) {
                        topTextColor = '#FFFACD';
                    } else if (prize.type.startsWith('golden-apple')) {
                        topTextColor = '#F0FFF0';
                    } else if (prize.type.startsWith('wildberries')) {
                        topTextColor = '#F0E6FF';
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

                if (prize.centerText) {
                    const centerRadius = radius * 0.6;
                    const centerX_pos = centerX + centerRadius * Math.cos(middleAngle);
                    const centerY_pos = centerY + centerRadius * Math.sin(middleAngle);
                    
                    let centerRotation = middleAngleDeg;
                    if (middleAngleDeg > 90 && middleAngleDeg < 270) {
                        centerRotation += 180;
                    }
                    
                    let centerTextColor = 'white';
                    if (prize.type.startsWith('stars')) {
                        centerTextColor = '#FFF8DC';
                    } else if (prize.type.startsWith('golden-apple')) {
                        centerTextColor = '#F5FFFA';
                    } else if (prize.type.startsWith('wildberries')) {
                        centerTextColor = '#E6E6FA';
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

    async spinWheel(type) {
        if (this.isSpinning) {
            console.log('⏳ Рулетка уже крутится');
            return;
        }

        console.log('\n🎰 ========== НАЧАЛО СИНХРОНИЗИРОВАННОЙ ПРОКРУТКИ ==========');
        console.log(`🎮 Тип: ${type}`);
        this.lastSpinType = type;

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

            const originalStars = this.app.gameData.stars;
            const originalFriendSpins = this.app.gameData.friendSpinsUsed || 0;

            if (type === 'stars') {
                const success = await this.app.spendStars(APP_CONFIG.wheel.starCost);
                if (!success) {
                    this.isSpinning = false;
                    this.updateSpinButtons();
                    this.app.showStatusMessage('Недостаточно звезд для прокрутки!', 'error');
                    return;
                }
                console.log(`💰 Списано ${APP_CONFIG.wheel.starCost} звезд`);
                
                // УБРАНО: Избыточная синхронизация - баланс обновится после обработки выигрыша
            } else if (type === 'friend') {
                this.app.gameData.friendSpinsUsed = (this.app.gameData.friendSpinsUsed || 0) + 1;
                console.log(`❤️ Использована прокрутка за друга`);
                this.app.updateUI();
            }

            console.log('\n📋 ШАГ 1: Определение приза...');
            const winningPrize = await this.selectRandomPrize();
            
            if (!winningPrize) {
                throw new Error('Не удалось определить выигрышный приз');
            }
            
            console.log('\n📐 ШАГ 2: Расчет целевого угла...');
            const targetAngle = this.calculateTargetAngleForPrize(winningPrize);
            
            console.log('\n🌀 ШАГ 3: Анимация рулетки...');
            await this.animateWheelToTarget(targetAngle);
            
            console.log('\n🏆 ШАГ 4: Обработка выигрыша...');
            console.log(`👁️  ПОКАЗАНО: ${winningPrize.name}`);
            console.log(`💰 ПОЛУЧЕНО: ${winningPrize.realName || winningPrize.name} (${winningPrize.value})`);
            
            await this.handlePrizeWin(winningPrize);

            console.log('🎊 ========== ПРОКРУТКА ЗАВЕРШЕНА УСПЕШНО ==========\n');

        } catch (error) {
            console.error('❌ Ошибка прокрутки:', error);
            this.app.showStatusMessage('Ошибка при прокрутке рулетки', 'error');
            
            if (type === 'stars') {
                this.app.gameData.stars = originalStars;
                console.log('💰 Возвращены звезды из-за ошибки');
            } else if (type === 'friend') {
                this.app.gameData.friendSpinsUsed = originalFriendSpins;
                console.log('❤️ Возвращена прокрутка за друга из-за ошибки');
            }
            this.app.updateUI();
            this.app.saveGameData();
            
            // УБРАНО: Избыточная синхронизация - уже откатили локально
        } finally {
            this.isSpinning = false;
            this.updateSpinButtons();
        }
    }

    async selectRandomPrize() {
        try {
            console.log('🎯 Определяем приз по реальным шансам из БД...');
            
            let realChances = [];
            let apiWorking = false;
            
            try {
                const response = await fetch('/api/wheel-settings/normal');
                console.log('📡 Статус API response:', response.status, response.ok);
                
                if (response.ok) {
                    const settings = await response.json();
                    console.log('📋 Полученные настройки из API:', settings);
                    
                    if (settings.prizes && settings.prizes.length > 0) {
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
            
            if (!apiWorking) {
                realChances = this.getRealDefaultChances();
                console.log('📊 Используем дефолтные шансы:', realChances);
            }
            
            const totalProbability = realChances.reduce((sum, chance) => sum + chance.probability, 0);
            console.log(`📊 Общая вероятность: ${totalProbability}%`);
            
            if (Math.abs(totalProbability - 100) > 0.1) {
                console.error('❌ Некорректная сумма вероятностей!', totalProbability);
                realChances = [
                    { id: 'empty', type: 'empty', probability: 94, name: 'Пусто', value: 0 },
                    { id: 'stars20', type: 'stars', probability: 5, name: '20 звезд', value: 20 },
                    { id: 'cert300', type: 'certificate', probability: 1, name: 'Сертификат 300₽', value: 300 }
                ];
                console.log('🔧 Используем аварийные безопасные шансы:', realChances);
            }
            
            const random = Math.random() * 100;
            let cumulative = 0;
            
            console.log(`🎲 Случайное число: ${random.toFixed(2)}%`);
            
            for (const realChance of realChances) {
                cumulative += realChance.probability;
                console.log(`📈 ${realChance.name}: ${cumulative.toFixed(2)}% (тип: ${realChance.type})`);
                
                if (random < cumulative) {
                    console.log(`✅ ВЫПАЛ РЕАЛЬНЫЙ ПРИЗ: ${realChance.name} (${realChance.type})`);
                    
                    const visualPrize = this.findVisualPrizeForRealChance(realChance);
                    
                    if (!visualPrize) {
                        console.error('❌ Не удалось найти визуальный приз для:', realChance);
                        console.error('📋 Доступные WHEEL_PRIZES:', WHEEL_PRIZES);
                        return this.createFallbackPrize(realChance);
                    }
                    
                    console.log(`🎨 Найден визуальный приз:`, visualPrize);
                    
                    const enhancedPrize = {
                        ...visualPrize,
                        realType: realChance.type,
                        realName: realChance.name,
                        realValue: realChance.value || 0,
                        realDescription: realChance.description,
                        value: realChance.value || 0,
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
                    
                    return enhancedPrize;
                }
            }
            
            console.log('⚠️ Fallback на пустоту');
            const emptyPrize = WHEEL_PRIZES.find(p => p.type === 'empty') || WHEEL_PRIZES[0];
            return this.createFallbackPrize({ type: 'empty', name: 'Пусто', value: 0 }, emptyPrize);
            
        } catch (error) {
            console.error('❌ Ошибка определения приза:', error);
            const emptyPrize = WHEEL_PRIZES.find(p => p.type === 'empty') || WHEEL_PRIZES[0];
            return this.createFallbackPrize({ type: 'empty', name: 'Пусто', value: 0 }, emptyPrize);
        }
    }

    findVisualPrizeForRealChance(realChance) {
        console.log(`🔍 Ищем визуальный сегмент для реального приза:`, realChance);
        
        let targetPrize = null;
        
        if (realChance.type === 'empty') {
            targetPrize = WHEEL_PRIZES.find(p => p.type === 'empty');
            console.log('✅ Найден пустой сегмент:', targetPrize);
            
        } else if (realChance.type === 'stars') {
            targetPrize = WHEEL_PRIZES.find(p => p.type === 'stars');
            console.log('✅ Найден сегмент со звездами:', targetPrize);
            
        } else if (realChance.type === 'certificate') {
            const certificatePrizes = WHEEL_PRIZES.filter(p => 
                p.type === 'certificate'
            );
            
            if (certificatePrizes.length > 0) {
                const randomIndex = Math.floor(Math.random() * certificatePrizes.length);
                targetPrize = certificatePrizes[randomIndex];
                console.log(`✅ Выбран случайный сертификат ${randomIndex + 1}/${certificatePrizes.length}:`, targetPrize);
            }
        }
        
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
        
        // ИСПРАВЛЕНО: Корректное смещение для правильной ориентации колеса
        const startOffset = 0; // Поворот на 90° вправо для правильной синхронизации
        
        // Рассчитываем накопленный угол до этого сегмента
        let accumulatedAngle = 0;
        for (let i = 0; i < segmentIndex; i++) {
            accumulatedAngle += WHEEL_PRIZES[i].angle || (360 / WHEEL_PRIZES.length);
        }
        
        // Добавляем половину угла текущего сегмента (центр)
        const currentSegmentAngle = WHEEL_PRIZES[segmentIndex].angle || (360 / WHEEL_PRIZES.length);
        const segmentCenterAngle = accumulatedAngle + (currentSegmentAngle / 2);
        
        // Учитываем смещение начала отрисовки колеса
        const actualSegmentAngle = segmentCenterAngle + startOffset;
        
        // Указатель находится сверху (0°), поэтому нужно повернуть колесо так,
        // чтобы нужный сегмент оказался сверху
        // Формула: нужно повернуть на угол, который приведет сегмент к позиции 0°
        let targetAngle = -actualSegmentAngle;
        
        // Нормализуем угол в диапазон 0-360
        while (targetAngle < 0) targetAngle += 360;
        while (targetAngle >= 360) targetAngle -= 360;
        
        // Добавляем небольшую случайность внутри сегмента
        const maxDeviation = (currentSegmentAngle / 2) * 0.4;
        const deviation = (Math.random() - 0.5) * maxDeviation;
        let finalAngle = targetAngle + deviation;
        
        // Нормализуем финальный угол
        while (finalAngle < 0) finalAngle += 360;
        while (finalAngle >= 360) finalAngle -= 360;
        
        console.log(`📊 Позиция сегмента на колесе: ${actualSegmentAngle.toFixed(1)}° (с учетом смещения -90°)`);
        console.log(`📊 Накоплено до сегмента: ${accumulatedAngle}°, ширина сегмента: ${currentSegmentAngle}°`);
        console.log(`🎯 Целевой угол поворота: ${finalAngle.toFixed(1)}° (базовый: ${targetAngle.toFixed(1)}°, отклонение: ${deviation.toFixed(1)}°)`);
        
        return finalAngle;
    }

    // ИСПРАВЛЕННАЯ ФУНКЦИЯ АНИМАЦИИ - ГЛАВНОЕ ИСПРАВЛЕНИЕ ЗДЕСЬ!
    async animateWheelToTarget(targetAngle) {
        const spins = Math.floor(Math.random() * 3) + 5; // 5-7 полных оборотов
        
        // Получаем текущее положение колеса (нормализованное)
        const currentRotation = this.wheelRotation || 0;
        
        // ИСПРАВЛЕНИЕ: Правильно рассчитываем угол поворота
        // Нужно найти кратчайший путь от текущего положения до целевого
        let rotationDelta = targetAngle - currentRotation;
        
        // Если разница отрицательная или слишком маленькая, 
        // добавляем полный оборот, чтобы колесо крутилось по часовой стрелке
        if (rotationDelta <= 0) {
            rotationDelta += 360;
        }
        
        // Добавляем полные обороты для красивой анимации
        const totalRotation = spins * 360 + rotationDelta;
        
        // Новое абсолютное положение после анимации
        const newAbsoluteRotation = currentRotation + totalRotation;
        
        console.log(`🌀 Текущая позиция: ${currentRotation.toFixed(1)}°`);
        console.log(`🌀 Целевая позиция: ${targetAngle.toFixed(1)}°`);
        console.log(`🌀 Дельта поворота: ${rotationDelta.toFixed(1)}°`);
        console.log(`🌀 Полный поворот: ${totalRotation.toFixed(1)}° (${spins} оборотов + ${rotationDelta.toFixed(1)}°)`);
        console.log(`🌀 Новая абсолютная позиция: ${newAbsoluteRotation.toFixed(1)}°`);
        
        const wheelSvg = document.getElementById('wheel-svg');
        if (!wheelSvg) {
            throw new Error('Элемент wheel-svg не найден');
        }
        
        // Выполняем анимацию
        wheelSvg.style.transition = `transform ${APP_CONFIG.animations.wheelSpinDuration}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
        wheelSvg.style.transform = `rotate(${newAbsoluteRotation}deg)`;
        
        // Ждем завершения анимации
        return new Promise(resolve => {
            setTimeout(() => {
                // После анимации сбрасываем визуальное положение на нормализованное значение
                // Это предотвращает накопление больших углов
                
                // Мгновенно (без анимации) устанавливаем колесо в нормализованное положение
                wheelSvg.style.transition = 'none';
                wheelSvg.style.transform = `rotate(${targetAngle}deg)`;
                
                // Сохраняем нормализованное положение для следующего вращения
                this.wheelRotation = targetAngle;
                
                console.log(`✅ Анимация завершена. Финальная позиция: ${targetAngle.toFixed(1)}°`);
                
                // Небольшая задержка перед разрешением промиса
                setTimeout(() => {
                    // Восстанавливаем возможность анимации для следующего вращения
                    wheelSvg.style.transition = '';
                    resolve();
                }, 50);
                
            }, APP_CONFIG.animations.wheelSpinDuration);
        });
    }

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

    async handlePrizeWin(prize) {
        console.log('\n🏆 ========== ОБРАБОТКА ВЫИГРЫША ==========');
        console.log('🎁 Полученный приз:', prize);
        console.log('🐛 Отладочная информация:', prize.debugInfo);
        
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
            
            // ИСПРАВЛЕНО: НЕ добавляем звезды локально, получаем актуальный баланс с сервера
            // Сервер уже добавил звезды при обработке wheel_spin, получаем актуальный баланс
            console.log('🔄 Синхронизируем баланс с сервера после выигрыша звезд...');
            if (this.app.syncBalanceFromServer) {
                const syncSuccess = await this.app.syncBalanceFromServer();
                if (syncSuccess) {
                    console.log(`✅ Баланс синхронизирован с сервера после выигрыша ${realValue} звезд`);
                } else {
                    console.error('❌ Не удалось синхронизировать баланс с сервера');
                    // Fallback - добавляем локально если синхронизация не сработала
                    this.app.gameData.stars = (this.app.gameData.stars || 0) + realValue;
                }
            } else {
                // Если метод синхронизации недоступен - fallback на локальное добавление
                console.warn('⚠️ syncBalanceFromServer недоступен, добавляем звезды локально');
                this.app.gameData.stars = (this.app.gameData.stars || 0) + realValue;
            }
            
            console.log(`⭐ Новый баланс: ${this.app.gameData.stars} звезд`);
        } 
        else if (realType === 'certificate' || isVisualCertificate) {
            const certificateValue = prize.realValue || prize.value || 300;
            let certificateName = '';
            
            if (prize.type && prize.type.startsWith('wildberries')) {
                certificateName = `WB ${certificateValue}₽`;
            } else if (prize.type && prize.type.startsWith('golden-apple')) {
                certificateName = `ЗЯ ${certificateValue}₽`;
            } else {
                if (prize.name.includes('WB')) {
                    certificateName = `WB ${certificateValue}₽`;
                } else if (prize.name.includes('ЗЯ')) {
                    certificateName = `ЗЯ ${certificateValue}₽`;
                } else {
                    certificateName = `Сертификат ${certificateValue}₽`;
                }
            }
            
            console.log(`🎫 Показываем результат: ${certificateName}`);
            this.showResultModal({
                icon: '🎫',
                title: 'Поздравляем!',
                description: `Вы выиграли ${certificateName}!`,
                isWin: true,
                prize: prize
            });
            
            this.saveWinToHistory({
                type: 'certificate',
                name: certificateName,
                value: certificateValue,
                timestamp: Date.now()
            });
            
            console.log(`🏆 Выигран сертификат: ${certificateName}`);
        }
        else {
            console.warn(`⚠️ Неизвестный тип приза: "${realType}", показываем универсальное сообщение`);
            this.showResultModal({
                icon: '🎁',
                title: 'Поздравляем!',
                description: realName || 'Вы что-то выиграли!',
                type: 'unknown'
            });
        }

        // Сохраняем информацию о призе на сервер
        const serverPrize = {
            id: prize.id,
            type: realType,
            name: realName,
            value: realValue,
            description: prize.realDescription || prize.description || '',
            visualType: prize.type,
            visualName: prize.name
        };
        
        console.log(`💾 Сохраняем приз на сервер:`, serverPrize);
        await this.savePrizeToServer(serverPrize);

        // УБРАНО: Финальная синхронизация может перебить правильный баланс
        // Баланс уже синхронизирован в каждом типе приза индивидуально

        this.updateLocalDataAfterPrize(prize);
        this.updateRecentWins();
        this.app.updateUI();
        
        // НЕ сохраняем в localStorage баланс
        // this.app.saveGameData(); // Убираем или модифицируем чтобы не сохранял баланс

        console.log('✅ Выигрыш полностью обработан');
        console.log('🏆 ========== КОНЕЦ ОБРАБОТКИ ВЫИГРЫША ==========\n');
    }

    getRealDefaultChances() {
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
        
        const total = defaultChances.reduce((sum, chance) => sum + chance.probability, 0);
        console.log(`📊 Дефолтные шансы проверены: ${total}%`);
        
        if (Math.abs(total - 100) > 0.001) {
            console.error('❌ Некорректные дефолтные шансы!', defaultChances);
        }
        
        return defaultChances;
    }

    testSynchronization() {
        console.log('\n🧪 ========== ТЕСТ СИНХРОНИЗАЦИИ ==========');
        console.log('Проверяем связь визуальных и реальных призов...');
        
        console.log(`📋 Структура WHEEL_PRIZES (${WHEEL_PRIZES.length} сегментов):`);
        WHEEL_PRIZES.forEach((prize, index) => {
            console.log(`  ${index + 1}. ID: ${prize.id}, Тип: "${prize.type}", Имя: "${prize.name}", Угол: ${prize.angle}°`);
        });
        
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
                    
                    // Тестируем расчет угла для этого сегмента
                    const targetAngle = this.calculateTargetAngleForPrize(visualPrize);
                    console.log(`📐 Расчетный угол для попадания в этот сегмент: ${targetAngle.toFixed(1)}°`);
                } else {
                    console.error(`❌ Сегмент НЕ найден в WHEEL_PRIZES!`);
                }
            } else {
                console.error(`❌ Не найден визуальный сегмент для "${testCase.name}"`);
            }
        });
        
        console.log('\n📊 Проверка углов сегментов:');
        const totalAngle = WHEEL_PRIZES.reduce((sum, p) => sum + (p.angle || 0), 0);
        console.log(`Общая сумма углов: ${totalAngle}° (должно быть 360°)`);
        
        if (Math.abs(totalAngle - 360) > 1) {
            console.warn('⚠️ Сумма углов не равна 360°! Это может вызвать проблемы');
        } else {
            console.log('✅ Углы сегментов корректны');
        }
        
        console.log('\n🎲 Проверка реальных шансов:');
        const realChances = this.getRealDefaultChances();
        const totalProb = realChances.reduce((sum, chance) => sum + chance.probability, 0);
        console.log(`Общая вероятность: ${totalProb}%`);
        
        if (Math.abs(totalProb - 100) > 0.1) {
            console.error('❌ Некорректная сумма вероятностей!');
        } else {
            console.log('✅ Вероятности корректны');
        }
        
        // Проверка текущего состояния колеса
        console.log('\n🎡 Текущее состояние колеса:');
        console.log(`Текущий угол поворота: ${this.wheelRotation}°`);
        
        // ИСПРАВЛЕНО: Визуальная проверка сегментов с корректным смещением
        console.log('\n🎯 Проверка позиций сегментов на колесе (смещение 0°):');
        const startOffset = 0; // Корректное смещение
        let currentAngle = 0;
        
        WHEEL_PRIZES.forEach((prize, index) => {
            const segmentAngle = prize.angle || (360 / WHEEL_PRIZES.length);
            const startAngle = currentAngle;
            const endAngle = currentAngle + segmentAngle;
            const centerAngle = currentAngle + segmentAngle / 2;
            
            // Реальные углы на колесе с учетом смещения
            const actualStart = startAngle + startOffset;
            const actualEnd = endAngle + startOffset;
            const actualCenter = centerAngle + startOffset;
            
            // Угол поворота для попадания в этот сегмент
            let targetRotation = -actualCenter;
            while (targetRotation < 0) targetRotation += 360;
            
            console.log(`${index + 1}. ${prize.name}:`);
            console.log(`   Логические углы: ${startAngle.toFixed(1)}° - ${endAngle.toFixed(1)}° (центр: ${centerAngle.toFixed(1)}°)`);
            console.log(`   Реальные углы на колесе: ${actualStart.toFixed(1)}° - ${actualEnd.toFixed(1)}° (центр: ${actualCenter.toFixed(1)}°)`);
            console.log(`   Угол поворота для попадания: ${targetRotation.toFixed(1)}°`);
            
            currentAngle += segmentAngle;
        });
        
        console.log('🧪 ========== КОНЕЦ ТЕСТА ==========\n');
    }

    showResultModal(result) {
        console.log('🎭 Показываем модальное окно результата:', result);
        
        const existingModals = document.querySelectorAll('.prize-result-modal');
        existingModals.forEach(modal => modal.remove());
        
        const modal = document.createElement('div');
        modal.className = 'prize-result-modal';
        // Определяем нужна ли кнопка связи с менеджером
        const isWinningCertificate = result.isWin && result.prize && 
                                   (result.prize.realType === 'certificate' || 
                                    result.prize.type === 'certificate');
        
        let managerButtonHtml = '';
        if (isWinningCertificate) {
            managerButtonHtml = `
                <button class="prize-result-manager" type="button" id="contact-manager-btn">
                    📞 Связаться с менеджером
                </button>
            `;
        }
        
        modal.innerHTML = `
            <div class="prize-result-overlay"></div>
            <div class="prize-result-content">
                <div class="prize-result-icon">${result.icon}</div>
                <h2 class="prize-result-title">${result.title}</h2>
                <p class="prize-result-description">${result.description}</p>
                ${managerButtonHtml}
                <button class="prize-result-close" type="button">Понятно</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.classList.add('show');
        }, 50);
        
        const closeBtn = modal.querySelector('.prize-result-close');
        const overlay = modal.querySelector('.prize-result-overlay');
        const managerBtn = modal.querySelector('#contact-manager-btn');
        
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
        
        // Обработчик кнопки связи с менеджером
        if (managerBtn && isWinningCertificate) {
            managerBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('📞 Нажата кнопка связи с менеджером');
                
                try {
                    // Получаем актуальную информацию о призе из БД
                    const prizeInfo = await this.getPrizeFromDatabase(result.prize);
                    const message = this.generatePrizeMessage(prizeInfo);
                    
                    // Открываем диалог с менеджером
                    this.openManagerChat(message);
                    
                    // Закрываем модальное окно
                    closeModal();
                    
                } catch (error) {
                    console.error('❌ Ошибка при связи с менеджером:', error);
                    this.app.showStatusMessage('Ошибка при открытии чата с менеджером', 'error');
                }
            });
        }
        
        setTimeout(closeModal, 5000);
        
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
        
        this.app.gameData.totalSpins = (this.app.gameData.totalSpins || 0) + 1;
        
        if (prize.type !== 'empty' && prize.value > 0) {
            this.app.gameData.prizesWon = (this.app.gameData.prizesWon || 0) + 1;
            
            if (!this.app.gameData.prizes) {
                this.app.gameData.prizes = [];
            }
            
            this.app.gameData.prizes.push({
                ...prize,
                timestamp: Date.now(),
                claimed: prize.type.includes('stars')
            });
        }
        
        if (!this.app.gameData.recentWins) {
            this.app.gameData.recentWins = [];
        }
        
        this.app.gameData.recentWins.unshift({
            prize: prize,
            timestamp: Date.now()
        });
        
        if (this.app.gameData.recentWins.length > 10) {
            this.app.gameData.recentWins = this.app.gameData.recentWins.slice(0, 10);
        }
        
        console.log('✅ Локальные данные обновлены');
    }

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
            // ИСПРАВЛЕНО: Правильно определяем название приза для уведомлений
            let displayName = prize.name;
            
            // Если это сертификат, формируем правильное название
            if (prize.type === 'certificate' || prize.visualType?.includes('wildberries') || prize.visualType?.includes('golden-apple')) {
                const value = Number(prize.value) || 300;
                
                if (prize.visualName?.includes('WB') || prize.visualType?.includes('wildberries')) {
                    displayName = `WB ${value}₽`;
                } else if (prize.visualName?.includes('ЗЯ') || prize.visualType?.includes('golden-apple')) {
                    displayName = `ЗЯ ${value}₽`;
                } else {
                    displayName = `Сертификат ${value}₽`;
                }
            }
            
            // Получаем правильное имя пользователя
            const userName = this.app.tg?.initDataUnsafe?.user?.first_name || 
                           window.telegramIntegration.user?.first_name || 
                           'Игрок';
            
            const spinData = {
                spinType: 'normal',
                prize: {
                    id: prize.id || Math.floor(Math.random() * 1000000),
                    name: displayName, // Используем правильное отображаемое имя
                    type: prize.type || 'empty',
                    value: Number(prize.value) || 0,
                    probability: prize.probability || 0
                },
                timestamp: new Date().toISOString(),
                // Добавляем имя пользователя для уведомлений (без ID)
                userName: userName
            };
            
            console.log('📤 Отправляемые данные на сервер:', spinData);
            console.log('👤 Пользователь:', userName);
            
            const response = await window.telegramIntegration.sendToServer('wheel_spin', spinData);
            
            console.log('📥 Ответ сервера:', response);
            
            if (response && response.success === true) {
                console.log('✅ Приз успешно сохранен на сервере');
                
                // Если это ценный приз, показываем дополнительное подтверждение
                if (prize.type === 'certificate' && prize.value >= 300) {
                    console.log('🎊 Отправлено уведомление о крупном выигрыше');
                }
                
                return true;
            } else {
                console.error('❌ Сервер вернул ошибку:', response);
                
                if (response?.error) {
                    console.error('📋 Детали ошибки:', response.error);
                    if (response.details) {
                        console.error('📋 Подробности:', response.details);
                    }
                    
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

    saveWinToHistory(winData) {
        if (!this.app.gameData.winHistory) {
            this.app.gameData.winHistory = [];
        }
        
        this.app.gameData.winHistory.unshift(winData);
        
        if (this.app.gameData.winHistory.length > 50) {
            this.app.gameData.winHistory = this.app.gameData.winHistory.slice(0, 50);
        }
        
        console.log('💾 Сохранен выигрыш в историю:', winData);
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
            
            const canInteract = !this.isSpinning;
            spinFriendBtn.disabled = !canInteract;
            spinFriendBtn.classList.toggle('disabled', !canInteract);
            
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
        const userId = this.app.tg?.initDataUnsafe?.user?.id || 'demo';
        const botUsername = 'kosmetichka_lottery_bot';
        const referralLink = `https://t.me/${botUsername}?start=ref_${userId}`;
        
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

    openSupport() {
        console.log('🎧 Открытие поддержки из главного экрана');
        
        if (this.app.tg?.openTelegramLink) {
            this.app.tg.openTelegramLink('https://t.me/kosmetichkasupport');
            this.app.showStatusMessage('Переход в поддержку...', 'info');
        } else if (window.open) {
            window.open('https://t.me/kosmetichkasupport', '_blank');
        } else {
            this.app.showStatusMessage('Поддержка: @kosmetichkasupport', 'info');
        }
    }

    debugWheelSynchronization() {
        console.log('\n🧪 ========== ОТЛАДКА СИНХРОНИЗАЦИИ ==========');
        
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

    debugWheelSync() {
        console.log('\n🧪 ========== ДИАГНОСТИКА СИНХРОНИЗАЦИИ КОЛЕСА ==========');
        
        console.log(`📋 WHEEL_PRIZES (${WHEEL_PRIZES.length} сегментов):`);
        WHEEL_PRIZES.forEach((prize, index) => {
            console.log(`  ${index + 1}. ID: ${prize.id}, Тип: "${prize.type}", Имя: "${prize.name}", Угол: ${prize.angle}°`);
        });
        
        const totalAngle = WHEEL_PRIZES.reduce((sum, p) => sum + (p.angle || 0), 0);
        console.log(`📐 Общий угол: ${totalAngle}° ${totalAngle === 360 ? '✅' : '❌'}`);
        
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
                
                const index = WHEEL_PRIZES.findIndex(p => p.id === visualPrize.id);
                console.log(`📍 Индекс в массиве: ${index >= 0 ? index : 'НЕ НАЙДЕН ❌'}`);
            } else {
                console.error(`❌ НЕ НАЙДЕН визуальный сегмент!`);
            }
        });
        
        console.log('\n🌐 Тестирование API...');
        this.testAPI();
        
        console.log('\n🧪 ========== ДИАГНОСТИКА ЗАВЕРШЕНА ==========\n');
    }

    // НОВЫЙ МЕТОД: Синхронизация баланса звезд с сервером
    async syncStarsWithServer() {
        try {
            if (!window.telegramIntegration?.sendToServer) {
                console.error('❌ telegramIntegration не доступен');
                return false;
            }
            
            const syncData = {
                stars: this.app.gameData.stars,
                timestamp: new Date().toISOString()
            };
            
            console.log(`📤 Синхронизация баланса: ${this.app.gameData.stars} звезд`);
            
            const response = await window.telegramIntegration.sendToServer('update_stars', syncData);
            
            if (response?.success) {
                console.log(`✅ Баланс синхронизирован с сервером`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Ошибка синхронизации баланса:', error);
            return false;
        }
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

    // Получение информации о призе из базы данных для верификации
    async getPrizeFromDatabase(prize) {
        try {
            console.log('🔍 Получаем информацию о призе из БД:', prize);
            
            if (!window.telegramIntegration?.sendToServer) {
                console.warn('⚠️ telegramIntegration недоступен');
                return prize; // Возвращаем оригинальный приз если нет связи
            }
            
            // Запрашиваем информацию о призе с сервера для верификации
            const response = await window.telegramIntegration.sendToServer('verify_prize', {
                prizeId: prize.id,
                userId: this.app.tg?.initDataUnsafe?.user?.id,
                timestamp: Date.now()
            });
            
            if (response?.success && response.prizeData) {
                console.log('✅ Информация о призе получена из БД:', response.prizeData);
                return response.prizeData;
            } else {
                console.warn('⚠️ Не удалось получить информацию из БД, используем локальные данные');
                return prize;
            }
            
        } catch (error) {
            console.error('❌ Ошибка получения информации о призе:', error);
            return prize; // Fallback на оригинальные данные
        }
    }

    // Генерация сообщения для менеджера с информацией о призе
    generatePrizeMessage(prizeInfo) {
        const userName = this.app.tg?.initDataUnsafe?.user?.first_name || 'Пользователь';
        const userId = this.app.tg?.initDataUnsafe?.user?.id || 'неизвестен';
        const currentTime = new Date().toLocaleString('ru-RU');
        
        let prizeName = prizeInfo.realName || prizeInfo.name || 'Сертификат';
        let prizeValue = prizeInfo.realValue || prizeInfo.value || 'неизвестно';
        
        // Определяем тип сертификата для правильного сообщения
        if (prizeName.includes('WB')) {
            prizeName = `Сертификат Wildberries на ${prizeValue}₽`;
        } else if (prizeName.includes('ЗЯ')) {
            prizeName = `Сертификат Золотое Яблоко на ${prizeValue}₽`;
        }
        
        const message = `🎉 Привет! Я выиграл ${prizeName} в лотерее Kosmetichka!

👤 Имя: ${userName}
🆔 ID: ${userId}
🎁 Приз: ${prizeName}
⏰ Время выигрыша: ${currentTime}

Как мне получить мой приз? 😊`;

        console.log('📝 Сгенерировано сообщение для менеджера:', message);
        return message;
    }

    // Открытие чата с менеджером
    openManagerChat(message) {
        try {
            const managerUsername = 'kosmetichkasupport';
            const encodedMessage = encodeURIComponent(message);
            const chatUrl = `https://t.me/${managerUsername}?text=${encodedMessage}`;
            
            console.log(`📞 Открываем чат с менеджером: @${managerUsername}`);
            console.log(`💬 Сообщение: ${message}`);
            
            // Используем Telegram WebApp API для открытия ссылки
            if (this.app.tg && this.app.tg.openTelegramLink) {
                this.app.tg.openTelegramLink(chatUrl);
                this.app.showStatusMessage('Открываем чат с менеджером...', 'info');
            } else if (this.app.tg && this.app.tg.openLink) {
                this.app.tg.openLink(chatUrl);
                this.app.showStatusMessage('Открываем чат с менеджером...', 'info');
            } else {
                // Fallback для обычного браузера
                window.open(chatUrl, '_blank');
                this.app.showStatusMessage('Открываем чат с менеджером...', 'info');
            }
            
        } catch (error) {
            console.error('❌ Ошибка открытия чата:', error);
            this.app.showStatusMessage('Ошибка открытия чата с менеджером', 'error');
        }
    }
}

// public/js/app.js - ИСПРАВЛЕННАЯ ВЕРСИЯ С РАБОЧИМ ЛИДЕРБОРДОМ

import { APP_CONFIG, WHEEL_PRIZES, DEFAULT_USER_DATA } from './config.js';
import { MainScreen } from './screens/main.js';
import { TasksScreen } from './screens/tasks.js';
import { ProfileScreen } from './screens/profile.js';
import { DepositScreen } from './screens/deposit.js';

// DEFAULT_USER_DATA теперь импортируется из config.js

export default class App {
    constructor() {
        console.log('🚀 Инициализация Kosmetichka App...');
        
        this.gameData = null;
        this.screens = {};
        this.navigation = null;
        this.tg = null;
        
        // Блокировка операций с балансом для предотвращения race conditions
        this.balanceOperationInProgress = false;
        this.pendingBalanceOperations = [];
        
        // Telegram WebApp будет инициализирован в telegram-integration.js
        
        console.log('📱 App создан');
    }

    async init() {
        try {
            console.log('🔧 Запуск инициализации приложения...');
            
            // 1. Загружаем данные пользователя
            this.loadGameData();
            
            // 2. Создаем интерфейс
            await this.createInterface();
            
            // 3. Инициализируем навигацию
            this.initNavigation();
            
            // 4. Загружаем экраны
            await this.loadScreens();
            
            // 5. Настраиваем глобальные обработчики
            this.setupGlobalHandlers();
            
            // 6. Обновляем интерфейс
            this.updateInterface();
            
            // 7. Получаем ссылку на Telegram WebApp и синхронизируем
            if (window.telegramIntegration) {
                this.tg = window.telegramIntegration.tg;
                console.log('🔄 ДИАГНОСТИКА: Инициализация пользователя и синхронизация...');
                
                // Логируем состояние до инициализации
                console.log('📊 ДИАГНОСТИКА: Баланс ДО инициализации:', this.gameData.stars);
                
                // Сначала инициализируем пользователя
                console.log('👤 ДИАГНОСТИКА: Вызываем initUser...');
                window.telegramIntegration.initUser();
                
                // Логируем состояние после initUser
                console.log('📊 ДИАГНОСТИКА: Баланс ПОСЛЕ initUser:', this.gameData.stars);
                
                // Затем синхронизируем с сервером
                console.log('🔄 ДИАГНОСТИКА: Вызываем syncWithServer...');
                await window.telegramIntegration.syncWithServer();
                
                // Логируем состояние после синхронизации с сервером
                console.log('📊 ДИАГНОСТИКА: Баланс ПОСЛЕ syncWithServer:', this.gameData.stars);
                console.log('📊 ДИАГНОСТИКА: Полные данные после синхронизации:', this.gameData);
            }
            
            // 8. Скрываем загрузочный экран
            this.hideLoadingScreen();
            
            console.log('✅ Приложение полностью инициализировано!');
            
        } catch (error) {
            console.error('❌ Критическая ошибка инициализации:', error);
            this.handleError(error);
        }
    }

    loadGameData() {
        console.log('💾 Загрузка данных пользователя...');

        try {
            // ИСПРАВЛЕНО: Создаем минимальные данные БЕЗ начального баланса
            this.gameData = {
                // НЕ задаем stars здесь - будет загружено из БД
                stars: 0, // Временное значение до синхронизации с БД
                recentWins: [],
                completedTasks: [],
                availableFriendSpins: 1,
                profile: { name: 'Пользователь', avatar: '👤', joinDate: Date.now() },
                settings: { notifications: true, sounds: true, animations: true },
                // Статистика - будет загружена из БД
                totalStarsEarned: 0,
                referrals: 0,
                totalSpins: 0,
                prizesWon: 0
            };
            console.log('🆕 Минимальные данные пользователя созданы (БЕЗ начального баланса)');
            
            // Попытка загрузки из localStorage (только для некритичных данных)
            const saved = localStorage.getItem('kosmetichkaGameData');
            if (saved) {
                const savedData = JSON.parse(saved);
                // Объединяем только некритичные данные, критичные (звезды, статистика) берем из БД
                this.gameData = {
                    ...this.gameData,
                    recentWins: savedData.recentWins || [],
                    completedTasks: savedData.completedTasks || [],
                    profile: savedData.profile || this.gameData.profile,
                    settings: savedData.settings || this.gameData.settings
                    // НЕ берем stars, totalStarsEarned и другую критичную статистику из localStorage!
                };
                console.log('💾 Некритичные данные восстановлены из localStorage');
            }
            
            // Инициализация необходимых полей (проверяем что все есть)
            if (!this.gameData.recentWins) this.gameData.recentWins = [];
            if (!this.gameData.completedTasks) this.gameData.completedTasks = [];
            if (!this.gameData.availableFriendSpins) this.gameData.availableFriendSpins = 1;
            if (!this.gameData.profile) this.gameData.profile = { name: 'Пользователь', avatar: '👤', joinDate: Date.now() };
            if (!this.gameData.referrals) this.gameData.referrals = 0;
            if (!this.gameData.prizesWon) this.gameData.prizesWon = 0;
            
            // ВАЖНО: НЕ инициализируем totalStarsEarned здесь - только из БД
            console.log('⚠️ Инициализация завершена. Ожидаем данные из БД для баланса...');
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            this.gameData = { ...DEFAULT_USER_DATA };
        }
    }

    async createInterface() {
        const app = document.getElementById('app');
        if (!app) {
            throw new Error('Контейнер приложения не найден');
        }

        app.innerHTML = `
            <!-- Контейнер для уведомлений - ВВЕРХУ -->
            <div id="status-messages" class="status-messages-container"></div>
            
            <!-- Контейнер экранов -->
            <div id="screens-container"></div>
            
            <!-- НИЖНЯЯ НАВИГАЦИЯ - ВСЕГДА ЗАКРЕПЛЕНА -->
            <nav id="bottom-navigation" class="bottom-navigation">
                <button class="nav-btn active" data-screen="main" aria-label="Главная страница">
                    <i class="fas fa-home"></i>
                    <span>Главная</span>
                </button>
                <button class="nav-btn" data-screen="tasks" aria-label="Задания">
                    <i class="fas fa-tasks"></i>
                    <span>Задания</span>
                    <div class="nav-badge" id="tasks-badge" style="display: none;"></div>
                </button>
                <button class="nav-btn" data-screen="profile" aria-label="Профиль пользователя">
                    <i class="fas fa-user"></i>
                    <span>Профиль</span>
                </button>
            </nav>
        `;

        console.log('🖼️ Интерфейс создан');
    }

    initNavigation() {
        this.navigation = {
            currentScreen: 'main',
            navigateTo: (screenName) => {
                console.log(`🧭 Переход на экран: ${screenName}`);
                
                // Валидация экрана
                const validScreens = ['main', 'tasks', 'profile', 'deposit', 'mega-roulette'];
                if (!validScreens.includes(screenName)) {
                    console.error(`❌ Неизвестный экран: ${screenName}`);
                    return;
                }
                
                // Специальная обработка для мега рулетки
                if (screenName === 'mega-roulette') {
                    this.renderMegaRoulette();
                } else {
                    // Убираем мега рулетку если она была показана
                    this.removeMegaRoulette();
                    
                    // Скрываем все обычные экраны
                    document.querySelectorAll('.screen:not(#mega-roulette-screen)').forEach(screen => {
                        screen.classList.remove('active');
                    });
                    
                    // Показываем нужный экран
                    const targetScreen = document.getElementById(`${screenName}-screen`);
                    if (targetScreen) {
                        targetScreen.classList.add('active');
                        this.navigation.currentScreen = screenName;
                    
                    // Инициализируем экран если нужно
                    // Маппинг имен экранов для camelCase
                    const screenMapping = {
                        'main': 'main',
                        'tasks': 'tasks', 
                        'profile': 'profile',
                        'deposit': 'deposit',
                        'mega-roulette': 'megaRoulette'
                    };
                    
                    const screenKey = screenMapping[screenName] || screenName;
                    if (this.screens[screenKey] && this.screens[screenKey].init) {
                        this.screens[screenKey].init();
                    }
                    // Специальная обработка для профиля - перезагружаем данные
                    // ЗАМЕНИТЬ НА:
                    // Специальная обработка для разных экранов
                    if (screenName === 'profile' && this.screens.profile && this.screens.profile.loadProfileData) {
                        setTimeout(() => {
                            this.screens.profile.loadProfileData();
                            console.log('🔄 Данные профиля перезагружены при навигации');
                        }, 200);
                    }

                    // ДОБАВИТЬ синхронизацию для заданий
                    if (screenName === 'tasks' && this.screens.tasks) {
                        setTimeout(() => {
                            // Принудительно обновляем данные в заданиях
                            if (window.telegramIntegration && window.telegramIntegration.syncWithServer) {
                                window.telegramIntegration.syncWithServer();
                            }
                            console.log('🔄 Данные заданий синхронизированы');
                        }, 300);
                    }

                    // Всегда обновляем интерфейс после смены экрана
                    setTimeout(() => {
                        this.updateInterface();
                    }, 500);
                    
                    // Прокрутка наверх при переключении экранов
                    targetScreen.scrollTop = 0;
                    } else {
                        console.error(`❌ Экран ${screenName} не найден`);
                        return;
                    }
                }
                
                // Обновляем состояние навигации
                this.updateNavigationState(screenName);
            }
        };

        // Обработчики кнопок навигации
        setTimeout(() => {
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const screen = btn.dataset.screen;
                    if (screen && screen !== this.navigation.currentScreen) {
                        this.navigation.navigateTo(screen);
                    }
                });
                
                // Поддержка клавиатурной навигации
                btn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const screen = btn.dataset.screen;
                        if (screen && screen !== this.navigation.currentScreen) {
                            this.navigation.navigateTo(screen);
                        }
                    }
                });
            });
        }, 100);
        
        console.log('✅ Навигация инициализирована');
    }

    updateNavigationState(activeScreen) {
        // Обновляем активную кнопку
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            
            if (btn.dataset.screen === activeScreen) {
                btn.classList.add('active');
            }
        });
        
        // Обновляем заголовок страницы
        const screenTitles = {
            'main': 'Kosmetichka - Рулетка красоты',
            'tasks': 'Kosmetichka - Задания',
            'profile': 'Kosmetichka - Профиль',
            'deposit': 'Kosmetichka - Пополнение',
            'mega-roulette': 'Kosmetichka - Мега рулетка'
        };
        
        if (screenTitles[activeScreen]) {
            document.title = screenTitles[activeScreen];
        }
    }

    async loadScreens() {
        try {
            console.log('📱 Загрузка экранов...');
            
            const container = document.getElementById('screens-container');
            if (!container) {
                throw new Error('Контейнер экранов не найден');
            }

            // ОСНОВНЫЕ ЭКРАНЫ
            console.log('📄 Создание основных экранов...');
            this.screens.main = new MainScreen(this);
            this.screens.tasks = new TasksScreen(this);
            this.screens.profile = new ProfileScreen(this); // Глобальная ссылка устанавливается в конструкторе
            this.screens.deposit = new DepositScreen(this);
            
            console.log('✅ Основные экраны созданы');
            console.log('🔗 Проверяем глобальную ссылку profileScreen:', window.profileScreen);

            // ДОПОЛНИТЕЛЬНЫЕ ЭКРАНЫ (необязательные)
            try {
                console.log('🎰 Попытка загрузки мега рулетки...');
                const megaModule = await import('./screens/mega-roulette.js');
                if (megaModule.MegaRouletteScreen) {
                    this.screens.megaRoulette = new megaModule.MegaRouletteScreen(this);
                    console.log('✅ Мега рулетка загружена');
                }
            } catch (megaError) {
                console.warn('⚠️ Мега рулетка недоступна:', megaError.message);
            }

            // Рендерим основные экраны (кроме мега рулетки - она рендерится отдельно)
            const screensHTML = [];
            
            if (this.screens.main) screensHTML.push(this.screens.main.render());
            if (this.screens.tasks) screensHTML.push(this.screens.tasks.render());
            if (this.screens.profile) screensHTML.push(this.screens.profile.render());
            if (this.screens.deposit) screensHTML.push(this.screens.deposit.render());
            // Мега рулетка НЕ рендерится здесь - только при переходе на неё
            
            container.innerHTML = screensHTML.join('');

            // Инициализируем активный экран
            if (this.screens.main) {
                this.screens.main.init();
            }

            // ВАЖНО: Дублируем проверку глобальной ссылки после рендера
            if (!window.profileScreen && this.screens.profile) {
                window.profileScreen = this.screens.profile;
                console.log('🔗 Глобальная ссылка profileScreen установлена после рендера');
            }

            console.log('✅ Все экраны загружены и инициализированы');

        } catch (error) {
            console.error('❌ Ошибка загрузки экранов:', error);
            throw error;
        }
    }

    setupGlobalHandlers() {
        // Обработчик ошибок
        window.addEventListener('error', (event) => {
            console.error('🚨 Глобальная ошибка:', event.error);
            this.handleError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 Необработанное отклонение промиса:', event.reason);
            this.handleError(event.reason);
        });

        // Сохранение данных при закрытии
        window.addEventListener('beforeunload', () => {
            this.saveGameData();
        });

        // Обработка изменения видимости
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveGameData();
            }
        });

        // Предотвращение случайного закрытия на мобильных
        if (this.tg) {
            this.tg.onEvent('back_button_pressed', () => {
                if (this.navigation.currentScreen !== 'main') {
                    this.navigation.navigateTo('main');
                    return true;
                }
                return false;
            });
        }

        console.log('🛡️ Глобальные обработчики настроены');
    }

    updateInterface() {
        console.log('🔄 Обновление интерфейса...');
        
        // 1. Обновляем основные счетчики звезд
        this.updateStarsDisplay();
        
        // 2. Обновление имени пользователя
        const userName = document.querySelector('.user-name');
        if (userName && this.tg?.initDataUnsafe?.user?.first_name) {
            userName.textContent = this.tg.initDataUnsafe.user.first_name;
        }

        // 3. Обновление аватарки пользователя
        this.updateUserAvatar();

        // 4. Обновление бейджа заданий
        this.updateTasksBadge();
        
        // 5. Обновляем все экраны
        try {
            // Главный экран - обновляем кнопки прокрутки
            if (this.screens.main && this.screens.main.updateSpinButtons) {
                this.screens.main.updateSpinButtons();
                console.log('✅ Главный экран обновлен');
            }
            
            // Профиль - обновляем секцию рефералов
            if (this.screens.profile && this.screens.profile.updateReferralsSection) {
                this.screens.profile.updateReferralsSection();
                console.log('✅ Профиль обновлен');
            }
            
            // Задания - обновляем счетчики
            if (this.screens.tasks && this.screens.tasks.updateTaskCounter) {
                this.screens.tasks.updateTaskCounter();
                console.log('✅ Задания обновлены');
            }
            
            // Мега рулетка - обновляем если активна
            if (this.screens.megaRoulette && this.screens.megaRoulette.updateInterface) {
                this.screens.megaRoulette.updateInterface();
                console.log('✅ Мега рулетка обновлена');
            }
            
            
        } catch (error) {
            console.warn('⚠️ Ошибка обновления экранов:', error);
        }
        
        // 6. Обновляем все элементы со звездами на странице
        try {
            const starsElements = document.querySelectorAll('[data-stars], .stars-count, .user-stars');
            starsElements.forEach(el => {
                if (el && this.gameData.stars !== undefined) {
                    el.textContent = this.gameData.stars;
                }
            });
            
            // Обновляем счетчики статистики
            const statsElements = {
                'total-spins': this.gameData.totalSpins || 0,
                'prizes-won': this.gameData.prizesWon || 0,
                'referrals-count': this.gameData.referrals || 0,
                'total-earned': this.gameData.totalStarsEarned || 0
            };
            
            Object.entries(statsElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });
            
        } catch (error) {
            console.warn('⚠️ Ошибка обновления элементов интерфейса:', error);
        }

        console.log('✅ Интерфейс полностью обновлен:', {
            stars: this.gameData.stars,
            referrals: this.gameData.referrals,
            totalSpins: this.gameData.totalSpins,
            prizesWon: this.gameData.prizesWon
        });
    }

    // Вспомогательный метод для обновления отображения звезд
    updateStarsDisplay() {
        try {
            // УЛУЧШЕННАЯ обработка отображения баланса
            const displayValue = this.gameData.stars !== undefined && this.gameData.stars !== null 
                ? this.gameData.stars.toLocaleString() 
                : '⏳'; // Показываем "⏳" пока данные не загрузились
            
            // Основной счетчик звезд
            const starCount = document.getElementById('star-count');
            if (starCount) {
                starCount.textContent = displayValue;
            }
            
            // Все элементы с классом stars
            const starsElements = document.querySelectorAll('.stars-value, .current-stars, .star-balance');
            starsElements.forEach(el => {
                if (el) {
                    el.textContent = displayValue;
                }
            });
            
            // Обновляем элементы с data-stars атрибутом
            const dataStarsElements = document.querySelectorAll('[data-stars]');
            dataStarsElements.forEach(el => {
                if (el) {
                    el.textContent = displayValue;
                }
            });
            
            console.log(`💰 Обновлено отображение звезд: ${this.gameData.stars} (отображение: ${displayValue})`);
            
        } catch (error) {
            console.warn('⚠️ Ошибка обновления отображения звезд:', error);
        }
    }

    // Вспомогательный метод для обновления бейджа заданий
    updateTasksBadge() {
        try {
            const taskBadge = document.getElementById('tasks-badge');
            if (taskBadge && this.screens.tasks) {
                const availableTasks = this.screens.tasks.getAvailableTasksCount ? 
                    this.screens.tasks.getAvailableTasksCount() : 0;
                
                if (availableTasks > 0) {
                    taskBadge.style.display = 'block';
                    taskBadge.textContent = availableTasks;
                } else {
                    taskBadge.style.display = 'none';
                }
            }
        } catch (error) {
            console.warn('⚠️ Ошибка обновления бейджа заданий:', error);
        }
    }

    updateUI() {
        this.updateInterface();
        this.saveGameData();
        
        // Обновляем кнопки в главном экране
        if (this.screens.main && this.screens.main.updateSpinButtons) {
            this.screens.main.updateSpinButtons();
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            console.log('🎭 Скрываем загрузочный экран...');
            loadingScreen.style.transition = 'opacity 0.5s ease';
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                console.log('✅ Загрузочный экран скрыт');
            }, 500);
        }
    }

    // ИСПРАВЛЕННАЯ ФУНКЦИЯ - УБИРАЕМ ЦИФРУ "3"
    updateTasksBadge() {
        const tasksBadge = document.getElementById('tasks-badge');
        if (tasksBadge) {
            // ПОЛНОСТЬЮ СКРЫВАЕМ БЕЙДЖ
            tasksBadge.style.display = 'none';
        }
    }

    // ИСПРАВЛЕННАЯ ФУНКЦИЯ - ВОЗВРАЩАЕМ 0 ВМЕСТО 3
    getAvailableTasksCount() {
        // Подсчет доступных заданий - возвращаем 0 чтобы убрать цифру
        return 0;
    }

    saveGameData() {
        try {
            localStorage.setItem('kosmetichkaGameData', JSON.stringify(this.gameData));
        } catch (error) {
            console.error('❌ Ошибка сохранения данных:', error);
        }
    }

    // ИСПРАВЛЕННАЯ ФУНКЦИЯ УВЕДОМЛЕНИЙ - ПОКАЗ ВВЕРХУ ЭКРАНА
    showStatusMessage(message, type = 'info', duration = 3000) {
        const container = document.getElementById('status-messages');
        if (!container) {
            console.warn('⚠️ Контейнер уведомлений не найден');
            return;
        }

        // Создаем элемент уведомления
        const messageEl = document.createElement('div');
        messageEl.className = `status-message ${type}`;
        messageEl.textContent = message;

        // Добавляем в контейнер
        container.appendChild(messageEl);

        // Анимация появления
        setTimeout(() => {
            messageEl.classList.add('show');
        }, 10);

        // Автоматическое скрытие
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, duration);

        console.log(`📢 Уведомление (${type}): ${message}`);
    }

    handleError(error) {
        console.error('🚨 Обработка ошибки:', error);
        
        // Показываем пользователю дружелюбное сообщение
        this.showStatusMessage('Произошла ошибка. Попробуйте обновить страницу.', 'error');
        
        // Отправляем ошибку админам если это продакшн
        if (this.tg && typeof this.tg.sendData === 'function') {
            this.tg.sendData(JSON.stringify({
                type: 'error',
                message: error.message,
                stack: error.stack,
                timestamp: Date.now()
            }));
        }
    }

    // БЕЗОПАСНЫЕ методы для работы с балансом (защита от race conditions)
    async addStars(amount) {
        return this.executeBalanceOperation('add', amount);
    }

    async spendStars(amount) {
        return this.executeBalanceOperation('spend', amount);
    }

    async executeBalanceOperation(operation, amount) {
        return new Promise((resolve) => {
            // Добавляем операцию в очередь
            this.pendingBalanceOperations.push({ operation, amount, resolve });
            
            // Запускаем обработку если не идет другая операция
            if (!this.balanceOperationInProgress) {
                this.processBalanceOperations();
            }
        });
    }

    async processBalanceOperations() {
        if (this.balanceOperationInProgress || this.pendingBalanceOperations.length === 0) {
            return;
        }

        this.balanceOperationInProgress = true;

        while (this.pendingBalanceOperations.length > 0) {
            const { operation, amount, resolve } = this.pendingBalanceOperations.shift();
            
            try {
                let result = false;
                
                if (operation === 'add') {
                    this.gameData.stars += amount;
                    this.gameData.totalStarsEarned = (this.gameData.totalStarsEarned || 0) + amount;
                    console.log(`⭐ БЕЗОПАСНО добавлено ${amount} звезд. Всего: ${this.gameData.stars}`);
                    result = true;
                } else if (operation === 'spend') {
                    if (this.gameData.stars >= amount) {
                        this.gameData.stars -= amount;
                        console.log(`💰 БЕЗОПАСНО потрачено ${amount} звезд. Осталось: ${this.gameData.stars}`);
                        result = true;
                    } else {
                        console.log(`❌ Недостаточно звезд. Нужно: ${amount}, есть: ${this.gameData.stars}`);
                        result = false;
                    }
                }
                
                // Обновляем интерфейс только один раз в конце
                this.updateInterface();
                this.saveGameData();
                
                resolve(result);
                
            } catch (error) {
                console.error(`❌ Ошибка операции с балансом ${operation}:`, error);
                resolve(false);
            }
        }

        this.balanceOperationInProgress = false;
    }

    addWin(prize) {
        const win = {
            prize: prize,
            timestamp: Date.now()
        };
        
        this.gameData.recentWins.unshift(win);
        
        // Ограничиваем количество последних выигрышей
        if (this.gameData.recentWins.length > APP_CONFIG.game.maxRecentWins) {
            this.gameData.recentWins = this.gameData.recentWins.slice(0, APP_CONFIG.game.maxRecentWins);
        }
        
        this.gameData.totalWins++;
        this.gameData.prizesWon = (this.gameData.prizesWon || 0) + 1;
        this.saveGameData();
        
        console.log(`🎁 Добавлен выигрыш: ${prize.name}`);
    }

    // БЕЗОПАСНОЕ обновление данных пользователя с защитой от race conditions
    async updateUserData(newData) {
        if (!newData) return;
        
        console.log('🔄 КРИТИЧЕСКОЕ обновление данных из БД:', {
            starsFromServer: newData.stars,
            currentLocal: this.gameData.stars,
            operationInProgress: this.balanceOperationInProgress
        });
        
        // Ждем завершения текущих операций с балансом
        if (this.balanceOperationInProgress) {
            console.log('⏳ Ожидаем завершения операций с балансом...');
            await new Promise(resolve => {
                const checkOperations = () => {
                    if (!this.balanceOperationInProgress) {
                        resolve();
                    } else {
                        setTimeout(checkOperations, 50);
                    }
                };
                checkOperations();
            });
        }
        
        // ИСПРАВЛЕНО: БД имеет абсолютный приоритет для критичных данных
        
        // 1. Баланс звезд - ТОЛЬКО из БД (с валидацией)
        if (newData.stars !== undefined && newData.stars !== null) {
            // ДОБАВЛЕНА ВАЛИДАЦИЯ: проверяем что значение корректное
            if (typeof newData.stars === 'number' && newData.stars >= 0 && newData.stars <= 1000000) {
                console.log(`💰 Обновляем баланс: ${this.gameData.stars} → ${newData.stars}`);
                this.gameData.stars = newData.stars;
            } else {
                console.error(`❌ НЕКОРРЕКТНЫЙ баланс от сервера: ${newData.stars}. Оставляем текущий: ${this.gameData.stars}`);
            }
        } else {
            console.warn('⚠️ Сервер не предоставил данные о балансе звезд');
        }
        
        // 2. Статистика - ТОЛЬКО из БД  
        if (newData.total_stars_earned !== undefined) {
            this.gameData.totalStarsEarned = newData.total_stars_earned;
        }
        if (newData.referrals !== undefined) {
            this.gameData.referrals = newData.referrals;
        }
        if (newData.total_spins !== undefined) {
            this.gameData.totalSpins = newData.total_spins;
        }
        if (newData.prizes_won !== undefined) {
            this.gameData.prizesWon = newData.prizes_won;
        }
        
        // 3. Поддержка разных форматов статистики
        if (newData.stats) {
            this.gameData.stars = newData.stats.stars !== undefined ? newData.stats.stars : this.gameData.stars;
            this.gameData.totalSpins = newData.stats.totalSpins !== undefined ? newData.stats.totalSpins : this.gameData.totalSpins;
            this.gameData.prizesWon = newData.stats.prizesWon !== undefined ? newData.stats.prizesWon : this.gameData.prizesWon;  
            this.gameData.totalStarsEarned = newData.stats.totalStarsEarned !== undefined ? newData.stats.totalStarsEarned : this.gameData.totalStarsEarned;
            this.gameData.referrals = newData.stats.referrals !== undefined ? newData.stats.referrals : this.gameData.referrals;
        }
        
        // 4. Некритичные данные можем объединять
        if (newData.prizes) {
            this.gameData.prizes = newData.prizes;
        }
        if (newData.recentWins) {
            this.gameData.recentWins = newData.recentWins;
        }
        if (newData.completedTasks || newData.tasks?.completed) {
            this.gameData.completedTasks = newData.completedTasks || newData.tasks.completed;
            console.log('✅ Обновлены выполненные задания:', this.gameData.completedTasks);
        }
        
        // КРИТИЧНО: Немедленно обновляем интерфейс с данными из БД
        this.updateInterface();
        this.saveGameData(); // Сохраняем после обновления UI
        
        console.log('✅ Данные синхронизированы с БД:', {
            stars: this.gameData.stars,
            totalStarsEarned: this.gameData.totalStarsEarned,
            referrals: this.gameData.referrals
        });
        
        // Обновляем профиль если он активен (убираем дублирование)
        if (this.navigation.currentScreen === 'profile' && this.screens.profile) {
            // Немедленное обновление
            this.screens.profile.loadProfileData();
            // Дополнительное обновление через задержку для надежности
            setTimeout(() => {
                this.screens.profile.loadProfileData();
            }, 500);
        }

        console.log('✅ Данные обновлены:', this.gameData);
    }

    // Метод для получения данных пользователя (используется в telegram-integration)
    getUserData() {
        return this.gameData;
    }

    // Показ конфетти
    showConfetti() {
        const colors = ['#EF55A5', '#CCD537', '#809EFF', '#FF6B9D', '#A4B93A'];
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.cssText = `
                    position: fixed;
                    left: ${Math.random() * 100}%;
                    top: -10px;
                    width: 10px;
                    height: 10px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    pointer-events: none;
                    z-index: 9999;
                `;
                
                document.body.appendChild(confetti);
                
                setTimeout(() => {
                    if (confetti.parentNode) {
                        confetti.parentNode.removeChild(confetti);
                    }
                }, 3000);
            }, i * 50);
        }
    }

    // УДАЛЕН ДУБЛИРОВАННЫЙ МЕТОД - используем основной метод updateStarsDisplay() выше

    // Обновление аватарки пользователя в header
    updateUserAvatar() {
        const avatarElement = document.querySelector('.header .avatar');
        const user = this.tg?.initDataUnsafe?.user;
        
        if (avatarElement && user) {
            // Очищаем текущее содержимое
            avatarElement.innerHTML = '';
            
            // Пытаемся загрузить фото из Telegram
            if (user.photo_url) {
                const img = document.createElement('img');
                img.src = user.photo_url;
                img.alt = `Аватар ${user.first_name}`;
                img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 50%;';
                
                // Fallback если изображение не загрузится
                img.onerror = () => {
                    avatarElement.textContent = user.first_name?.charAt(0).toUpperCase() || '👤';
                };
                
                avatarElement.appendChild(img);
            } else if (user.first_name) {
                avatarElement.textContent = user.first_name.charAt(0).toUpperCase();
            } else {
                avatarElement.textContent = '👤';
            }
        }
    }

    // Метод для навигации к экрану (для использования из других модулей)
    navigateToScreen(screenName) {
        if (this.navigation) {
            this.navigation.navigateTo(screenName);
        }
    }

    // Метод для обновления статистики рефералов
    updateReferrals(count) {
        this.gameData.referrals = count;
        this.saveGameData();
        this.updateInterface();
        
        // Обновляем профиль если он активен
        if (this.navigation.currentScreen === 'profile' && this.screens.profile) {
            this.screens.profile.loadProfileData();
        }
    }

    // Методы для работы с мега рулеткой
    renderMegaRoulette() {
        if (!this.screens.megaRoulette) {
            console.error('❌ Мега рулетка не инициализирована');
            return;
        }

        // Убираем все обычные экраны
        document.querySelectorAll('.screen:not(#mega-roulette-screen)').forEach(screen => {
            screen.classList.remove('active');
        });

        // Добавляем мега рулетку в DOM
        const container = document.getElementById('screens-container');
        if (container) {
            // Убираем существующую мега рулетку если есть
            this.removeMegaRoulette();
            
            // Добавляем новую
            const megaHTML = this.screens.megaRoulette.render();
            container.insertAdjacentHTML('beforeend', megaHTML);
            
            // Инициализируем
            this.screens.megaRoulette.init();
            
            // Показываем
            const megaScreen = document.getElementById('mega-roulette-screen');
            if (megaScreen) {
                megaScreen.classList.add('active');
                this.navigation.currentScreen = 'mega-roulette';
                console.log('✅ Мега рулетка отображена');
            }
        }
    }

    removeMegaRoulette() {
        const existingMegaScreen = document.getElementById('mega-roulette-screen');
        if (existingMegaScreen) {
            existingMegaScreen.remove();
            console.log('🗑️ Мега рулетка удалена из DOM');
        }
    }
}

// Глобальные функции для навигации
window.navigateToDeposit = () => {
    if (window.app && window.app.navigation) {
        window.app.navigation.navigateTo('deposit');
    }
};

// Глобальная функция для доступа к приложению
window.getApp = () => {
    return window.app;
};

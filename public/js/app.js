// app.js - Основной файл приложения (исправленная версия)

import { DEFAULT_USER_DATA, APP_CONFIG } from './config.js';
import { MainScreen } from './screens/main.js';
import { TasksScreen } from './screens/tasks.js';
import { ProfileScreen } from './screens/profile.js';

class App {
    constructor() {
        this.gameData = { ...DEFAULT_USER_DATA };
        this.screens = {};
        this.navigation = null;
        this.tg = null;
        this.isInitialized = false;
        this.currentScreen = 'main';
    }

    async init() {
        try {
            console.log('🚀 Запуск приложения Kosmetichka...');
            
            // Инициализация Telegram WebApp
            this.initTelegramWebApp();
            
            // Загрузка данных игрока
            await this.loadGameData();
            
            // Создание интерфейса
            await this.createInterface();
            
            // Инициализация навигации
            this.initNavigation();
            
            // Загрузка экранов
            await this.loadScreens();
            
            // Настройка глобальных обработчиков
            this.setupGlobalHandlers();
            
            // Обновление интерфейса
            this.updateInterface();
            
            // Скрываем загрузочный экран
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('✅ Приложение Kosmetichka инициализировано успешно');
            
            // Показать статус готовности
            setTimeout(() => {
                this.showStatusMessage('Добро пожаловать в Kosmetichka! 💄', 'success');
            }, 500);
            
        } catch (error) {
            console.error('❌ Критическая ошибка инициализации:', error);
            this.handleCriticalError(error);
        }
    }

    initTelegramWebApp() {
        try {
            this.tg = window.Telegram?.WebApp;
            
            if (this.tg) {
                console.log('📱 Telegram WebApp обнаружен');
                this.tg.ready();
                this.tg.expand();
                
                // Настраиваем цвета темы
                this.tg.setHeaderColor('#1a1a1a');
                this.tg.setBackgroundColor('#0f0f0f');
                
                console.log('✅ Telegram WebApp инициализирован');
            } else {
                console.log('🌐 Работа в веб-режиме (без Telegram)');
            }
        } catch (error) {
            console.warn('⚠️ Ошибка инициализации Telegram WebApp:', error);
        }
    }

    async loadGameData() {
        try {
            console.log('📊 Загрузка данных игрока...');
            
            const savedData = localStorage.getItem('kosmetichkaGameData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.gameData = { ...DEFAULT_USER_DATA, ...parsedData };
                console.log('✅ Данные игрока загружены из localStorage');
            } else {
                console.log('📝 Создание новых данных игрока');
                this.gameData = { ...DEFAULT_USER_DATA };
                this.saveGameData();
            }
            
            // Валидация данных
            this.validateGameData();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            this.gameData = { ...DEFAULT_USER_DATA };
            this.saveGameData();
        }
    }

    validateGameData() {
        // Проверяем и исправляем данные
        if (typeof this.gameData.stars !== 'number' || this.gameData.stars < 0) {
            this.gameData.stars = DEFAULT_USER_DATA.stars;
        }
        
        if (typeof this.gameData.availableFriendSpins !== 'number' || this.gameData.availableFriendSpins < 0) {
            this.gameData.availableFriendSpins = DEFAULT_USER_DATA.availableFriendSpins;
        }
        
        if (!Array.isArray(this.gameData.prizes)) {
            this.gameData.prizes = [];
        }
        
        if (!Array.isArray(this.gameData.completedTasks)) {
            this.gameData.completedTasks = [];
        }
        
        console.log('✅ Данные игрока валидированы');
    }

    async createInterface() {
        console.log('🎨 Создание интерфейса...');
        
        const appContainer = document.getElementById('app');
        if (!appContainer) {
            throw new Error('Контейнер приложения #app не найден');
        }

        // Скрываем загрузочный экран, но не удаляем пока
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0.5';
        }

        appContainer.innerHTML = `
            <!-- Загрузочный экран (остается для анимации) -->
            <div id="loading-screen" class="loading-screen" style="opacity: 0.5;">
                <div class="loading-spinner">🎰</div>
                <div class="loading-text">Загрузка интерфейса...</div>
            </div>

            <!-- Контейнер для экранов -->
            <div id="screens-container" class="screens-container" style="display: none;">
                <!-- Экраны будут добавлены динамически -->
            </div>

            <!-- Нижняя навигация -->
            <nav id="bottom-navigation" class="bottom-navigation" style="display: none;">
                <button id="nav-main" class="nav-btn active" data-screen="main">
                    <i class="fas fa-home"></i>
                    <span>Главная</span>
                </button>
                <button id="nav-tasks" class="nav-btn" data-screen="tasks">
                    <i class="fas fa-tasks"></i>
                    <span>Задания</span>
                    <span id="tasks-badge" class="badge" style="display: none;">3</span>
                </button>
                <button id="nav-profile" class="nav-btn" data-screen="profile">
                    <i class="fas fa-user"></i>
                    <span>Профиль</span>
                </button>
            </nav>

            <!-- Уведомления -->
            <div id="status-messages" class="status-messages"></div>
        `;

        console.log('✅ Базовый интерфейс создан');
    }

    initNavigation() {
        console.log('🧭 Инициализация навигации...');
        
        this.navigation = {
            navigateTo: (screenName) => {
                console.log(`🧭 Переход на экран: ${screenName}`);
                
                // Скрываем все экраны
                document.querySelectorAll('.screen').forEach(screen => {
                    screen.classList.remove('active');
                });
                
                // Убираем активный класс у всех кнопок навигации
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Показываем нужный экран
                const targetScreen = document.getElementById(`${screenName}-screen`);
                if (targetScreen) {
                    targetScreen.classList.add('active');
                }
                
                // Активируем соответствующую кнопку навигации
                const targetBtn = document.getElementById(`nav-${screenName}`);
                if (targetBtn) {
                    targetBtn.classList.add('active');
                }
                
                this.currentScreen = screenName;
                
                // Вибрация при переключении экранов
                if (this.tg && this.tg.HapticFeedback) {
                    this.tg.HapticFeedback.impactOccurred('light');
                }
            }
        };
        
        // Обработчики кнопок навигации
        setTimeout(() => {
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const screen = btn.dataset.screen;
                    if (screen) {
                        this.navigation.navigateTo(screen);
                    }
                });
            });
        }, 100);
        
        console.log('✅ Навигация инициализирована');
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
            this.screens.profile = new ProfileScreen(this);
            
            console.log('✅ Основные экраны созданы');

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

            // Рендерим все экраны
            const screensHTML = [];
            
            if (this.screens.main) screensHTML.push(this.screens.main.render());
            if (this.screens.tasks) screensHTML.push(this.screens.tasks.render());
            if (this.screens.profile) screensHTML.push(this.screens.profile.render());
            if (this.screens.megaRoulette) screensHTML.push(this.screens.megaRoulette.render());

            container.innerHTML = screensHTML.join('');

            // Инициализируем экраны с задержкой для корректной работы DOM
            await this.initializeScreens();

            // Показываем контейнер экранов
            container.style.display = 'block';

        } catch (error) {
            console.error('❌ Ошибка загрузки экранов:', error);
            throw error;
        }
    }

    async initializeScreens() {
        console.log('🔧 Инициализация экранов...');
        
        // Добавляем задержку для стабилизации DOM
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const initPromises = Object.entries(this.screens).map(async ([name, screen]) => {
            if (screen && screen.init) {
                try {
                    await screen.init();
                    console.log(`✅ Экран ${name} инициализирован`);
                } catch (error) {
                    console.error(`❌ Ошибка инициализации экрана ${name}:`, error);
                }
            }
        });

        await Promise.allSettled(initPromises);
        console.log('✅ Все экраны инициализированы');
    }

    setupGlobalHandlers() {
        console.log('🌐 Настройка глобальных обработчиков...');
        
        // Обработка ошибок
        window.addEventListener('error', (event) => {
            console.error('🚨 Глобальная ошибка:', event.error);
            this.handleError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 Необработанное отклонение промиса:', event.reason);
            this.handleError(event.reason);
        });

        // Обработка видимости страницы
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.onAppVisible();
            } else {
                this.onAppHidden();
            }
        });

        // Предотвращение случайного обновления страницы
        window.addEventListener('beforeunload', () => {
            this.saveGameData();
        });

        console.log('✅ Глобальные обработчики настроены');
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const bottomNav = document.getElementById('bottom-navigation');
        
        if (loadingScreen) {
            loadingScreen.style.transition = 'opacity 0.5s ease';
            loadingScreen.style.opacity = '0';
            
            setTimeout(() => {
                if (loadingScreen.parentNode) {
                    loadingScreen.parentNode.removeChild(loadingScreen);
                }
            }, 500);
        }
        
        if (bottomNav) {
            bottomNav.style.display = 'flex';
        }
        
        console.log('✅ Загрузочный экран скрыт');
    }

    updateInterface() {
        console.log('🔄 Обновление интерфейса...');
        
        try {
            this.updateStarsDisplay();
            this.updateTasksBadge();
            
            // Обновляем экраны, если они инициализированы
            Object.values(this.screens).forEach(screen => {
                if (screen && screen.updateStats) {
                    screen.updateStats();
                }
            });
            
            console.log('✅ Интерфейс обновлен');
        } catch (error) {
            console.error('❌ Ошибка обновления интерфейса:', error);
        }
    }

    updateStarsDisplay() {
        const starElements = document.querySelectorAll('#star-count, .stars-count');
        starElements.forEach(element => {
            if (element) {
                element.textContent = this.gameData.stars;
            }
        });
    }

    updateTasksBadge() {
        const tasksBadge = document.getElementById('tasks-badge');
        if (tasksBadge && this.screens.tasks) {
            const availableTasks = this.screens.tasks.getAvailableTasksCount?.() || 0;
            if (availableTasks > 0) {
                tasksBadge.textContent = availableTasks;
                tasksBadge.style.display = 'block';
            } else {
                tasksBadge.style.display = 'none';
            }
        }
    }

    saveGameData() {
        try {
            localStorage.setItem('kosmetichkaGameData', JSON.stringify(this.gameData));
        } catch (error) {
            console.error('❌ Ошибка сохранения данных:', error);
        }
    }

    showStatusMessage(message, type = 'info', duration = 3000) {
        const container = document.getElementById('status-messages');
        if (!container) return;

        const messageEl = document.createElement('div');
        messageEl.className = `status-message ${type}`;
        messageEl.textContent = message;

        container.appendChild(messageEl);

        // Анимация появления
        setTimeout(() => messageEl.classList.add('show'), 10);

        // Автоудаление
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, duration);
    }

    handleError(error) {
        console.error('🚨 Обработка ошибки:', error);
        
        // Попытка восстановления экранов, если кнопки не работают
        if (this.isInitialized && error.toString().includes('Cannot read properties')) {
            console.log('🔧 Попытка восстановления обработчиков...');
            this.refreshEventListeners();
        }
    }

    handleCriticalError(error) {
        console.error('💀 Критическая ошибка:', error);
        
        // Показываем пользователю сообщение об ошибке
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.innerHTML = `
                <div class="error-screen">
                    <div class="error-icon">⚠️</div>
                    <h2>Произошла ошибка</h2>
                    <p>Не удалось загрузить приложение Kosmetichka</p>
                    <p style="font-size: 14px; margin-top: 10px; opacity: 0.8;">
                        ${error.message || 'Неизвестная ошибка'}
                    </p>
                    <button class="btn-primary" onclick="window.location.reload()">
                        Перезагрузить
                    </button>
                </div>
            `;
        }
    }

    refreshEventListeners() {
        console.log('🔄 Обновление всех обработчиков событий...');
        
        try {
            // Обновляем обработчики во всех экранах
            Object.values(this.screens).forEach(screen => {
                if (screen && screen.refreshEventListeners) {
                    screen.refreshEventListeners();
                }
            });
            
            // Обновляем навигацию
            this.initNavigation();
            
            console.log('✅ Обработчики событий обновлены');
        } catch (error) {
            console.error('❌ Ошибка обновления обработчиков:', error);
        }
    }

    onAppVisible() {
        console.log('👁️ Приложение стало видимым');
        this.updateInterface();
    }

    onAppHidden() {
        console.log('🙈 Приложение скрыто');
        this.saveGameData();
    }

    // Метод для отправки данных на сервер
    sendToServer(action, data) {
        console.log(`📡 Отправка на сервер: ${action}`, data);
        // Реализация отправки данных на сервер
    }

    // Метод для принудительного обновления всех компонентов
    forceUpdate() {
        console.log('🔄 Принудительное обновление приложения...');
        
        try {
            this.updateInterface();
            this.refreshEventListeners();
            
            // Заставляем все экраны обновиться
            Object.values(this.screens).forEach(screen => {
                if (screen && screen.updateStats) {
                    screen.updateStats();
                }
            });
            
            this.showStatusMessage('Интерфейс обновлен', 'success');
        } catch (error) {
            console.error('❌ Ошибка принудительного обновления:', error);
            this.showStatusMessage('Ошибка обновления', 'error');
        }
    }
}

// Экспорт класса как default
export default App;
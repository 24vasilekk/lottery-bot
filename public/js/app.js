// app.js - ДИАГНОСТИЧЕСКАЯ ВЕРСИЯ для определения проблемы

console.log('🔍 НАЧИНАЕМ ДИАГНОСТИКУ ПРИЛОЖЕНИЯ');

// Проверяем основные зависимости
console.log('📋 Проверка зависимостей:');
console.log('- Telegram WebApp:', !!window.Telegram?.WebApp);
console.log('- localStorage:', !!window.localStorage);
console.log('- fetch API:', !!window.fetch);

// Пытаемся загрузить конфигурацию
let APP_CONFIG, DEFAULT_USER_DATA;
try {
    console.log('📦 Загружаем config.js...');
    const configModule = await import('./config.js');
    APP_CONFIG = configModule.APP_CONFIG;
    DEFAULT_USER_DATA = configModule.DEFAULT_USER_DATA;
    console.log('✅ config.js загружен успешно');
} catch (error) {
    console.error('❌ Ошибка загрузки config.js:', error);
    // Создаем базовую конфигурацию
    APP_CONFIG = {
        colors: { primary: '#EF55A5', lime: '#CCD537', purple: '#809EFF' },
        animations: { wheelSpinDuration: 4000 },
        wheel: { starCost: 20 }
    };
    DEFAULT_USER_DATA = {
        stars: 100,
        availableFriendSpins: 1,
        recentWins: [],
        completedTasks: [],
        profile: { name: 'Пользователь', avatar: '👤', joinDate: Date.now() }
    };
    console.log('🔧 Используем резервную конфигурацию');
}

// Пытаемся загрузить экраны
let MainScreen, TasksScreen, ProfileScreen;
try {
    console.log('📱 Загружаем экраны...');
    
    try {
        const mainModule = await import('./screens/main.js');
        MainScreen = mainModule.MainScreen;
        console.log('✅ MainScreen загружен');
    } catch (error) {
        console.error('❌ Ошибка загрузки MainScreen:', error);
        MainScreen = class { 
            constructor(app) { this.app = app; }
            render() { return '<div id="main-screen" class="screen active"><h2>Главный экран (резерв)</h2></div>'; }
            init() { console.log('Резервный главный экран инициализирован'); }
        };
    }
    
    try {
        const tasksModule = await import('./screens/tasks.js');
        TasksScreen = tasksModule.TasksScreen;
        console.log('✅ TasksScreen загружен');
    } catch (error) {
        console.error('❌ Ошибка загрузки TasksScreen:', error);
        TasksScreen = class { 
            constructor(app) { this.app = app; }
            render() { return '<div id="tasks-screen" class="screen"><h2>Задания (резерв)</h2></div>'; }
            init() { console.log('Резервный экран заданий инициализирован'); }
        };
    }
    
    try {
        const profileModule = await import('./screens/profile.js');
        ProfileScreen = profileModule.ProfileScreen;
        console.log('✅ ProfileScreen загружен');
    } catch (error) {
        console.error('❌ Ошибка загрузки ProfileScreen:', error);
        ProfileScreen = class { 
            constructor(app) { this.app = app; }
            render() { return '<div id="profile-screen" class="screen"><h2>Профиль (резерв)</h2></div>'; }
            init() { console.log('Резервный экран профиля инициализирован'); }
        };
    }
    
} catch (error) {
    console.error('💥 Критическая ошибка загрузки экранов:', error);
}

class App {
    constructor() {
        console.log('🏗️ Создание экземпляра приложения...');
        this.gameData = { ...DEFAULT_USER_DATA };
        this.screens = {};
        this.navigation = null;
        this.tg = null;
        this.isInitialized = false;
        this.currentScreen = 'main';
        console.log('✅ Конструктор приложения выполнен');
    }

    async init() {
        try {
            console.log('🚀 НАЧИНАЕМ ИНИЦИАЛИЗАЦИЮ...');
            
            // Шаг 1: Telegram WebApp
            console.log('📱 Шаг 1: Инициализация Telegram WebApp');
            this.initTelegramWebApp();
            
            // Шаг 2: Загрузка данных
            console.log('💾 Шаг 2: Загрузка данных игрока');
            await this.loadGameData();
            
            // Шаг 3: Создание интерфейса
            console.log('🖼️ Шаг 3: Создание интерфейса');
            await this.createInterface();
            
            // Шаг 4: Навигация
            console.log('🧭 Шаг 4: Инициализация навигации');
            this.initNavigation();
            
            // Шаг 5: Экраны
            console.log('📱 Шаг 5: Загрузка экранов');
            await this.loadScreens();
            
            // Шаг 6: Обработчики
            console.log('🛡️ Шаг 6: Настройка обработчиков');
            this.setupGlobalHandlers();
            
            // Шаг 7: Обновление UI
            console.log('🔄 Шаг 7: Обновление интерфейса');
            this.updateInterface();
            
            // Шаг 8: СКРЫВАЕМ ЗАГРУЗОЧНЫЙ ЭКРАН
            console.log('🎉 Шаг 8: Скрытие загрузочного экрана');
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('✅ ПРИЛОЖЕНИЕ ПОЛНОСТЬЮ ИНИЦИАЛИЗИРОВАНО!');
            
        } catch (error) {
            console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ИНИЦИАЛИЗАЦИИ:', error);
            console.error('Stack trace:', error.stack);
            this.handleCriticalError(error);
        }
    }

    initTelegramWebApp() {
        try {
            if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                this.tg = window.Telegram.WebApp;
                this.tg.ready();
                this.tg.expand();
                this.tg.disableVerticalSwipes();
                
                if (this.tg.colorScheme === 'dark') {
                    document.body.classList.add('dark-theme');
                }
                
                console.log('✅ Telegram WebApp инициализирован');
            } else {
                console.log('🌐 Запуск в браузере (режим разработки)');
            }
        } catch (error) {
            console.error('❌ Ошибка инициализации Telegram WebApp:', error);
        }
    }

    async loadGameData() {
        try {
            const saved = localStorage.getItem('kosmetichkaGameData');
            if (saved) {
                this.gameData = { ...DEFAULT_USER_DATA, ...JSON.parse(saved) };
                console.log('✅ Данные загружены из localStorage');
            } else {
                this.gameData = { ...DEFAULT_USER_DATA };
                console.log('✅ Созданы новые данные пользователя');
            }
            
            // Инициализация полей
            if (!this.gameData.recentWins) this.gameData.recentWins = [];
            if (!this.gameData.completedTasks) this.gameData.completedTasks = [];
            if (!this.gameData.availableFriendSpins) this.gameData.availableFriendSpins = 1;
            if (!this.gameData.profile) this.gameData.profile = { name: 'Пользователь', avatar: '👤', joinDate: Date.now() };
            
            console.log('✅ Данные игрока инициализированы');
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            this.gameData = { ...DEFAULT_USER_DATA };
        }
    }

    async createInterface() {
        try {
            const app = document.getElementById('app');
            if (!app) {
                throw new Error('Контейнер приложения не найден');
            }

            console.log('🔧 Создаем HTML интерфейс...');
            
            app.innerHTML = `
                <!-- Контейнер для уведомлений - ВВЕРХУ -->
                <div id="status-messages" class="status-messages-container"></div>
                
                <!-- Контейнер экранов -->
                <div id="screens-container"></div>
                
                <!-- НИЖНЯЯ НАВИГАЦИЯ -->
                <nav id="bottom-navigation" class="bottom-nav">
                    <button class="nav-btn active" data-screen="main">
                        <i class="fas fa-home"></i>
                        <span>Главная</span>
                    </button>
                    <button class="nav-btn" data-screen="tasks">
                        <i class="fas fa-tasks"></i>
                        <span>Задания</span>
                        <div class="nav-badge" id="tasks-badge" style="display: none;"></div>
                    </button>
                    <button class="nav-btn" data-screen="profile">
                        <i class="fas fa-user"></i>
                        <span>Профиль</span>
                    </button>
                </nav>
            `;

            console.log('✅ HTML интерфейс создан');
            
        } catch (error) {
            console.error('❌ Ошибка создания интерфейса:', error);
            throw error;
        }
    }

    initNavigation() {
        try {
            console.log('🧭 Создаем систему навигации...');
            
            this.navigation = {
                currentScreen: 'main',
                navigateTo: (screenName) => {
                    console.log(`🧭 Переход: ${this.navigation.currentScreen} → ${screenName}`);
                    
                    // Скрываем все экраны
                    document.querySelectorAll('.screen').forEach(screen => {
                        screen.classList.remove('active');
                    });
                    
                    // Показываем нужный экран
                    const targetScreen = document.getElementById(`${screenName}-screen`);
                    if (targetScreen) {
                        targetScreen.classList.add('active');
                        this.navigation.currentScreen = screenName;
                        
                        // Инициализируем экран
                        if (this.screens[screenName] && this.screens[screenName].init) {
                            this.screens[screenName].init();
                        }
                    } else {
                        console.error(`❌ Экран ${screenName} не найден`);
                    }
                    
                    // Обновляем навигацию
                    document.querySelectorAll('.nav-btn').forEach(btn => {
                        btn.classList.remove('active');
                        if (btn.dataset.screen === screenName) {
                            btn.classList.add('active');
                        }
                    });
                }
            };

            // Обработчики кнопок
            setTimeout(() => {
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const screen = btn.dataset.screen;
                        if (screen && screen !== this.navigation.currentScreen) {
                            this.navigation.navigateTo(screen);
                        }
                    });
                });
                console.log('✅ Обработчики навигации добавлены');
            }, 100);
            
            console.log('✅ Навигация инициализирована');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации навигации:', error);
        }
    }

    async loadScreens() {
        try {
            console.log('📱 Загружаем и рендерим экраны...');
            
            const container = document.getElementById('screens-container');
            if (!container) {
                throw new Error('Контейнер экранов не найден');
            }

            // Создаем экраны
            console.log('🏗️ Создание экземпляров экранов...');
            this.screens.main = new MainScreen(this);
            this.screens.tasks = new TasksScreen(this);
            this.screens.profile = new ProfileScreen(this);
            
            console.log('✅ Экземпляры экранов созданы');

            // Рендерим экраны
            console.log('🎨 Рендеринг HTML экранов...');
            const screensHTML = [];
            
            screensHTML.push(this.screens.main.render());
            screensHTML.push(this.screens.tasks.render());
            screensHTML.push(this.screens.profile.render());
            
            container.innerHTML = screensHTML.join('');
            console.log('✅ HTML экранов отрендерен');

            // Инициализируем главный экран
            console.log('🔧 Инициализация главного экрана...');
            if (this.screens.main && this.screens.main.init) {
                this.screens.main.init();
            }

            console.log('✅ Экраны полностью загружены');

        } catch (error) {
            console.error('❌ Ошибка загрузки экранов:', error);
            
            // Создаем минимальные экраны в случае ошибки
            const container = document.getElementById('screens-container');
            if (container) {
                container.innerHTML = `
                    <div id="main-screen" class="screen active">
                        <div style="padding: 20px; text-align: center;">
                            <h2>🎰 Kosmetichka</h2>
                            <p>Рулетка красоты и призов</p>
                            <p style="margin-top: 20px; font-size: 14px; opacity: 0.7;">
                                Временный интерфейс - проверьте консоль для диагностики
                            </p>
                        </div>
                    </div>
                    <div id="tasks-screen" class="screen">
                        <div style="padding: 20px; text-align: center;">
                            <h2>📋 Задания</h2>
                            <p>Здесь будут ваши задания</p>
                        </div>
                    </div>
                    <div id="profile-screen" class="screen">
                        <div style="padding: 20px; text-align: center;">
                            <h2>👤 Профиль</h2>
                            <p>Здесь будет ваш профиль</p>
                        </div>
                    </div>
                `;
                console.log('🔧 Созданы резервные экраны');
            }
        }
    }

    setupGlobalHandlers() {
        try {
            window.addEventListener('error', (event) => {
                console.error('🚨 Глобальная ошибка:', event.error);
            });

            window.addEventListener('unhandledrejection', (event) => {
                console.error('🚨 Необработанное отклонение промиса:', event.reason);
            });

            console.log('✅ Глобальные обработчики настроены');
        } catch (error) {
            console.error('❌ Ошибка настройки обработчиков:', error);
        }
    }

    updateInterface() {
        try {
            console.log('🔄 Обновляем интерфейс...');
            
            const starCount = document.getElementById('star-count');
            if (starCount) {
                starCount.textContent = this.gameData.stars || 0;
            }

            const userName = document.querySelector('.user-name');
            if (userName && this.tg?.initDataUnsafe?.user?.first_name) {
                userName.textContent = this.tg.initDataUnsafe.user.first_name;
            }

            console.log('✅ Интерфейс обновлен');
        } catch (error) {
            console.error('❌ Ошибка обновления интерфейса:', error);
        }
    }

    hideLoadingScreen() {
        try {
            console.log('🎭 Скрываем загрузочный экран...');
            
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                console.log('✅ Загрузочный экран найден, скрываем...');
                
                loadingScreen.style.transition = 'opacity 0.5s ease';
                loadingScreen.style.opacity = '0';
                
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    console.log('✅ Загрузочный экран полностью скрыт');
                }, 500);
            } else {
                console.warn('⚠️ Загрузочный экран не найден');
            }
        } catch (error) {
            console.error('❌ Ошибка скрытия загрузочного экрана:', error);
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
        console.log(`📢 Уведомление: ${type} - ${message}`);
        
        const container = document.getElementById('status-messages');
        if (!container) {
            console.warn('⚠️ Контейнер уведомлений не найден');
            return;
        }

        const messageEl = document.createElement('div');
        messageEl.className = `status-message ${type}`;
        messageEl.textContent = message;

        container.appendChild(messageEl);

        requestAnimationFrame(() => {
            messageEl.classList.add('show');
        });

        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 400);
        }, duration);
    }

    handleCriticalError(error) {
        console.error('💀 КРИТИЧЕСКАЯ ОШИБКА ПРИЛОЖЕНИЯ:', error);
        console.error('Stack trace:', error.stack);
        
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%); color: white;">
                    <div style="font-size: 48px; margin-bottom: 20px;">💥</div>
                    <h2>Ошибка приложения</h2>
                    <p style="margin: 10px 0;">Kosmetichka не может быть загружена</p>
                    <details style="margin: 20px 0; text-align: left; max-width: 100%; overflow-wrap: break-word;">
                        <summary style="cursor: pointer; margin-bottom: 10px;">Подробности ошибки</summary>
                        <pre style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; font-size: 12px; overflow: auto;">
${error.message}

${error.stack}
                        </pre>
                    </details>
                    <button onclick="window.location.reload()" style="background: linear-gradient(135deg, #EF55A5, #ff6b9d); border: none; color: white; padding: 12px 24px; border-radius: 25px; cursor: pointer; margin: 5px;">
                        Перезагрузить приложение
                    </button>
                    <button onclick="localStorage.clear(); window.location.reload();" style="background: linear-gradient(135deg, #666, #444); border: none; color: white; padding: 12px 24px; border-radius: 25px; cursor: pointer; margin: 5px;">
                        Очистить данные и перезагрузить
                    </button>
                </div>
            `;
        }
    }
}

// ЕДИНСТВЕННАЯ ТОЧКА ВХОДА
console.log('🎬 Ожидаем загрузки DOM...');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

async function initializeApp() {
    try {
        console.log('🎬 DOM загружен, создаем приложение...');
        
        // Удаляем старые экземпляры если есть
        if (window.app) {
            console.log('🧹 Удаляем старый экземпляр приложения');
            delete window.app;
        }
        
        const app = new App();
        window.app = app;
        
        console.log('🚀 Запускаем инициализацию...');
        await app.init();
        
        console.log('🎉 ПРИЛОЖЕНИЕ ГОТОВО К РАБОТЕ!');
        
    } catch (error) {
        console.error('💥 ФАТАЛЬНАЯ ОШИБКА ЗАПУСКА:', error);
        
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%); color: white;">
                    <div style="font-size: 48px; margin-bottom: 20px;">💥</div>
                    <h2>Фатальная ошибка</h2>
                    <p style="margin: 10px 0;">Не удалось запустить Kosmetichka</p>
                    <pre style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; font-size: 12px; margin: 20px 0; overflow: auto; max-width: 100%;">
${error.message}
${error.stack}
                    </pre>
                    <button onclick="window.location.reload()" style="background: linear-gradient(135deg, #EF55A5, #ff6b9d); border: none; color: white; padding: 12px 24px; border-radius: 25px; cursor: pointer;">
                        Попробовать снова
                    </button>
                </div>
            `;
        }
    }
}

export default App;
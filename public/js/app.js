// app.js - ИСПРАВЛЕННАЯ ОРИГИНАЛЬНАЯ ВЕРСИЯ (без зависания)

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
            
            // ИСПРАВЛЕНИЕ: Принудительно скрываем загрузочный экран
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 100);
            
            this.isInitialized = true;
            console.log('✅ Приложение Kosmetichka инициализировано успешно');
            
        } catch (error) {
            console.error('❌ Критическая ошибка инициализации:', error);
            this.handleCriticalError(error);
        }
    }

    initTelegramWebApp() {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            this.tg = window.Telegram.WebApp;
            this.tg.ready();
            this.tg.expand();
            this.tg.disableVerticalSwipes();
            
            // Настройка темы
            if (this.tg.colorScheme === 'dark') {
                document.body.classList.add('dark-theme');
            }
            
            console.log('📱 Telegram WebApp инициализирован');
        } else {
            console.log('🌐 Запуск в браузере (режим разработки)');
        }
    }

    async loadGameData() {
        try {
            // Попытка загрузки из localStorage
            const saved = localStorage.getItem('kosmetichkaGameData');
            if (saved) {
                this.gameData = { ...DEFAULT_USER_DATA, ...JSON.parse(saved) };
                console.log('💾 Данные загружены из localStorage');
            } else {
                this.gameData = { ...DEFAULT_USER_DATA };
                console.log('🆕 Созданы новые данные пользователя');
            }
            
            // Инициализация необходимых полей
            if (!this.gameData.recentWins) this.gameData.recentWins = [];
            if (!this.gameData.completedTasks) this.gameData.completedTasks = [];
            if (!this.gameData.availableFriendSpins) this.gameData.availableFriendSpins = 1;
            if (!this.gameData.profile) this.gameData.profile = { name: 'Пользователь', avatar: '👤', joinDate: Date.now() };
            
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
            <nav id="bottom-navigation" class="bottom-nav">
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
                const validScreens = ['main', 'tasks', 'profile', 'mega-roulette'];
                if (!validScreens.includes(screenName)) {
                    console.error(`❌ Неизвестный экран: ${screenName}`);
                    return;
                }
                
                // Скрываем все экраны
                document.querySelectorAll('.screen').forEach(screen => {
                    screen.classList.remove('active');
                });
                
                // Показываем нужный экран
                const targetScreen = document.getElementById(`${screenName}-screen`);
                if (targetScreen) {
                    targetScreen.classList.add('active');
                    this.navigation.currentScreen = screenName;
                    
                    // Инициализируем экран если нужно
                    if (this.screens[screenName] && this.screens[screenName].init) {
                        this.screens[screenName].init();
                    }
                    
                    // Прокрутка наверх при переключении экранов
                    targetScreen.scrollTop = 0;
                } else {
                    console.error(`❌ Экран ${screenName} не найден`);
                    return;
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

            // Инициализируем активный экран
            if (this.screens.main) {
                this.screens.main.init();
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
        // Обновление счетчика звезд
        const starCount = document.getElementById('star-count');
        if (starCount) {
            starCount.textContent = this.gameData.stars || 0;
        }

        // Обновление имени пользователя
        const userName = document.querySelector('.user-name');
        if (userName && this.tg?.initDataUnsafe?.user?.first_name) {
            userName.textContent = this.tg.initDataUnsafe.user.first_name;
        }

        // Обновление бейджа заданий
        this.updateTasksBadge();

        console.log('🔄 Интерфейс обновлен');
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

    updateTasksBadge() {
        const tasksBadge = document.getElementById('tasks-badge');
        if (tasksBadge) {
            const availableTasks = this.getAvailableTasksCount() || 0;
            if (availableTasks > 0) {
                tasksBadge.textContent = availableTasks;
                tasksBadge.style.display = 'block';
            } else {
                tasksBadge.style.display = 'none';
            }
        }
    }

    getAvailableTasksCount() {
        // Подсчет доступных заданий
        return 3; // Временно возвращаем 3
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

        // Добавляем иконки для разных типов
        const icons = {
            success: '🎉',
            error: '😔',
            info: 'ℹ️',
            achievement: '🏆'
        };

        if (icons[type]) {
            messageEl.textContent = `${icons[type]} ${message}`;
        }

        // Добавляем в контейнер
        container.appendChild(messageEl);

        // Анимация появления
        requestAnimationFrame(() => {
            messageEl.classList.add('show');
        });

        // Автоудаление
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 400);
        }, duration);

        console.log(`📢 Уведомление: ${type} - ${message}`);
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
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%); color: white;">
                    <div style="font-size: 48px; margin-bottom: 20px;">💥</div>
                    <h2>Ошибка запуска</h2>
                    <p style="opacity: 0.8; margin: 10px 0;">Приложение Kosmetichka не может быть загружено</p>
                    <p style="font-size: 12px; opacity: 0.6; margin: 10px 0;">${error.message || 'Неизвестная ошибка'}</p>
                    <button onclick="window.location.reload()" style="background: linear-gradient(135deg, #EF55A5, #ff6b9d); border: none; color: white; padding: 12px 24px; border-radius: 25px; margin-top: 20px; cursor: pointer;">
                        Попробовать снова
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
            
            // Переинициализируем навигацию
            this.initNavigation();
            
            console.log('✅ Обработчики событий обновлены');
        } catch (error) {
            console.error('❌ Ошибка обновления обработчиков:', error);
        }
    }
}

// ИСПРАВЛЕННАЯ ИНИЦИАЛИЗАЦИЯ
window.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🎬 DOM загружен, запуск приложения...');
        const app = new App();
        await app.init();
        
        // Глобальный доступ к приложению
        window.app = app;
        
    } catch (error) {
        console.error('💥 Фатальная ошибка запуска:', error);
        
        // Показ экрана ошибки
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%); color: white;">
                    <div style="font-size: 48px; margin-bottom: 20px;">💥</div>
                    <h2>Ошибка запуска</h2>
                    <p style="opacity: 0.8; margin: 10px 0;">Приложение Kosmetichka не может быть загружено</p>
                    <button onclick="window.location.reload()" style="background: linear-gradient(135deg, #EF55A5, #ff6b9d); border: none; color: white; padding: 12px 24px; border-radius: 25px; margin-top: 20px; cursor: pointer;">
                        Попробовать снова
                    </button>
                </div>
            `;
        }
    }
});

export default App;
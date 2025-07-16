// app.js - Основной файл приложения (ИСПРАВЛЕННАЯ ВЕРСИЯ БЕЗ УВЕДОМЛЕНИЯ)

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
            
            // УБРАНО УВЕДОМЛЕНИЕ "Добро пожаловать в Kosmetichka!"
            // Показываем только готовность системы в консоли
            console.log('🎮 Приложение готово к использованию!');
            
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
            <div id="screens-container"></div>
            
            <!-- Нижняя навигация -->
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
            
            <!-- Контейнер для уведомлений -->
            <div id="status-messages" class="status-messages-container"></div>
        `;

        console.log('🖼️ Интерфейс создан');
    }

    initNavigation() {
        this.navigation = {
            currentScreen: 'main',
            navigateTo: (screenName) => {
                console.log(`🧭 Переход на экран: ${screenName}`);
                
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
                }
                
                // Обновляем навигацию
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                const activeBtn = document.querySelector(`[data-screen="${screenName}"]`);
                if (activeBtn) {
                    activeBtn.classList.add('active');
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
            loadingScreen.style.transition = 'opacity 0.5s ease';
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
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
        // Заглушка для подсчета доступных заданий
        return 0;
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
            
            console.log('✅ Обработчики событий обновлены');
        } catch (error) {
            console.error('❌ Ошибка обновления обработчиков:', error);
        }
    }
}

// Инициализация приложения
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
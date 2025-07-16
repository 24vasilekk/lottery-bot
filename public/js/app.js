// public/js/app.js - ИСПРАВЛЕННАЯ ВЕРСИЯ БЕЗ ЦИФРЫ "3" В НАВИГАЦИИ

import { APP_CONFIG, WHEEL_PRIZES } from './config.js';
import { MainScreen } from './screens/main.js';
import { TasksScreen } from './screens/tasks.js';
import { ProfileScreen } from './screens/profile.js';

// Конфигурация по умолчанию для пользователя
const DEFAULT_USER_DATA = {
    stars: 100,
    totalSpins: 0,
    totalWins: 0,
    availableFriendSpins: 1,
    recentWins: [],
    completedTasks: [],
    profile: {
        name: 'Пользователь',
        avatar: '👤',
        joinDate: Date.now()
    },
    lastDailyReset: Date.now()
};

export default class App {
    constructor() {
        console.log('🚀 Инициализация Kosmetichka App...');
        
        this.gameData = null;
        this.screens = {};
        this.navigation = null;
        this.tg = null;
        
        // Инициализация Telegram WebApp
        this.initTelegramWebApp();
        
        console.log('📱 App создан');
    }

    initTelegramWebApp() {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
            this.tg = Telegram.WebApp;
            this.tg.ready();
            this.tg.expand();
            
            // Настройка темы
            this.tg.setHeaderColor('#1a1a1a');
            this.tg.setBackgroundColor('#1a1a1a');
            
            console.log('🤖 Telegram WebApp инициализирован');
        } else {
            console.log('🌐 Запуск в браузере (без Telegram WebApp)');
        }
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
            
            // 7. Скрываем загрузочный экран
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

        // Обновление бейджа заданий (ИСПРАВЛЕНО - УБИРАЕМ ЦИФРУ)
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

    // Дополнительные методы для работы с игрой
    addStars(amount) {
        this.gameData.stars += amount;
        this.updateInterface();
        this.saveGameData();
        console.log(`⭐ Добавлено ${amount} звезд. Всего: ${this.gameData.stars}`);
    }

    spendStars(amount) {
        if (this.gameData.stars >= amount) {
            this.gameData.stars -= amount;
            this.updateInterface();
            this.saveGameData();
            console.log(`💰 Потрачено ${amount} звезд. Осталось: ${this.gameData.stars}`);
            return true;
        }
        console.log(`❌ Недостаточно звезд. Нужно: ${amount}, есть: ${this.gameData.stars}`);
        return false;
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
        this.saveGameData();
        
        console.log(`🎁 Добавлен выигрыш: ${prize.name}`);
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

    // Обновление отображения звезд во всех местах
    updateStarsDisplay() {
        document.querySelectorAll('[data-stars]').forEach(el => {
            el.textContent = this.gameData.stars;
        });
    }
}
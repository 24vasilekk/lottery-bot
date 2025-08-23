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
            
            // 1. Загружаем локальные данные (как временные)
            this.loadGameData();
            console.log('📊 Локальные данные загружены, баланс:', this.gameData.stars);
            
            // 2. Создаем интерфейс
            await this.createInterface();
            
            // 3. Инициализируем навигацию
            this.initNavigation();
            
            // 4. Загружаем экраны
            await this.loadScreens();
            
            // 5. Настраиваем глобальные обработчики
            this.setupGlobalHandlers();
            
            // 6. Обновляем интерфейс с локальными данными (временно)
            this.updateInterface();
            
            // 7. ГЛАВНОЕ: Синхронизация с сервером
            if (window.telegramIntegration) {
                this.tg = window.telegramIntegration.tg;
                console.log('🔄 Начинаем синхронизацию с сервером...');
                
                // Инициализируем пользователя
                window.telegramIntegration.initUser();
                
                // ВАЖНО: Ждем синхронизацию и получаем актуальные данные
                console.log('📡 Запрашиваем актуальные данные с сервера...');
                await window.telegramIntegration.syncWithServer();
                
                // КРИТИЧЕСКИ ВАЖНО: После синхронизации проверяем, что данные обновились
                // Если syncWithServer обновил gameData, нужно обновить интерфейс
                console.log('📊 Баланс после синхронизации:', this.gameData.stars);
                
                // ДОБАВЛЯЕМ: Принудительное обновление интерфейса с новыми данными
                this.updateInterface();
                this.updateStarsDisplay();
                
                // ДОБАВЛЯЕМ: Обновляем все экраны, которые могут показывать баланс
                if (this.screens.main && this.screens.main.updateSpinButtons) {
                    this.screens.main.updateSpinButtons();
                }
                
                // ДОБАВЛЯЕМ: Сохраняем синхронизированные данные локально
                this.saveGameData();
                
            } else {
                console.warn('⚠️ telegramIntegration не доступен');
            }
            
            // 8. Скрываем загрузочный экран
            this.hideLoadingScreen();
            
            // 9. ФИНАЛЬНАЯ ПРОВЕРКА
            console.log('✅ Приложение инициализировано!');
            console.log('🏁 ФИНАЛЬНЫЙ БАЛАНС:', this.gameData.stars);
            console.log('🏁 ФИНАЛЬНЫЕ ДАННЫЕ:', {
                stars: this.gameData.stars,
                referrals: this.gameData.referrals,
                totalSpins: this.gameData.totalSpins
            });
            
        } catch (error) {
            console.error('❌ Критическая ошибка инициализации:', error);
            this.handleError(error);
        }
    }

    loadGameData() {
        try {
            const saved = localStorage.getItem('kosmetichkaGameData');
            if (saved) {
                const parsedData = JSON.parse(saved);
                console.log('📂 Загружены локальные данные:', parsedData);
                
                // ВАЖНО: НЕ загружаем баланс из localStorage!
                // Баланс должен приходить только с сервера
                delete parsedData.stars;
                delete parsedData.total_stars_earned;
                
                this.gameData = {
                    ...DEFAULT_USER_DATA,
                    ...parsedData,
                    stars: 0 // Временно 0, пока не придут данные с сервера
                };
            } else {
                this.gameData = { ...DEFAULT_USER_DATA, stars: 0 };
            }
            
            console.log('📊 Инициализированы данные (без баланса):', this.gameData);
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            this.gameData = { ...DEFAULT_USER_DATA, stars: 0 };
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
        document.addEventListener('visibilitychange', async () => {
            if (document.hidden) {
                this.saveGameData();
            } else {
                // ВАЖНО: Синхронизируем баланс при возвращении в приложение
                console.log('👁️ Приложение стало видимым, синхронизируем баланс...');
                if (this.syncBalanceFromServer) {
                    try {
                        await this.syncBalanceFromServer();
                        console.log('✅ Баланс синхронизирован при возвращении в приложение');
                    } catch (error) {
                        console.error('❌ Ошибка синхронизации баланса при возвращении:', error);
                    }
                }
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
        try {
            console.log('🔄 Обновление интерфейса, текущий баланс:', this.gameData.stars);
            
            // 1. Обновляем отображение звезд
            const starCount = document.getElementById('star-count');
            if (starCount) {
                starCount.textContent = this.gameData.stars || 0;
            }
            
            // Обновляем все элементы с классом для звезд
            document.querySelectorAll('.stars-value, .star-balance, .user-stars span').forEach(el => {
                if (el) {
                    el.textContent = this.gameData.stars || 0;
                }
            });
            
            // Обновляем элементы с data-stars
            document.querySelectorAll('[data-stars]').forEach(el => {
                el.textContent = this.gameData.stars || 0;
            });
            
            // Обновляем счетчик в хедере
            const headerStars = document.querySelector('.user-stars');
            if (headerStars) {
                const starsSpan = headerStars.querySelector('span');
                if (starsSpan) {
                    starsSpan.textContent = this.gameData.stars || 0;
                }
            }
            
            // 2. НОВОЕ: Обновление имени пользователя на главном экране
            const userName = document.querySelector('.user-name');
            if (userName) {
                // Получаем данные пользователя из Telegram WebApp
                const telegramUser = this.tg?.initDataUnsafe?.user || 
                                window.Telegram?.WebApp?.initDataUnsafe?.user ||
                                this.gameData?.userData ||
                                this.gameData?.user;
                
                if (telegramUser) {
                    // Приоритет для главного экрана: username с @, потом first_name
                    if (telegramUser.username) {
                        userName.textContent = `@${telegramUser.username}`;
                    } else if (telegramUser.first_name && telegramUser.first_name !== 'Пользователь') {
                        userName.textContent = telegramUser.first_name;
                    } else if (telegramUser.firstName) {
                        userName.textContent = telegramUser.firstName;
                    } else {
                        userName.textContent = 'Игрок';
                    }
                    
                    console.log('📝 Обновлено имя пользователя:', userName.textContent);
                }
            }
            
            // 3. Обновляем аватар пользователя если есть
            const userAvatar = document.querySelector('.user-avatar, .profile-pic');
            if (userAvatar) {
                const telegramUser = this.tg?.initDataUnsafe?.user;
                if (telegramUser?.photo_url) {
                    userAvatar.style.backgroundImage = `url(${telegramUser.photo_url})`;
                } else if (telegramUser?.first_name) {
                    // Показываем первую букву имени если нет фото
                    userAvatar.textContent = telegramUser.first_name.charAt(0).toUpperCase();
                }
            }
            
            // 4. Обновляем экран депозита если он активен
            const depositBalance = document.getElementById('current-balance');
            if (depositBalance) {
                depositBalance.textContent = `${this.gameData.stars || 0} ⭐`;
            }
            
            // 5. Обновляем профиль если он активен
            const profileStars = document.querySelector('#profile-screen .stat-value');
            if (profileStars) {
                profileStars.textContent = this.gameData.stars || 0;
            }
            
            // Обновляем имя в профиле
            const profileName = document.querySelector('.profile-name');
            if (profileName) {
                const telegramUser = this.tg?.initDataUnsafe?.user || this.gameData?.userData;
                if (telegramUser?.username) {
                    profileName.textContent = `@${telegramUser.username}`;
                } else if (telegramUser?.first_name) {
                    profileName.textContent = telegramUser.first_name;
                }
            }
            
            // 6. Обновляем экран заданий если он активен
            const tasksStars = document.querySelector('#tasks-screen .header-stars');
            if (tasksStars) {
                tasksStars.textContent = this.gameData.stars || 0;
            }
            
            // 7. Обновляем кнопки прокрутки если главный экран активен
            if (this.screens.main && typeof this.screens.main.updateSpinButtons === 'function') {
                this.screens.main.updateSpinButtons();
            }
            
            // 8. Обновляем счетчик рефералов
            const referralElements = document.querySelectorAll('.referral-count, [data-referrals]');
            referralElements.forEach(el => {
                if (el) {
                    el.textContent = this.gameData.referrals || 0;
                }
            });
            
            // 9. Обновляем общую статистику
            const totalSpinsElements = document.querySelectorAll('[data-total-spins]');
            totalSpinsElements.forEach(el => {
                if (el) {
                    el.textContent = this.gameData.totalSpins || 0;
                }
            });
            
            const prizesWonElements = document.querySelectorAll('[data-prizes-won]');
            prizesWonElements.forEach(el => {
                if (el) {
                    el.textContent = this.gameData.prizesWon || 0;
                }
            });
            
            // 10. Обновляем бейдж заданий если есть
            if (this.screens.tasks && typeof this.screens.tasks.getAvailableTasksCount === 'function') {
                const taskBadge = document.getElementById('tasks-badge');
                if (taskBadge) {
                    const availableTasks = this.screens.tasks.getAvailableTasksCount();
                    if (availableTasks > 0) {
                        taskBadge.style.display = 'block';
                        taskBadge.textContent = availableTasks;
                    } else {
                        taskBadge.style.display = 'none';
                    }
                }
            }
            
            // 11. Обновляем состояние кнопок в навигации
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                const screen = item.dataset.screen;
                if (screen && this.currentScreen === screen) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
            
            // 12. Обновляем мега-рулетку если доступна
            if (this.screens['mega-roulette'] && typeof this.screens['mega-roulette'].updateUI === 'function') {
                this.screens['mega-roulette'].updateUI();
            }
            
            // 13. Обновляем последние выигрыши на главном экране
            if (this.screens.main && typeof this.screens.main.updateRecentWins === 'function') {
                this.screens.main.updateRecentWins();
            }
            
            // Логируем финальное состояние
            console.log('✅ Интерфейс обновлен. Финальные значения:', {
                stars: this.gameData.stars,
                referrals: this.gameData.referrals,
                totalSpins: this.gameData.totalSpins,
                prizesWon: this.gameData.prizesWon,
                userName: document.querySelector('.user-name')?.textContent || 'не найдено'
            });
            
        } catch (error) {
            console.error('❌ Ошибка обновления интерфейса:', error);
        }
    }

    // Вспомогательный метод для обновления отображения звезд
    updateStarsDisplay() {
        try {
            console.log(`💫 Обновляем отображение звезд: ${this.gameData.stars}`);
            
            // Обновляем все элементы со звездами
            const starElements = [
                document.getElementById('star-count'),
                document.querySelector('.user-stars span'),
                document.querySelector('.balance-amount'),
                document.querySelector('.current-balance .balance-amount'),
                ...document.querySelectorAll('[data-stars]')
            ];
            
            starElements.forEach(element => {
                if (element) {
                    element.textContent = this.gameData.stars || 0;
                    console.log(`✅ Обновлен элемент:`, element.className || element.id);
                }
            });
            
            // Обновляем кнопки прокрутки если главный экран активен
            if (this.screens.main && typeof this.screens.main.updateSpinButtons === 'function') {
                this.screens.main.updateSpinButtons();
            }
            
        } catch (error) {
            console.error('❌ Ошибка обновления отображения звезд:', error);
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
            // Сохраняем все, КРОМЕ баланса
            const dataToSave = {
                ...this.gameData
            };
            
            // НЕ сохраняем баланс локально - он должен быть только на сервере
            delete dataToSave.stars;
            delete dataToSave.total_stars_earned;
            
            localStorage.setItem('kosmetichkaGameData', JSON.stringify(dataToSave));
            console.log('💾 Данные сохранены (без баланса)');
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
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
        const oldBalance = this.gameData.stars;
        this.gameData.stars += amount;
        
        console.log(`⭐ Начисление: ${oldBalance} + ${amount} = ${this.gameData.stars}`);
        
        // Сохраняем на сервер
        try {
            if (window.telegramIntegration?.sendToServer) {
                const response = await window.telegramIntegration.sendToServer('update_balance', {
                    stars: this.gameData.stars
                });
                
                if (response?.success) {
                    console.log('✅ Баланс сохранен на сервере');
                } else {
                    console.error('❌ Не удалось сохранить баланс на сервере');
                    // Откатываем изменения
                    this.gameData.stars = oldBalance;
                    return false;
                }
            }
        } catch (error) {
            console.error('❌ Ошибка сохранения баланса:', error);
            // Откатываем изменения
            this.gameData.stars = oldBalance;
            return false;
        }
        
        // Обновляем UI
        this.updateInterface();
        
        return true;
    }

    // Получение актуального баланса с сервера
    async syncBalanceFromServer() {
        try {
            if (!window.telegramIntegration?.sendToServer) {
                console.warn('⚠️ telegramIntegration недоступен для синхронизации баланса');
                return false;
            }
            
            const response = await window.telegramIntegration.sendToServer('get_balance', {});
            
            if (response?.success && typeof response.stars === 'number') {
                const oldBalance = this.gameData.stars;
                this.gameData.stars = response.stars;
                
                console.log(`🔄 Баланс синхронизирован с сервера: ${oldBalance} → ${response.stars} звезд`);
                
                // Обновляем UI
                this.updateInterface();
                
                return true;
            } else {
                console.error('❌ Не удалось получить баланс с сервера:', response);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации баланса с сервера:', error);
            return false;
        }
    }

    async spendStars(amount) {
        if (this.gameData.stars < amount) {
            console.log('❌ Недостаточно звезд');
            return false;
        }
        
        // Списываем локально
        const oldBalance = this.gameData.stars;
        this.gameData.stars -= amount;
        
        console.log(`💰 Списание: ${oldBalance} - ${amount} = ${this.gameData.stars}`);
        
        // ВАЖНО: Сразу сохраняем на сервер
        try {
            if (window.telegramIntegration?.sendToServer) {
                const response = await window.telegramIntegration.sendToServer('update_balance', {
                    stars: this.gameData.stars
                });
                
                if (response?.success) {
                    console.log('✅ Баланс сохранен на сервере');
                } else {
                    console.error('❌ Не удалось сохранить баланс на сервере');
                    // Откатываем изменения
                    this.gameData.stars = oldBalance;
                    return false;
                }
            }
        } catch (error) {
            console.error('❌ Ошибка сохранения баланса:', error);
            // Откатываем изменения
            this.gameData.stars = oldBalance;
            return false;
        }
        
        // Обновляем UI
        this.updateInterface();
        
        return true;
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
    updateUserData(newData) {
        console.log('📝 Обновление данных пользователя:', newData);
        
        // ВАЖНО: Обновляем только если есть валидные данные
        if (newData && typeof newData.stars === 'number') {
            this.gameData.stars = newData.stars;
            console.log(`⭐ Баланс обновлен: ${this.gameData.stars}`);
        }
        
        // Обновляем остальные данные
        if (newData.referrals !== undefined) {
            this.gameData.referrals = newData.referrals;
        }
        
        if (newData.totalSpins !== undefined) {
            this.gameData.totalSpins = newData.totalSpins;
        }
        
        if (newData.prizesWon !== undefined) {
            this.gameData.prizesWon = newData.prizesWon;
        }
        
        // Сохраняем и обновляем UI
        this.saveGameData();
        this.updateInterface();
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

    async initializeUserData() {
        console.log('🔄 Инициализация данных пользователя...');
        
        try {
            // Сначала загружаем локальные данные
            const localData = this.loadGameData();
            
            // НЕ перезаписываем баланс нулем!
            if (localData && typeof localData.stars === 'number' && localData.stars > 0) {
                this.gameData = { ...this.gameData, ...localData };
            }
            
            // Синхронизация с сервером
            if (window.telegramIntegration) {
                console.log('📡 Запрос данных с сервера...');
                await window.telegramIntegration.syncWithServer();
            }
            
            // После синхронизации обновляем UI
            this.updateInterface();
            
        } catch (error) {
            console.error('❌ Ошибка инициализации данных:', error);
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

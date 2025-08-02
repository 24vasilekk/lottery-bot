// public/js/components/navigation.js - Navigation Component (ИСПРАВЛЕННАЯ ВЕРСИЯ)

export class Navigation {
    constructor(app) {
        this.app = app;
        this.currentScreen = 'main';
    }

    render() {
        return `
            <div class="bottom-nav">
                <div class="nav-item active" data-screen="main">
                    <i class="fas fa-star"></i>
                    <span>Главная</span>
                </div>
                <div class="nav-item" data-screen="tasks">
                    <div class="nav-icon-wrapper">
                        <i class="fas fa-tasks"></i>
                        <div class="notification-badge" id="task-badge" style="display: none;">0</div>
                    </div>
                    <span>Задания</span>
                </div>
                <div class="nav-item" data-screen="profile">
                    <i class="fas fa-user"></i>
                    <span>Профиль</span>
                </div>
            </div>
        `;
    }

    init() {
        const navContainer = document.getElementById('bottom-nav');
        if (!navContainer) {
            console.error('Контейнер навигации не найден');
            return;
        }
        
        navContainer.innerHTML = this.render();
        
        this.setupEventListeners();
        this.updateBadges();
        
        console.log('✅ Навигация инициализирована');
    }

    setupEventListeners() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const screen = item.dataset.screen;
                this.navigateTo(screen);
            });
        });
    }

    navigateTo(screenName) {
        if (this.currentScreen === screenName) return;
        
        console.log(`🧭 Навигация: ${this.currentScreen} -> ${screenName}`);
        
        // Валидация экрана
        const validScreens = ['main', 'tasks', 'profile'];
        if (!validScreens.includes(screenName)) {
            console.error(`❌ Неизвестный экран: ${screenName}`);
            return;
        }
        
        // Обновляем состояние
        this.currentScreen = screenName;
        
        // Обновляем навигационные элементы
        this.updateActiveState(screenName);
        
        // Переключаем экраны через приложение
        if (this.app && this.app.showScreen) {
            this.app.showScreen(screenName);
        }
        
        // Инициализируем экран если нужно
        this.initializeScreen(screenName);
    }

    updateActiveState(activeScreen) {
        try {
            const navItems = document.querySelectorAll('.nav-item');
            
            navItems.forEach(item => {
                const screen = item.dataset.screen;
                
                if (screen === activeScreen) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
            
        } catch (error) {
            console.error('❌ Ошибка обновления активного состояния навигации:', error);
        }
    }

    initializeScreen(screenName) {
        try {
            const screenKey = this.getScreenKey(screenName);
            const screen = this.app.screens[screenKey];
            
            if (screen && typeof screen.init === 'function') {
                console.log(`🔧 Инициализация экрана: ${screenName}`);
                screen.init();
                
                // Специальная обработка для экрана заданий
                if (screenName === 'tasks' && typeof screen.updateTasks === 'function') {
                    screen.updateTasks();
                    console.log('📋 Задания обновлены');
                }
            }
            
        } catch (error) {
            console.error('❌ Ошибка инициализации экрана:', error);
        }
    }

    getScreenKey(screenName) {
        const screenMap = {
            'main': 'main',
            'tasks': 'tasks', 
            'profile': 'profile',
            'mega-roulette': 'megaRoulette'
        };
        
        return screenMap[screenName] || screenName;
    }

    updateBadges() {
        try {
            const availableTasks = this.getAvailableTasksCount();
            const taskBadge = document.getElementById('task-badge');
            
            if (taskBadge) {
                if (availableTasks > 0) {
                    taskBadge.textContent = availableTasks;
                    taskBadge.style.display = 'flex';
                } else {
                    taskBadge.style.display = 'none';
                }
            }
            
        } catch (error) {
            console.error('❌ Ошибка обновления бэджей:', error);
        }
    }

    getAvailableTasksCount() {
        try {
            if (!this.app.gameData) return 0;
            
            // Используем метод из TasksScreen если доступен
            if (this.app.screens.tasks && typeof this.app.screens.tasks.getAvailableTasksCount === 'function') {
                return this.app.screens.tasks.getAvailableTasksCount();
            }
            
            // Fallback расчет
            let count = 0;
            const completedTasks = this.app.gameData.completedTasks || [];
            
            // Ежедневные задания
            const lastDailyReset = this.app.gameData.lastDailyReset || 0;
            const today = new Date().toDateString();
            const lastResetDate = new Date(lastDailyReset).toDateString();
            
            if (today !== lastResetDate) {
                // Есть новые ежедневные задания
                count += 3; // Примерное количество ежедневных заданий
            }
            
            // Задания с друзьями
            const referrals = this.app.gameData.referrals || 0;
            if (referrals >= 1 && !completedTasks.includes('invite_1_friend')) count++;
            if (referrals >= 5 && !completedTasks.includes('invite_5_friends')) count++;
            if (referrals >= 10 && !completedTasks.includes('invite_10_friends')) count++;
            
            // Активные задания
            const activeTasks = ['subscribe_channel', 'rate_app', 'share_app'];
            activeTasks.forEach(taskId => {
                if (!completedTasks.includes(taskId)) count++;
            });
            
            return count;
            
        } catch (error) {
            console.error('❌ Ошибка подсчета доступных заданий:', error);
            return 0;
        }
    }

    // Метод для обновления текущего экрана (если нужно синхронизировать с внешними изменениями)
    setCurrentScreen(screenName) {
        this.currentScreen = screenName;
        this.updateActiveState(screenName);
    }

    // Метод для получения текущего экрана
    getCurrentScreen() {
        return this.currentScreen;
    }

    // Метод для проверки доступности экрана
    isScreenAvailable(screenName) {
        const validScreens = ['main', 'tasks', 'profile'];
        return validScreens.includes(screenName);
    }

    // Метод для принудительного обновления навигации
    refresh() {
        this.updateBadges();
        this.updateActiveState(this.currentScreen);
    }

    // Метод для анимации переключения (опционально)
    animateTransition(fromScreen, toScreen) {
        try {
            // Можно добавить анимации переходов между экранами
            const fromElement = document.getElementById(`${fromScreen}-screen`);
            const toElement = document.getElementById(`${toScreen}-screen`);
            
            if (fromElement && toElement) {
                // Простая анимация затухания/появления
                fromElement.style.opacity = '0';
                
                setTimeout(() => {
                    fromElement.classList.remove('active');
                    toElement.classList.add('active');
                    toElement.style.opacity = '0';
                    
                    setTimeout(() => {
                        toElement.style.opacity = '1';
                    }, 50);
                }, 150);
            }
            
        } catch (error) {
            console.error('❌ Ошибка анимации перехода:', error);
            // Fallback без анимации
            document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
            const targetScreen = document.getElementById(`${toScreen}-screen`);
            if (targetScreen) targetScreen.classList.add('active');
        }
    }
}
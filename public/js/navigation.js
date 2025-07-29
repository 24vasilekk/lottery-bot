// navigation.js - УПРОЩЕННАЯ ВЕРСИЯ БЕЗ ДУБЛИРОВАНИЯ ЛИДЕРБОРДА

class Navigation {
    constructor() {
        this.currentScreen = 'main-screen';
        this.navItems = document.querySelectorAll('.nav-item');
        this.screens = document.querySelectorAll('.screen');
        this.init();
    }

    init() {
        console.log('🧭 Navigation инициализирована');
        
        // Добавляем обработчики для навигационных кнопок
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetScreen = item.getAttribute('data-screen');
                this.navigateToScreen(targetScreen);
            });
        });

        // Инициализируем активный экран
        this.updateActiveScreen();
    }

    navigateToScreen(screenId) {
        if (screenId === this.currentScreen) return;

        console.log(`📱 Переход на экран: ${screenId}`);

        // Обновляем текущий экран
        this.currentScreen = screenId;

        // Обновляем отображение
        this.updateActiveScreen();

        // Обновляем навигацию
        this.updateActiveNavItem(screenId);

        // Загружаем контент экрана если необходимо
        this.loadScreenContent(screenId);

        // Добавляем анимацию
        this.addScreenTransition();
    }

    updateActiveScreen() {
        this.screens.forEach(screen => {
            if (screen.id === this.currentScreen) {
                screen.classList.add('active');
                screen.style.display = 'block';
            } else {
                screen.classList.remove('active');
                screen.style.display = 'none';
            }
        });
    }

    updateActiveNavItem(screenId) {
        this.navItems.forEach(item => {
            if (item.getAttribute('data-screen') === screenId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    loadScreenContent(screenId) {
        switch (screenId) {
            case 'tasks-screen':
                this.loadTasksScreen();
                break;
            case 'profile-screen':
                // ПРОФИЛЬ ОБРАБАТЫВАЕТСЯ ЧЕРЕЗ ProfileScreen - ничего не делаем здесь
                console.log('🔄 Профиль будет загружен через ProfileScreen');
                break;
            case 'mega-roulette-screen':
                this.loadMegaRouletteScreen();
                break;
            default:
                // Главный экран загружается по умолчанию
                break;
        }
    }

    loadTasksScreen() {
        const container = document.getElementById('tasks-container');
        if (!container) return;

        if (container.children.length === 0) {
            container.innerHTML = `
                <div class="tasks-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Загрузка заданий...</p>
                </div>
            `;

            // Загружаем задания (это будет реализовано в tasks.js)
            if (window.tasksManager) {
                window.tasksManager.loadTasks();
            } else {
                // Временные задания для демо
                setTimeout(() => {
                    container.innerHTML = `
                        <div class="task-category">
                            <h3>Ежедневные задания</h3>
                            <div class="task-item">
                                <div class="task-info">
                                    <div class="task-icon">📅</div>
                                    <div class="task-details">
                                        <div class="task-name">Ежедневный вход</div>
                                        <div class="task-description">Заходи в приложение каждый день</div>
                                    </div>
                                </div>
                                <div class="task-reward">
                                    <span>+10 ⭐</span>
                                    <button class="task-button completed">Выполнено</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="task-category">
                            <h3>Подписки</h3>
                            <div class="task-item">
                                <div class="task-info">
                                    <div class="task-icon">📺</div>
                                    <div class="task-details">
                                        <div class="task-name">Подпишись на канал</div>
                                        <div class="task-description">Подпишись на наш Telegram канал</div>
                                    </div>
                                </div>
                                <div class="task-reward">
                                    <span>+50 ⭐</span>
                                    <button class="task-button" onclick="openChannel('kosmetichka_channel')">Подписаться</button>
                                </div>
                            </div>
                        </div>
                    `;
                }, 1000);
            }
        }
    }

    loadMegaRouletteScreen() {
        const container = document.querySelector('.mega-roulette-container');
        if (!container) return;

        if (container.children.length === 0) {
            container.innerHTML = `
                <div class="mega-roulette-content">
                    <div class="mega-wheel-container">
                        <div class="mega-wheel">🎰</div>
                        <p>Мега рулетка скоро будет доступна!</p>
                    </div>
                    <div class="mega-requirements">
                        <h4>Требования:</h4>
                        <ul>
                            <li>Минимум 100 прокруток</li>
                            <li>5 выигранных призов</li>
                            <li>Подписка на все каналы</li>
                        </ul>
                    </div>
                </div>
            `;
        }
    }

    addScreenTransition() {
        const currentScreenElement = document.getElementById(this.currentScreen);
        if (currentScreenElement) {
            currentScreenElement.style.animation = 'fadeIn 0.3s ease';
            setTimeout(() => {
                currentScreenElement.style.animation = '';
            }, 300);
        }
    }

    showScreen(screenId) {
        this.screens.forEach(screen => {
            if (screen.id === screenId) {
                screen.classList.add('active');
                screen.style.display = 'block';
            } else {
                screen.classList.remove('active');
                screen.style.display = 'none';
            }
        });
    }

    updateActiveNav(screenId) {
        this.navItems.forEach(item => {
            if (item.getAttribute('data-screen') === screenId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // УТИЛИТЫ ДЛЯ РЕФЕРАЛОВ - оставляем для совместимости
    copyReferralLink() {
        const linkInput = document.getElementById('referral-link');
        if (linkInput) {
            linkInput.select();
            linkInput.setSelectionRange(0, 99999); // Для мобильных устройств
            
            try {
                // Используем современный API если доступен
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(linkInput.value).then(() => {
                        this.showNotification('Ссылка скопирована! 📋', 'success');
                    });
                } else {
                    // Fallback для старых браузеров
                    document.execCommand('copy');
                    this.showNotification('Ссылка скопирована! 📋', 'success');
                }
            } catch (err) {
                console.error('Ошибка копирования:', err);
                this.showNotification('Ошибка копирования. Скопируйте вручную', 'error');
            }
        }
    }

    shareReferralLink() {
        const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
        const referralLink = `https://t.me/kosmetichka_lottery_bot?start=ref_${userId}`;
        const message = `🎰 Присоединяйся к Kosmetichka Lottery!\n\n💎 Играй в рулетку красоты\n🎁 Выигрывай крутые призы\n👥 Приглашай друзей и получай бонусы\n\n${referralLink}`;
        
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`);
        }
    }

    // Метод для показа уведомлений
    showNotification(message, type = 'success') {
        // Удаляем предыдущее уведомление, если есть
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Создаем новое уведомление
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Добавляем в DOM
        document.body.appendChild(notification);
        
        // Убираем через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutNotification 0.3s ease-in';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 3000);
    }

    getUserDisplayName() {
        // Пробуем получить данные из разных источников
        const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user || 
                            window.telegramIntegration?.user;
        
        if (telegramUser?.username) {
            return `@${telegramUser.username}`;
        } else if (telegramUser?.first_name) {
            return telegramUser.first_name;
        }
        return 'Пользователь';
    }

    getUserTelegramId() {
        // Пробуем получить ID из разных источников
        const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user || 
                            window.telegramIntegration?.user;
        
        return telegramUser?.id || 'Неизвестно';
    }

    getUserData() {
        // Получаем данные пользователя из localStorage или возвращаем дефолтные
        try {
            const stored = localStorage.getItem('userData');
            return stored ? JSON.parse(stored) : { stats: { stars: 100, totalSpins: 0, prizesWon: 0, referrals: 0 } };
        } catch {
            return { stats: { stars: 100, totalSpins: 0, prizesWon: 0, referrals: 0 } };
        }
    }
}

// Глобальные функции для задач
window.openChannel = function(channelId) {
    const channels = {
        'kosmetichka_channel': 'https://t.me/kosmetichka_channel',
        'kosmetichka_instagram': 'https://instagram.com/kosmetichka',
        'dolcedeals': 'https://t.me/dolcedeals'
    };

    const url = channels[channelId];
    if (url) {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }

        // Уведомляем о подписке
        if (window.subscriptionChecker) {
            setTimeout(() => {
                window.subscriptionChecker.notifySubscription(channelId);
            }, 2000);
        }
    }
};

// Добавляем стили для навигации
const navigationStyles = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .task-category {
        margin-bottom: 20px;
    }

    .task-category h3 {
        color: #EF55A5;
        margin-bottom: 15px;
        font-size: 18px;
    }

    .task-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 15px;
        padding: 15px;
        margin-bottom: 10px;
    }

    .task-info {
        display: flex;
        align-items: center;
        flex: 1;
    }

    .task-icon {
        font-size: 24px;
        margin-right: 15px;
    }

    .task-name {
        font-weight: bold;
        margin-bottom: 5px;
    }

    .task-description {
        font-size: 12px;
        color: #ccc;
    }

    .task-reward {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
    }

    .task-button {
        background: linear-gradient(45deg, #EF55A5, #FF6B9D);
        border: none;
        color: white;
        padding: 8px 15px;
        border-radius: 15px;
        font-size: 12px;
        cursor: pointer;
        transition: transform 0.2s;
    }

    .task-button:hover {
        transform: translateY(-1px);
    }

    .task-button.completed {
        background: #666;
        cursor: default;
    }

    .loading, .empty-state, .error-state {
        text-align: center;
        padding: 40px 20px;
        color: #ccc;
    }

    .loading i {
        font-size: 24px;
        margin-bottom: 10px;
    }

    .notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #4CAF50, #CCD537);
        color: white;
        padding: 15px 25px;
        border-radius: 15px;
        font-weight: 600;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideInNotification 0.3s ease-out;
        backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .notification.success {
        background: linear-gradient(135deg, #4CAF50, #CCD537);
    }

    .notification.error {
        background: linear-gradient(135deg, #f44336, #ff6b6b);
    }

    @keyframes slideInNotification {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }

    @keyframes slideOutNotification {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;

// Добавляем стили
if (!document.getElementById('navigation-styles')) {
    const style = document.createElement('style');
    style.id = 'navigation-styles';
    style.textContent = navigationStyles;
    document.head.appendChild(style);
}

// Создаем экземпляр навигации
const navigation = new Navigation();
window.navigation = navigation;

export default navigation;

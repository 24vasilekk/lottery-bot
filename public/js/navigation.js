// navigation.js - Навигация между экранами

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
                this.loadProfileScreen();
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

    loadProfileScreen() {
        const statsContainer = document.getElementById('profile-stats');
        const leaderboardContainer = document.getElementById('leaderboard');
        
        if (!statsContainer || !leaderboardContainer) return;

        // Загружаем статистику профиля
        if (statsContainer.children.length === 0) {
            const userData = this.getUserData();
            statsContainer.innerHTML = `
                <div class="profile-header">
                    <div class="profile-avatar">👤</div>
                    <div class="profile-info">
                        <h3 id="profile-username">Пользователь</h3>
                        <p class="profile-level">Уровень 1</p>
                    </div>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">${userData.stats?.stars || 100}</div>
                        <div class="stat-label">Звезд</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${userData.stats?.totalSpins || 0}</div>
                        <div class="stat-label">Прокруток</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${userData.stats?.prizesWon || 0}</div>
                        <div class="stat-label">Призов</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${userData.stats?.referrals || 0}</div>
                        <div class="stat-label">Рефералов</div>
                    </div>
                </div>
            `;

            // Обновляем имя пользователя
            if (window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name) {
                document.getElementById('profile-username').textContent = window.Telegram.WebApp.initDataUnsafe.user.first_name;
            }
        }

        // Загружаем лидерборд
        this.loadLeaderboard();
    }

    async loadLeaderboard(showOnlyReferrals = false) {
        const container = document.getElementById('leaderboard');
        if (!container) return;

        const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

        container.innerHTML = `
            <div class="leaderboard-controls">
                <button class="tab-btn ${!showOnlyReferrals ? 'active' : ''}" onclick="navigation.loadLeaderboard(false)">
                    <i class="fas fa-trophy"></i> Общий
                </button>
                <button class="tab-btn ${showOnlyReferrals ? 'active' : ''}" onclick="navigation.loadLeaderboard(true)">
                    <i class="fas fa-users"></i> Мои рефералы
                </button>
            </div>
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Загрузка лидерборда...</p>
            </div>
        `;

        try {
            const endpoint = showOnlyReferrals && userId ? 
                `/api/referrals-leaderboard/${userId}?limit=10` : 
                '/api/leaderboard?limit=10';
                
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Ошибка загрузки лидерборда');

            const data = await response.json();
            const leaderboard = data.leaderboard || [];

            if (leaderboard.length === 0) {
                const emptyMessage = showOnlyReferrals ? 
                    'У вас пока нет приглашенных друзей' : 
                    'Пока нет данных лидерборда';
                    
                container.innerHTML = `
                    <div class="leaderboard-controls">
                        <button class="tab-btn ${!showOnlyReferrals ? 'active' : ''}" onclick="navigation.loadLeaderboard(false)">
                            <i class="fas fa-trophy"></i> Общий
                        </button>
                        <button class="tab-btn ${showOnlyReferrals ? 'active' : ''}" onclick="navigation.loadLeaderboard(true)">
                            <i class="fas fa-users"></i> Мои рефералы
                        </button>
                    </div>
                    <div class="empty-state">
                        <p>${emptyMessage}</p>
                        ${showOnlyReferrals ? '<p>Пригласите друзей и они появятся здесь!</p>' : '<p>Будь первым!</p>'}
                    </div>
                `;
                return;
            }

            let leaderboardHTML = `
                <div class="leaderboard-controls">
                    <button class="tab-btn ${!showOnlyReferrals ? 'active' : ''}" onclick="navigation.loadLeaderboard(false)">
                        <i class="fas fa-trophy"></i> Общий
                    </button>
                    <button class="tab-btn ${showOnlyReferrals ? 'active' : ''}" onclick="navigation.loadLeaderboard(true)">
                        <i class="fas fa-users"></i> Мои рефералы
                    </button>
                </div>
                <div class="leaderboard-list">
            `;
            
            leaderboard.forEach((player, index) => {
                const position = index + 1;
                const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
                
                let statsContent = '';
                if (showOnlyReferrals) {
                    // Для лидерборда рефералов показываем количество их рефералов
                    statsContent = `${player.referrals_count || 0} 👥`;
                } else {
                    // Для общего лидерборда показываем звезды и призы
                    statsContent = `${player.total_stars || 0} ⭐`;
                }
                
                leaderboardHTML += `
                    <div class="leaderboard-item ${position <= 3 ? 'top-player' : ''}">
                        <div class="player-rank">${medal}</div>
                        <div class="player-info">
                            <div class="player-name">${player.first_name || 'Игрок'}</div>
                            <div class="player-stats">${statsContent}</div>
                        </div>
                        ${!showOnlyReferrals ? `<div class="player-prizes">${player.total_prizes || 0} 🎁</div>` : ''}
                    </div>
                `;
            });
            
            leaderboardHTML += '</div>';
            container.innerHTML = leaderboardHTML;
        } catch (error) {
            console.error('Ошибка загрузки лидерборда:', error);
            container.innerHTML = `
                <div class="error-state">
                    <p>Ошибка загрузки лидерборда</p>
                    <button onclick="navigation.loadLeaderboard()">Попробовать снова</button>
                </div>
            `;
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

    .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-top: 20px;
    }

    .stat-item {
        text-align: center;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 15px;
        padding: 20px 10px;
    }

    .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: #EF55A5;
    }

    .stat-label {
        font-size: 12px;
        color: #ccc;
        margin-top: 5px;
    }

    .profile-header {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
    }

    .profile-avatar {
        font-size: 48px;
        margin-right: 15px;
    }

    .profile-level {
        color: #CCD537;
        font-size: 14px;
    }

    .leaderboard-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 10px;
    }

    .leaderboard-item.top-player {
        background: rgba(239, 85, 165, 0.2);
    }

    .player-rank {
        font-size: 18px;
        font-weight: bold;
        min-width: 40px;
    }

    .player-info {
        flex: 1;
        margin-left: 15px;
    }

    .player-name {
        font-weight: bold;
    }

    .player-stats {
        font-size: 12px;
        color: #ccc;
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
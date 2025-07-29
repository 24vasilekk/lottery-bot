// public/js/screens/profile.js - ИСПРАВЛЕННАЯ ВЕРСИЯ С РАБОЧИМ ЛИДЕРБОРДОМ

export class ProfileScreen {
    constructor(app) {
        this.app = app;
        this.currentTab = 'profile-info';
        this.currentLeaderboardType = 'global';
        
        // ВАЖНО: Устанавливаем глобальную ссылку сразу при создании
        window.profileScreen = this;
    }

    render() {
        const gameData = this.app.gameData;
        
        return `
            <div id="profile-screen" class="screen">
                <div class="screen-header">
                    <h2>Профиль</h2>
                </div>
                
                <!-- Вкладки профиля -->
                <div class="profile-tabs">
                    <button class="profile-tab active" data-tab="profile-info">
                        <i class="fas fa-user"></i>
                        Профиль
                    </button>
                    <button class="profile-tab" data-tab="leaderboard">
                        <i class="fas fa-trophy"></i>
                        Лидерборд
                    </button>
                </div>
                
                <!-- Контент вкладки "Профиль" -->
                <div class="tab-content active" id="profile-info">
                    <div class="profile-header">
                        <div class="profile-avatar">
                            ${this.renderUserAvatar()}
                        </div>
                        <div class="profile-info">
                            <h3 class="profile-name">${this.getUserDisplayName()}</h3>
                            <div class="profile-telegram-id">ID: ${this.getTelegramId()}</div>
                            <div class="profile-stats">
                                <div class="stat-item">
                                    <div class="stat-value">${gameData.stars}</div>
                                    <div class="stat-label">⭐ Звезды</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${gameData.referrals || 0}</div>
                                    <div class="stat-label">👥 Рефералы</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="profile-content">
                        <!-- Статистика -->
                        <div class="section">
                            <div class="section-title">
                                <i class="fas fa-chart-bar"></i>
                                Статистика
                            </div>
                            <div class="stats-grid" id="profile-stats-grid">
                                <div class="stats-card">
                                    <div class="stats-card-icon">⭐</div>
                                    <div class="stats-card-value">${gameData.totalStarsEarned || gameData.stars}</div>
                                    <div class="stats-card-label">Звезд</div>
                                </div>
                                <div class="stats-card">
                                    <div class="stats-card-icon">🎰</div>
                                    <div class="stats-card-value">${gameData.totalSpins || 0}</div>
                                    <div class="stats-card-label">Прокруток</div>
                                </div>
                                <div class="stats-card">
                                    <div class="stats-card-icon">🎁</div>
                                    <div class="stats-card-value">${gameData.prizesWon || 0}</div>
                                    <div class="stats-card-label">Призов</div>
                                </div>
                                <div class="stats-card">
                                    <div class="stats-card-icon">👥</div>
                                    <div class="stats-card-value">${gameData.referrals || 0}</div>
                                    <div class="stats-card-label">Рефералов</div>
                                </div>
                            </div>
                        </div>

                        <!-- История призов -->
                        <div class="section">
                            <div class="section-title">
                                <i class="fas fa-gift"></i>
                                История призов
                            </div>
                            <div class="prize-history" id="prize-history">
                                ${this.renderPrizesHistory()}
                            </div>
                        </div>

                        <!-- Рефералы -->
                        <div class="section">
                            <div class="section-title">
                                <i class="fas fa-users"></i>
                                Рефералы
                            </div>
                            <div class="referrals-section" id="referrals-section">
                                ${this.renderReferralsSection()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Контент вкладки "Лидерборд" -->
                <div class="tab-content" id="leaderboard">
                    <div class="leaderboard-container">
                        <div class="leaderboard-header">
                            <h3>
                                <i class="fas fa-trophy"></i>
                                Топ игроков по рефералам
                            </h3>
                            <p>Лучшие игроки нашего сообщества</p>
                        </div>
                        
                        <div class="leaderboard-controls">
                            <button class="leaderboard-tab active" data-type="global">
                                <i class="fas fa-globe"></i> Глобальный топ
                            </button>
                            <button class="leaderboard-tab" data-type="referrals">
                                <i class="fas fa-users"></i> Мои рефералы
                            </button>
                        </div>
                        
                        <div class="leaderboard-content" id="leaderboard-content">
                            <div class="loading">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>Загрузка лидерборда...</p>
                            </div>
                        </div>
                        
                        <!-- Позиция текущего пользователя -->
                        <div class="current-user-rank" id="current-user-rank">
                            <!-- Ранг пользователя будет загружен -->
                        </div>
                    </div>
                </div>

                <!-- ДОПОЛНИТЕЛЬНЫЙ ОТСТУП ДЛЯ ПОЛНОЙ ПРОКРУТКИ -->
                <div style="height: 80px;"></div>
            </div>
        `;
    }

    init() {
        console.log('👤 Инициализация экрана профиля...');
        this.setupEventListeners();
        this.loadProfileData();
        console.log('✅ Экран профиля инициализирован');
    }

    setupEventListeners() {
        // Переключение вкладок
        this.initProfileTabs();
        
        // Переключение в лидерборде
        this.initLeaderboardTabs();
        
        // Кнопка "Пригласить друга"
        const shareBtn = document.getElementById('share-referral');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareReferralLink();
            });
        }
    }

    // Инициализация переключения вкладок
    initProfileTabs() {
        const tabs = document.querySelectorAll('.profile-tab');
        const contents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Убираем активный класс со всех вкладок и контента
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                
                // Добавляем активный класс к выбранной вкладке
                tab.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
                
                this.currentTab = targetTab;
                
                // Если переключились на лидерборд, загружаем его
                if (targetTab === 'leaderboard') {
                    console.log('🏆 Переключились на лидерборд, загружаем данные...');
                    this.loadLeaderboard();
                }
            });
        });
    }

    // НОВЫЙ МЕТОД: Инициализация переключения вкладок лидерборда
    initLeaderboardTabs() {
        // Используем делегирование событий, так как кнопки могут быть пересозданы
        document.addEventListener('click', (e) => {
            if (e.target.closest('.leaderboard-tab')) {
                const button = e.target.closest('.leaderboard-tab');
                const type = button.dataset.type;
                
                console.log(`🏆 Переключение лидерборда на тип: ${type}`);
                
                // Обновляем активную кнопку
                document.querySelectorAll('.leaderboard-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                button.classList.add('active');
                
                // Загружаем данные
                this.loadLeaderboardData(type);
            }
        });
    }

    // Загрузка данных профиля
    async loadProfileData() {
        const userId = this.getTelegramId();
        
        if (!userId || userId === 'Неизвестно') {
            console.error('User ID not found');
            return;
        }
        
        try {
            const response = await fetch(`/api/user/${userId}`);
            if (!response.ok) throw new Error('Failed to load user data');
            
            const userData = await response.json();
            
            // Обновляем данные в приложении
            this.app.gameData = {
                ...this.app.gameData,
                ...userData,
                stars: userData.stars || this.app.gameData.stars,
                totalStarsEarned: userData.total_stars_earned || userData.stats?.totalStarsEarned,
                totalSpins: userData.stats?.totalSpins || 0,
                prizesWon: userData.stats?.prizesWon || 0,
                referrals: userData.stats?.referrals || 0
            };
            
            // Обновляем отображение статистики
            this.updateProfileStats(userData);
            
        } catch (error) {
            console.error('Error loading profile data:', error);
        }
    }

    // Обновление статистики в профиле
    updateProfileStats(userData) {
        const statsGrid = document.getElementById('profile-stats-grid');
        if (!statsGrid) return;
        
        statsGrid.innerHTML = `
            <div class="stats-card">
                <div class="stats-card-icon">⭐</div>
                <div class="stats-card-value">${userData.stats?.stars || userData.stars || 0}</div>
                <div class="stats-card-label">Звезд</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-icon">🎰</div>
                <div class="stats-card-value">${userData.stats?.totalSpins || 0}</div>
                <div class="stats-card-label">Прокруток</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-icon">🎁</div>
                <div class="stats-card-value">${userData.stats?.prizesWon || 0}</div>
                <div class="stats-card-label">Призов</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-icon">👥</div>
                <div class="stats-card-value">${userData.stats?.referrals || 0}</div>
                <div class="stats-card-label">Рефералов</div>
            </div>
        `;
    }

    // ИСПРАВЛЕННЫЙ МЕТОД: Загрузка лидерборда
    async loadLeaderboard() {
        console.log('🏆 Начинаем загрузку лидерборда...');
        
        // Загружаем глобальный лидерборд по умолчанию
        await this.loadLeaderboardData('global');
        
        // Загружаем позицию текущего пользователя
        const userId = this.getTelegramId();
        if (userId && userId !== 'Неизвестно') {
            await this.loadUserRank(userId);
        }
    }

    // ИСПРАВЛЕННЫЙ МЕТОД: Загрузка данных лидерборда
    async loadLeaderboardData(type = 'global') {
        console.log(`🏆 Загрузка лидерборда типа: ${type}`);
        
        const contentContainer = document.getElementById('leaderboard-content');
        const userId = this.getTelegramId();
        
        if (!contentContainer) {
            console.error('Контейнер лидерборда не найден');
            return;
        }
        
        // Сохраняем текущий тип
        this.currentLeaderboardType = type;
        
        // Показываем загрузку
        contentContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Загрузка...</p>
            </div>
        `;

        try {
            let endpoint;
            let limitParam = '?limit=20';
            
            if (type === 'referrals' && userId && userId !== 'Неизвестно') {
                endpoint = `/api/referrals-leaderboard/${userId}${limitParam}`;
            } else {
                endpoint = `/api/leaderboard-referrals${limitParam}`;
            }
            
            console.log(`🔗 Запрос к: ${endpoint}`);
            
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const leaderboard = data.leaderboard || [];
            
            console.log(`📊 Получено записей лидерборда: ${leaderboard.length}`);

            if (leaderboard.length === 0) {
                const emptyMessage = type === 'referrals' ? 
                    'У вас пока нет приглашенных друзей' : 
                    'Пока нет данных лидерборда';
                    
                contentContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                        <p>${emptyMessage}</p>
                        ${type === 'referrals' ? '<p>Пригласите друзей и они появятся здесь!</p>' : '<p>Будь первым!</p>'}
                    </div>
                `;
                return;
            }

            let leaderboardHTML = '<div class="leaderboard-list">';
            
            leaderboard.forEach((player, index) => {
                const position = index + 1;
                const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
                const referralsCount = player.referrals_count || 0;
                const isCurrentUser = player.user_id?.toString() === userId?.toString();
                
                leaderboardHTML += `
                    <div class="leaderboard-item ${position <= 3 ? 'top-player' : ''} ${isCurrentUser ? 'user-item' : ''}">
                        <div class="player-rank">${medal}</div>
                        <div class="player-info">
                            <div class="player-name">
                                ${player.first_name || 'Игрок'}
                                ${isCurrentUser ? '<span class="user-badge">Вы</span>' : ''}
                            </div>
                            <div class="player-stats">${referralsCount} 👥 рефералов</div>
                        </div>
                        <div class="player-score">${referralsCount}</div>
                    </div>
                `;
            });
            
            leaderboardHTML += '</div>';
            contentContainer.innerHTML = leaderboardHTML;
            
            console.log('✅ Лидерборд успешно загружен');

        } catch (error) {
            console.error('❌ Ошибка загрузки лидерборда:', error);
            contentContainer.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px; color: #ff6b6b;"></i>
                    <p>Ошибка загрузки лидерборда</p>
                    <p style="font-size: 14px; opacity: 0.7;">${error.message}</p>
                    <button onclick="window.profileScreen.loadLeaderboardData('${type}')" class="retry-btn">
                        Попробовать снова
                    </button>
                </div>
            `;
        }
    }

    // Загрузка позиции пользователя
    async loadUserRank(userId) {
        try {
            console.log(`👤 Загрузка ранга пользователя: ${userId}`);
            
            const response = await fetch(`/api/user-referral-rank/${userId}`);
            if (!response.ok) throw new Error('Ошибка загрузки ранга');
            
            const data = await response.json();
            const rankContainer = document.getElementById('current-user-rank');
            
            if (rankContainer && data.rank) {
                rankContainer.innerHTML = `
                    <div class="user-rank-card">
                        <div class="rank-info">
                            <div class="rank-position">Ваша позиция: #${data.rank.position}</div>
                            <div class="rank-referrals">${data.rank.referrals_count || 0} рефералов</div>
                        </div>
                        <div class="rank-icon">
                            <i class="fas fa-medal"></i>
                        </div>
                    </div>
                `;
                console.log('✅ Ранг пользователя загружен');
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки ранга пользователя:', error);
            const rankContainer = document.getElementById('current-user-rank');
            if (rankContainer) {
                rankContainer.innerHTML = `
                    <div class="user-rank-card">
                        <div class="rank-info">
                            <div class="rank-position">Позиция не определена</div>
                            <div class="rank-referrals">Попробуйте позже</div>
                        </div>
                    </div>
                `;
            }
        }
    }

    renderReferralsSection() {
        const gameData = this.app.gameData;
        const referralsCount = gameData.referrals || 0;
        const starsFromReferrals = referralsCount * 100;
        
        return `
            <div class="referrals-stats">
                <!-- Основная статистика рефералов -->
                <div class="referrals-overview">
                    <div class="referral-stat-card">
                        <div class="referral-stat-value">${referralsCount}</div>
                        <div class="referral-stat-label">👥 Приглашено друзей</div>
                    </div>
                    <div class="referral-stat-card">
                        <div class="referral-stat-value">${starsFromReferrals}</div>
                        <div class="referral-stat-label">⭐ Получено звезд</div>
                    </div>
                </div>
                
                <!-- Реферальная ссылка -->
                <div class="referral-link-container">
                    <label>Ваша реферальная ссылка:</label>
                    <div class="referral-link">
                        <input type="text" id="referral-link" value="https://t.me/kosmetichka_lottery_bot?start=ref_${this.getTelegramId()}" readonly>
                        <button onclick="window.profileScreen.copyReferralLink()" class="copy-btn">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Действия с рефералами -->
                <div class="referral-actions">
                    <button id="share-referral" class="share-btn">
                        <i class="fas fa-share"></i>
                        Поделиться ссылкой
                    </button>
                </div>
                
                <!-- Информация о бонусах -->
                <div class="referral-info">
                    <div class="referral-description">
                        <h4>💡 Как это работает:</h4>
                        <ul>
                            <li>Пригласите друга по вашей ссылке</li>
                            <li>Друг должен выполнить 2 подписки на каналы</li>
                            <li>Вы получите 20 звезд за активного реферала</li>
                            <li>Дополнительно 100 звезд за каждого приглашенного</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    copyReferralLink() {
        const linkInput = document.getElementById('referral-link');
        if (linkInput) {
            linkInput.select();
            linkInput.setSelectionRange(0, 99999);
            
            try {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(linkInput.value).then(() => {
                        this.showNotification('Ссылка скопирована! 📋', 'success');
                    });
                } else {
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
        const userId = this.getTelegramId();
        const referralLink = `https://t.me/kosmetichka_lottery_bot?start=ref_${userId}`;
        const message = `🎰 Присоединяйся к Kosmetichka Lottery!\n\n💎 Играй в рулетку красоты\n🎁 Выигрывай крутые призы\n👥 Приглашай друзей и получай бонусы\n\n${referralLink}`;
        
        if (this.app.tg?.isVersionAtLeast?.('6.1')) {
            this.app.tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`);
        } else {
            this.copyReferralLink();
        }
    }

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

    renderPrizesHistory() {
        const gameData = this.app.gameData;
        const allPrizes = gameData.prizes || [];

        // Фильтруем только сертификаты (исключаем звезды и пустые призы)
        const certificatePrizes = allPrizes.filter(prize => {
            const prizeType = prize.type || '';
            return prizeType.startsWith('golden-apple-') || prizeType === 'dolce-deals';
        });

        if (certificatePrizes.length === 0) {
            return `
                <div class="empty-history">
                    <i class="fas fa-gift"></i>
                    <p>У вас пока нет призов</p>
                    <span>Крутите рулетку, чтобы выиграть призы!</span>
                </div>
            `;
        }

        // Сортируем призы по дате получения (новые сначала) и берем максимум 10
        const sortedPrizes = [...certificatePrizes]
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 10);

        return sortedPrizes.map(prize => `
            <div class="prize-history-item">
                <div class="prize-icon">${this.getPrizeIcon(prize)}</div>
                <div class="prize-info">
                    <div class="prize-name">${prize.name}</div>
                    <div class="prize-date">${this.formatDate(prize.timestamp || Date.now())}</div>
                </div>
                ${prize.value ? `<div class="prize-value">${prize.value}</div>` : ''}
            </div>
        `).join('');
    }

    getPrizeIcon(prize) {
        const prizeIcons = {
            'golden-apple-3000': '🍎',
            'golden-apple-2000': '🍎',
            'golden-apple-1500': '🍎',
            'golden-apple-1000': '🍎',
            'golden-apple-500': '🍎',
            'dolce-deals': '🚚',
            'stars': '⭐',
            'empty': '❌'
        };
        
        for (const [key, icon] of Object.entries(prizeIcons)) {
            if (prize.type?.includes(key)) {
                return icon;
            }
        }
        
        return '🎁';
    }

    getUserDisplayName() {
        const telegramUser = this.app.tg?.initDataUnsafe?.user || 
                            window.Telegram?.WebApp?.initDataUnsafe?.user;
        
        if (telegramUser?.username) {
            return `@${telegramUser.username}`;
        } else if (telegramUser?.first_name) {
            return telegramUser.first_name;
        }
        return 'Пользователь';
    }

    getTelegramId() {
        const telegramUser = this.app.tg?.initDataUnsafe?.user || 
                            window.Telegram?.WebApp?.initDataUnsafe?.user;
        
        return telegramUser?.id || 'Неизвестно';
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric'
        });
    }

    renderUserAvatar() {
        const user = this.app.tg?.initDataUnsafe?.user;
        
        if (user?.photo_url) {
            return `<img src="${user.photo_url}" alt="Аватар ${user.first_name}" 
                         style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="avatar-fallback" style="display: none; width: 100%; height: 100%; 
                         display: flex; align-items: center; justify-content: center; 
                         font-size: 36px; font-weight: bold;">
                        ${user.first_name?.charAt(0).toUpperCase() || '👤'}
                    </div>`;
        } else if (user?.first_name) {
            return user.first_name.charAt(0).toUpperCase();
        }
        
        return '👤';
    }

    destroy() {
        console.log('🧹 Очистка экрана профиля...');
        // Очистка обработчиков событий
        const tabs = document.querySelectorAll('.profile-tab');
        tabs.forEach(tab => {
            tab.replaceWith(tab.cloneNode(true));
        });
    }
}

// Глобальная ссылка для использования в onclick - будет установлена в конструкторе

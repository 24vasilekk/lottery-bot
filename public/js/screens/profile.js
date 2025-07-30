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
                            <!-- Убрали блок profile-stats с количеством звезд и рефералов -->
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
                                    <div class="stats-card-icon">👥</div>
                                    <div class="stats-card-value">${gameData.referrals || 0}</div>
                                    <div class="stats-card-label">Рефералов</div>
                                </div>
                                <!-- Убрали карточки с прокрутками и призами -->
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

                        <!-- История призов -->
                        <div class="section">
                            <div class="section-title">
                                <i class="fas fa-gift"></i>
                                История призов
                            </div>
                            <div class="prizes-section" id="prizes-section">
                                <div class="empty-state">
                                    <div class="empty-icon">🎁</div>
                                    <div class="empty-text">Пока что призов нет</div>
                                    <div class="empty-subtitle">Крутите рулетку, чтобы выиграть призы!</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Контент вкладки "Лидерборд" -->
                <div class="tab-content" id="leaderboard">
                    <div class="leaderboard-tabs">
                        <button class="leaderboard-tab active" data-type="global">
                            <i class="fas fa-globe"></i>
                            Глобальный
                        </button>
                        <button class="leaderboard-tab" data-type="referrals">
                            <i class="fas fa-users"></i>
                            Рефералы
                        </button>
                    </div>
                    
                    <div class="current-position" id="current-position">
                        <!-- Позиция пользователя будет загружена динамически -->
                    </div>
                    
                    <div class="leaderboard-list" id="leaderboard-list">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Загрузка лидерборда...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    init() {
        console.log('🎮 Инициализация ProfileScreen...');
        
        // Устанавливаем обработчики событий
        this.setupTabEventListeners();
        this.setupLeaderboardTabs();
        this.setupReferralHandlers();
        
        // Загружаем данные профиля
        this.loadProfileData();
        
        console.log('✅ ProfileScreen инициализирован');
    }

    setupTabEventListeners() {
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Переключаем активную вкладку
                document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Переключаем контент
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(targetTab).classList.add('active');
                
                // Загружаем данные для соответствующей вкладки
                if (targetTab === 'leaderboard') {
                    this.loadLeaderboard();
                }
                
                this.currentTab = targetTab;
            });
        });
    }

    setupLeaderboardTabs() {
        document.querySelectorAll('.leaderboard-tab').forEach(button => {
            button.addEventListener('click', () => {
                const type = button.dataset.type;
                
                console.log(`🏆 Переключение лидерборда на тип: ${type}`);
                
                // Обновляем активную кнопку
                document.querySelectorAll('.leaderboard-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                button.classList.add('active');
                
                // Загружаем данные
                this.loadLeaderboardData(type);
            });
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
        console.log('📊 Обновление статистики профиля:', userData);
        
        // Обновляем детальную статистику если есть соответствующий элемент
        const statsGrid = document.getElementById('profile-stats-grid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="stats-card">
                    <div class="stats-card-icon">⭐</div>
                    <div class="stats-card-value">${userData.stars || this.app.gameData.stars || 0}</div>
                    <div class="stats-card-label">Звезд</div>
                </div>
                <div class="stats-card">
                    <div class="stats-card-icon">👥</div>
                    <div class="stats-card-value">${userData.stats?.referrals || userData.referrals || 0}</div>
                    <div class="stats-card-label">Рефералов</div>
                </div>
            `;
        }
        
        // Обновляем UI всего приложения
        if (this.app.updateUI) {
            this.app.updateUI();
        }
        
        console.log('✅ Статистика профиля обновлена');
    }

    // ИСПРАВЛЕННЫЙ МЕТОД: Загрузка лидерборда
    async loadLeaderboard() {
        console.log('🏆 Начинаем загрузку лидерборда...');
        
        // Загружаем глобальный лидерборд по умолчанию
        await this.loadLeaderboardData('global');
        
        // Загружаем позицию текущего пользователя
        const userId = this.getTelegramId();
        if (userId && userId !== 'Неизвестно') {
            await this.loadUserPosition(userId);
        }
    }

    // ИСПРАВЛЕННЫЙ МЕТОД: Загрузка данных лидерборда
    async loadLeaderboardData(type) {
        console.log(`🏆 Загрузка лидерборда типа: ${type}`);
        this.currentLeaderboardType = type;
        
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;
        
        // Показываем состояние загрузки
        leaderboardList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Загрузка лидерборда...</p>
            </div>
        `;
        
        try {
            const endpoint = type === 'referrals' 
                ? '/api/leaderboard/referrals' 
                : '/api/leaderboard/global';
                
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`✅ Данные лидерборда (${type}):`, data);
            
            this.renderLeaderboard(data, type);
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки лидерборда (${type}):`, error);
            leaderboardList.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Ошибка загрузки лидерборда</p>
                    <button onclick="window.profileScreen.loadLeaderboardData('${type}')" class="retry-btn">
                        Повторить попытку
                    </button>
                </div>
            `;
        }
    }

    // ИСПРАВЛЕННЫЙ МЕТОД: Рендер лидерборда
    renderLeaderboard(data, type) {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;
        
        console.log('🎨 Рендер лидерборда:', { type, data });
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            leaderboardList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🏆</div>
                    <div class="empty-text">Лидерборд пуст</div>
                    <div class="empty-subtitle">Станьте первым!</div>
                </div>
            `;
            return;
        }
        
        const leaderboardHTML = data.map((player, index) => {
            const position = index + 1;
            const emoji = this.getPositionEmoji(position);
            const displayName = this.getPlayerDisplayName(player);
            const scoreValue = type === 'referrals' 
                ? (player.referrals_count || 0)
                : (player.total_stars_earned || player.stars || 0);
            const scoreLabel = type === 'referrals' ? '👥' : '⭐';
            
            return `
                <div class="leaderboard-item ${this.isCurrentUser(player) ? 'current-user' : ''}">
                    <div class="player-rank ${position <= 3 ? 'top-rank' : ''}">${emoji}</div>
                    <div class="player-info">
                        <div class="player-name">${displayName}</div>
                        <div class="player-id">ID: ${player.telegram_id}</div>
                    </div>
                    <div class="player-score">${scoreLabel} ${scoreValue}</div>
                </div>
            `;
        }).join('');
        
        leaderboardList.innerHTML = leaderboardHTML;
    }

    // Загрузка позиции текущего пользователя
    async loadUserPosition(userId) {
        try {
            const endpoint = this.currentLeaderboardType === 'referrals' 
                ? `/api/leaderboard/referrals/position/${userId}`
                : `/api/leaderboard/global/position/${userId}`;
                
            const response = await fetch(endpoint);
            
            if (response.ok) {
                const positionData = await response.json();
                this.renderUserPosition(positionData);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки позиции пользователя:', error);
        }
    }

    // Рендер позиции пользователя
    renderUserPosition(data) {
        const currentPositionEl = document.getElementById('current-position');
        if (!currentPositionEl) return;
        
        if (data && data.position) {
            const { position, score } = data;
            const scoreLabel = this.currentLeaderboardType === 'referrals' ? 'рефералов' : 'звезд';
            const emoji = this.getPositionEmoji(position);
            
            currentPositionEl.innerHTML = `
                <div class="user-position-card">
                    <div class="position-info">
                        <div class="position-rank">${emoji}</div>
                        <div class="position-text">
                            <div class="position-number">${position > 100 ? '100+' : `#${position}`}</div>
                            <div class="position-details">${scoreLabel}: ${score}</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            currentPositionEl.innerHTML = `
                <div class="user-position-card">
                    <div class="position-info">
                        <div class="position-rank">—</div>
                        <div class="position-text">
                            <div class="position-number">Не в рейтинге</div>
                            <div class="position-details">Начните играть!</div>
                        </div>
                    </div>
                </div>
            `;
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
                            <li>Получите 100 звезд сразу при регистрации</li>
                            <li>Друг должен выполнить 2 подписки на каналы</li>
                            <li>Вы получите дополнительно 20 звезд за активного реферала</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    setupReferralHandlers() {
        setTimeout(() => {
            // Обработчик кнопки "Поделиться"
            const shareBtn = document.getElementById('share-referral');
            if (shareBtn) {
                shareBtn.addEventListener('click', () => {
                    this.shareReferralLink();
                });
            }
        }, 100);
    }

    // Копирование реферальной ссылки
    copyReferralLink() {
        const linkInput = document.getElementById('referral-link');
        if (linkInput) {
            linkInput.select();
            linkInput.setSelectionRange(0, 99999); // Для мобильных устройств
            
            try {
                document.execCommand('copy');
                this.app.showNotification('✅ Ссылка скопирована!', 'success');
            } catch (err) {
                console.error('Ошибка копирования:', err);
                this.app.showNotification('❌ Ошибка копирования', 'error');
            }
        }
    }

    // Поделиться реферальной ссылкой
    shareReferralLink() {
        const userId = this.getTelegramId();
        const referralLink = `https://t.me/kosmetichka_lottery_bot?start=ref_${userId}`;
        const shareText = `🎁 Присоединяйся к Kosmetichka Lottery!\n\n💫 Крути рулетку и выигрывай призы!\n⭐ Получи бонусные звезды за регистрацию!\n\n${referralLink}`;
        
        if (this.app.tg && this.app.tg.shareMessage) {
            // Используем Telegram Web App API
            this.app.tg.shareMessage(shareText);
        } else if (navigator.share) {
            // Используем Web Share API
            navigator.share({
                title: 'Kosmetichka Lottery',
                text: shareText,
                url: referralLink
            }).catch(err => console.log('Ошибка шаринга:', err));
        } else {
            // Fallback - копируем в буфер обмена
            navigator.clipboard.writeText(shareText).then(() => {
                this.app.showNotification('✅ Текст для поделиться скопирован!', 'success');
            }).catch(() => {
                this.app.showNotification('❌ Ошибка копирования', 'error');
            });
        }
    }

    // Вспомогательные методы
    getTelegramId() {
        const telegramUser = this.app.tg?.initDataUnsafe?.user || 
                            window.Telegram?.WebApp?.initDataUnsafe?.user;
        
        return telegramUser?.id || 'Неизвестно';
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

    getPlayerDisplayName(player) {
        if (player.username) {
            return `@${player.username}`;
        } else if (player.first_name) {
            return player.first_name;
        } else {
            return `User${player.telegram_id.toString().slice(-4)}`;
        }
    }

    getPositionEmoji(position) {
        switch (position) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `#${position}`;
        }
    }

    isCurrentUser(player) {
        const currentUserId = this.getTelegramId();
        return currentUserId && currentUserId.toString() === player.telegram_id.toString();
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

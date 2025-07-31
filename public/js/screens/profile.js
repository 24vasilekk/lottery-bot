// public/js/screens/profile.js - ИСПРАВЛЕННАЯ ВЕРСИЯ С УПРОЩЕННЫМ ЛИДЕРБОРДОМ

export class ProfileScreen {
    constructor(app) {
        this.app = app;
        this.currentTab = 'profile-info';
        
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
                                    <div class="stats-card-value">${gameData.stars || 0}</div>
                                    <div class="stats-card-label">Текущий баланс</div>
                                </div>
                                <div class="stats-card">
                                    <div class="stats-card-icon">👥</div>
                                    <div class="stats-card-value">${gameData.referrals || 0}</div>
                                    <div class="stats-card-label">Рефералов</div>
                                </div>
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

                        <!-- Наши ресурсы -->
                        <div class="section">
                            <div class="section-title">
                                <i class="fas fa-link"></i>
                                Наши ресурсы
                            </div>
                            <div class="resources-section">
                                <div class="resource-item" onclick="window.profileScreen.openChannel()">
                                    <div class="resource-icon">📢</div>
                                    <div class="resource-info">
                                        <div class="resource-name">Наш канал проекта</div>
                                        <div class="resource-description">Новости, розыгрыши и обновления</div>
                                    </div>
                                    <div class="resource-arrow">
                                        <i class="fas fa-external-link-alt"></i>
                                    </div>
                                </div>
                                <div class="resource-item" onclick="window.profileScreen.openSupport()">
                                    <div class="resource-icon">🎧</div>
                                    <div class="resource-info">
                                        <div class="resource-name">Поддержка</div>
                                        <div class="resource-description">Помощь с получением призов</div>
                                    </div>
                                    <div class="resource-arrow">
                                        <i class="fas fa-external-link-alt"></i>
                                    </div>
                                </div>
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
                    <div class="leaderboard-header">
                        <div class="leaderboard-avatar">
                            🏆
                        </div>
                        <div class="leaderboard-info">
                            <h3>Топ по рефералам</h3>
                            <p>Глобальный рейтинг по количеству приглашенных друзей</p>
                        </div>
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
        
        // Загружаем данные профиля
        this.loadProfileData();
        
        // Обновляем реферальную ссылку после небольшой задержки
        setTimeout(() => {
            this.updateReferralLink();
        }, 100);
        
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
                    <div class="stats-card-label">Текущий баланс</div>
                </div>
                <div class="stats-card">
                    <div class="stats-card-icon">👥</div>
                    <div class="stats-card-value">${userData.stats?.referrals || userData.referrals || 0}</div>
                    <div class="stats-card-label">Рефералов</div>
                </div>
            `;
        }
        
        // Обновляем реферальную ссылку
        this.updateReferralLink();
        
        // Обновляем UI всего приложения
        if (this.app.updateUI) {
            this.app.updateUI();
        }
        
        console.log('✅ Статистика профиля обновлена');
    }

    // Метод для обновления реферальной ссылки
    updateReferralLink() {
        const linkInput = document.getElementById('referral-link');
        if (linkInput) {
            const userId = this.getTelegramId();
            const correctLink = `https://t.me/kosmetichkalottery_bot?start=ref_${userId}`;
            linkInput.value = correctLink;
            console.log('🔗 Реферальная ссылка обновлена:', correctLink);
        }
    }

    // УПРОЩЕННЫЙ МЕТОД: Загрузка лидерборда (только по рефералам)
    async loadLeaderboard() {
        console.log('🏆 Начинаем загрузку лидерборда по рефералам...');
        
        // Загружаем топ по рефералам
        await this.loadLeaderboardData();
        
        // Загружаем позицию текущего пользователя
        const userId = this.getTelegramId();
        if (userId && userId !== 'Неизвестно') {
            await this.loadUserPosition(userId);
        }
    }

    // УПРОЩЕННЫЙ МЕТОД: Загрузка данных лидерборда (только рефералы)
    async loadLeaderboardData() {
        console.log('🏆 Загрузка топа по рефералам...');
        
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
            const response = await fetch('/api/leaderboard/referrals');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('✅ Данные лидерборда по рефералам:', data);
            
            // Данные приходят напрямую как массив
            this.renderLeaderboard(data);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки лидерборда по рефералам:', error);
            leaderboardList.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Ошибка загрузки лидерборда</p>
                    <button onclick="window.profileScreen.loadLeaderboardData()" class="retry-btn">
                        Повторить попытку
                    </button>
                </div>
            `;
        }
    }

    // УПРОЩЕННЫЙ МЕТОД: Рендер лидерборда (только рефералы)
    renderLeaderboard(data) {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;
        
        console.log('🎨 Рендер лидерборда по рефералам:', data);
        
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
            const referralsCount = player.referrals_count || 0;
            
            return `
                <div class="leaderboard-item ${this.isCurrentUser(player) ? 'current-user' : ''}">
                    <div class="player-rank ${position <= 3 ? 'top-rank' : ''}">${emoji}</div>
                    <div class="player-info">
                        <div class="player-name">${displayName}</div>
                        <div class="player-id">ID: ${player.telegram_id}</div>
                    </div>
                    <div class="player-score">👥 ${referralsCount}</div>
                </div>
            `;
        }).join('');
        
        leaderboardList.innerHTML = leaderboardHTML;
    }

    // Загрузка позиции текущего пользователя по рефералам
    async loadUserPosition(userId) {
        try {
            const response = await fetch(`/api/leaderboard/referrals/position/${userId}`);
            
            if (response.ok) {
                const positionData = await response.json();
                console.log('✅ Данные позиции пользователя:', positionData);
                
                this.renderUserPosition(positionData);
            } else {
                console.warn('⚠️ Не удалось получить позицию пользователя');
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
            const emoji = this.getPositionEmoji(position);
            
            currentPositionEl.innerHTML = `
                <div class="user-position-card">
                    <div class="position-info">
                        <div class="position-rank">${emoji}</div>
                        <div class="position-text">
                            <div class="position-number">${position > 100 ? '100+' : `#${position}`}</div>
                            <div class="position-details">рефералов: ${score}</div>
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
                            <div class="position-details">Пригласите друзей!</div>
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
                    <div class="referral-link" style="display: flex; gap: 8px; align-items: center; background: rgba(255, 255, 255, 0.1); border-radius: 15px; padding: 8px; margin-top: 10px; overflow: hidden;">
                        <input type="text" id="referral-link" value="https://t.me/kosmetichkalottery_bot?start=ref_${this.getTelegramId()}" readonly style="flex: 1; background: transparent; border: none; color: var(--text-primary); font-size: 12px; padding: 5px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <button onclick="window.profileScreen.copyReferralLink()" class="copy-btn" style="background: linear-gradient(135deg, #FF6B9D, #C44569); border: none; color: white; padding: 6px 10px; border-radius: 8px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; min-width: 32px;">
                            <i class="fas fa-copy" style="font-size: 12px;"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Информация о бонусах -->
                <div class="referral-info">
                    <div class="referral-description">
                        <h4>💡 Как это работает:</h4>
                        <ul>
                            <li>Пригласите друга по вашей ссылке</li>
                            <li>Друг должен выполнить 2 подписки на каналы</li>
                            <li>Вы получите 20 звезд за активного реферала</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    // Копирование реферальной ссылки
    copyReferralLink() {
        const linkInput = document.getElementById('referral-link');
        if (linkInput) {
            // Генерируем актуальную ссылку на момент копирования
            const userId = this.getTelegramId();
            const correctLink = `https://t.me/kosmetichkalottery_bot?start=ref_${userId}`;
            
            // Обновляем значение в поле ввода
            linkInput.value = correctLink;
            
            // Копируем ссылку
            linkInput.select();
            linkInput.setSelectionRange(0, 99999); // Для мобильных устройств
            
            try {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(correctLink).then(() => {
                        this.showBasicNotification('✅ Ссылка скопирована!');
                        console.log('Скопирована ссылка:', correctLink);
                    }).catch(() => {
                        document.execCommand('copy');
                        this.showBasicNotification('✅ Ссылка скопирована!');
                        console.log('Скопирована ссылка (fallback):', correctLink);
                    });
                } else {
                    document.execCommand('copy');
                    this.showBasicNotification('✅ Ссылка скопирована!');
                    console.log('Скопирована ссылка (execCommand):', correctLink);
                }
            } catch (err) {
                console.error('Ошибка копирования:', err);
                this.showBasicNotification('❌ Ошибка копирования');
            }
        }
    }

    // Простое уведомление без сложной анимации
    showBasicNotification(message) {
        if (this.app && this.app.showNotification) {
            this.app.showNotification(message, 'success');
        } else {
            alert(message);
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

    // Методы для открытия ресурсов
    openChannel() {
        console.log('📢 Открытие канала проекта');
        
        if (this.app.tg?.openTelegramLink) {
            // Используем ссылку на канал проекта (замените на актуальную)
            this.app.tg.openTelegramLink('https://t.me/your_project_channel');
            this.app.showStatusMessage('Переход в канал проекта...', 'info');
        } else if (window.open) {
            // Fallback для браузера
            window.open('https://t.me/your_project_channel', '_blank');
        } else {
            this.app.showStatusMessage('Канал: @your_project_channel', 'info');
        }
    }

    openSupport() {
        console.log('🎧 Открытие поддержки');
        
        if (this.app.tg?.openTelegramLink) {
            this.app.tg.openTelegramLink('https://t.me/kosmetichkasupport');
            this.app.showStatusMessage('Переход в поддержку...', 'info');
        } else if (window.open) {
            // Fallback для браузера
            window.open('https://t.me/kosmetichkasupport', '_blank');
        } else {
            this.app.showStatusMessage('Поддержка: @kosmetichkasupport', 'info');
        }
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

// public/js/screens/profile.js - ИСПРАВЛЕННАЯ ВЕРСИЯ С УПРОЩЕННЫМ ЛИДЕРБОРДОМ

export class ProfileScreen {
    constructor(app) {
        this.app = app;
        this.currentTab = 'profile-info';
        
        // ВАЖНО: Устанавливаем глобальную ссылку сразу при создании
        window.profileScreen = this;
        
        // Отладочное сообщение для проверки загрузки новой версии
        console.log('👤 ProfileScreen загружен! Версия с фиксом spins API и fallback - v2.13');
    }

    // === ПОЛНЫЙ МЕТОД render() ДЛЯ profile.js ===

    render() {
        const gameData = this.app.gameData;
        
        // Возвращаем HTML разметку
        const htmlContent = `
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
                            <div class="profile-nickname">${this.getUserNickname()}</div>
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

                    </div>
                </div>
                
                <!-- Контент вкладки "Лидерборд" -->
                <div class="tab-content" id="leaderboard">
                   <div class="leaderboard-header">
                        <div class="leaderboard-avatar">
                            🏆
                        </div>
                        <div class="leaderboard-info">
                            <h3>Рейтинг игроков</h3>
                            <p>Глобальный рейтинг по различным метрикам</p>
                        </div>
                    </div>
                    
                    <!-- Переключатели метрик -->
                    <div class="profile-tabs leaderboard-metrics">
                        <button class="profile-tab active" data-metric="referrals">
                            <i class="fas fa-users"></i>
                            Друзья
                        </button>
                        <button class="profile-tab" data-metric="spins">
                            <i class="fas fa-sync-alt"></i>
                            Спины
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
        
        // ДОБАВЛЯЕМ КНОПКУ ОТЛАДКИ ПОСЛЕ РЕНДЕРА
        // Используем setTimeout для выполнения после добавления HTML в DOM
        setTimeout(() => {
            this.setupDebugControls();
        }, 100);
        
        return htmlContent;
    }

    // Отдельный метод для настройки кнопки отладки
    setupDebugControls() {
        // Добавляем кнопку обновления рефералов (только для отладки)
        if (window.DEBUG_MODE) {
            // Удаляем старую кнопку если она есть
            const existingButton = document.querySelector('.debug-refresh-btn');
            if (existingButton) {
                existingButton.remove();
            }
            
            const refreshButton = document.createElement('button');
            refreshButton.textContent = '🔄 Обновить рефералы';
            refreshButton.className = 'debug-refresh-btn';
            refreshButton.onclick = () => this.forceRefreshReferrals();
            refreshButton.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 1000;
                padding: 8px 12px;
                background: #ff6b9d;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 12px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(255, 107, 157, 0.4);
                transition: all 0.3s ease;
            `;
            
            // Добавляем hover эффект
            refreshButton.onmouseover = () => {
                refreshButton.style.background = '#e55a8a';
                refreshButton.style.transform = 'translateY(-2px)';
                refreshButton.style.boxShadow = '0 6px 20px rgba(255, 107, 157, 0.6)';
            };
            
            refreshButton.onmouseout = () => {
                refreshButton.style.background = '#ff6b9d';
                refreshButton.style.transform = 'translateY(0)';
                refreshButton.style.boxShadow = '0 4px 12px rgba(255, 107, 157, 0.4)';
            };
            
            document.body.appendChild(refreshButton);
            console.log('🔧 Кнопка отладки рефералов добавлена');
        }
        
        // Включаем режим отладки если есть параметр в URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === 'true' || localStorage.getItem('debug_mode') === 'true') {
            window.DEBUG_MODE = true;
            console.log('🔧 Режим отладки включен');
            
            // Если DEBUG_MODE не был включен, вызываем setupDebugControls еще раз
            if (!document.querySelector('.debug-refresh-btn')) {
                this.setupDebugControls();
            }
        }
    }

    // Альтернативный способ включения режима отладки
    enableDebugMode() {
        window.DEBUG_MODE = true;
        localStorage.setItem('debug_mode', 'true');
        this.setupDebugControls();
        console.log('🔧 Режим отладки включен вручную');
    }

    // Отключение режима отладки
    disableDebugMode() {
        window.DEBUG_MODE = false;
        localStorage.removeItem('debug_mode');
        const debugButton = document.querySelector('.debug-refresh-btn');
        if (debugButton) {
            debugButton.remove();
        }
        console.log('🔧 Режим отладки отключен');
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
                const targetElement = document.getElementById(targetTab);
                if (targetElement) {
                    targetElement.classList.add('active');
                }
                
                // Загружаем данные для соответствующей вкладки
                if (targetTab === 'leaderboard') {
                    this.setupLeaderboardControls();
                    this.loadLeaderboard('referrals'); // По умолчанию загружаем рефералы
                }
                
                this.currentTab = targetTab;
            });
        });
    }

    setupLeaderboardControls() {
        document.querySelectorAll('.leaderboard-metrics .profile-tab').forEach(control => {
            control.addEventListener('click', () => {
                const metric = control.dataset.metric;
                
                // Переключаем активную кнопку
                document.querySelectorAll('.leaderboard-metrics .profile-tab').forEach(c => c.classList.remove('active'));
                control.classList.add('active');
                
                // Загружаем соответствующий лидерборд
                this.loadLeaderboard(metric);
            });
        });
    }

    // Функция для правильного склонения слова "друг"
    getFriendsWord(count) {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;
        
        // Исключения для 11, 12, 13, 14
        if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
            return 'друзей';
        }
        
        // Основные правила
        if (lastDigit === 1) {
            return 'друг';
        } else if (lastDigit >= 2 && lastDigit <= 4) {
            return 'друга';
        } else {
            return 'друзей';
        }
    }

    // Функция для форматирования количества друзей
    formatFriendsCount(count) {
        return `${count} ${this.getFriendsWord(count)}`;
    }

    // 1. ЗАМЕНИТЕ метод loadProfileData() на этот:
    async loadProfileData() {
        const userId = this.getTelegramId();
        
        if (!userId || userId === 'Неизвестно') {
            console.error('❌ Не удалось получить ID пользователя');
            return;
        }
        
        console.log(`📊 Загрузка данных профиля для пользователя: ${userId}`);
        
        try {
            // ВАЖНО: Принудительно синхронизируем рефералы перед загрузкой
            try {
                await fetch('/api/sync-referrals', { method: 'POST' });
                console.log('🔄 Синхронизация рефералов выполнена');
            } catch (syncError) {
                console.warn('⚠️ Ошибка синхронизации рефералов:', syncError);
            }
            
            // Загружаем актуальные данные пользователя
            const response = await fetch(`/api/user/${userId}`);
            if (!response.ok) throw new Error('Failed to load user data');
            
            const userData = await response.json();
            
            if (userData.error) {
                throw new Error(userData.error);
            }
            
            console.log('✅ Данные пользователя получены:', userData);
            
            // ИСПРАВЛЕНО: Обновляем gameData с актуальными данными
            this.app.gameData = {
                ...this.app.gameData,
                stars: userData.stars || 0,
                referrals: userData.referrals || userData.stats?.referrals || 0, // ВАЖНО: используем обновленное значение
                totalSpins: userData.total_spins || userData.stats?.totalSpins || 0,
                prizesWon: userData.prizes_won || userData.stats?.prizesWon || 0,
                totalStarsEarned: userData.total_stars_earned || userData.stats?.totalStarsEarned || 0,
                username: userData.username,
                firstName: userData.first_name,
                availableFriendSpins: userData.available_friend_spins || 0
            };
            
            console.log('📊 Обновленные данные в gameData:', {
                stars: this.app.gameData.stars,
                referrals: this.app.gameData.referrals,
                totalStarsEarned: this.app.gameData.totalStarsEarned
            });
            
            // Обновляем отображение статистики
            this.updateProfileStats(userData);
            this.updateReferralsSection();
            
            // Принудительно обновляем интерфейс приложения
            if (this.app.updateInterface) {
                this.app.updateInterface();
            }
            
            console.log('✅ Профиль обновлен успешно');
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных профиля:', error);
        }
    }
    

    // 8. ИСПРАВЬТЕ метод updateReferralsSection():
    updateReferralsSection() {
        const referralsContainer = document.getElementById('referrals-section');
        if (referralsContainer) {
            // Используем актуальные данные из gameData
            const referralsCount = this.app.gameData.referrals || 0;
            
            console.log(`🔄 Обновление секции рефералов, количество: ${referralsCount}`);
            
            referralsContainer.innerHTML = this.renderReferralsSection();
            
            // Обновляем реферальную ссылку
            this.updateReferralLink();
        }
    }

    // Обновление статистики в профиле
    // ЗАМЕНИТЕ метод updateProfileStats() в файле public/js/screens/profile.js

    updateProfileStats(userData) {
        console.log('📊 Обновление статистики профиля с данными:', userData);
        
        // ИСПРАВЛЕНО: Используем самые актуальные данные
        const currentStats = {
            stars: userData.stars,
            referrals: userData.referrals // ВАЖНО: используем обновленное значение из БД
        };
        
        console.log('📊 Актуальная статистика для отображения:', currentStats);
        
        // Обновляем глобальные данные приложения
        this.app.gameData.stars = currentStats.stars;
        this.app.gameData.referrals = currentStats.referrals;
        
        // Получаем правильное окончание для слова "друг"
        const friendsLabel = this.getFriendsWord(currentStats.referrals);
        
        // Обновляем элементы интерфейса - ТОЛЬКО 2 КАРТОЧКИ С ПРАВИЛЬНЫМИ ОКОНЧАНИЯМИ
        const statsGrid = document.getElementById('profile-stats-grid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="stats-card">
                    <div class="stats-card-icon">⭐</div>
                    <div class="stats-card-value">${currentStats.stars}</div>
                    <div class="stats-card-label">Текущий баланс</div>
                </div>
                <div class="stats-card">
                    <div class="stats-card-icon">👥</div>
                    <div class="stats-card-value">${currentStats.referrals}</div>
                    <div class="stats-card-label">${friendsLabel}</div>
                </div>
            `;
            
            console.log('✅ Упрощенная статистика в интерфейсе обновлена');
        }
        
        // Обновляем верхнюю панель с балансом
        const balanceElement = document.querySelector('.app-header .user-balance');
        if (balanceElement) {
            balanceElement.textContent = `⭐ ${currentStats.stars}`;
        }
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

    // Метод для автоматического обновления профиля пользователя
    async updateUserProfileIfNeeded() {
        try {
            // Получаем данные пользователя из Telegram
            const tgUser = this.app.tg?.initDataUnsafe?.user;
            if (!tgUser) {
                console.log('ℹ️ Нет данных Telegram пользователя для обновления');
                return;
            }
            
            const userId = tgUser.id;
            console.log(`🔄 Проверка необходимости обновления профиля для ${userId}`);
            
            // Проверяем текущие данные в базе
            const response = await fetch(`/api/user/${userId}`);
            if (!response.ok) {
                console.warn('⚠️ Не удалось получить данные пользователя из базы');
                return;
            }
            
            const userData = await response.json();
            
            // Адаптируем структуру данных
            const user_data = userData.user_data || userData;
            
            // Сравниваем данные
            const needsUpdate = (
                user_data.first_name !== tgUser.first_name ||
                user_data.username !== (tgUser.username || '') ||
                user_data.last_name !== (tgUser.last_name || '')
            );
            
            if (needsUpdate) {
                console.log('🔄 Обновляем профиль пользователя:', {
                    old: {
                        first_name: user_data.first_name,
                        username: user_data.username,
                        last_name: user_data.last_name
                    },
                    new: {
                        first_name: tgUser.first_name,
                        username: tgUser.username || '',
                        last_name: tgUser.last_name || ''
                    }
                });
                
                // Отправляем обновление
                const updateResponse = await fetch(`/api/user/${userId}/profile`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        first_name: tgUser.first_name || '',
                        username: tgUser.username || '',
                        last_name: tgUser.last_name || ''
                    })
                });
                
                if (updateResponse.ok) {
                    console.log('✅ Профиль пользователя успешно обновлен');
                } else {
                    console.warn('⚠️ Ошибка обновления профиля');
                }
            } else {
                console.log('ℹ️ Профиль пользователя актуален, обновление не требуется');
            }
            
        } catch (error) {
            console.error('❌ Ошибка автоматического обновления профиля:', error);
        }
    }


    // ПОЛНОФУНКЦИОНАЛЬНЫЙ МЕТОД: Загрузка лидерборда по различным метрикам
    async loadLeaderboard(metric = 'referrals') {
        console.log(`🏆 Загрузка лидерборда по метрике: ${metric}`);
        
        try {
            // 1. Обновляем профиль пользователя если нужно
            await this.updateUserProfileIfNeeded();
            
            // 2. Принудительно синхронизируем данные перед загрузкой лидерборда
            if (metric === 'referrals') {
                await fetch('/api/sync-referrals', { method: 'POST' });
            }
            
            // 3. Загружаем лидерборд для конкретной метрики
            await this.loadLeaderboardData(metric);
            
            // 4. Загружаем позицию пользователя
            const userId = this.getTelegramId();
            if (userId && userId !== 'Неизвестно') {
                await this.loadUserPosition(userId, metric);
            }
            
            console.log(`✅ Лидерборд по ${metric} загружен успешно`);
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки лидерборда по ${metric}:`, error);
        }
    }

    // 3. ДОБАВЬТЕ метод для отладки данных API:
    async debugLeaderboardData() {
        try {
            console.log('🔍 Отладка данных лидерборда...');
            
            const response = await fetch('/api/leaderboard-referrals?limit=5');
            const data = await response.json();
            
            console.log('📊 Полные данные из API:', data);
            
            if (data.leaderboard && data.leaderboard.length > 0) {
                data.leaderboard.forEach((user, index) => {
                    console.log(`👤 Игрок ${index + 1}:`, {
                        telegram_id: user.telegram_id,
                        first_name: user.first_name,
                        username: user.username,
                        referrals_count: user.referrals_count,
                        displayName: this.getPlayerDisplayName(user)
                    });
                });
            }
            
        } catch (error) {
            console.error('❌ Ошибка отладки:', error);
        }
    }

    // УНИВЕРСАЛЬНЫЙ МЕТОД: Загрузка данных лидерборда по метрике
    async loadLeaderboardData(metric = 'referrals') {
        console.log(`🏆 Загрузка данных лидерборда по метрике: ${metric}`);
        
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) {
            console.warn('⚠️ Элемент leaderboard-list не найден');
            return;
        }
        
        // Показываем загрузку
        leaderboardList.innerHTML = `
            <div class="leaderboard-loading">
                <div class="loading-spinner"></div>
                <div>Загрузка рейтинга...</div>
            </div>
        `;
        
        try {
            let endpoint;
            let valueField;
            let labelText;
            let icon;

            // Определяем endpoint и настройки для каждой метрики
            switch (metric) {
                case 'referrals':
                    endpoint = '/api/leaderboard-referrals?limit=15';
                    valueField = 'referrals_count';
                    labelText = (count) => this.formatFriendsCount(count);
                    icon = '👥';
                    break;
                case 'spins':
                    endpoint = '/api/leaderboard/spins?limit=15';
                    valueField = 'total_spins';
                    labelText = (count) => `${count} спинов`;
                    icon = '🎰';
                    break;
                default:
                    endpoint = '/api/leaderboard-referrals?limit=15';
                    valueField = 'referrals_count';
                    labelText = (count) => this.formatFriendsCount(count);
                    icon = '👥';
            }

            const response = await fetch(endpoint);
            const data = await response.json();
            
            // Если нет данных, показываем всех пользователей с нулевыми значениями
            if (!data.leaderboard || data.leaderboard.length === 0) {
                console.log(`⚠️ Пустой лидерборд ${metric}, загружаем всех пользователей`);
                // Загружаем всех пользователей независимо от значений
                const allUsersEndpoint = metric === 'spins' 
                    ? '/api/leaderboard/spins?limit=15&includeZeros=true'
                    : '/api/leaderboard-referrals?limit=15&includeZeros=true';
                
                try {
                    const allUsersResponse = await fetch(allUsersEndpoint);
                    const allUsersData = await allUsersResponse.json();
                    
                    console.log(`📊 Fallback данные для ${metric}:`, allUsersData);
                    
                    if (allUsersData.leaderboard && allUsersData.leaderboard.length > 0) {
                        data.leaderboard = allUsersData.leaderboard;
                    } else {
                        leaderboardList.innerHTML = `
                            <div class="leaderboard-empty">
                                <div class="empty-icon">${icon}</div>
                                <div class="empty-title">Нет пользователей</div>
                                <div class="empty-subtitle">Станьте первым!</div>
                            </div>
                        `;
                        return;
                    }
                } catch (error) {
                    console.error('❌ Ошибка загрузки всех пользователей:', error);
                    leaderboardList.innerHTML = `
                        <div class="leaderboard-empty">
                            <div class="empty-icon">${icon}</div>
                            <div class="empty-title">Нет пользователей</div>
                            <div class="empty-subtitle">Станьте первым!</div>
                        </div>
                    `;
                    return;
                }
            }
            
            console.log(`✅ Получен лидерборд ${metric}: ${data.leaderboard.length} записей`);
            
            // Отображаем лидерборд с правильными именами
            leaderboardList.innerHTML = data.leaderboard.map((user, index) => {
                const position = index + 1;
                const isTop3 = position <= 3;
                const value = user[valueField] || 0;
                const displayText = labelText(value);
                
                const userName = this.getPlayerDisplayName(user);
                
                return `
                    <div class="leaderboard-item ${isTop3 ? 'top-player' : ''}">
                        <div class="leaderboard-rank">
                            <span class="position-rank">${position}</span>
                        </div>
                        <div class="leaderboard-info">
                            <div class="leaderboard-name">${userName}</div>
                            <div class="leaderboard-stats">${displayText}</div>
                        </div>
                        <div class="leaderboard-score">
                            ${icon} ${value}
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки лидерборда ${metric}:`, error);
            
            // Показываем заглушку с данными даже при ошибке API
            const mockUsers = [
                { telegram_id: '123456789', first_name: 'Пользователь', username: 'user1', referrals_count: 0, total_spins: 0 },
                { telegram_id: '987654321', first_name: 'Игрок', username: 'player2', referrals_count: 0, total_spins: 0 },
                { telegram_id: '456789123', first_name: 'Участник', username: 'member3', referrals_count: 0, total_spins: 0 }
            ];
            
            const valueField = metric === 'spins' ? 'total_spins' : 'referrals_count';
            const labelText = metric === 'spins' ? (count) => `${count} спинов` : (count) => this.formatFriendsCount(count);
            const iconEmoji = metric === 'spins' ? '🎰' : '👥';
            
            leaderboardList.innerHTML = mockUsers.map((user, index) => {
                const position = index + 1;
                const value = user[valueField] || 0;
                const displayText = labelText(value);
                const userName = this.getPlayerDisplayName(user);
                
                return `
                    <div class="leaderboard-item">
                        <div class="leaderboard-rank">
                            <span class="position-rank">${position}</span>
                        </div>
                        <div class="leaderboard-info">
                            <div class="leaderboard-name">${userName}</div>
                            <div class="leaderboard-stats">${displayText}</div>
                        </div>
                        <div class="leaderboard-score">
                            ${iconEmoji} ${value}
                        </div>
                    </div>
                `;
            }).join('');
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

    // 6. ДОБАВЬТЕ новый метод для принудительного обновления рефералов:
    async forceRefreshReferrals() {
        try {
            console.log('🔄 Принудительное обновление рефералов...');
            
            // Синхронизируем рефералы
            const syncResponse = await fetch('/api/sync-referrals', { method: 'POST' });
            const syncData = await syncResponse.json();
            
            console.log('✅ Синхронизация рефералов:', syncData);
            
            // Перезагружаем данные профиля
            await this.loadProfileData();
            
            // Если мы в разделе лидерборда, обновляем его тоже
            if (this.currentTab === 'leaderboard') {
                const activeMetric = document.querySelector('.leaderboard-metrics .profile-tab.active')?.dataset.metric || 'referrals';
                await this.loadLeaderboard(activeMetric);
            }
            
            console.log('✅ Принудительное обновление завершено');
            
        } catch (error) {
            console.error('❌ Ошибка принудительного обновления:', error);
        }
    }

    // УНИВЕРСАЛЬНЫЙ МЕТОД: Загрузка позиции пользователя по метрике
    async loadUserPosition(userId, metric = 'referrals') {
        console.log(`👤 Загрузка позиции пользователя ${userId} по метрике ${metric}...`);
        
        const currentPosition = document.getElementById('current-position');
        if (!currentPosition) {
            console.warn('⚠️ Элемент current-position не найден');
            return;
        }
        
        try {
            let endpoint;
            let labelText;
            let icon;
            let emptyText;

            // Определяем настройки для каждой метрики
            switch (metric) {
                case 'referrals':
                    endpoint = `/api/leaderboard/referrals/position/${userId}`;
                    labelText = (score) => this.formatFriendsCount(score);
                    icon = '👥';
                    emptyText = 'Пригласите друзей!';
                    break;
                case 'stars':
                    endpoint = `/api/leaderboard/stars/position/${userId}`;
                    labelText = (score) => `${score} звезд`;
                    icon = '⭐';
                    emptyText = 'Зарабатывайте звезды!';
                    break;
                case 'spins':
                    endpoint = `/api/leaderboard/spins/position/${userId}`;
                    labelText = (score) => `${score} спинов`;
                    icon = '🎰';
                    emptyText = 'Крутите рулетку!';
                    break;
                case 'prizes':
                    endpoint = `/api/leaderboard/prizes/position/${userId}`;
                    labelText = (score) => `${score} призов`;
                    icon = '🏆';
                    emptyText = 'Выигрывайте призы!';
                    break;
                default:
                    endpoint = `/api/leaderboard/referrals/position/${userId}`;
                    labelText = (score) => this.formatFriendsCount(score);
                    icon = '👥';
                    emptyText = 'Пригласите друзей!';
            }

            const response = await fetch(endpoint);
            const data = await response.json();
            
            console.log(`📊 Позиция пользователя по ${metric}:`, data);
            
            if (data.position && data.score > 0) {
                const scoreText = labelText(data.score);
                
                currentPosition.innerHTML = `
                    <div class="user-position-card">
                        <div class="user-position-content">
                            <div class="user-position-rank">
                                <span class="position-number">#${data.position}</span>
                            </div>
                            <div class="user-position-info">
                                <div class="user-position-title">Ваша позиция</div>
                                <div class="user-position-score">${icon} ${scoreText}</div>
                            </div>
                        </div>
                    </div>
                `;
                currentPosition.style.display = 'block';
            } else {
                currentPosition.innerHTML = `
                    <div class="user-position-card">
                        <div class="user-position-content">
                            <div class="user-position-info">
                                <div class="user-position-title">Не в рейтинге</div>
                                <div class="user-position-score">${emptyText}</div>
                            </div>
                        </div>
                    </div>
                `;
                currentPosition.style.display = 'block';
            }
            
        } catch (error) {
            console.error(`❌ Ошибка получения позиции пользователя по ${metric}:`, error);
            // Показываем базовую позицию даже при ошибке
            currentPosition.innerHTML = `
                <div class="user-position-card">
                    <div class="user-position-content">
                        <div class="user-position-info">
                            <div class="user-position-title">Не в рейтинге</div>
                            <div class="user-position-score">${emptyText}</div>
                        </div>
                    </div>
                </div>
            `;
            currentPosition.style.display = 'block';
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

    // ЗАМЕНИТЕ метод renderReferralsSection() полностью:
    renderReferralsSection() {
        const gameData = this.app.gameData;
        const referralsCount = gameData.referrals || 0;
        const starsFromReferrals = referralsCount * 10;
        const friendsText = this.formatFriendsCount(referralsCount);
        
        return `
            <div class="referrals-stats">
                <!-- Основная статистика рефералов -->
                <div class="referrals-overview">
                    <div class="referral-stat-card">
                        <div class="referral-stat-value">${referralsCount}</div>
                        <div class="referral-stat-label">Приглашено ${this.getFriendsWord(referralsCount)}</div>
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
                
                <div class="referral-info">
                    <p style="font-size: 14px; color: var(--text-secondary); margin: 15px 0 0 0; text-align: center;">
                        🎁 Получайте 10 звезд за каждого приглашенного друга!
                    </p>
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
        
        if (!telegramUser) return 'Пользователь';
        
        const firstName = telegramUser.first_name || '';
        const lastName = telegramUser.last_name || '';
        
        return `${firstName} ${lastName}`.trim() || 'Пользователь';
    }

    getUserNickname() {
        const telegramUser = this.app.tg?.initDataUnsafe?.user || 
                            window.Telegram?.WebApp?.initDataUnsafe?.user;
        
        if (!telegramUser?.username) return '';
        
        return `@${telegramUser.username}`;
    }

    getPlayerDisplayName(player) {
        console.log('🔍 Определение имени для игрока:', player);
        
        // Проверяем разные варианты имени
        if (player.first_name && player.first_name.trim()) {
            console.log('✅ Используем first_name:', player.first_name);
            return player.first_name.trim();
        } 
        
        if (player.username && player.username.trim()) {
            console.log('✅ Используем username:', player.username);
            return `@${player.username.trim()}`;
        }
        
        if (player.telegram_id) {
            const shortId = player.telegram_id.toString().slice(-4);
            console.log('✅ Используем короткий ID:', shortId);
            return `ID: ${shortId}`;
        }
        
        console.warn('⚠️ Не найдено имя для игрока, используем заглушку');
        return 'Аноним';
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
        const user = this.app.tg?.initDataUnsafe?.user || 
                     window.Telegram?.WebApp?.initDataUnsafe?.user;
        
        if (user?.photo_url) {
            return `<img src="${user.photo_url}" alt="Аватар" class="profile-avatar-img" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="profile-avatar-fallback" style="display: none;">
                        ${user.first_name?.charAt(0).toUpperCase() || '👤'}
                    </div>`;
        }
        
        // Если нет фото, показываем первую букву имени или иконку
        return `<div class="profile-avatar-fallback">
                    ${user?.first_name?.charAt(0).toUpperCase() || '👤'}
                </div>`;
    }

    // Методы для открытия ресурсов
    openChannel() {
        console.log('📢 Открытие канала проекта');
        
        if (this.app.tg?.openTelegramLink) {
            // ИСПРАВЛЕНО: Правильная ссылка на канал проекта
            this.app.tg.openTelegramLink('https://t.me/kosmetichka_channel');
            this.app.showStatusMessage('Переход в канал проекта...', 'info');
        } else if (window.open) {
            // Fallback для браузера
            window.open('https://t.me/kosmetichka_channel', '_blank');
        } else {
            this.app.showStatusMessage('Канал: @kosmetichka_channel', 'info');
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

    // ДОБАВИТЬ эти методы:

    // Получение отображаемого имени игрока
    getPlayerDisplayName(player) {
        if (player.first_name) {
            return player.first_name;
        } else if (player.username) {
            return `@${player.username}`;
        } else {
            return `ID: ${player.telegram_id.toString().slice(-4)}`;
        }
    }

    // Получение эмодзи для позиции
    getPositionEmoji(position) {
        switch (position) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `#${position}`;
        }
    }

    // Проверка является ли игрок текущим пользователем
    isCurrentUser(player) {
        const currentUserId = this.getTelegramId();
        return currentUserId && currentUserId.toString() === player.telegram_id.toString();
    }

}

// Глобальная ссылка для использования в onclick - будет установлена в конструкторе

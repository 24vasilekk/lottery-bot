// public/js/screens/tasks.js - Tasks Screen Module (UPDATED FOR CHANNEL SUBSCRIPTIONS)

import { TASKS_CONFIG } from '../config.js';

export class TasksScreen {
    constructor(app) {
        this.app = app;
        this.currentTab = 'channels';
        this.channels = [];
        this.dailyTasks = [];
        this.hotOffers = [];
        this.userBlocked = false;
    }

    render() {
        return `
            <div id="tasks-screen" class="screen">
                <!-- Упрощенный Header -->
                <div class="tasks-header-profile">
                    <div class="tasks-avatar">
                        📋
                    </div>
                    <div class="tasks-info">
                        <h2 class="tasks-title">Задания</h2>
                    </div>
                </div>

                <!-- Tabs в новом стиле -->
                <div class="task-tabs-profile">
                    <button class="task-tab-profile active" data-tab="channels">
                        <div class="tab-icon">📺</div>
                        <div class="tab-text">Каналы</div>
                    </button>
                    <button class="task-tab-profile" data-tab="daily">
                        <div class="tab-icon">📅</div>
                        <div class="tab-text">Ежедневные</div>
                    </button>
                    <button class="task-tab-profile" data-tab="referral">
                        <div class="tab-icon">👥</div>
                        <div class="tab-text">Рефералы</div>
                    </button>
                    <button class="task-tab-profile" data-tab="hot">
                        <div class="tab-icon">🔥</div>
                        <div class="tab-text">Активные</div>
                    </button>
                </div>

                <!-- Content sections -->
                <div class="task-content">
                    <div id="channels-tasks" class="task-section active">
                        ${this.renderChannelTasks()}
                    </div>

                    <div id="daily-tasks" class="task-section">
                        ${this.renderDailyTasks()}
                    </div>

                    <div id="referral-tasks" class="task-section">
                        ${this.renderReferralTasks()}
                    </div>

                    <div id="hot-tasks" class="task-section">
                        ${this.renderHotOffers()}
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        this.setupEventListeners();
        await this.loadTasks();
        this.checkDailyReset();
        this.updateTaskCounter();
        console.log('✅ Экран заданий инициализирован');
    }

    setupEventListeners() {
        // Task tabs
        const taskTabs = document.querySelectorAll('.task-tab-profile');
        taskTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tabs
        document.querySelectorAll('.task-tab-profile').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        // Update sections
        document.querySelectorAll('.task-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const sectionId = `${tabName}-tasks`;
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Refresh content
        this.refreshTabContent(tabName);
    }

    refreshTabContent(tabName) {
        const sectionId = `${tabName}-tasks`;
        const container = document.getElementById(sectionId);
        if (!container) return;
        
        switch (tabName) {
            case 'channels':
                container.innerHTML = this.renderChannelTasks();
                break;
            case 'daily':
                container.innerHTML = this.renderDailyTasks();
                break;
            case 'referral':
                container.innerHTML = this.renderReferralTasks();
                break;
            case 'hot':
                container.innerHTML = this.renderHotOffers();
                break;
        }
        
        // Re-attach event listeners for the new content
        this.attachTaskEventListeners();
    }

    // ===================== НОВЫЕ МЕТОДЫ ДЛЯ СИСТЕМЫ КАНАЛОВ =====================
    
    async loadTasks() {
        try {
            // Попытка загрузки каналов, если есть данные пользователя
            if (this.app.tg?.initDataUnsafe?.user?.id) {
                const userId = this.app.tg.initDataUnsafe.user.id;
                const response = await fetch(`/api/tasks/available/${userId}`);
                const data = await response.json();

                if (data.blocked) {
                    this.userBlocked = true;
                    this.blockMessage = data.message;
                    this.banUntil = data.banUntil;
                } else {
                    this.userBlocked = false;
                    // Загружаем расширенную информацию о каналах с аватарками
                    this.channels = await this.loadChannelInfo(data.channels || []);
                }
                
                console.log('✅ Задания каналов загружены:', data);
            } else {
                console.warn('Нет данных пользователя для загрузки заданий каналов');
                this.channels = [];
            }

            // Обновляем интерфейс
            this.refreshTabContent(this.currentTab);
        } catch (error) {
            console.error('❌ Ошибка загрузки заданий:', error);
            this.channels = [];
        }
    }

    renderChannelTasks() {
        if (this.userBlocked) {
            return `
                <div class="task-section-blocked">
                    <div class="blocked-icon">🚫</div>
                    <h3>Временная блокировка</h3>
                    <p>${this.blockMessage}</p>
                    <p>Блокировка до: ${new Date(this.banUntil).toLocaleString('ru-RU')}</p>
                </div>
            `;
        }

        if (!this.channels || this.channels.length === 0) {
            return `
                <div class="task-section-empty">
                    <div class="empty-icon">📺</div>
                    <h3>Нет доступных каналов</h3>
                    <p>В данный момент нет каналов для подписки</p>
                </div>
            `;
        }

        return `
            <div class="task-section-header">
                <div class="section-info">
                    <h3>📺 Подпишись на каналы</h3>
                    <p>Подписывайтесь на наши каналы и получайте звезды</p>
                </div>
                <button class="check-all-btn" onclick="checkAllSubscriptions()">
                    🔍 Проверить все
                </button>
            </div>
            
            <div class="task-cards-grid">
                ${this.channels.map(channel => this.renderChannelCard(channel)).join('')}
            </div>
        `;
    }

    renderChannelCard(channel) {
        const isHot = channel.is_hot_offer;
        const reward = isHot ? channel.reward_stars * channel.hot_offer_multiplier : channel.reward_stars;
        const avatarUrl = channel.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.channel_name)}&background=ff6b9d&color=fff&size=60&rounded=true`;
        
        return `
            <div class="task-card channel-card ${isHot ? 'hot-offer' : ''}">
                ${isHot ? 
                    `<div class="hot-badge">🔥 x${channel.hot_offer_multiplier}</div>` : ''
                }
                <div class="channel-header">
                    <div class="channel-avatar">
                        <img src="${avatarUrl}" alt="${channel.channel_name}" onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"60\" height=\"60\" viewBox=\"0 0 60 60\"><circle cx=\"30\" cy=\"30\" r=\"30\" fill=\"%23ff6b9d\"/><text x=\"30\" y=\"38\" text-anchor=\"middle\" fill=\"white\" font-size=\"20\">📺</text></svg>'">
                    </div>
                    <div class="channel-info">
                        <div class="channel-name">${channel.channel_name}</div>
                        <div class="channel-username">@${channel.channel_username}</div>
                        ${channel.description ? 
                            `<div class="channel-description">${this.truncateText(channel.description, 100)}</div>` : ''
                        }
                    </div>
                </div>
                
                <div class="channel-stats">
                    <div class="stat-item">
                        <div class="stat-icon">👥</div>
                        <div class="stat-text">${this.formatSubscriberCount(channel.member_count || 0)}</div>
                    </div>
                    <div class="stat-item reward">
                        <div class="stat-icon">⭐</div>
                        <div class="stat-text">+${reward}</div>
                    </div>
                </div>
                
                <div class="channel-actions">
                    <button class="subscribe-btn primary" onclick="handleChannelSubscribe('${channel.id}', '${channel.channel_username}')">
                        📺 Подписаться
                    </button>
                    <button class="check-btn" onclick="checkChannelSubscription('${channel.id}', '${channel.channel_username}')">
                        🔍 Проверить
                    </button>
                </div>
            </div>
        `;
    }

    renderDailyTasks() {
        if (!TASKS_CONFIG.daily) {
            return `
                <div class="task-section-empty">
                    <div class="empty-icon">📅</div>
                    <h3>Загрузка заданий...</h3>
                    <p>Ежедневные задания загружаются</p>
                </div>
            `;
        }

        const todayTasks = TASKS_CONFIG.daily.filter(task => !this.isTaskCompleted(task.id));
        
        if (todayTasks.length === 0) {
            return `
                <div class="task-section-empty">
                    <div class="empty-icon">✅</div>
                    <h3>Все задания выполнены!</h3>
                    <p>Возвращайтесь завтра за новыми заданиями</p>
                </div>
            `;
        }

        return `
            <div class="task-section-header">
                <div class="section-info">
                    <h3>📅 Ежедневные задания</h3>
                    <p>Выполняйте каждый день и получайте бонусы</p>
                </div>
            </div>
            
            <div class="task-cards-grid">
                ${todayTasks.map(task => this.renderTaskCard(task)).join('')}
            </div>
        `;
    }

    renderReferralTasks() {
        if (!TASKS_CONFIG.friends) {
            return `
                <div class="task-section-empty">
                    <div class="empty-icon">👥</div>
                    <h3>Загрузка заданий...</h3>
                    <p>Задания с друзьями загружаются</p>
                </div>
            `;
        }

        const referralLink = this.getReferralLink();
        const friendsInvited = this.app.gameData.friendsInvited || 0;

        return `
            <div class="task-section-header">
                <div class="section-info">
                    <h3>👥 Приглашай друзей</h3>
                    <p>Получай звезды за каждого приглашенного друга</p>
                </div>
            </div>
            
            <div class="referral-link-container">
                <div class="referral-info">
                    <h4>Твоя реферальная ссылка:</h4>
                    <div class="link-input-group">
                        <input type="text" id="referral-link" value="${referralLink}" readonly>
                        <button class="copy-btn" onclick="window.tasksScreen?.copyReferralLink()">
                            📋 Копировать
                        </button>
                    </div>
                    <p class="referral-stats">Приглашено друзей: <strong>${friendsInvited}</strong></p>
                </div>
            </div>
            
            <div class="task-cards-grid">
                ${TASKS_CONFIG.friends.map(task => this.renderFriendsTaskCard(task)).join('')}
            </div>
        `;
    }

    renderHotOffers() {
        if (!TASKS_CONFIG.active) {
            return `
                <div class="task-section-empty">
                    <div class="empty-icon">🔥</div>
                    <h3>Загрузка заданий...</h3>
                    <p>Активные задания загружаются</p>
                </div>
            `;
        }

        const activeTasks = TASKS_CONFIG.active.filter(task => !this.isTaskCompleted(task.id));
        
        if (activeTasks.length === 0) {
            return `
                <div class="task-section-empty">
                    <div class="empty-icon">✅</div>
                    <h3>Все активные задания выполнены!</h3>
                    <p>Следите за новыми заданиями</p>
                </div>
            `;
        }

        return `
            <div class="task-section-header">
                <div class="section-info">
                    <h3>🔥 Активные задания</h3>
                    <p>Специальные задания с повышенными наградами</p>
                </div>
            </div>
            
            <div class="task-cards-grid">
                ${activeTasks.map(task => this.renderActiveTaskCard(task)).join('')}
            </div>
        `;
    }

    renderTaskCard(task) {
        const isCompleted = this.isTaskCompleted(task.id);
        
        return `
            <div class="task-card ${isCompleted ? 'completed' : ''}">
                <div class="task-header">
                    <div class="task-icon">${task.icon}</div>
                    <div class="task-info">
                        <div class="task-name">${task.name}</div>
                        <div class="task-description">${task.description}</div>
                    </div>
                </div>
                
                <div class="task-reward">
                    <span class="reward-amount">+${task.reward.amount}</span>
                    <span class="reward-icon">⭐</span>
                </div>
                
                <div class="task-actions">
                    ${isCompleted ? 
                        `<div class="task-status">
                            <i class="fas fa-check"></i>
                            Выполнено
                        </div>` :
                        `<button class="task-button" onclick="window.tasksScreen?.completeTask('${task.id}', 'daily')">
                            Выполнить
                        </button>`
                    }
                </div>
            </div>
        `;
    }

    renderFriendsTaskCard(task) {
        const isCompleted = this.isTaskCompleted(task.id);
        const currentProgress = this.app.gameData.friendsInvited || 0;
        const requiredCount = task.requirement;
        const progressPercentage = Math.min(100, (currentProgress / requiredCount) * 100);
        
        return `
            <div class="task-card friends-task ${isCompleted ? 'completed' : ''}">
                <div class="task-header">
                    <div class="task-icon">${task.icon}</div>
                    <div class="task-info">
                        <div class="task-name">${task.name}</div>
                        <div class="task-description">${task.description}</div>
                    </div>
                </div>
                
                <div class="task-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                    <div class="progress-text">${currentProgress}/${requiredCount}</div>
                </div>
                
                <div class="task-reward">
                    <span class="reward-amount">+${task.reward.amount}</span>
                    <span class="reward-icon">⭐</span>
                </div>
                
                <div class="task-actions">
                    ${isCompleted ? 
                        `<div class="task-status">
                            <i class="fas fa-check"></i>
                            Выполнено
                        </div>` :
                        currentProgress >= requiredCount ?
                        `<button class="task-button" onclick="window.tasksScreen?.completeTask('${task.id}', 'friends')">
                            Получить награду
                        </button>` :
                        `<div class="task-pending">
                            Пригласите еще ${requiredCount - currentProgress} друзей
                        </div>`
                    }
                </div>
            </div>
        `;
    }

    renderActiveTaskCard(task) {
        const isCompleted = this.isTaskCompleted(task.id);
        
        return `
            <div class="task-card active-task ${isCompleted ? 'completed' : ''}">
                <div class="hot-badge">🔥 Активное</div>
                <div class="task-header">
                    <div class="task-icon">${task.icon}</div>
                    <div class="task-info">
                        <div class="task-name">${task.name}</div>
                        <div class="task-description">${task.description}</div>
                    </div>
                </div>
                
                <div class="task-reward">
                    <span class="reward-amount">+${task.reward.amount}</span>
                    <span class="reward-icon">⭐</span>
                </div>
                
                <div class="task-actions">
                    ${isCompleted ? 
                        `<div class="task-status">
                            <i class="fas fa-check"></i>
                            Выполнено
                        </div>` :
                        `<button class="task-button" onclick="window.tasksScreen?.completeTask('${task.id}', 'active')">
                            ${task.action || 'Выполнить'}
                        </button>`
                    }
                </div>
            </div>
        `;
    }

    // ===================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====================

    async loadChannelInfo(channels) {
        // Добавляем информацию об аватарах каналов
        return channels.map(channel => ({
            ...channel,
            avatar_url: channel.photo_url || null
        }));
    }

    formatSubscriberCount(count) {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    attachTaskEventListeners() {
        // Глобальные функции для работы с каналами
        window.handleChannelSubscribe = (channelId, channelUsername) => {
            this.handleChannelSubscribe(channelId, channelUsername);
        };

        window.checkChannelSubscription = (channelId, channelUsername) => {
            this.checkChannelSubscription(channelId, channelUsername);
        };

        window.checkAllSubscriptions = () => {
            this.checkAllSubscriptions();
        };
    }

    async handleChannelSubscribe(channelId, channelUsername) {
        try {
            const channelUrl = `https://t.me/${channelUsername}`;
            
            if (this.app.tg && this.app.tg.openTelegramLink) {
                this.app.tg.openTelegramLink(channelUrl);
            } else if (this.app.tg && this.app.tg.openLink) {
                this.app.tg.openLink(channelUrl);
            } else {
                window.open(channelUrl, '_blank');
            }
            
            // Показываем сообщение о том, что нужно проверить подписку
            this.app.showStatusMessage('После подписки нажмите "Проверить"', 'info');
            
        } catch (error) {
            console.error('❌ Ошибка открытия канала:', error);
            this.app.showStatusMessage('Ошибка открытия канала', 'error');
        }
    }

    async checkChannelSubscription(channelId, channelUsername) {
        try {
            const userId = this.app.tg?.initDataUnsafe?.user?.id;
            if (!userId) {
                this.app.showStatusMessage('Ошибка: данные пользователя недоступны', 'error');
                return;
            }

            this.app.showStatusMessage('Проверяем подписку...', 'info');

            // Проверяем подписку на канал
            const checkResponse = await fetch('/api/subscription/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, channelId, channelUsername })
            });

            const checkResult = await checkResponse.json();

            if (!checkResult.subscribed) {
                this.app.showStatusMessage('Подписка не найдена. Проверьте, что вы подписались на канал', 'error');
                return;
            }

            // Выполняем задание подписки
            const completeResponse = await fetch('/api/subscription/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId, 
                    channelId, 
                    userData: this.app.getUserData() 
                })
            });

            const result = await completeResponse.json();

            if (result.success) {
                this.app.addStars(result.reward);
                this.app.showStatusMessage(`Получено ${result.reward} ⭐!`, 'success');
                
                // Обновляем интерфейс
                await this.loadTasks();
                
                // Haptic feedback
                if (this.app.tg?.HapticFeedback) {
                    this.app.tg.HapticFeedback.notificationOccurred('success');
                }
            } else {
                this.app.showStatusMessage(result.error || 'Ошибка выполнения задания', 'error');
                if (result.banUntil) {
                    await this.loadTasks(); // Обновляем состояние блокировки
                }
            }

        } catch (error) {
            console.error('❌ Ошибка проверки подписки:', error);
            this.app.showStatusMessage('Ошибка проверки подписки', 'error');
        }
    }

    async checkAllSubscriptions() {
        this.app.showStatusMessage('Проверяем все подписки...', 'info');
        
        for (const channel of this.channels) {
            await this.checkChannelSubscription(channel.id, channel.channel_username);
            // Небольшая задержка между проверками
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    getReferralLink() {
        if (!this.app.tg?.initDataUnsafe?.user?.id) {
            return 'https://t.me/kosmetichka_lottery_bot';
        }

        const userId = this.app.tg.initDataUnsafe.user.id;
        return `https://t.me/kosmetichka_lottery_bot?start=ref_${userId}`;
    }

    copyReferralLink() {
        const linkInput = document.getElementById('referral-link');
        if (linkInput) {
            linkInput.select();
            document.execCommand('copy');
            this.app.showStatusMessage('Ссылка скопирована!', 'success');
        }
    }

    // ===================== ЛОГИКА ВЫПОЛНЕНИЯ ЗАДАНИЙ =====================

    completeTask(taskId, category) {
        // Проверяем не выполнено ли уже
        if (this.isTaskCompleted(taskId)) {
            this.app.showStatusMessage('Задание уже выполнено', 'info');
            return;
        }

        const task = this.findTask(taskId, category);
        if (!task) {
            console.error('Задание не найдено:', taskId);
            return;
        }

        // Добавляем в выполненные
        if (!this.app.gameData.completedTasks) {
            this.app.gameData.completedTasks = [];
        }
        this.app.gameData.completedTasks.push(taskId);

        // Выдаем награду
        if (task.reward) {
            if (task.reward.type === 'stars') {
                this.app.gameData.stars += task.reward.amount;
                this.app.showStatusMessage(`Получено ${task.reward.amount} ⭐!`, 'success');
            }
        }

        // Сохраняем данные локально
        this.app.saveGameData();
        this.app.updateStarsDisplay();

        // Отправляем задание на сервер
        this.syncTaskWithServer(taskId, task);

        // Обновляем интерфейс
        this.updateTaskCounter();
        this.refreshTabContent(this.currentTab);
        
        // Обновляем бэджи навигации
        if (this.app.navigation && this.app.navigation.updateBadges) {
            this.app.navigation.updateBadges();
        }

        // Специальная обработка для разных типов заданий
        if (category === 'active') {
            this.handleActiveTask(taskId);
        }

        // Вибрация при выполнении
        if (this.app.tg && this.app.tg.HapticFeedback) {
            this.app.tg.HapticFeedback.impactOccurred('medium');
        }

        console.log('✅ Задание выполнено:', taskId);
    }

    // Синхронизация задания с сервером
    async syncTaskWithServer(taskId, task) {
        try {
            const userId = this.app.tg?.initDataUnsafe?.user?.id;
            if (!userId) {
                console.warn('Нет данных пользователя для синхронизации');
                return;
            }

            const response = await fetch('/api/tasks/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    taskId,
                    taskName: task.name,
                    reward: task.reward,
                    userData: this.app.getUserData()
                })
            });

            if (!response.ok) {
                console.error('Ошибка синхронизации задания на сервере');
            }

        } catch (error) {
            console.error('❌ Ошибка синхронизации задания:', error);
        }
    }

    handleActiveTask(taskId) {
        const task = TASKS_CONFIG.active.find(t => t.id === taskId);
        if (!task) return;

        if (task.url) {
            // Открываем ссылку для подписки
            if (this.app.tg && this.app.tg.openLink) {
                this.app.tg.openLink(task.url);
            } else {
                window.open(task.url, '_blank');
            }
        } else if (taskId === 'rate_app') {
            this.app.showStatusMessage('Спасибо за оценку! 🌟', 'success');
        }
    }

    isTaskCompleted(taskId) {
        return (this.app.gameData.completedTasks || []).includes(taskId);
    }

    findTask(taskId, category) {
        try {
            switch (category) {
                case 'daily':
                    return TASKS_CONFIG.daily?.find(t => t.id === taskId);
                case 'friends':
                    return TASKS_CONFIG.friends?.find(t => t.id === taskId);
                case 'active':
                    return TASKS_CONFIG.active?.find(t => t.id === taskId);
                default:
                    return null;
            }
        } catch (error) {
            console.error('Ошибка поиска задания:', error);
            return null;
        }
    }

    getCompletedTasksList() {
        try {
            const allTasks = [
                ...(TASKS_CONFIG.daily || []),
                ...(TASKS_CONFIG.friends || []),
                ...(TASKS_CONFIG.active || [])
            ];
            
            return allTasks.filter(task => this.isTaskCompleted(task.id));
        } catch (error) {
            console.error('Ошибка получения выполненных заданий:', error);
            return [];
        }
    }

    getCompletedTasksCount() {
        return (this.app.gameData.completedTasks || []).length;
    }

    getTotalTasksCount() {
        try {
            return (TASKS_CONFIG.daily?.length || 0) + 
                   (TASKS_CONFIG.friends?.length || 0) + 
                   (TASKS_CONFIG.active?.length || 0) + 
                   (this.channels?.length || 0);
        } catch (error) {
            console.error('Ошибка подсчета общего количества заданий:', error);
            return 0;
        }
    }

    getAvailableTasksCount() {
        try {
            const completedTasks = this.app.gameData.completedTasks || [];
            
            // Ежедневные задания
            const lastDailyReset = this.app.gameData.lastDailyReset || 0;
            const today = new Date().toDateString();
            const lastResetDate = new Date(lastDailyReset).toDateString();
            let count = 0;
            
            if (today !== lastResetDate) {
                count += (TASKS_CONFIG.daily || []).filter(task => !completedTasks.includes(task.id)).length;
            }
            
            // Задания с друзьями
            count += (TASKS_CONFIG.friends || []).filter(task => !completedTasks.includes(task.id)).length;
            
            // Активные задания
            count += (TASKS_CONFIG.active || []).filter(task => !completedTasks.includes(task.id)).length;
            
            // Каналы
            count += (this.channels || []).length;
            
            return count;
        } catch (error) {
            console.error('Ошибка подсчета доступных заданий:', error);
            return 0;
        }
    }

    checkDailyReset() {
        const lastReset = this.app.gameData.lastDailyReset || 0;
        const today = new Date().toDateString();
        const lastResetDate = new Date(lastReset).toDateString();
        
        if (today !== lastResetDate) {
            // Сбрасываем ежедневные задания
            const dailyTaskIds = (TASKS_CONFIG.daily || []).map(task => task.id);
            const completedTasks = this.app.gameData.completedTasks || [];
            
            this.app.gameData.completedTasks = completedTasks.filter(taskId => 
                !dailyTaskIds.includes(taskId)
            );
            
            this.app.gameData.lastDailyReset = new Date().getTime();
            this.app.saveGameData();
            
            console.log('✅ Ежедневные задания сброшены');
        }
    }

    updateTaskCounter() {
        const completedCount = document.getElementById('completed-tasks-count');
        const totalCount = document.getElementById('total-tasks-count');
        
        if (completedCount) {
            completedCount.textContent = this.getCompletedTasksCount();
        }
        
        if (totalCount) {
            totalCount.textContent = this.getTotalTasksCount();
        }
    }
}

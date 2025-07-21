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
                <div class="header">
                    <h2>📋 Задания</h2>
                    <div class="task-counter">
                        <span id="completed-tasks-count">${this.getCompletedTasksCount()}</span>/<span id="total-tasks-count">${this.getTotalTasksCount()}</span>
                    </div>
                </div>

                <div class="task-tabs">
                    <button class="task-tab active" data-tab="channels">📺 Каналы</button>
                    <button class="task-tab" data-tab="daily">📅 Ежедневные</button>
                    <button class="task-tab" data-tab="referral">👥 Рефералы</button>
                    <button class="task-tab" data-tab="hot">🔥 Горячие</button>
                </div>

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
        const taskTabs = document.querySelectorAll('.task-tab');
        taskTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tabs
        document.querySelectorAll('.task-tab').forEach(tab => {
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
        if (!this.app.tg?.initDataUnsafe?.user?.id) {
            console.warn('Нет данных пользователя для загрузки заданий');
            return;
        }

        try {
            const userId = this.app.tg.initDataUnsafe.user.id;
            const response = await fetch(`/api/tasks/available/${userId}`);
            const data = await response.json();

            if (data.blocked) {
                this.userBlocked = true;
                this.blockMessage = data.message;
                this.banUntil = data.banUntil;
            } else {
                this.userBlocked = false;
                this.channels = data.channels || [];
                this.dailyTasks = data.dailyTasks || [];
                this.hotOffers = data.hotOffers || [];
            }

            // Обновляем интерфейс
            this.refreshTabContent(this.currentTab);
            console.log('✅ Задания загружены:', data);
        } catch (error) {
            console.error('❌ Ошибка загрузки заданий:', error);
        }
    }

    renderChannelTasks() {
        if (this.userBlocked) {
            return `
                <div class="blocked-state">
                    <div class="blocked-icon">🚫</div>
                    <h3>Временная блокировка</h3>
                    <p>${this.blockMessage}</p>
                    <p>Блокировка до: ${new Date(this.banUntil).toLocaleString('ru-RU')}</p>
                </div>
            `;
        }

        if (!this.channels || this.channels.length === 0) {
            return '<div class="empty-state">Нет доступных каналов для подписки</div>';
        }

        return this.channels.map(channel => this.renderChannelTaskItem(channel)).join('');
    }

    renderChannelTaskItem(channel) {
        const isHot = channel.is_hot_offer && channel.hot_offer_multiplier > 1;
        const reward = Math.floor(channel.reward_stars * (channel.hot_offer_multiplier || 1));
        const hotBadge = isHot ? `<div class="hot-badge">🔥 x${channel.hot_offer_multiplier}</div>` : '';
        
        return `
            <div class="channel-task-item ${isHot ? 'hot-offer' : ''}" data-channel-id="${channel.id}">
                ${hotBadge}
                <div class="channel-info">
                    <div class="channel-title">${channel.channel_name}</div>
                    <div class="channel-description">Подпишитесь на канал @${channel.channel_username}</div>
                    <div class="channel-reward">+${reward} ⭐</div>
                    ${channel.target_subscribers ? 
                        `<div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(100, (channel.current_subscribers / channel.target_subscribers) * 100)}%"></div>
                        </div>
                        <div class="progress-text">${channel.current_subscribers}/${channel.target_subscribers} подписчиков</div>` 
                        : ''
                    }
                </div>
                <button class="subscribe-btn" onclick="handleChannelSubscribe('${channel.id}', '${channel.channel_username}')">
                    Подписаться
                </button>
            </div>
        `;
    }

    renderDailyTasks() {
        if (!this.dailyTasks || this.dailyTasks.length === 0) {
            return '<div class="empty-state">Все ежедневные задания выполнены! 🎉</div>';
        }
        
        return this.dailyTasks.map(task => this.renderDailyTaskItem(task)).join('');
    }

    renderDailyTaskItem(task) {
        const isCompleted = task.completed || false;
        const progress = task.progress || 0;
        const target = task.target || 1;
        
        return `
            <div class="daily-task-item ${isCompleted ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-icon">${task.icon}</div>
                <div class="task-content">
                    <div class="task-name">${task.name}</div>
                    <div class="task-description">${task.description}</div>
                    <div class="task-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(100, (progress / target) * 100)}%"></div>
                        </div>
                        <div class="progress-text">${progress}/${target}</div>
                    </div>
                    <div class="task-reward">+${task.reward} ⭐</div>
                </div>
                ${isCompleted ? 
                    '<div class="completed-badge">✅ Выполнено</div>' :
                    `<button class="claim-btn ${progress >= target ? 'ready' : 'disabled'}" 
                             onclick="handleDailyTaskClaim('${task.id}')"
                             ${progress < target ? 'disabled' : ''}>
                        ${progress >= target ? 'Получить' : 'В процессе'}
                     </button>`
                }
            </div>
        `;
    }

    renderReferralTasks() {
        const referralCount = this.app.gameData.referralCount || 0;
        const activeReferrals = this.app.gameData.activeReferrals || 0;
        
        return `
            <div class="referral-section">
                <div class="referral-stats">
                    <div class="stat-item">
                        <div class="stat-value">${referralCount}</div>
                        <div class="stat-label">Приглашено</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${activeReferrals}</div>
                        <div class="stat-label">Активных</div>
                    </div>
                </div>
                
                <div class="referral-link">
                    <input type="text" id="referral-link" value="${this.getReferralLink()}" readonly>
                    <button onclick="copyReferralLink()">Копировать</button>
                </div>
                
                <div class="referral-description">
                    <p>Приглашайте друзей и получайте награды!</p>
                    <p>За каждого активного реферала (выполнил 2+ подписки) вы получите 20 ⭐</p>
                </div>
            </div>
        `;
    }

    renderHotOffers() {
        if (!this.hotOffers || this.hotOffers.length === 0) {
            return '<div class="empty-state">Сейчас нет горячих предложений</div>';
        }

        return this.hotOffers.map(offer => this.renderHotOfferItem(offer)).join('');
    }

    renderHotOfferItem(offer) {
        const timeLeft = Math.max(0, new Date(offer.expires_at) - new Date());
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        return `
            <div class="hot-offer-item" data-offer-id="${offer.id}">
                <div class="hot-badge">🔥 ГОРЯЧЕЕ ПРЕДЛОЖЕНИЕ</div>
                <div class="offer-content">
                    <div class="offer-title">${offer.title}</div>
                    <div class="offer-description">${offer.description}</div>
                    <div class="offer-reward">+${offer.reward} ⭐ (x${offer.multiplier})</div>
                    <div class="offer-timer">
                        ⏰ Осталось: ${hoursLeft}ч ${minutesLeft}м
                    </div>
                </div>
                <button class="hot-subscribe-btn" onclick="handleHotOfferSubscribe('${offer.id}', '${offer.channel_username}')">
                    Подписаться сейчас!
                </button>
            </div>
        `;
    }

    renderFriendsTasks() {
        if (!TASKS_CONFIG.friends) return '<div class="empty-state">Задания с друзьями загружаются...</div>';
        
        const referrals = this.app.gameData.referrals || 0;
        const tasks = TASKS_CONFIG.friends.filter(task => {
            const isCompleted = this.isTaskCompleted(task.id);
            const hasEnoughReferrals = referrals >= (task.required || 1);
            return !isCompleted && hasEnoughReferrals;
        });
        
        if (tasks.length === 0) {
            return `
                <div class="empty-state">
                    <p>Приглашайте друзей, чтобы получить больше заданий!</p>
                    <p>У вас сейчас: ${referrals} друзей</p>
                </div>
            `;
        }
        
        return tasks.map(task => this.renderTaskItem(task, 'friends')).join('');
    }

    renderActiveTasks() {
        if (!TASKS_CONFIG.active) return '<div class="empty-state">Активные задания загружаются...</div>';
        
        const tasks = TASKS_CONFIG.active.filter(task => !this.isTaskCompleted(task.id));
        
        if (tasks.length === 0) {
            return '<div class="empty-state">Все активные задания выполнены! 🌟</div>';
        }
        
        return tasks.map(task => this.renderTaskItem(task, 'active')).join('');
    }

    renderCompletedTasks() {
        const completedTasks = this.getCompletedTasksList();
        
        if (completedTasks.length === 0) {
            return '<div class="empty-state">Пока нет выполненных заданий</div>';
        }
        
        return completedTasks.map(task => this.renderCompletedTaskItem(task)).join('');
    }

    renderTaskItem(task, category) {
        const reward = task.reward || { type: 'stars', amount: 0 };
        const rewardText = reward.type === 'stars' ? `+${reward.amount} ⭐` : 'Награда';
        
        const progressText = category === 'friends' && task.required ? 
            `(${this.app.gameData.referrals || 0}/${task.required})` : '';
        
        return `
            <div class="task-item" data-task-id="${task.id}" data-category="${category}">
                <div class="task-icon">${task.icon}</div>
                <div class="task-content">
                    <div class="task-name">${task.name} ${progressText}</div>
                    <div class="task-description">${task.description}</div>
                    <div class="task-reward">${rewardText}</div>
                </div>
                <button class="task-complete-btn" onclick="handleTaskComplete('${task.id}', '${category}')">
                    Выполнить
                </button>
            </div>
        `;
    }

    renderCompletedTaskItem(task) {
        const reward = task.reward || { type: 'stars', amount: 0 };
        const rewardText = reward.type === 'stars' ? `+${reward.amount} ⭐` : 'Награда получена';
        
        return `
            <div class="task-item completed">
                <div class="task-icon">${task.icon}</div>
                <div class="task-content">
                    <div class="task-name">${task.name}</div>
                    <div class="task-description">${task.description}</div>
                    <div class="task-reward">${rewardText}</div>
                </div>
                <div class="task-status">
                    <i class="fas fa-check-circle"></i>
                    Выполнено
                </div>
            </div>
        `;
    }

    attachTaskEventListeners() {
        // Глобальные обработчики для новой системы заданий
        window.handleChannelSubscribe = (channelId, channelUsername) => {
            this.handleChannelSubscribe(channelId, channelUsername);
        };

        window.handleHotOfferSubscribe = (offerId, channelUsername) => {
            this.handleHotOfferSubscribe(offerId, channelUsername);
        };

        window.handleDailyTaskClaim = (taskId) => {
            this.handleDailyTaskClaim(taskId);
        };

        window.copyReferralLink = () => {
            this.copyReferralLink();
        };

        // Старые обработчики для совместимости
        window.handleTaskComplete = (taskId, category) => {
            this.completeTask(taskId, category);
        };
    }

    completeTask(taskId, category) {
        console.log(`🎯 Выполнение задания: ${taskId} (${category})`);
        
        // Проверяем, не выполнено ли уже задание
        if (this.isTaskCompleted(taskId)) {
            this.app.showStatusMessage('Задание уже выполнено!', 'info');
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

        // Сохраняем данные
        this.app.saveGameData();
        this.app.updateStarsDisplay();

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

    // ===================== НОВЫЕ ОБРАБОТЧИКИ ЗАДАНИЙ =====================

    async handleChannelSubscribe(channelId, channelUsername) {
        try {
            console.log(`📺 Подписка на канал: ${channelUsername} (ID: ${channelId})`);

            if (!this.app.tg?.initDataUnsafe?.user?.id) {
                this.app.showStatusMessage('Ошибка: нет данных пользователя', 'error');
                return;
            }

            const userId = this.app.tg.initDataUnsafe.user.id;

            // Открываем канал для подписки
            const channelUrl = `https://t.me/${channelUsername}`;
            if (this.app.tg && this.app.tg.openTelegramLink) {
                this.app.tg.openTelegramLink(channelUrl);
            } else {
                window.open(channelUrl, '_blank');
            }

            // Показываем уведомление с инструкцией
            this.app.showStatusMessage('Подпишитесь на канал, затем нажмите "Проверить"', 'info', 5000);

            // Добавляем кнопку проверки
            setTimeout(() => {
                this.showSubscriptionCheckButton(channelId, channelUsername, userId);
            }, 2000);

        } catch (error) {
            console.error('❌ Ошибка подписки на канал:', error);
            this.app.showStatusMessage('Ошибка подписки на канал', 'error');
        }
    }

    showSubscriptionCheckButton(channelId, channelUsername, userId) {
        const channelItem = document.querySelector(`[data-channel-id="${channelId}"]`);
        if (!channelItem) return;

        const button = channelItem.querySelector('.subscribe-btn');
        if (!button) return;

        button.textContent = 'Проверить подписку';
        button.onclick = () => this.checkAndCompleteSubscription(channelId, channelUsername, userId);
    }

    async checkAndCompleteSubscription(channelId, channelUsername, userId) {
        try {
            console.log(`🔍 Проверка подписки пользователя ${userId} на канал ${channelUsername}`);

            // Проверяем подписку
            const checkResponse = await fetch('/api/subscription/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, channelUsername })
            });

            const checkResult = await checkResponse.json();

            if (!checkResult.isSubscribed) {
                this.app.showStatusMessage('Вы не подписаны на канал!', 'error');
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

    async handleHotOfferSubscribe(offerId, channelUsername) {
        // Аналогично обычной подписке, но с учетом горячего предложения
        await this.handleChannelSubscribe(offerId, channelUsername);
    }

    async handleDailyTaskClaim(taskId) {
        console.log(`🎯 Получение награды за ежедневное задание: ${taskId}`);
        // Реализация получения награды за ежедневное задание
        this.app.showStatusMessage('Награда получена!', 'success');
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
                   (TASKS_CONFIG.active?.length || 0);
        } catch (error) {
            console.error('Ошибка подсчета общего количества заданий:', error);
            return 0;
        }
    }

    getAvailableTasksCount() {
        try {
            let count = 0;
            const completedTasks = this.app.gameData.completedTasks || [];
            
            // Ежедневные задания
            const lastDailyReset = this.app.gameData.lastDailyReset || 0;
            const today = new Date().toDateString();
            const lastResetDate = new Date(lastDailyReset).toDateString();
            
            if (today !== lastResetDate) {
                count += (TASKS_CONFIG.daily || []).filter(task => !completedTasks.includes(task.id)).length;
            }
            
            // Задания с друзьями
            const referrals = this.app.gameData.referrals || 0;
            const friendTasks = TASKS_CONFIG.friends || [];
            
            friendTasks.forEach(task => {
                const requiredFriends = task.required || 1;
                if (referrals >= requiredFriends && !completedTasks.includes(task.id)) {
                    count++;
                }
            });
            
            // Активные задания
            const activeTasks = TASKS_CONFIG.active || [];
            activeTasks.forEach(task => {
                if (!completedTasks.includes(task.id)) {
                    count++;
                }
            });
            
            return count;
            
        } catch (error) {
            console.error('Ошибка подсчета доступных заданий:', error);
            return 0;
        }
    }

    updateTaskCounter() {
        try {
            const completedEl = document.getElementById('completed-tasks-count');
            const totalEl = document.getElementById('total-tasks-count');
            
            if (completedEl) {
                completedEl.textContent = this.getCompletedTasksCount();
            }
            if (totalEl) {
                totalEl.textContent = this.getTotalTasksCount();
            }
        } catch (error) {
            console.error('Ошибка обновления счетчика заданий:', error);
        }
    }

    updateTasks() {
        this.updateTaskCounter();
        this.refreshTabContent(this.currentTab);
        this.attachTaskEventListeners();
    }

    checkDailyReset() {
        try {
            const now = new Date();
            const lastReset = this.app.gameData.lastDailyReset ? 
                new Date(this.app.gameData.lastDailyReset) : 
                new Date(0);
            
            // Проверяем, прошли ли сутки
            if (now.toDateString() !== lastReset.toDateString()) {
                // Сбрасываем ежедневные задания
                const dailyTaskIds = (TASKS_CONFIG.daily || []).map(task => task.id);
                this.app.gameData.completedTasks = (this.app.gameData.completedTasks || [])
                    .filter(taskId => !dailyTaskIds.includes(taskId));
                
                this.app.gameData.lastDailyReset = now.getTime();
                this.app.saveGameData();
                
                console.log('🔄 Ежедневные задания сброшены');
            }
        } catch (error) {
            console.error('Ошибка проверки сброса ежедневных заданий:', error);
        }
    }
}
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
                <!-- Header в стиле профиля -->
                <div class="tasks-header-profile">
                    <div class="tasks-avatar">
                        📋
                    </div>
                    <div class="tasks-info">
                        <h2 class="tasks-title">Задания</h2>
                        <div class="tasks-progress">
                            <span id="completed-tasks-count">${this.getCompletedTasksCount()}</span>/<span id="total-tasks-count">${this.getTotalTasksCount()}</span> выполнено
                        </div>
                        <div class="tasks-stats">
                            <div class="task-stat-item">
                                <div class="task-stat-value">${this.app.gameData.stars || 0}</div>
                                <div class="task-stat-label">⭐ Звезд</div>
                            </div>
                            <div class="task-stat-item">
                                <div class="task-stat-value">${this.getAvailableTasksCount()}</div>
                                <div class="task-stat-label">🎯 Доступно</div>
                            </div>
                        </div>
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
        const avatarUrl = channel.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.channel_name)}&background=ff6b9d&color=fff&size=60&rounded=true`;
        
        return `
            <div class="task-card channel-card ${isHot ? 'hot-offer' : ''}">
                ${isHot ? '<div class="hot-badge">🔥 ГОРЯЧЕЕ</div>' : ''}
                
                <div class="channel-header">
                    <div class="channel-avatar">
                        <img src="${avatarUrl}" alt="${channel.channel_name}" 
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiNmZjZiOWQiLz4KPHR3eHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7wn5OqPC90ZXh0Pgo8L3N2Zz4K'" />
                    </div>
                    <div class="channel-info">
                        <h4 class="channel-name">${channel.channel_name}</h4>
                        <div class="channel-username">@${channel.channel_username}</div>
                        ${channel.subscriber_count ? `<div class="channel-subscribers">${this.formatSubscriberCount(channel.subscriber_count)} подписчиков</div>` : ''}
                    </div>
                </div>

                <div class="channel-description">
                    ${channel.description || 'Подпишитесь на наш канал и получайте актуальные новости'}
                </div>

                <div class="task-reward">
                    <div class="reward-info">
                        <span class="reward-amount">+${channel.reward_stars} ⭐</span>
                        ${isHot ? `<span class="hot-multiplier">x${channel.hot_multiplier || 2}</span>` : ''}
                    </div>
                    ${isHot ? `<div class="hot-timer">Еще ${this.getHotOfferTimeLeft(channel.hot_offer_end)}</div>` : ''}
                </div>

                <button class="task-action-btn channel-subscribe-btn" 
                        onclick="handleChannelSubscribe('${channel.id}', '${channel.channel_username}')"
                        data-channel-id="${channel.id}">
                    <span class="btn-icon">📺</span>
                    <span class="btn-text">Подписаться</span>
                </button>
            </div>
        `;
    }

    formatSubscriberCount(count) {
        if (count < 1000) return count.toString();
        if (count < 1000000) return (count / 1000).toFixed(1) + 'K';
        return (count / 1000000).toFixed(1) + 'M';
    }

    getHotOfferTimeLeft(endTime) {
        if (!endTime) return 'скоро';
        
        const now = new Date();
        const end = new Date(endTime);
        const diff = end - now;
        
        if (diff <= 0) return 'истекло';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}ч ${minutes}м`;
        }
        return `${minutes}м`;
    }

    renderTaskCard(task, category) {
        const isCompleted = this.isTaskCompleted(task.id);
        const taskIcon = this.getTaskIcon(task, category);
        
        return `
            <div class="task-card ${category}-task ${isCompleted ? 'completed' : ''}">
                <div class="task-header">
                    <div class="task-icon">${taskIcon}</div>
                    <div class="task-info">
                        <h4 class="task-name">${task.name}</h4>
                        <div class="task-description">${task.description}</div>
                    </div>
                </div>

                <div class="task-reward">
                    <div class="reward-info">
                        <span class="reward-amount">+${task.reward.amount} ⭐</span>
                    </div>
                </div>

                <button class="task-action-btn ${isCompleted ? 'completed' : ''}" 
                        onclick="${isCompleted ? '' : `handleTaskComplete('${task.id}', '${category}')`}"
                        ${isCompleted ? 'disabled' : ''}>
                    <span class="btn-icon">${isCompleted ? '✅' : '🎯'}</span>
                    <span class="btn-text">${isCompleted ? 'Выполнено' : 'Выполнить'}</span>
                </button>
            </div>
        `;
    }

    getTaskIcon(task, category) {
        if (task.icon) return task.icon;
        
        switch (category) {
            case 'daily': return '📅';
            case 'friends': return '👥';
            case 'active': return '⭐';
            default: return '🎯';
        }
    }

    renderReferralCard(task) {
        const isCompleted = this.isTaskCompleted(task.id);
        const referrals = this.app.gameData.referrals || 0;
        const required = task.required || 0;
        const canComplete = referrals >= required;
        
        return `
            <div class="task-card referral-task ${isCompleted ? 'completed' : ''} ${canComplete ? 'available' : 'locked'}">
                <div class="task-header">
                    <div class="task-icon">${task.icon || '👥'}</div>
                    <div class="task-info">
                        <h4 class="task-name">${task.name}</h4>
                        <div class="task-description">${task.description}</div>
                    </div>
                </div>

                <div class="task-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(100, (referrals / required) * 100)}%"></div>
                    </div>
                    <div class="progress-text">
                        ${referrals} / ${required} друзей
                    </div>
                </div>

                <div class="task-reward">
                    <div class="reward-info">
                        <span class="reward-amount">+${task.reward.amount} ⭐</span>
                    </div>
                </div>

                <button class="task-action-btn ${isCompleted ? 'completed' : canComplete ? 'available' : 'locked'}" 
                        onclick="${isCompleted || !canComplete ? '' : `handleTaskComplete('${task.id}', 'friends')`}"
                        ${isCompleted || !canComplete ? 'disabled' : ''}>
                    <span class="btn-icon">${isCompleted ? '✅' : canComplete ? '🎯' : '🔒'}</span>
                    <span class="btn-text">
                        ${isCompleted ? 'Выполнено' : canComplete ? 'Получить награду' : 'Недоступно'}
                    </span>
                </button>
            </div>
        `;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Загрузка расширенной информации о каналах с аватарками
    async loadChannelInfo(channels) {
        const enrichedChannels = [];
        
        for (const channel of channels) {
            try {
                const response = await fetch(`/api/channel-info/${channel.channel_username}`);
                if (response.ok) {
                    const data = await response.json();
                    enrichedChannels.push({
                        ...channel,
                        photo_url: data.channel.photo_url,
                        member_count: data.channel.member_count,
                        description: data.channel.description
                    });
                } else {
                    enrichedChannels.push(channel);
                }
            } catch (error) {
                console.warn(`Не удалось загрузить информацию о канале ${channel.channel_username}:`, error);
                enrichedChannels.push(channel);
            }
        }
        
        return enrichedChannels;
    }

    renderChannelTaskItem(channel) {
        const isHot = channel.is_hot_offer && channel.hot_offer_multiplier > 1;
        const reward = Math.floor(channel.reward_stars * (channel.hot_offer_multiplier || 1));
        const hotBadge = isHot ? `<div class="hot-badge">🔥 x${channel.hot_offer_multiplier}</div>` : '';
        
        return `
            <div class="channel-task-item ${isHot ? 'hot-offer' : ''}" data-channel-id="${channel.id}">
                ${hotBadge}
                <div class="channel-avatar">
                    ${channel.photo_url ? 
                        `<img src="${channel.photo_url}" 
                             alt="${channel.channel_name}" 
                             class="channel-photo"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="channel-photo-fallback" style="display: none;">📺</div>` :
                        `<div class="channel-photo-fallback">📺</div>`
                    }
                </div>
                <div class="channel-info">
                    <div class="channel-header">
                        <div class="channel-title">${channel.channel_name}</div>
                        <div class="channel-subscribers">${this.formatSubscriberCount(channel.member_count || 0)}</div>
                    </div>
                    <div class="channel-username">@${channel.channel_username}</div>
                    ${channel.description ? `<div class="channel-description">${this.truncateText(channel.description, 60)}</div>` : ''}
                    <div class="channel-reward">
                        <span class="reward-amount">+${reward}</span>
                        <span class="reward-icon">⭐</span>
                    </div>
                    ${channel.target_subscribers ? 
                        `<div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(100, (channel.current_subscribers / channel.target_subscribers) * 100)}%"></div>
                        </div>
                        <div class="progress-text">${channel.current_subscribers}/${channel.target_subscribers} подписчиков</div>` 
                        : ''
                    }
                </div>
                <div class="channel-actions">
                    <button class="subscribe-btn" onclick="handleChannelSubscribe('${channel.id}', '${channel.channel_username}')">
                        📺 Подписаться
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
                    <div class="empty-icon">🎉</div>
                    <h3>Все задания выполнены!</h3>
                    <p>Возвращайтесь завтра за новыми заданиями</p>
                </div>
            `;
        }
        
        return `
            <div class="task-section-header">
                <div class="section-info">
                    <h3>📅 Ежедневные задания</h3>
                    <p>Выполняйте задания каждый день и получайте звезды</p>
                </div>
            </div>
            
            <div class="task-cards-grid">
                ${todayTasks.map(task => this.renderTaskCard(task, 'daily')).join('')}
            </div>
        `;
    }


    renderReferralTasks() {
        if (!TASKS_CONFIG.friends) {
            return `
                <div class="task-section-empty">
                    <div class="empty-icon">👥</div>
                    <h3>Загрузка заданий...</h3>
                    <p>Реферальные задания загружаются</p>
                </div>
            `;
        }

        const referrals = this.app.gameData.referrals || 0;
        const availableFriendTasks = TASKS_CONFIG.friends.filter(task => {
            const requiredFriends = task.required || 0;
            return referrals >= requiredFriends && !this.isTaskCompleted(task.id);
        });
        
        return `
            <div class="task-section-header">
                <div class="section-info">
                    <h3>👥 Приглашение друзей</h3>
                    <p>Приглашайте друзей и получайте награды за активность</p>
                </div>
                <div class="friends-counter">
                    <span class="friends-count">${referrals}</span>
                    <span class="friends-label">друзей</span>
                </div>
            </div>

            <div class="referral-link-card task-card">
                <div class="referral-header">
                    <div class="referral-icon">🔗</div>
                    <div class="referral-info">
                        <h4>Пригласите друзей</h4>
                        <p>Поделитесь ссылкой и получайте 100 ⭐ за каждого друга</p>
                    </div>
                </div>
                
                <div class="referral-link-input">
                    <input type="text" id="referral-link" value="${this.getReferralLink()}" readonly>
                    <button class="copy-link-btn" onclick="copyReferralLink()">
                        <span class="btn-icon">📋</span>
                    </button>
                </div>
            </div>
            
            ${availableFriendTasks.length > 0 ? `
                <div class="task-cards-grid">
                    ${availableFriendTasks.map(task => this.renderReferralCard(task)).join('')}
                </div>
            ` : `
                <div class="task-section-empty">
                    <div class="empty-icon">🎯</div>
                    <h3>Продолжайте приглашать!</h3>
                    <p>Пригласите больше друзей для новых заданий</p>
                </div>
            `}
        `;
    }

    renderHotOffers() {
        if (!TASKS_CONFIG.active) {
            return '<div class="empty-state">Горячие предложения загружаются...</div>';
        }

        const activeTasks = TASKS_CONFIG.active.filter(task => !this.isTaskCompleted(task.id));
        
        if (activeTasks.length === 0) {
            return '<div class="empty-state">Все активные задания выполнены! 🌟</div>';
        }

        return activeTasks.map(task => this.renderTaskItem(task, 'active')).join('');
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


    attachTaskEventListeners() {
        // Глобальные обработчики для системы заданий
        window.handleChannelSubscribe = (channelId, channelUsername) => {
            this.handleChannelSubscribe(channelId, channelUsername);
        };

        window.copyReferralLink = () => {
            this.copyReferralLink();
        };

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
                console.warn('Нет ID пользователя для синхронизации задания');
                return;
            }

            const response = await fetch('/api/action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'task_completed',
                    userId: userId,
                    data: {
                        taskId: taskId,
                        id: taskId,
                        type: this.currentTab || 'active',
                        reward: task.reward || { type: 'stars', amount: 0 }
                    }
                })
            });

            if (response.ok) {
                console.log(`✅ Задание ${taskId} синхронизировано с сервером`);
            } else {
                console.error(`❌ Ошибка синхронизации задания ${taskId}:`, response.status);
            }
        } catch (error) {
            console.error('❌ Ошибка синхронизации задания с сервером:', error);
        }
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
            const referrals = this.app.gameData.referrals || 0;
            const friendTasks = TASKS_CONFIG.friends || [];
            friendTasks.forEach(task => {
                const requiredFriends = task.required || 0;
                if (referrals >= requiredFriends && !completedTasks.includes(task.id)) {
                    count++;
                }
            });
            
            // Активные задания
            (TASKS_CONFIG.active || []).forEach(task => {
                if (!completedTasks.includes(task.id)) {
                    count++;
                }
            });

            // Каналы (примерно)
            count += Math.max(0, 5 - completedTasks.filter(id => id.includes('channel')).length);
            
            return count;
        } catch (error) {
            console.error('Ошибка подсчета доступных заданий:', error);
            return 0;
        }
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

// Глобальные функции для обработки подписок
window.handleChannelSubscribe = async function(channelId, channelUsername) {
    try {
        const channelUrl = `https://t.me/${channelUsername}`;
        
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(channelUrl);
        } else if (window.app?.tg) {
            window.app.tg.openTelegramLink(channelUrl);
        } else {
            window.open(channelUrl, '_blank');
        }
        
        // Показываем уведомление
        if (window.app) {
            window.app.showStatusMessage('Перейдите в канал и подпишитесь, затем нажмите "Проверить подписки"', 'info');
        } else {
            alert('Перейдите в канал и подпишитесь, затем нажмите "Проверить подписки"');
        }
    } catch (error) {
        console.error('Ошибка открытия канала:', error);
        alert('Не удалось открыть канал. Попробуйте вручную перейти на @' + channelUsername);
    }
};

window.checkAllSubscriptions = async function() {
    try {
        // Пытаемся получить userId из разных источников
        let userId = null;
        
        if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
            userId = window.Telegram.WebApp.initDataUnsafe.user.id;
        } else if (window.app?.tg?.initDataUnsafe?.user?.id) {
            userId = window.app.tg.initDataUnsafe.user.id;
        } else {
            // Для тестирования можно использовать демо ID
            userId = 'demo';
        }
        
        if (!userId) {
            alert('Ошибка: не удалось получить данные пользователя');
            return;
        }
        
        // Показываем индикатор загрузки
        const button = document.querySelector('.check-all-subscriptions-btn');
        const originalText = button.textContent;
        button.textContent = '⏳ Проверяем...';
        button.disabled = true;
        
        const response = await fetch('/api/check-user-subscriptions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            let message = `Проверка завершена!\n`;
            message += `Новых подписок: ${data.newSubscriptions}\n`;
            if (data.totalReward > 0) {
                message += `Получено звезд: ${data.totalReward} ⭐`;
            }
            
            alert(message);
            
            // Обновляем данные игры и интерфейс
            if (window.app && data.totalReward > 0) {
                window.app.gameData.stars = (window.app.gameData.stars || 0) + data.totalReward;
                window.app.saveGameData();
                window.app.updateUI();
            }
            
            // Перезагружаем задания
            if (window.app?.currentScreen?.loadTasks) {
                await window.app.currentScreen.loadTasks();
            }
        } else {
            alert('Ошибка проверки подписок: ' + data.error);
        }
        
    } catch (error) {
        console.error('Ошибка проверки подписок:', error);
        alert('Произошла ошибка при проверке подписок');
    } finally {
        // Восстанавливаем кнопку
        const button = document.querySelector('.check-all-subscriptions-btn');
        if (button) {
            button.textContent = '🔍 Проверить все подписки';
            button.disabled = false;
        }
    }
};
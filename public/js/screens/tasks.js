// public/js/screens/tasks.js - Tasks Screen Module (FIXED COPY FUNCTION)

import { TASKS_CONFIG } from '../config.js';

export class TasksScreen {
    constructor(app) {
        this.app = app;
        this.currentTab = 'referral';
        this.channels = [];
        this.dailyTasks = [];
        this.hotOffers = [];
        this.userBlocked = false;
        
        // Устанавливаем глобальную ссылку для доступа к методам
        window.tasksScreen = this;
        console.log('✅ Глобальная ссылка window.tasksScreen установлена');
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

                <!-- Tabs - только Рефералы и Активные -->
                <div class="task-tabs-profile">
                    <button class="task-tab-profile active" data-tab="referral">
                        <div class="tab-text">Рефералы</div>
                    </button>
                    <button class="task-tab-profile" data-tab="hot">
                        <div class="tab-text">Активные</div>
                    </button>
                </div>

                <!-- Content sections -->
                <div class="task-content">
                    <div id="referral-tasks" class="task-section active">
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
        // Устанавливаем глобальную ссылку еще раз на всякий случай
        window.tasksScreen = this;
        
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

    // ===================== МЕТОДЫ РЕНДЕРИНГА =====================

    renderReferralTasks() {
        const referralLink = this.getReferralLink();
        const friendsInvited = this.app.gameData.friendsInvited || 0;

        return `
            <div class="task-section-header">
                <div class="section-info">
                    <h3>👥 Приглашай друзей</h3>
                    <p>Поделитесь ссылкой и получайте 20 ⭐ за каждого друга</p>
                </div>
            </div>
            
            <div class="referral-link-container">
                <div class="referral-info">
                    <h4>Твоя реферальная ссылка:</h4>
                    <div class="link-input-group">
                        <input type="text" id="referral-link" value="${referralLink}" readonly>
                        <button class="copy-btn-full" onclick="window.tasksScreen.copyReferralLink()">
                            📋 Копировать
                        </button>
                    </div>
                    <p class="referral-stats">Приглашено друзей: <strong>${friendsInvited}</strong></p>
                </div>
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

    renderActiveTaskCard(task) {
        const isCompleted = this.isTaskCompleted(task.id);
        
        return `
            <div class="task-card active-task-new ${isCompleted ? 'completed' : ''}">
                <div class="task-content-grid">
                    <div class="task-left">
                        <div class="task-title">${task.name}</div>
                        <div class="task-reward-info">+${task.reward.amount} ⭐</div>
                    </div>
                    <div class="task-right">
                        <div class="task-desc">${task.description}</div>
                        <div class="task-action">
                            ${isCompleted ? 
                                `<div class="task-completed-status">
                                    ✅ Выполнено
                                </div>` :
                                `<button class="task-complete-btn" onclick="window.tasksScreen.completeTask('${task.id}', 'active')">
                                    Выполнить
                                </button>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ===================== ИСПРАВЛЕННАЯ ФУНКЦИЯ КОПИРОВАНИЯ =====================

    copyReferralLink() {
        console.log('🔗 Попытка копирования реферальной ссылки');
        
        const linkInput = document.getElementById('referral-link');
        if (!linkInput) {
            console.error('❌ Поле ссылки не найдено');
            this.showMessage('Ошибка: поле ссылки не найдено', 'error');
            return;
        }

        // Получаем актуальную ссылку
        const actualLink = this.getReferralLink();
        console.log('🔗 Копируем ссылку:', actualLink);
        
        // Обновляем значение в поле
        linkInput.value = actualLink;

        // Выбираем весь текст
        linkInput.focus();
        linkInput.select();
        linkInput.setSelectionRange(0, 99999); // Для мобильных устройств

        try {
            // Пробуем современный API
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(actualLink).then(() => {
                    console.log('✅ Ссылка скопирована через Clipboard API');
                    this.showMessage('✅ Ссылка скопирована!', 'success');
                }).catch(err => {
                    console.warn('⚠️ Clipboard API не сработал, используем fallback:', err);
                    this.fallbackCopy(actualLink);
                });
            } else {
                // Fallback для старых браузеров
                console.log('ℹ️ Используем fallback метод копирования');
                this.fallbackCopy(actualLink);
            }
        } catch (err) {
            console.error('❌ Ошибка копирования:', err);
            this.showMessage('❌ Ошибка копирования', 'error');
        }
    }

    fallbackCopy(text) {
        try {
            // Создаем временный элемент
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                console.log('✅ Ссылка скопирована через execCommand');
                this.showMessage('✅ Ссылка скопирована!', 'success');
            } else {
                console.error('❌ execCommand не сработал');
                this.showMessage('❌ Не удалось скопировать', 'error');
            }
        } catch (err) {
            console.error('❌ Ошибка fallback копирования:', err);
            this.showMessage('❌ Ошибка копирования', 'error');
        }
    }

    showMessage(message, type = 'info') {
        if (this.app && this.app.showStatusMessage) {
            this.app.showStatusMessage(message, type);
        } else {
            // Fallback - простой alert
            alert(message);
        }
    }

    // ===================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====================

    attachTaskEventListeners() {
        // Убеждаемся что глобальная ссылка установлена
        window.tasksScreen = this;
        
        // Глобальные функции для работы с заданиями
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

    async loadChannelInfo(channels) {
        // Добавляем информацию об аватарах каналов
        return channels.map(channel => ({
            ...channel,
            avatar_url: channel.photo_url || null
        }));
    }

    getReferralLink() {
        if (!this.app.tg?.initDataUnsafe?.user?.id) {
            return 'https://t.me/kosmetichkalottery_bot?start=ref_demo';
        }

        const userId = this.app.tg.initDataUnsafe.user.id;
        return `https://t.me/kosmetichkalottery_bot?start=ref_${userId}`;
    }

    // ===================== ЛОГИКА ВЫПОЛНЕНИЯ ЗАДАНИЙ =====================

    completeTask(taskId, category) {
        console.log(`🎯 Выполнение задания: ${taskId} (${category})`);
        
        // Проверяем не выполнено ли уже
        if (this.isTaskCompleted(taskId)) {
            this.showMessage('Задание уже выполнено', 'info');
            return;
        }

        const task = this.findTask(taskId, category);
        if (!task) {
            console.error('❌ Задание не найдено:', taskId);
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
                this.showMessage(`Получено ${task.reward.amount} ⭐!`, 'success');
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
            this.showMessage('Спасибо за оценку! 🌟', 'success');
        }
    }

    async checkChannelSubscription(channelId, channelUsername) {
        try {
            const userId = this.app.tg?.initDataUnsafe?.user?.id;
            if (!userId) {
                this.showMessage('Ошибка: данные пользователя недоступны', 'error');
                return;
            }

            this.showMessage('Проверяем подписку...', 'info');

            // Проверяем подписку на канал
            const response = await fetch('/api/subscription/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, channelUsername })
            });

            const result = await response.json();

            if (!result.isSubscribed) {
                this.showMessage('Подписка не найдена. Проверьте, что вы подписались на канал', 'error');
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

            const completeResult = await completeResponse.json();

            if (completeResult.success) {
                this.app.addStars(completeResult.reward);
                this.showMessage(`Получено ${completeResult.reward} ⭐!`, 'success');
                
                // Обновляем интерфейс
                await this.loadTasks();
                
                // Haptic feedback
                if (this.app.tg?.HapticFeedback) {
                    this.app.tg.HapticFeedback.notificationOccurred('success');
                }
            } else {
                this.showMessage(completeResult.error || 'Ошибка выполнения задания', 'error');
            }

        } catch (error) {
            console.error('❌ Ошибка проверки подписки:', error);
            this.showMessage('Ошибка проверки подписки', 'error');
        }
    }

    isTaskCompleted(taskId) {
        return (this.app.gameData.completedTasks || []).includes(taskId);
    }

    findTask(taskId, category) {
        try {
            switch (category) {
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

    getCompletedTasksCount() {
        return (this.app.gameData.completedTasks || []).length;
    }

    getTotalTasksCount() {
        try {
            return (TASKS_CONFIG.friends?.length || 0) + 
                   (TASKS_CONFIG.active?.length || 0);
        } catch (error) {
            console.error('Ошибка подсчета общего количества заданий:', error);
            return 0;
        }
    }

    getAvailableTasksCount() {
        try {
            const completedTasks = this.app.gameData.completedTasks || [];
            let count = 0;
            
            // Задания с друзьями
            count += (TASKS_CONFIG.friends || []).filter(task => !completedTasks.includes(task.id)).length;
            
            // Активные задания
            count += (TASKS_CONFIG.active || []).filter(task => !completedTasks.includes(task.id)).length;
            
            return count;
        } catch (error) {
            console.error('Ошибка подсчета доступных заданий:', error);
            return 0;
        }
    }

    checkDailyReset() {
        // Для рефералов и активных заданий сброс не нужен
        return;
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

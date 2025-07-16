// public/js/screens/tasks.js - Tasks Screen Module (FIXED VERSION)

import { TASKS_CONFIG } from '../config.js';

export class TasksScreen {
    constructor(app) {
        this.app = app;
        this.currentTab = 'daily';
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
                    <button class="task-tab active" data-tab="daily">📅 Ежедневные</button>
                    <button class="task-tab" data-tab="friends">👥 Друзья</button>
                    <button class="task-tab" data-tab="active">⚡ Активные</button>
                    <button class="task-tab" data-tab="completed">✅ Выполненные</button>
                </div>

                <div id="daily-tasks" class="task-section active">
                    ${this.renderDailyTasks()}
                </div>

                <div id="friends-tasks" class="task-section">
                    ${this.renderFriendsTasks()}
                </div>

                <div id="active-tasks" class="task-section">
                    ${this.renderActiveTasks()}
                </div>

                <div id="completed-tasks-section" class="task-section">
                    ${this.renderCompletedTasks()}
                </div>
            </div>
        `;
    }

    init() {
        this.setupEventListeners();
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
        
        const sectionId = tabName === 'completed' ? 'completed-tasks-section' : `${tabName}-tasks`;
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Refresh content
        this.refreshTabContent(tabName);
    }

    refreshTabContent(tabName) {
        const sectionId = tabName === 'completed' ? 'completed-tasks-section' : `${tabName}-tasks`;
        const container = document.getElementById(sectionId);
        if (!container) return;
        
        switch (tabName) {
            case 'daily':
                container.innerHTML = this.renderDailyTasks();
                break;
            case 'friends':
                container.innerHTML = this.renderFriendsTasks();
                break;
            case 'active':
                container.innerHTML = this.renderActiveTasks();
                break;
            case 'completed':
                container.innerHTML = this.renderCompletedTasks();
                break;
        }
        
        // Re-attach event listeners for the new content
        this.attachTaskEventListeners();
    }

    renderDailyTasks() {
        if (!TASKS_CONFIG.daily) return '<div class="empty-state">Ежедневные задания загружаются...</div>';
        
        const tasks = TASKS_CONFIG.daily.filter(task => !this.isTaskCompleted(task.id));
        
        if (tasks.length === 0) {
            return '<div class="empty-state">Все ежедневные задания выполнены! 🎉</div>';
        }
        
        return tasks.map(task => this.renderTaskItem(task, 'daily')).join('');
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
        // Make handleTaskComplete available globally
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
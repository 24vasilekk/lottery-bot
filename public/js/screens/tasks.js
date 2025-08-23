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
        
        // ИСПРАВЛЕНО: Инициализируем структуры данных если их нет
        if (!this.app.gameData.taskStatuses) {
            this.app.gameData.taskStatuses = {};
        }
        if (!this.app.gameData.completedTasks) {
            this.app.gameData.completedTasks = [];
        }
        // ИСПРАВЛЕНО: НЕ принудительно устанавливаем звезды в 0
        // Баланс должен загружаться ТОЛЬКО из БД через синхронизацию
        if (this.app.gameData.stars === undefined || this.app.gameData.stars === null) {
            console.log('⚠️ Баланс еще не загружен, ожидаем синхронизации с БД');
            // НЕ устанавливаем 0 - оставляем undefined до синхронизации
        }
        
        console.log('📊 Инициализация заданий. Текущие данные:', {
            stars: this.app.gameData.stars,
            completedTasks: this.app.gameData.completedTasks,
            taskStatuses: this.app.gameData.taskStatuses
        });
        
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
        const friendsInvited = this.getActualReferralsCount();

        return `
            <!-- ПОЛНОШИРИННЫЙ БЛОК РЕФЕРАЛЬНОЙ ССЫЛКИ -->
            <div class="referral-full-width-block">
                <h3 class="referral-center-title">Твоя реферальная ссылка:</h3>
                
                <div class="referral-link-wrapper">
                    <input type="text" 
                           id="referral-link" 
                           class="referral-input-full" 
                           value="${referralLink}" 
                           readonly>
                    <button class="copy-btn-referral" onclick="window.tasksScreen.copyReferralLink()">
                        📋 Копировать
                    </button>
                </div>

                <div class="friends-counter">
                    <span class="friends-number">${friendsInvited}</span>
                    <span class="friends-text">Приглашено друзей</span>
                </div>
            </div>

            <!-- Дополнительная информация -->
            <div class="task-section-header">
                <div class="section-info">
                    <h3>👥 Приглашай друзей</h3>
                    <p>Поделитесь ссылкой и получайте 10 ⭐ за каждого друга
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

        // ИСПРАВЛЕНО: Показываем ВСЕ активные задания, НЕ фильтруем по выполненности
        const activeTasks = TASKS_CONFIG.active;
        
        if (activeTasks.length === 0) {
            return `
                <div class="task-section-empty">
                    <div class="empty-icon">🔥</div>
                    <h3>Нет активных заданий</h3>
                    <p>Следите за новыми заданиями</p>
                </div>
            `;
        }

        console.log(`📋 Отображаем ${activeTasks.length} активных заданий`);

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
        const taskStatus = this.getTaskStatus(task.id);
        const isCompleted = this.isTaskCompleted(task.id);
        
        console.log(`🎨 Рендеринг карточки задания ${task.id}: статус=${taskStatus}, выполнено=${isCompleted}`);
        
        return `
            <div class="task-card active-task-new ${taskStatus === 'completed' ? 'completed' : ''}" data-task-id="${task.id}" data-status="${taskStatus}">
                <div class="task-content-grid">
                    <div class="task-left">
                        <div class="task-title">${task.name}</div>
                        <div class="task-reward-info">+${task.reward.amount} ⭐</div>
                    </div>
                    <div class="task-right">
                        <div class="task-desc">${task.description}</div>
                        <div class="task-action">
                            ${this.renderTaskButton(task, taskStatus)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTaskButton(task, status) {
        console.log(`🔘 Рендеринг кнопки для задания ${task.id}, статус: ${status}`);
        
        switch (status) {
            case 'completed':
                return `<div class="task-completed-status">
                    ✅ Сделано
                </div>`;
            
            case 'checking':
                return `<button class="task-checking-btn" disabled>
                    ⏳ Проверка...
                </button>`;
            
            case 'ready_to_check':
                return `<button class="task-ready-btn" onclick="window.tasksScreen.performTaskCheckById('${task.id}')">
                    🔍 Проверить
                </button>`;
            
            case 'pending':
            default:
                return `<button class="task-complete-btn" onclick="window.tasksScreen.startTaskCheck('${task.id}', 'active')">
                    Выполнить
                </button>`;
        }
    }

    // Вспомогательный метод для вызова из onclick
    performTaskCheckById(taskId) {
        const task = this.findTask(taskId, 'active');
        if (task) {
            this.performTaskCheck(taskId, task);
        } else {
            console.error('❌ Задание не найдено для проверки:', taskId);
        }
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
                    this.updateCopyButtonSuccess();
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
                this.updateCopyButtonSuccess();
            } else {
                console.error('❌ execCommand не сработал');
                this.showMessage('❌ Не удалось скопировать', 'error');
            }
        } catch (err) {
            console.error('❌ Ошибка fallback копирования:', err);
            this.showMessage('❌ Ошибка копирования', 'error');
        }
    }

    updateCopyButtonSuccess() {
        const btn = document.querySelector('.copy-btn-referral');
        if (!btn) return;

        const originalText = btn.innerHTML;
        const originalStyle = btn.style.background;

        btn.innerHTML = '✅ Скопировано!';
        btn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = originalStyle;
        }, 2000);
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
                
                // Загружаем данные пользователя с сервера включая статусы заданий
                try {
                    const userResponse = await fetch(`/api/user/${userId}`);
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        
                        // Восстанавливаем статусы заданий из базы данных
                        if (userData.task_statuses) {
                            this.app.gameData.taskStatuses = userData.task_statuses;
                        }
                        if (userData.completed_tasks) {
                            this.app.gameData.completedTasks = userData.completed_tasks;
                        }
                        if (userData.stars !== undefined) {
                            this.app.gameData.stars = userData.stars;
                        }
                        
                        console.log('📥 Данные пользователя загружены с сервера:', userData);
                        
                        // Сохраняем восстановленные данные локально
                        this.app.saveGameData();
                        
                        // Обновляем отображение
                        if (this.app.updateStarsDisplay) {
                            this.app.updateStarsDisplay();
                        }
                    }
                } catch (userLoadError) {
                    console.warn('⚠️ Ошибка загрузки данных пользователя:', userLoadError);
                }
                
                // Загружаем задания каналов
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

    // ===================== ЛОГИКА ВЫПОЛНЕНИЯ ЗАДАНИЙ (ОБНОВЛЕННАЯ) =====================

    getTaskStatus(taskId) {
        if (!this.app.gameData.taskStatuses) {
            this.app.gameData.taskStatuses = {};
        }
        
        return this.app.gameData.taskStatuses[taskId] || 'pending';
    }

    setTaskStatus(taskId, status) {
        if (!this.app.gameData.taskStatuses) {
            this.app.gameData.taskStatuses = {};
        }
        
        this.app.gameData.taskStatuses[taskId] = status;
        this.app.saveGameData();
        console.log(`📊 Статус задания ${taskId} изменен на: ${status}`);
    }

    async startTaskCheck(taskId, category) {
        console.log(`🎯 Начинаем проверку задания: ${taskId} (${category})`);
        
        const task = this.findTask(taskId, category);
        if (!task) {
            console.error('❌ Задание не найдено:', taskId);
            return;
        }

        // ИСПРАВЛЕНО: Сначала открываем канал, если это задание с подпиской
        if (task.type === 'channel_subscription' && task.url) {
            console.log(`🔗 Открываем канал: ${task.url}`);
            
            // Открываем ссылку на канал
            if (this.app.tg && this.app.tg.openLink) {
                this.app.tg.openLink(task.url);
            } else {
                window.open(task.url, '_blank');
            }
            
            // Показываем инструкцию пользователю
            this.showMessage('📱 Подпишитесь на канал и нажмите "Проверить" когда будете готовы', 'info');
            
            // Меняем кнопку на "Проверить"
            this.setTaskStatus(taskId, 'ready_to_check');
            this.refreshTabContent(this.currentTab);
            return;
        }

        // Если это не задание с подпиской или уже готов к проверке
        this.performTaskCheck(taskId, task);
    }

    async performTaskCheck(taskId, task) {
        // Меняем статус на "проверка"
        this.setTaskStatus(taskId, 'checking');
        this.refreshTabContent(this.currentTab);
        
        // Показываем что идет проверка
        this.showMessage('🔍 Проверяем выполнение задания...', 'info');

        // Небольшая задержка для визуального эффекта
        setTimeout(async () => {
            try {
                // Проверяем выполнение задания
                const checkResult = await this.checkTaskCompletion(task);
                
                if (checkResult.success) {
                    // Задание выполнено успешно
                    this.setTaskStatus(taskId, 'completed');
                    
                    // Выдаем награду только если еще не выдавали
                    if (!this.isTaskCompleted(taskId)) {
                        this.addTaskToCompleted(taskId);
                        
                        // ИСПРАВЛЕНО: правильное начисление звезд
                        const rewardAmount = await this.giveTaskReward(task);
                        this.showMessage(`🎉 Задание выполнено! Получено ${rewardAmount} ⭐!`, 'success');
                        
                        console.log(`✅ Задание ${taskId} выполнено, начислено ${rewardAmount} звезд`);
                    } else {
                        this.showMessage('✅ Задание уже выполнено ранее', 'info');
                    }
                    
                    // Вибрация при успехе
                    if (this.app.tg?.HapticFeedback) {
                        this.app.tg.HapticFeedback.notificationOccurred('success');
                    }
                } else {
                    // Задание не выполнено
                    this.setTaskStatus(taskId, task.type === 'channel_subscription' ? 'ready_to_check' : 'pending');
                    this.showMessage(checkResult.error || 'Вы не выполнили задание. Подпишитесь на канал и попробуйте снова.', 'error');
                    
                    // Вибрация при ошибке
                    if (this.app.tg?.HapticFeedback) {
                        this.app.tg.HapticFeedback.notificationOccurred('error');
                    }
                }
            } catch (error) {
                console.error('❌ Ошибка проверки задания:', error);
                this.setTaskStatus(taskId, 'pending');
                this.showMessage('❌ Ошибка проверки задания. Попробуйте позже.', 'error');
            }

            // Обновляем интерфейс
            this.refreshTabContent(this.currentTab);
            this.updateTaskCounter();
        }, 1000); // Задержка 1 секунда для показа состояния "Проверка"
    }

    async checkTaskCompletion(task) {
        try {
            const userId = this.app.tg?.initDataUnsafe?.user?.id;
            if (!userId) {
                return { success: false, error: 'Данные пользователя недоступны' };
            }

            // Если задание связано с подпиской на канал
            if (task.type === 'channel_subscription' && task.channelUsername) {
                return await this.checkChannelSubscriptionStatus(userId, task.channelUsername);
            }
            
            // Для других типов заданий (без подписки на канал)
            if (task.type === 'external_action' && task.url) {
                // Открываем ссылку для внешних действий (соцсети, оценки и т.д.)
                if (this.app.tg?.openLink) {
                    this.app.tg.openLink(task.url);
                } else {
                    window.open(task.url, '_blank');
                }
                
                // Для внешних заданий считаем выполненными (нет автоматической проверки)
                return { success: true };
            }

            // По умолчанию считаем выполненным
            return { success: true };
        } catch (error) {
            console.error('❌ Ошибка проверки выполнения задания:', error);
            return { success: false, error: 'Ошибка проверки задания' };
        }
    }

    async checkChannelSubscriptionStatus(userId, channelUsername) {
        try {
            console.log(`🔍 Проверяем подписку пользователя ${userId} на канал ${channelUsername}`);
            
            const response = await fetch('/api/check-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: userId,
                    channelUsername: channelUsername
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.isSubscribed) {
                console.log('✅ Пользователь подписан на канал');
                return { success: true };
            } else {
                console.log('❌ Пользователь не подписан на канал');
                return { 
                    success: false, 
                    error: result.error || 'Вы не подписались на канал. Подпишитесь и попробуйте снова.' 
                };
            }
        } catch (error) {
            console.error('❌ Ошибка проверки подписки:', error);
            return { 
                success: false, 
                error: 'Ошибка проверки подписки. Попробуйте позже.' 
            };
        }
    }

    addTaskToCompleted(taskId) {
        if (!this.app.gameData.completedTasks) {
            this.app.gameData.completedTasks = [];
        }
        
        if (!this.app.gameData.completedTasks.includes(taskId)) {
            this.app.gameData.completedTasks.push(taskId);
            this.app.saveGameData();
            console.log(`📝 Задание ${taskId} добавлено в выполненные`);
        }
    }

    async giveTaskReward(task) {
        if (!task.reward || task.reward.type !== 'stars') {
            return 0;
        }

        const rewardAmount = task.reward.amount;
        
        // ИСПРАВЛЕНО: правильное начисление звезд с проверками
        const currentStars = this.app.gameData.stars || 0;
        const newStars = currentStars + rewardAmount;
        
        console.log(`💰 Начисление звезд: ${currentStars} + ${rewardAmount} = ${newStars}`);
        
        // ИСПРАВЛЕНО: НЕ обновляем баланс локально - только сервер!
        console.log(`⭐ Награда за задание: ${rewardAmount} звезд. Ожидаем подтверждения сервера...`);
        
        // Локальное начисление удалено - сервер сам обновит баланс через updateUserData
        
        console.log(`📊 Общие статистики: баланс=${newStars}, всего заработано=${this.app.gameData.total_stars_earned}`);
        
        // Сохраняем данные локально
        this.app.saveGameData();
        
        // Обновляем отображение звезд в интерфейсе
        this.updateStarsDisplayImmediate();
        
        // Отправляем данные на сервер асинхронно
        try {
            await this.syncUserDataWithServer();
            console.log(`✅ Звезды синхронизированы с сервером: ${newStars}`);
        } catch (error) {
            console.warn('⚠️ Ошибка синхронизации с сервером:', error);
            // Не прерываем процесс из-за ошибки синхронизации
        }
        
        return rewardAmount;
    }

    updateStarsDisplayImmediate() {
        // Немедленно обновляем отображение звезд в интерфейсе
        try {
            if (this.app.updateStarsDisplay) {
                this.app.updateStarsDisplay();
            }
            
            // Обновляем все элементы с звездами на странице
            const starsElements = document.querySelectorAll('[data-stars], .stars-count, .user-stars, .mega-stars span');
            starsElements.forEach(el => {
                if (el) {
                    el.textContent = this.app.gameData.stars;
                }
            });
            
            // Обновляем заголовок экрана если есть
            const headerStars = document.querySelector('.tasks-header-profile .stars, .profile-header .stars');
            if (headerStars) {
                headerStars.textContent = this.app.gameData.stars;
            }
            
            console.log(`🎨 Обновлено отображение звезд в интерфейсе: ${this.app.gameData.stars}`);
        } catch (error) {
            console.warn('⚠️ Ошибка обновления отображения звезд:', error);
        }
    }

    async syncUserDataWithServer() {
        try {
            const userId = this.app.tg?.initDataUnsafe?.user?.id;
            if (!userId) {
                console.warn('Нет данных пользователя для синхронизации');
                return;
            }

            const response = await fetch('/api/update-user-stars', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    stars: this.app.gameData.stars,
                    completedTasks: this.app.gameData.completedTasks || [],
                    taskStatuses: this.app.gameData.taskStatuses || {}
                })
            });

            if (response.ok) {
                console.log('✅ Данные пользователя синхронизированы с сервером');
            } else {
                console.warn('⚠️ Ошибка синхронизации с сервером:', response.status);
            }
        } catch (error) {
            console.warn('⚠️ Ошибка отправки данных на сервер:', error);
        }
    }

    // ===================== СТАРЫЙ МЕТОД COMPLETETASK (ОСТАВЛЕН ДЛЯ СОВМЕСТИМОСТИ) =====================

    completeTask(taskId, category) {
        console.log(`🎯 Перенаправление на новый метод: ${taskId} (${category})`);
        // Перенаправляем на новый метод
        return this.startTaskCheck(taskId, category);
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
                // ИСПРАВЛЕНО: НЕ добавляем звезды локально - сервер уже начислил!
                console.log(`⭐ Сервер подтвердил награду: ${completeResult.reward} звезд`);
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
        const isInCompletedList = (this.app.gameData.completedTasks || []).includes(taskId);
        const taskStatus = this.getTaskStatus(taskId);
        
        // Задание считается выполненным если оно в списке выполненных И имеет статус completed
        const isCompleted = isInCompletedList && taskStatus === 'completed';
        
        console.log(`🔍 Проверка задания ${taskId}: в списке=${isInCompletedList}, статус=${taskStatus}, выполнено=${isCompleted}`);
        
        return isCompleted;
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

    // ДОБАВИТЬ в класс TasksScreen:
    getActualReferralsCount() {
        // Пытаемся получить самые актуальные данные
        const referrals = this.app.gameData.referrals || 0;
        console.log('📊 Актуальное количество рефералов в заданиях:', referrals);
        return referrals;
    }

    // Метод для принудительного обновления данных
    async forceUpdateData() {
        const userId = this.app.tg?.initDataUnsafe?.user?.id;
        if (!userId) return;
        
        try {
            const response = await fetch(`/api/user/${userId}`);
            if (response.ok) {
                const userData = await response.json();
                this.app.updateUserData(userData);
                console.log('✅ Данные заданий принудительно обновлены');
            }
        } catch (error) {
            console.warn('⚠️ Ошибка принудительного обновления:', error);
        }
    }

    checkDailyReset() {
        // Для рефералов и активных заданий сброс не нужен
        return;
    }

    updateTaskCounter() {
        try {
            // Обновляем счетчик заданий в навигации
            if (this.app.navigation) {
                const completedCount = this.getCompletedTasksCount();
                const totalTasks = this.getTotalTasksCount();
                
                console.log(`📊 Обновление счетчика: ${completedCount}/${totalTasks}`);
                
                // Обновляем бэджи навигации если метод доступен
                if (this.app.navigation.updateBadges) {
                    this.app.navigation.updateBadges();
                }
            }
            
            // Обновляем элементы на странице если они есть
            const completedCountEl = document.getElementById('completed-tasks-count');
            const totalCountEl = document.getElementById('total-tasks-count');
            
            if (completedCountEl) {
                completedCountEl.textContent = this.getCompletedTasksCount();
            }
            
            if (totalCountEl) {
                totalCountEl.textContent = this.getTotalTasksCount();
            }
        } catch (error) {
            console.error('❌ Ошибка обновления счетчика:', error);
        }
    }
}

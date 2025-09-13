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

    // Форматирование оставшегося времени
    formatTimeRemaining(endDate) {
        if (!endDate) return null;
        
        const end = new Date(endDate);
        const now = new Date();
        const diff = end - now;
        
        if (diff <= 0) return 'Истекло';
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
            return `${days}д ${hours}ч`;
        }
        if (hours > 0) {
            return `${hours}ч ${minutes}м`;
        }
        if (minutes > 0) {
            return `${minutes}м`;
        }
        return 'Менее минуты';
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
        console.log('🎯 [INIT] Инициализация TasksScreen...');
        console.log('🎯 [INIT] this.app существует:', !!this.app);
        console.log('🎯 [INIT] this.app.gameData существует:', !!this.app?.gameData);
        
        // Устанавливаем глобальную ссылку еще раз на всякий случай
        window.tasksScreen = this;
        
        // Проверяем что app существует
        if (!this.app) {
            console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: this.app не существует в init()');
            return;
        }
        
        // Проверяем что gameData существует
        if (!this.app.gameData) {
            console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: this.app.gameData не существует в init()');
            console.log('🔧 Создаем минимальную структуру gameData...');
            this.app.gameData = {
                stars: 0,
                taskStatuses: {},
                completedTasks: [],
                referrals: 0,
                totalSpins: 0
            };
        }
        
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
        this.startTimerUpdates();
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
        console.log(`🔄 Обновляем контент вкладки: ${tabName}`);
        
        const sectionId = `${tabName}-tasks`;
        const container = document.getElementById(sectionId);
        
        if (!container) {
            console.error(`❌ Контейнер не найден: ${sectionId}`);
            return;
        }
        
        console.log(`📋 Найден контейнер: ${sectionId}`);
        
        switch (tabName) {
            case 'referral':
                container.innerHTML = this.renderReferralTasks();
                break;
            case 'hot':
                console.log(`🔥 Рендерим горячие предложения, каналов: ${this.channels?.length || 0}`);
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
                    <p>Поделитесь ссылкой и получайте 20 ⭐ за каждого друга</p>
                </div>
            </div>
        `;
    }

    renderHotOffers() {
        // Используем динамические каналы из БД вместо статичного конфига
        if (!this.channels || this.channels.length === 0) {
            return `
                <div class="task-section-empty">
                    <div class="empty-icon">🔥</div>
                    <h3>Нет активных заданий</h3>
                    <p>Следите за новыми заданиями</p>
                </div>
            `;
        }

        // Используем каналы из базы данных
        const activeTasks = this.channels;
        
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
        // Адаптируем формат канала из БД к формату задания
        const taskId = `channel_${task.id}`;
        const taskStatus = this.getTaskStatus(taskId);
        const isCompleted = this.isTaskCompleted(taskId);
        
        console.log(`🎨 Рендеринг карточки канала ${task.channel_username}: статус=${taskStatus}, выполнено=${isCompleted}`);
        
        // Формируем объект задания из данных канала
        const channelTask = {
            id: taskId,
            type: 'subscription',
            channelUsername: task.channel_username,
            name: task.channel_name || task.channel_username,
            reward: {
                type: 'stars',
                amount: task.reward_stars || 10
            },
            description: task.is_hot_offer ? '🔥 ГОРЯЧЕЕ ПРЕДЛОЖЕНИЕ! Повышенная награда за подписку!' : 'Подпишись на канал',
            endDate: task.end_date // Добавляем дату окончания
        };
        
        const timeRemaining = this.formatTimeRemaining(task.end_date);
        
        return `
            <div class="task-card active-task-new ${taskStatus === 'completed' ? 'completed' : ''} ${task.is_hot_offer ? 'hot-offer' : ''}" data-task-id="${taskId}" data-status="${taskStatus}" ${task.end_date ? `data-end-date="${task.end_date}"` : ''}>
                <div class="task-content-grid">
                    <div class="task-left">
                        <div class="channel-header">
                            ${task.channel_avatar_url ? 
                                `<img src="${task.channel_avatar_url}" alt="Avatar" class="channel-avatar" onerror="this.style.display='none'">` : 
                                '<div class="channel-avatar-placeholder">📺</div>'
                            }
                            <div class="channel-info">
                                <div class="channel-title">${task.channel_name || task.channel_username}</div>
                                <div class="channel-username">@${task.channel_username}</div>
                            </div>
                        </div>
                        <div class="task-reward-info">+${task.reward_stars} ⭐</div>
                        ${timeRemaining ? `
                            <div class="task-timer-container">
                                <div class="timer-icon">⏰</div>
                                <div class="timer-text">${timeRemaining}</div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="task-right">
                        <div class="task-desc">
                            ${task.channel_description || channelTask.description}
                        </div>
                        <div class="task-action">
                            ${this.renderTaskButton(channelTask, taskStatus)}
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
                return `<button class="task-ready-btn" onclick="(function() { 
                    const ts = window.tasksScreen; 
                    if (ts && ts.app) {
                        console.log('[DEBUG] Проверка перед вызовом - app:', !!ts.app, 'gameData:', !!ts.app.gameData);
                        ts.performTaskCheckById('${task.id}');
                    } else {
                        console.error('[DEBUG] window.tasksScreen или app не инициализированы');
                        alert('Ошибка инициализации. Обновите страницу.');
                    }
                })()">
                    🔍 Проверить
                </button>`;
            
            case 'pending':
            default:
                return `<button class="task-complete-btn" onclick="(function() { 
                    const ts = window.tasksScreen; 
                    if (ts && ts.app && ts.app.gameData) {
                        console.log('[DEBUG] Запуск проверки - app:', !!ts.app, 'gameData:', !!ts.app.gameData);
                        ts.startTaskCheck('${task.id}', 'active');
                    } else {
                        console.error('[DEBUG] window.tasksScreen, app или gameData не инициализированы');
                        alert('Ошибка: данные приложения не загружены. Обновите страницу.');
                    }
                })()">
                    Выполнить
                </button>`;
        }
    }

    // Вспомогательный метод для вызова из onclick
    performTaskCheckById(taskId) {
        console.log(`🎯 [DEBUG] performTaskCheckById вызван для: ${taskId}`);
        console.log(`🎯 [DEBUG] this:`, this);
        console.log(`🎯 [DEBUG] this.app существует:`, !!this.app);
        console.log(`🎯 [DEBUG] this.app.gameData существует:`, !!this.app?.gameData);
        
        const task = this.findTask(taskId, 'active');
        if (task) {
            this.performTaskCheck(taskId, task);
        } else {
            console.error('❌ Задание не найдено для проверки:', taskId);
            this.showMessage('Задание не найдено', 'error');
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

    showMessage(message, type = 'info', duration) {
        if (this.app && this.app.showStatusMessage) {
            // Устанавливаем длительность в зависимости от типа сообщения
            let messageDuration = duration;
            if (!messageDuration) {
                switch (type) {
                    case 'error':
                        messageDuration = 6000; // 6 секунд для ошибок
                        break;
                    case 'success':
                        messageDuration = 4000; // 4 секунды для успеха
                        break;
                    default:
                        messageDuration = 3000; // 3 секунды по умолчанию
                }
            }
            
            this.app.showStatusMessage(message, type, messageDuration);
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
                        if (userData.task_statuses !== undefined) {
                            console.log('🔍 [ЗАГРУЗКА] task_statuses с сервера:', userData.task_statuses);
                            console.log('🔍 [ЗАГРУЗКА] Тип task_statuses:', typeof userData.task_statuses);
                            
                            // Правильная обработка: если строка - парсим JSON, если объект - используем как есть
                            let taskStatuses;
                            if (typeof userData.task_statuses === 'string') {
                                try {
                                    taskStatuses = JSON.parse(userData.task_statuses);
                                } catch (e) {
                                    console.error('❌ Ошибка парсинга task_statuses:', e);
                                    taskStatuses = {};
                                }
                            } else if (typeof userData.task_statuses === 'object' && userData.task_statuses !== null) {
                                taskStatuses = userData.task_statuses;
                            } else {
                                taskStatuses = {};
                            }
                            
                            this.app.gameData.taskStatuses = taskStatuses;
                            console.log('✅ [ЗАГРУЗКА] Установлены taskStatuses:', this.app.gameData.taskStatuses);
                        }
                        if (userData.completed_tasks !== undefined) {
                            console.log('🔍 [ЗАГРУЗКА] completed_tasks с сервера:', userData.completed_tasks);
                            console.log('🔍 [ЗАГРУЗКА] Тип completed_tasks:', typeof userData.completed_tasks);
                            
                            // Правильная обработка: если строка - парсим JSON, если массив - используем как есть
                            let completedTasks;
                            if (typeof userData.completed_tasks === 'string') {
                                try {
                                    completedTasks = JSON.parse(userData.completed_tasks);
                                } catch (e) {
                                    console.error('❌ Ошибка парсинга completed_tasks:', e);
                                    completedTasks = [];
                                }
                            } else if (Array.isArray(userData.completed_tasks)) {
                                completedTasks = userData.completed_tasks;
                            } else {
                                completedTasks = [];
                            }
                            
                            this.app.gameData.completedTasks = completedTasks;
                            console.log('✅ [ЗАГРУЗКА] Установлены completedTasks:', this.app.gameData.completedTasks);
                        }
                        if (userData.stars !== undefined) {
                            this.app.gameData.stars = userData.stars;
                        }
                        
                        console.log('📥 Данные пользователя загружены с сервера:', {
                            completedTasks: this.app.gameData.completedTasks,
                            taskStatuses: this.app.gameData.taskStatuses,
                            stars: this.app.gameData.stars
                        });
                        
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
        try {
            if (!this.app || !this.app.gameData) {
                console.error('❌ App или gameData не инициализированы');
                return;
            }
            
            // Создаем новый объект чтобы избежать readonly ошибок
            const currentStatuses = this.app.gameData.taskStatuses || {};
            const newStatuses = { ...currentStatuses };
            newStatuses[taskId] = status;
            
            // Присваиваем новый объект
            this.app.gameData.taskStatuses = newStatuses;
            this.app.saveGameData();
            console.log(`📊 Статус задания ${taskId} изменен на: ${status}`);
        } catch (error) {
            console.error('❌ Ошибка в setTaskStatus:', error);
            throw error;
        }
    }

    async startTaskCheck(taskId, category) {
        console.log(`🎯 [DEBUG] Начинаем проверку задания: ${taskId} (${category})`);
        console.log(`🎯 [DEBUG] this.app существует:`, !!this.app);
        console.log(`🎯 [DEBUG] this.app.gameData существует:`, !!this.app?.gameData);
        console.log(`🎯 [DEBUG] this.app.tg существует:`, !!this.app?.tg);
        console.log(`🎯 [DEBUG] channels загружены:`, !!this.channels && this.channels.length);
        
        try {
            if (!this.app) {
                console.error('❌ [DEBUG] App не инициализирован в startTaskCheck');
                this.showMessage('Ошибка инициализации. Обновите страницу', 'error');
                return;
            }
            
            if (!this.app.gameData) {
                console.error('❌ [DEBUG] gameData не инициализирован');
                this.showMessage('Ошибка данных игры. Обновите страницу', 'error');
                return;
            }
            
            const task = this.findTask(taskId, category);
            console.log(`🎯 [DEBUG] Найденное задание:`, task);
            
            if (!task) {
                console.error('❌ [DEBUG] Задание не найдено:', taskId, 'в категории:', category);
                console.error('❌ [DEBUG] Доступные каналы:', this.channels?.map(c => `channel_${c.id}`) || 'нет каналов');
                this.showMessage('Задание не найдено', 'error');
                return;
            }

        // ИСПРАВЛЕНО: Сначала открываем канал, если это задание с подпиской
        if (task.type === 'subscription' && task.channelUsername) {
            const channelUrl = `https://t.me/${task.channelUsername}`;
            console.log(`🔗 Открываем канал в Telegram: ${channelUrl}`);
            
            // Флаг для отслеживания успешного открытия
            let opened = false;
            
            try {
                // Открываем ссылку на канал в Telegram
                if (this.app.tg && this.app.tg.openTelegramLink) {
                    console.log('📱 Используем openTelegramLink');
                    this.app.tg.openTelegramLink(channelUrl);
                    opened = true;
                } else if (this.app.tg && this.app.tg.openLink) {
                    console.log('📱 Используем openLink');  
                    this.app.tg.openLink(channelUrl);
                    opened = true;
                } else {
                    console.log('📱 Fallback к window.open');
                    window.open(channelUrl, '_blank');
                    opened = true;
                }
            } catch (error) {
                console.warn('⚠️ Ошибка при вызове метода открытия:', error);
                // Не критично - канал мог открыться
            }
            
            // Всегда меняем статус и показываем сообщение (даже если был catch)
            // Так как методы Telegram не всегда корректно возвращают результат
            console.log('✅ Меняем статус задания на ready_to_check');
            
            // Показываем инструкцию пользователю
            this.showMessage('📱 Подпишитесь на канал и нажмите "Проверить" когда будете готовы', 'success');
            
            // Меняем кнопку на "Проверить" 
            this.setTaskStatus(taskId, 'ready_to_check');
            
            // Определяем текущую активную вкладку 
            const activeTab = document.querySelector('.task-tab-profile.active');
            const tabName = activeTab?.dataset?.tab || this.currentTab;
            console.log(`📍 Активная вкладка: ${tabName}`);
            
            // Обновляем только если это вкладка с активными заданиями
            if (tabName === 'hot') {
                this.refreshTabContent('hot');
            }
            
            return;
        }

        // Если это не задание с подпиской или уже готов к проверке
        this.performTaskCheck(taskId, task);
        
        } catch (error) {
            console.error('❌ [DEBUG] Критическая ошибка в startTaskCheck:', {
                error: error,
                message: error?.message,
                stack: error?.stack,
                taskId: taskId,
                category: category,
                appExists: !!this.app,
                gameDataExists: !!this.app?.gameData,
                tgExists: !!this.app?.tg,
                channelsLength: this.channels?.length || 0
            });
            this.showMessage(`Произошла ошибка при выполнении задания: ${error?.message || 'неизвестная ошибка'}`, 'error');
        }
    }

    async performTaskCheck(taskId, task) {
        console.log(`🔍 [DEBUG] Начинаем performTaskCheck для задания: ${taskId}`);
        console.log(`🔍 [DEBUG] Объект задания:`, task);
        
        try {
            // Меняем статус на "проверка"
            console.log(`🔍 [DEBUG] Устанавливаем статус 'checking' для задания ${taskId}`);
            this.setTaskStatus(taskId, 'checking');
            this.refreshTabContent(this.currentTab);
            
            // Показываем что идет проверка
            this.showMessage('🔍 Проверяем выполнение задания...', 'info');

            // Небольшая задержка для визуального эффекта
            setTimeout(async () => {
                try {
                    console.log(`🔍 [DEBUG] Проверяем выполнение задания...`);
                    // Проверяем выполнение задания
                    const checkResult = await this.checkTaskCompletion(task);
                    console.log(`🔍 [DEBUG] Результат проверки:`, checkResult);
                
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
                    console.error('❌ [DEBUG] Ошибка в setTimeout performTaskCheck:', {
                        error: error,
                        message: error?.message,
                        stack: error?.stack,
                        taskId: taskId
                    });
                    this.setTaskStatus(taskId, 'pending');
                    this.showMessage(`❌ Ошибка проверки задания: ${error?.message || 'неизвестная ошибка'}`, 'error');
                }

                // Обновляем интерфейс
                this.refreshTabContent(this.currentTab);
                this.updateTaskCounter();
            }, 1000); // Задержка 1 секунда для показа состояния "Проверка"
            
        } catch (error) {
            console.error('❌ [DEBUG] Ошибка в performTaskCheck:', {
                error: error,
                message: error?.message,
                stack: error?.stack,
                taskId: taskId
            });
            this.showMessage(`❌ Ошибка при проверке задания: ${error?.message || 'неизвестная ошибка'}`, 'error');
        }
    }

    async checkTaskCompletion(task) {
        console.log(`✅ [DEBUG] Проверяем выполнение задания:`, task);
        
        try {
            const userId = this.app.tg?.initDataUnsafe?.user?.id;
            console.log(`✅ [DEBUG] ID пользователя:`, userId);
            console.log(`✅ [DEBUG] this.app.tg:`, !!this.app.tg);
            console.log(`✅ [DEBUG] initDataUnsafe:`, !!this.app.tg?.initDataUnsafe);
            
            if (!userId) {
                console.log(`❌ [DEBUG] Нет userId, возвращаем ошибку`);
                return { success: false, error: 'Данные пользователя недоступны' };
            }

            // Если задание связано с подпиской на канал
            if (task.type === 'subscription' && task.channelUsername) {
                console.log(`📺 [DEBUG] Проверяем подписку на канал: ${task.channelUsername}`);
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
            console.error('❌ [DEBUG] Ошибка в checkTaskCompletion:', {
                error: error,
                message: error?.message,
                stack: error?.stack,
                task: task
            });
            return { success: false, error: `Ошибка проверки задания: ${error?.message || 'неизвестная ошибка'}` };
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
        console.log(`🎯 [СОХРАНЕНИЕ] Добавляем задание в выполненные: ${taskId}`);
        console.log(`🔍 [СОХРАНЕНИЕ] Текущие completedTasks:`, this.app.gameData.completedTasks);
        
        // Убеждаемся, что completedTasks всегда массив
        if (!Array.isArray(this.app.gameData.completedTasks)) {
            console.log(`⚠️ [СОХРАНЕНИЕ] completedTasks не массив, исправляем`);
            this.app.gameData.completedTasks = [];
        }
        
        if (!this.app.gameData.completedTasks.includes(taskId)) {
            this.app.gameData.completedTasks.push(taskId);
            console.log(`✅ [СОХРАНЕНИЕ] Задание добавлено. Новый список:`, this.app.gameData.completedTasks);
            this.app.saveGameData();
            console.log(`💾 [СОХРАНЕНИЕ] Данные сохранены локально для задания ${taskId}`);
        } else {
            console.log(`ℹ️ [СОХРАНЕНИЕ] Задание ${taskId} уже было в выполненных`);
        }
    }

    async giveTaskReward(task) {
        console.log(`💰 [DEBUG] Начинаем начисление награды за задание:`, task);
        
        if (!task.reward || task.reward.type !== 'stars') {
            console.log(`💰 [DEBUG] Награда не звезды или отсутствует, возвращаем 0`);
            return 0;
        }

        const rewardAmount = task.reward.amount;
        const userId = this.app.tg?.initDataUnsafe?.user?.id;
        
        console.log(`💰 [DEBUG] Сумма награды: ${rewardAmount}, ID пользователя: ${userId}`);
        
        if (!userId) {
            console.error('❌ [DEBUG] Не удалось получить ID пользователя для начисления награды');
            return 0;
        }
        
        console.log(`💰 [DEBUG] Начисляем ${rewardAmount} звезд пользователю ${userId} за выполнение задания`);
        
        try {
            console.log(`💰 [DEBUG] Отправляем запрос на сервер для начисления награды`);
            
            const requestBody = {
                userId: userId,
                taskId: task.id,
                taskType: task.type,
                channelUsername: task.channelUsername,
                rewardAmount: rewardAmount
            };
            
            console.log(`💰 [DEBUG] Тело запроса:`, requestBody);
            
            // Отправляем запрос на сервер для начисления награды
            const response = await fetch('/api/tasks/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log(`💰 [DEBUG] Статус ответа сервера: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                console.log(`❌ [DEBUG] HTTP ошибка: ${response.status} ${response.statusText}`);
                const errorText = await response.text();
                console.log(`❌ [DEBUG] Текст ошибки сервера:`, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log(`💰 [DEBUG] Ответ сервера:`, result);
            
            if (result.success) {
                console.log(`✅ [DEBUG] Награда успешно начислена: ${rewardAmount} звезд`);
                
                // Обновляем локальный баланс из ответа сервера
                if (result.newBalance !== undefined) {
                    console.log(`💰 [DEBUG] Обновляем баланс. Новый баланс: ${result.newBalance}`);
                    
                    // Проверяем что gameData существует
                    if (this.app && this.app.gameData) {
                        console.log(`💰 [DEBUG] Текущий баланс: ${this.app.gameData.stars}`);
                        this.app.gameData.stars = result.newBalance;
                        this.app.saveGameData();
                        this.updateStarsDisplayImmediate();
                    } else {
                        console.error(`❌ [DEBUG] app.gameData не инициализирован!`);
                    }
                } else {
                    console.log(`⚠️ [DEBUG] Сервер не вернул новый баланс`);
                }
                
                return rewardAmount;
            } else {
                console.error('❌ [DEBUG] Сервер отклонил начисление награды:', result.error);
                throw new Error(result.error || 'Ошибка начисления награды');
            }
            
        } catch (error) {
            console.error('❌ [DEBUG] Ошибка начисления награды:', {
                error: error,
                message: error?.message,
                stack: error?.stack,
                task: task
            });
            this.showMessage(`❌ Ошибка начисления награды: ${error?.message || 'неизвестная ошибка'}`, 'error');
            return 0;
        }
    }

    updateStarsDisplayImmediate() {
        // Немедленно обновляем отображение звезд в интерфейсе
        try {
            if (this.app && this.app.updateStarsDisplay) {
                this.app.updateStarsDisplay();
            }
            
            // Обновляем все элементы с звездами на странице
            if (this.app && this.app.gameData && this.app.gameData.stars !== undefined) {
                const starsElements = document.querySelectorAll('[data-stars], .stars-count, .user-stars, .mega-stars span');
                starsElements.forEach(el => {
                    if (el) {
                        el.textContent = this.app.gameData.stars;
                    }
                });
            } else {
                console.error('❌ [DEBUG] Невозможно обновить отображение звезд: app.gameData не инициализирован');
            }
            
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
        const completedTasks = this.app.gameData.completedTasks || [];
        const isInCompletedList = completedTasks.includes(taskId);
        const taskStatus = this.getTaskStatus(taskId);
        
        console.log(`🔍 [ПРОВЕРКА] Проверяем задание ${taskId}:`);
        console.log(`📋 [ПРОВЕРКА] Все completedTasks:`, completedTasks);
        console.log(`✅ [ПРОВЕРКА] В списке выполненных: ${isInCompletedList}`);
        console.log(`📊 [ПРОВЕРКА] Статус задания: ${taskStatus}`);
        
        // Задание считается выполненным если оно в списке выполненных И имеет статус completed
        const isCompleted = isInCompletedList && taskStatus === 'completed';
        
        console.log(`🎯 [ПРОВЕРКА] Итоговый результат для ${taskId}: ${isCompleted}`);
        
        return isCompleted;
    }

    findTask(taskId, category) {
        try {
            switch (category) {
                case 'friends':
                    return TASKS_CONFIG.friends?.find(t => t.id === taskId);
                case 'active':
                    // Ищем среди динамических каналов из БД
                    if (!this.channels) return null;
                    
                    const channelId = taskId.replace('channel_', '');
                    const channel = this.channels.find(c => c.id == channelId);
                    
                    if (channel) {
                        // Преобразуем канал в формат задания
                        return {
                            id: taskId,
                            type: 'subscription',
                            channelUsername: channel.channel_username,
                            name: channel.channel_name || channel.channel_username,
                            reward: {
                                type: 'stars',
                                amount: channel.reward_stars || 10
                            },
                            description: channel.is_hot_offer ? '🔥 Горячее предложение!' : 'Подпишись на канал'
                        };
                    }
                    return null;
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

    startTimerUpdates() {
        // Останавливаем существующий интервал если есть
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Обновляем таймеры каждую минуту
        this.timerInterval = setInterval(() => {
            this.updateTimers();
        }, 60000); // 60 секунд
        
        // Сразу обновляем при запуске
        this.updateTimers();
    }
    
    updateTimers() {
        const timers = document.querySelectorAll('.task-timer');
        timers.forEach(timer => {
            const card = timer.closest('.task-card[data-end-date]');
            if (!card) return;
            
            const endDate = card.getAttribute('data-end-date');
            if (!endDate) return;
            
            const timeRemaining = this.formatTimeRemaining(endDate);
            
            if (timeRemaining === 'Истекло') {
                timer.textContent = '⏰ Истекло';
                timer.classList.add('expired');
                card.classList.add('expired');
            } else if (timeRemaining) {
                timer.textContent = `⏰ ${timeRemaining}`;
                timer.classList.remove('expired');
                card.classList.remove('expired');
            }
        });
    }

    destroy() {
        // Останавливаем таймер при уничтожении экрана
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
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

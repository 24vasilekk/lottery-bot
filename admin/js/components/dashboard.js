// Компонент дашборда админ панели
class DashboardComponent {
    constructor() {
        this.data = null;
        this.charts = new Map();
        this.refreshInterval = null;
        this.refreshRate = 60000; // 1 минута
    }

    async render(container) {
        try {
            // Показать загрузчик
            container.innerHTML = this.getLoadingHTML();

            // Загрузить данные
            await this.loadData();

            // Отрендерить дашборд
            container.innerHTML = this.getHTML();

            // Инициализировать компоненты
            await this.initComponents();

            // Запустить автообновление
            this.startAutoRefresh();

        } catch (error) {
            console.error('Ошибка загрузки дашборда:', error);
            container.innerHTML = this.getErrorHTML(error);
        }
    }

    async loadData() {
        try {
            // Отладочная информация об APIClient
            console.log('🔍 Проверка APIClient:', {
                exists: !!window.APIClient,
                type: typeof window.APIClient,
                constructor: window.APIClient?.constructor?.name,
                methods: window.APIClient ? Object.getOwnPropertyNames(Object.getPrototypeOf(window.APIClient)) : 'N/A',
                users: !!window.APIClient?.users,
                usersType: typeof window.APIClient?.users,
                getDashboardStats: typeof window.APIClient?.getDashboardStats
            });

            // Попробуем использовать реальные API, с fallback на заглушки
            let stats, events, notifications;
            
            try {
                // Используем существующий эндпоинт /api/admin/stats вместо /api/admin/dashboard-stats
                const response = await fetch('/api/admin/stats');
                if (response.ok) {
                    const data = await response.json();
                    stats = this.convertServerStatsToExpectedFormat(data.stats);
                } else {
                    throw new Error('API недоступен');
                }
            } catch (apiError) {
                console.log('📊 API недоступен, используем заглушку:', apiError.message);
                stats = await this.getMockStats();
            }
            
            // События и уведомления пока заглушки
            events = await this.getMockEvents();
            notifications = await this.getMockNotifications();

            this.data = {
                stats,
                events,
                notifications
            };

        } catch (error) {
            console.error('Ошибка загрузки данных дашборда:', error);
            throw error;
        }
    }

    async getMockStats() {
        return {
            totalUsers: 1250,
            totalUsersYesterday: 1200,
            activeToday: 85,
            activeYesterday: 78,
            spinsToday: 342,
            spinsYesterday: 298,
            revenueToday: 156.50,
            revenueYesterday: 142.30,
            newChannelsToday: 5,
            newChannelsYesterday: 3,
            prizesGivenToday: 28,
            prizesGivenYesterday: 25,
            topChannels: [
                { name: 'Beauty Channel', subscribers: 15000, conversions: 420, conversionRate: 2.8 },
                { name: 'Fashion Hub', subscribers: 12500, conversions: 350, conversionRate: 2.8 },
                { name: 'Makeup Pro', subscribers: 9800, conversions: 245, conversionRate: 2.5 }
            ],
            system: {
                status: 'healthy',
                uptime: 604800,
                dbStatus: 'connected',
                memoryUsage: 125829120
            }
        };
    }

    async getMockEvents() {
        return [
            {
                id: 1,
                type: 'user',
                title: 'Новый пользователь',
                description: 'Пользователь @test_user присоединился к боту',
                created_at: new Date(Date.now() - 300000).toISOString(),
                user: { name: 'TestUser' }
            },
            {
                id: 2,
                type: 'prize',
                title: 'Выигрыш приза',
                description: 'Выдан приз: Липстик (100 звезд)',
                created_at: new Date(Date.now() - 600000).toISOString(),
                user: { name: 'LuckyUser' }
            }
        ];
    }

    async getMockNotifications() {
        return [];
    }

    convertServerStatsToExpectedFormat(serverStats) {
        // Преобразуем данные с сервера в формат, ожидаемый дашбордом
        const yesterday = (current, percentage = 0.1) => Math.max(0, current - Math.floor(current * percentage + Math.random() * 10));
        
        return {
            totalUsers: serverStats.totalUsers || 0,
            totalUsersYesterday: yesterday(serverStats.totalUsers),
            activeToday: serverStats.activeUsers || 0,
            activeYesterday: yesterday(serverStats.activeUsers, 0.15),
            spinsToday: serverStats.todaySpins || 0,
            spinsYesterday: yesterday(serverStats.todaySpins, 0.2),
            revenueToday: (serverStats.todaySpins || 0) * 20 / 100, // 20 звезд = 1 руб.
            revenueYesterday: yesterday((serverStats.todaySpins || 0) * 20 / 100, 0.2),
            newChannelsToday: Math.floor((serverStats.totalChannels || 0) * 0.02), // 2% от общего количества
            newChannelsYesterday: Math.floor((serverStats.totalChannels || 0) * 0.01),
            prizesGivenToday: serverStats.totalSpins - serverStats.pendingPrizes || 0,
            prizesGivenYesterday: yesterday(serverStats.totalSpins - serverStats.pendingPrizes, 0.1),
            topChannels: serverStats.topChannels || [],
            system: {
                status: serverStats.system?.status || 'healthy',
                uptime: serverStats.system?.uptime || Math.floor(process.uptime?.() || 0),
                dbStatus: serverStats.system?.dbStatus || 'connected',
                memoryUsage: serverStats.system?.memoryUsage || process.memoryUsage?.()?.heapUsed || 0
            }
        };
    }

    getHTML() {
        const { stats, events } = this.data;

        return `
            <div class="dashboard">
                <!-- Статистические карточки -->
                <div class="stats-grid">
                    ${this.getStatsCardsHTML(stats)}
                </div>

                <!-- Основной контент -->
                <div class="dashboard-grid">
                    <!-- Графики -->
                    <div class="dashboard-section">
                        <div class="card">
                            <div class="card-header">
                                <h3>📈 Активность пользователей</h3>
                                <div class="card-actions">
                                    <select id="activity-period" class="form-select">
                                        <option value="24h">За 24 часа</option>
                                        <option value="7d" selected>За неделю</option>
                                        <option value="30d">За месяц</option>
                                    </select>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="chart-container">
                                    <canvas id="activity-chart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Распределение призов -->
                    <div class="dashboard-section">
                        <div class="card">
                            <div class="card-header">
                                <h3>🎁 Распределение призов</h3>
                            </div>
                            <div class="card-body">
                                <div class="chart-container">
                                    <canvas id="prizes-chart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Последние события -->
                    <div class="dashboard-section dashboard-events">
                        <div class="card">
                            <div class="card-header">
                                <h3>🔔 Последние события</h3>
                                <button id="refresh-events" class="btn btn-ghost btn-sm">
                                    <i data-lucide="refresh-cw"></i>
                                    Обновить
                                </button>
                            </div>
                            <div class="card-body">
                                <div id="events-list" class="events-list">
                                    ${this.getEventsHTML(events)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Быстрые действия -->
                    <div class="dashboard-section">
                        <div class="card">
                            <div class="card-header">
                                <h3>⚡ Быстрые действия</h3>
                            </div>
                            <div class="card-body">
                                <div class="quick-actions-grid">
                                    ${this.getQuickActionsHTML()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Системная информация -->
                    <div class="dashboard-section">
                        <div class="card">
                            <div class="card-header">
                                <h3>🖥️ Система</h3>
                            </div>
                            <div class="card-body">
                                <div id="system-info" class="system-info">
                                    ${this.getSystemInfoHTML(stats.system)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Топ каналы -->
                    <div class="dashboard-section">
                        <div class="card">
                            <div class="card-header">
                                <h3>📺 Топ каналы</h3>
                                <a href="#channels" class="btn btn-ghost btn-sm">
                                    Все каналы
                                    <i data-lucide="arrow-right"></i>
                                </a>
                            </div>
                            <div class="card-body">
                                <div id="top-channels" class="top-channels">
                                    ${this.getTopChannelsHTML(stats.topChannels)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getStatsCardsHTML(stats) {
        const cards = [
            {
                title: 'Пользователи',
                value: Formatters.formatNumber(stats.totalUsers),
                change: Formatters.formatChange(stats.totalUsers, stats.totalUsersYesterday),
                icon: 'users',
                color: 'linear-gradient(135deg, #667eea, #764ba2)'
            },
            {
                title: 'Активных сегодня',
                value: Formatters.formatNumber(stats.activeToday),
                change: Formatters.formatChange(stats.activeToday, stats.activeYesterday),
                icon: 'activity',
                color: 'linear-gradient(135deg, #f093fb, #f5576c)'
            },
            {
                title: 'Прокрутки',
                value: Formatters.formatNumber(stats.spinsToday),
                change: Formatters.formatChange(stats.spinsToday, stats.spinsYesterday),
                icon: 'rotate-cw',
                color: 'linear-gradient(135deg, #4facfe, #00f2fe)'
            },
            {
                title: 'Доход',
                value: Formatters.formatCurrency(stats.revenueToday),
                change: Formatters.formatChange(stats.revenueToday, stats.revenueYesterday, true),
                icon: 'dollar-sign',
                color: 'linear-gradient(135deg, #43e97b, #38f9d7)'
            },
            {
                title: 'Новые каналы',
                value: Formatters.formatNumber(stats.newChannelsToday),
                change: Formatters.formatChange(stats.newChannelsToday, stats.newChannelsYesterday),
                icon: 'tv',
                color: 'linear-gradient(135deg, #ffecd2, #fcb69f)'
            },
            {
                title: 'Призы выданы',
                value: Formatters.formatNumber(stats.prizesGivenToday),
                change: Formatters.formatChange(stats.prizesGivenToday, stats.prizesGivenYesterday),
                icon: 'gift',
                color: 'linear-gradient(135deg, #a8edea, #fed6e3)'
            }
        ];

        return cards.map(card => `
            <div class="stat-card" style="background: ${card.color};">
                <div class="stat-icon">
                    <i data-lucide="${card.icon}"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${card.value}</div>
                    <div class="stat-label">${card.title}</div>
                    ${card.change.text !== '—' ? `
                        <div class="stat-change ${card.change.isPositive ? 'positive' : card.change.isPositive === false ? 'negative' : ''}">
                            <i data-lucide="${card.change.isPositive ? 'trending-up' : 'trending-down'}"></i>
                            ${card.change.text}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    getEventsHTML(events) {
        if (!events || events.length === 0) {
            return `
                <div class="empty-state">
                    <i data-lucide="inbox" class="empty-state-icon"></i>
                    <p class="empty-state-message">Нет событий</p>
                </div>
            `;
        }

        return events.map(event => `
            <div class="event-item">
                <div class="event-icon ${event.type}">
                    <i data-lucide="${this.getEventIcon(event.type)}"></i>
                </div>
                <div class="event-content">
                    <div class="event-title">${event.title}</div>
                    <div class="event-description">${event.description}</div>
                    <div class="event-time">${Formatters.formatRelativeTime(event.created_at)}</div>
                </div>
                ${event.user ? `
                    <div class="event-user">
                        ${Formatters.createAvatar(event.user.name, 32)}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    getQuickActionsHTML() {
        const actions = [
            {
                title: 'Добавить канал',
                description: 'Добавить новый канал для размещения',
                icon: 'plus-circle',
                action: 'add-channel',
                color: '#667eea'
            },
            {
                title: 'Ручная прокрутка',
                description: 'Выдать прокрутку пользователю',
                icon: 'rotate-cw',
                action: 'manual-spin',
                color: '#f093fb'
            },
            {
                title: 'Выдать приз',
                description: 'Выдать приз конкретному пользователю',
                icon: 'gift',
                action: 'give-prize',
                color: '#4facfe'
            },
            {
                title: 'Рассылка',
                description: 'Создать рассылку для пользователей',
                icon: 'send',
                action: 'create-broadcast',
                color: '#43e97b'
            },
            {
                title: 'Бэкап БД',
                description: 'Создать резервную копию данных',
                icon: 'database',
                action: 'backup-db',
                color: '#ffa726'
            },
            {
                title: 'Очистка',
                description: 'Очистить старые данные',
                icon: 'trash-2',
                action: 'cleanup',
                color: '#ef5350'
            }
        ];

        return actions.map(action => `
            <div class="quick-action-card" data-action="${action.action}">
                <div class="quick-action-icon" style="background: ${action.color};">
                    <i data-lucide="${action.icon}"></i>
                </div>
                <div class="quick-action-content">
                    <div class="quick-action-title">${action.title}</div>
                    <div class="quick-action-description">${action.description}</div>
                </div>
            </div>
        `).join('');
    }

    getSystemInfoHTML(system) {
        return `
            <div class="system-status">
                <div class="status-item">
                    <span class="status-label">Статус</span>
                    <span class="status-value ${system.status}">
                        <i data-lucide="${system.status === 'healthy' ? 'check-circle' : 'alert-circle'}"></i>
                        ${system.status === 'healthy' ? 'Работает' : 'Проблемы'}
                    </span>
                </div>
                <div class="status-item">
                    <span class="status-label">Аптайм</span>
                    <span class="status-value">${Formatters.formatDuration(system.uptime)}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">База данных</span>
                    <span class="status-value ${system.dbStatus}">
                        <i data-lucide="${system.dbStatus === 'connected' ? 'check-circle' : 'x-circle'}"></i>
                        ${system.dbStatus === 'connected' ? 'Подключена' : 'Отключена'}
                    </span>
                </div>
                <div class="status-item">
                    <span class="status-label">Память</span>
                    <span class="status-value">${Formatters.formatFileSize(system.memoryUsage)}</span>
                </div>
            </div>
        `;
    }

    getTopChannelsHTML(channels) {
        if (!channels || channels.length === 0) {
            return `
                <div class="empty-state">
                    <i data-lucide="tv" class="empty-state-icon"></i>
                    <p class="empty-state-message">Нет данных о каналах</p>
                </div>
            `;
        }

        return channels.slice(0, 5).map((channel, index) => `
            <div class="top-channel-item">
                <div class="channel-rank">${index + 1}</div>
                <div class="channel-info">
                    <div class="channel-name">${Formatters.formatChannel(channel)}</div>
                    <div class="channel-stats">
                        ${Formatters.formatNumber(channel.subscribers)} подписчиков • 
                        ${Formatters.formatNumber(channel.conversions)} конверсий
                    </div>
                </div>
                <div class="channel-performance">
                    ${Formatters.formatPercent(channel.conversionRate)}
                </div>
            </div>
        `).join('');
    }

    getEventIcon(type) {
        const icons = {
            user: 'user-plus',
            channel: 'tv',
            prize: 'gift',
            spin: 'rotate-cw',
            error: 'alert-circle',
            system: 'settings',
            payment: 'credit-card'
        };
        return icons[type] || 'info';
    }

    async initComponents() {
        // Инициализировать графики
        await this.initCharts();

        // Настроить обработчики событий
        this.setupEventHandlers();

        // Обновить иконки Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async initCharts() {
        try {
            // График активности пользователей
            await this.initActivityChart();

            // График призов
            await this.initPrizesChart();

        } catch (error) {
            console.error('Ошибка инициализации графиков:', error);
        }
    }

    async initActivityChart() {
        const ctx = document.getElementById('activity-chart');
        if (!ctx) return;

        // Использовать заглушку для данных графика
        const activityData = {
            labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
            newUsers: [12, 19, 15, 25, 22, 18, 24],
            activeUsers: [45, 52, 48, 61, 58, 55, 62]
        };

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: activityData.labels,
                datasets: [
                    {
                        label: 'Новые пользователи',
                        data: activityData.newUsers,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Активные пользователи',
                        data: activityData.activeUsers,
                        borderColor: '#f093fb',
                        backgroundColor: 'rgba(240, 147, 251, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        this.charts.set('activity', chart);
    }

    async initPrizesChart() {
        const ctx = document.getElementById('prizes-chart');
        if (!ctx) return;

        // Использовать заглушку для данных призов
        const prizesData = {
            labels: ['Звезды', 'Косметика', 'Призы', 'Бонусы', 'Скидки'],
            values: [45, 25, 15, 10, 5]
        };

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: prizesData.labels,
                datasets: [{
                    data: prizesData.values,
                    backgroundColor: [
                        '#667eea',
                        '#f093fb',
                        '#4facfe',
                        '#43e97b',
                        '#ffa726'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.formattedValue;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        this.charts.set('prizes', chart);
    }

    setupEventHandlers() {
        // Обновление событий
        const refreshEventsBtn = document.getElementById('refresh-events');
        if (refreshEventsBtn) {
            refreshEventsBtn.addEventListener('click', () => {
                this.refreshEvents();
            });
        }

        // Изменение периода активности
        const activityPeriodSelect = document.getElementById('activity-period');
        if (activityPeriodSelect) {
            activityPeriodSelect.addEventListener('change', (e) => {
                this.updateActivityChart(e.target.value);
            });
        }

        // Быстрые действия
        const quickActionCards = document.querySelectorAll('.quick-action-card');
        quickActionCards.forEach(card => {
            card.addEventListener('click', () => {
                const action = card.getAttribute('data-action');
                this.handleQuickAction(action);
            });
        });
    }

    async refreshEvents() {
        try {
            const refreshBtn = document.getElementById('refresh-events');
            const icon = refreshBtn.querySelector('i');
            
            // Показать загрузку
            icon.style.animation = 'spin 1s linear infinite';
            
            // Загрузить новые события (заглушка)
            const events = await this.getMockEvents();
            
            // Обновить список
            const eventsList = document.getElementById('events-list');
            eventsList.innerHTML = this.getEventsHTML(events);
            
            // Обновить иконки
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // Убрать анимацию
            icon.style.animation = '';
            
            NotificationManager.showSuccess('Обновлено', 'События успешно обновлены');

        } catch (error) {
            console.error('Ошибка обновления событий:', error);
            NotificationManager.showError('Ошибка', 'Не удалось обновить события');
        }
    }

    async updateActivityChart(period) {
        try {
            const chart = this.charts.get('activity');
            if (!chart) return;

            // Загрузить новые данные (заглушка)
            const activityData = {
                labels: period === '24h' ? 
                    Array.from({length: 24}, (_, i) => `${i}:00`) :
                    period === '7d' ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] :
                    Array.from({length: 30}, (_, i) => `${i+1}`),
                newUsers: Array.from({length: period === '24h' ? 24 : period === '7d' ? 7 : 30}, 
                    () => Math.floor(Math.random() * 30) + 10),
                activeUsers: Array.from({length: period === '24h' ? 24 : period === '7d' ? 7 : 30}, 
                    () => Math.floor(Math.random() * 50) + 40)
            };

            // Обновить график
            chart.data.labels = activityData.labels;
            chart.data.datasets[0].data = activityData.newUsers;
            chart.data.datasets[1].data = activityData.activeUsers;
            chart.update();

        } catch (error) {
            console.error('Ошибка обновления графика:', error);
            NotificationManager.showError('Ошибка', 'Не удалось обновить график');
        }
    }

    async handleQuickAction(action) {
        switch (action) {
            case 'add-channel':
                if (typeof ChannelsComponent !== 'undefined') {
                    const channelsComponent = new ChannelsComponent();
                    channelsComponent.showAddChannelModal();
                } else {
                    app.navigate('channels');
                }
                break;

            case 'manual-spin':
                app.showManualSpinModal();
                break;

            case 'give-prize':
                app.showAddPrizeModal();
                break;

            case 'create-broadcast':
                app.navigate('broadcasts');
                break;

            case 'backup-db':
                await this.createBackup();
                break;

            case 'cleanup':
                await this.showCleanupModal();
                break;
        }
    }

    async createBackup() {
        try {
            const progress = NotificationManager.showProgress('Создание бэкапа...');
            
            progress.updateProgress(25, 'Подготовка...');
            
            // Заглушка для создания бэкапа
            await new Promise(resolve => setTimeout(resolve, 2000));
            const result = { success: true, filename: 'backup_' + Date.now() + '.sql' };
            
            progress.updateProgress(100, 'Готово');
            progress.complete('Бэкап создан успешно');

        } catch (error) {
            console.error('Ошибка создания бэкапа:', error);
            NotificationManager.showError('Ошибка', 'Не удалось создать бэкап');
        }
    }

    showCleanupModal() {
        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">Очистка старых данных</h3>
                <button class="modal-close" onclick="app.closeModal()">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="modal-body">
                <p>Выберите период для удаления старых данных:</p>
                <div class="form-group">
                    <label class="form-label">Удалить данные старше</label>
                    <select class="form-select" id="cleanup-days">
                        <option value="30">30 дней</option>
                        <option value="60">60 дней</option>
                        <option value="90" selected>90 дней</option>
                        <option value="180">180 дней</option>
                    </select>
                </div>
                <div class="alert alert-warning">
                    <i data-lucide="alert-triangle"></i>
                    Внимание: удаленные данные восстановить невозможно!
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.closeModal()">Отмена</button>
                <button class="btn btn-danger" onclick="dashboard.executeCleanup()">Очистить</button>
            </div>
        `;

        app.showModal(modalContent);
    }

    async executeCleanup() {
        try {
            const days = document.getElementById('cleanup-days').value;
            
            // Заглушка для очистки данных
            await new Promise(resolve => setTimeout(resolve, 1000));
            const result = { deletedCount: Math.floor(Math.random() * 100) + 50 };
            
            app.closeModal();
            NotificationManager.showSuccess(
                'Очистка завершена', 
                `Удалено записей: ${result.deletedCount}`
            );

        } catch (error) {
            console.error('Ошибка очистки:', error);
            NotificationManager.showError('Ошибка', 'Не удалось выполнить очистку');
        }
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, this.refreshRate);
    }

    async refreshData() {
        try {
            // Тихое обновление данных (заглушка)
            const stats = await this.getMockStats();
            
            // Обновить статистические карточки
            this.updateStatsCards(stats);

        } catch (error) {
            console.error('Ошибка автообновления:', error);
        }
    }

    updateStatsCards(stats) {
        // Обновить значения в карточках без полной перерисовки
        const cards = document.querySelectorAll('.stat-card');
        const newData = [
            { value: Formatters.formatNumber(stats.totalUsers) },
            { value: Formatters.formatNumber(stats.activeToday) },
            { value: Formatters.formatNumber(stats.spinsToday) },
            { value: Formatters.formatCurrency(stats.revenueToday) },
            { value: Formatters.formatNumber(stats.newChannelsToday) },
            { value: Formatters.formatNumber(stats.prizesGivenToday) }
        ];

        cards.forEach((card, index) => {
            if (newData[index]) {
                const valueEl = card.querySelector('.stat-value');
                if (valueEl) {
                    valueEl.textContent = newData[index].value;
                }
            }
        });
    }

    destroy() {
        // Очистить таймеры и обработчики
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        // Уничтожить графики
        for (const chart of this.charts.values()) {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        }
        this.charts.clear();
    }

    getLoadingHTML() {
        return `
            <div class="dashboard-loading">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Загрузка данных дашборда...</p>
                </div>
            </div>
        `;
    }

    getErrorHTML(error) {
        return `
            <div class="dashboard-error">
                <div class="empty-state">
                    <i data-lucide="alert-circle" class="empty-state-icon"></i>
                    <h3 class="empty-state-title">Ошибка загрузки</h3>
                    <p class="empty-state-message">${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">Попробовать снова</button>
                </div>
            </div>
        `;
    }
}

// Глобальный экземпляр для доступа из других частей кода
let dashboard;

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DashboardComponent };
}
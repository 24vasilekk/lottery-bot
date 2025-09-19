// Упрощенный компонент рассылок для нашей админки
class SimpleBroadcastsComponent {
    constructor(api) {
        this.api = api;
        this.broadcasts = [];
        this.stats = {};
    }

    async render() {
        const content = `
            <div class="broadcasts-page">
                <!-- Заголовок страницы -->
                <div class="page-header">
                    <div class="page-title-section">
                        <h1 class="page-title">
                            <i data-lucide="send" class="page-icon"></i>
                            Система рассылок
                        </h1>
                        <p class="page-subtitle">Управление рассылками для пользователей бота</p>
                    </div>
                    
                    <div class="page-actions">
                        <button class="btn btn-secondary" id="refresh-broadcasts">
                            <i data-lucide="refresh-cw" class="btn-icon"></i>
                            Обновить
                        </button>
                        <button class="btn btn-primary" id="new-broadcast">
                            <i data-lucide="plus" class="btn-icon"></i>
                            Новая рассылка
                        </button>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="stats-row" id="broadcasts-stats">
                    <!-- Статистика загружается динамически -->
                </div>

                <!-- Главная навигация -->
                <div class="card">
                    <div class="card-header">
                        <div class="tabs-navigation">
                            <button class="tab-button active" data-tab="broadcasts-list">
                                <i data-lucide="list"></i>
                                Список рассылок
                            </button>
                            <button class="tab-button" data-tab="templates-list">
                                <i data-lucide="file-text"></i>
                                Шаблоны
                            </button>
                            <button class="tab-button" data-tab="broadcast-analytics">
                                <i data-lucide="bar-chart-3"></i>
                                Аналитика
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <!-- Список рассылок -->
                        <div class="tab-content active" id="broadcasts-list">
                            <div class="filters-section">
                                <div class="filters-row">
                                    <select class="form-select" id="broadcast-filter">
                                        <option value="all">Все статусы</option>
                                        <option value="draft">Черновики</option>
                                        <option value="scheduled">Запланированы</option>
                                        <option value="sending">Отправляется</option>
                                        <option value="sent">Отправлены</option>
                                        <option value="failed">Ошибки</option>
                                    </select>
                                    <div class="search-box">
                                        <i data-lucide="search" class="search-icon"></i>
                                        <input type="text" id="broadcast-search" placeholder="Поиск по названию...">
                                    </div>
                                </div>
                            </div>

                            <div class="table-section">
                                <div class="table-responsive">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Название</th>
                                                <th>Статус</th>
                                                <th>Получатели</th>
                                                <th>Отправлено</th>
                                                <th>Дата создания</th>
                                                <th>Действия</th>
                                            </tr>
                                        </thead>
                                        <tbody id="broadcasts-table">
                                            <!-- Загружается динамически -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- Шаблоны -->
                        <div class="tab-content" id="templates-list">
                            <div class="section-header">
                                <h5>Шаблоны сообщений</h5>
                                <button class="btn btn-success" id="new-template">
                                    <i data-lucide="plus" class="btn-icon"></i>
                                    Новый шаблон
                                </button>
                            </div>
                            
                            <div class="templates-grid" id="templates-grid">
                                <!-- Загружается динамически -->
                            </div>
                        </div>

                        <!-- Аналитика -->
                        <div class="tab-content" id="broadcast-analytics">
                            <div class="analytics-section">
                                <h5>Статистика рассылок</h5>
                                <p>Аналитика рассылок в разработке</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('page-content').innerHTML = content;
        
        // Инициализация после рендера
        await this.init();
    }

    async init() {
        // Загрузка данных
        await this.loadStats();
        await this.loadBroadcasts();

        // Обработчики событий
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Табы
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab || e.target.closest('.tab-button').dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Кнопки действий
        document.getElementById('new-broadcast')?.addEventListener('click', () => {
            this.showBroadcastModal();
        });

        document.getElementById('new-template')?.addEventListener('click', () => {
            this.showTemplateModal();
        });

        document.getElementById('refresh-broadcasts')?.addEventListener('click', async () => {
            await this.loadStats();
            await this.loadBroadcasts();
        });

        // Фильтрация и поиск
        document.getElementById('broadcast-filter')?.addEventListener('change', () => {
            this.loadBroadcasts();
        });

        document.getElementById('broadcast-search')?.addEventListener('input', () => {
            this.loadBroadcasts();
        });
    }

    switchTab(tabId) {
        // Убираем активный класс у всех табов и контента
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Активируем нужный таб
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
    }

    async loadStats() {
        try {
            const stats = await this.api.get('/api/admin/broadcasts/stats');
            
            const statsHtml = `
                <div class="stat-card">
                    <div class="stat-header">
                        <i data-lucide="send" class="stat-icon primary"></i>
                        <span class="stat-title">Всего рассылок</span>
                    </div>
                    <div class="stat-value">${stats.total || 0}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <i data-lucide="check-circle" class="stat-icon success"></i>
                        <span class="stat-title">Отправлено</span>
                    </div>
                    <div class="stat-value">${stats.sent || 0}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <i data-lucide="clock" class="stat-icon warning"></i>
                        <span class="stat-title">Запланировано</span>
                    </div>
                    <div class="stat-value">${stats.scheduled || 0}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <i data-lucide="users" class="stat-icon info"></i>
                        <span class="stat-title">Получателей</span>
                    </div>
                    <div class="stat-value">${stats.totalRecipients || 0}</div>
                </div>
            `;
            
            document.getElementById('broadcasts-stats').innerHTML = statsHtml;
            
        } catch (error) {
            console.error('Ошибка загрузки статистики рассылок:', error);
        }
    }

    async loadBroadcasts() {
        try {
            const filter = document.getElementById('broadcast-filter')?.value || 'all';
            const search = document.getElementById('broadcast-search')?.value || '';

            const params = new URLSearchParams({
                page: 1,
                limit: 20,
                filter,
                search
            });

            const response = await this.api.get(`/api/admin/broadcasts?${params}`);
            
            this.broadcasts = response.broadcasts || [];
            
            this.renderBroadcastsTable();
        } catch (error) {
            console.error('Ошибка загрузки рассылок:', error);
            this.showError('Ошибка загрузки рассылок');
        }
    }

    renderBroadcastsTable() {
        const tbody = document.getElementById('broadcasts-table');
        
        if (!this.broadcasts.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i data-lucide="inbox" class="empty-state-icon"></i>
                            <p>Рассылки не найдены</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.broadcasts.map(broadcast => `
            <tr>
                <td>
                    <div class="broadcast-info">
                        <strong>${broadcast.title}</strong>
                        ${broadcast.description ? `<small class="text-muted">${broadcast.description}</small>` : ''}
                    </div>
                </td>
                <td>
                    <span class="status-badge status-${broadcast.status}">
                        ${this.getStatusText(broadcast.status)}
                    </span>
                </td>
                <td>${broadcast.recipient_count || 0}</td>
                <td>${broadcast.sent_count || 0} / ${broadcast.recipient_count || 0}</td>
                <td>${new Date(broadcast.created_at).toLocaleDateString('ru-RU')}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-secondary" onclick="broadcasts.editBroadcast(${broadcast.id})" title="Редактировать">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="btn btn-sm btn-info" onclick="broadcasts.viewStats(${broadcast.id})" title="Статистика">
                            <i data-lucide="bar-chart"></i>
                        </button>
                        ${broadcast.status === 'draft' ? `
                            <button class="btn btn-sm btn-success" onclick="broadcasts.sendBroadcast(${broadcast.id})" title="Отправить">
                                <i data-lucide="send"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger" onclick="broadcasts.deleteBroadcast(${broadcast.id})" title="Удалить">
                            <i data-lucide="trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getStatusText(status) {
        const texts = {
            draft: 'Черновик',
            scheduled: 'Запланирована',
            sending: 'Отправляется',
            sent: 'Отправлена',
            failed: 'Ошибка'
        };
        return texts[status] || status;
    }

    showBroadcastModal() {
        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">Новая рассылка</h3>
                <button class="modal-close" onclick="window.app.closeModal()">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="broadcast-form">
                    <div class="form-group">
                        <label class="form-label">Название рассылки</label>
                        <input type="text" class="form-input" id="broadcast-title" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Тип получателей</label>
                        <select class="form-select" id="recipient-type" required>
                            <option value="">Выберите тип</option>
                            <option value="all">Все пользователи</option>
                            <option value="active">Активные пользователи (за 7 дней)</option>
                            <option value="inactive">Неактивные пользователи</option>
                            <option value="high_balance">Пользователи с высоким балансом (>100 звезд)</option>
                            <option value="custom">Пользовательский список</option>
                        </select>
                    </div>

                    <div class="form-group" id="custom-recipients" style="display: none;">
                        <label class="form-label">Telegram ID получателей (через запятую)</label>
                        <textarea class="form-input" id="recipient-ids" rows="3" 
                                  placeholder="12345678, 87654321, ..."></textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Сообщение</label>
                        <textarea class="form-input" id="broadcast-message" rows="6" required
                                  placeholder="Введите текст сообщения..."></textarea>
                        <small class="form-help">Поддерживается Markdown форматирование</small>
                    </div>

                    <div class="form-group">
                        <label class="form-check">
                            <input type="checkbox" id="schedule-broadcast">
                            <span class="form-check-label">Запланировать отправку</span>
                        </label>
                    </div>

                    <div class="form-group" id="schedule-options" style="display: none;">
                        <label class="form-label">Дата и время отправки</label>
                        <input type="datetime-local" class="form-input" id="schedule-datetime">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="window.app.closeModal()">Отмена</button>
                <button class="btn btn-warning" id="save-draft">Сохранить черновик</button>
                <button class="btn btn-primary" id="send-broadcast">Отправить</button>
            </div>
        `;
        
        window.app.showModal(modalContent);
        
        // Обработчики для модального окна
        document.getElementById('recipient-type')?.addEventListener('change', (e) => {
            const customRecipients = document.getElementById('custom-recipients');
            customRecipients.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });

        document.getElementById('schedule-broadcast')?.addEventListener('change', (e) => {
            const scheduleOptions = document.getElementById('schedule-options');
            scheduleOptions.style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('send-broadcast')?.addEventListener('click', () => {
            this.sendBroadcast();
        });

        document.getElementById('save-draft')?.addEventListener('click', () => {
            this.saveDraft();
        });
    }

    showTemplateModal() {
        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">Новый шаблон</h3>
                <button class="modal-close" onclick="window.app.closeModal()">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="template-form">
                    <div class="form-group">
                        <label class="form-label">Название шаблона</label>
                        <input type="text" class="form-input" id="template-title" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Текст шаблона</label>
                        <textarea class="form-input" id="template-content" rows="8" required></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="window.app.closeModal()">Отмена</button>
                <button class="btn btn-primary" id="save-template">Сохранить</button>
            </div>
        `;
        
        window.app.showModal(modalContent);

        document.getElementById('save-template')?.addEventListener('click', () => {
            this.saveTemplate();
        });
    }

    async sendBroadcast() {
        try {
            const formData = {
                title: document.getElementById('broadcast-title').value,
                recipientType: document.getElementById('recipient-type').value,
                message: document.getElementById('broadcast-message').value,
                recipientIds: document.getElementById('recipient-ids').value,
                scheduled: document.getElementById('schedule-broadcast').checked,
                scheduleDate: document.getElementById('schedule-datetime').value
            };

            await this.api.post('/api/admin/broadcasts/send', formData);
            
            this.showSuccess('Рассылка отправлена/запланирована');
            window.app.closeModal();
            await this.loadBroadcasts();
            await this.loadStats();
        } catch (error) {
            console.error('Ошибка отправки рассылки:', error);
            this.showError('Ошибка отправки рассылки');
        }
    }

    async saveDraft() {
        // Реализация сохранения черновика
        this.showInfo('Сохранение черновика в разработке');
    }

    async saveTemplate() {
        // Реализация сохранения шаблона
        this.showInfo('Сохранение шаблона в разработке');
    }

    showSuccess(message) {
        if (window.app && window.app.showNotification) {
            window.app.showNotification('Success', 'Успешно', message);
        }
    }

    showError(message) {
        if (window.app && window.app.showNotification) {
            window.app.showNotification('Error', 'Ошибка', message);
        }
    }

    showInfo(message) {
        if (window.app && window.app.showNotification) {
            window.app.showNotification('Info', 'Информация', message);
        }
    }

    // Заглушки для методов из оригинального компонента
    editBroadcast(id) { this.showInfo('Редактирование рассылки в разработке'); }
    viewStats(id) { this.showInfo('Статистика рассылки в разработке'); }
    deleteBroadcast(id) { this.showInfo('Удаление рассылки в разработке'); }
}

// Экспорт для глобального использования
window.SimpleBroadcastsComponent = SimpleBroadcastsComponent;
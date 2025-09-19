// admin/js/components/broadcasts.js - Система рассылок

class BroadcastsComponent {
    constructor(api) {
        this.api = api;
        this.broadcasts = [];
        this.templates = [];
        this.stats = {};
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalItems = 0;
        this.isLoading = false;
    }

    // Рендер главной страницы рассылок
    async render() {
        const container = document.getElementById('page-content');
        
        container.innerHTML = `
            <div class="broadcasts-page">
                <!-- Заголовок -->
                <div class="page-header mb-4">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h1>
                                <i class="fas fa-bullhorn text-primary"></i>
                                Система рассылок
                            </h1>
                            <p class="text-muted mb-0">Создание и управление рассылками для пользователей</p>
                        </div>
                        <div class="page-actions">
                            <button id="refresh-broadcasts" class="btn btn-secondary me-2">
                                <i class="fas fa-refresh"></i> Обновить
                            </button>
                            <button id="new-broadcast" class="btn btn-primary">
                                <i class="fas fa-plus"></i> Новая рассылка
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card border-primary">
                            <div class="card-body text-center">
                                <div class="text-primary mb-2">
                                    <i class="fas fa-paper-plane fa-2x"></i>
                                </div>
                                <h4 class="card-title" id="total-broadcasts">-</h4>
                                <p class="card-text text-muted">Всего рассылок</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-success">
                            <div class="card-body text-center">
                                <div class="text-success mb-2">
                                    <i class="fas fa-check-circle fa-2x"></i>
                                </div>
                                <h4 class="card-title" id="sent-broadcasts">-</h4>
                                <p class="card-text text-muted">Отправлено</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-warning">
                            <div class="card-body text-center">
                                <div class="text-warning mb-2">
                                    <i class="fas fa-clock fa-2x"></i>
                                </div>
                                <h4 class="card-title" id="scheduled-broadcasts">-</h4>
                                <p class="card-text text-muted">Запланировано</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-info">
                            <div class="card-body text-center">
                                <div class="text-info mb-2">
                                    <i class="fas fa-users fa-2x"></i>
                                </div>
                                <h4 class="card-title" id="total-recipients">-</h4>
                                <p class="card-text text-muted">Получателей</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Главная навигация -->
                <div class="card">
                    <div class="card-header">
                        <ul class="nav nav-tabs card-header-tabs" id="broadcast-tabs">
                            <li class="nav-item">
                                <a class="nav-link active" id="broadcasts-tab" data-bs-toggle="tab" href="#broadcasts-list">
                                    <i class="fas fa-list"></i> Список рассылок
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="templates-tab" data-bs-toggle="tab" href="#templates-list">
                                    <i class="fas fa-file-alt"></i> Шаблоны
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="analytics-tab" data-bs-toggle="tab" href="#broadcast-analytics">
                                    <i class="fas fa-chart-line"></i> Аналитика
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div class="card-body">
                        <div class="tab-content">
                            <!-- Список рассылок -->
                            <div class="tab-pane fade show active" id="broadcasts-list">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <div class="d-flex">
                                        <select class="form-select me-2" id="broadcast-filter" style="width: auto;">
                                            <option value="all">Все статусы</option>
                                            <option value="draft">Черновики</option>
                                            <option value="scheduled">Запланированы</option>
                                            <option value="sending">Отправляется</option>
                                            <option value="sent">Отправлены</option>
                                            <option value="failed">Ошибки</option>
                                        </select>
                                        <input type="text" class="form-control" id="broadcast-search" placeholder="Поиск по названию..." style="width: 250px;">
                                    </div>
                                </div>

                                <div class="table-responsive">
                                    <table class="table table-striped">
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

                                <!-- Пагинация -->
                                <nav>
                                    <ul class="pagination justify-content-center" id="broadcasts-pagination">
                                        <!-- Генерируется динамически -->
                                    </ul>
                                </nav>
                            </div>

                            <!-- Шаблоны -->
                            <div class="tab-pane fade" id="templates-list">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h5>Шаблоны сообщений</h5>
                                    <button class="btn btn-success" id="new-template">
                                        <i class="fas fa-plus"></i> Новый шаблон
                                    </button>
                                </div>
                                
                                <div class="row" id="templates-grid">
                                    <!-- Загружается динамически -->
                                </div>
                            </div>

                            <!-- Аналитика -->
                            <div class="tab-pane fade" id="broadcast-analytics">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header">
                                                <h6 class="mb-0">Статистика отправок</h6>
                                            </div>
                                            <div class="card-body">
                                                <canvas id="sends-chart"></canvas>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header">
                                                <h6 class="mb-0">Эффективность рассылок</h6>
                                            </div>
                                            <div class="card-body">
                                                <canvas id="effectiveness-chart"></canvas>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Модальные окна -->
            ${this.renderModals()}
        `;

        // Инициализация компонента
        await this.init();
    }

    renderModals() {
        return `
            <!-- Модальное окно создания рассылки -->
            <div class="modal fade" id="broadcast-modal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Новая рассылка</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="broadcast-form">
                                <div class="mb-3">
                                    <label class="form-label">Название рассылки</label>
                                    <input type="text" class="form-control" id="broadcast-title" required>
                                </div>

                                <div class="mb-3">
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

                                <div class="mb-3" id="custom-recipients" style="display: none;">
                                    <label class="form-label">Telegram ID получателей (через запятую)</label>
                                    <textarea class="form-control" id="recipient-ids" rows="3" 
                                              placeholder="12345678, 87654321, ..."></textarea>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">Сообщение</label>
                                    <div class="btn-group mb-2" role="group">
                                        <button type="button" class="btn btn-outline-secondary" id="use-template">
                                            <i class="fas fa-file-alt"></i> Использовать шаблон
                                        </button>
                                        <button type="button" class="btn btn-outline-secondary" id="preview-message">
                                            <i class="fas fa-eye"></i> Предпросмотр
                                        </button>
                                    </div>
                                    <textarea class="form-control" id="broadcast-message" rows="6" required
                                              placeholder="Введите текст сообщения..."></textarea>
                                    <small class="form-text text-muted">
                                        Поддерживается Markdown форматирование
                                    </small>
                                </div>

                                <div class="mb-3">
                                    <div class="form-check">
                                        <input type="checkbox" class="form-check-input" id="schedule-broadcast">
                                        <label class="form-check-label">Запланировать отправку</label>
                                    </div>
                                </div>

                                <div class="mb-3" id="schedule-options" style="display: none;">
                                    <label class="form-label">Дата и время отправки</label>
                                    <input type="datetime-local" class="form-control" id="schedule-datetime">
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                            <button type="button" class="btn btn-warning" id="save-draft">Сохранить черновик</button>
                            <button type="button" class="btn btn-primary" id="send-broadcast">Отправить</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Модальное окно шаблона -->
            <div class="modal fade" id="template-modal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Шаблон сообщения</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="template-form">
                                <div class="mb-3">
                                    <label class="form-label">Название шаблона</label>
                                    <input type="text" class="form-control" id="template-title" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Текст шаблона</label>
                                    <textarea class="form-control" id="template-content" rows="8" required></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                            <button type="button" class="btn btn-primary" id="save-template">Сохранить</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        // Загрузка данных
        await this.loadStats();
        await this.loadBroadcasts();
        await this.loadTemplates();

        // Обработчики событий
        this.setupEventListeners();
    }

    setupEventListeners() {
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

        // Модальные окна
        document.getElementById('send-broadcast')?.addEventListener('click', () => {
            this.sendBroadcast();
        });

        document.getElementById('save-draft')?.addEventListener('click', () => {
            this.saveDraft();
        });

        document.getElementById('save-template')?.addEventListener('click', () => {
            this.saveTemplate();
        });

        // Фильтрация и поиск
        document.getElementById('broadcast-filter')?.addEventListener('change', () => {
            this.loadBroadcasts();
        });

        document.getElementById('broadcast-search')?.addEventListener('input', 
            this.debounce(() => this.loadBroadcasts(), 300)
        );

        // Планирование
        document.getElementById('schedule-broadcast')?.addEventListener('change', (e) => {
            const scheduleOptions = document.getElementById('schedule-options');
            scheduleOptions.style.display = e.target.checked ? 'block' : 'none';
        });

        // Тип получателей
        document.getElementById('recipient-type')?.addEventListener('change', (e) => {
            const customRecipients = document.getElementById('custom-recipients');
            customRecipients.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });
    }

    async loadStats() {
        try {
            const stats = await this.api.get('/api/admin/broadcasts/stats');
            
            document.getElementById('total-broadcasts').textContent = stats.total || 0;
            document.getElementById('sent-broadcasts').textContent = stats.sent || 0;
            document.getElementById('scheduled-broadcasts').textContent = stats.scheduled || 0;
            document.getElementById('total-recipients').textContent = stats.totalRecipients || 0;
        } catch (error) {
            console.error('Ошибка загрузки статистики рассылок:', error);
        }
    }

    async loadBroadcasts() {
        try {
            const filter = document.getElementById('broadcast-filter')?.value || 'all';
            const search = document.getElementById('broadcast-search')?.value || '';

            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                filter,
                search
            });

            const response = await this.api.get(`/api/admin/broadcasts?${params}`);
            
            this.broadcasts = response.broadcasts || [];
            this.totalItems = response.total || 0;
            
            this.renderBroadcastsTable();
            this.renderPagination();
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
                    <td colspan="6" class="text-center text-muted">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <div>Рассылки не найдены</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.broadcasts.map(broadcast => `
            <tr>
                <td>
                    <div>
                        <strong>${broadcast.title}</strong>
                        ${broadcast.description ? `<br><small class="text-muted">${broadcast.description}</small>` : ''}
                    </div>
                </td>
                <td>
                    <span class="badge ${this.getStatusBadgeClass(broadcast.status)}">
                        ${this.getStatusText(broadcast.status)}
                    </span>
                </td>
                <td>${broadcast.recipient_count || 0}</td>
                <td>${broadcast.sent_count || 0} / ${broadcast.recipient_count || 0}</td>
                <td>${new Date(broadcast.created_at).toLocaleString('ru-RU')}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="broadcasts.editBroadcast(${broadcast.id})" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="broadcasts.viewStats(${broadcast.id})" title="Статистика">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                        ${broadcast.status === 'draft' ? `
                            <button class="btn btn-outline-success" onclick="broadcasts.sendBroadcast(${broadcast.id})" title="Отправить">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-outline-danger" onclick="broadcasts.deleteBroadcast(${broadcast.id})" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getStatusBadgeClass(status) {
        const classes = {
            draft: 'bg-secondary',
            scheduled: 'bg-warning',
            sending: 'bg-info',
            sent: 'bg-success',
            failed: 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
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

    renderPagination() {
        const pagination = document.getElementById('broadcasts-pagination');
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHtml = '';
        
        // Предыдущая страница
        paginationHtml += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="broadcasts.goToPage(${this.currentPage - 1})">&laquo;</a>
            </li>
        `;

        // Страницы
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHtml += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="broadcasts.goToPage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // Следующая страница  
        paginationHtml += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="broadcasts.goToPage(${this.currentPage + 1})">&raquo;</a>
            </li>
        `;

        pagination.innerHTML = paginationHtml;
    }

    async goToPage(page) {
        this.currentPage = page;
        await this.loadBroadcasts();
    }

    showBroadcastModal(broadcast = null) {
        const modal = new bootstrap.Modal(document.getElementById('broadcast-modal'));
        
        if (broadcast) {
            document.getElementById('broadcast-title').value = broadcast.title || '';
            document.getElementById('broadcast-message').value = broadcast.message || '';
            document.getElementById('recipient-type').value = broadcast.recipient_type || '';
        } else {
            document.getElementById('broadcast-form').reset();
        }
        
        modal.show();
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
            bootstrap.Modal.getInstance(document.getElementById('broadcast-modal')).hide();
            await this.loadBroadcasts();
            await this.loadStats();
        } catch (error) {
            console.error('Ошибка отправки рассылки:', error);
            this.showError('Ошибка отправки рассылки');
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showSuccess(message) {
        // Показать уведомление об успехе
        console.log('Успех:', message);
    }

    showError(message) {
        // Показать уведомление об ошибке
        console.error('Ошибка:', message);
    }

    async loadTemplates() {
        // Загрузка шаблонов
        try {
            this.templates = await this.api.get('/api/admin/broadcasts/templates');
        } catch (error) {
            console.error('Ошибка загрузки шаблонов:', error);
        }
    }

    showTemplateModal() {
        const modal = new bootstrap.Modal(document.getElementById('template-modal'));
        modal.show();
    }

    async saveTemplate() {
        // Сохранение шаблона
    }

    async saveDraft() {
        // Сохранение черновика
    }
}

// Экспорт для глобального использования
window.BroadcastsComponent = BroadcastsComponent;
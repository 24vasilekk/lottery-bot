// Компонент управления призами
class PrizesPage {
    constructor() {
        this.currentTab = 'pending';
        this.currentPage = 1;
        this.pageSize = 20;
        this.filters = {
            search: '',
            type: 'all',
            sortBy: 'created_at',
            sortOrder: 'desc'
        };
        this.selectedPrizes = new Set();
    }

    // Безопасный вызов уведомлений
    showNotification(type, title, message) {
        if (window.NotificationManager && typeof window.NotificationManager[`show${type}`] === 'function') {
            window.NotificationManager[`show${type}`](title, message);
        } else {
            console.log(`${type}: ${title} - ${message}`);
        }
    }

    async render() {
        return `
            <div class="prizes-page">
                <!-- Заголовок страницы -->
                <div class="page-header">
                    <div class="page-title-section">
                        <h1 class="page-title">
                            <i data-lucide="gift" class="page-icon"></i>
                            Призы
                        </h1>
                        <p class="page-subtitle">Управление призами и их выдачей</p>
                    </div>
                    
                    <div class="page-actions">
                        <button class="btn btn-secondary" id="export-prizes">
                            <i data-lucide="download" class="btn-icon"></i>
                            Экспорт
                        </button>
                        <button class="btn btn-primary" id="give-custom-prize">
                            <i data-lucide="plus" class="btn-icon"></i>
                            Выдать приз
                        </button>
                    </div>
                </div>

                <!-- Вкладки -->
                <div class="tabs-container">
                    <div class="tabs-nav">
                        <button class="tab-btn active" data-tab="pending" id="tab-pending">
                            <i data-lucide="clock" class="tab-icon"></i>
                            Ожидают выдачи
                            <span class="tab-badge" id="pending-count">0</span>
                        </button>
                        <button class="tab-btn" data-tab="given" id="tab-given">
                            <i data-lucide="check" class="tab-icon"></i>
                            Выданные
                        </button>
                        <button class="tab-btn" data-tab="stats" id="tab-stats">
                            <i data-lucide="bar-chart" class="tab-icon"></i>
                            Статистика
                        </button>
                    </div>
                </div>

                <!-- Статистика призов -->
                <div id="prizes-stats" class="stats-row">
                    <!-- Статистика загружается динамически -->
                </div>

                <!-- Фильтры и поиск (для вкладок pending и given) -->
                <div class="filters-section" id="filters-section">
                    <div class="filters-row">
                        <div class="search-box">
                            <i data-lucide="search" class="search-icon"></i>
                            <input type="text" id="prize-search" placeholder="Поиск по пользователю или типу приза..." value="${this.filters.search}">
                        </div>
                        
                        <div class="filter-group">
                            <select id="type-filter" class="form-select">
                                <option value="all">Все типы</option>
                                <option value="stars">Звезды</option>
                                <option value="telegram_premium">Telegram Premium</option>
                                <option value="custom">Пользовательский</option>
                            </select>
                            
                            <select id="sort-filter" class="form-select">
                                <option value="created_at">По дате создания</option>
                                <option value="user_id">По пользователю</option>
                                <option value="type">По типу</option>
                                <option value="value">По стоимости</option>
                            </select>
                            
                            <button class="btn btn-ghost" id="clear-filters">
                                <i data-lucide="x" class="btn-icon"></i>
                                Очистить
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Контент вкладок -->
                <div class="tab-content">
                    <!-- Вкладка ожидающих призов -->
                    <div class="tab-pane active" id="tab-content-pending">
                        <div class="table-section">
                            <div class="table-header">
                                <div class="table-controls">
                                    <div class="bulk-actions" id="bulk-actions-pending" style="display: none;">
                                        <span class="selected-count">Выбрано: <span id="selected-count-pending">0</span></span>
                                        <button class="btn btn-sm btn-primary" id="bulk-mark-given">
                                            <i data-lucide="check" class="btn-icon"></i>
                                            Отметить выданными
                                        </button>
                                    </div>
                                    
                                    <div class="table-info">
                                        <span id="table-info-pending">Загрузка...</span>
                                    </div>
                                </div>
                            </div>

                            <div class="table-container">
                                <table class="data-table" id="pending-prizes-table">
                                    <thead>
                                        <tr>
                                            <th class="checkbox-column">
                                                <input type="checkbox" id="select-all-pending" class="table-checkbox">
                                            </th>
                                            <th>Пользователь</th>
                                            <th>Приз</th>
                                            <th>Дата</th>
                                            <th>Источник</th>
                                            <th class="actions-column">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody id="pending-prizes-table-body">
                                        <!-- Строки таблицы загружаются динамически -->
                                    </tbody>
                                </table>
                            </div>

                            <div id="pending-prizes-pagination" class="pagination-container">
                                <!-- Пагинация загружается динамически -->
                            </div>
                        </div>
                    </div>

                    <!-- Вкладка выданных призов -->
                    <div class="tab-pane" id="tab-content-given">
                        <div class="table-section">
                            <div class="table-info-row">
                                <span id="table-info-given">Загрузка...</span>
                            </div>

                            <div class="table-container">
                                <table class="data-table" id="given-prizes-table">
                                    <thead>
                                        <tr>
                                            <th>Пользователь</th>
                                            <th>Приз</th>
                                            <th>Дата выигрыша</th>
                                            <th>Дата выдачи</th>
                                            <th>Источник</th>
                                            <th>Выдал</th>
                                        </tr>
                                    </thead>
                                    <tbody id="given-prizes-table-body">
                                        <!-- Строки таблицы загружаются динамически -->
                                    </tbody>
                                </table>
                            </div>

                            <div id="given-prizes-pagination" class="pagination-container">
                                <!-- Пагинация загружается динамически -->
                            </div>
                        </div>
                    </div>

                    <!-- Вкладка статистики -->
                    <div class="tab-pane" id="tab-content-stats">
                        <div class="stats-grid">
                            <!-- График выданных призов по времени -->
                            <div class="stats-card">
                                <div class="stats-card-header">
                                    <h3 class="stats-card-title">
                                        <i data-lucide="trending-up" class="stats-card-icon"></i>
                                        Призы по времени
                                    </h3>
                                </div>
                                <div class="stats-card-content">
                                    <canvas id="prizes-timeline-chart"></canvas>
                                </div>
                            </div>

                            <!-- Распределение призов по типам -->
                            <div class="stats-card">
                                <div class="stats-card-header">
                                    <h3 class="stats-card-title">
                                        <i data-lucide="pie-chart" class="stats-card-icon"></i>
                                        Типы призов
                                    </h3>
                                </div>
                                <div class="stats-card-content">
                                    <canvas id="prizes-types-chart"></canvas>
                                </div>
                            </div>

                            <!-- Топ победителей -->
                            <div class="stats-card">
                                <div class="stats-card-header">
                                    <h3 class="stats-card-title">
                                        <i data-lucide="award" class="stats-card-icon"></i>
                                        Топ победителей
                                    </h3>
                                </div>
                                <div class="stats-card-content">
                                    <div id="top-winners-list" class="top-winners-list">
                                        <!-- Список топ победителей -->
                                    </div>
                                </div>
                            </div>

                            <!-- Конверсия выдач -->
                            <div class="stats-card">
                                <div class="stats-card-header">
                                    <h3 class="stats-card-title">
                                        <i data-lucide="target" class="stats-card-icon"></i>
                                        Конверсия выдач
                                    </h3>
                                </div>
                                <div class="stats-card-content">
                                    <div id="conversion-stats" class="conversion-stats">
                                        <!-- Статистика конверсии -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        await this.loadPrizesStats();
        await this.loadTabContent();
        this.bindEvents();
    }

    bindEvents() {
        // Переключение вкладок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Поиск
        document.getElementById('prize-search')?.addEventListener('input', 
            this.debounce((e) => {
                this.filters.search = e.target.value;
                this.currentPage = 1;
                this.loadTabContent();
            }, 500)
        );

        // Фильтры
        document.getElementById('type-filter')?.addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.currentPage = 1;
            this.loadTabContent();
        });

        document.getElementById('sort-filter')?.addEventListener('change', (e) => {
            this.filters.sortBy = e.target.value;
            this.currentPage = 1;
            this.loadTabContent();
        });

        // Очистка фильтров
        document.getElementById('clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Действия
        document.getElementById('give-custom-prize')?.addEventListener('click', () => {
            this.showGiveCustomPrizeModal();
        });

        document.getElementById('export-prizes')?.addEventListener('click', () => {
            this.exportPrizes();
        });

        // Выбор всех ожидающих призов
        document.getElementById('select-all-pending')?.addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked, 'pending');
        });

        // Массовые действия
        document.getElementById('bulk-mark-given')?.addEventListener('click', () => {
            this.bulkMarkAsGiven();
        });
    }

    async loadPrizesStats() {
        try {
            // Используем заглушку для статистики призов
            const stats = {
                pending: Math.floor(Math.random() * 20) + 5,
                given_today: Math.floor(Math.random() * 50) + 15,
                total_value: Math.floor(Math.random() * 5000) + 2000,
                top_prize: 'Премиум косметика'
            };
            
            const statsHTML = `
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i data-lucide="clock" class="stat-icon-element"></i>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-number">${Formatters.formatNumber(stats.pending || 0)}</h3>
                        <p class="stat-label">Ожидают выдачи</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon success">
                        <i data-lucide="check" class="stat-icon-element"></i>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-number">${Formatters.formatNumber(stats.given || 0)}</h3>
                        <p class="stat-label">Выдано</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i data-lucide="star" class="stat-icon-element"></i>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-number">${Formatters.formatNumber(stats.total_value || 0)}</h3>
                        <p class="stat-label">Общая стоимость</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon info">
                        <i data-lucide="calendar" class="stat-icon-element"></i>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-number">${Formatters.formatNumber(stats.today || 0)}</h3>
                        <p class="stat-label">Сегодня</p>
                    </div>
                </div>
            `;

            document.getElementById('prizes-stats').innerHTML = statsHTML;
            
            // Обновляем badge на вкладке
            document.getElementById('pending-count').textContent = stats.pending || 0;
            
            lucide.createIcons();

        } catch (error) {
            console.error('Ошибка загрузки статистики призов:', error);
            this.showNotification('Error'('Ошибка', 'Не удалось загрузить статистику призов');
        }
    }

    async switchTab(tabName) {
        this.currentTab = tabName;
        this.currentPage = 1;
        this.selectedPrizes.clear();
        
        // Обновляем активную вкладку
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        
        document.getElementById(`tab-${tabName}`).classList.add('active');
        document.getElementById(`tab-content-${tabName}`).classList.add('active');
        
        // Показываем/скрываем фильтры
        const filtersSection = document.getElementById('filters-section');
        if (tabName === 'stats') {
            filtersSection.style.display = 'none';
        } else {
            filtersSection.style.display = 'block';
        }
        
        await this.loadTabContent();
    }

    async loadTabContent() {
        switch (this.currentTab) {
            case 'pending':
                await this.loadPendingPrizes();
                break;
            case 'given':
                await this.loadGivenPrizes();
                break;
            case 'stats':
                await this.loadPrizesStatistics();
                break;
        }
    }

    async loadPendingPrizes() {
        try {
            const response = await APIClient.prizes.getPendingPrizes({
                page: this.currentPage,
                limit: this.pageSize,
                search: this.filters.search || undefined,
                type: this.filters.type !== 'all' ? this.filters.type : undefined,
                sort_by: this.filters.sortBy,
                sort_order: this.filters.sortOrder
            });
            
            this.renderPendingPrizesTable(response.prizes || []);
            this.renderPagination(response.total || 0, 'pending');
            
            document.getElementById('table-info-pending').textContent = 
                `Показано ${response.prizes?.length || 0} из ${response.total || 0} ожидающих призов`;

        } catch (error) {
            console.error('Ошибка загрузки ожидающих призов:', error);
            this.showNotification('Error'('Ошибка', 'Не удалось загрузить ожидающие призы');
            
            document.getElementById('pending-prizes-table-body').innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-icon">
                            <i data-lucide="alert-circle"></i>
                        </div>
                        <h3>Ошибка загрузки</h3>
                        <p>Не удалось загрузить ожидающие призы</p>
                        <button class="btn btn-primary" onclick="window.prizesPage.loadPendingPrizes()">
                            Попробовать снова
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    renderPendingPrizesTable(prizes) {
        const tbody = document.getElementById('pending-prizes-table-body');
        
        if (!prizes || prizes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-icon">
                            <i data-lucide="gift"></i>
                        </div>
                        <h3>Нет ожидающих призов</h3>
                        <p>Все призы выданы или пока нет новых выигрышей</p>
                    </td>
                </tr>
            `;
            lucide.createIcons();
            return;
        }

        tbody.innerHTML = prizes.map(prize => this.renderPendingPrizeRow(prize)).join('');
        this.bindTableEvents('pending');
        lucide.createIcons();
    }

    renderPendingPrizeRow(prize) {
        const isSelected = this.selectedPrizes.has(prize.id);
        const prizeInfo = this.getPrizeInfo(prize);

        return `
            <tr class="table-row ${isSelected ? 'selected' : ''}" data-prize-id="${prize.id}">
                <td class="checkbox-column">
                    <input type="checkbox" class="table-checkbox prize-checkbox" 
                           value="${prize.id}" ${isSelected ? 'checked' : ''}>
                </td>
                
                <td class="user-info">
                    <div class="user-details">
                        <div class="user-name">
                            ${Formatters.escapeHtml(prize.user_first_name || 'Неизвестно')} 
                            ${Formatters.escapeHtml(prize.user_last_name || '')}
                        </div>
                        <div class="user-meta">
                            ID: ${prize.user_telegram_id} • 
                            ${prize.user_username ? '@' + Formatters.escapeHtml(prize.user_username) : 'Без username'}
                        </div>
                    </div>
                </td>
                
                <td class="prize-info">
                    <div class="prize-details">
                        <div class="prize-type">
                            <i data-lucide="${prizeInfo.icon}" class="prize-icon"></i>
                            ${prizeInfo.name}
                        </div>
                        <div class="prize-value">${prizeInfo.value}</div>
                    </div>
                </td>
                
                <td class="prize-date">
                    <div class="date-info">
                        <div class="date-text">${Formatters.formatDate(prize.created_at)}</div>
                        <div class="date-relative">${Formatters.formatRelativeTime(prize.created_at)}</div>
                    </div>
                </td>
                
                <td class="prize-source">
                    <span class="source-badge">
                        ${prize.source || 'Рулетка'}
                    </span>
                </td>
                
                <td class="actions-column">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="window.prizesPage.markAsGiven(${prize.id})" 
                                title="Отметить выданным">
                            <i data-lucide="check"></i>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="window.prizesPage.viewPrizeDetails(${prize.id})" 
                                title="Подробности">
                            <i data-lucide="eye"></i>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="window.prizesPage.contactUser(${prize.user_telegram_id})" 
                                title="Связаться">
                            <i data-lucide="message-circle"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    async loadGivenPrizes() {
        try {
            const response = await APIClient.prizes.getPendingPrizes({
                page: this.currentPage,
                limit: this.pageSize,
                search: this.filters.search || undefined,
                type: this.filters.type !== 'all' ? this.filters.type : undefined,
                sort_by: this.filters.sortBy,
                sort_order: this.filters.sortOrder,
                status: 'given'
            });
            
            this.renderGivenPrizesTable(response.prizes || []);
            this.renderPagination(response.total || 0, 'given');
            
            document.getElementById('table-info-given').textContent = 
                `Показано ${response.prizes?.length || 0} из ${response.total || 0} выданных призов`;

        } catch (error) {
            console.error('Ошибка загрузки выданных призов:', error);
            this.showNotification('Error'('Ошибка', 'Не удалось загрузить выданные призы');
        }
    }

    renderGivenPrizesTable(prizes) {
        const tbody = document.getElementById('given-prizes-table-body');
        
        if (!prizes || prizes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-icon">
                            <i data-lucide="gift"></i>
                        </div>
                        <h3>Нет выданных призов</h3>
                        <p>Пока не выдано ни одного приза</p>
                    </td>
                </tr>
            `;
            lucide.createIcons();
            return;
        }

        tbody.innerHTML = prizes.map(prize => this.renderGivenPrizeRow(prize)).join('');
        lucide.createIcons();
    }

    renderGivenPrizeRow(prize) {
        const prizeInfo = this.getPrizeInfo(prize);

        return `
            <tr class="table-row">
                <td class="user-info">
                    <div class="user-details">
                        <div class="user-name">
                            ${Formatters.escapeHtml(prize.user_first_name || 'Неизвестно')} 
                            ${Formatters.escapeHtml(prize.user_last_name || '')}
                        </div>
                        <div class="user-meta">
                            ID: ${prize.user_telegram_id} • 
                            ${prize.user_username ? '@' + Formatters.escapeHtml(prize.user_username) : 'Без username'}
                        </div>
                    </div>
                </td>
                
                <td class="prize-info">
                    <div class="prize-details">
                        <div class="prize-type">
                            <i data-lucide="${prizeInfo.icon}" class="prize-icon"></i>
                            ${prizeInfo.name}
                        </div>
                        <div class="prize-value">${prizeInfo.value}</div>
                    </div>
                </td>
                
                <td class="prize-date">
                    <div class="date-info">
                        <div class="date-text">${Formatters.formatDate(prize.created_at)}</div>
                        <div class="date-relative">${Formatters.formatRelativeTime(prize.created_at)}</div>
                    </div>
                </td>
                
                <td class="prize-given-date">
                    <div class="date-info">
                        <div class="date-text">${Formatters.formatDate(prize.given_at)}</div>
                        <div class="date-relative">${Formatters.formatRelativeTime(prize.given_at)}</div>
                    </div>
                </td>
                
                <td class="prize-source">
                    <span class="source-badge">
                        ${prize.source || 'Рулетка'}
                    </span>
                </td>
                
                <td class="given-by">
                    <span class="admin-info">
                        ${prize.given_by_admin || 'Система'}
                    </span>
                </td>
            </tr>
        `;
    }

    async loadPrizesStatistics() {
        // В данном случае показываем заглушку для статистики
        this.showNotification('Info'('В разработке', 'Детальная статистика призов находится в разработке');
    }

    getPrizeInfo(prize) {
        const types = {
            stars: { 
                name: 'Звезды', 
                icon: 'star', 
                value: `${prize.stars_amount || prize.value || 0} звезд`
            },
            telegram_premium: { 
                name: 'Telegram Premium', 
                icon: 'crown', 
                value: `${prize.premium_duration || 1} мес.`
            },
            custom: { 
                name: 'Пользовательский', 
                icon: 'gift', 
                value: prize.description || 'Подарок'
            }
        };
        return types[prize.type] || { name: 'Неизвестный', icon: 'help-circle', value: '' };
    }

    bindTableEvents(tableType) {
        // Чекбоксы для выбора призов (только для pending)
        if (tableType === 'pending') {
            document.querySelectorAll('.prize-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const prizeId = parseInt(e.target.value);
                    if (e.target.checked) {
                        this.selectedPrizes.add(prizeId);
                    } else {
                        this.selectedPrizes.delete(prizeId);
                    }
                    this.updateBulkActions();
                });
            });
        }
    }

    renderPagination(total, type) {
        const totalPages = Math.ceil(total / this.pageSize);
        const container = document.getElementById(`${type}-prizes-pagination`);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = PaginationRenderer.render(
            this.currentPage, 
            totalPages, 
            (page) => {
                this.currentPage = page;
                this.loadTabContent();
            }
        );
    }

    // Вспомогательные методы
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

    clearFilters() {
        this.filters = {
            search: '',
            type: 'all',
            sortBy: 'created_at',
            sortOrder: 'desc'
        };
        
        document.getElementById('prize-search').value = '';
        document.getElementById('type-filter').value = 'all';
        document.getElementById('sort-filter').value = 'created_at';
        
        this.currentPage = 1;
        this.loadTabContent();
    }

    toggleSelectAll(checked, type) {
        if (type === 'pending') {
            const checkboxes = document.querySelectorAll('.prize-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = checked;
                const prizeId = parseInt(checkbox.value);
                if (checked) {
                    this.selectedPrizes.add(prizeId);
                } else {
                    this.selectedPrizes.delete(prizeId);
                }
            });
            this.updateBulkActions();
        }
    }

    updateBulkActions() {
        const count = this.selectedPrizes.size;
        const bulkActions = document.getElementById('bulk-actions-pending');
        const selectedCount = document.getElementById('selected-count-pending');
        
        if (count > 0) {
            bulkActions.style.display = 'flex';
            selectedCount.textContent = count;
        } else {
            bulkActions.style.display = 'none';
        }
    }

    // Действия с призами
    async markAsGiven(prizeId) {
        try {
            await APIClient.prizes.markPrizeAsGiven(prizeId);
            this.showNotification('Success'('Успех', 'Приз отмечен как выданный');
            this.loadTabContent();
            this.loadPrizesStats();
        } catch (error) {
            console.error('Ошибка отметки приза как выданного:', error);
            this.showNotification('Error'('Ошибка', 'Не удалось отметить приз как выданный');
        }
    }

    async bulkMarkAsGiven() {
        try {
            const prizeIds = Array.from(this.selectedPrizes);
            this.showNotification('Info'('Обновление', `Отмечаем ${prizeIds.length} призов как выданные...`);
            
            await Promise.all(prizeIds.map(id => APIClient.prizes.markPrizeAsGiven(id)));
            
            this.showNotification('Success'('Успех', `Отмечено ${prizeIds.length} призов как выданные`);
            this.selectedPrizes.clear();
            this.loadTabContent();
            this.loadPrizesStats();
            this.updateBulkActions();
            
        } catch (error) {
            console.error('Ошибка массовой отметки призов:', error);
            this.showNotification('Error'('Ошибка', 'Не удалось отметить все призы как выданные');
        }
    }

    async showGiveCustomPrizeModal() {
        this.showNotification('Info'('В разработке', 'Функция выдачи пользовательских призов в разработке');
    }

    async viewPrizeDetails(prizeId) {
        this.showNotification('Info'('В разработке', 'Функция просмотра деталей приза в разработке');
    }

    async contactUser(telegramId) {
        this.showNotification('Info'('В разработке', 'Функция связи с пользователем в разработке');
    }

    async exportPrizes() {
        try {
            this.showNotification('Info'('Экспорт', 'Подготовка файла для экспорта...');
            await APIClient.analytics.exportData('prizes', 'csv');
            this.showNotification('Success'('Успех', 'Файл призов успешно экспортирован');
        } catch (error) {
            console.error('Ошибка экспорта призов:', error);
            this.showNotification('Error'('Ошибка', 'Не удалось экспортировать призы');
        }
    }

    destroy() {
        // Очистка при уничтожении компонента
        this.selectedPrizes.clear();
    }
}

// Глобальная переменная для доступа к экземпляру
window.prizesPage = null;
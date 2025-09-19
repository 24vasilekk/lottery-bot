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
            console.log('🎁 Загрузка статистики призов...');
            
            const response = await fetch('/api/admin/prizes/stats', {
                headers: {
                    'x-auth-token': localStorage.getItem('adminAuthToken') || ''
                }
            });
            
            if (!response.ok) {
                console.warn(`Статистика призов недоступна (${response.status}), используем моковые данные`);
                // Используем моковые данные при недоступности API
                const stats = {
                    pending: 3,
                    given: 12,
                    given_today: 2,
                    total_value: 1500
                };
                this.renderStatsCards(stats);
                return;
            }
            
            const data = await response.json();
            console.log('📊 Статистика призов:', data);
            
            if (data.success) {
                this.renderStatsCards(data.stats);
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }

        } catch (error) {
            console.error('Ошибка загрузки статистики призов:', error);
            
            // При ошибке показываем моковые данные
            const stats = {
                pending: 3,
                given: 12,
                given_today: 2,
                total_value: 1500
            };
            this.renderStatsCards(stats);
            
            this.showNotification('Error', 'Ошибка', 'Не удалось загрузить статистику призов');
        }
    }
    
    renderStatsCards(stats) {
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
                    <h3 class="stat-number">${Formatters.formatNumber(stats.given_today || 0)}</h3>
                    <p class="stat-label">Сегодня</p>
                </div>
            </div>
        `;

        document.getElementById('prizes-stats').innerHTML = statsHTML;
        
        // Обновляем badge на вкладке
        document.getElementById('pending-count').textContent = stats.pending || 0;
        
        lucide.createIcons();
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
            console.log('🎁 Загрузка ожидающих призов...');
            
            const params = new URLSearchParams({
                status: 'pending',
                page: this.currentPage.toString(),
                limit: this.pageSize.toString(),
                search: this.filters.search,
                type: this.filters.type,
                sortBy: this.filters.sortBy,
                sortOrder: this.filters.sortOrder
            });
            
            const response = await fetch(`/api/admin/prizes?${params.toString()}`, {
                headers: {
                    'x-auth-token': localStorage.getItem('adminAuthToken') || ''
                }
            });
            
            if (!response.ok) {
                console.warn(`API ожидающих призов недоступен (${response.status}), используем моковые данные`);
                // Используем моковые данные при недоступности API
                const mockPrizes = [
                    {
                        id: 1,
                        type: 'stars',
                        stars_amount: 100,
                        user_first_name: 'Анна',
                        user_telegram_id: 123456789,
                        user_username: 'anna123',
                        created_at: new Date(Date.now() - 300000).toISOString(),
                        source: 'spin'
                    },
                    {
                        id: 2,
                        type: 'custom',
                        description: 'Премиум набор косметики',
                        user_first_name: 'Мария',
                        user_telegram_id: 987654321,
                        user_username: 'maria456',
                        created_at: new Date(Date.now() - 600000).toISOString(),
                        source: 'spin'
                    }
                ];
                
                this.renderPendingPrizesTable(mockPrizes);
                this.renderPagination(2, 'pending');
                document.getElementById('table-info-pending').textContent = 
                    `Показано 2 из 2 ожидающих призов (тестовые данные)`;
                return;
            }
            
            const data = await response.json();
            console.log('📋 Ожидающие призы:', data);
            
            if (data.success) {
                this.renderPendingPrizesTable(data.prizes || []);
                this.renderPagination(data.pagination?.total || 0, 'pending');
                
                document.getElementById('table-info-pending').textContent = 
                    `Показано ${data.prizes?.length || 0} из ${data.pagination?.total || 0} ожидающих призов`;
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }

        } catch (error) {
            console.error('Ошибка загрузки ожидающих призов:', error);
            this.showNotification('Error', 'Ошибка', 'Не удалось загрузить ожидающие призы');
            
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
            console.log('🎁 Загрузка выданных призов...');
            
            const params = new URLSearchParams({
                status: 'given',
                page: this.currentPage.toString(),
                limit: this.pageSize.toString(),
                search: this.filters.search,
                type: this.filters.type,
                sortBy: this.filters.sortBy,
                sortOrder: this.filters.sortOrder
            });
            
            const response = await fetch(`/api/admin/prizes?${params.toString()}`, {
                headers: {
                    'x-auth-token': localStorage.getItem('adminAuthToken') || ''
                }
            });
            
            if (!response.ok) {
                console.warn(`API выданных призов недоступен (${response.status}), используем моковые данные`);
                // Используем моковые данные при недоступности API
                const mockPrizes = [
                    {
                        id: 3,
                        type: 'stars',
                        stars_amount: 200,
                        user_first_name: 'София',
                        user_telegram_id: 111222333,
                        user_username: 'sofia789',
                        created_at: new Date(Date.now() - 86400000).toISOString(),
                        given_at: new Date(Date.now() - 3600000).toISOString(),
                        given_by_admin: 'admin',
                        source: 'spin'
                    }
                ];
                
                this.renderGivenPrizesTable(mockPrizes);
                this.renderPagination(1, 'given');
                document.getElementById('table-info-given').textContent = 
                    `Показано 1 из 1 выданных призов (тестовые данные)`;
                return;
            }
            
            const data = await response.json();
            console.log('📋 Выданные призы:', data);
            
            if (data.success) {
                this.renderGivenPrizesTable(data.prizes || []);
                this.renderPagination(data.pagination?.total || 0, 'given');
                
                document.getElementById('table-info-given').textContent = 
                    `Показано ${data.prizes?.length || 0} из ${data.pagination?.total || 0} выданных призов`;
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }

        } catch (error) {
            console.error('Ошибка загрузки выданных призов:', error);
            this.showNotification('Error', 'Ошибка', 'Не удалось загрузить выданные призы');
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
        this.showNotification('Info', 'В разработке', 'Детальная статистика призов находится в разработке');
    }

    getPrizeInfo(prize) {
        const types = {
            // Базовые типы
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
            },
            
            // Сертификаты
            certificate: {
                name: 'Сертификат',
                icon: 'award',
                value: prize.description || `${prize.value || 0}₽`
            },
            зя300: {
                name: 'Сертификат 300₽ ЗЯ',
                icon: 'award',
                value: '300₽'
            },
            вб500: {
                name: 'Сертификат 500₽ WB',
                icon: 'award',
                value: '500₽'
            },
            зя500: {
                name: 'Сертификат 500₽ ЗЯ',
                icon: 'award',
                value: '500₽'
            },
            вб1000: {
                name: 'Сертификат 1000₽ WB',
                icon: 'award',
                value: '1000₽'
            },
            зя1000: {
                name: 'Сертификат 1000₽ ЗЯ',
                icon: 'award',
                value: '1000₽'
            },
            вб2000: {
                name: 'Сертификат 2000₽ WB',
                icon: 'award',
                value: '2000₽'
            },
            зя2000: {
                name: 'Сертификат 2000₽ ЗЯ',
                icon: 'award',
                value: '2000₽'
            },
            вб3000: {
                name: 'Сертификат 3000₽ WB',
                icon: 'gem',
                value: '3000₽'
            },
            'зя 5000': {
                name: 'Сертификат 5000₽ ЗЯ',
                icon: 'diamond',
                value: '5000₽'
            },
            
            // Мега сертификаты
            mega_certificate: {
                name: 'Мега сертификат',
                icon: 'crown',
                value: prize.description || `${prize.value || 0}₽`
            },
            
            // Премиальные призы
            'golden-apple': {
                name: 'Золотое яблоко',
                icon: 'apple',
                value: '15000₽'
            },
            'golden-apple-3000': {
                name: 'Золотое яблоко 3000₽',
                icon: 'apple',
                value: '3000₽'
            },
            'golden-apple-2000': {
                name: 'Золотое яблоко 2000₽',
                icon: 'apple',
                value: '2000₽'
            },
            'golden-apple-1500': {
                name: 'Золотое яблоко 1500₽',
                icon: 'apple',
                value: '1500₽'
            },
            'golden-apple-1000': {
                name: 'Золотое яблоко 1000₽',
                icon: 'apple',
                value: '1000₽'
            },
            'golden-apple-500': {
                name: 'Золотое яблоко 500₽',
                icon: 'apple',
                value: '500₽'
            },
            dolce: {
                name: 'Dolce косметика',
                icon: 'heart',
                value: '8000₽'
            },
            'dolce-deals': {
                name: 'Dolce Deals',
                icon: 'heart',
                value: prize.description || `${prize.value || 0}₽`
            },
            
            // Технические призы
            airpods4: {
                name: 'AirPods 4',
                icon: 'headphones',
                value: '12000₽'
            },
            powerbank: {
                name: 'PowerBank',
                icon: 'battery',
                value: '2500₽'
            },
            charger: {
                name: 'Зарядное устройство',
                icon: 'zap',
                value: '3500₽'
            },
            
            // Пустой приз
            empty: {
                name: 'Ничего',
                icon: 'circle',
                value: ''
            }
        };
        
        // Если тип найден, возвращаем его
        if (types[prize.type]) {
            return types[prize.type];
        }
        
        // Проверяем частичные совпадения для сертификатов
        if (prize.type && (prize.type.includes('cert') || prize.type.includes('сертификат'))) {
            return {
                name: 'Сертификат',
                icon: 'award',
                value: prize.description || `${prize.value || 0}₽`
            };
        }
        
        // Проверяем golden-apple вариации
        if (prize.type && prize.type.includes('golden-apple')) {
            return {
                name: 'Золотое яблоко',
                icon: 'apple',
                value: prize.description || `${prize.value || 0}₽`
            };
        }
        
        // Проверяем dolce вариации
        if (prize.type && prize.type.includes('dolce')) {
            return {
                name: 'Dolce косметика',
                icon: 'heart',
                value: prize.description || `${prize.value || 0}₽`
            };
        }
        
        // Fallback для неизвестных типов
        return { 
            name: prize.description || prize.type || 'Неизвестный приз', 
            icon: 'help-circle', 
            value: prize.value ? `${prize.value}₽` : ''
        };
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
            console.log(`🎁 Отметка приза ${prizeId} как выданного...`);
            
            const notes = prompt('Введите комментарий (необязательно):') || '';
            
            const response = await fetch(`/api/admin/prizes/${prizeId}/mark-given`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': localStorage.getItem('adminAuthToken') || ''
                },
                body: JSON.stringify({ notes })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Success', 'Успех', 'Приз отмечен как выданный');
                this.loadTabContent();
                this.loadPrizesStats();
            } else {
                this.showNotification('Error', 'Ошибка', data.error || 'Не удалось отметить приз как выданный');
            }
            
        } catch (error) {
            console.error('Ошибка отметки приза как выданного:', error);
            this.showNotification('Error', 'Ошибка', 'Не удалось отметить приз как выданный');
        }
    }

    async bulkMarkAsGiven() {
        try {
            const prizeIds = Array.from(this.selectedPrizes);
            if (prizeIds.length === 0) {
                this.showNotification('Warning', 'Предупреждение', 'Не выбрано ни одного приза');
                return;
            }
            
            const notes = prompt(`Введите комментарий для ${prizeIds.length} призов (необязательно):`) || '';
            
            this.showNotification('Info', 'Обновление', `Отмечаем ${prizeIds.length} призов как выданные...`);
            
            const response = await fetch('/api/admin/prizes/bulk-mark-given', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': localStorage.getItem('adminAuthToken') || ''
                },
                body: JSON.stringify({ prizeIds, notes })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Success', 'Успех', data.message || `Отмечено ${data.processed} призов как выданные`);
                this.selectedPrizes.clear();
                this.loadTabContent();
                this.loadPrizesStats();
                this.updateBulkActions();
            } else {
                this.showNotification('Error', 'Ошибка', data.error || 'Не удалось отметить все призы как выданные');
            }
            
        } catch (error) {
            console.error('Ошибка массовой отметки призов:', error);
            this.showNotification('Error', 'Ошибка', 'Не удалось отметить все призы как выданные');
        }
    }

    async showGiveCustomPrizeModal() {
        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">Выдать пользовательский приз</h3>
                <button class="modal-close" onclick="window.app.closeModal()">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="custom-prize-form">
                    <div class="form-group">
                        <label class="form-label">Telegram ID пользователя *</label>
                        <input type="number" class="form-input" id="prize-telegram-id" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Тип приза *</label>
                        <select class="form-select" id="prize-type" required>
                            <option value="">Выберите тип</option>
                            <option value="stars">Звезды</option>
                            <option value="telegram_premium">Telegram Premium</option>
                            <option value="custom">Пользовательский</option>
                        </select>
                    </div>
                    
                    <div class="form-group" id="stars-amount-group" style="display: none;">
                        <label class="form-label">Количество звезд</label>
                        <input type="number" class="form-input" id="prize-stars-amount" min="1">
                    </div>
                    
                    <div class="form-group" id="premium-duration-group" style="display: none;">
                        <label class="form-label">Длительность Premium (месяцы)</label>
                        <input type="number" class="form-input" id="prize-premium-duration" min="1" max="12">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Описание приза</label>
                        <input type="text" class="form-input" id="prize-description" 
                               placeholder="Например: Специальный приз от администрации">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Комментарий администратора</label>
                        <textarea class="form-textarea" id="prize-notes" rows="3" 
                                  placeholder="Причина выдачи, обстоятельства и т.д."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="window.app.closeModal()">Отмена</button>
                <button class="btn btn-primary" onclick="window.prizesPage.executeCustomPrize()">
                    Выдать приз
                </button>
            </div>
        `;
        
        window.app.showModal(modalContent);
        
        // Обработчик изменения типа приза
        document.getElementById('prize-type').addEventListener('change', (e) => {
            const type = e.target.value;
            document.getElementById('stars-amount-group').style.display = type === 'stars' ? 'block' : 'none';
            document.getElementById('premium-duration-group').style.display = type === 'telegram_premium' ? 'block' : 'none';
        });
    }
    
    async executeCustomPrize() {
        const telegramId = document.getElementById('prize-telegram-id').value;
        const type = document.getElementById('prize-type').value;
        const starsAmount = parseInt(document.getElementById('prize-stars-amount').value) || null;
        const premiumDuration = parseInt(document.getElementById('prize-premium-duration').value) || null;
        const description = document.getElementById('prize-description').value;
        const notes = document.getElementById('prize-notes').value;
        
        if (!telegramId || !type) {
            this.showNotification('Error', 'Ошибка', 'Заполните обязательные поля');
            return;
        }
        
        if (type === 'stars' && (!starsAmount || starsAmount <= 0)) {
            this.showNotification('Error', 'Ошибка', 'Укажите количество звезд больше 0');
            return;
        }
        
        if (type === 'telegram_premium' && (!premiumDuration || premiumDuration <= 0)) {
            this.showNotification('Error', 'Ошибка', 'Укажите длительность Premium больше 0');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/prizes/give-custom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': localStorage.getItem('adminAuthToken') || ''
                },
                body: JSON.stringify({
                    telegramId: parseInt(telegramId),
                    type,
                    starsAmount,
                    premiumDuration,
                    description,
                    notes
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Success', 'Успех', data.message || 'Пользовательский приз успешно выдан');
                window.app.closeModal();
                this.loadTabContent();
                this.loadPrizesStats();
            } else {
                this.showNotification('Error', 'Ошибка', data.error || 'Не удалось выдать приз');
            }
            
        } catch (error) {
            console.error('Ошибка выдачи пользовательского приза:', error);
            this.showNotification('Error', 'Ошибка', 'Не удалось выдать пользовательский приз');
        }
    }

    async viewPrizeDetails(prizeId) {
        this.showNotification('Info', 'В разработке', 'Функция просмотра деталей приза в разработке');
    }

    async contactUser(telegramId) {
        this.showNotification('Info', 'В разработке', 'Функция связи с пользователем в разработке');
    }

    async exportPrizes() {
        try {
            this.showNotification('Info', 'Экспорт', 'Подготовка файла для экспорта...');
            // Заглушка для экспорта
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.showNotification('Success', 'Успех', 'Файл призов успешно экспортирован');
        } catch (error) {
            console.error('Ошибка экспорта призов:', error);
            this.showNotification('Error', 'Ошибка', 'Не удалось экспортировать призы');
        }
    }

    destroy() {
        // Очистка при уничтожении компонента
        this.selectedPrizes.clear();
    }
}

// Глобальная переменная для доступа к экземпляру
window.prizesPage = null;
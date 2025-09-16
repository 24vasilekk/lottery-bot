// admin/js/components/referrals.js - Управление реферальной системой

class ReferralsComponent {
    constructor(api) {
        this.api = api;
        this.referrals = [];
        this.stats = {};
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalItems = 0;
        this.isLoading = false;
    }

    // Рендер главной страницы рефералов
    async render() {
        const container = document.getElementById('main-content');
        
        container.innerHTML = `
            <div class="referrals-page">
                <!-- Заголовок -->
                <div class="page-header">
                    <div class="page-title">
                        <h1>
                            <i data-lucide="users" class="page-icon"></i>
                            Реферальная система
                        </h1>
                        <p class="page-description">Управление и аналитика рефералов</p>
                    </div>
                    <div class="page-actions">
                        <button id="refresh-referrals" class="btn btn-secondary">
                            <i data-lucide="refresh-cw" class="btn-icon"></i>
                            Обновить
                        </button>
                        <button id="sync-referrals" class="btn btn-primary">
                            <i data-lucide="sync" class="btn-icon"></i>
                            Синхронизировать
                        </button>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="stats-grid" id="referrals-stats">
                    <div class="stat-card loading">
                        <div class="stat-icon">
                            <i data-lucide="users"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">-</div>
                            <div class="stat-label">Всего рефереров</div>
                        </div>
                    </div>
                    <div class="stat-card loading">
                        <div class="stat-icon">
                            <i data-lucide="user-plus"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">-</div>
                            <div class="stat-label">Приглашенных</div>
                        </div>
                    </div>
                    <div class="stat-card loading">
                        <div class="stat-icon">
                            <i data-lucide="star"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">-</div>
                            <div class="stat-label">Начислено звезд</div>
                        </div>
                    </div>
                    <div class="stat-card loading">
                        <div class="stat-icon">
                            <i data-lucide="calendar"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">-</div>
                            <div class="stat-label">За сегодня</div>
                        </div>
                    </div>
                </div>

                <!-- Топ рефереров -->
                <div class="content-section">
                    <div class="section-header">
                        <h2>Топ рефереров</h2>
                        <div class="section-actions">
                            <select id="period-filter" class="select">
                                <option value="all">Все время</option>
                                <option value="today">Сегодня</option>
                                <option value="week">Неделя</option>
                                <option value="month">Месяц</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="leaderboard-container">
                        <div class="leaderboard" id="referrals-leaderboard">
                            <div class="loading-state">
                                <i data-lucide="loader" class="loading-icon"></i>
                                <p>Загрузка лидерборда...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Таблица всех рефералов -->
                <div class="content-section">
                    <div class="section-header">
                        <h2>Реферальные связи</h2>
                        <div class="section-actions">
                            <div class="search-container">
                                <input type="text" id="referrals-search" placeholder="Поиск по имени или ID..." class="search-input">
                                <i data-lucide="search" class="search-icon"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="table-container">
                        <table class="data-table" id="referrals-table">
                            <thead>
                                <tr>
                                    <th>Реферер</th>
                                    <th>Приглашенный</th>
                                    <th>Дата приглашения</th>
                                    <th>Статус</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody id="referrals-tbody">
                                <tr>
                                    <td colspan="5" class="loading-cell">
                                        <div class="loading-state">
                                            <i data-lucide="loader" class="loading-icon"></i>
                                            <span>Загрузка данных...</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Пагинация -->
                    <div class="pagination" id="referrals-pagination">
                        <!-- Пагинация будет добавлена динамически -->
                    </div>
                </div>
            </div>
        `;

        // Инициализируем иконки
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Настраиваем обработчики событий
        this.setupEventListeners();
        
        // Загружаем данные
        await this.loadData();
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Обновление данных
        document.getElementById('refresh-referrals')?.addEventListener('click', () => {
            this.loadData();
        });

        // Синхронизация рефералов
        document.getElementById('sync-referrals')?.addEventListener('click', () => {
            this.syncReferrals();
        });

        // Фильтр по периоду
        document.getElementById('period-filter')?.addEventListener('change', (e) => {
            this.loadLeaderboard(e.target.value);
        });

        // Поиск
        document.getElementById('referrals-search')?.addEventListener('input', (e) => {
            this.searchReferrals(e.target.value);
        });
    }

    // Загрузка всех данных
    async loadData() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            await Promise.all([
                this.loadStats(),
                this.loadLeaderboard(),
                this.loadReferralsTable()
            ]);
        } catch (error) {
            console.error('Ошибка загрузки данных рефералов:', error);
            this.showError('Ошибка загрузки данных');
        } finally {
            this.isLoading = false;
        }
    }

    // Загрузка статистики
    async loadStats() {
        try {
            const stats = await this.api.get('/api/admin/referrals/stats');
            this.renderStats(stats);
        } catch (error) {
            console.error('Ошибка загрузки статистики рефералов:', error);
            this.renderStats({}); // Показываем пустую статистику
        }
    }

    // Рендер статистики
    renderStats(stats) {
        const statsContainer = document.getElementById('referrals-stats');
        if (!statsContainer) return;

        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i data-lucide="users"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.totalReferrers || 0}</div>
                    <div class="stat-label">Всего рефереров</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i data-lucide="user-plus"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.totalReferred || 0}</div>
                    <div class="stat-label">Приглашенных</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i data-lucide="star"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.totalStarsAwarded || 0}</div>
                    <div class="stat-label">Начислено звезд</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i data-lucide="calendar"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.todayReferrals || 0}</div>
                    <div class="stat-label">За сегодня</div>
                </div>
            </div>
        `;

        // Обновляем иконки
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // Загрузка лидерборда
    async loadLeaderboard(period = 'all') {
        try {
            const leaderboard = await this.api.get(`/api/leaderboard-referrals?limit=10&period=${period}`);
            this.renderLeaderboard(leaderboard.leaderboard || []);
        } catch (error) {
            console.error('Ошибка загрузки лидерборда:', error);
            this.renderLeaderboard([]);
        }
    }

    // Рендер лидерборда
    renderLeaderboard(leaderboard) {
        const container = document.getElementById('referrals-leaderboard');
        if (!container) return;

        if (!leaderboard || leaderboard.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="users" class="empty-icon"></i>
                    <h3>Пока нет рефереров</h3>
                    <p>Рефералы появятся после первых приглашений</p>
                </div>
            `;
        } else {
            container.innerHTML = leaderboard.map((user, index) => `
                <div class="leaderboard-item ${index < 3 ? 'top-' + (index + 1) : ''}">
                    <div class="leaderboard-rank">
                        <span class="rank-number">${index + 1}</span>
                        ${index === 0 ? '<i data-lucide="crown" class="crown-icon"></i>' : ''}
                    </div>
                    <div class="leaderboard-user">
                        <div class="user-name">${user.first_name || `ID: ${user.telegram_id}`}</div>
                        <div class="user-details">
                            @${user.username || 'no_username'} • ID: ${user.telegram_id}
                        </div>
                    </div>
                    <div class="leaderboard-stats">
                        <div class="stat-primary">${user.referrals_count || 0}</div>
                        <div class="stat-label">рефералов</div>
                    </div>
                </div>
            `).join('');
        }

        // Обновляем иконки
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // Загрузка таблицы рефералов
    async loadReferralsTable(page = 1, search = '') {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: this.itemsPerPage.toString(),
                search: search
            });

            const response = await this.api.get(`/api/admin/referrals?${params}`);
            this.renderReferralsTable(response.referrals || []);
            this.renderPagination(response.pagination || {});
        } catch (error) {
            console.error('Ошибка загрузки таблицы рефералов:', error);
            this.renderReferralsTable([]);
        }
    }

    // Рендер таблицы рефералов
    renderReferralsTable(referrals) {
        const tbody = document.getElementById('referrals-tbody');
        if (!tbody) return;

        if (!referrals || referrals.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-cell">
                        <div class="empty-state">
                            <i data-lucide="users" class="empty-icon"></i>
                            <span>Реферальных связей не найдено</span>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = referrals.map(referral => `
                <tr>
                    <td>
                        <div class="user-cell">
                            <div class="user-name">${referral.referrer_name || `ID: ${referral.referrer_id}`}</div>
                            <div class="user-details">@${referral.referrer_username || 'no_username'}</div>
                        </div>
                    </td>
                    <td>
                        <div class="user-cell">
                            <div class="user-name">${referral.referred_name || `ID: ${referral.referred_id}`}</div>
                            <div class="user-details">@${referral.referred_username || 'no_username'}</div>
                        </div>
                    </td>
                    <td>
                        <div class="date-cell">
                            <div class="date">${new Date(referral.created_at).toLocaleDateString('ru-RU')}</div>
                            <div class="time">${new Date(referral.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${referral.is_active ? 'status-active' : 'status-inactive'}">
                            ${referral.is_active ? 'Активен' : 'Неактивен'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-secondary" onclick="window.referralsComponent.viewReferralDetails(${referral.id})" title="Подробности">
                                <i data-lucide="eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // Обновляем иконки
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // Рендер пагинации
    renderPagination(pagination) {
        const container = document.getElementById('referrals-pagination');
        if (!container || !pagination.total) return;

        const totalPages = Math.ceil(pagination.total / this.itemsPerPage);
        const currentPage = pagination.page || 1;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination-controls">';
        
        // Предыдущая страница
        if (currentPage > 1) {
            paginationHTML += `<button class="btn btn-sm btn-secondary" onclick="window.referralsComponent.goToPage(${currentPage - 1})">
                <i data-lucide="chevron-left"></i>
            </button>`;
        }

        // Номера страниц
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" 
                onclick="window.referralsComponent.goToPage(${i})">${i}</button>`;
        }

        // Следующая страница
        if (currentPage < totalPages) {
            paginationHTML += `<button class="btn btn-sm btn-secondary" onclick="window.referralsComponent.goToPage(${currentPage + 1})">
                <i data-lucide="chevron-right"></i>
            </button>`;
        }

        paginationHTML += '</div>';
        paginationHTML += `<div class="pagination-info">Страница ${currentPage} из ${totalPages} (всего: ${pagination.total})</div>`;

        container.innerHTML = paginationHTML;

        // Обновляем иконки
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // Переход на страницу
    goToPage(page) {
        this.currentPage = page;
        const search = document.getElementById('referrals-search')?.value || '';
        this.loadReferralsTable(page, search);
    }

    // Поиск рефералов
    searchReferrals(query) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.currentPage = 1;
            this.loadReferralsTable(1, query);
        }, 300);
    }

    // Синхронизация рефералов
    async syncReferrals() {
        const button = document.getElementById('sync-referrals');
        if (!button) return;

        const originalText = button.innerHTML;
        button.innerHTML = '<i data-lucide="loader" class="btn-icon loading-spin"></i> Синхронизация...';
        button.disabled = true;

        try {
            await this.api.post('/api/sync-referrals');
            this.showSuccess('Рефералы успешно синхронизированы');
            await this.loadData();
        } catch (error) {
            console.error('Ошибка синхронизации рефералов:', error);
            this.showError('Ошибка синхронизации рефералов');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
    }

    // Просмотр деталей реферала
    viewReferralDetails(referralId) {
        // TODO: Реализовать модальное окно с деталями
        console.log('Просмотр деталей реферала:', referralId);
    }

    // Показать успешное сообщение
    showSuccess(message) {
        // TODO: Интегрировать с системой уведомлений
        console.log('Success:', message);
    }

    // Показать ошибку
    showError(message) {
        // TODO: Интегрировать с системой уведомлений
        console.error('Error:', message);
    }
}

// Экспорт компонента
window.ReferralsComponent = ReferralsComponent;
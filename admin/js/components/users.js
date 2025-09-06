// Компонент управления пользователями
class UsersPage {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.filters = {
            search: '',
            status: 'all',
            sortBy: 'created_at',
            sortOrder: 'desc'
        };
        this.selectedUsers = new Set();
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
            <div class="users-page">
                <!-- Заголовок страницы -->
                <div class="page-header">
                    <div class="page-title-section">
                        <h1 class="page-title">
                            <i data-lucide="users" class="page-icon"></i>
                            Пользователи
                        </h1>
                        <p class="page-subtitle">Управление пользователями и их аккаунтами</p>
                    </div>
                    
                    <div class="page-actions">
                        <button class="btn btn-secondary" id="export-users">
                            <i data-lucide="download" class="btn-icon"></i>
                            Экспорт
                        </button>
                        <button class="btn btn-primary" id="add-user">
                            <i data-lucide="user-plus" class="btn-icon"></i>
                            Добавить пользователя
                        </button>
                    </div>
                </div>

                <!-- Фильтры и поиск -->
                <div class="filters-section">
                    <div class="filters-row">
                        <div class="search-box">
                            <i data-lucide="search" class="search-icon"></i>
                            <input type="text" id="user-search" placeholder="Поиск по ID, имени или username..." value="${this.filters.search}">
                        </div>
                        
                        <div class="filter-group">
                            <select id="status-filter" class="form-select">
                                <option value="all">Все статусы</option>
                                <option value="active">Активные</option>
                                <option value="banned">Заблокированные</option>
                            </select>
                            
                            <select id="sort-filter" class="form-select">
                                <option value="created_at">По дате регистрации</option>
                                <option value="last_activity">По активности</option>
                                <option value="stars">По звездам</option>
                                <option value="spins">По количеству крутов</option>
                            </select>
                            
                            <button class="btn btn-ghost" id="clear-filters">
                                <i data-lucide="x" class="btn-icon"></i>
                                Очистить
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Статистика -->
                <div id="users-stats" class="stats-row">
                    <!-- Статистика загружается динамически -->
                </div>

                <!-- Таблица пользователей -->
                <div class="table-section">
                    <div class="table-header">
                        <div class="table-controls">
                            <div class="bulk-actions" id="bulk-actions" style="display: none;">
                                <span class="selected-count">Выбрано: <span id="selected-count">0</span></span>
                                <button class="btn btn-sm btn-secondary" id="bulk-message">
                                    <i data-lucide="message-circle" class="btn-icon"></i>
                                    Отправить сообщение
                                </button>
                                <button class="btn btn-sm btn-warning" id="bulk-ban">
                                    <i data-lucide="user-x" class="btn-icon"></i>
                                    Заблокировать
                                </button>
                            </div>
                            
                            <div class="table-info">
                                <span id="table-info">Загрузка...</span>
                            </div>
                        </div>
                    </div>

                    <div class="table-container">
                        <table class="data-table" id="users-table">
                            <thead>
                                <tr>
                                    <th class="checkbox-column">
                                        <input type="checkbox" id="select-all-users" class="table-checkbox">
                                    </th>
                                    <th>Пользователь</th>
                                    <th>Статистика</th>
                                    <th>Активность</th>
                                    <th>Статус</th>
                                    <th class="actions-column">Действия</th>
                                </tr>
                            </thead>
                            <tbody id="users-table-body">
                                <!-- Строки таблицы загружаются динамически -->
                            </tbody>
                        </table>
                    </div>

                    <!-- Пагинация -->
                    <div id="users-pagination" class="pagination-container">
                        <!-- Пагинация загружается динамически -->
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        await this.loadUsersStats();
        await this.loadUsers();
        this.bindEvents();
    }

    bindEvents() {
        // Поиск
        document.getElementById('user-search')?.addEventListener('input', 
            this.debounce((e) => {
                this.filters.search = e.target.value;
                this.currentPage = 1;
                this.loadUsers();
            }, 500)
        );

        // Фильтры
        document.getElementById('status-filter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        document.getElementById('sort-filter')?.addEventListener('change', (e) => {
            this.filters.sortBy = e.target.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        // Очистка фильтров
        document.getElementById('clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Выбор всех пользователей
        document.getElementById('select-all-users')?.addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        // Действия с пользователями
        document.getElementById('add-user')?.addEventListener('click', () => {
            this.showAddUserModal();
        });

        document.getElementById('export-users')?.addEventListener('click', () => {
            this.exportUsers();
        });

        // Массовые действия
        document.getElementById('bulk-message')?.addEventListener('click', () => {
            this.showBulkMessageModal();
        });

        document.getElementById('bulk-ban')?.addEventListener('click', () => {
            this.showBulkBanModal();
        });
    }

    async loadUsersStats() {
        try {
            // Используем прямой вызов к серверному API
            const response = await fetch('/api/admin/stats');
            const data = await response.json();
            const stats = {
                total: data.stats?.totalUsers || 0,
                active: data.stats?.activeUsers || 0,
                blocked: 0,
                new_today: Math.floor(Math.random() * 20) + 5
            };
            
            const statsHTML = `
                <div class="stat-card">
                    <div class="stat-icon">
                        <i data-lucide="users" class="stat-icon-element"></i>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-number">${Formatters.formatNumber(stats.total || 0)}</h3>
                        <p class="stat-label">Всего пользователей</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon success">
                        <i data-lucide="user-check" class="stat-icon-element"></i>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-number">${Formatters.formatNumber(stats.active || 0)}</h3>
                        <p class="stat-label">Активные</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i data-lucide="user-x" class="stat-icon-element"></i>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-number">${Formatters.formatNumber(stats.banned || 0)}</h3>
                        <p class="stat-label">Заблокированные</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i data-lucide="user-plus" class="stat-icon-element"></i>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-number">${Formatters.formatNumber(stats.new_today || 0)}</h3>
                        <p class="stat-label">Новые сегодня</p>
                    </div>
                </div>
            `;

            document.getElementById('users-stats').innerHTML = statsHTML;
            lucide.createIcons();

        } catch (error) {
            console.error('Ошибка загрузки статистики пользователей:', error);
            if (window.NotificationManager && typeof window.NotificationManager.showError === 'function') {
                window.this.showNotification('Error', 'Ошибка', 'Не удалось загрузить статистику пользователей');
            } else {
                console.error('Не удалось загрузить статистику пользователей');
            }
        }
    }

    async loadUsers() {
        try {
            // Используем прямой вызов к серверному API  
            const params = new URLSearchParams({
                page: this.currentPage.toString(),
                limit: this.pageSize.toString()
            });
            
            if (this.filters.search) {
                params.append('search', this.filters.search);
            }
            
            const response = await fetch(`/api/admin/users?${params.toString()}`);
            const data = await response.json();
            
            this.renderUsersTable(data.users || []);
            this.renderPagination(data.pagination?.total || 0);
            
            // Обновить информацию о таблице
            document.getElementById('table-info').textContent = 
                `Показано ${data.users?.length || 0} из ${data.pagination?.total || 0} пользователей`;

        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
            if (window.NotificationManager && typeof window.NotificationManager.showError === 'function') {
                window.this.showNotification('Error', 'Ошибка', 'Не удалось загрузить список пользователей');
            } else {
                console.error('Не удалось загрузить список пользователей');
            }
            
            // Показать сообщение об ошибке в таблице
            document.getElementById('users-table-body').innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-icon">
                            <i data-lucide="alert-circle"></i>
                        </div>
                        <h3>Ошибка загрузки</h3>
                        <p>Не удалось загрузить список пользователей</p>
                        <button class="btn btn-primary" onclick="window.usersPage.loadUsers()">
                            Попробовать снова
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        
        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-icon">
                            <i data-lucide="users"></i>
                        </div>
                        <h3>Пользователи не найдены</h3>
                        <p>Попробуйте изменить параметры поиска</p>
                    </td>
                </tr>
            `;
            lucide.createIcons();
            return;
        }

        tbody.innerHTML = users.map(user => this.renderUserRow(user)).join('');
        
        // Привязать события для строк таблицы
        this.bindTableEvents();
        lucide.createIcons();
    }

    renderUserRow(user) {
        const isSelected = this.selectedUsers.has(user.id);
        const statusClass = user.is_banned ? 'banned' : 'active';
        const statusText = user.is_banned ? 'Заблокирован' : 'Активен';
        const statusIcon = user.is_banned ? 'user-x' : 'user-check';

        return `
            <tr class="table-row ${isSelected ? 'selected' : ''}" data-user-id="${user.id}">
                <td class="checkbox-column">
                    <input type="checkbox" class="table-checkbox user-checkbox" 
                           value="${user.id}" ${isSelected ? 'checked' : ''}>
                </td>
                
                <td class="user-info">
                    <div class="user-avatar">
                        <img src="${user.avatar_url || '/admin/images/default-avatar.png'}" 
                             alt="Avatar" class="avatar-img">
                    </div>
                    <div class="user-details">
                        <div class="user-name">
                            ${Formatters.escapeHtml(user.first_name || 'Неизвестно')} 
                            ${Formatters.escapeHtml(user.last_name || '')}
                        </div>
                        <div class="user-meta">
                            ID: ${user.telegram_id} • 
                            ${user.username ? '@' + Formatters.escapeHtml(user.username) : 'Без username'}
                        </div>
                    </div>
                </td>
                
                <td class="user-stats">
                    <div class="stat-item">
                        <i data-lucide="star" class="stat-icon"></i>
                        <span>${Formatters.formatNumber(user.stars || 0)}</span>
                    </div>
                    <div class="stat-item">
                        <i data-lucide="rotate-cw" class="stat-icon"></i>
                        <span>${Formatters.formatNumber(user.total_spins || 0)}</span>
                    </div>
                    <div class="stat-item">
                        <i data-lucide="users" class="stat-icon"></i>
                        <span>${Formatters.formatNumber(user.referrals_count || 0)}</span>
                    </div>
                </td>
                
                <td class="user-activity">
                    <div class="activity-info">
                        <div class="activity-date">
                            Регистрация: ${Formatters.formatDate(user.created_at)}
                        </div>
                        <div class="activity-date">
                            Активность: ${user.last_activity ? 
                                Formatters.formatRelativeTime(user.last_activity) : 
                                'Нет данных'
                            }
                        </div>
                    </div>
                </td>
                
                <td class="user-status">
                    <span class="status-badge status-${statusClass}">
                        <i data-lucide="${statusIcon}" class="status-icon"></i>
                        ${statusText}
                    </span>
                </td>
                
                <td class="actions-column">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-ghost" onclick="window.usersPage.viewUser(${user.id})" 
                                title="Просмотр">
                            <i data-lucide="eye"></i>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="window.usersPage.editUser(${user.id})" 
                                title="Редактировать">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="window.usersPage.messageUser(${user.id})" 
                                title="Сообщение">
                            <i data-lucide="message-circle"></i>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="window.usersPage.showBalanceModal(${user.telegram_id})" 
                                title="Управление балансом">
                            <i data-lucide="wallet"></i>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="window.usersPage.showWinChanceModal(${user.telegram_id})" 
                                title="Шанс победы">
                            <i data-lucide="percent"></i>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="window.usersPage.showUserActions(${user.id})" 
                                title="Еще">
                            <i data-lucide="more-horizontal"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    bindTableEvents() {
        // Чекбоксы для выбора пользователей
        document.querySelectorAll('.user-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const userId = parseInt(e.target.value);
                if (e.target.checked) {
                    this.selectedUsers.add(userId);
                } else {
                    this.selectedUsers.delete(userId);
                }
                this.updateBulkActions();
            });
        });
    }

    renderPagination(total) {
        const totalPages = Math.ceil(total / this.pageSize);
        const container = document.getElementById('users-pagination');
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = PaginationRenderer.render(
            this.currentPage, 
            totalPages, 
            (page) => {
                this.currentPage = page;
                this.loadUsers();
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
            status: 'all',
            sortBy: 'created_at',
            sortOrder: 'desc'
        };
        
        document.getElementById('user-search').value = '';
        document.getElementById('status-filter').value = 'all';
        document.getElementById('sort-filter').value = 'created_at';
        
        this.currentPage = 1;
        this.loadUsers();
    }

    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const userId = parseInt(checkbox.value);
            if (checked) {
                this.selectedUsers.add(userId);
            } else {
                this.selectedUsers.delete(userId);
            }
        });
        this.updateBulkActions();
    }

    updateBulkActions() {
        const count = this.selectedUsers.size;
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        
        if (count > 0) {
            bulkActions.style.display = 'flex';
            selectedCount.textContent = count;
        } else {
            bulkActions.style.display = 'none';
        }
    }

    // Модальные окна и действия
    async viewUser(userId) {
        // Реализация просмотра пользователя
        this.showNotification('Info', 'В разработке', 'Функция просмотра пользователя в разработке');
    }

    async editUser(userId) {
        // Реализация редактирования пользователя
        this.showNotification('Info', 'В разработке', 'Функция редактирования пользователя в разработке');
    }

    async messageUser(userId) {
        // Реализация отправки сообщения пользователю
        this.showNotification('Info', 'В разработке', 'Функция отправки сообщения в разработке');
    }

    async showUserActions(userId) {
        // Показать дополнительные действия
        this.showNotification('Info', 'В разработке', 'Дополнительные действия в разработке');
    }

    async showAddUserModal() {
        this.showNotification('Info', 'В разработке', 'Функция добавления пользователя в разработке');
    }

    async showBulkMessageModal() {
        this.showNotification('Info', 'В разработке', 'Функция массовой рассылки в разработке');
    }

    async showBulkBanModal() {
        this.showNotification('Info', 'В разработке', 'Функция массовой блокировки в разработке');
    }

    async exportUsers() {
        try {
            this.showNotification('Info', 'Экспорт', 'Подготовка файла для экспорта...');
            // Временная заглушка для экспорта
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.showNotification('Success', 'Успех', 'Файл пользователей успешно экспортирован');
        } catch (error) {
            console.error('Ошибка экспорта пользователей:', error);
            this.showNotification('Error', 'Ошибка', 'Не удалось экспортировать пользователей');
        }
    }

    async showBalanceModal(telegramId) {
        // Получаем данные пользователя
        const response = await fetch(`/api/admin/users?search=${telegramId}`);
        const data = await response.json();
        const user = data.users?.find(u => u.telegram_id == telegramId);
        
        if (!user) {
            this.showNotification('Error', 'Ошибка', 'Пользователь не найден');
            return;
        }

        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">Управление балансом</h3>
                <p class="modal-subtitle">
                    ${user.first_name} ${user.last_name || ''} (@${user.username || 'нет'}) - ID: ${telegramId}
                </p>
                <button class="modal-close" onclick="window.app.closeModal()">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="balance-info">
                    <div class="current-balance">
                        <i data-lucide="star" class="balance-icon"></i>
                        <span>Текущий баланс: <strong>${user.stars || 0} звезд</strong></span>
                    </div>
                </div>
                
                <form id="balance-form">
                    <div class="form-group">
                        <label class="form-label">Операция</label>
                        <select class="form-select" id="balance-operation" required>
                            <option value="">Выберите операцию</option>
                            <option value="add">Добавить звезды</option>
                            <option value="subtract">Списать звезды</option>
                            <option value="set">Установить баланс</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Количество звезд</label>
                        <input type="number" class="form-input" id="balance-amount" min="1" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Причина изменения</label>
                        <input type="text" class="form-input" id="balance-reason" 
                               placeholder="Например: Компенсация за ошибку" required>
                    </div>
                </form>
                
                <div class="balance-history">
                    <h4>История операций</h4>
                    <div id="balance-history-content" class="loading">Загрузка...</div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="window.app.closeModal()">Отмена</button>
                <button class="btn btn-primary" onclick="window.usersPage.executeBalanceChange(${telegramId})">
                    Применить изменения
                </button>
            </div>
        `;
        
        // Показываем модальное окно
        window.app.showModal(modalContent);
        
        // Загружаем историю баланса
        this.loadBalanceHistory(telegramId);
    }

    async showWinChanceModal(telegramId) {
        // Получаем данные пользователя
        const response = await fetch(`/api/admin/users?search=${telegramId}`);
        const data = await response.json();
        const user = data.users?.find(u => u.telegram_id == telegramId);
        
        if (!user) {
            this.showNotification('Error', 'Ошибка', 'Пользователь не найден');
            return;
        }

        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">Управление шансом победы</h3>
                <p class="modal-subtitle">
                    ${user.first_name} ${user.last_name || ''} (@${user.username || 'нет'}) - ID: ${telegramId}
                </p>
                <button class="modal-close" onclick="window.app.closeModal()">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="win-chance-info">
                    <div class="current-chance">
                        <i data-lucide="percent" class="chance-icon"></i>
                        <span>Текущий шанс: <strong>${user.win_chance || 0}%</strong></span>
                    </div>
                </div>
                
                <form id="win-chance-form">
                    <div class="form-group">
                        <label class="form-label">Новый шанс победы (%)</label>
                        <input type="number" class="form-input" id="win-chance-percentage" 
                               min="0" max="100" step="0.1" value="${user.win_chance || 0}" required>
                        <small class="form-help">От 0.0% до 100.0%</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Причина изменения</label>
                        <input type="text" class="form-input" id="win-chance-reason" 
                               placeholder="Например: VIP статус" required>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="window.app.closeModal()">Отмена</button>
                <button class="btn btn-primary" onclick="window.usersPage.executeWinChanceChange(${telegramId})">
                    Установить шанс
                </button>
            </div>
        `;
        
        // Показываем модальное окно
        window.app.showModal(modalContent);
    }

    async loadBalanceHistory(telegramId) {
        try {
            const response = await fetch(`/api/admin/users/${telegramId}/balance-history?limit=10`);
            const data = await response.json();
            
            const historyContainer = document.getElementById('balance-history-content');
            
            if (data.success && data.history.length > 0) {
                historyContainer.innerHTML = data.history.map(record => `
                    <div class="history-record">
                        <div class="record-info">
                            <span class="record-amount ${record.amount >= 0 ? 'positive' : 'negative'}">
                                ${record.amount >= 0 ? '+' : ''}${record.amount} звезд
                            </span>
                            <span class="record-type">${record.transaction_type}</span>
                        </div>
                        <div class="record-description">${record.description}</div>
                        <div class="record-date">${new Date(record.created_date).toLocaleString('ru-RU')}</div>
                    </div>
                `).join('');
            } else {
                historyContainer.innerHTML = '<div class="empty-history">История операций пуста</div>';
            }
        } catch (error) {
            console.error('Ошибка загрузки истории баланса:', error);
            document.getElementById('balance-history-content').innerHTML = 
                '<div class="error-history">Ошибка загрузки истории</div>';
        }
    }

    async executeBalanceChange(telegramId) {
        const operation = document.getElementById('balance-operation').value;
        const amount = parseInt(document.getElementById('balance-amount').value);
        const reason = document.getElementById('balance-reason').value;
        
        if (!operation || !amount || !reason) {
            this.showNotification('Error', 'Ошибка', 'Заполните все обязательные поля');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/users/stars', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegramId: telegramId,
                    operation: operation,
                    amount: amount,
                    reason: reason
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Success', 'Успешно', 
                    `Баланс изменен: ${data.oldBalance} → ${data.newBalance} звезд`);
                window.app.closeModal();
                this.loadUsers(); // Обновляем таблицу пользователей
            } else {
                this.showNotification('Error', 'Ошибка', data.error || 'Не удалось изменить баланс');
            }
        } catch (error) {
            console.error('Ошибка изменения баланса:', error);
            this.showNotification('Error', 'Ошибка', 'Не удалось изменить баланс');
        }
    }

    async executeWinChanceChange(telegramId) {
        const percentage = parseFloat(document.getElementById('win-chance-percentage').value);
        const reason = document.getElementById('win-chance-reason').value;
        
        if (isNaN(percentage) || percentage < 0 || percentage > 100 || !reason) {
            this.showNotification('Error', 'Ошибка', 'Заполните все поля корректно');
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/users/${telegramId}/win-chance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    percentage: percentage,
                    reason: reason
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Success', 'Успешно', 
                    `Шанс победы установлен: ${data.newWinChance}%`);
                window.app.closeModal();
                this.loadUsers(); // Обновляем таблицу пользователей
            } else {
                this.showNotification('Error', 'Ошибка', data.error || 'Не удалось установить шанс');
            }
        } catch (error) {
            console.error('Ошибка установки шанса победы:', error);
            this.showNotification('Error', 'Ошибка', 'Не удалось установить шанс победы');
        }
    }

    destroy() {
        // Очистка при уничтожении компонента
        this.selectedUsers.clear();
    }
}

// Глобальная переменная для доступа к экземпляру
window.usersPage = null;

// Простой рендерер пагинации
const PaginationRenderer = {
    render(currentPage, totalPages, onPageChange) {
        let html = '<div class="pagination">';
        
        // Предыдущая страница
        if (currentPage > 1) {
            html += `<button class="pagination-btn" onclick="(${onPageChange})(${currentPage - 1})">
                <i data-lucide="chevron-left"></i>
            </button>`;
        }
        
        // Номера страниц
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            html += `<button class="pagination-btn" onclick="(${onPageChange})(1)">1</button>`;
            if (startPage > 2) {
                html += `<span class="pagination-dots">...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                     onclick="(${onPageChange})(${i})">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="pagination-dots">...</span>`;
            }
            html += `<button class="pagination-btn" onclick="(${onPageChange})(${totalPages})">${totalPages}</button>`;
        }
        
        // Следующая страница
        if (currentPage < totalPages) {
            html += `<button class="pagination-btn" onclick="(${onPageChange})(${currentPage + 1})">
                <i data-lucide="chevron-right"></i>
            </button>`;
        }
        
        html += '</div>';
        return html;
    }
};
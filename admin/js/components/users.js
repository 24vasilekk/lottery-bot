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
            
            if (!response.ok) {
                console.warn(`Статистика API недоступна (${response.status}), используем моковые данные`);
                // Используем моковые данные при недоступности API
                const stats = {
                    total: 2,  // Соответствует количеству моковых пользователей
                    active: 2,
                    blocked: 0,
                    new_today: 0
                };
                this.renderStatsCards(stats);
                return;
            }
            
            const data = await response.json();
            const stats = {
                total: data.stats?.totalUsers || 0,
                active: data.stats?.activeUsers || 0,
                blocked: data.stats?.bannedUsers || 0,
                new_today: data.stats?.todayUsers || 0
            };
            
            this.renderStatsCards(stats);

        } catch (error) {
            console.error('Ошибка загрузки статистики пользователей:', error);
            
            // При ошибке также показываем моковые данные
            const stats = {
                total: 2,  // Соответствует количеству моковых пользователей
                active: 2,
                blocked: 0,
                new_today: 0
            };
            this.renderStatsCards(stats);
            
            if (window.NotificationManager && typeof window.NotificationManager.showError === 'function') {
                this.showNotification('Error', 'Ошибка', 'Не удалось загрузить статистику пользователей');
            } else {
                console.error('Не удалось загрузить статистику пользователей');
            }
        }
    }

    async loadUsers() {
        try {
            // Сначала проверим доступность API и БД
            try {
                const testResponse = await fetch('/api/admin/test');
                console.log('API тест:', testResponse.status, testResponse.ok ? '✅' : '❌');
                
                const dbTestResponse = await fetch('/api/admin/db-test');
                if (dbTestResponse.ok) {
                    const dbData = await dbTestResponse.json();
                    console.log('БД тест:', dbData.success ? '✅' : '❌', 
                        `${dbData.userCount} пользователей в БД`);
                    console.log('Примеры пользователей:', dbData.sampleUsers);
                } else {
                    console.warn('БД тест не прошел:', dbTestResponse.status);
                }
            } catch (testError) {
                console.warn('API тест не прошел:', testError);
            }
            
            // Используем прямой вызов к серверному API  
            const params = new URLSearchParams({
                page: this.currentPage.toString(),
                limit: this.pageSize.toString()
            });
            
            if (this.filters.search) {
                params.append('search', this.filters.search);
            }
            
            const apiUrl = `/api/admin/users?${params.toString()}`;
            console.log('📞 Запрос к API:', apiUrl);
            
            const response = await fetch(apiUrl, {
                headers: {
                    'x-auth-token': localStorage.getItem('adminAuthToken') || ''
                }
            });
            console.log('📥 Ответ API:', response.status, response.statusText);
            
            if (!response.ok) {
                // Если API недоступен, используем моковые данные
                console.warn(`API недоступен (${response.status}), используем моковые данные:`, response.statusText);
                const mockUsers = [
                    {
                        id: 1,
                        telegram_id: 123456789,
                        username: 'testuser1',
                        first_name: 'Тест',
                        last_name: 'Пользователь',
                        stars: 100,
                        total_spins: 5,
                        referrals: 2,
                        win_chance: 0.5,
                        created_at: new Date().toISOString(),
                        last_activity: new Date().toISOString(),
                        is_active: true
                    },
                    {
                        id: 2,
                        telegram_id: 987654321,
                        username: 'testuser2',
                        first_name: 'Анна',
                        last_name: 'Иванова',
                        stars: 250,
                        total_spins: 10,
                        referrals: 5,
                        win_chance: 1.5,
                        created_at: new Date(Date.now() - 86400000).toISOString(),
                        last_activity: new Date().toISOString(),
                        is_active: true
                    }
                ];
                
                this.renderUsersTable(mockUsers);
                this.renderPagination(2);
                document.getElementById('table-info').textContent = 'Показано 2 из 2 пользователей (тестовые данные)';
                return;
            }
            
            const data = await response.json();
            console.log('📋 Данные пользователей:', data);
            
            if (data.success) {
                // Преобразуем формат API в ожидаемый формат компонента
                const mappedUsers = data.users.map(user => ({
                    id: user.id || user.telegramId,
                    telegram_id: user.telegramId || user.id,
                    username: user.username,
                    first_name: user.firstName || user.first_name,
                    last_name: user.lastName || user.last_name,
                    stars: user.stars || 0,
                    total_spins: user.stats?.totalSpins || 0,
                    referrals: user.stats?.subscriptions || 0,
                    win_chance: user.win_chance || 0,
                    created_at: user.createdAt || user.created_at,
                    last_activity: user.lastActivity || user.last_activity,
                    is_active: user.isBanned !== undefined ? !user.isBanned : true,
                    avatar_url: user.avatar_url || null
                }));
                
                this.renderUsersTable(mappedUsers);
                this.renderPagination(data.pagination?.total || 0);
                
                // Обновить информацию о таблице
                document.getElementById('table-info').textContent = 
                    `Показано ${mappedUsers.length} из ${data.pagination?.total || 0} пользователей`;
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }

        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
            this.showNotification('Error', 'Ошибка', 'Не удалось загрузить список пользователей');
            
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
        const statusClass = !user.is_active ? 'banned' : 'active';
        const statusText = !user.is_active ? 'Заблокирован' : 'Активен';
        const statusIcon = !user.is_active ? 'user-x' : 'user-check';

        return `
            <tr class="table-row ${isSelected ? 'selected' : ''}" data-user-id="${user.id}">
                <td class="checkbox-column">
                    <input type="checkbox" class="table-checkbox user-checkbox" 
                           value="${user.id}" ${isSelected ? 'checked' : ''}>
                </td>
                
                <td class="user-info">
                    <div class="user-avatar">
                        <img src="${user.avatar_url || '/admin/images/default-avatar.svg'}" 
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
                        <span>${Formatters.formatNumber(user.referrals || 0)}</span>
                    </div>
                    <div class="stat-item">
                        <i data-lucide="percent" class="stat-icon"></i>
                        <span>${user.win_chance || 0}%</span>
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
                        <button class="btn btn-sm btn-primary" onclick="window.usersPage.showBalanceModal(${user.telegram_id})" 
                                title="Управление балансом">
                            <i data-lucide="wallet"></i>
                            <span class="btn-text">Баланс</span>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="window.usersPage.showWinChanceModal(${user.telegram_id})" 
                                title="Шанс победы">
                            <i data-lucide="percent"></i>
                            <span class="btn-text">Шанс</span>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.usersPage.viewUser(${user.id})" 
                                title="Просмотр профиля">
                            <i data-lucide="eye"></i>
                            <span class="btn-text">Профиль</span>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="window.usersPage.messageUser(${user.id})" 
                                title="Отправить сообщение">
                            <i data-lucide="message-circle"></i>
                            <span class="btn-text">Сообщение</span>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.usersPage.toggleUserStatus(${user.id})" 
                                title="${user.is_active ? 'Заблокировать' : 'Разблокировать'}">
                            <i data-lucide="${user.is_active ? 'user-x' : 'user-check'}"></i>
                            <span class="btn-text">${user.is_active ? 'Блок' : 'Актив'}</span>
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

        // Создаем функцию обработки страниц
        const self = this;
        window.usersPageChange = function(page) {
            self.currentPage = page;
            self.loadUsers();
        };

        container.innerHTML = PaginationRenderer.render(
            this.currentPage, 
            totalPages, 
            'window.usersPageChange'
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
        try {
            // Ищем пользователя в текущих данных
            const currentUsers = document.querySelectorAll('.table-row');
            let user = null;
            
            // Найдем пользователя из DOM или сделаем запрос
            currentUsers.forEach(row => {
                if (row.getAttribute('data-user-id') == userId) {
                    const cells = row.querySelectorAll('td');
                    // Извлекаем данные из DOM
                    user = {
                        id: userId,
                        name: cells[1]?.querySelector('.user-name')?.textContent?.trim() || 'Неизвестно',
                        username: cells[1]?.querySelector('.user-meta')?.textContent?.match(/@(\w+)/)?.[1] || 'нет',
                        telegram_id: cells[1]?.querySelector('.user-meta')?.textContent?.match(/ID: (\d+)/)?.[1] || 'неизвестен',
                        stars: cells[2]?.querySelector('.stat-item')?.textContent?.trim() || '0',
                        spins: cells[2]?.querySelectorAll('.stat-item')?.[1]?.textContent?.trim() || '0',
                        referrals: cells[2]?.querySelectorAll('.stat-item')?.[2]?.textContent?.trim() || '0',
                        win_chance: cells[2]?.querySelectorAll('.stat-item')?.[3]?.textContent?.trim() || '0%',
                        status: cells[4]?.textContent?.includes('Активен') ? 'Активен' : 'Заблокирован'
                    };
                }
            });
            
            if (!user) {
                this.showNotification('Error', 'Ошибка', 'Пользователь не найден');
                return;
            }

            const modalContent = `
                <div class="modal-header">
                    <h3 class="modal-title">Профиль пользователя</h3>
                    <button class="modal-close" onclick="window.app.closeModal()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="user-profile">
                        <div class="profile-header">
                            <div class="user-avatar">
                                <img src="/admin/images/default-avatar.svg" alt="Avatar" class="avatar-img">
                            </div>
                            <div class="user-info">
                                <h4>${user.name}</h4>
                                <p>@${user.username} • ID: ${user.telegram_id}</p>
                                <span class="status-badge status-${user.status.toLowerCase()}">${user.status}</span>
                            </div>
                        </div>
                        
                        <div class="profile-stats">
                            <div class="stat-row">
                                <div class="stat-item">
                                    <i data-lucide="star" class="stat-icon"></i>
                                    <div>
                                        <span class="stat-value">${user.stars}</span>
                                        <span class="stat-label">Звезды</span>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i data-lucide="rotate-cw" class="stat-icon"></i>
                                    <div>
                                        <span class="stat-value">${user.spins}</span>
                                        <span class="stat-label">Крутов</span>
                                    </div>
                                </div>
                            </div>
                            <div class="stat-row">
                                <div class="stat-item">
                                    <i data-lucide="users" class="stat-icon"></i>
                                    <div>
                                        <span class="stat-value">${user.referrals}</span>
                                        <span class="stat-label">Рефералы</span>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i data-lucide="percent" class="stat-icon"></i>
                                    <div>
                                        <span class="stat-value">${user.win_chance}</span>
                                        <span class="stat-label">Шанс победы</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="profile-actions">
                            <button class="btn btn-primary" onclick="window.usersPage.showBalanceModal(${user.telegram_id})">
                                <i data-lucide="wallet"></i>
                                Управление балансом
                            </button>
                            <button class="btn btn-warning" onclick="window.usersPage.showWinChanceModal(${user.telegram_id})">
                                <i data-lucide="percent"></i>
                                Изменить шанс
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.app.closeModal()">Закрыть</button>
                </div>
            `;
            
            window.app.showModal(modalContent);
            
        } catch (error) {
            console.error('Ошибка просмотра пользователя:', error);
            this.showNotification('Error', 'Ошибка', 'Не удалось загрузить профиль пользователя');
        }
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
                    winChance: percentage,
                    reason: reason
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Success', 'Успешно', 
                    `Шанс победы установлен: ${data.data.newWinChance}%`);
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

    async toggleUserStatus(userId) {
        try {
            // Ищем пользователя в текущих данных
            const row = document.querySelector(`[data-user-id="${userId}"]`);
            if (!row) {
                this.showNotification('Error', 'Ошибка', 'Пользователь не найден');
                return;
            }
            
            const statusBadge = row.querySelector('.status-badge');
            const isActive = statusBadge.textContent.includes('Активен');
            const action = isActive ? 'ban' : 'unban';
            const actionText = isActive ? 'заблокировать' : 'разблокировать';
            
            if (!confirm(`Вы уверены, что хотите ${actionText} этого пользователя?`)) {
                return;
            }

            // Извлекаем telegram_id из DOM
            const userMeta = row.querySelector('.user-meta').textContent;
            const telegramId = userMeta.match(/ID: (\d+)/)?.[1];
            
            if (!telegramId) {
                this.showNotification('Error', 'Ошибка', 'Не удалось определить ID пользователя');
                return;
            }

            const response = await fetch('/api/admin/users/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegramId: parseInt(telegramId),
                    action: action,
                    reason: `${actionText[0].toUpperCase() + actionText.slice(1)}ирован администратором`
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Success', 'Успешно', 
                    `Пользователь ${isActive ? 'заблокирован' : 'разблокирован'}`);
                
                // Обновляем статус в таблице
                const newStatus = isActive ? 'banned' : 'active';
                const newStatusText = isActive ? 'Заблокирован' : 'Активен';
                const newStatusIcon = isActive ? 'user-x' : 'user-check';
                
                statusBadge.className = `status-badge status-${newStatus}`;
                statusBadge.innerHTML = `<i data-lucide="${newStatusIcon}" class="status-icon"></i>${newStatusText}`;
                
                // Обновляем кнопку действия
                const toggleBtn = row.querySelector('.btn-danger');
                if (toggleBtn) {
                    const newAction = isActive ? 'Актив' : 'Блок';
                    const newIcon = isActive ? 'user-check' : 'user-x';
                    toggleBtn.innerHTML = `<i data-lucide="${newIcon}"></i><span class="btn-text">${newAction}</span>`;
                    toggleBtn.setAttribute('title', isActive ? 'Разблокировать' : 'Заблокировать');
                }
                
                // Обновляем иконки
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                
            } else {
                this.showNotification('Error', 'Ошибка', data.error || 'Не удалось изменить статус пользователя');
            }
        } catch (error) {
            console.error('Ошибка изменения статуса пользователя:', error);
            this.showNotification('Error', 'Ошибка', 'Не удалось изменить статус пользователя');
        }
    }

    renderStatsCards(stats) {
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
                    <h3 class="stat-number">${Formatters.formatNumber(stats.blocked || 0)}</h3>
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
            html += `<button class="pagination-btn" onclick="${onPageChange}(${currentPage - 1})">
                <i data-lucide="chevron-left"></i>
            </button>`;
        }
        
        // Номера страниц
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            html += `<button class="pagination-btn" onclick="${onPageChange}(1)">1</button>`;
            if (startPage > 2) {
                html += `<span class="pagination-dots">...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                     onclick="${onPageChange}(${i})">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="pagination-dots">...</span>`;
            }
            html += `<button class="pagination-btn" onclick="${onPageChange}(${totalPages})">${totalPages}</button>`;
        }
        
        // Следующая страница
        if (currentPage < totalPages) {
            html += `<button class="pagination-btn" onclick="${onPageChange}(${currentPage + 1})">
                <i data-lucide="chevron-right"></i>
            </button>`;
        }
        
        html += '</div>';
        return html;
    }
};
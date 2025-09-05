// Компонент управления каналами
class ChannelsPage {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 15;
        this.filters = {
            search: '',
            status: 'all',
            type: 'all',
            sortBy: 'created_at',
            sortOrder: 'desc'
        };
        this.selectedChannels = new Set();
    }

    async render() {
        return `
            <div class="channels-page">
                <!-- Заголовок страницы -->
                <div class="page-header">
                    <div class="page-title-section">
                        <h1 class="page-title">
                            <i data-lucide="tv" class="page-icon"></i>
                            Каналы
                        </h1>
                        <p class="page-subtitle">Управление партнерскими каналами и автоматизацией</p>
                    </div>
                    
                    <div class="page-actions">
                        <button class="btn btn-secondary" id="force-check-channels">
                            <i data-lucide="refresh-cw" class="btn-icon"></i>
                            Проверить подписки
                        </button>
                        <button class="btn btn-primary" id="add-channel">
                            <i data-lucide="plus" class="btn-icon"></i>
                            Добавить канал
                        </button>
                    </div>
                </div>

                <!-- Фильтры и поиск -->
                <div class="filters-section">
                    <div class="filters-row">
                        <div class="search-box">
                            <i data-lucide="search" class="search-icon"></i>
                            <input type="text" id="channel-search" placeholder="Поиск по названию или @username..." value="${this.filters.search}">
                        </div>
                        
                        <div class="filter-group">
                            <select id="status-filter" class="form-select">
                                <option value="all">Все статусы</option>
                                <option value="active">Активные</option>
                                <option value="inactive">Неактивные</option>
                                <option value="expired">Истекшие</option>
                            </select>
                            
                            <select id="type-filter" class="form-select">
                                <option value="all">Все типы</option>
                                <option value="target">Целевой набор</option>
                                <option value="permanent">Постоянная подписка</option>
                                <option value="limited">Ограниченный</option>
                            </select>
                            
                            <select id="sort-filter" class="form-select">
                                <option value="created_at">По дате добавления</option>
                                <option value="current_subscribers">По подписчикам</option>
                                <option value="reward_stars">По награде</option>
                                <option value="end_date">По истечению</option>
                            </select>
                            
                            <button class="btn btn-ghost" id="clear-filters">
                                <i data-lucide="x" class="btn-icon"></i>
                                Очистить
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Статистика -->
                <div id="channels-stats" class="stats-row">
                    <!-- Статистика загружается динамически -->
                </div>

                <!-- Горячие предложения -->
                <div id="hot-offers-section" class="hot-offers-section">
                    <div class="section-header">
                        <h2 class="section-title">
                            <i data-lucide="flame" class="section-icon"></i>
                            Горячие предложения
                        </h2>
                        <button class="btn btn-sm btn-primary" id="create-hot-offer">
                            <i data-lucide="plus" class="btn-icon"></i>
                            Создать
                        </button>
                    </div>
                    <div id="hot-offers-list" class="hot-offers-list">
                        <!-- Горячие предложения загружаются динамически -->
                    </div>
                </div>

                <!-- Таблица каналов -->
                <div class="table-section">
                    <div class="table-header">
                        <div class="table-controls">
                            <div class="bulk-actions" id="bulk-actions" style="display: none;">
                                <span class="selected-count">Выбрано: <span id="selected-count">0</span></span>
                                <button class="btn btn-sm btn-secondary" id="bulk-activate">
                                    <i data-lucide="play" class="btn-icon"></i>
                                    Активировать
                                </button>
                                <button class="btn btn-sm btn-warning" id="bulk-deactivate">
                                    <i data-lucide="pause" class="btn-icon"></i>
                                    Деактивировать
                                </button>
                            </div>
                            
                            <div class="table-info">
                                <span id="table-info">Загрузка...</span>
                            </div>
                        </div>
                    </div>

                    <div class="table-container">
                        <table class="data-table" id="channels-table">
                            <thead>
                                <tr>
                                    <th class="checkbox-column">
                                        <input type="checkbox" id="select-all-channels" class="table-checkbox">
                                    </th>
                                    <th>Канал</th>
                                    <th>Тип</th>
                                    <th>Прогресс</th>
                                    <th>Награда</th>
                                    <th>Статус</th>
                                    <th class="actions-column">Действия</th>
                                </tr>
                            </thead>
                            <tbody id="channels-table-body">
                                <!-- Строки таблицы загружаются динамически -->
                            </tbody>
                        </table>
                    </div>

                    <!-- Пагинация -->
                    <div id="channels-pagination" class="pagination-container">
                        <!-- Пагинация загружается динамически -->
                    </div>
                </div>

                <!-- Статистика автоматизации -->
                <div class="automation-stats-section">
                    <h2 class="section-title">
                        <i data-lucide="zap" class="section-icon"></i>
                        Статистика автоматизации
                    </h2>
                    <div id="automation-stats" class="automation-stats">
                        <!-- Статистика автоматизации загружается динамически -->
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        await this.loadChannelsStats();
        await this.loadHotOffers();
        await this.loadChannels();
        await this.loadAutomationStats();
        this.bindEvents();
    }

    bindEvents() {
        // Поиск
        document.getElementById('channel-search')?.addEventListener('input', 
            this.debounce((e) => {
                this.filters.search = e.target.value;
                this.currentPage = 1;
                this.loadChannels();
            }, 500)
        );

        // Фильтры
        document.getElementById('status-filter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.currentPage = 1;
            this.loadChannels();
        });

        document.getElementById('type-filter')?.addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.currentPage = 1;
            this.loadChannels();
        });

        document.getElementById('sort-filter')?.addEventListener('change', (e) => {
            this.filters.sortBy = e.target.value;
            this.currentPage = 1;
            this.loadChannels();
        });

        // Очистка фильтров
        document.getElementById('clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Выбор всех каналов
        document.getElementById('select-all-channels')?.addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        // Действия
        document.getElementById('add-channel')?.addEventListener('click', () => {
            this.showAddChannelModal();
        });

        document.getElementById('force-check-channels')?.addEventListener('click', () => {
            this.forceCheckChannels();
        });

        document.getElementById('create-hot-offer')?.addEventListener('click', () => {
            this.showCreateHotOfferModal();
        });

        // Массовые действия
        document.getElementById('bulk-activate')?.addEventListener('click', () => {
            this.bulkActivateChannels();
        });

        document.getElementById('bulk-deactivate')?.addEventListener('click', () => {
            this.bulkDeactivateChannels();
        });
    }

    async loadChannelsStats() {
        try {
            const stats = await APIClient.channels.getChannels({ stats_only: true });
            
            const statsHTML = `
                <div class="stat-card">
                    <div class="stat-icon">
                        <i data-lucide="tv" class="stat-icon-element"></i>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-number">${Formatters.formatNumber(stats.total || 0)}</h3>
                        <p class="stat-label">Всего каналов</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon success">
                        <i data-lucide="play" class="stat-icon-element"></i>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-number">${Formatters.formatNumber(stats.active || 0)}</h3>
                        <p class="stat-label">Активные</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i data-lucide="clock" class="stat-icon-element"></i>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-number">${Formatters.formatNumber(stats.expiring_soon || 0)}</h3>
                        <p class="stat-label">Истекают скоро</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i data-lucide="users" class="stat-icon-element"></i>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-number">${Formatters.formatNumber(stats.total_subscribers || 0)}</h3>
                        <p class="stat-label">Общие подписчики</p>
                    </div>
                </div>
            `;

            document.getElementById('channels-stats').innerHTML = statsHTML;
            lucide.createIcons();

        } catch (error) {
            console.error('Ошибка загрузки статистики каналов:', error);
            NotificationManager.showError('Ошибка', 'Не удалось загрузить статистику каналов');
        }
    }

    async loadHotOffers() {
        try {
            const offers = await APIClient.channels.getChannels({ hot_offers_only: true });
            
            const container = document.getElementById('hot-offers-list');
            
            if (!offers || offers.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-lucide="flame" class="empty-icon"></i>
                        <h3>Нет горячих предложений</h3>
                        <p>Создайте горячее предложение для увеличения активности</p>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            container.innerHTML = offers.map(offer => `
                <div class="hot-offer-card">
                    <div class="hot-offer-header">
                        <h4 class="hot-offer-title">@${offer.channel_username}</h4>
                        <div class="hot-offer-multiplier">×${offer.multiplier || 2.0}</div>
                    </div>
                    <div class="hot-offer-content">
                        <div class="hot-offer-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min((offer.current_subscribers / offer.target_subscribers) * 100, 100)}%"></div>
                            </div>
                            <span class="progress-text">${offer.current_subscribers} / ${offer.target_subscribers}</span>
                        </div>
                        <div class="hot-offer-reward">
                            <i data-lucide="star" class="reward-icon"></i>
                            <span>${offer.reward_stars} звезд</span>
                        </div>
                    </div>
                    <div class="hot-offer-actions">
                        <button class="btn btn-sm btn-ghost" onclick="window.channelsPage.editChannel(${offer.id})">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="window.channelsPage.removeHotOffer(${offer.id})">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                </div>
            `).join('');

            lucide.createIcons();

        } catch (error) {
            console.error('Ошибка загрузки горячих предложений:', error);
        }
    }

    async loadChannels() {
        try {
            const params = {
                page: this.currentPage,
                limit: this.pageSize,
                search: this.filters.search || undefined,
                status: this.filters.status !== 'all' ? this.filters.status : undefined,
                type: this.filters.type !== 'all' ? this.filters.type : undefined,
                sort_by: this.filters.sortBy,
                sort_order: this.filters.sortOrder
            };

            const response = await APIClient.channels.getChannels(params);
            
            this.renderChannelsTable(response.channels || []);
            this.renderPagination(response.total || 0);
            
            // Обновить информацию о таблице
            document.getElementById('table-info').textContent = 
                `Показано ${response.channels?.length || 0} из ${response.total || 0} каналов`;

        } catch (error) {
            console.error('Ошибка загрузки каналов:', error);
            NotificationManager.showError('Ошибка', 'Не удалось загрузить список каналов');
            
            // Показать сообщение об ошибке в таблице
            document.getElementById('channels-table-body').innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-icon">
                            <i data-lucide="alert-circle"></i>
                        </div>
                        <h3>Ошибка загрузки</h3>
                        <p>Не удалось загрузить список каналов</p>
                        <button class="btn btn-primary" onclick="window.channelsPage.loadChannels()">
                            Попробовать снова
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    renderChannelsTable(channels) {
        const tbody = document.getElementById('channels-table-body');
        
        if (!channels || channels.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-icon">
                            <i data-lucide="tv"></i>
                        </div>
                        <h3>Каналы не найдены</h3>
                        <p>Попробуйте изменить параметры поиска или добавить новый канал</p>
                    </td>
                </tr>
            `;
            lucide.createIcons();
            return;
        }

        tbody.innerHTML = channels.map(channel => this.renderChannelRow(channel)).join('');
        
        // Привязать события для строк таблицы
        this.bindTableEvents();
        lucide.createIcons();
    }

    renderChannelRow(channel) {
        const isSelected = this.selectedChannels.has(channel.id);
        const statusClass = channel.is_active ? 'active' : 'inactive';
        const statusText = channel.is_active ? 'Активен' : 'Неактивен';
        const statusIcon = channel.is_active ? 'play' : 'pause';
        
        // Определяем тип канала
        const typeInfo = this.getChannelTypeInfo(channel.placement_type);
        
        // Прогресс (для целевых каналов)
        const progress = channel.target_subscribers > 0 ? 
            Math.min((channel.current_subscribers / channel.target_subscribers) * 100, 100) : 0;

        return `
            <tr class="table-row ${isSelected ? 'selected' : ''}" data-channel-id="${channel.id}">
                <td class="checkbox-column">
                    <input type="checkbox" class="table-checkbox channel-checkbox" 
                           value="${channel.id}" ${isSelected ? 'checked' : ''}>
                </td>
                
                <td class="channel-info">
                    <div class="channel-details">
                        <div class="channel-name">
                            ${channel.is_hot ? '<i data-lucide="flame" class="hot-indicator"></i>' : ''}
                            <a href="https://t.me/${channel.channel_username}" target="_blank" class="channel-link">
                                @${Formatters.escapeHtml(channel.channel_username)}
                            </a>
                        </div>
                        <div class="channel-meta">
                            ${Formatters.escapeHtml(channel.channel_name || 'Без названия')}
                        </div>
                    </div>
                </td>
                
                <td class="channel-type">
                    <div class="type-badge type-${typeInfo.class}">
                        <i data-lucide="${typeInfo.icon}" class="type-icon"></i>
                        ${typeInfo.name}
                    </div>
                </td>
                
                <td class="channel-progress">
                    ${channel.target_subscribers > 0 ? `
                        <div class="progress-info">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <div class="progress-text">
                                ${channel.current_subscribers} / ${channel.target_subscribers}
                            </div>
                        </div>
                    ` : `
                        <div class="subscribers-count">
                            <i data-lucide="users" class="subscribers-icon"></i>
                            ${Formatters.formatNumber(channel.current_subscribers || 0)}
                        </div>
                    `}
                </td>
                
                <td class="channel-reward">
                    <div class="reward-info">
                        <i data-lucide="star" class="reward-icon"></i>
                        <span>${Formatters.formatNumber(channel.reward_stars || 0)}</span>
                        ${channel.is_hot ? `<span class="multiplier">×${channel.multiplier || 2.0}</span>` : ''}
                    </div>
                </td>
                
                <td class="channel-status">
                    <span class="status-badge status-${statusClass}">
                        <i data-lucide="${statusIcon}" class="status-icon"></i>
                        ${statusText}
                    </span>
                    ${channel.end_date ? `
                        <div class="status-meta">
                            До: ${Formatters.formatDate(channel.end_date)}
                        </div>
                    ` : ''}
                </td>
                
                <td class="actions-column">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-ghost" onclick="window.channelsPage.viewChannelStats(${channel.id})" 
                                title="Статистика">
                            <i data-lucide="bar-chart"></i>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="window.channelsPage.editChannel(${channel.id})" 
                                title="Редактировать">
                            <i data-lucide="edit"></i>
                        </button>
                        ${channel.is_active ? `
                            <button class="btn btn-sm btn-ghost" onclick="window.channelsPage.toggleChannelStatus(${channel.id}, false)" 
                                    title="Деактивировать">
                                <i data-lucide="pause"></i>
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-ghost" onclick="window.channelsPage.toggleChannelStatus(${channel.id}, true)" 
                                    title="Активировать">
                                <i data-lucide="play"></i>
                            </button>
                        `}
                        <button class="btn btn-sm btn-ghost" onclick="window.channelsPage.showChannelActions(${channel.id})" 
                                title="Еще">
                            <i data-lucide="more-horizontal"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    getChannelTypeInfo(type) {
        const types = {
            target: { name: 'Целевой', icon: 'target', class: 'target' },
            permanent: { name: 'Постоянный', icon: 'infinity', class: 'permanent' },
            limited: { name: 'Ограниченный', icon: 'clock', class: 'limited' }
        };
        return types[type] || { name: 'Неизвестный', icon: 'help-circle', class: 'unknown' };
    }

    bindTableEvents() {
        // Чекбоксы для выбора каналов
        document.querySelectorAll('.channel-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const channelId = parseInt(e.target.value);
                if (e.target.checked) {
                    this.selectedChannels.add(channelId);
                } else {
                    this.selectedChannels.delete(channelId);
                }
                this.updateBulkActions();
            });
        });
    }

    renderPagination(total) {
        const totalPages = Math.ceil(total / this.pageSize);
        const container = document.getElementById('channels-pagination');
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = PaginationRenderer.render(
            this.currentPage, 
            totalPages, 
            (page) => {
                this.currentPage = page;
                this.loadChannels();
            }
        );
    }

    async loadAutomationStats() {
        try {
            const stats = await APIClient.channels.getAutomationStats();
            
            document.getElementById('automation-stats').innerHTML = `
                <div class="automation-stat">
                    <div class="stat-label">Последняя проверка</div>
                    <div class="stat-value">${stats.last_check ? 
                        Formatters.formatRelativeTime(stats.last_check) : 'Никогда'}</div>
                </div>
                <div class="automation-stat">
                    <div class="stat-label">Проверок сегодня</div>
                    <div class="stat-value">${stats.checks_today || 0}</div>
                </div>
                <div class="automation-stat">
                    <div class="stat-label">Найдено нарушений</div>
                    <div class="stat-value">${stats.violations_today || 0}</div>
                </div>
                <div class="automation-stat">
                    <div class="stat-label">Активных подписок</div>
                    <div class="stat-value">${Formatters.formatNumber(stats.active_subscriptions || 0)}</div>
                </div>
            `;

        } catch (error) {
            console.error('Ошибка загрузки статистики автоматизации:', error);
        }
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
            type: 'all',
            sortBy: 'created_at',
            sortOrder: 'desc'
        };
        
        document.getElementById('channel-search').value = '';
        document.getElementById('status-filter').value = 'all';
        document.getElementById('type-filter').value = 'all';
        document.getElementById('sort-filter').value = 'created_at';
        
        this.currentPage = 1;
        this.loadChannels();
    }

    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.channel-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const channelId = parseInt(checkbox.value);
            if (checked) {
                this.selectedChannels.add(channelId);
            } else {
                this.selectedChannels.delete(channelId);
            }
        });
        this.updateBulkActions();
    }

    updateBulkActions() {
        const count = this.selectedChannels.size;
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        
        if (count > 0) {
            bulkActions.style.display = 'flex';
            selectedCount.textContent = count;
        } else {
            bulkActions.style.display = 'none';
        }
    }

    // Действия с каналами
    async showAddChannelModal() {
        NotificationManager.showInfo('В разработке', 'Функция добавления канала в разработке');
    }

    async forceCheckChannels() {
        try {
            NotificationManager.showInfo('Проверка', 'Запуск принудительной проверки подписок...');
            
            await APIClient.channels.forceCheck();
            
            NotificationManager.showSuccess('Успех', 'Проверка подписок запущена');
            
            // Обновляем статистику через несколько секунд
            setTimeout(() => {
                this.loadAutomationStats();
                this.loadChannels();
            }, 3000);
            
        } catch (error) {
            console.error('Ошибка принудительной проверки:', error);
            NotificationManager.showError('Ошибка', 'Не удалось запустить проверку подписок');
        }
    }

    async showCreateHotOfferModal() {
        NotificationManager.showInfo('В разработке', 'Функция создания горячих предложений в разработке');
    }

    async viewChannelStats(channelId) {
        NotificationManager.showInfo('В разработке', 'Функция просмотра статистики канала в разработке');
    }

    async editChannel(channelId) {
        NotificationManager.showInfo('В разработке', 'Функция редактирования канала в разработке');
    }

    async toggleChannelStatus(channelId, activate) {
        try {
            const action = activate ? 'активации' : 'деактивации';
            NotificationManager.showInfo('Обновление', `Процесс ${action} канала...`);
            
            await APIClient.channels.updateChannel(channelId, { is_active: activate });
            
            NotificationManager.showSuccess('Успех', `Канал ${activate ? 'активирован' : 'деактивирован'}`);
            this.loadChannels();
            this.loadChannelsStats();
            
        } catch (error) {
            console.error('Ошибка изменения статуса канала:', error);
            NotificationManager.showError('Ошибка', 'Не удалось изменить статус канала');
        }
    }

    async removeHotOffer(channelId) {
        try {
            await APIClient.channels.setHotOffer(channelId, false);
            NotificationManager.showSuccess('Успех', 'Горячее предложение удалено');
            this.loadHotOffers();
            this.loadChannels();
        } catch (error) {
            console.error('Ошибка удаления горячего предложения:', error);
            NotificationManager.showError('Ошибка', 'Не удалось удалить горячее предложение');
        }
    }

    async showChannelActions(channelId) {
        NotificationManager.showInfo('В разработке', 'Дополнительные действия с каналами в разработке');
    }

    async bulkActivateChannels() {
        try {
            const channels = Array.from(this.selectedChannels);
            NotificationManager.showInfo('Обновление', `Активация ${channels.length} каналов...`);
            
            await Promise.all(channels.map(id => 
                APIClient.channels.updateChannel(id, { is_active: true })
            ));
            
            NotificationManager.showSuccess('Успех', `Активировано ${channels.length} каналов`);
            this.selectedChannels.clear();
            this.loadChannels();
            this.loadChannelsStats();
            this.updateBulkActions();
            
        } catch (error) {
            console.error('Ошибка массовой активации:', error);
            NotificationManager.showError('Ошибка', 'Не удалось активировать все каналы');
        }
    }

    async bulkDeactivateChannels() {
        try {
            const channels = Array.from(this.selectedChannels);
            NotificationManager.showInfo('Обновление', `Деактивация ${channels.length} каналов...`);
            
            await Promise.all(channels.map(id => 
                APIClient.channels.updateChannel(id, { is_active: false })
            ));
            
            NotificationManager.showSuccess('Успех', `Деактивировано ${channels.length} каналов`);
            this.selectedChannels.clear();
            this.loadChannels();
            this.loadChannelsStats();
            this.updateBulkActions();
            
        } catch (error) {
            console.error('Ошибка массовой деактивации:', error);
            NotificationManager.showError('Ошибка', 'Не удалось деактивировать все каналы');
        }
    }

    destroy() {
        // Очистка при уничтожении компонента
        this.selectedChannels.clear();
    }
}

// Глобальная переменная для доступа к экземпляру
window.channelsPage = null;
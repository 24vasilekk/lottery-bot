// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
        this.init();
    }

    async init() {
        console.log('🔧 Инициализация админ-панели...');
        
        // Загружаем данные при старте
        await this.loadDashboardData();
        
        // Настраиваем обработчики событий
        this.setupEventListeners();
        
        // Автообновление каждую минуту
        setInterval(() => this.loadDashboardData(), 60000);
    }

    setupEventListeners() {
        // Обработчик смены типа размещения канала
        document.getElementById('placementType')?.addEventListener('change', (e) => {
            const isTime = e.target.value === 'time';
            document.getElementById('durationField').style.display = isTime ? 'block' : 'none';
            document.getElementById('targetField').style.display = isTime ? 'none' : 'block';
        });

        // Обработчик формы настроек
        document.getElementById('settingsForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        // Автообновление списков при переключении вкладок
        document.querySelectorAll('[data-bs-toggle="pill"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const targetId = e.target.getAttribute('href').substring(1);
                this.loadTabData(targetId);
            });
        });
    }

    async loadDashboardData() {
        try {
            console.log('📊 Загрузка данных дашборда...');
            
            // Загружаем статистику
            const stats = await this.apiCall('/api/admin/stats');
            this.updateDashboardStats(stats);

            // Загружаем данные для активной вкладки
            const activeTab = document.querySelector('.nav-link.active');
            if (activeTab) {
                const tabId = activeTab.getAttribute('href').substring(1);
                await this.loadTabData(tabId);
            }

        } catch (error) {
            console.error('❌ Ошибка загрузки дашборда:', error);
            this.showError('Ошибка загрузки данных');
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
        document.getElementById('activeUsers').textContent = stats.activeUsers || 0;
        document.getElementById('totalChannels').textContent = stats.totalChannels || 0;
        document.getElementById('hotChannels').textContent = stats.hotChannels || 0;
        document.getElementById('totalSubscriptions').textContent = stats.totalSubscriptions || 0;
        document.getElementById('todaySubscriptions').textContent = stats.todaySubscriptions || 0;
        document.getElementById('pendingPrizes').textContent = stats.pendingPrizes || 0;
        document.getElementById('pendingCertificates').textContent = stats.pendingCertificates || 0;
    }

    async loadTabData(tabId) {
        switch (tabId) {
            case 'channels':
                await this.loadChannels();
                break;
            case 'prizes':
                await this.loadPendingPrizes();
                break;
            case 'users':
                await this.loadUsers();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
        }
    }

    async loadChannels() {
        try {
            const channels = await this.apiCall('/api/admin/channels');
            this.renderChannelsTable(channels);
        } catch (error) {
            console.error('❌ Ошибка загрузки каналов:', error);
        }
    }

    renderChannelsTable(channels) {
        const tbody = document.getElementById('channelsTable');
        tbody.innerHTML = '';

        channels.forEach(channel => {
            const row = document.createElement('tr');
            
            const statusBadge = this.getChannelStatusBadge(channel);
            const placementInfo = channel.placement_type === 'time' 
                ? `⏰ ${channel.placement_duration}ч`
                : `🎯 ${channel.current_subscribers}/${channel.subscribers_target}`;

            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fab fa-telegram text-primary me-2"></i>
                        <div>
                            <strong>@${channel.channel_username}</strong>
                            <br><small class="text-muted">${channel.channel_name}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-info">${channel.reward_stars} ⭐</span>
                    ${channel.is_hot_offer ? '<span class="badge badge-hot ms-1">🔥 x2</span>' : ''}
                </td>
                <td>${placementInfo}</td>
                <td>
                    <div class="progress" style="height: 5px;">
                        <div class="progress-bar" role="progressbar" 
                             style="width: ${this.getChannelProgress(channel)}%">
                        </div>
                    </div>
                    <small>${channel.current_subscribers} подписчиков</small>
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="admin.editChannel(${channel.id})" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="admin.toggleHotOffer(${channel.id}, ${!channel.is_hot_offer})" title="Горячее предложение">
                            <i class="fas fa-fire"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="admin.deactivateChannel(${channel.id})" title="Деактивировать">
                            <i class="fas fa-pause"></i>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    getChannelStatusBadge(channel) {
        if (!channel.is_active) {
            return '<span class="badge badge-inactive">Неактивен</span>';
        }

        if (channel.is_hot_offer) {
            return '<span class="badge badge-hot">🔥 Горячий</span>';
        }

        const now = new Date();
        const endDate = new Date(channel.end_date);
        
        if (endDate < now) {
            return '<span class="badge bg-warning">Истек</span>';
        }

        return '<span class="badge badge-active">Активен</span>';
    }

    getChannelProgress(channel) {
        if (channel.placement_type === 'target') {
            return Math.min(100, (channel.current_subscribers / channel.subscribers_target) * 100);
        }
        
        // Для временных размещений показываем прогресс времени
        const now = new Date();
        const start = new Date(channel.start_date);
        const end = new Date(channel.end_date);
        const total = end.getTime() - start.getTime();
        const passed = now.getTime() - start.getTime();
        
        return Math.min(100, Math.max(0, (passed / total) * 100));
    }

    async loadPendingPrizes() {
        try {
            const prizes = await this.apiCall('/api/admin/pending-prizes');
            this.renderPendingPrizes(prizes);
        } catch (error) {
            console.error('❌ Ошибка загрузки призов:', error);
        }
    }

    renderPendingPrizes(prizes) {
        const container = document.getElementById('prizesContainer');
        container.innerHTML = '';

        if (prizes.length === 0) {
            container.innerHTML = '<div class="alert alert-info">🎉 Все призы выданы!</div>';
            return;
        }

        prizes.forEach(prize => {
            const prizeDiv = document.createElement('div');
            prizeDiv.className = `prize-item prize-${prize.type}`;
            
            const prizeIcon = this.getPrizeIcon(prize.type);
            const prizeDate = new Date(prize.created_at).toLocaleString('ru-RU');
            
            prizeDiv.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <span class="me-3" style="font-size: 2rem;">${prizeIcon}</span>
                        <div>
                            <h6 class="mb-1">${prize.name}</h6>
                            <small class="text-muted">
                                👤 ${prize.user_name} (@${prize.username || 'без username'}) 
                                | ID: ${prize.user_telegram_id}
                                | 📅 ${prizeDate}
                            </small>
                        </div>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-success" onclick="admin.markPrizeGiven(${prize.id})">
                            <i class="fas fa-check"></i> Выдано
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="admin.contactUser(${prize.user_telegram_id})">
                            <i class="fas fa-paper-plane"></i> Связаться
                        </button>
                    </div>
                </div>
            `;

            container.appendChild(prizeDiv);
        });
    }

    getPrizeIcon(type) {
        const icons = {
            'certificate': '🏆',
            'cosmetics': '💄',
            'stars': '⭐',
            'empty': '❌'
        };
        return icons[type] || '🎁';
    }

    async loadUsers() {
        try {
            const users = await this.apiCall('/api/admin/users');
            this.renderUsersTable(users);
        } catch (error) {
            console.error('❌ Ошибка загрузки пользователей:', error);
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTable');
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            
            const statusBadge = user.tasks_ban_until && new Date(user.tasks_ban_until) > new Date()
                ? '<span class="badge bg-danger">Заблокирован</span>'
                : '<span class="badge bg-success">Активен</span>';

            row.innerHTML = `
                <td>${user.telegram_id}</td>
                <td>
                    <div>
                        <strong>${user.first_name}</strong>
                        ${user.username ? `<br><small class="text-muted">@${user.username}</small>` : ''}
                    </div>
                </td>
                <td>
                    <span class="badge bg-warning">${user.stars || 0} ⭐</span>
                </td>
                <td>${user.subscription_count || 0}</td>
                <td>${user.prizes_won || 0}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="admin.viewUserDetails(${user.telegram_id})" title="Подробно">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="admin.adjustUserStars(${user.telegram_id})" title="Корректировка звезд">
                            <i class="fas fa-star"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="admin.banUser(${user.telegram_id})" title="Заблокировать">
                            <i class="fas fa-ban"></i>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    async loadAnalytics() {
        try {
            const analytics = await this.apiCall('/api/admin/analytics');
            this.renderCharts(analytics);
        } catch (error) {
            console.error('❌ Ошибка загрузки аналитики:', error);
        }
    }

    renderCharts(analytics) {
        // График подписок
        const subscriptionsCtx = document.getElementById('subscriptionsChart').getContext('2d');
        new Chart(subscriptionsCtx, {
            type: 'line',
            data: {
                labels: analytics.subscriptionsData.labels,
                datasets: [{
                    label: 'Подписки по дням',
                    data: analytics.subscriptionsData.values,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Динамика подписок'
                    }
                }
            }
        });

        // График призов
        const prizesCtx = document.getElementById('prizesChart').getContext('2d');
        new Chart(prizesCtx, {
            type: 'doughnut',
            data: {
                labels: analytics.prizesData.labels,
                datasets: [{
                    data: analytics.prizesData.values,
                    backgroundColor: [
                        '#667eea',
                        '#764ba2', 
                        '#f093fb',
                        '#f5576c'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Распределение призов'
                    }
                }
            }
        });
    }

    // Действия с каналами
    async addChannel() {
        try {
            const formData = {
                channel_username: document.getElementById('channelUsername').value,
                channel_name: document.getElementById('channelName').value,
                reward_stars: parseInt(document.getElementById('channelReward').value),
                placement_type: document.getElementById('placementType').value,
                placement_duration: parseInt(document.getElementById('placementDuration').value),
                subscribers_target: parseInt(document.getElementById('subscribersTarget').value),
                is_hot_offer: document.getElementById('isHotOffer').checked
            };

            await this.apiCall('/api/admin/channels', 'POST', formData);
            
            // Закрываем модал и обновляем список
            bootstrap.Modal.getInstance(document.getElementById('addChannelModal')).hide();
            await this.loadChannels();
            
            this.showSuccess('Канал успешно добавлен!');
            document.getElementById('addChannelForm').reset();

        } catch (error) {
            console.error('❌ Ошибка добавления канала:', error);
            this.showError('Ошибка добавления канала');
        }
    }

    async toggleHotOffer(channelId, isHot) {
        try {
            await this.apiCall(`/api/admin/channels/${channelId}/hot-offer`, 'PATCH', { is_hot_offer: isHot });
            await this.loadChannels();
            this.showSuccess(`Горячее предложение ${isHot ? 'включено' : 'отключено'}`);
        } catch (error) {
            console.error('❌ Ошибка изменения горячего предложения:', error);
            this.showError('Ошибка изменения статуса');
        }
    }

    async deactivateChannel(channelId) {
        if (!confirm('Вы уверены, что хотите деактивировать канал?')) return;

        try {
            await this.apiCall(`/api/admin/channels/${channelId}`, 'DELETE');
            await this.loadChannels();
            this.showSuccess('Канал деактивирован');
        } catch (error) {
            console.error('❌ Ошибка деактивации канала:', error);
            this.showError('Ошибка деактивации канала');
        }
    }

    // Действия с призами
    async markPrizeGiven(prizeId) {
        if (!confirm('Подтвердить выдачу приза?')) return;

        try {
            await this.apiCall(`/api/admin/prizes/${prizeId}/given`, 'PATCH');
            await this.loadPendingPrizes();
            this.showSuccess('Приз отмечен как выданный');
        } catch (error) {
            console.error('❌ Ошибка отметки приза:', error);
            this.showError('Ошибка отметки приза');
        }
    }

    contactUser(telegramId) {
        const botUsername = 'kosmetichka_lottery_bot'; // Замените на ваш бот
        const url = `https://t.me/${botUsername}?start=contact_${telegramId}`;
        window.open(url, '_blank');
    }

    // Вспомогательные методы
    async apiCall(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(this.apiUrl + endpoint, options);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.insertBefore(alertDiv, document.body.firstChild);

        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// Глобальные функции для использования в HTML
window.addChannel = () => admin.addChannel();
window.admin = new AdminPanel();
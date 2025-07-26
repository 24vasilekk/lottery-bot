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
            case 'wheel-settings':
                await this.loadWheelSettings();
                break;
            case 'automation':
                await this.loadAutomationTab();
                break;
            case 'wins-channel':
                await this.loadWinsChannelTab();
                break;
            case 'manual-spins':
                await this.loadManualSpinsTab();
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

    adjustUserStars(telegramId) {
        const user = this.users.find(u => u.telegram_id === telegramId);
        if (!user) {
            this.showAlert('Пользователь не найден', 'error');
            return;
        }

        // Заполняем данные в модальном окне
        document.getElementById('starsUserName').textContent = user.username || `ID: ${user.telegram_id}`;
        document.getElementById('currentStars').textContent = user.stars || 0;
        document.getElementById('starsAmount').value = '';
        document.getElementById('starsReason').value = '';
        document.getElementById('starsOperation').value = 'add';
        
        // Сохраняем ID пользователя для использования при подтверждении
        this.currentAdjustUserId = telegramId;
        this.currentAdjustUserStars = user.stars || 0;
        
        // Обновляем превью
        this.updateStarsPreview();
        
        // Показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('adjustStarsModal'));
        modal.show();
    }

    updateStarsPreview() {
        const operation = document.getElementById('starsOperation').value;
        const amount = parseInt(document.getElementById('starsAmount').value) || 0;
        const currentStars = this.currentAdjustUserStars || 0;
        let newBalance = 0;

        switch(operation) {
            case 'add':
                newBalance = currentStars + amount;
                break;
            case 'subtract':
                newBalance = Math.max(0, currentStars - amount);
                break;
            case 'set':
                newBalance = amount;
                break;
        }

        const balanceElement = document.getElementById('newStarsBalance');
        balanceElement.textContent = newBalance;
        balanceElement.className = newBalance >= 0 ? 'text-success' : 'text-danger';
    }

    async confirmAdjustStars() {
        const operation = document.getElementById('starsOperation').value;
        const amount = parseInt(document.getElementById('starsAmount').value) || 0;
        const reason = document.getElementById('starsReason').value.trim();

        if (amount < 0) {
            this.showAlert('Количество должно быть положительным числом', 'error');
            return;
        }

        if (!reason) {
            this.showAlert('Укажите причину изменения баланса', 'error');
            return;
        }

        try {
            const response = await this.apiCall('/api/admin/users/stars', 'POST', {
                telegramId: this.currentAdjustUserId,
                operation: operation,
                amount: amount,
                reason: reason
            });

            if (response.success) {
                this.showAlert('Баланс звезд успешно обновлен', 'success');
                
                // Закрываем модальное окно
                const modal = bootstrap.Modal.getInstance(document.getElementById('adjustStarsModal'));
                modal.hide();
                
                // Обновляем таблицу пользователей
                await this.loadUsers();
            } else {
                this.showAlert(response.error || 'Ошибка при обновлении баланса', 'error');
            }
        } catch (error) {
            console.error('Error adjusting stars:', error);
            this.showAlert('Ошибка при обновлении баланса звезд', 'error');
        }
    }

    async loadWheelSettings() {
        try {
            // Загружаем настройки для обеих рулеток
            const [megaSettings, normalSettings] = await Promise.all([
                this.apiCall('/api/admin/wheel-settings/mega'),
                this.apiCall('/api/admin/wheel-settings/normal')
            ]);

            this.renderMegaWheelSettings(megaSettings);
            this.renderNormalWheelSettings(normalSettings);
        } catch (error) {
            console.error('Error loading wheel settings:', error);
            this.showAlert('Ошибка загрузки настроек рулетки', 'error');
        }
    }

    renderMegaWheelSettings(settings) {
        const container = document.getElementById('megaPrizesContainer');
        if (!container) return;

        // Дефолтные настройки мега рулетки
        const defaultPrizes = [
            { id: 'airpods4', name: 'AirPods 4', chance: 0.1 },
            { id: 'cert5000', name: 'Сертификат 5000₽', chance: 1.9 },
            { id: 'cert3000', name: 'Сертификат 3000₽', chance: 5.0 },
            { id: 'powerbank', name: 'Повербанк', chance: 8.0 },
            { id: 'cert2000', name: 'Сертификат 2000₽', chance: 12.0 },
            { id: 'charger', name: 'Беспроводная зарядка', chance: 15.0 },
            { id: 'cert1000', name: 'Сертификат 1000₽', chance: 18.0 },
            { id: 'stars100', name: '100 звезд', chance: 15.0 },
            { id: 'empty', name: 'Повезет в следующий раз', chance: 25.0 }
        ];

        const prizes = settings?.prizes || defaultPrizes;
        let html = '';

        prizes.forEach(prize => {
            html += `
                <div class="mb-3">
                    <label class="form-label">${prize.name}</label>
                    <div class="input-group">
                        <input type="number" 
                               class="form-control mega-prize-chance" 
                               data-prize-id="${prize.id}"
                               value="${prize.chance}" 
                               min="0" 
                               max="100" 
                               step="0.1">
                        <span class="input-group-text">%</span>
                    </div>
                </div>
            `;
        });

        html += `
            <div class="mt-3 p-3 bg-light rounded">
                <strong>Сумма вероятностей: <span id="megaTotalChance">0</span>%</strong>
                <div class="progress mt-2" style="height: 10px;">
                    <div id="megaChanceProgress" class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        
        // Добавляем обработчики для автоматического подсчета
        container.querySelectorAll('.mega-prize-chance').forEach(input => {
            input.addEventListener('input', () => this.updateMegaTotalChance());
        });
        
        this.updateMegaTotalChance();
    }

    renderNormalWheelSettings(settings) {
        const container = document.getElementById('normalPrizesContainer');
        if (!container) return;

        // Дефолтные настройки обычной рулетки (нужно будет получить из config.js)
        const defaultPrizes = [
            { id: 'stars50', name: '50 звезд', chance: 30.0 },
            { id: 'stars30', name: '30 звезд', chance: 25.0 },
            { id: 'stars20', name: '20 звезд', chance: 20.0 },
            { id: 'stars10', name: '10 звезд', chance: 15.0 },
            { id: 'empty', name: 'Ничего', chance: 10.0 }
        ];

        const prizes = settings?.prizes || defaultPrizes;
        let html = '';

        prizes.forEach(prize => {
            html += `
                <div class="mb-3">
                    <label class="form-label">${prize.name}</label>
                    <div class="input-group">
                        <input type="number" 
                               class="form-control normal-prize-chance" 
                               data-prize-id="${prize.id}"
                               value="${prize.chance}" 
                               min="0" 
                               max="100" 
                               step="0.1">
                        <span class="input-group-text">%</span>
                    </div>
                </div>
            `;
        });

        html += `
            <div class="mt-3 p-3 bg-light rounded">
                <strong>Сумма вероятностей: <span id="normalTotalChance">0</span>%</strong>
                <div class="progress mt-2" style="height: 10px;">
                    <div id="normalChanceProgress" class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        
        // Добавляем обработчики для автоматического подсчета
        container.querySelectorAll('.normal-prize-chance').forEach(input => {
            input.addEventListener('input', () => this.updateNormalTotalChance());
        });
        
        this.updateNormalTotalChance();
    }

    updateMegaTotalChance() {
        const inputs = document.querySelectorAll('.mega-prize-chance');
        let total = 0;
        
        inputs.forEach(input => {
            total += parseFloat(input.value) || 0;
        });

        document.getElementById('megaTotalChance').textContent = total.toFixed(1);
        
        const progress = document.getElementById('megaChanceProgress');
        progress.style.width = `${Math.min(total, 100)}%`;
        
        if (total === 100) {
            progress.className = 'progress-bar bg-success';
        } else if (total > 100) {
            progress.className = 'progress-bar bg-danger';
        } else {
            progress.className = 'progress-bar bg-warning';
        }
    }

    updateNormalTotalChance() {
        const inputs = document.querySelectorAll('.normal-prize-chance');
        let total = 0;
        
        inputs.forEach(input => {
            total += parseFloat(input.value) || 0;
        });

        document.getElementById('normalTotalChance').textContent = total.toFixed(1);
        
        const progress = document.getElementById('normalChanceProgress');
        progress.style.width = `${Math.min(total, 100)}%`;
        
        if (total === 100) {
            progress.className = 'progress-bar bg-success';
        } else if (total > 100) {
            progress.className = 'progress-bar bg-danger';
        } else {
            progress.className = 'progress-bar bg-warning';
        }
    }

    async saveMegaWheelSettings() {
        const inputs = document.querySelectorAll('.mega-prize-chance');
        const prizes = [];
        let total = 0;

        inputs.forEach(input => {
            const chance = parseFloat(input.value) || 0;
            total += chance;
            prizes.push({
                id: input.dataset.prizeId,
                chance: chance
            });
        });

        if (Math.abs(total - 100) > 0.1) {
            this.showAlert('Сумма вероятностей должна равняться 100%', 'error');
            return;
        }

        try {
            const response = await this.apiCall('/api/admin/wheel-settings/mega', 'POST', { prizes });
            
            if (response.success) {
                this.showAlert('Настройки мега рулетки сохранены', 'success');
            } else {
                this.showAlert(response.error || 'Ошибка сохранения настроек', 'error');
            }
        } catch (error) {
            console.error('Error saving mega wheel settings:', error);
            this.showAlert('Ошибка сохранения настроек мега рулетки', 'error');
        }
    }

    async saveNormalWheelSettings() {
        const inputs = document.querySelectorAll('.normal-prize-chance');
        const prizes = [];
        let total = 0;

        inputs.forEach(input => {
            const chance = parseFloat(input.value) || 0;
            total += chance;
            prizes.push({
                id: input.dataset.prizeId,
                chance: chance
            });
        });

        if (Math.abs(total - 100) > 0.1) {
            this.showAlert('Сумма вероятностей должна равняться 100%', 'error');
            return;
        }

        try {
            const response = await this.apiCall('/api/admin/wheel-settings/normal', 'POST', { prizes });
            
            if (response.success) {
                this.showAlert('Настройки обычной рулетки сохранены', 'success');
            } else {
                this.showAlert(response.error || 'Ошибка сохранения настроек', 'error');
            }
        } catch (error) {
            console.error('Error saving normal wheel settings:', error);
            this.showAlert('Ошибка сохранения настроек обычной рулетки', 'error');
        }
    }

    // Методы для автоматизации
    async loadAutomationTab() {
        try {
            await Promise.all([
                this.loadAutomationStats(),
                this.loadAutomationChannels(),
                this.loadAutomationNotifications()
            ]);
        } catch (error) {
            console.error('❌ Ошибка загрузки вкладки автоматизации:', error);
        }
    }

    async loadAutomationStats() {
        try {
            const stats = await this.apiCall('/api/admin/automation/stats');
            this.updateAutomationStats(stats.stats);
        } catch (error) {
            console.error('❌ Ошибка загрузки статистики автоматизации:', error);
        }
    }

    updateAutomationStats(stats) {
        // Обновляем статистику в карточках
        document.querySelector('#automation #totalChannels').textContent = stats.totalChannels || 0;
        document.querySelector('#automation #activeChannels').textContent = stats.activeChannels || 0;
        document.querySelector('#automation #expiredChannels').textContent = stats.expiredChannels || 0;
        document.querySelector('#automation #completedChannels').textContent = stats.completedChannels || 0;
        document.querySelector('#automation #autoRenewalChannels').textContent = stats.autoRenewalChannels || 0;
        document.querySelector('#automation #avgPriorityScore').textContent = Math.round(stats.avgPriorityScore || 0);
    }

    async loadAutomationChannels() {
        try {
            const channels = await this.apiCall('/api/admin/automation/channels');
            this.renderAutomationChannelsTable(channels);
        } catch (error) {
            console.error('❌ Ошибка загрузки каналов автоматизации:', error);
        }
    }

    renderAutomationChannelsTable(channels) {
        const tbody = document.getElementById('automationChannelsTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        channels.forEach(channel => {
            const row = document.createElement('tr');
            
            const priorityClass = this.getPriorityClass(channel.priority_score);
            const autoRenewalBadge = channel.auto_renewal 
                ? '<span class="badge bg-success">Включено</span>'
                : '<span class="badge bg-secondary">Отключено</span>';
            
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
                    <span class="priority-badge ${priorityClass}">${channel.priority_score || 50}</span>
                </td>
                <td>${autoRenewalBadge}</td>
                <td>
                    <span class="badge bg-info">${channel.renewal_count || 0}</span>
                </td>
                <td>
                    ${this.getChannelStatusBadge(channel)}
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" 
                                onclick="toggleAutoRenewal(${channel.id}, ${!channel.auto_renewal})" 
                                title="Переключить автопродление">
                            <i class="fas fa-sync"></i>
                        </button>
                        <button class="btn btn-outline-info" 
                                onclick="admin.viewChannelAutomationLog(${channel.id})" 
                                title="Журнал автоматизации">
                            <i class="fas fa-history"></i>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    getPriorityClass(priority) {
        if (priority >= 70) return 'priority-high';
        if (priority >= 40) return 'priority-medium';
        return 'priority-low';
    }

    async loadAutomationNotifications() {
        try {
            const notifications = await this.apiCall('/api/admin/automation/notifications');
            this.renderAutomationNotifications(notifications);
        } catch (error) {
            console.error('❌ Ошибка загрузки уведомлений автоматизации:', error);
        }
    }

    renderAutomationNotifications(notifications) {
        const container = document.getElementById('recentNotifications');
        if (!container) return;

        container.innerHTML = '';

        if (notifications.length === 0) {
            container.innerHTML = '<div class="text-muted text-center">Нет уведомлений</div>';
            return;
        }

        notifications.forEach(notification => {
            const notificationDiv = document.createElement('div');
            notificationDiv.className = 'notification-item';
            
            const date = new Date(notification.created_at).toLocaleString('ru-RU');
            notificationDiv.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span>${notification.message}</span>
                    <small class="text-muted">${date}</small>
                </div>
            `;

            container.appendChild(notificationDiv);
        });
    }

    async forceAutomationCheck() {
        try {
            await this.apiCall('/api/admin/automation/force-check', 'POST');
            this.showSuccess('Принудительная проверка автоматизации запущена');
            
            // Обновляем данные через 3 секунды
            setTimeout(() => {
                this.loadAutomationTab();
            }, 3000);
        } catch (error) {
            console.error('❌ Ошибка принудительной проверки:', error);
            this.showError('Ошибка запуска принудительной проверки');
        }
    }

    async toggleAutoRenewal(channelId, enable) {
        try {
            await this.apiCall(`/api/admin/automation/channels/${channelId}/auto-renewal`, 'PATCH', {
                auto_renewal: enable
            });
            
            this.showSuccess(`Автопродление ${enable ? 'включено' : 'отключено'}`);
            await this.loadAutomationChannels();
            await this.loadAutomationStats();
        } catch (error) {
            console.error('❌ Ошибка переключения автопродления:', error);
            this.showError('Ошибка изменения настроек автопродления');
        }
    }

    viewChannelAutomationLog(channelId) {
        // Здесь можно открыть модальное окно с журналом автоматизации для конкретного канала
        this.showSuccess('Функция журнала автоматизации в разработке');
    }

    showAutomationLog() {
        // Здесь можно открыть полный журнал автоматизации
        this.showSuccess('Полный журнал автоматизации в разработке');
    }

    // Методы для канала выигрышей
    async loadWinsChannelTab() {
        try {
            await Promise.all([
                this.loadWinsChannelStats(),
                this.loadRecentWins()
            ]);
        } catch (error) {
            console.error('❌ Ошибка загрузки вкладки канала выигрышей:', error);
        }
    }

    async loadWinsChannelStats() {
        try {
            const response = await this.apiCall('/api/admin/wins-channel/stats');
            this.updateWinsChannelStats(response.stats);
        } catch (error) {
            console.error('❌ Ошибка загрузки статистики канала выигрышей:', error);
        }
    }

    updateWinsChannelStats(stats) {
        document.getElementById('totalWinsPosted').textContent = stats.totalWinsPosted || 0;
        document.getElementById('todayWinsPosted').textContent = stats.todayWinsPosted || 0;
        document.getElementById('weekWinsPosted').textContent = stats.weekWinsPosted || 0;
        
        // Обновляем ID канала, если он настроен
        const channelIdElement = document.getElementById('channelIdDisplay');
        if (process.env.WINS_CHANNEL_ID) {
            channelIdElement.textContent = process.env.WINS_CHANNEL_ID;
        } else {
            channelIdElement.textContent = 'Не настроен';
        }
    }

    async loadRecentWins() {
        try {
            const recentWins = await this.apiCall('/api/admin/wins-channel/recent');
            this.renderRecentWinsTable(recentWins);
        } catch (error) {
            console.error('❌ Ошибка загрузки недавних выигрышей:', error);
        }
    }

    renderRecentWinsTable(wins) {
        const tbody = document.getElementById('recentWinsTable');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (wins.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" class="text-center text-muted">Нет опубликованных выигрышей</td>';
            tbody.appendChild(row);
            return;
        }

        wins.forEach(win => {
            const row = document.createElement('tr');
            
            const wonDate = new Date(win.won_date).toLocaleString('ru-RU');
            const postedDate = win.posted_to_channel_date 
                ? new Date(win.posted_to_channel_date).toLocaleString('ru-RU')
                : 'Не опубликован';
            
            const prizeIcon = this.getWinPrizeIcon(win.prize_type);
            const userName = win.first_name || 'Пользователь';
            const userHandle = win.username ? `(@${win.username})` : '';

            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <span class="me-2" style="font-size: 1.2rem;">${prizeIcon}</span>
                        <div>
                            <strong>${win.prize_name}</strong>
                            <br><small class="text-muted">${win.prize_type}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div>
                        <strong>${userName}</strong>
                        <br><small class="text-muted">${userHandle}</small>
                    </div>
                </td>
                <td>
                    <small>${wonDate}</small>
                </td>
                <td>
                    ${win.posted_to_channel_date 
                        ? `<small class="text-success">${postedDate}</small>`
                        : '<span class="badge bg-warning">Ожидает</span>'
                    }
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        ${!win.posted_to_channel_date 
                            ? `<button class="btn btn-outline-primary" onclick="admin.manualPostWin(${win.id})" title="Опубликовать">
                                <i class="fas fa-paper-plane"></i>
                            </button>`
                            : '<span class="text-muted">Опубликован</span>'
                        }
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    getWinPrizeIcon(prizeType) {
        const icons = {
            'airpods4': '🎧',
            'cert5000': '💎', 
            'cert3000': '💍',
            'cert2000': '💰',
            'cert1000': '🏅',
            'powerbank': '🔋',
            'charger': '⚡',
            'golden-apple': '🍎',
            'dolce': '💄'
        };
        
        return icons[prizeType] || '🎁';
    }

    async manualPostWin(prizeId) {
        if (!confirm('Опубликовать этот выигрыш в канале?')) return;

        try {
            await this.apiCall(`/api/admin/wins-channel/post/${prizeId}`, 'POST');
            this.showSuccess('Выигрыш успешно опубликован в канале');
            
            // Обновляем данные
            await this.loadWinsChannelTab();
        } catch (error) {
            console.error('❌ Ошибка публикации выигрыша:', error);
            this.showError('Ошибка публикации выигрыша: ' + (error.message || 'Неизвестная ошибка'));
        }
    }

    async testWinsChannel() {
        if (!confirm('Отправить тестовое сообщение в канал выигрышей?')) return;

        try {
            await this.apiCall('/api/admin/wins-channel/test', 'POST');
            this.showSuccess('Тестовое сообщение отправлено в канал');
        } catch (error) {
            console.error('❌ Ошибка тестирования канала:', error);
            this.showError('Ошибка тестирования канала: ' + (error.message || 'Неизвестная ошибка'));
        }
    }

    // Методы для ручных подкруток
    async giveManualSpin() {
        const userId = document.getElementById('spinUserId').value;
        const spinType = document.getElementById('spinType').value;
        const reason = document.getElementById('spinReason').value;

        if (!userId || !reason) {
            this.showError('Заполните все поля');
            return;
        }

        if (!confirm(`Дать прокрутку пользователю ${userId}?`)) return;

        try {
            const response = await this.apiCall('/api/admin/manual-spin', 'POST', {
                userId: parseInt(userId),
                spinType: spinType,
                reason: reason
            });

            if (response.success) {
                this.showSuccess('Прокрутка успешно предоставлена');
                document.getElementById('manualSpinForm').reset();
                await this.loadRecentManualSpins();
            } else {
                this.showError(response.error || 'Ошибка предоставления прокрутки');
            }
        } catch (error) {
            console.error('❌ Ошибка ручной подкрутки:', error);
            this.showError('Ошибка предоставления прокрутки');
        }
    }

    async loadRecentManualSpins() {
        try {
            const response = await this.apiCall('/api/admin/manual-spins/recent');
            this.renderRecentManualSpins(response.spins || []);
        } catch (error) {
            console.error('❌ Ошибка загрузки подкруток:', error);
        }
    }

    renderRecentManualSpins(spins) {
        const container = document.getElementById('recentManualSpins');
        if (!container) return;

        if (spins.length === 0) {
            container.innerHTML = '<p class="text-muted">Нет недавних подкруток</p>';
            return;
        }

        let html = '';
        spins.forEach(spin => {
            const date = new Date(spin.created_at).toLocaleString('ru-RU');
            const typeIcon = spin.spin_type === 'mega' ? '👑' : spin.spin_type === 'friend' ? '❤️' : '⭐';
            
            html += `
                <div class="manual-spin-item mb-2 p-2 border rounded">
                    <div class="d-flex justify-content-between">
                        <div>
                            <strong>${typeIcon} ID: ${spin.user_id}</strong>
                            <small class="text-muted d-block">${spin.reason}</small>
                        </div>
                        <small class="text-muted">${date}</small>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async loadManualSpinsTab() {
        await this.loadRecentManualSpins();
    }
}

// Глобальные функции для использования в HTML
window.addChannel = () => admin.addChannel();
window.updateStarsPreview = () => admin.updateStarsPreview();
window.confirmAdjustStars = () => admin.confirmAdjustStars();
window.loadAutomationStats = () => admin.loadAutomationStats();
window.forceAutomationCheck = () => admin.forceAutomationCheck();
window.toggleAutoRenewal = (channelId, enable) => admin.toggleAutoRenewal(channelId, enable);
window.showAutomationLog = () => admin.showAutomationLog();
window.loadWinsChannelTab = () => admin.loadWinsChannelTab();
window.testWinsChannel = () => admin.testWinsChannel();
window.admin = new AdminPanel();
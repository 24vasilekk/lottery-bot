// API клиент для админ панели
class APIClient {
    constructor() {
        this.baseURL = '';
        this.authManager = new AuthManager();
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    // Получить заголовки с авторизацией
    async getHeaders(customHeaders = {}) {
        await this.authManager.ensureValidToken();
        
        return {
            ...this.defaultHeaders,
            ...this.authManager.getAuthHeaders(),
            ...customHeaders
        };
    }

    // Обработать ответ сервера
    async handleResponse(response) {
        // Проверить статус ответа
        if (response.status === 401) {
            // Токен недействителен - перенаправить на страницу входа
            this.authManager.clearAuth();
            window.location.href = 'login.html';
            throw new Error('Сессия истекла. Войдите заново.');
        }

        if (response.status === 403) {
            throw new Error('Недостаточно прав доступа');
        }

        if (response.status === 429) {
            throw new Error('Слишком много запросов. Попробуйте позже.');
        }

        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return data;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
    }

    // GET запрос
    async get(endpoint, params = {}) {
        const url = new URL(this.baseURL + endpoint, window.location.origin);
        
        // Добавить параметры запроса
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: await this.getHeaders()
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error(`GET ${endpoint} ошибка:`, error);
            throw error;
        }
    }

    // POST запрос
    async post(endpoint, data = {}, customHeaders = {}) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'POST',
                headers: await this.getHeaders(customHeaders),
                body: JSON.stringify(data)
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error(`POST ${endpoint} ошибка:`, error);
            throw error;
        }
    }

    // PUT запрос
    async put(endpoint, data = {}, customHeaders = {}) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'PUT',
                headers: await this.getHeaders(customHeaders),
                body: JSON.stringify(data)
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error(`PUT ${endpoint} ошибка:`, error);
            throw error;
        }
    }

    // PATCH запрос
    async patch(endpoint, data = {}, customHeaders = {}) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'PATCH',
                headers: await this.getHeaders(customHeaders),
                body: JSON.stringify(data)
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error(`PATCH ${endpoint} ошибка:`, error);
            throw error;
        }
    }

    // DELETE запрос
    async delete(endpoint, customHeaders = {}) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'DELETE',
                headers: await this.getHeaders(customHeaders)
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error(`DELETE ${endpoint} ошибка:`, error);
            throw error;
        }
    }

    // Загрузка файлов
    async uploadFile(endpoint, file, additionalData = {}) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // Добавить дополнительные данные
            Object.keys(additionalData).forEach(key => {
                formData.append(key, additionalData[key]);
            });

            const headers = await this.getHeaders();
            // Удалить Content-Type для FormData
            delete headers['Content-Type'];

            const response = await fetch(this.baseURL + endpoint, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error(`UPLOAD ${endpoint} ошибка:`, error);
            throw error;
        }
    }

    // Загрузка файла по ссылке
    async downloadFile(endpoint, filename) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'GET',
                headers: await this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Создать ссылку для скачивания
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'download';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Очистить URL
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error(`DOWNLOAD ${endpoint} ошибка:`, error);
            throw error;
        }
    }
}

// API методы для конкретных сущностей
class AdminAPI extends APIClient {
    constructor() {
        super();
        this.users = new UsersAPI(this);
        this.channels = new ChannelsAPI(this);
        this.prizes = new PrizesAPI(this);
        this.analytics = new AnalyticsAPI(this);
        this.wheel = new WheelAPI(this);
        this.broadcasts = new BroadcastsAPI(this);
        this.system = new SystemAPI(this);
    }

    // Получить статистику дашборда
    async getDashboardStats() {
        return await this.get('/api/admin/dashboard-stats');
    }

    // Получить последние события
    async getRecentEvents(limit = 10) {
        return await this.get('/api/admin/recent-events', { limit });
    }

    // Получить уведомления
    async getNotifications() {
        return await this.get('/api/admin/notifications');
    }

    // Отметить уведомление как прочитанное
    async markNotificationRead(notificationId) {
        return await this.post(`/api/admin/notifications/${notificationId}/read`);
    }

    // Получить быструю статистику для бейджей
    async getQuickStats() {
        return await this.get('/api/admin/quick-stats');
    }
}

// API для работы с пользователями
class UsersAPI {
    constructor(client) {
        this.client = client;
    }

    async getUsers(params = {}) {
        return await this.client.get('/api/admin/users', params);
    }

    async getUser(userId) {
        return await this.client.get(`/api/admin/users/${userId}`);
    }

    async updateUser(userId, data) {
        return await this.client.patch(`/api/admin/users/${userId}`, data);
    }

    async updateUserStars(userId, amount, reason) {
        return await this.client.post('/api/admin/users/stars', {
            userId,
            amount,
            reason
        });
    }

    async banUser(userId, reason, duration) {
        return await this.client.post(`/api/admin/users/${userId}/ban`, {
            reason,
            duration
        });
    }

    async unbanUser(userId) {
        return await this.client.post(`/api/admin/users/${userId}/unban`);
    }

    async givePrize(userId, prizeData) {
        return await this.client.post('/api/admin/prizes/give', {
            userId,
            ...prizeData
        });
    }

    async getUserTransactions(userId, params = {}) {
        return await this.client.get(`/api/user/${userId}/transactions`, params);
    }

    async searchUsers(query) {
        return await this.client.get('/api/admin/users/search', { query });
    }
}

// API для работы с каналами
class ChannelsAPI {
    constructor(client) {
        this.client = client;
    }

    async getChannels(params = {}) {
        return await this.client.get('/api/admin/channels', params);
    }

    async getChannel(channelId) {
        return await this.client.get(`/api/admin/channels/${channelId}`);
    }

    async createChannel(data) {
        return await this.client.post('/api/admin/channels', data);
    }

    async updateChannel(channelId, data) {
        return await this.client.patch(`/api/admin/channels/${channelId}`, data);
    }

    async deleteChannel(channelId) {
        return await this.client.delete(`/api/admin/channels/${channelId}`);
    }

    async setHotOffer(channelId, isHot, multiplier = 2.0) {
        return await this.client.patch(`/api/admin/channels/${channelId}/hot-offer`, {
            isHot,
            multiplier
        });
    }

    async getChannelStats(channelId) {
        return await this.client.get(`/api/admin/channels/${channelId}/stats`);
    }

    async forceCheck() {
        return await this.client.post('/api/admin/automation/force-check');
    }

    async getAutomationStats() {
        return await this.client.get('/api/admin/automation/stats');
    }
}

// API для работы с призами
class PrizesAPI {
    constructor(client) {
        this.client = client;
    }

    async getPendingPrizes() {
        return await this.client.get('/api/admin/pending-prizes');
    }

    async markPrizeAsGiven(prizeId) {
        return await this.client.patch(`/api/admin/prizes/${prizeId}/given`);
    }

    async getPrizeStats() {
        return await this.client.get('/api/admin/prizes/stats');
    }

    async createCustomPrize(data) {
        return await this.client.post('/api/admin/prizes/custom', data);
    }
}

// API для аналитики
class AnalyticsAPI {
    constructor(client) {
        this.client = client;
    }

    async getUsersAnalytics(params = {}) {
        return await this.client.get('/api/admin/analytics/users', params);
    }

    async getRevenueAnalytics(params = {}) {
        return await this.client.get('/api/admin/analytics/revenue', params);
    }

    async getChannelsAnalytics(params = {}) {
        return await this.client.get('/api/admin/analytics/channels', params);
    }

    async getWheelAnalytics(params = {}) {
        return await this.client.get('/api/admin/analytics/wheel', params);
    }

    async getReferralAnalytics(params = {}) {
        return await this.client.get('/api/admin/analytics/referrals', params);
    }

    async exportData(type, format = 'csv') {
        return await this.client.downloadFile(
            `/api/admin/analytics/export?type=${type}&format=${format}`,
            `${type}_${new Date().toISOString().split('T')[0]}.${format}`
        );
    }
}

// API для настроек рулетки
class WheelAPI {
    constructor(client) {
        this.client = client;
    }

    async getSettings(wheelType = 'normal') {
        return await this.client.get(`/api/admin/wheel-settings/${wheelType}`);
    }

    async updateSettings(wheelType, settings) {
        return await this.client.post(`/api/admin/wheel-settings/${wheelType}`, settings);
    }

    async testWheel(wheelType, spinsCount = 100) {
        return await this.client.post(`/api/admin/wheel-settings/${wheelType}/test`, {
            spinsCount
        });
    }

    async resetSettings(wheelType) {
        return await this.client.post(`/api/admin/wheel-settings/${wheelType}/reset`);
    }
}

// API для рассылок
class BroadcastsAPI {
    constructor(client) {
        this.client = client;
    }

    async createBroadcast(data) {
        return await this.client.post('/api/admin/broadcast', data);
    }

    async getBroadcasts(params = {}) {
        return await this.client.get('/api/admin/broadcasts', params);
    }

    async getBroadcast(broadcastId) {
        return await this.client.get(`/api/admin/broadcasts/${broadcastId}`);
    }

    async cancelBroadcast(broadcastId) {
        return await this.client.post(`/api/admin/broadcasts/${broadcastId}/cancel`);
    }

    async getBroadcastStats(broadcastId) {
        return await this.client.get(`/api/admin/broadcasts/${broadcastId}/stats`);
    }
}

// API для системных операций
class SystemAPI {
    constructor(client) {
        this.client = client;
    }

    async getSystemHealth() {
        return await this.client.get('/api/admin/system/health');
    }

    async createBackup() {
        return await this.client.post('/api/admin/system/backup');
    }

    async cleanupOldData(days = 30) {
        return await this.client.post('/api/admin/system/cleanup', { days });
    }

    async getPromocodes() {
        return await this.client.get('/api/admin/promocodes');
    }

    async createPromocode(data) {
        return await this.client.post('/api/admin/promocodes', data);
    }

    async deletePromocode(id) {
        return await this.client.delete(`/api/admin/promocodes/${id}`);
    }

    async getSettings() {
        return await this.client.get('/api/admin/system/settings');
    }

    async updateSettings(data) {
        return await this.client.post('/api/admin/system/settings', data);
    }

    async testWinsChannel() {
        return await this.client.post('/api/admin/wins-channel/test');
    }

    async getWinsChannelStats() {
        return await this.client.get('/api/admin/wins-channel/stats');
    }
}

// Глобальный экземпляр API клиента
const APIClient = new AdminAPI();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIClient, AdminAPI };
}
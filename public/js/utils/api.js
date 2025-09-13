// api.js - HTTP API клиент для взаимодействия с backend

export class APIClient {
    constructor() {
        this.baseURL = window.location.origin;
        this.timeout = 30000;
        this.retryCount = 3;
        this.retryDelay = 1000;
        
        // Rate limiting
        this.requestQueue = new Map(); // endpoint -> timestamp последнего запроса
        this.minRequestInterval = 1000; // минимум 1 секунда между запросами к одному endpoint
    }

    async request(method, endpoint, data = null, options = {}) {
        // Rate limiting проверка
        const requestKey = `${method}:${endpoint}`;
        const now = Date.now();
        const lastRequestTime = this.requestQueue.get(requestKey);
        
        if (lastRequestTime && now - lastRequestTime < this.minRequestInterval) {
            const waitTime = this.minRequestInterval - (now - lastRequestTime);
            console.log(`⏰ Rate limit: ждем ${waitTime}ms для ${requestKey}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.requestQueue.set(requestKey, Date.now());
        
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        let lastError;
        
        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                console.log(`📡 API Request: ${method} ${endpoint} (попытка ${attempt})`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                
                const response = await fetch(url, {
                    ...config,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
                    
                    // Специальная обработка rate limit
                    if (response.status === 429 || (errorData.error && errorData.error.includes('слишком много запросов'))) {
                        const retryAfter = errorData.retryAfter || 5000; // 5 секунд по умолчанию
                        console.warn(`⚠️ Rate limit от сервера, ждем ${retryAfter}ms`);
                        await new Promise(resolve => setTimeout(resolve, retryAfter));
                        // Повторяем запрос после ожидания
                        continue;
                    }
                    
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                console.log(`✅ API Success: ${method} ${endpoint}`);
                return result;
                
            } catch (error) {
                lastError = error;
                console.error(`❌ API Error (попытка ${attempt}):`, error.message);
                
                if (attempt < this.retryCount && this.shouldRetry(error)) {
                    console.log(`🔄 Повтор через ${this.retryDelay}ms...`);
                    await this.delay(this.retryDelay * attempt);
                    continue;
                }
                
                break;
            }
        }
        
        console.error(`❌ API Failed after ${this.retryCount} attempts:`, lastError.message);
        throw lastError;
    }

    shouldRetry(error) {
        return error.name === 'AbortError' || 
               error.message.includes('fetch') ||
               error.message.includes('Network');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // === ОСНОВНЫЕ HTTP МЕТОДЫ ===

    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }

    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }

    // === API МЕТОДЫ ДЛЯ ПРИЛОЖЕНИЯ ===

    // Пользователи
    async getUserData(telegramId) {
        return this.get(`/api/user/${telegramId}`);
    }

    async updateUserBalance(telegramId, newBalance) {
        return this.post('/api/user/balance', { telegramId, newBalance });
    }

    // Рулетка
    async spinWheel(telegramId, spinType = 'normal') {
        return this.post('/api/spin', { telegramId, spinType });
    }

    async getWheelSettings(wheelType = 'normal') {
        return this.get(`/api/wheel/settings/${wheelType}`);
    }

    // Призы
    async getUserPrizes(telegramId) {
        return this.get(`/api/user/${telegramId}/prizes`);
    }

    async claimPrize(telegramId, prizeId) {
        return this.post('/api/user/claim-prize', { telegramId, prizeId });
    }

    // Транзакции
    async getUserTransactions(telegramId) {
        return this.get(`/api/user/${telegramId}/transactions`);
    }

    // Задания
    async getUserTasks(telegramId) {
        return this.get(`/api/user/${telegramId}/tasks`);
    }

    async completeTask(telegramId, taskId) {
        return this.post('/api/task/complete', { telegramId, taskId });
    }

    // Подписки
    async checkSubscription(telegramId, channelId) {
        return this.post('/api/subscription/check', { telegramId, channelId });
    }

    // Рефералы
    async getReferralInfo(telegramId) {
        return this.get(`/api/user/${telegramId}/referrals`);
    }

    async getLeaderboard(type = 'stars') {
        return this.get(`/api/leaderboard/${type}`);
    }

    // Статистика
    async getStats() {
        return this.get('/api/stats');
    }

    // Промокоды
    async usePromoCode(telegramId, promoCode) {
        return this.post('/api/promo/use', { telegramId, promoCode });
    }

    // Синхронизация баланса
    async syncBalance(telegramId) {
        return this.get(`/api/user/${telegramId}/balance-sync`);
    }

    // === АДМИНСКИЕ API МЕТОДЫ ===

    async adminGetStats(adminToken) {
        return this.get('/api/admin/stats', {
            headers: { 'admin-token': adminToken }
        });
    }

    async adminUpdateUser(adminToken, telegramId, updateData) {
        return this.post('/api/admin/user/update', 
            { telegramId, ...updateData },
            { headers: { 'admin-token': adminToken } }
        );
    }

    async adminAddStars(adminToken, telegramId, amount) {
        return this.post('/api/admin/user/stars', 
            { telegramId, amount },
            { headers: { 'admin-token': adminToken } }
        );
    }
}

// Создаем единственный экземпляр API клиента
export const api = new APIClient();

// Для backward compatibility (если где-то используется window.api)
if (typeof window !== 'undefined') {
    window.api = api;
}

console.log('✅ API Client инициализирован');
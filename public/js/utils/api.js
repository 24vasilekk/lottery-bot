// api.js - HTTP API :;85=B 4;O 2708<>459AB28O A backend
// @8B8G5A:8 206=K9 D09; 4;O @01>BK frontend

export class APIClient {
    constructor() {
        this.baseURL = window.location.origin;
        this.timeout = 30000;
        this.retryCount = 3;
        this.retryDelay = 1000;
    }

    async request(method, endpoint, data = null, options = {}) {
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
                console.log(`=á API Request: ${method} ${endpoint} (?>?KB:0 ${attempt})`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                
                const response = await fetch(url, {
                    ...config,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                console.log(` API Success: ${method} ${endpoint}`);
                return result;
                
            } catch (error) {
                lastError = error;
                console.error(`L API Error (?>?KB:0 ${attempt}):`, error.message);
                
                if (attempt < this.retryCount && this.shouldRetry(error)) {
                    console.log(`ó >2B>@ G5@57 ${this.retryDelay}ms...`);
                    await this.delay(this.retryDelay * attempt);
                    continue;
                }
                
                break;
            }
        }
        
        console.error(`=¥ API Failed after ${this.retryCount} attempts:`, lastError.message);
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

    // === !+ HTTP "+ ===

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

    // === API "+ /  / ===

    // >;L7>20B5;8
    async getUserData(telegramId) {
        return this.get(`/api/user/${telegramId}`);
    }

    async updateUserBalance(telegramId, newBalance) {
        return this.post('/api/user/balance', { telegramId, newBalance });
    }

    //  C;5B:0
    async spinWheel(telegramId, spinType = 'normal') {
        return this.post('/api/spin', { telegramId, spinType });
    }

    async getWheelSettings(wheelType = 'normal') {
        return this.get(`/api/wheel/settings/${wheelType}`);
    }

    // @87K
    async getUserPrizes(telegramId) {
        return this.get(`/api/user/${telegramId}/prizes`);
    }

    async claimPrize(telegramId, prizeId) {
        return this.post('/api/user/claim-prize', { telegramId, prizeId });
    }

    // "@0=70:F88
    async getUserTransactions(telegramId) {
        return this.get(`/api/user/${telegramId}/transactions`);
    }

    // 040=8O
    async getUserTasks(telegramId) {
        return this.get(`/api/user/${telegramId}/tasks`);
    }

    async completeTask(telegramId, taskId) {
        return this.post('/api/task/complete', { telegramId, taskId });
    }

    // >4?8A:8
    async checkSubscription(telegramId, channelId) {
        return this.post('/api/subscription/check', { telegramId, channelId });
    }

    //  5D5@0;K
    async getReferralInfo(telegramId) {
        return this.get(`/api/user/${telegramId}/referrals`);
    }

    async getLeaderboard(type = 'stars') {
        return this.get(`/api/leaderboard/${type}`);
    }

    // !B0B8AB8:0
    async getStats() {
        return this.get('/api/stats');
    }

    // @><>:>4K
    async usePromoCode(telegramId, promoCode) {
        return this.post('/api/promo/use', { telegramId, promoCode });
    }

    // !8=E@>=870F8O 10;0=A0
    async syncBalance(telegramId) {
        return this.get(`/api/user/${telegramId}/balance-sync`);
    }

    // === ! API "+ ===

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

// !>7405< 548=AB25==K9 M:75<?;O@ API :;85=B0
export const api = new APIClient();

// ;O backward compatibility (5A;8 345-B> 8A?>;L7C5BAO window.api)
if (typeof window !== 'undefined') {
    window.api = api;
}

console.log(' API Client 8=8F80;878@>20=');
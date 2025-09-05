// Модуль аутентификации для админ панели
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('admin-token');
        this.tokenExpiry = localStorage.getItem('admin-token-expiry');
    }

    // Проверить аутентификацию
    async checkAuth() {
        try {
            // Проверить наличие токена и его срок действия
            if (!this.token || !this.tokenExpiry) {
                return false;
            }

            const now = new Date().getTime();
            const expiry = parseInt(this.tokenExpiry);

            if (now > expiry) {
                this.clearAuth();
                return false;
            }

            // Проверить токен на сервере
            const response = await fetch('/api/admin/auth/check', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                this.clearAuth();
                return false;
            }

            const data = await response.json();
            this.currentUser = data.user;
            return true;

        } catch (error) {
            console.error('Ошибка проверки аутентификации:', error);
            this.clearAuth();
            return false;
        }
    }

    // Вход через Telegram
    async loginWithTelegram(telegramData) {
        try {
            const response = await fetch('/api/admin/auth/telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(telegramData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка аутентификации');
            }

            const data = await response.json();
            
            // Сохранить токен и данные пользователя
            this.token = data.token;
            this.currentUser = data.user;
            
            // Сохранить в localStorage с временем истечения (24 часа)
            const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000);
            localStorage.setItem('admin-token', this.token);
            localStorage.setItem('admin-token-expiry', expiryTime.toString());
            localStorage.setItem('admin-user', JSON.stringify(this.currentUser));

            return data;

        } catch (error) {
            console.error('Ошибка входа:', error);
            throw error;
        }
    }

    // Вход с логином и паролем (для разработки)
    async loginWithCredentials(username, password) {
        try {
            const response = await fetch('/api/admin/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Неверные учетные данные');
            }

            const data = await response.json();
            
            this.token = data.token;
            this.currentUser = data.user;
            
            const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000);
            localStorage.setItem('admin-token', this.token);
            localStorage.setItem('admin-token-expiry', expiryTime.toString());
            localStorage.setItem('admin-user', JSON.stringify(this.currentUser));

            return data;

        } catch (error) {
            console.error('Ошибка входа:', error);
            throw error;
        }
    }

    // Получить текущего пользователя
    async getCurrentUser() {
        if (this.currentUser) {
            return this.currentUser;
        }

        // Попробовать загрузить из localStorage
        const userData = localStorage.getItem('admin-user');
        if (userData) {
            try {
                this.currentUser = JSON.parse(userData);
                return this.currentUser;
            } catch (error) {
                console.error('Ошибка парсинга данных пользователя:', error);
            }
        }

        // Загрузить с сервера
        try {
            const response = await fetch('/api/admin/auth/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                localStorage.setItem('admin-user', JSON.stringify(this.currentUser));
                return this.currentUser;
            }
        } catch (error) {
            console.error('Ошибка загрузки данных пользователя:', error);
        }

        return null;
    }

    // Выход
    async logout() {
        try {
            // Уведомить сервер о выходе
            if (this.token) {
                await fetch('/api/admin/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Ошибка выхода на сервере:', error);
        } finally {
            this.clearAuth();
        }
    }

    // Очистить аутентификацию
    clearAuth() {
        this.token = null;
        this.currentUser = null;
        this.tokenExpiry = null;
        
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-token-expiry');
        localStorage.removeItem('admin-user');
    }

    // Получить токен для API запросов
    getToken() {
        return this.token;
    }

    // Получить заголовки авторизации
    getAuthHeaders() {
        return this.token ? {
            'Authorization': `Bearer ${this.token}`
        } : {};
    }

    // Проверить права администратора
    isAdmin() {
        return this.currentUser && this.currentUser.isAdmin === true;
    }

    // Обновить токен
    async refreshToken() {
        try {
            const response = await fetch('/api/admin/auth/refresh', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Не удалось обновить токен');
            }

            const data = await response.json();
            
            this.token = data.token;
            const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000);
            
            localStorage.setItem('admin-token', this.token);
            localStorage.setItem('admin-token-expiry', expiryTime.toString());

            return data;

        } catch (error) {
            console.error('Ошибка обновления токена:', error);
            this.clearAuth();
            throw error;
        }
    }

    // Проверить истечение токена и обновить при необходимости
    async ensureValidToken() {
        if (!this.token || !this.tokenExpiry) {
            throw new Error('Пользователь не авторизован');
        }

        const now = new Date().getTime();
        const expiry = parseInt(this.tokenExpiry);
        const timeUntilExpiry = expiry - now;

        // Если до истечения осталось меньше 30 минут, обновить токен
        if (timeUntilExpiry < (30 * 60 * 1000)) {
            await this.refreshToken();
        }
    }
}

// Telegram Login Widget интеграция
class TelegramLoginWidget {
    constructor(botUsername) {
        this.botUsername = botUsername;
        this.onAuth = null;
    }

    // Инициализировать виджет входа
    init(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Контейнер ${containerId} не найден`);
        }

        const defaultOptions = {
            size: 'large',
            auth_url: window.location.origin + '/api/admin/auth/telegram',
            request_access: true,
            radius: 8
        };

        const config = { ...defaultOptions, ...options };

        // Создать Telegram Login Button
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', this.botUsername);
        script.setAttribute('data-size', config.size);
        script.setAttribute('data-auth-url', config.auth_url);
        script.setAttribute('data-request-access', config.request_access);
        script.setAttribute('data-radius', config.radius);

        container.appendChild(script);
    }

    // Обработать данные от Telegram
    async handleTelegramAuth(telegramUser) {
        try {
            // Проверить подпись данных
            if (!this.verifyTelegramData(telegramUser)) {
                throw new Error('Недействительные данные Telegram');
            }

            const authManager = new AuthManager();
            const result = await authManager.loginWithTelegram(telegramUser);
            
            if (this.onAuth) {
                this.onAuth(result);
            }

            return result;

        } catch (error) {
            console.error('Ошибка аутентификации Telegram:', error);
            throw error;
        }
    }

    // Проверить подпись данных Telegram
    verifyTelegramData(data) {
        // Базовая проверка наличия обязательных полей
        if (!data.id || !data.first_name || !data.auth_date) {
            return false;
        }

        // Проверка времени (данные не должны быть старше 1 часа)
        const authDate = parseInt(data.auth_date);
        const now = Math.floor(Date.now() / 1000);
        const maxAge = 3600; // 1 час

        if (now - authDate > maxAge) {
            return false;
        }

        return true;
    }

    // Установить обработчик аутентификации
    onAuthenticated(callback) {
        this.onAuth = callback;
    }
}

// Глобальный объект для обработки Telegram Login
window.onTelegramAuth = function(user) {
    if (window.telegramLoginWidget) {
        window.telegramLoginWidget.handleTelegramAuth(user);
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, TelegramLoginWidget };
}
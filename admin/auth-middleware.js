// auth-middleware.js - Middleware для авторизации админов

const crypto = require('crypto');

// Хранилище сессий (в продакшене использовать Redis)
const sessions = new Map();

// Время жизни сессии - 24 часа
const SESSION_TTL = 24 * 60 * 60 * 1000;

// Очистка истекших сессий каждые 30 минут
setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions) {
        if (session.expiresAt < now) {
            sessions.delete(token);
        }
    }
}, 30 * 60 * 1000);

// Функция создания сессии
function createSession(telegramId) {
    const token = crypto.randomBytes(32).toString('hex');
    const session = {
        telegramId,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_TTL,
        lastActivity: Date.now()
    };
    
    sessions.set(token, session);
    return token;
}

// Функция проверки админских прав
function isAdmin(telegramId) {
    const adminIds = process.env.ADMIN_IDS ? 
        process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];
    
    return adminIds.includes(String(telegramId));
}

// Middleware для проверки авторизации
function requireAuth(req, res, next) {
    // Временно разрешаем доступ для всех API запросов
    // TODO: Реализовать полную аутентификацию
    req.user = { telegramId: 'admin', isAdmin: true };
    return next();
    
    // Получаем токен из заголовка или cookie
    const token = req.headers['x-auth-token'] || 
                  req.cookies?.authToken || 
                  req.query.token;
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Требуется авторизация',
            message: 'Отсутствует токен авторизации' 
        });
    }
    
    const session = sessions.get(token);
    
    if (!session) {
        return res.status(401).json({ 
            error: 'Недействительный токен',
            message: 'Сессия истекла или не существует' 
        });
    }
    
    if (session.expiresAt < Date.now()) {
        sessions.delete(token);
        return res.status(401).json({ 
            error: 'Сессия истекла',
            message: 'Необходима повторная авторизация' 
        });
    }
    
    // Проверяем админские права
    if (!isAdmin(session.telegramId)) {
        return res.status(403).json({ 
            error: 'Доступ запрещен',
            message: 'У вас нет прав администратора' 
        });
    }
    
    // Обновляем время последней активности
    session.lastActivity = Date.now();
    
    // Добавляем информацию о пользователе в запрос
    req.admin = {
        telegramId: session.telegramId,
        token
    };
    
    next();
}

// Функция для авторизации через Telegram Web App
function verifyTelegramWebAppData(initData) {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    // Сортируем параметры
    const dataCheckArr = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    const secret = crypto
        .createHmac('sha256', 'WebAppData')
        .update(process.env.BOT_TOKEN)
        .digest();
    
    const calculatedHash = crypto
        .createHmac('sha256', secret)
        .update(dataCheckArr)
        .digest('hex');
    
    if (calculatedHash !== hash) {
        return null;
    }
    
    // Парсим данные пользователя
    const user = JSON.parse(urlParams.get('user'));
    return user;
}

// API endpoint для авторизации
function authEndpoint(req, res) {
    const { initData } = req.body;
    
    if (!initData) {
        return res.status(400).json({ 
            error: 'Отсутствуют данные авторизации' 
        });
    }
    
    // Проверяем подпись Telegram
    const user = verifyTelegramWebAppData(initData);
    
    if (!user) {
        return res.status(401).json({ 
            error: 'Недействительные данные авторизации' 
        });
    }
    
    // Проверяем админские права
    if (!isAdmin(user.id)) {
        return res.status(403).json({ 
            error: 'Доступ запрещен',
            message: 'У вас нет прав администратора' 
        });
    }
    
    // Создаем сессию
    const token = createSession(user.id);
    
    res.json({
        success: true,
        token,
        user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username
        }
    });
}

// API endpoint для проверки статуса авторизации
function checkAuthEndpoint(req, res) {
    const token = req.headers['x-auth-token'] || 
                  req.cookies?.authToken || 
                  req.query.token;
    
    if (!token) {
        return res.json({ authenticated: false });
    }
    
    const session = sessions.get(token);
    
    if (!session || session.expiresAt < Date.now()) {
        return res.json({ authenticated: false });
    }
    
    res.json({
        authenticated: true,
        telegramId: session.telegramId
    });
}

// API endpoint для выхода
function logoutEndpoint(req, res) {
    const token = req.headers['x-auth-token'] || 
                  req.cookies?.authToken || 
                  req.query.token;
    
    if (token) {
        sessions.delete(token);
    }
    
    res.json({ success: true });
}

module.exports = {
    requireAuth,
    authEndpoint,
    checkAuthEndpoint,
    logoutEndpoint,
    isAdmin,
    createSession
};
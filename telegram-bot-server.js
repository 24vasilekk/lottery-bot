// telegram-bot-server.js - ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ для Railway

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const Database = require('./database');
const { validateRequest, validateTelegramId, validateSpinType, validateStarsAmount } = require('./utils/validation');

// Загружаем переменные окружения
if (fs.existsSync('.env')) {
    require('dotenv').config();
}

// Настройки
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN environment variable is required for Railway deployment');
    console.error('Set BOT_TOKEN in Railway dashboard environment variables');
    process.exit(1);
}
const DEBUG_MODE = process.env.DEBUG_MODE === 'true' || false;

// Определяем URL для Railway
let WEBAPP_URL = process.env.WEBAPP_URL;
if (!WEBAPP_URL) {
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        WEBAPP_URL = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    } else if (process.env.RAILWAY_PRIVATE_DOMAIN) {
        WEBAPP_URL = `https://${process.env.RAILWAY_PRIVATE_DOMAIN}`;
    } else {
        console.error('❌ WEBAPP_URL not configured for Railway');
        console.error('Railway should auto-provide RAILWAY_PUBLIC_DOMAIN');
        console.error('Manual setup: Set WEBAPP_URL=https://your-app-name.railway.app');
        process.exit(1);
    }
}

const BOT_USERNAME = process.env.BOT_USERNAME || 'kosmetichkalottery_bot';
const PORT = process.env.PORT || 3000;

console.log('🚀 ИНИЦИАЛИЗАЦИЯ KOSMETICHKA LOTTERY BOT');
console.log('==========================================');
console.log(`   🔧 Порт: ${PORT}`);
console.log(`   🌐 WebApp URL: ${WEBAPP_URL}`);
console.log(`   🤖 Бот токен: ${BOT_TOKEN ? 'установлен ✅' : 'НЕ УСТАНОВЛЕН ❌'}`);
console.log(`   👤 Имя бота: @${BOT_USERNAME}`);

// Предупреждения для продакшена
if (!process.env.BOT_TOKEN || !process.env.ADMIN_IDS) {
    console.log('\n⚠️  ВНИМАНИЕ: ТЕСТОВЫЙ РЕЖИМ');
    console.log('==========================================');
    if (!process.env.BOT_TOKEN) {
        console.log('   🔑 Используется хардкод BOT_TOKEN');
    }
    if (!process.env.ADMIN_IDS) {
        console.log('   👤 Используется тестовый ADMIN_ID');
    }
    console.log('   📝 Для продакшена установите переменные окружения!');
    console.log('==========================================\n');
}

// Создаем Express приложение
const app = express();

// Middleware
// Безопасная CORS конфигурация
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [
        'https://lottery-bot.railway.app',
        'https://*.railway.app',
        ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://127.0.0.1:3000'] : [])
    ];

app.use(cors({
    origin: function (origin, callback) {
        // Разрешаем запросы без origin (например, мобильные приложения)
        if (!origin) return callback(null, true);
        
        // Проверяем, разрешен ли origin
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (allowedOrigin.includes('*')) {
                const pattern = allowedOrigin.replace('*', '.*');
                return new RegExp(`^${pattern}$`).test(origin);
            }
            return allowedOrigin === origin;
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`🚫 CORS: Blocked origin ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data'],
    credentials: true,
    maxAge: 86400 // 24 часа кеширования preflight запросов
}));

// Content Security Policy и заголовки безопасности
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://telegram.org https://*.telegram.org; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
        "img-src 'self' data: https: blob:; " +
        "connect-src 'self' https://api.telegram.org wss: ws:; " +
        "media-src 'self' data: blob:; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'none';"
    );
    
    // Дополнительные заголовки безопасности
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
});

// Добавить эти endpoints в telegram-bot-server.js для исправления лидерборда

// ИСПРАВЛЕННЫЙ API для получения лидерборда по рефералам
app.get('/api/leaderboard/referrals', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        
        console.log(`📊 Запрос лидерборда по рефералам, лимит: ${limit}`);
        
        // Используем метод из database.js
        const leaderboard = await db.getGlobalReferralsLeaderboard(limit);
        
        console.log(`✅ Лидерборд по рефералам загружен: ${leaderboard.length} записей`);
        
        res.json(leaderboard);
        
    } catch (error) {
        console.error('❌ Ошибка получения лидерборда рефералов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ИСПРАВЛЕННЫЙ API для получения позиции пользователя по рефералам
app.get('/api/leaderboard/referrals/position/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`👤 Запрос позиции по рефералам для пользователя: ${userId}`);
        
        // Используем метод из database.js
        const rank = await db.getUserReferralRank(parseInt(userId));
        
        res.json({ 
            position: rank?.position,
            score: rank?.referrals_count || 0
        });
    } catch (error) {
        console.error('❌ Ошибка получения позиции по рефералам:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Дублируем для совместимости - endpoint с дефисом
app.get('/api/leaderboard-referrals', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        
        console.log(`📊 Запрос лидерборда по рефералам (дефис), лимит: ${limit}`);
        
        // Используем метод из database.js
        const leaderboard = await db.getGlobalReferralsLeaderboard(limit);
        
        console.log(`✅ Лидерборд по рефералам загружен: ${leaderboard.length} записей`);
        
        res.json({ 
            leaderboard: leaderboard,
            total: leaderboard.length
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения лидерборда рефералов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Дублируем для совместимости - endpoint для ранга
app.get('/api/user-referral-rank/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`👤 Запрос ранга по рефералам для пользователя: ${userId}`);
        
        // Используем метод из database.js
        const rank = await db.getUserReferralRank(parseInt(userId));
        
        res.json({ rank });
    } catch (error) {
        console.error('❌ Ошибка получения ранга по рефералам:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rate limiting конфигурация
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов с одного IP за 15 минут
    message: {
        error: 'Слишком много запросов с вашего IP, попробуйте позже',
        retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Кастомный генератор ключей для учета user_id из Telegram
    keyGenerator: (req) => {
        return req.headers['x-telegram-user-id'] || req.ip;
    }
});

// Также смягчите общий лимитер:
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 минута
    max: 50, // УВЕЛИЧЕНО с 30 до 50 API запросов в минуту
    message: {
        error: 'Превышен лимит API запросов, попробуйте через минуту',
        retryAfter: 60
    },
    // Добавляем более детальное логирование
    onLimitReached: (req, res, options) => {
        console.log(`⚠️ Rate limit достигнут для ${req.ip}, URL: ${req.url}, User: ${req.body?.userId || 'unknown'}`);
    }
});

const spinLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 минута
    max: 10, // УВЕЛИЧЕНО с 5 до 10 прокруток в минуту
    message: {
        error: 'Слишком частые прокрутки, подождите немного',
        retryAfter: 60
    },
    keyGenerator: (req) => {
        // Ограничиваем по user_id для прокруток
        return req.body?.userId?.toString() || req.ip;
    },
    // Добавляем пропуск для определенных случаев
    skip: (req) => {
        // Пропускаем ограничение для sync запросов
        return req.url.includes('/sync') || req.url.includes('/health');
    }
});

// Применяем ограничения
app.use(generalLimiter);
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Логирование запросов
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`📥 ${timestamp} - ${req.method} ${req.url} - ${req.ip}`);
    next();
});

// Настройка статических файлов
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath, {
    etag: false,
    maxAge: 0,
    setHeaders: (res, filePath) => {
        // Устанавливаем правильные MIME типы
        if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
        
        // Заголовки для WebApp
        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));

// Инициализация базы данных
const db = new Database();

// Импорт фоновых задач
const BackgroundTaskManager = require('./admin/background-tasks.js');

// Импорт автоматизации спонсоров  
const SponsorAutomation = require('./sponsor-automation.js');
const WinsChannelManager = require('./wins-channel.js');

// Промокоды
const PROMO_CODES = {
    'WELCOME2024': { crystals: 100, used: new Set() },
    'LUCKY777': { crystals: 77, used: new Set() },
    'FRIENDS': { crystals: 50, used: new Set() },
    'NEWBIE': { crystals: 200, used: new Set() },
    'DOLCEDEALS': { crystals: 150, used: new Set() }
};

// ID администраторов
const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : [];
if (ADMIN_IDS.length === 0) {
    console.error('❌ ADMIN_IDS environment variable is required for Railway deployment');
    console.error('Set ADMIN_IDS=your_telegram_id in Railway dashboard');
    process.exit(1);
}

// Создаем и настраиваем бота
let bot;
let botPolling = false;

try {
    bot = new TelegramBot(BOT_TOKEN, { 
        polling: false,  // Отключаем polling при инициализации
        request: {
            agentOptions: {
                keepAlive: true,
                family: 4
            }
        }
    });
    
    // Устанавливаем минимальный уровень логирования
    if (bot.options) {
        bot.options.request = {
            ...bot.options.request,
            // Отключаем подробное логирование соединений
            verbose: false
        };
    }
    
    console.log('🤖 Telegram Bot инициализирован успешно');
} catch (error) {
    console.error('❌ Ошибка инициализации бота:', error.message);
}

// Функция для безопасного запуска polling
async function startPolling() {
    if (botPolling || !bot) return;
    
    try {
        // Сначала останавливаем любые активные сессии
        await bot.stopPolling();
        
        // Ждем немного для очистки
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Запускаем polling
        await bot.startPolling();
        botPolling = true;
        console.log('✅ Polling запущен успешно');
        
    } catch (error) {
        console.error('❌ Ошибка запуска polling:', error.message);
        botPolling = false;
        
        // Повторная попытка через 5 секунд
        setTimeout(startPolling, 5000);
    }
}

// API для получения персональной реферальной ссылки
// API для получения персональной реферальной ссылки
app.get('/api/referral-link/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const userIdValidation = validateTelegramId(userId);
        if (!userIdValidation.isValid) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        
        const telegramId = userIdValidation.value;
        const user = await db.getUser(telegramId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const referralLink = `https://t.me/${BOT_USERNAME}?start=ref_${telegramId}`;
        const referralsCount = await db.getUserReferralsCount(telegramId);
        
        res.json({
            success: true,
            referralLink: referralLink,
            statistics: {
                totalReferrals: referralsCount,
                potentialEarnings: {
                    totalEarned: referralsCount * 120 // 100 + 20 за активацию
                }
            },
            shareText: 'Привет! Присоединяйся к Kosmetichka Lottery Bot - крути рулетку и выигрывай призы! 💄✨\n\n💫 Тот кто тебя пригласил получит 100 звезд!'
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения реферальной ссылки:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/debug/referrals', async (req, res) => {
    try {
        const debug = await db.debugReferrals();
        
        console.log('🔍 Отладка рефералов:');
        debug.forEach(user => {
            console.log(`👤 ${user.first_name} (${user.telegram_id}): поле=${user.referrals_field}, фактически=${user.actual_referrals_count}`);
        });
        
        res.json({
            users: debug,
            total: debug.length
        });
    } catch (error) {
        console.error('❌ Ошибка отладки рефералов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для обработки реферальной активации (дополнительно)
app.post('/api/activate-referral', async (req, res) => {
    try {
        const { userId, referrerId } = req.body;
        
        if (!userId || !referrerId) {
            return res.status(400).json({ 
                error: 'Требуются userId и referrerId' 
            });
        }
        
        // Проверяем, что пользователи существуют
        const user = await db.getUser(userId);
        const referrer = await db.getUser(referrerId);
        
        if (!user || !referrer) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Проверяем, не был ли уже добавлен этот реферал
        const existingReferral = await db.getReferral(referrerId, userId);
        if (existingReferral) {
            return res.json({ 
                success: false, 
                message: 'Реферал уже активирован' 
            });
        }
        
        // Добавляем реферал
        const added = await db.addReferral(referrerId, userId);
        
        if (added) {
            // Начисляем звезды рефереру
            await db.updateUserStars(referrerId, 100);
            
            // Отправляем уведомления
            try {
                await bot.sendMessage(referrerId, 
                    `🎉 Поздравляем! Ваш друг ${user.first_name} присоединился к боту!\n` +
                    `💫 Вы получили 100 звезд за приглашение!`
                );
                
                await bot.sendMessage(userId,
                    `👋 Добро пожаловать! Вы присоединились по приглашению от ${referrer.first_name}!\n` +
                    `🎁 Выполните задания, чтобы ваш друг получил дополнительные бонусы!`
                );
            } catch (notifyError) {
                console.warn('⚠️ Не удалось отправить уведомления:', notifyError.message);
            }
            
            res.json({
                success: true,
                message: 'Реферал успешно активирован',
                starsEarned: 100
            });
        } else {
            res.json({
                success: false,
                message: 'Не удалось активировать реферал'
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка активации реферала:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Добавить в telegram-bot-server.js

// Замените эти endpoints в telegram-bot-server.js

// API для получения глобального лидерборда по рефералам (ИСПРАВЛЕННЫЙ)
app.get('/api/leaderboard-referrals', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        
        console.log(`📊 Запрос глобального лидерборда рефералов, лимит: ${limit}`);
        
        // ИСПРАВЛЕННЫЙ запрос с правильными именами полей и синтаксисом SQLite
        const query = `
            SELECT 
                u.telegram_id,
                u.first_name,
                u.username,
                COUNT(r.referred_id) as referrals_count,
                u.total_stars_earned,
                u.join_date
            FROM users u
            LEFT JOIN referrals r ON u.telegram_id = r.referrer_id
            WHERE u.is_active = 1
            GROUP BY u.telegram_id, u.first_name, u.username, u.total_stars_earned, u.join_date
            HAVING referrals_count > 0
            ORDER BY referrals_count DESC, u.total_stars_earned DESC, u.join_date ASC
            LIMIT ?
        `;
        
        // Используем правильный синтаксис SQLite
        db.db.all(query, [limit], (error, results) => {
            if (error) {
                console.error('❌ Ошибка получения лидерборда рефералов:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
            
            console.log(`📊 Лидерборд рефералов загружен: ${results.length} записей`);
            
            res.json({ 
                leaderboard: results || [],
                total: results ? results.length : 0
            });
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения лидерборда рефералов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Обновленный API endpoint для получения ранга пользователя (ИСПРАВЛЕННЫЙ)
app.get('/api/user-referral-rank/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`👤 Запрос ранга по рефералам для пользователя: ${userId}`);
        
        // Используем исправленный метод из database.js
        const rank = await db.getUserReferralRank(parseInt(userId));
        
        res.json({ rank });
    } catch (error) {
        console.error('❌ Ошибка получения ранга по рефералам:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// === МАРШРУТЫ ===

// Главная страница
app.get('/', (req, res) => {
    console.log('🏠 Запрос главной страницы');
    
    const indexPath = path.join(publicPath, 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // Если файла нет, создаем базовую страницу
        const htmlContent = createBasicHTML();
        res.send(htmlContent);
    }
});

// Health check
app.get('/health', (req, res) => {
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        users: 'database',
        webapp_url: WEBAPP_URL,
        bot_status: bot ? 'connected' : 'disconnected',
        memory: process.memoryUsage(),
        env: process.env.NODE_ENV || 'development'
    };
    
    console.log('💊 Health check запрошен');
    res.json(health);
});

// Debug информация
app.get('/debug', (req, res) => {
    const debugInfo = {
        timestamp: new Date().toISOString(),
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            PORT: PORT,
            WEBAPP_URL: WEBAPP_URL,
            RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
            RAILWAY_PRIVATE_DOMAIN: process.env.RAILWAY_PRIVATE_DOMAIN
        },
        paths: {
            __dirname: __dirname,
            publicPath: publicPath,
            indexExists: fs.existsSync(path.join(publicPath, 'index.html'))
        },
        bot: {
            connected: !!bot,
            username: BOT_USERNAME
        },
        users: 'database',
        uptime: process.uptime()
    };
    
    res.json(debugInfo);
});

// API для взаимодействия с WebApp
// API для взаимодействия с WebApp - ОТКЛЮЧАЕМ ЛИМИТЕР ДЛЯ ДИАГНОСТИКИ
app.post('/api/telegram-webhook', async (req, res) => {  // Убрали spinLimiter
    try {
        const { action, data, user } = req.body;
        
        console.log(`📡 WebApp API: ${action} от пользователя ${user?.id}`);
        console.log('📋 Полученные данные:', JSON.stringify({ action, data, user }, null, 2));
        
        // ДОПОЛНИТЕЛЬНАЯ ОТЛАДКА
        console.log('🔍 === ДЕТАЛЬНАЯ ОТЛАДКА ЗАПРОСА ===');
        console.log('Request body keys:', Object.keys(req.body));
        console.log('Action type:', typeof action, action);
        console.log('Data type:', typeof data);
        console.log('User type:', typeof user);
        if (user) {
            console.log('User.id type:', typeof user.id, user.id);
        }
        if (action === 'wheel_spin' && data) {
            console.log('Spin data keys:', Object.keys(data));
            console.log('spinType:', data.spinType, typeof data.spinType);
            console.log('prize:', data.prize);
            if (data.prize) {
                console.log('Prize keys:', Object.keys(data.prize));
                console.log('Prize.id:', data.prize.id, typeof data.prize.id);
                console.log('Prize.name:', data.prize.name, typeof data.prize.name);
                console.log('Prize.type:', data.prize.type, typeof data.prize.type);
            }
        }
        console.log('=== КОНЕЦ ДЕТАЛЬНОЙ ОТЛАДКИ ===');
        
        // Валидация базовых данных запроса
        const requestValidation = validateRequest(req.body, {
            action: { type: 'string', required: true, minLength: 1, maxLength: 50 },
            user: { type: 'object', required: true },
            data: { type: 'object', required: false }
        });
        
        if (!requestValidation.isValid) {
            console.error('❌ Валидация запроса не прошла:', requestValidation.errors);
            return res.status(400).json({ 
                error: 'Invalid request data',
                details: requestValidation.errors
            });
        }
        
        // Валидация пользователя
        const userIdValidation = validateTelegramId(user.id);
        if (!userIdValidation.isValid) {
            console.error('❌ Неверный ID пользователя:', userIdValidation.error);
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        
        const userId = userIdValidation.value;
        
        switch (action) {
            case 'wheel_spin':
                try {
                    console.log('🎰 Начинаем валидацию wheel_spin...');
                    
                    // УПРОЩЕННАЯ ВАЛИДАЦИЯ для диагностики
                    if (!data.spinType) {
                        console.log('⚠️ spinType отсутствует, устанавливаем normal');
                        data.spinType = 'normal';
                    }
                    
                    if (!data.prize) {
                        console.error('❌ prize отсутствует в данных');
                        return res.status(400).json({ 
                            error: 'Prize data missing',
                            details: 'data.prize is required'
                        });
                    }
                    
                    // Валидация данных spin - УПРОЩЕННАЯ
                    const spinValidation = validateRequest(data, {
                        spinType: { type: 'spin_type', required: true },
                        prize: { type: 'prize', required: true }
                    });
                    
                    if (!spinValidation.isValid) {
                        console.error('❌ Валидация данных spin не прошла:', spinValidation.errors);
                        return res.status(400).json({ 
                            error: 'Invalid spin data',
                            details: spinValidation.errors
                        });
                    }
                    
                    console.log('✅ Валидация прошла успешно, вызываем handleWheelSpin...');
                    
                    console.log('🎰 WHEEL_SPIN - Входящие данные:', {
                        userId: userId,
                        data: spinValidation.data,
                        prize: spinValidation.data.prize,
                        spinType: spinValidation.data.spinType
                    });
                    
                    await handleWheelSpin(userId, spinValidation.data);
                    console.log('✅ wheel_spin обработан успешно');
                    return res.json({ success: true, message: 'Prize saved successfully' });
                } catch (wheelError) {
                    console.error('❌ Ошибка в handleWheelSpin:', wheelError);
                    console.error('Stack trace:', wheelError.stack);
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Failed to save prize to database',
                        details: wheelError.message
                    });
                }
            case 'task_completed':
                await handleTaskCompleted(userId, data);
                break;
            case 'sync_user':
                const userData = await syncUserData(userId, data.userData);
                return res.json({ userData });
            case 'subscribe_channel':
                await handleChannelSubscription(userId, data);
                break;
            default:
                console.log(`❓ Неизвестное действие: ${action}`);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка webhook:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message
        });
    }
});

// ВРЕМЕННЫЙ ENDPOINT для отладки без лимитеров
app.post('/api/debug/wheel-spin', async (req, res) => {
    console.log('🚨 === DEBUG ENDPOINT ВЫЗВАН ===');
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    
    try {
        const { userId, prize, spinType } = req.body;
        
        console.log('Параметры:', { userId, prize, spinType });
        
        // Минимальная валидация
        if (!userId || !prize) {
            return res.status(400).json({ 
                error: 'userId и prize обязательны',
                received: { userId: !!userId, prize: !!prize, spinType }
            });
        }
        
        // Пытаемся сохранить в БД
        const result = await handleWheelSpin(userId, { prize, spinType: spinType || 'normal' });
        
        res.json({ 
            success: true, 
            message: 'Отладочное сохранение успешно',
            result 
        });
        
    } catch (error) {
        console.error('❌ Ошибка в debug endpoint:', error);
        res.status(500).json({ 
            error: 'Debug endpoint error',
            details: error.message 
        });
    }
});

// API для проверки подписок на каналы
app.post('/api/check-subscriptions', async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Валидация userId
        const userIdValidation = validateTelegramId(userId);
        if (!userIdValidation.isValid) {
            return res.status(400).json({ 
                error: 'Invalid user ID',
                details: userIdValidation.error
            });
        }
        
        const subscriptions = await db.getUserSubscriptions(userIdValidation.value);
        
        res.json({ 
            subscriptions: {
                channel1: subscriptions.is_subscribed_channel1 || false,
                channel2: subscriptions.is_subscribed_channel2 || false,
                dolcedeals: subscriptions.is_subscribed_dolcedeals || false
            }
        });
    } catch (error) {
        console.error('❌ Ошибка проверки подписок:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для получения лидерборда
app.get('/api/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        // Обновляем лидерборд
        await db.updateLeaderboard();
        
        // Получаем топ игроков
        const leaderboard = await db.getLeaderboard(limit);
        
        res.json({ leaderboard });
    } catch (error) {
        console.error('❌ Ошибка получения лидерборда:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для получения лидерборда рефералов пользователя
app.get('/api/referrals-leaderboard/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        
        const referralsLeaderboard = await db.getReferralsLeaderboard(parseInt(userId), limit);
        
        res.json({ 
            leaderboard: referralsLeaderboard,
            total: referralsLeaderboard.length 
        });
    } catch (error) {
        console.error('❌ Ошибка получения лидерборда рефералов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для получения позиции пользователя в лидерборде
app.get('/api/user-rank/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const rank = await db.getUserRank(parseInt(userId));
        
        res.json({ rank });
    } catch (error) {
        console.error('❌ Ошибка получения ранга:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для получения данных пользователя с рефералами - УЛУЧШЕННЫЙ
app.get('/api/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`👤 Запрос данных пользователя: ${userId}`);
        
        const user = await db.getUser(parseInt(userId));
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Получаем количество рефералов
        let referralsCount = 0;
        try {
            referralsCount = await new Promise((resolve, reject) => {
                const query = `
                    SELECT COUNT(*) as count 
                    FROM referrals 
                    WHERE referrer_id = ?
                `;
                
                if (db.pool) {
                    db.pool.query(query, [parseInt(userId)], (error, results) => {
                        if (error) reject(error);
                        else resolve(results[0]?.count || 0);
                    });
                } else if (db.db) {
                    db.db.get(query, [parseInt(userId)], (error, result) => {
                        if (error) reject(error);
                        else resolve(result?.count || 0);
                    });
                } else {
                    resolve(0);
                }
            });
        } catch (error) {
            console.warn('⚠️ Ошибка получения количества рефералов:', error);
            referralsCount = 0;
        }
        
        // Формируем ответ с полной статистикой
        const userData = {
            id: user.telegram_id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            stars: user.stars || 0,
            total_stars_earned: user.total_stars_earned || 0,
            join_date: user.join_date,
            stats: {
                stars: user.stars || 0,
                totalStars: user.total_stars_earned || 0,
                totalStarsEarned: user.total_stars_earned || 0,
                totalSpins: user.total_spins || 0,
                prizesWon: user.prizes_won || 0,
                referrals: referralsCount,
                referralsCount: referralsCount,
                starsFromReferrals: referralsCount * 100, // 100 звезд за каждого реферала
                level: Math.floor((user.total_stars_earned || 0) / 1000) + 1
            },
            referrals: referralsCount,
            achievements: user.achievements ? JSON.parse(user.achievements) : [],
            settings: user.settings ? JSON.parse(user.settings) : {},
            is_active: user.is_active
        };
        
        console.log(`✅ Данные пользователя ${userId} загружены:`, {
            stars: userData.stars,
            referrals: userData.stats.referrals,
            totalEarned: userData.total_stars_earned
        });
        
        res.json(userData);
        
    } catch (error) {
        console.error(`❌ Ошибка получения данных пользователя ${req.params.userId}:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для отладки - получение всех данных пользователя
app.get('/api/debug-user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`🔍 Отладка данных пользователя ${userId}`);
        
        const user = await db.getUser(parseInt(userId));
        const prizes = await db.getUserPrizes(parseInt(userId));
        const completedTasks = await db.getUserCompletedTasks(parseInt(userId));
        
        const debugData = {
            user: user,
            prizesCount: prizes ? prizes.length : 0,
            prizes: prizes,
            completedTasks: completedTasks,
            timestamp: new Date().toISOString()
        };
        
        console.log('🔍 Данные пользователя из БД:', JSON.stringify(debugData, null, 2));
        
        res.json(debugData);
    } catch (error) {
        console.error('❌ Ошибка отладки пользователя:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===================== API ENDPOINTS ДЛЯ СИСТЕМЫ ЗАДАНИЙ =====================

// API для получения активных каналов для подписки
app.get('/api/channels/active', async (req, res) => {
    try {
        const channels = await db.getActiveChannels();
        res.json({ channels });
    } catch (error) {
        console.error('❌ Ошибка получения каналов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для проверки подписки на канал
app.post('/api/subscription/check', async (req, res) => {
    try {
        const { userId, channelUsername } = req.body;
        
        if (!userId || !channelUsername) {
            return res.status(400).json({ 
                error: 'Требуются userId и channelUsername' 
            });
        }

        console.log(`🔍 Проверка подписки пользователя ${userId} на канал ${channelUsername}`);
        
        const isSubscribed = await checkUserChannelSubscription(userId, channelUsername);
        
        res.json({ 
            isSubscribed,
            userId,
            channel: channelUsername,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Ошибка проверки подписки:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для выполнения задания подписки на канал
app.post('/api/subscription/complete', async (req, res) => {
    try {
        const { userId, channelId, userData } = req.body;
        
        if (!userId || !channelId) {
            return res.status(400).json({ 
                error: 'Требуются userId и channelId' 
            });
        }

        console.log(`🎯 Выполнение задания подписки: пользователь ${userId}, канал ${channelId}`);
        
        // Используем нашу функцию обработки подписки
        const result = await handleChannelSubscriptionTask(userId, channelId, userData);
        
        if (result.success) {
            res.json({
                success: true,
                reward: result.reward,
                message: result.message,
                userStats: result.userStats
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error,
                banUntil: result.banUntil
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка выполнения задания:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для проверки всех подписок пользователя
app.post('/api/subscriptions/check-all', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                error: 'Требуется userId' 
            });
        }

        console.log(`🔍 Проверка всех подписок пользователя ${userId}`);
        
        const violations = await checkAllUserSubscriptions(userId);
        
        if (violations.length > 0) {
            // Обрабатываем нарушения
            const user = await db.getUser(userId);
            const result = await handleSubscriptionViolations(user, violations);
            
            res.json({
                hasViolations: true,
                violations,
                banApplied: result.banApplied,
                banUntil: result.banUntil,
                message: result.message
            });
        } else {
            res.json({
                hasViolations: false,
                message: 'Все подписки активны'
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка проверки подписок:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для получения доступных заданий для пользователя
app.get('/api/tasks/available/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`📋 Получение доступных заданий для пользователя ${userId}`);
        
        // Проверяем, не заблокирован ли пользователь
        const user = await db.getUser(parseInt(userId));
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        if (user.tasks_ban_until && new Date(user.tasks_ban_until) > new Date()) {
            return res.json({
                blocked: true,
                banUntil: user.tasks_ban_until,
                message: 'Вы временно заблокированы за отписку от каналов'
            });
        }
        
        // Получаем активные каналы
        const channels = await db.getActiveChannels();
        
        // Получаем ежедневные задания
        const dailyTasks = await db.getDailyTasksForUser(parseInt(userId));
        
        // Получаем горячие предложения
        const hotOffers = await db.getActiveHotOffers();
        
        res.json({
            blocked: false,
            channels: channels || [],
            dailyTasks: dailyTasks || [],
            hotOffers: hotOffers || []
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения заданий:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для получения статистики реферальной системы
app.get('/api/referral/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const stats = await db.getReferralStats(parseInt(userId));
        
        res.json({ stats });
    } catch (error) {
        console.error('❌ Ошибка получения статистики рефералов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для активации реферала
app.post('/api/referral/activate', async (req, res) => {
    try {
        const { userId, referrerId } = req.body;
        
        if (!userId || !referrerId) {
            return res.status(400).json({ 
                error: 'Требуются userId и referrerId' 
            });
        }
        
        const result = await db.activateReferral(parseInt(userId), parseInt(referrerId));
        
        res.json(result);
    } catch (error) {
        console.error('❌ Ошибка активации реферала:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===================== ADMIN API ENDPOINTS =====================

// Статическая раздача админки
app.use('/admin', express.static('admin'));

// Middleware для проверки прав админа (упрощенная версия)
function requireAdmin(req, res, next) {
    // В продакшене здесь должна быть полноценная аутентификация
    const adminToken = req.headers['admin-token'] || req.query.token;
    
    // Временно пропускаем всех (в продакшене нужна аутентификация)
    // if (adminToken !== process.env.ADMIN_TOKEN) {
    //     return res.status(403).json({ error: 'Доступ запрещен' });
    // }
    
    next();
}

// Получение общей статистики
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        console.log('📊 Админ: запрос общей статистики');

        // Общая статистика пользователей
        const totalUsers = await new Promise((resolve, reject) => {
            db.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Активные пользователи за 24 часа
        const activeUsers = await new Promise((resolve, reject) => {
            db.db.get(
                'SELECT COUNT(*) as count FROM users WHERE last_activity > datetime("now", "-1 day")',
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });

        // Статистика каналов
        const totalChannels = await new Promise((resolve, reject) => {
            db.db.get('SELECT COUNT(*) as count FROM partner_channels WHERE is_active = 1', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        const hotChannels = await new Promise((resolve, reject) => {
            db.db.get(
                'SELECT COUNT(*) as count FROM partner_channels WHERE is_active = 1 AND is_hot_offer = 1',
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });

        // Статистика подписок
        const totalSubscriptions = await new Promise((resolve, reject) => {
            db.db.get('SELECT COUNT(*) as count FROM user_channel_subscriptions', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        const todaySubscriptions = await new Promise((resolve, reject) => {
            db.db.get(
                'SELECT COUNT(*) as count FROM user_channel_subscriptions WHERE created_date > date("now")',
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });

        // Призы ожидающие выдачи
        const pendingPrizes = await new Promise((resolve, reject) => {
            db.db.get('SELECT COUNT(*) as count FROM prizes WHERE is_given = 0', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        const pendingCertificates = await new Promise((resolve, reject) => {
            db.db.get(
                'SELECT COUNT(*) as count FROM prizes WHERE is_given = 0 AND type LIKE "%certificate%"',
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });

        const stats = {
            totalUsers,
            activeUsers,
            totalChannels,
            hotChannels,
            totalSubscriptions,
            todaySubscriptions,
            pendingPrizes,
            pendingCertificates
        };

        res.json(stats);
    } catch (error) {
        console.error('❌ Ошибка получения статистики админом:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение списка каналов
app.get('/api/admin/channels', requireAdmin, async (req, res) => {
    try {
        console.log('📺 Админ: запрос списка каналов');

        const channels = await new Promise((resolve, reject) => {
            db.db.all(`
                SELECT pc.*,
                       COUNT(ucs.id) as current_subscribers
                FROM partner_channels pc
                LEFT JOIN user_channel_subscriptions ucs ON pc.id = ucs.channel_id AND ucs.is_active = 1
                GROUP BY pc.id
                ORDER BY pc.created_date DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        res.json(channels);
    } catch (error) {
        console.error('❌ Ошибка получения каналов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Добавление нового канала
app.post('/api/admin/channels', requireAdmin, async (req, res) => {
    try {
        const {
            channel_username,
            channel_name,
            reward_stars,
            placement_type,
            placement_duration,
            subscribers_target,
            is_hot_offer
        } = req.body;

        console.log(`📺 Админ: добавление канала @${channel_username}`);

        // Вычисляем end_date
        let endDate = null;
        if (placement_type === 'time') {
            endDate = new Date(Date.now() + (placement_duration * 60 * 60 * 1000)).toISOString();
        }

        const channelId = await new Promise((resolve, reject) => {
            db.db.run(`
                INSERT INTO partner_channels (
                    channel_username, channel_name, reward_stars, placement_type,
                    placement_duration, target_subscribers, is_hot_offer, end_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                channel_username, channel_name, reward_stars, placement_type,
                placement_duration, subscribers_target, is_hot_offer ? 1 : 0, endDate
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });

        res.json({ success: true, id: channelId });
    } catch (error) {
        console.error('❌ Ошибка добавления канала:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Переключение горячего предложения
app.patch('/api/admin/channels/:id/hot-offer', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_hot_offer } = req.body;

        console.log(`🔥 Админ: изменение горячего предложения канала ${id} на ${is_hot_offer}`);

        await new Promise((resolve, reject) => {
            db.db.run(
                'UPDATE partner_channels SET is_hot_offer = ? WHERE id = ?',
                [is_hot_offer ? 1 : 0, id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка изменения горячего предложения:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Деактивация канала
app.delete('/api/admin/channels/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`❌ Админ: деактивация канала ${id}`);

        await new Promise((resolve, reject) => {
            db.db.run(
                'UPDATE partner_channels SET is_active = 0 WHERE id = ?',
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка деактивации канала:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для автоматизации спонсоров
app.get('/api/admin/automation/stats', requireAdmin, async (req, res) => {
    try {
        const stats = await db.get(`
            SELECT 
                COUNT(*) as totalChannels,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as activeChannels,
                COUNT(CASE WHEN is_active = 0 AND deactivation_reason = 'time_expired' THEN 1 END) as expiredChannels,
                COUNT(CASE WHEN is_active = 0 AND deactivation_reason = 'target_reached' THEN 1 END) as completedChannels,
                COUNT(CASE WHEN auto_renewal = 1 THEN 1 END) as autoRenewalChannels,
                AVG(priority_score) as avgPriorityScore
            FROM partner_channels
        `);

        const recentNotifications = await db.all(`
            SELECT an.*, pc.channel_username 
            FROM admin_notifications an
            LEFT JOIN partner_channels pc ON an.channel_id = pc.id
            ORDER BY an.created_at DESC 
            LIMIT 10
        `);

        res.json({
            stats: stats || {},
            recentNotifications: recentNotifications || []
        });
    } catch (error) {
        console.error('❌ Ошибка получения статистики автоматизации:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение каналов для автоматизации  
app.get('/api/admin/automation/channels', requireAdmin, async (req, res) => {
    try {
        const channels = await db.all(`
            SELECT * FROM partner_channels 
            ORDER BY priority_score DESC, created_at DESC
        `);

        res.json(channels || []);
    } catch (error) {
        console.error('❌ Ошибка получения каналов автоматизации:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение уведомлений автоматизации
app.get('/api/admin/automation/notifications', requireAdmin, async (req, res) => {
    try {
        const notifications = await db.all(`
            SELECT an.*, pc.channel_username 
            FROM admin_notifications an
            LEFT JOIN partner_channels pc ON an.channel_id = pc.id
            ORDER BY an.created_at DESC 
            LIMIT 20
        `);

        // Форматируем сообщения для отображения
        const formattedNotifications = notifications.map(notification => ({
            ...notification,
            message: notification.message || `Канал @${notification.channel_username}: ${notification.notification_type}`
        }));

        res.json(formattedNotifications || []);
    } catch (error) {
        console.error('❌ Ошибка получения уведомлений автоматизации:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Переключение автопродления канала
app.patch('/api/admin/automation/channels/:id/auto-renewal', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { auto_renewal } = req.body;

        await db.run(`
            UPDATE partner_channels 
            SET auto_renewal = ? 
            WHERE id = ?
        `, [auto_renewal ? 1 : 0, id]);

        console.log(`🔄 Админ: автопродление канала ${id} ${auto_renewal ? 'включено' : 'отключено'}`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка изменения автопродления:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/automation/force-check', requireAdmin, async (req, res) => {
    try {
        console.log('🔄 Админ: принудительная проверка автоматизации');
        
        if (sponsorAutomation) {
            // Запускаем принудительную проверку автоматизации
            await sponsorAutomation.performAutomatedTasks();
            console.log('✅ Принудительная проверка автоматизации выполнена');
        } else {
            console.log('⚠️ Система автоматизации не инициализирована');
        }
        
        res.json({ 
            success: true, 
            message: 'Принудительная проверка автоматизации запущена' 
        });
    } catch (error) {
        console.error('❌ Ошибка принудительной проверки:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для канала выигрышей
app.get('/api/admin/wins-channel/stats', requireAdmin, async (req, res) => {
    try {
        if (!winsChannelManager) {
            return res.status(503).json({ error: 'Система постинга выигрышей не инициализирована' });
        }

        const stats = await winsChannelManager.getChannelStats();
        res.json({ stats });
    } catch (error) {
        console.error('❌ Ошибка получения статистики канала выигрышей:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/admin/wins-channel/recent', requireAdmin, async (req, res) => {
    try {
        if (!winsChannelManager) {
            return res.status(503).json({ error: 'Система постинга выигрышей не инициализирована' });
        }

        const recentWins = await winsChannelManager.getRecentPostedWins();
        res.json(recentWins);
    } catch (error) {
        console.error('❌ Ошибка получения недавних постов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/wins-channel/post/:prizeId', requireAdmin, async (req, res) => {
    try {
        const { prizeId } = req.params;
        
        if (!winsChannelManager) {
            return res.status(503).json({ error: 'Система постинга выигрышей не инициализирована' });
        }

        await winsChannelManager.manualPostWin(prizeId);
        console.log(`✅ Админ: выигрыш ${prizeId} опубликован вручную`);
        
        res.json({ success: true, message: 'Выигрыш успешно опубликован' });
    } catch (error) {
        console.error('❌ Ошибка ручного постинга выигрыша:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

app.post('/api/admin/wins-channel/test', requireAdmin, async (req, res) => {
    try {
        if (!winsChannelManager) {
            return res.status(503).json({ error: 'Система постинга выигрышей не инициализирована' });
        }

        await winsChannelManager.testChannelConnection();
        console.log('✅ Админ: тестовое сообщение отправлено в канал выигрышей');
        
        res.json({ success: true, message: 'Тестовое сообщение отправлено' });
    } catch (error) {
        console.error('❌ Ошибка тестирования канала выигрышей:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Получение призов ожидающих выдачи
app.get('/api/admin/pending-prizes', requireAdmin, async (req, res) => {
    try {
        console.log('🎁 Админ: запрос призов ожидающих выдачи');

        const prizes = await new Promise((resolve, reject) => {
            db.db.all(`
                SELECT p.*, u.first_name as user_name, u.username, u.telegram_id as user_telegram_id
                FROM prizes p
                JOIN users u ON p.user_id = u.id
                WHERE p.is_given = 0
                ORDER BY p.created_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        res.json(prizes);
    } catch (error) {
        console.error('❌ Ошибка получения призов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Отметка приза как выданного
app.patch('/api/admin/prizes/:id/given', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`✅ Админ: отметка приза ${id} как выданного`);

        await new Promise((resolve, reject) => {
            db.db.run(
                'UPDATE prizes SET is_given = 1, given_date = CURRENT_TIMESTAMP WHERE id = ?',
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка отметки приза:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение списка пользователей
app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        console.log('👥 Админ: запрос списка пользователей');

        const users = await new Promise((resolve, reject) => {
            db.db.all(`
                SELECT u.*,
                       COUNT(DISTINCT ucs.id) as subscription_count,
                       COUNT(DISTINCT p.id) as prizes_won
                FROM users u
                LEFT JOIN user_channel_subscriptions ucs ON u.id = ucs.user_id
                LEFT JOIN prizes p ON u.id = p.user_id
                GROUP BY u.id
                ORDER BY u.created_date DESC
                LIMIT 100
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        res.json(users);
    } catch (error) {
        console.error('❌ Ошибка получения пользователей:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение аналитики
app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
    try {
        console.log('📈 Админ: запрос аналитики');

        // Подписки по дням за последние 7 дней
        const subscriptionsData = await new Promise((resolve, reject) => {
            db.db.all(`
                SELECT DATE(created_date) as date, COUNT(*) as count
                FROM user_channel_subscriptions
                WHERE created_date > datetime('now', '-7 days')
                GROUP BY DATE(created_date)
                ORDER BY date
            `, (err, rows) => {
                if (err) reject(err);
                else resolve({
                    labels: rows.map(r => r.date),
                    values: rows.map(r => r.count)
                });
            });
        });

        // Распределение призов
        const prizesData = await new Promise((resolve, reject) => {
            db.db.all(`
                SELECT type, COUNT(*) as count
                FROM prizes
                GROUP BY type
            `, (err, rows) => {
                if (err) reject(err);
                else resolve({
                    labels: rows.map(r => r.type),
                    values: rows.map(r => r.count)
                });
            });
        });

        res.json({
            subscriptionsData,
            prizesData
        });
    } catch (error) {
        console.error('❌ Ошибка получения аналитики:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint для управления звездами пользователей
app.post('/api/admin/users/stars', requireAdmin, async (req, res) => {
    const { telegramId, operation, amount, reason } = req.body;
    
    // Валидация входных данных
    const validation = validateRequest(req.body, {
        telegramId: { type: 'telegram_id', required: true },
        operation: { type: 'stars_operation', required: true },
        amount: { type: 'stars_amount', required: true },
        reason: { type: 'string', required: true, minLength: 1, maxLength: 500 }
    });
    
    if (!validation.isValid) {
        return res.status(400).json({ 
            success: false, 
            error: 'Неверные данные запроса',
            details: validation.errors
        });
    }

    try {
        // Используем валидированные данные
        const validatedData = validation.data;
        
        // Получаем текущего пользователя
        const user = await db.getUser(validatedData.telegramId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        const currentStars = user.stars || 0;
        let newStars = 0;
        let starsChange = 0;

        switch (validatedData.operation) {
            case 'add':
                starsChange = validatedData.amount;
                newStars = currentStars + validatedData.amount;
                break;
            case 'subtract':
                starsChange = -validatedData.amount;
                newStars = Math.max(0, currentStars - validatedData.amount);
                break;
            case 'set':
                starsChange = validatedData.amount - currentStars;
                newStars = validatedData.amount;
                break;
            default:
                return res.status(400).json({ 
                    success: false, 
                    error: 'Неверная операция' 
                });
        }

        // Обновляем баланс звезд
        await db.updateUserStars(validatedData.telegramId, starsChange);

        // Добавляем запись в историю транзакций
        await db.addStarsTransaction({
            user_id: validatedData.telegramId,
            amount: starsChange,
            transaction_type: 'admin_adjustment',
            description: `Администратор: ${validatedData.reason}`
        });

        console.log(`✅ Админ обновил звезды пользователя ${validatedData.telegramId}: ${currentStars} -> ${newStars} (${validatedData.operation} ${validatedData.amount})`);

        res.json({ 
            success: true, 
            oldBalance: currentStars,
            newBalance: newStars,
            change: starsChange
        });
    } catch (error) {
        console.error('❌ Ошибка обновления звезд:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при обновлении баланса' 
        });
    }
});

// API для ручных подкруток пользователям
app.post('/api/admin/manual-spin', requireAdmin, async (req, res) => {
    const { userId, spinType, reason } = req.body;
    
    // Валидация входных данных
    const validation = validateRequest(req.body, {
        userId: { type: 'telegram_id', required: true },
        spinType: { type: 'spin_type', required: true },
        reason: { type: 'string', required: true, minLength: 1, maxLength: 500 }
    });
    
    if (!validation.isValid) {
        return res.status(400).json({ 
            success: false, 
            error: 'Неверные данные запроса',
            details: validation.errors
        });
    }

    try {
        // Используем валидированные данные
        const validatedData = validation.data;
        
        // Проверяем существование пользователя
        const user = await db.getUser(validatedData.userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        console.log(`🎲 Админ выдает прокрутку ${validatedData.spinType} пользователю ${validatedData.userId}: ${validatedData.reason}`);

        // Добавляем запись о ручной подкрутке в таблицу логов
        await new Promise((resolve, reject) => {
            db.db.run(`
                INSERT INTO admin_actions (
                    action_type, 
                    target_user_id, 
                    details, 
                    admin_id, 
                    created_at
                ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, ['manual_spin', validatedData.userId, JSON.stringify({spinType: validatedData.spinType, reason: validatedData.reason}), 'admin'], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // В зависимости от типа подкрутки выполняем соответствующие действия
        switch (spinType) {
            case 'normal':
                // Добавляем 20 звезд для обычной прокрутки
                await db.updateUserStars(userId, 20);
                break;
                
            case 'mega':
                // Добавляем 5000 звезд для мега прокрутки
                await db.updateUserStars(userId, 5000);
                break;
                
            case 'friend':
                // Увеличиваем количество доступных прокруток за друга
                await new Promise((resolve, reject) => {
                    db.db.run(`
                        UPDATE users 
                        SET available_friend_spins = available_friend_spins + 1 
                        WHERE telegram_id = ?
                    `, [userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                break;
        }

        // Отправляем уведомление пользователю через бота
        if (bot && userId) {
            try {
                let message = '';
                switch (spinType) {
                    case 'normal':
                        message = `🎁 Вам выдана обычная прокрутка рулетки!\n💰 Получено: 20 звезд\n📝 Причина: ${reason}`;
                        break;
                    case 'mega':
                        message = `👑 Вам выдана МЕГА прокрутка!\n💎 Получено: 5000 звезд\n📝 Причина: ${reason}`;
                        break;
                    case 'friend':
                        message = `❤️ Вам выдана прокрутка за друга!\n🎯 Доступна бесплатная прокрутка\n📝 Причина: ${reason}`;
                        break;
                }
                
                await bot.sendMessage(userId, message);
            } catch (botError) {
                console.warn('⚠️ Не удалось отправить уведомление пользователю:', botError.message);
            }
        }

        res.json({
            success: true,
            message: 'Прокрутка успешно выдана пользователю'
        });
    } catch (error) {
        console.error('❌ Ошибка выдачи ручной подкрутки:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// API для получения недавних ручных подкруток
app.get('/api/admin/manual-spins/recent', requireAdmin, async (req, res) => {
    try {
        const spins = await new Promise((resolve, reject) => {
            db.db.all(`
                SELECT aa.*, u.first_name, u.username
                FROM admin_actions aa
                LEFT JOIN users u ON aa.target_user_id = u.telegram_id
                WHERE aa.action_type = 'manual_spin'
                ORDER BY aa.created_at DESC
                LIMIT 20
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        // Парсим детали для удобства отображения
        const formattedSpins = spins.map(spin => {
            const details = JSON.parse(spin.details || '{}');
            return {
                ...spin,
                spin_type: details.spinType,
                reason: details.reason,
                user_id: spin.target_user_id
            };
        });

        res.json({ spins: formattedSpins });
    } catch (error) {
        console.error('❌ Ошибка получения ручных подкруток:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoints для настроек рулетки
app.get('/api/admin/wheel-settings/mega', requireAdmin, async (req, res) => {
    try {
        // Получаем настройки мега рулетки из файла конфигурации или БД
        const settings = await db.getWheelSettings('mega');
        res.json(settings || { prizes: [] });
    } catch (error) {
        console.error('❌ Ошибка получения настроек мега рулетки:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/wheel-settings/mega', requireAdmin, async (req, res) => {
    const { prizes } = req.body;
    
    if (!prizes || !Array.isArray(prizes)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Неверный формат данных' 
        });
    }

    // Проверяем что сумма вероятностей равна 100%
    const totalChance = prizes.reduce((sum, prize) => sum + (prize.chance || 0), 0);
    if (Math.abs(totalChance - 100) > 0.1) {
        return res.status(400).json({ 
            success: false, 
            error: 'Сумма вероятностей должна равняться 100%' 
        });
    }

    try {
        await db.saveWheelSettings('mega', { prizes });
        console.log('✅ Настройки мега рулетки обновлены');
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка сохранения настроек мега рулетки:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сохранения настроек' 
        });
    }
});

app.get('/api/admin/wheel-settings/normal', requireAdmin, async (req, res) => {
    try {
        // Получаем настройки обычной рулетки из файла конфигурации или БД
        const settings = await db.getWheelSettings('normal');
        res.json(settings || { prizes: [] });
    } catch (error) {
        console.error('❌ Ошибка получения настроек обычной рулетки:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/wheel-settings/normal', requireAdmin, async (req, res) => {
    const { prizes } = req.body;
    
    if (!prizes || !Array.isArray(prizes)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Неверный формат данных' 
        });
    }

    // Проверяем что сумма вероятностей равна 100%
    const totalChance = prizes.reduce((sum, prize) => sum + (prize.chance || 0), 0);
    if (Math.abs(totalChance - 100) > 0.1) {
        return res.status(400).json({ 
            success: false, 
            error: 'Сумма вероятностей должна равняться 100%' 
        });
    }

    try {
        await db.saveWheelSettings('normal', { prizes });
        console.log('✅ Настройки обычной рулетки обновлены');
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка сохранения настроек обычной рулетки:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сохранения настроек' 
        });
    }
});

// ДОБАВЬТЕ этот endpoint в telegram-bot-server.js для быстрой проверки:

app.get('/api/debug/referrals', async (req, res) => {
    try {
        // Получаем все рефералы из таблицы
        const referrals = await new Promise((resolve, reject) => {
            db.db.all(`
                SELECT 
                    r.id,
                    ref.telegram_id as referrer_id,
                    ref.first_name as referrer_name,
                    rfd.telegram_id as referred_id,
                    rfd.first_name as referred_name,
                    r.referral_date
                FROM referrals r
                JOIN users ref ON r.referrer_id = ref.id
                JOIN users rfd ON r.referred_id = rfd.id
                ORDER BY r.referral_date DESC
                LIMIT 10
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        // Получаем счетчики пользователей
        const userCounts = await new Promise((resolve, reject) => {
            db.db.all(`
                SELECT 
                    u.telegram_id,
                    u.first_name,
                    u.referrals as referrals_field,
                    u.stars,
                    u.total_stars_earned,
                    COUNT(r.referred_id) as actual_referrals_count
                FROM users u
                LEFT JOIN referrals r ON u.telegram_id = r.referrer_id
                WHERE u.is_active = 1
                GROUP BY u.telegram_id, u.first_name, u.referrals, u.stars, u.total_stars_earned
                HAVING actual_referrals_count > 0 OR u.referrals > 0
                ORDER BY actual_referrals_count DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        console.log('🔍 Отладка рефералов:');
        userCounts.forEach(user => {
            console.log(`👤 ${user.first_name} (${user.telegram_id}): поле=${user.referrals_field}, фактически=${user.actual_referrals_count}, звезд=${user.stars}, всего заработано=${user.total_stars_earned}`);
        });
        
        res.json({
            referrals: referrals,
            userCounts: userCounts,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Ошибка отладки рефералов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// === ПУБЛИЧНЫЕ ENDPOINTS ДЛЯ НАСТРОЕК РУЛЕТКИ ===

// Публичный endpoint для получения настроек мега рулетки (только чтение)
app.get('/api/wheel-settings/mega', async (req, res) => {
    try {
        // Получаем настройки мега рулетки для фронтенда (только prize chances)
        const settings = await db.getWheelSettings('mega');
        
        if (settings && settings.prizes) {
            // Возвращаем только шансы призов, без админской информации
            const publicSettings = {
                prizes: settings.prizes.map(prize => ({
                    id: prize.id,
                    chance: prize.chance
                }))
            };
            res.json(publicSettings);
        } else {
            // Возвращаем пустые настройки, чтобы фронтенд использовал дефолтные
            res.json({ prizes: [] });
        }
    } catch (error) {
        console.error('❌ Ошибка получения публичных настроек мега рулетки:', error);
        res.json({ prizes: [] }); // В случае ошибки возвращаем пустые настройки
    }
});

// === КОМАНДЫ БОТА ===

if (bot) {
    // Команда /start с поддержкой реферальных ссылок
    bot.onText(/\/start(?:\s(.+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const startParam = match ? match[1] : null;
        
        console.log(`👤 Пользователь ${userId} (${msg.from.first_name}) запустил бота${startParam ? ` с параметром: ${startParam}` : ''}`);
        
        try {
            // Проверяем, существует ли пользователь
            let user = await db.getUser(userId);
            
            if (!user) {
                // Создаем нового пользователя
                console.log(`🆕 Создаем нового пользователя: ${userId}`);
                await db.createUser({
                    telegram_id: userId,
                    username: msg.from.username || '',
                    first_name: msg.from.first_name || 'Пользователь',
                    last_name: msg.from.last_name || ''
                });
                
                // Проверяем, что пользователь создан
                user = await db.getUser(userId);
                if (user) {
                    console.log(`✅ Пользователь ${userId} успешно создан с ID: ${user.id}`);
                } else {
                    console.error(`❌ Не удалось создать пользователя ${userId}`);
                    bot.sendMessage(chatId, '❌ Ошибка создания профиля. Попробуйте позже.');
                    return;
                }
            } else {
                // Обновляем данные и активность существующего пользователя
                console.log(`🔄 Пользователь ${userId} вернулся (БД ID: ${user.id})`);
                
                // Обновляем профиль если изменились данные
                if (user.first_name !== msg.from.first_name || 
                    user.username !== (msg.from.username || '')) {
                    await db.updateUserProfile(userId, {
                        username: msg.from.username || '',
                        first_name: msg.from.first_name || 'Пользователь',
                        last_name: msg.from.last_name || ''
                    });
                    console.log(`📝 Обновлен профиль пользователя ${userId}`);
                }
                
                await db.updateUserActivity(userId);
            }
            
            // НАЙДИТЕ этот блок в telegram-bot-server.js в команде /start и ЗАМЕНИТЕ его:

            // Обработка реферальной ссылки - ИСПРАВЛЕННАЯ ВЕРСИЯ
            if (startParam && startParam.startsWith('ref_')) {
                const referrerId = parseInt(startParam.substring(4));
                if (referrerId && referrerId !== userId) {
                    try {
                        // Проверяем, что реферер существует
                        const referrer = await db.getUser(referrerId);
                        if (referrer) {
                            // Проверяем, не был ли уже добавлен этот реферал
                            const existingReferral = await db.getReferral(referrerId, userId);
                            if (!existingReferral) {
                                // Добавляем реферал
                                const added = await db.addReferral(referrerId, userId);
                                
                                if (added) {
                                    console.log(`🤝 Пользователь ${userId} приглашен пользователем ${referrerId}`);
                                    
                                    // ВАЖНО: Сразу начисляем звезды рефереру
                                    await db.updateUserStars(referrerId, 100);
                                    
                                    // Обновляем общее количество заработанных звезд
                                    await db.incrementTotalStarsEarned(referrerId, 100);
                                    
                                    console.log(`⭐ Рефереру ${referrerId} начислено 100 звезд за приглашение`);
                                    
                                    // Уведомляем пригласившего
                                    try {
                                        await bot.sendMessage(referrerId, 
                                            `🎉 Поздравляем! Ваш друг ${msg.from.first_name} присоединился к боту!\n` +
                                            `⭐ Вы получили 100 звезд за приглашение!`
                                        );
                                    } catch (notifyError) {
                                        console.log('⚠️ Не удалось уведомить реферера:', notifyError.message);
                                    }
                                    
                                    // Уведомляем приглашенного
                                    try {
                                        await bot.sendMessage(userId,
                                            `👋 Добро пожаловать! Вы присоединились по приглашению от ${referrer.first_name}!\n` +
                                            `🎁 Начните играть и выигрывайте призы!`
                                        );
                                    } catch (notifyError) {
                                        console.log('⚠️ Не удалось уведомить приглашенного:', notifyError.message);
                                    }
                                }
                            } else {
                                console.log(`⚠️ Реферал ${userId} уже был добавлен пользователем ${referrerId}`);
                            }
                        }
                    } catch (refError) {
                        console.error('❌ Ошибка обработки реферальной ссылки:', refError);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Ошибка обработки пользователя:', error);
            bot.sendMessage(chatId, '❌ Ошибка обработки профиля. Попробуйте позже.');
            return;
        }
        
        const welcomeMessage = `🎰 *Добро пожаловать в Kosmetichka Lottery Bot\\!*

💄 *Специально для девушек\\!*
🌸 Крути рулетку и выигрывай призы\\!
💎 Выполняй задания за кристаллы
🏆 Соревнуйся в таблице лидеров
👥 Приглашай друзей и получай бонусы

✨ *Призы:*
🍎 Сертификаты в Золотое яблоко
🚚 Доставка Dolce Deals
💎 Кристаллы и бонусы

📱 *Подписывайся на @dolcedeals для скидок\\!*

Нажми кнопку ниже, чтобы начать играть\\! ⬇️`;
        
        const keyboard = {
            inline_keyboard: [
                [
                    {
                        text: '🎰 Запустить Kosmetichka Lottery',
                        web_app: { url: WEBAPP_URL }
                    }
                ],
                [
                    { text: '📊 Моя статистика', callback_data: 'stats' },
                    { text: '🎁 Мои призы', callback_data: 'prizes' }
                ],
                [
                    { text: '💎 Промокод', callback_data: 'promo' },
                    { text: '👥 Пригласить друзей', callback_data: 'invite' }
                ]
            ]
        };
        
        bot.sendMessage(chatId, welcomeMessage, { 
            reply_markup: keyboard,
            parse_mode: 'MarkdownV2'
        });
    });

    // Команда /test для отладки
    bot.onText(/\/test/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, `🧪 *Тестирование бота*\n\n🌐 WebApp URL: \`${WEBAPP_URL}\`\n⚡ Статус: Работает`, {
            parse_mode: 'MarkdownV2'
        });
    });

    // Команда /admin для доступа к панели управления
    bot.onText(/\/admin/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        console.log(`👑 Запрос админки от пользователя ${userId}`);
        
        // Проверяем права админа (список ID админов)
        const adminIds = [
            parseInt(process.env.ADMIN_ID) || 0,
            // Добавьте сюда ID других админов
        ];
        
        if (!adminIds.includes(userId)) {
            await bot.sendMessage(chatId, '❌ У вас нет прав для доступа к админ-панели.');
            return;
        }
        
        const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
        const adminUrl = `${serverUrl}/admin`;
        
        await bot.sendMessage(
            chatId,
            `👑 **Админ-панель Kosmetichka Lottery**\n\n` +
            `🔗 [Открыть панель управления](${adminUrl})\n\n` +
            `📊 Функции админки:\n` +
            `• Управление каналами\n` +
            `• Просмотр призов для выдачи\n` +
            `• Статистика пользователей\n` +
            `• Аналитика и графики\n` +
            `• Системные настройки\n\n` +
            `⚡ Обновляется в реальном времени`,
            { 
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🚀 Открыть админку', url: adminUrl }
                    ]]
                }
            }
        );
    });

    // Команда /stats
    bot.onText(/\/stats/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        try {
            const user = await db.getUser(userId);
            
            if (!user) {
                bot.sendMessage(chatId, '❌ Сначала запустите бота командой /start');
                return;
            }
            
            const registrationDate = new Date(user.join_date).toLocaleDateString('ru-RU');
            
            const message = `
👤 **Ваш профиль:**

🆔 ID: ${userId}
📅 Дата регистрации: ${registrationDate}

📊 **Статистика:**
🎰 Прокруток: ${user.total_spins || 0}
🎁 Призов: ${user.prizes_won || 0}
⭐ Звезд: ${user.stars || 20}
👥 Рефералов: ${user.referrals || 0}

🎮 Играйте больше, чтобы улучшить статистику!
            `;
            
            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Ошибка получения статистики:', error);
            bot.sendMessage(chatId, '❌ Ошибка получения статистики');
        }
    });

    // Команда /promo для промокодов
    bot.onText(/\/promo (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const promoCode = match[1].toUpperCase();
        
        try {
            const user = await db.getUser(userId);
            if (!user) {
                bot.sendMessage(chatId, '❌ Сначала запустите бота командой /start');
                return;
            }
            
            const promo = PROMO_CODES[promoCode];
            if (!promo) {
                bot.sendMessage(chatId, '❌ Промокод не найден или недействителен');
                return;
            }
            
            if (promo.used.has(userId)) {
                bot.sendMessage(chatId, '❌ Вы уже использовали этот промокод');
                return;
            }
            
            // Активируем промокод
            promo.used.add(userId);
            
            // Обновляем звезды в базе данных
            await db.updateUserStars(userId, promo.crystals);
            
            bot.sendMessage(chatId, `✅ Промокод активирован!\n⭐ Получено ${promo.crystals} звезд`);
            
            // Уведомляем админов
            notifyAdmins(`Пользователь ${user.first_name} (${userId}) активировал промокод ${promoCode}`);
        } catch (error) {
            console.error('❌ Ошибка активации промокода:', error);
            bot.sendMessage(chatId, '❌ Ошибка активации промокода');
        }
    });

    // Команда /help
    bot.onText(/\/help/, (msg) => {
        const chatId = msg.chat.id;
        const helpMessage = `
🤖 **Помощь по Kosmetichka Lottery Bot**

🎰 **Основные команды:**
/start - Запустить бота
/stats - Показать статистику
/balance - Мой баланс звезд
/deposit - Пополнить звезды
/promo <код> - Активировать промокод
/help - Эта справка

🎯 **Как играть:**
1. Нажмите "Запустить Kosmetichka Lottery"
2. Крутите рулетку за звезды (20 ⭐ за прокрутку)
3. Выполняйте задания для получения звезд
4. Приглашайте друзей за бонусы

⭐ **Звезды:**
• Получайте за выполнение заданий
• Тратьте на прокрутки рулетки
• Зарабатывайте за приглашение друзей
• Пополняйте через Telegram Stars

🎁 **Призы:**
• Сертификаты в Золотое яблоко
• Доставка Dolce Deals
• Дополнительные звезды

📱 **Подписывайтесь на @dolcedeals для скидок!**

❓ Есть вопросы? Пишите в поддержку.
        `;
        
        bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // Команда /testprize для тестирования сохранения призов
    bot.onText(/\/testprize/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        try {
            const user = await db.getUser(userId);
            if (!user) {
                bot.sendMessage(chatId, '❌ Сначала запустите бота командой /start');
                return;
            }
            
            // Создаем тестовый приз
            const testPrize = {
                type: 'stars-50',
                name: '⭐ 50 звезд (тест)',
                value: 50,
                description: 'Тестовый приз для проверки БД'
            };
            
            console.log(`🧪 Создание тестового приза для пользователя ${userId}`);
            
            // Сохраняем приз через транзакцию
            await db.addUserPrizeWithTransaction(userId, testPrize, 'test');
            
            // Проверяем, что приз сохранился
            const prizes = await db.getUserPrizes(userId);
            
            bot.sendMessage(chatId, `✅ Тестовый приз добавлен!\n\nТеперь у вас ${prizes.length} призов в БД.\n\nПопробуйте нажать кнопку "🎁 Мои призы"`);
            
        } catch (error) {
            console.error('❌ Ошибка тестирования:', error);
            bot.sendMessage(chatId, '❌ Ошибка при добавлении тестового приза');
        }
    });

    // Команда /debug для отладки (временная)
    bot.onText(/\/debug/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        try {
            console.log(`🔍 Debug запрос от пользователя ${userId}`);
            
            const user = await db.getUser(userId);
            console.log('👤 Данные пользователя:', user);
            
            const prizes = await db.getUserPrizes(userId);
            console.log(`🎁 Количество призов: ${prizes ? prizes.length : 0}`);
            
            // Проверяем общее количество пользователей в БД
            const allUsersCount = await new Promise((resolve) => {
                db.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                    resolve(row ? row.count : 0);
                });
            });
            
            // Проверяем общее количество призов в БД
            const allPrizesCount = await new Promise((resolve) => {
                db.db.get('SELECT COUNT(*) as count FROM user_prizes', (err, row) => {
                    resolve(row ? row.count : 0);
                });
            });
            
            // Проверяем последние записи в spin_history
            const lastSpins = await new Promise((resolve) => {
                db.db.all('SELECT * FROM spin_history ORDER BY spin_date DESC LIMIT 5', (err, rows) => {
                    resolve(rows || []);
                });
            });
            
            const debugMessage = `
🔍 **Отладочная информация:**

👤 **Пользователь в БД:** ${user ? 'Да' : 'Нет'}
🆔 **Ваш Telegram ID:** ${userId}
${user ? `
📊 **Статистика:**
⭐ Звезд: ${user.stars}
🎯 Прокруток: ${user.total_spins}
🎁 Призов: ${user.prizes_won}
📅 Регистрация: ${new Date(user.join_date).toLocaleDateString('ru-RU')}
` : ''}

🎁 **Призы в БД:** ${prizes ? prizes.length : 0}
${prizes && prizes.length > 0 ? `
Последние призы:
${prizes.slice(0, 3).map((p, i) => `${i+1}. ${p.prize_name}`).join('\n')}
` : ''}

📊 **Общая статистика БД:**
👥 Всего пользователей: ${allUsersCount}
🎁 Всего призов: ${allPrizesCount}

🕐 **Последние прокрутки:**
${lastSpins.length > 0 ? lastSpins.map((spin, i) => 
    `${i+1}. User ID: ${spin.user_id}, Prize: ${spin.won_prize || 'none'}`
).join('\n') : 'Нет записей'}
            `;
            
            bot.sendMessage(chatId, debugMessage, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Ошибка отладки:', error);
            bot.sendMessage(chatId, '❌ Ошибка при получении отладочных данных');
        }
    });

    // Топ игроков
    bot.onText(/\/top/, async (msg) => {
        const chatId = msg.chat.id;
        
        try {
            // Обновляем лидерборд
            await db.updateLeaderboard();
            
            // Получаем топ игроков
            const topUsers = await db.getLeaderboard(10);
            
            if (topUsers.length === 0) {
                bot.sendMessage(chatId, '📊 Пока нет активных игроков. Будьте первым!');
                return;
            }
            
            let message = '🏆 **Топ-10 игроков:**\n\n';
            
            topUsers.forEach((user, index) => {
                const position = index + 1;
                const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
                const name = user.first_name || 'Игрок';
                const stars = user.total_stars || 0;
                const prizes = user.total_prizes || 0;
                
                message += `${medal} ${name} - ${stars} ⭐, ${prizes} призов\n`;
            });
            
            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Ошибка получения топа:', error);
            bot.sendMessage(chatId, '❌ Ошибка получения топа игроков');
        }
    });

    // Обработка callback кнопок
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const userId = query.from.id;
        const data = query.data;
        
        await bot.answerCallbackQuery(query.id);
        
        try {
            const user = await db.getUser(userId);
            
            switch (data) {
                case 'stats':
                    if (user) {
                        bot.sendMessage(chatId, `📊 **Ваша статистика:**\n\n🎰 Прокруток: ${user.total_spins || 0}\n🎁 Призов: ${user.prizes_won || 0}\n⭐ Звезд: ${user.stars || 20}`, {
                            parse_mode: 'Markdown'
                        });
                    } else {
                        bot.sendMessage(chatId, '📊 Сначала запустите бота командой /start');
                    }
                    break;
                    
                case 'prizes':
                    if (user) {
                        console.log(`🔍 Запрос призов для пользователя ${userId}`);
                        const prizes = await db.getUserPrizes(userId);
                        console.log(`📦 Найдено призов в БД: ${prizes ? prizes.length : 0}`);
                        
                        if (prizes && prizes.length > 0) {
                            let message = '🎁 **Ваши призы:**\n\n';
                            
                            // Показываем до 15 призов с подробной информацией
                            prizes.slice(0, 15).forEach((prize, index) => {
                                const date = new Date(prize.won_date).toLocaleDateString('ru-RU');
                                const claimed = prize.is_claimed ? '✅' : '⏳';
                                
                                message += `${index + 1}. **${prize.prize_name}** ${claimed}\n`;
                                if (prize.prize_value) {
                                    message += `   💰 Стоимость: ${prize.prize_value}\n`;
                                }
                                message += `   📅 Выиграно: ${date}\n\n`;
                            });
                            
                            if (prizes.length > 15) {
                                message += `... и еще ${prizes.length - 15} призов\n\n`;
                            }
                            
                            message += '💡 Откройте мини-приложение для управления всеми призами.';
                            
                            const keyboard = {
                                inline_keyboard: [[
                                    { text: '🎮 Открыть приложение', web_app: { url: WEBAPP_URL } }
                                ]]
                            };
                            
                            bot.sendMessage(chatId, message, { 
                                parse_mode: 'Markdown',
                                reply_markup: keyboard
                            });
                        } else {
                            bot.sendMessage(chatId, '📦 У вас пока нет призов.\n\n🎮 Откройте мини-приложение и крутите рулетку!', {
                                reply_markup: {
                                    inline_keyboard: [[
                                        { text: '🎰 Играть', web_app: { url: WEBAPP_URL } }
                                    ]]
                                }
                            });
                        }
                    } else {
                        bot.sendMessage(chatId, '🎁 Сначала запустите бота командой /start');
                    }
                    break;
                
            case 'promo':
                bot.sendMessage(chatId, '💎 **Введите промокод:**\n\nОтправьте команду: `/promo ВАШ_КОД`\n\nПример: `/promo WELCOME2024`', {
                    parse_mode: 'Markdown'
                });
                break;
                
            // В файле telegram-bot-server.js
// Заменить случай 'invite' в обработчике callback_query

            // В обработчике callback_query, случай 'invite':
            case 'invite':
                // ИСПРАВЛЕНО: Создаем персональную реферальную ссылку
                const referralLink = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;
                const shareText = '🎰 Привет! Присоединяйся к Kosmetichka Lottery Bot - крути рулетку и выигрывай призы! 💄✨';
                const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;
                
                const inviteKeyboard = {
                    inline_keyboard: [
                        [
                            {
                                text: '👥 Поделиться ссылкой',
                                url: shareUrl
                            }
                        ],
                        [
                            {
                                text: '📋 Скопировать ссылку',
                                callback_data: `copy_link_${userId}`
                            }
                        ]
                    ]
                };
                
                const inviteMessage = `👥 **Приглашайте друзей и получайте бонусы!**

🎁 **Ваши награды:**
• 100 ⭐ звезд за каждого приглашенного друга
• Дополнительные бонусы и призы

🔗 **Ваша персональная ссылка:**
\`${referralLink}\`

💡 **Как работает:**
1. Поделитесь ссылкой с друзьями
2. Друг переходит по ссылке и запускает бота
3. Вы автоматически получаете 100 звезд!

📱 Нажмите кнопку ниже, чтобы поделиться:`;
                
                bot.sendMessage(chatId, inviteMessage, {
                    reply_markup: inviteKeyboard,
                    parse_mode: 'Markdown'
                });
                break;
                
            // НОВОЕ: Обработчик копирования реферальной ссылки
            default:
                if (data.startsWith('copy_link_')) {
                    const linkUserId = data.split('_')[2];
                    const referralLink = `https://t.me/${BOT_USERNAME}?start=ref_${linkUserId}`;
                    
                    const copyMessage = `📋 **Ваша реферальная ссылка:**

\`${referralLink}\`

👆 Нажмите на ссылку для копирования

💡 Поделитесь этой ссылкой с друзьями и получайте звезды за каждого приглашенного!`;

                    bot.sendMessage(chatId, copyMessage, {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: '🔙 Назад к приглашениям',
                                        callback_data: 'invite'
                                    }
                                ]
                            ]
                        }
                    });
                }
                break;
        }
    } catch (error) {
        console.error('❌ Ошибка callback query:', error);
        bot.sendMessage(chatId, '❌ Произошла ошибка');
    }
});

    // Обработка ошибок бота
    bot.on('error', (error) => {
        // Фильтруем и показываем только важные ошибки
        if (error.code === 'ETELEGRAM') {
            console.error('❌ Ошибка Telegram API:', error.message);
        } else {
            console.error('❌ Ошибка бота:', error.message);
        }
        
        // Подробности только в режиме отладки
        if (DEBUG_MODE) {
            console.error('🐛 Подробности ошибки:', error);
        }
    });

    bot.on('polling_error', (error) => {
        // Фильтруем подробности и показываем только суть
        if (error.code === 'ETELEGRAM') {
            console.error('❌ Ошибка polling:', error.message);
            
            // Если это конфликт 409, пытаемся переподключиться
            if (error.message.includes('409')) {
                console.log('🔄 Обнаружен конфликт polling, попытка переподключения...');
                botPolling = false;
                
                // Ждем и пытаемся переподключиться
                setTimeout(() => {
                    startPolling();
                }, 10000); // 10 секунд
            }
        } else {
            console.error('❌ Ошибка polling:', error.message);
        }
        
        // Подробности только в режиме отладки
        if (DEBUG_MODE) {
            console.error('🐛 Подробности ошибки polling:', error);
        }
    });

    // Статистика для администратора
    bot.onText(/\/admin_stats/, (msg) => {
        const userId = msg.from.id;
        
        if (!ADMIN_IDS.includes(userId)) {
            bot.sendMessage(msg.chat.id, '❌ Недостаточно прав');
            return;
        }
        
        const totalUsers = users.size;
        const activeUsers = Array.from(users.values()).filter(u => u.webapp_data).length;
        const totalSpins = Array.from(users.values())
            .reduce((sum, u) => sum + (u.webapp_data?.stats?.totalSpins || 0), 0);
        
        const message = `
📊 **Статистика бота:**

👥 Всего пользователей: ${totalUsers}
🎮 Активных игроков: ${activeUsers}
🎰 Всего прокруток: ${totalSpins}
📅 Дата: ${new Date().toLocaleDateString('ru-RU')}
        `;
        
        bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
    });

    // Рассылка (только для админов)
    bot.onText(/\/broadcast (.+)/, (msg, match) => {
        const userId = msg.from.id;
        
        if (!ADMIN_IDS.includes(userId)) {
            bot.sendMessage(msg.chat.id, '❌ Недостаточно прав');
            return;
        }
        
        const message = match[1];
        let sent = 0;
        
        users.forEach(async (user) => {
            try {
                await bot.sendMessage(user.chat_id, `📢 ${message}`);
                sent++;
            } catch (error) {
                console.log(`Ошибка отправки пользователю ${user.id}:`, error.message);
            }
        });
        
        bot.sendMessage(msg.chat.id, `✅ Рассылка отправлена ${sent} пользователям`);
    });

    // ===== КОМАНДЫ ДЛЯ ДЕПОЗИТА TELEGRAM STARS =====

    // Команда /balance - показать баланс
    bot.onText(/\/balance/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        try {
            const user = await db.getUser(userId);
            
            if (!user) {
                bot.sendMessage(chatId, '❌ Сначала запустите бота командой /start');
                return;
            }

            const balance = user.stars || 0;
            const totalEarned = user.total_stars_earned || 20;
            const totalSpent = totalEarned - balance;

            const message = `
💰 **Ваш баланс звезд**

⭐ Текущий баланс: **${balance} звезд**
📈 Всего заработано: **${totalEarned} звезд**
📉 Всего потрачено: **${totalSpent} звезд**

💡 Используйте /deposit для пополнения баланса
🎰 20 ⭐ = 1 прокрутка рулетки
            `;

            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Ошибка получения баланса:', error);
            bot.sendMessage(chatId, '❌ Ошибка получения баланса');
        }
    });

    // Команда /deposit - пополнить звезды
    bot.onText(/\/deposit/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        try {
            const user = await db.getUser(userId);
            
            if (!user) {
                bot.sendMessage(chatId, '❌ Сначала запустите бота командой /start');
                return;
            }

            // Создаем кнопки для разных сумм пополнения
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '⭐ 100 звезд (100 ⭐)', callback_data: 'deposit_100' },
                        { text: '⭐ 200 звезд (200 ⭐)', callback_data: 'deposit_200' }
                    ],
                    [
                        { text: '⭐ 500 звезд (500 ⭐)', callback_data: 'deposit_500' },
                        { text: '⭐ 1000 звезд (1000 ⭐)', callback_data: 'deposit_1000' }
                    ],
                    [
                        { text: '⭐ Другая сумма', callback_data: 'deposit_custom' }
                    ]
                ]
            };

            const message = `
💰 **Пополнение звезд через Telegram Stars**

⭐ Telegram Stars = ⭐ Игровые звезды (1:1)

🎰 20 звезд = 1 прокрутка рулетки
🎁 Больше звезд = больше шансов на призы!

Выберите сумму для пополнения:
            `;

            bot.sendMessage(chatId, message, { 
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            console.error('❌ Ошибка команды депозита:', error);
            bot.sendMessage(chatId, '❌ Ошибка при открытии меню пополнения');
        }
    });

    // Обработка колбэков для депозита
    bot.on('callback_query', async (callbackQuery) => {
        const msg = callbackQuery.message;
        const chatId = msg.chat.id;
        const userId = callbackQuery.from.id;
        const data = callbackQuery.data;

        try {
            // Депозит фиксированных сумм
            if (data.startsWith('deposit_')) {
                const amount = data.split('_')[1];
                
                if (amount === 'custom') {
                    bot.sendMessage(chatId, `
💰 **Пополнение на произвольную сумму**

Отправьте сообщение в формате:
\`/pay 250\` - пополнить на 250 звезд

Минимум: 50 звезд
Максимум: 2500 звезд
                    `, { parse_mode: 'Markdown' });
                    
                } else {
                    const starsAmount = parseInt(amount);
                    await handleStarsPayment(userId, starsAmount, chatId);
                }
            }
            
            // Подтверждаем обработку колбэка
            bot.answerCallbackQuery(callbackQuery.id);
            
        } catch (error) {
            console.error('❌ Ошибка обработки колбэка:', error);
            bot.answerCallbackQuery(callbackQuery.id, { text: 'Ошибка обработки запроса' });
        }
    });

    // Команда /pay для произвольной суммы
    bot.onText(/\/pay (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const amount = parseInt(match[1]);

        if (amount < 50 || amount > 2500) {
            bot.sendMessage(chatId, '❌ Сумма должна быть от 50 до 2500 звезд');
            return;
        }

        await handleStarsPayment(userId, amount, chatId);
    });

    // === API ENDPOINTS ДЛЯ ДЕПОЗИТА ===
    
    // Создание платежа через мини-апп
    app.post('/api/deposit/create', async (req, res) => {
        try {
            const { userId, amount, userData } = req.body;

            if (!userId || !amount || amount < 50 || amount > 2500) {
                return res.json({ 
                    success: false, 
                    error: 'Некорректная сумма пополнения' 
                });
            }

            // Проверяем пользователя
            const user = await db.getUser(userId);
            if (!user) {
                return res.json({ 
                    success: false, 
                    error: 'Пользователь не найден' 
                });
            }

            // Создаем инвойс через бота
            if (bot) {
                await handleStarsPayment(userId, amount, userId);
                res.json({ 
                    success: true, 
                    message: 'Счет отправлен в чат с ботом' 
                });
            } else {
                res.json({ 
                    success: false, 
                    error: 'Бот недоступен' 
                });
            }

        } catch (error) {
            console.error('❌ Ошибка создания депозита:', error);
            res.json({ 
                success: false, 
                error: 'Ошибка сервера' 
            });
        }
    });

    // Получение истории транзакций пользователя
    app.get('/api/user/:userId/transactions', async (req, res) => {
        try {
            const { userId } = req.params;
            const transactions = await db.getUserTransactions(userId, 50);

            res.json({
                success: true,
                transactions: transactions
            });

        } catch (error) {
            console.error('❌ Ошибка получения транзакций:', error);
            res.json({
                success: false,
                error: 'Ошибка получения истории транзакций'
            });
        }
    });
}

// === ФУНКЦИИ ДЛЯ TELEGRAM STARS ===

// Обработка платежа через Telegram Stars
async function handleStarsPayment(userId, starsAmount, chatId) {
    try {
        console.log(`💰 Создание счета на ${starsAmount} звезд для пользователя ${userId}`);
        
        const user = await db.getUser(userId);
        if (!user) {
            bot.sendMessage(chatId, '❌ Пользователь не найден');
            return;
        }

        // Создаем инвойс через Bot API
        const invoice = {
            title: `🎰 Kosmetichka Lottery - ${starsAmount} звезд`,
            description: `Пополнение игрового баланса на ${starsAmount} звезд для участия в лотерее`,
            payload: JSON.stringify({
                userId: userId,
                amount: starsAmount,
                type: 'stars_deposit',
                timestamp: Date.now()
            }),
            provider_token: '', // Для Telegram Stars это пустая строка
            currency: 'XTR', // Telegram Stars currency
            prices: [
                {
                    label: `⭐ ${starsAmount} игровых звезд`,
                    amount: starsAmount // Сумма в Telegram Stars
                }
            ],
            need_name: false,
            need_phone_number: false,
            need_email: false,
            need_shipping_address: false,
            send_phone_number_to_provider: false,
            send_email_to_provider: false,
            is_flexible: false
        };

        const message = `
💰 **Счет на пополнение создан**

⭐ Сумма: ${starsAmount} Telegram Stars
🎰 Получите: ${starsAmount} игровых звезд
💰 Курс: 1:1 (Telegram Stars = игровые звезды)

Нажмите кнопку ниже для оплаты:
        `;

        // Отправляем инвойс
        await bot.sendInvoice(chatId, invoice.title, invoice.description, 
            invoice.payload, invoice.provider_token, invoice.currency, 
            invoice.prices, {
                need_name: invoice.need_name,
                need_phone_number: invoice.need_phone_number,
                need_email: invoice.need_email,
                need_shipping_address: invoice.need_shipping_address,
                send_phone_number_to_provider: invoice.send_phone_number_to_provider,
                send_email_to_provider: invoice.send_email_to_provider,
                is_flexible: invoice.is_flexible
            });

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('❌ Ошибка создания платежа:', error);
        bot.sendMessage(chatId, '❌ Ошибка создания счета для оплаты. Попробуйте позже.');
    }
}

// Обработка pre_checkout_query (проверка перед оплатой)
if (bot) {
    bot.on('pre_checkout_query', async (preCheckoutQuery) => {
        console.log('💳 Pre-checkout query получен:', preCheckoutQuery);
        
        try {
            const payload = JSON.parse(preCheckoutQuery.invoice_payload);
            
            // Проверяем валидность платежа
            if (payload.type === 'stars_deposit' && payload.userId && payload.amount) {
                const user = await db.getUser(payload.userId);
                
                if (user) {
                    // Одобряем платеж
                    await bot.answerPreCheckoutQuery(preCheckoutQuery.id, true);
                    console.log('✅ Pre-checkout одобрен');
                } else {
                    await bot.answerPreCheckoutQuery(preCheckoutQuery.id, false, {
                        error_message: 'Пользователь не найден'
                    });
                }
            } else {
                await bot.answerPreCheckoutQuery(preCheckoutQuery.id, false, {
                    error_message: 'Неверные данные платежа'
                });
            }
            
        } catch (error) {
            console.error('❌ Ошибка pre-checkout:', error);
            await bot.answerPreCheckoutQuery(preCheckoutQuery.id, false, {
                error_message: 'Ошибка обработки платежа'
            });
        }
    });

    // Обработка успешного платежа
    bot.on('successful_payment', async (msg) => {
        console.log('🎉 Успешный платеж получен:', msg.successful_payment);
        
        try {
            const payment = msg.successful_payment;
            const payload = JSON.parse(payment.invoice_payload);
            const userId = payload.userId;
            const starsAmount = payload.amount;
            
            // Добавляем звезды пользователю
            await db.updateUserStars(userId, starsAmount);
            
            // Записываем транзакцию в БД
            await db.addStarsTransaction({
                user_id: userId,
                amount: starsAmount,
                type: 'deposit',
                telegram_payment_id: payment.telegram_payment_charge_id,
                provider_payment_id: payment.provider_payment_charge_id,
                currency: payment.currency,
                total_amount: payment.total_amount
            });
            
            // Получаем обновленный баланс
            const user = await db.getUser(userId);
            const newBalance = user ? user.stars : 0;
            
            // Отправляем подтверждение пользователю
            const confirmMessage = `
🎉 **Пополнение выполнено успешно!**

⭐ Зачислено: **${starsAmount} звезд**
💰 Ваш баланс: **${newBalance} звезд**

🎰 Теперь вы можете делать прокрутки рулетки!
🎁 Удачи в выигрыше призов!
            `;
            
            await bot.sendMessage(msg.chat.id, confirmMessage, { parse_mode: 'Markdown' });
            
            // Уведомляем админов о крупных пополнениях
            if (starsAmount >= 1000) {
                const user = await db.getUser(userId);
                if (user) {
                    notifyAdmins(`💰 Крупное пополнение: ${user.first_name} (${userId}) пополнил на ${starsAmount} звезд`);
                }
            }
            
            console.log(`✅ Пополнение обработано: ${userId} получил ${starsAmount} звезд`);
            
        } catch (error) {
            console.error('❌ Ошибка обработки успешного платежа:', error);
            bot.sendMessage(msg.chat.id, '❌ Ошибка при зачислении звезд. Обратитесь в поддержку.');
        }
    });
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

// Создание базового HTML если файл отсутствует
function createBasicHTML() {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kosmetichka Lottery Bot</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #EF55A5 0%, #809EFF 50%, #CCD537 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            text-align: center;
            max-width: 400px;
            background: rgba(0,0,0,0.3);
            padding: 40px 30px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
        }
        h1 {
            font-size: 28px;
            margin-bottom: 20px;
            background: linear-gradient(45deg, #fff, #CCD537);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .emoji { font-size: 48px; margin-bottom: 20px; }
        .button {
            background: linear-gradient(45deg, #EF55A5, #FF6B9D);
            border: none;
            color: white;
            padding: 15px 30px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin: 10px;
            transition: transform 0.2s;
        }
        .button:hover { transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">🎰</div>
        <h1>Kosmetichka Lottery</h1>
        <p>✨ Добро пожаловать в мир красоты и призов!</p>
        <button class="button" onclick="initApp()">🚀 Запустить приложение</button>
        <div id="status" style="margin-top: 20px; font-size: 14px;"></div>
    </div>
    <script>
        function initApp() {
            const tg = window.Telegram?.WebApp;
            if (tg) {
                tg.ready();
                tg.expand();
                document.getElementById('status').innerHTML = '✅ Приложение инициализировано!';
                console.log('WebApp готов к работе');
            } else {
                document.getElementById('status').innerHTML = '⚠️ Откройте через Telegram бота';
            }
        }
        window.addEventListener('load', () => {
            console.log('🚀 Kosmetichka Lottery загружено');
            const tg = window.Telegram?.WebApp;
            if (tg) {
                initApp();
            }
        });
    </script>
</body>
</html>`;
}

// Обработка прокрутки рулетки
async function handleWheelSpin(userId, data) {
    try {
        console.log('🎰 HANDLE_WHEEL_SPIN - Начало обработки:', {
            userId: userId,
            hasData: !!data,
            hasPrize: !!data?.prize,
            prizeType: data?.prize?.type,
            prizeName: data?.prize?.name,
            spinType: data?.spinType
        });
        
        let user = await db.getUser(userId);
        
        // Если пользователя нет в БД - создаем его
        if (!user) {
            console.log(`👤 Создание пользователя ${userId} при прокрутке рулетки`);
            
            const userData = {
                telegram_id: userId,
                username: data.user?.username || '',
                first_name: data.user?.first_name || 'Пользователь',
                last_name: data.user?.last_name || ''
            };
            
            await db.createUser(userData);
            user = await db.getUser(userId);
            
            if (!user) {
                console.error('❌ Не удалось создать пользователя');
                return;
            }
        }
        
        console.log(`🎰 Пользователь ${userId} крутит рулетку`);
        console.log('🎁 Данные приза:', JSON.stringify(data.prize, null, 2));
        
        // Обновляем статистику прокруток
        await db.updateUserSpinStats(userId);
        console.log('✅ Статистика прокруток обновлена');
        
        // Обрабатываем приз
        if (data.prize) {
            if (data.prize.type !== 'empty') {
                console.log('🏆 Обрабатываем выигрышный приз с транзакцией');
                
                // Используем безопасную транзакцию для добавления приза
                await db.addUserPrizeWithTransaction(userId, data.prize, data.spinType || 'normal');
                console.log('✅ Приз добавлен в БД с транзакцией');
                
                // Если это звезды - обновляем баланс
                if (data.prize.type.includes('stars')) {
                    const starsAmount = data.prize.value || 0;
                    await db.updateUserStars(userId, starsAmount);
                }
                
                // Отправляем уведомление в телеграм
                if (bot) {
                    try {
                        await bot.sendMessage(userId, `🎉 Поздравляем!\n🎁 Вы выиграли: ${data.prize.description || data.prize.name}!`);
                        
                        // Уведомляем админов о крупных призах (сертификаты)
                        if (data.prize.type.includes('golden-apple') || data.prize.type.includes('dolce')) {
                            // Используем красиво оформленное уведомление
                            notifyAdmins(`Пользователь ${user.first_name} (${userId}) выиграл: ${data.prize.name}`);
                            
                            // Или простое уведомление (если хотите оставить старый формат):
                            // notifyAdmins(`Пользователь ${user.first_name} (${userId}) выиграл: ${data.prize.name}`);
                        }
                    } catch (error) {
                        console.error('Ошибка отправки уведомления:', error);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Ошибка обработки прокрутки:', error);
    }
}

// Обработка выполнения задания
async function handleTaskCompleted(userId, data) {
    try {
        const user = await db.getUser(userId);
        if (!user) return;
        
        console.log(`✅ Пользователь ${userId} выполнил задание: ${data.taskId}`);
        
        // Пробуем добавить задание как выполненное
        const taskAdded = await db.completeTask(userId, data);
        
        if (taskAdded) {
            // Обновляем звезды пользователя
            const rewardAmount = data.reward?.amount || 0;
            if (rewardAmount > 0) {
                await db.updateUserStars(userId, rewardAmount);
            }
            
            // Отправляем уведомление
            if (bot) {
                try {
                    await bot.sendMessage(userId, `✅ Задание выполнено!\n⭐ Получено ${rewardAmount} звезд`);
                } catch (error) {
                    console.error('Ошибка отправки уведомления:', error);
                }
            }
        }
    } catch (error) {
        console.error('❌ Ошибка обработки задания:', error);
    }
}

// Обработка подписки на канал
async function handleChannelSubscription(userId, data) {
    try {
        const user = await db.getUser(userId);
        if (!user) return;
        
        console.log(`📱 Пользователь ${userId} подписался на канал: ${data.channel}`);
        
        // Определяем поле для обновления подписки
        let channelField;
        let bonus = 50;
        
        switch (data.channel) {
            case 'kosmetichka_channel':
                channelField = 'is_subscribed_channel1';
                bonus = 50;
                break;
            case 'kosmetichka_instagram':
                channelField = 'is_subscribed_channel2';
                bonus = 50;
                break;
            case 'dolcedeals':
                channelField = 'is_subscribed_dolcedeals';
                bonus = 75;
                break;
            default:
                console.log(`❓ Неизвестный канал: ${data.channel}`);
                return;
        }
        
        // Обновляем статус подписки
        await db.updateUserSubscription(userId, channelField, true);
        
        // Даем бонус за подписку
        await db.updateUserStars(userId, bonus);
        
        if (bot) {
            try {
                await bot.sendMessage(userId, `📱 Спасибо за подписку на канал!\n⭐ Получено ${bonus} звезд`);
            } catch (error) {
                console.error('Ошибка отправки уведомления:', error);
            }
        }
    } catch (error) {
        console.error('❌ Ошибка обработки подписки:', error);
    }
}

// Синхронизация данных пользователя
async function syncUserData(userId, webAppData) {
    try {
        let user = await db.getUser(userId);
        
        // Если пользователя нет в БД - создаем его
        if (!user) {
            console.log(`👤 Создание нового пользователя ${userId} через веб-приложение`);
            
            // Берем данные из Telegram WebApp если есть
            const telegramUser = webAppData.userData?.user || webAppData.user || {};
            const userData = {
                telegram_id: userId,
                username: telegramUser.username || '',
                first_name: telegramUser.first_name || 'Пользователь',
                last_name: telegramUser.last_name || ''
            };
            
            await db.createUser(userData);
            user = await db.getUser(userId);
            
            if (!user) {
                console.error('❌ Не удалось создать пользователя');
                return webAppData;
            }
        }
        
        console.log(`🔄 Синхронизация данных пользователя ${userId}`);
        
        // Обновляем активность пользователя
        await db.updateUserActivity(userId);
        
        // Получаем актуальные данные из базы
        const prizes = await db.getUserPrizes(userId);
        const completedTasks = await db.getUserCompletedTasks(userId);
        const subscriptions = await db.getUserSubscriptions(userId);
        const actualReferralsCount = await db.getUserReferralsCount(userId);
        
        const syncedData = {
            ...webAppData,
            profile: {
                ...webAppData.profile,
                telegramId: userId,
                verified: true,
                name: user.first_name || 'Пользователь'
            },
            stats: {
                stars: user.stars || 20,
                totalSpins: user.total_spins || 0,
                prizesWon: user.prizes_won || 0,
                referrals: actualReferralsCount,
                totalStarsEarned: user.total_stars_earned || 20
            },
            prizes: prizes || [],
            tasks: {
                completed: completedTasks || [],
                subscriptions: subscriptions || {}
            }
        };
        
        return syncedData;
    } catch (error) {
        console.error('❌ Ошибка синхронизации:', error);
        return webAppData;
    }
}

// Функция для отправки красиво оформленного уведомления о выигрыше
async function notifyWinToChannel(user, prize) {
    try {
        // Эмодзи для разных типов призов
        const prizeEmojis = {
            'golden-apple-3000': '💎',
            'golden-apple-2000': '🎁', 
            'golden-apple-1500': '🎈',
            'golden-apple-1000': '🎀',
            'golden-apple-500': '🎊',
            'dolce-deals': '🍰'
        };
        
        const emoji = prizeEmojis[prize.type] || '🎁';
        const userName = user.first_name || 'Пользователь';
        const userHandle = user.username ? `@${user.username}` : '';
        
        const winTime = new Date().toLocaleString('ru-RU', {
            timeZone: 'Europe/Moscow',
            day: '2-digit',
            month: '2-digit', 
            hour: '2-digit',
            minute: '2-digit'
        });

        const message = `🎉 <b>НОВЫЙ ВЫИГРЫШ!</b> 🎉

${emoji} <b>${prize.name}</b>
💸 Стоимость: <b>${prize.value || 0}₽</b>

👤 Победитель: <b>${userName}</b> ${userHandle ? `(${userHandle})` : `(${user.telegram_id})`}
🕐 Время: ${winTime}

🎰 Хочешь тоже выиграть? Попробуй свою удачу!
🎮 @kosmetichka_lottery_bot`;

        await bot.sendMessage(NOTIFICATION_CHANNEL, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        
        console.log(`🏆 Выигрыш опубликован в канал: ${prize.name} для ${userName}`);
    } catch (error) {
        console.error('❌ Ошибка отправки выигрыша в канал:', error);
    }
}

// ID канала для уведомлений (без символа @)
const NOTIFICATION_CHANNEL = '-1002637779020'; // или -100XXXXXXXXXX если есть числовой ID

// Функция отправки уведомлений в канал
async function notifyAdmins(message) {
    try {
        // Форматируем сообщение для канала
        const channelMessage = `🔔 🎉 ${message}`;
        
        // Отправляем в канал
        await bot.sendMessage(NOTIFICATION_CHANNEL, channelMessage, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        
        console.log(`✅ Уведомление отправлено в канал: ${message}`);
    } catch (error) {
        console.error('❌ Ошибка отправки уведомления в канал:', error);
        
        // Fallback: отправляем админам как раньше, если канал недоступен
        const ADMIN_IDS = process.env.ADMIN_IDS ? 
            process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : 
            [];
            
        ADMIN_IDS.forEach(async (adminId) => {
            try {
                await bot.sendMessage(adminId, `🔔 ${message}`);
            } catch (adminError) {
                console.error(`❌ Ошибка отправки админу ${adminId}:`, adminError);
            }
        });
    }
}

// Обработка ошибок Express
app.use((error, req, res, next) => {
    console.error('❌ Express ошибка:', error);
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера', 
        message: process.env.NODE_ENV === 'development' ? error.message : 'Что-то пошло не так'
    });
});

// Глобальный обработчик ошибок - должен быть перед 404 handler
app.use((err, req, res, next) => {
    // Логируем полную ошибку только в консоль (для дебага)
    console.error('❌ Глобальная ошибка:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    
    // Определяем статус код
    const statusCode = err.statusCode || err.status || 500;
    
    // Безопасный ответ клиенту (без stack trace)
    const errorResponse = {
        error: 'Внутренняя ошибка сервера',
        timestamp: new Date().toISOString()
    };
    
    // В режиме разработки добавляем больше деталей
    if (process.env.NODE_ENV === 'development') {
        errorResponse.message = err.message;
        errorResponse.details = 'Проверьте логи сервера для подробностей';
    }
    
    res.status(statusCode).json(errorResponse);
});

// 404 handler
app.use((req, res) => {
    console.log(`❌ 404: ${req.method} ${req.url}`);
    res.status(404).json({ 
        error: 'Страница не найдена', 
        url: req.url,
        timestamp: new Date().toISOString()
    });
});

// === ЗАПУСК СЕРВЕРА ===

// Переменная для фоновых задач
let backgroundTasks = null;
let sponsorAutomation = null;
let winsChannelManager = null;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🎉 KOSMETICHKA LOTTERY BOT ЗАПУЩЕН!');
    console.log('=====================================');
    console.log(`   📡 Порт: ${PORT}`);
    console.log(`   🌐 URL: ${WEBAPP_URL}`);
    console.log(`   🤖 Бот: ${bot ? '✅ Подключен' : '❌ Ошибка'}`);
    console.log(`   📁 Static: ${fs.existsSync(publicPath) ? '✅' : '❌'}`);
    console.log(`   👑 Admin: ${WEBAPP_URL}/admin`);
    console.log(`   ⚡ Готов к работе!`);
    console.log('\n🔗 Для тестирования:');
    console.log(`   • Health: ${WEBAPP_URL}/health`);
    console.log(`   • Debug: ${WEBAPP_URL}/debug`);
    console.log('=====================================\n');
    
    // Запускаем фоновые задачи только если бот инициализирован
    if (bot) {
        (async () => {
            try {
                backgroundTasks = new BackgroundTaskManager(db, bot);
                console.log('🔄 Фоновые задачи запущены');
                
                // Запускаем автоматизацию спонсоров
                sponsorAutomation = new SponsorAutomation(bot);
                console.log('🤖 Автоматизация спонсоров запущена');
                
                // Запускаем систему постинга выигрышей
                winsChannelManager = new WinsChannelManager(bot);
                // Инициализируем колонки БД для постинга
                await winsChannelManager.addPostedColumn();
                console.log('🏆 Система постинга выигрышей запущена');
                
                // Запускаем систему мониторинга подписок
                await startSubscriptionMonitoring();
                console.log('🔍 Система мониторинга подписок запущена');
            } catch (error) {
                console.error('❌ Ошибка запуска фоновых задач:', error);
            }
        })();
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Получен сигнал SIGTERM, завершаем работу...');
    botPolling = false;
    
    if (backgroundTasks) {
        backgroundTasks.stopAllTasks();
    }
    
    server.close(() => {
        if (bot) {
            bot.stopPolling().catch(console.error);
        }
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 Получен сигнал SIGINT, завершаем работу...');
    botPolling = false;
    
    if (backgroundTasks) {
        backgroundTasks.stopAllTasks();
    }
    
    server.close(() => {
        if (bot) {
            bot.stopPolling().catch(console.error);
        }
        process.exit(0);
    });
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// === СИСТЕМА ШТРАФОВ ЗА ОТПИСКУ ===

// Периодическая проверка подписок (запускается каждые 6 часов)
async function startSubscriptionMonitoring() {
    console.log('🔍 Запуск системы мониторинга подписок...');
    
    // Проверяем каждые 12 часов (4 раза за 48 часов)
    setInterval(async () => {
        await checkAllUsersSubscriptions();
        await checkAndRewardActiveSubscriptions();
    }, 12 * 60 * 60 * 1000);

    // Первый запуск через 5 минут после старта сервера
    setTimeout(() => {
        checkAllUsersSubscriptions();
        checkAndRewardActiveSubscriptions();
    }, 5 * 60 * 1000);
}

async function checkAllUsersSubscriptions() {
    try {
        console.log('🔍 Начало проверки всех подписок пользователей...');
        
        // Получаем всех пользователей с активными подписками
        const activeSubscriptions = await new Promise((resolve, reject) => {
            db.db.all(`
                SELECT ucs.*, u.telegram_id, pc.channel_username, pc.channel_name
                FROM user_channel_subscriptions ucs
                JOIN users u ON ucs.user_id = u.id  
                JOIN partner_channels pc ON ucs.channel_id = pc.id
                WHERE ucs.is_active = 1 AND ucs.is_verified = 1
                AND ucs.subscribed_date <= datetime('now', '-1 hour')
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        console.log(`📊 Найдено ${activeSubscriptions.length} активных подписок для проверки`);

        let violationsFound = 0;
        
        for (const subscription of activeSubscriptions) {
            try {
                // Проверяем, подписан ли пользователь все еще
                const subscriptionCheck = await checkUserChannelSubscription(
                    subscription.telegram_id, 
                    subscription.channel_username
                );

                if (!subscriptionCheck.isSubscribed) {
                    // Пользователь отписался! Применяем штраф
                    console.log(`⚠️ Пользователь ${subscription.telegram_id} отписался от ${subscription.channel_username}`);
                    
                    await applyUnsubscriptionPenalty(subscription);
                    violationsFound++;
                }

            } catch (error) {
                console.warn(`Ошибка проверки подписки ${subscription.id}:`, error.message);
            }
        }

        console.log(`✅ Проверка завершена. Найдено нарушений: ${violationsFound}`);

    } catch (error) {
        console.error('❌ Ошибка системы мониторинга подписок:', error);
    }
}

// Функция проверки и начисления звезд за подписку на канал (каждые 12 часов)
async function checkAndRewardActiveSubscriptions() {
    try {
        console.log('🎁 Проверка и начисление звезд за активные подписки...');
        
        // Получаем канал из заданий для проверки
        const taskChannel = await new Promise((resolve, reject) => {
            db.db.get(`
                SELECT * FROM partner_channels 
                WHERE channel_username = 'kosmetichka_spin' 
                AND is_active = 1
                LIMIT 1
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!taskChannel) {
            console.log('❌ Канал для задания не найден');
            return;
        }

        // Получаем всех пользователей
        const users = await new Promise((resolve, reject) => {
            db.db.all(`
                SELECT id, telegram_id FROM users 
                WHERE is_active = 1
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        let rewardedCount = 0;
        let checkCount = 0;

        for (const user of users) {
            try {
                // Проверяем подписку на канал
                const subscriptionCheck = await checkUserChannelSubscription(
                    user.telegram_id, 
                    taskChannel.channel_username
                );

                if (subscriptionCheck.isSubscribed) {
                    // Проверяем, получал ли пользователь награду в последние 12 часов
                    const lastReward = await new Promise((resolve, reject) => {
                        db.db.get(`
                            SELECT * FROM subscription_rewards 
                            WHERE user_id = ? 
                            AND channel_id = ?
                            AND created_at > datetime('now', '-12 hours')
                            ORDER BY created_at DESC
                            LIMIT 1
                        `, [user.id, taskChannel.id], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });

                    // Если не получал награду в последние 12 часов и подписан
                    if (!lastReward) {
                        // Начисляем 20 звезд
                        await new Promise((resolve, reject) => {
                            db.db.run(`
                                UPDATE users 
                                SET stars = stars + 20,
                                    total_stars_earned = total_stars_earned + 20
                                WHERE id = ?
                            `, [user.id], (err) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        });

                        // Записываем информацию о награде
                        await new Promise((resolve, reject) => {
                            db.db.run(`
                                INSERT INTO subscription_rewards (user_id, channel_id, stars_earned, created_at)
                                VALUES (?, ?, 20, datetime('now'))
                            `, [user.id, taskChannel.id], (err) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        });

                        rewardedCount++;
                        console.log(`✅ Пользователь ${user.telegram_id} получил 20 звезд за подписку`);

                        // Проверяем количество начислений за последние 48 часов
                        const rewardCount = await new Promise((resolve, reject) => {
                            db.db.get(`
                                SELECT COUNT(*) as count 
                                FROM subscription_rewards 
                                WHERE user_id = ? 
                                AND channel_id = ?
                                AND created_at > datetime('now', '-48 hours')
                            `, [user.id, taskChannel.id], (err, row) => {
                                if (err) reject(err);
                                else resolve(row ? row.count : 0);
                            });
                        });

                        // Если получил 4 награды за 48 часов, уведомляем
                        if (rewardCount >= 4) {
                            try {
                                await bot.sendMessage(user.telegram_id, 
                                    '🎉 Поздравляем! Вы получили максимум звезд за подписку на канал за последние 48 часов!\n\n' +
                                    'Продолжайте играть и выигрывать призы! 🎰'
                                );
                            } catch (e) {
                                console.warn(`Не удалось отправить уведомление пользователю ${user.telegram_id}`);
                            }
                        }
                    }
                    checkCount++;
                }
            } catch (error) {
                console.warn(`Ошибка проверки подписки для пользователя ${user.id}:`, error.message);
            }
        }

        console.log(`✅ Проверка завершена. Проверено: ${checkCount}, Награждено: ${rewardedCount}`);

    } catch (error) {
        console.error('❌ Ошибка начисления звезд за подписки:', error);
    }
}

async function applyUnsubscriptionPenalty(subscription) {
    try {
        // Деактивируем подписку
        await new Promise((resolve, reject) => {
            db.db.run(`
                UPDATE user_channel_subscriptions 
                SET is_active = 0, unsubscribed_date = datetime('now')
                WHERE id = ?
            `, [subscription.id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Уменьшаем счетчик подписчиков канала
        await new Promise((resolve, reject) => {
            db.db.run(`
                UPDATE partner_channels 
                SET current_subscribers = CASE 
                    WHEN current_subscribers > 0 THEN current_subscribers - 1 
                    ELSE 0 
                END
                WHERE id = ?
            `, [subscription.channel_id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Проверяем количество нарушений пользователя
        const userViolations = await new Promise((resolve, reject) => {
            db.db.get(`
                SELECT violation_count FROM users WHERE telegram_id = ?
            `, [subscription.telegram_id], (err, row) => {
                if (err) reject(err);
                else resolve(row?.violation_count || 0);
            });
        });

        // Рассчитываем штраф в зависимости от количества нарушений
        let penaltyHours = 12; // Базовый штраф 12 часов
        if (userViolations >= 1) penaltyHours = 24;
        if (userViolations >= 2) penaltyHours = 48;
        if (userViolations >= 3) penaltyHours = 72;

        // Применяем блокировку заданий
        const banUntil = new Date(Date.now() + penaltyHours * 60 * 60 * 1000);
        
        await new Promise((resolve, reject) => {
            db.db.run(`
                UPDATE users SET 
                    tasks_ban_until = ?,
                    violation_count = violation_count + 1
                WHERE telegram_id = ?
            `, [banUntil.toISOString(), subscription.telegram_id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Записываем нарушение в лог
        await new Promise((resolve, reject) => {
            db.db.run(`
                INSERT INTO subscription_violations 
                (user_id, channel_id, violation_type, penalty_duration) 
                VALUES (?, ?, 'early_unsubscribe', ?)
            `, [subscription.user_id, subscription.channel_id, penaltyHours], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log(`🚫 Применен штраф пользователю ${subscription.telegram_id}: блокировка на ${penaltyHours} часов`);

        // Отправляем уведомление пользователю
        try {
            await bot.sendMessage(subscription.telegram_id, 
                `⚠️ <b>Внимание!</b>\n\n` +
                `Вы отписались от канала "${subscription.channel_name}".\n` +
                `За досрочную отписку применена блокировка заданий на ${penaltyHours} часов.\n\n` +
                `Блокировка действует до: ${banUntil.toLocaleString('ru-RU')}\n\n` +
                `Чтобы избежать штрафов в будущем, не отписывайтесь от каналов раньше времени.`,
                { parse_mode: 'HTML' }
            );
        } catch (notificationError) {
            console.warn(`Не удалось отправить уведомление пользователю ${subscription.telegram_id}:`, notificationError.message);
        }

    } catch (error) {
        console.error(`❌ Ошибка применения штрафа для подписки ${subscription.id}:`, error);
    }
}

// === API ДЛЯ ПРОВЕРКИ ПОДПИСОК ===

// Проверить все подписки пользователя и выдать награды
app.post('/api/check-user-subscriptions', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        console.log(`🔍 Проверка всех подписок для пользователя ${userId}`);
        
        // Получаем все активные каналы-партнеры
        const channels = await new Promise((resolve, reject) => {
            db.db.all(`
                SELECT * FROM partner_channels 
                WHERE is_active = 1 
                ORDER BY created_date DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        const results = [];
        let newSubscriptions = 0;
        let totalReward = 0;

        for (const channel of channels) {
            try {
                // Проверяем подписку
                const subscriptionCheck = await checkUserChannelSubscription(userId, channel.channel_username);
                
                // Проверяем, не получал ли пользователь уже награду за этот канал
                const existingSubscription = await new Promise((resolve, reject) => {
                    db.db.get(`
                        SELECT * FROM user_channel_subscriptions 
                        WHERE user_id = ? AND channel_id = ? AND is_active = 1
                    `, [userId, channel.id], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                if (subscriptionCheck.isSubscribed && !existingSubscription) {
                    // Новая подписка! Выдаем награду
                    await new Promise((resolve, reject) => {
                        db.db.run(`
                            INSERT INTO user_channel_subscriptions 
                            (user_id, channel_id, stars_earned, is_verified) 
                            VALUES (?, ?, ?, 1)
                        `, [userId, channel.id, channel.reward_stars], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });

                    // Добавляем звезды пользователю
                    await new Promise((resolve, reject) => {
                        db.db.run(`
                            UPDATE users SET stars = stars + ? WHERE telegram_id = ?
                        `, [channel.reward_stars, userId], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });

                    // Обновляем счетчик подписчиков канала
                    await new Promise((resolve, reject) => {
                        db.db.run(`
                            UPDATE partner_channels SET current_subscribers = current_subscribers + 1 
                            WHERE id = ?
                        `, [channel.id], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });

                    newSubscriptions++;
                    totalReward += channel.reward_stars;

                    console.log(`✅ Награда за подписку на ${channel.channel_name}: ${channel.reward_stars} звезд`);
                }

                results.push({
                    channel: channel.channel_name,
                    username: channel.channel_username,
                    isSubscribed: subscriptionCheck.isSubscribed,
                    rewardGiven: subscriptionCheck.isSubscribed && !existingSubscription,
                    reward: subscriptionCheck.isSubscribed && !existingSubscription ? channel.reward_stars : 0
                });

            } catch (error) {
                console.error(`❌ Ошибка проверки канала ${channel.channel_username}:`, error);
                results.push({
                    channel: channel.channel_name,
                    username: channel.channel_username,
                    isSubscribed: false,
                    rewardGiven: false,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            newSubscriptions,
            totalReward,
            results
        });

    } catch (error) {
        console.error('❌ Ошибка проверки подписок:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получить информацию о канале (включая аватарку)
app.get('/api/channel-info/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const channelId = username.startsWith('@') ? username : `@${username}`;
        
        const chat = await bot.getChat(channelId);
        
        let photoUrl = null;
        if (chat.photo && chat.photo.big_file_id) {
            try {
                const file = await bot.getFile(chat.photo.big_file_id);
                photoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
            } catch (photoError) {
                console.warn(`Не удалось получить фото канала ${channelId}:`, photoError.message);
            }
        }

        res.json({
            success: true,
            channel: {
                id: chat.id,
                title: chat.title,
                username: chat.username,
                description: chat.description,
                photo_url: photoUrl,
                member_count: chat.member_count || 0
            }
        });

    } catch (error) {
        console.error(`❌ Ошибка получения информации о канале ${username}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// === ФУНКЦИИ ДЛЯ СИСТЕМЫ ЗАДАНИЙ ===

// Проверка подписки пользователя на канал через Bot API
async function checkUserChannelSubscription(userId, channelUsername) {
    try {
        console.log(`🔍 Проверка подписки пользователя ${userId} на канал @${channelUsername}`);
        
        // Добавляем @ если его нет
        const channelId = channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`;
        
        const chatMember = await bot.getChatMember(channelId, userId);
        console.log(`📋 Статус пользователя ${userId} в канале ${channelId}:`, chatMember.status);
        
        // Проверяем статус участника
        const isSubscribed = ['creator', 'administrator', 'member'].includes(chatMember.status);
        
        return {
            isSubscribed: isSubscribed,
            status: chatMember.status,
            channelId: channelId
        };
        
    } catch (error) {
        console.error(`❌ Ошибка проверки подписки на канал @${channelUsername}:`, error.message);
        
        // Если канал приватный или бот не админ, считаем что не подписан
        if (error.message.includes('Bad Request: chat not found') || 
            error.message.includes('Forbidden')) {
            console.warn(`⚠️ Канал @${channelUsername} недоступен для проверки`);
            return {
                isSubscribed: false,
                status: 'unknown',
                error: 'channel_unavailable'
            };
        }
        
        return {
            isSubscribed: false,
            status: 'error',
            error: error.message
        };
    }
}

// Обработка выполнения задания подписки на канал
async function handleChannelSubscriptionTask(userId, channelId, userData) {
    try {
        console.log(`🎯 Обработка задания подписки: пользователь ${userId}, канал ${channelId}`);
        
        const user = await db.getUser(userId);
        if (!user) {
            console.error(`❌ Пользователь ${userId} не найден в БД`);
            return { success: false, error: 'User not found' };
        }
        
        // Проверяем, не заблокированы ли задания
        const isBanned = await db.isUserTasksBanned(user.id);
        if (isBanned) {
            console.log(`⛔ Пользователь ${userId} заблокирован для выполнения заданий`);
            return { success: false, error: 'Tasks banned' };
        }
        
        // Получаем информацию о канале-партнере
        const channels = await db.getActivePartnerChannels();
        const channel = channels.find(c => c.id == channelId);
        
        if (!channel) {
            console.error(`❌ Канал с ID ${channelId} не найден или неактивен`);
            return { success: false, error: 'Channel not found' };
        }
        
        // Проверяем, не выполнял ли уже это задание
        const existingSubscription = await db.checkUserSubscription(user.id, channelId);
        if (existingSubscription) {
            console.log(`ℹ️ Пользователь ${userId} уже подписан на канал ${channel.channel_username}`);
            return { success: false, error: 'Already subscribed' };
        }
        
        // Проверяем подписку через Bot API
        const subscriptionCheck = await checkUserChannelSubscription(userId, channel.channel_username);
        
        if (!subscriptionCheck.isSubscribed) {
            console.log(`❌ Пользователь ${userId} НЕ подписан на канал @${channel.channel_username}`);
            return { 
                success: false, 
                error: 'Not subscribed',
                channelUsername: channel.channel_username
            };
        }
        
        // Рассчитываем награду (с учетом горячего предложения)
        let rewardStars = channel.reward_stars;
        if (channel.is_hot_offer) {
            rewardStars = Math.floor(rewardStars * channel.hot_offer_multiplier);
            console.log(`🔥 Горячее предложение! Награда увеличена до ${rewardStars} звезд`);
        }
        
        // Сохраняем подписку в БД
        await db.addUserChannelSubscription(user.id, channelId, rewardStars);
        console.log(`✅ Подписка сохранена: пользователь ${userId}, канал ${channel.channel_username}`);
        
        // Обновляем счетчик подписчиков канала
        await db.updatePartnerChannelSubscribers(channelId, 1);
        
        // Начисляем звезды пользователю
        await db.updateUserStars(userId, rewardStars);
        console.log(`⭐ Начислено ${rewardStars} звезд пользователю ${userId}`);
        
        // Проверяем и разблокируем достижения
        const unlockedAchievements = await db.checkAndUnlockAchievements(user.id);
        let achievementStars = 0;
        
        if (unlockedAchievements.length > 0) {
            achievementStars = unlockedAchievements.reduce((sum, ach) => sum + ach.stars, 0);
            await db.updateUserStars(userId, achievementStars);
            console.log(`🏆 Разблокированы достижения на ${achievementStars} звезд:`, unlockedAchievements.map(a => a.key));
        }
        
        // Проверяем активацию реферера (если это 2-я подписка)
        const userSubscriptions = await db.getUserChannelSubscriptions(user.id);
        if (userSubscriptions.length === 2 && user.referrer_id && !user.is_referrer_verified) {
            // Активируем реферера
            await new Promise((resolve, reject) => {
                db.db.run(
                    'UPDATE users SET is_referrer_verified = 1 WHERE id = ?',
                    [user.id],
                    (err) => err ? reject(err) : resolve()
                );
            });
            
            // Награждаем реферера 20 звездами
            await db.updateUserStars(user.referrer_id, 20);
            
            console.log(`👥 Активирован реферер пользователя ${userId} после 2-й подписки, выдано 20 звезд`);
            
            // Отправляем уведомление рефереру
            try {
                const referrer = await db.getUser(user.referrer_id);
                if (referrer) {
                    await bot.sendMessage(
                        referrer.telegram_id,
                        `🎉 Ваш друг выполнил 2 подписки и активировался!\n\n+20 звезд за активного реферала!\n\nПриглашайте еще друзей и получайте больше наград! 🎁`
                    );
                }
            } catch (notifyError) {
                console.warn('⚠️ Не удалось уведомить реферера:', notifyError.message);
            }
        }
        
        // Обновляем прогресс ежедневных заданий
        await db.updateDailyTaskProgress(user.id, 'daily_login', 1); // За выполнение любого задания
        
        if (channel.is_hot_offer) {
            await db.updateDailyTaskProgress(user.id, 'daily_hot_offer', 1);
        }
        
        console.log(`🎉 Задание выполнено успешно: ${rewardStars} звезд + ${achievementStars} за достижения`);
        
        return {
            success: true,
            starsEarned: rewardStars,
            achievementStars: achievementStars,
            achievements: unlockedAchievements,
            channelName: channel.channel_name,
            isHotOffer: channel.is_hot_offer
        };
        
    } catch (error) {
        console.error(`❌ Ошибка обработки задания подписки:`, error);
        return { success: false, error: 'Internal error' };
    }
}

// Массовая проверка подписок (для фоновых процессов)
async function checkAllUserSubscriptions(userId) {
    try {
        console.log(`🔄 Массовая проверка подписок пользователя ${userId}`);
        
        const user = await db.getUser(userId);
        if (!user) return;
        
        const userSubscriptions = await db.getUserChannelSubscriptions(user.id);
        const violations = [];
        
        for (const subscription of userSubscriptions) {
            const subscriptionAge = Date.now() - new Date(subscription.subscribed_date).getTime();
            const minAge = 72 * 60 * 60 * 1000; // 72 часа в миллисекундах
            
            // Проверяем только подписки старше 72 часов
            if (subscriptionAge >= minAge) {
                const checkResult = await checkUserChannelSubscription(
                    user.telegram_id, 
                    subscription.channel_username
                );
                
                if (!checkResult.isSubscribed) {
                    console.log(`❌ Пользователь ${userId} отписался от канала @${subscription.channel_username}`);
                    violations.push({
                        channelId: subscription.channel_id,
                        channelUsername: subscription.channel_username,
                        subscriptionDate: subscription.subscribed_date
                    });
                }
            }
        }
        
        // Обрабатываем нарушения
        if (violations.length > 0) {
            await handleSubscriptionViolations(user, violations);
        }
        
        return violations.length;
        
    } catch (error) {
        console.error(`❌ Ошибка массовой проверки подписок пользователя ${userId}:`, error);
        return -1;
    }
}

// Обработка нарушений подписок
async function handleSubscriptionViolations(user, violations) {
    try {
        console.log(`⚠️ Обработка ${violations.length} нарушений пользователя ${user.telegram_id}`);
        
        const currentViolationCount = user.violation_count || 0;
        let penaltyHours = 12; // По умолчанию 12 часов (уменьшено)
        
        // Рассчитываем штраф по прогрессии (уменьшено)
        if (currentViolationCount === 0) {
            penaltyHours = 12; // 1-е нарушение - 12 часов
        } else if (currentViolationCount === 1) {
            penaltyHours = 24; // 2-е нарушение - 1 день
        } else {
            penaltyHours = 72; // 3+ нарушений - 3 дня
        }
        
        // Записываем нарушения в БД
        for (const violation of violations) {
            await db.addSubscriptionViolation(
                user.id, 
                violation.channelId, 
                'early_unsubscribe', 
                penaltyHours
            );
            
            // Деактивируем подписку
            await new Promise((resolve, reject) => {
                db.db.run(
                    'UPDATE user_channel_subscriptions SET is_active = 0, unsubscribed_date = CURRENT_TIMESTAMP WHERE user_id = ? AND channel_id = ?',
                    [user.id, violation.channelId],
                    (err) => err ? reject(err) : resolve()
                );
            });
        }
        
        // Применяем бан на задания
        await db.updateUserTasksBan(user.id, penaltyHours);
        
        // Уведомляем пользователя
        const violationsList = violations.map(v => `@${v.channelUsername}`).join(', ');
        let penaltyText = '';
        
        if (penaltyHours === 12) {
            penaltyText = '12 часов';
        } else if (penaltyHours === 24) {
            penaltyText = '1 день';
        } else {
            penaltyText = '3 дня';
        }
        
        try {
            await bot.sendMessage(
                user.telegram_id,
                `⚠️ **Нарушение правил подписок**\n\n` +
                `Вы отписались от каналов: ${violationsList}\n` +
                `до истечения минимального срока подписки (72 часа).\n\n` +
                `**Блокировка заданий на ${penaltyText}**\n\n` +
                `Повторные нарушения приведут к увеличению срока блокировки.\n\n` +
                `⚡ Подпишитесь обратно, чтобы избежать штрафов в будущем.`,
                { parse_mode: 'Markdown' }
            );
        } catch (notifyError) {
            console.warn('⚠️ Не удалось уведомить о нарушении:', notifyError.message);
        }
        
        console.log(`🚫 Применен бан на ${penaltyHours} часов для пользователя ${user.telegram_id}`);
        
    } catch (error) {
        console.error('❌ Ошибка обработки нарушений подписок:', error);
    }
}

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

console.log('🚀 Kosmetichka Lottery Bot инициализация завершена!');

// Запускаем polling после инициализации сервера
setTimeout(() => {
    startPolling();
}, 2000); // Ждем 2 секунды после запуска сервера

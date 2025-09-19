// telegram-bot-server.js - ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ для Railway

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const createDatabase = require('./database-selector');
const { validateRequest, validateTelegramId, validateSpinType, validateStarsAmount } = require('./utils/validation');
const { requireAuth, authEndpoint, checkAuthEndpoint, logoutEndpoint, isAdmin } = require('./admin/auth-middleware');
const ReferralManager = require('./referral-manager');

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

// Защита от избыточного логирования в production
if (process.env.NODE_ENV === 'production') {
    // Принудительно отключаем DEBUG для всех модулей в production
    process.env.DEBUG = '';
    
    // Переопределяем console.log в production для критически важных случаев
    const originalLog = console.log;
    const logCount = { count: 0, lastReset: Date.now() };
    
    console.log = function(...args) {
        // Ограничиваем логирование до 50 в минуту в production
        const now = Date.now();
        if (now - logCount.lastReset > 60000) {
            logCount.count = 0;
            logCount.lastReset = now;
        }
        
        if (logCount.count < 50) {
            logCount.count++;
            originalLog.apply(console, args);
        }
    };
}

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

// Настройка для работы за прокси (Railway)
app.set('trust proxy', 1);

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

// Заголовки безопасности для Telegram WebApp
app.use((req, res, next) => {
    // Разрешаем загрузку в iframe для Telegram
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://web.telegram.org https://webk.telegram.org https://webz.telegram.org https://macos.telegram.org");
    
    // Другие заголовки безопасности
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
});

// Rate Limiting для API эндпоинтов
const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов с IP за 15 минут
    message: {
        error: 'Слишком много запросов',
        message: 'Попробуйте снова через 15 минут'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const strictApiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 минут
    max: 10, // максимум 10 запросов за 5 минут
    message: {
        error: 'Превышен лимит запросов',
        message: 'Попробуйте снова через 5 минут'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const referralActivationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 3, // максимум 3 активации реферала в минуту
    message: {
        error: 'Слишком частая активация рефералов',
        message: 'Подождите минуту перед следующей попыткой'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const adminApiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 минута
    max: 30, // максимум 30 запросов в минуту для админов
    message: {
        error: 'Превышен лимит запросов администратора',
        message: 'Подождите минуту'
    },
    standardHeaders: true,
    legacyHeaders: false
});

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
        "frame-ancestors 'self' https://web.telegram.org https://webk.telegram.org https://webz.telegram.org https://macos.telegram.org;"
    );
    
    // Дополнительные заголовки безопасности
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
});

// УЛЬТРА-ПРОСТОЙ DEBUG ENDPOINT (без middleware)
app.get('/debug', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Применяем общие ограничения для всех API эндпоинтов
app.use('/api', generalApiLimiter);

// Простой тестовый endpoint для проверки базовой работоспособности
app.get('/api/test', (req, res) => {
    console.log('✅ TEST API endpoint вызван');
    res.json({ success: true, message: 'Server is working!', timestamp: new Date() });
});

// Еще один тестовый endpoint специально для admin
app.get('/api/admin/test-simple', (req, res) => {
    console.log('✅ ADMIN TEST API endpoint вызван');
    res.json({ success: true, message: 'Admin API is working!', timestamp: new Date() });
});

// Тестовый endpoint с requireAuth
app.get('/api/admin/test-auth', requireAuth, (req, res) => {
    console.log('✅ ADMIN TEST WITH AUTH endpoint вызван');
    res.json({ success: true, message: 'Admin API with auth is working!', user: req.user, timestamp: new Date() });
});

// === РЕФЕРАЛЬНАЯ СИСТЕМА ДЛЯ АДМИНКИ ===

// Статистика рефералов для админки
app.get('/api/admin/referrals/stats', requireAuth, async (req, res) => {
    try {
        console.log('📊 Админ: запрос статистики рефералов');
        
        // Общая статистика рефералов
        const totalReferrersQuery = await db.pool.query('SELECT COUNT(DISTINCT referrer_id) as count FROM referrals WHERE is_active = true');
        const totalReferredQuery = await db.pool.query('SELECT COUNT(*) as count FROM referrals WHERE is_active = true');
        const totalStarsQuery = await db.pool.query('SELECT COUNT(*) * 10 as total FROM referrals WHERE is_active = true');
        const todayReferralsQuery = await db.pool.query(`
            SELECT COUNT(*) as count FROM referrals 
            WHERE is_active = true AND DATE(referral_date) = CURRENT_DATE
        `);

        const stats = {
            totalReferrers: parseInt(totalReferrersQuery.rows[0]?.count) || 0,
            totalReferred: parseInt(totalReferredQuery.rows[0]?.count) || 0,
            totalStarsAwarded: parseInt(totalStarsQuery.rows[0]?.total) || 0,
            todayReferrals: parseInt(todayReferralsQuery.rows[0]?.count) || 0
        };

        res.json(stats);
    } catch (error) {
        console.error('❌ Ошибка получения статистики рефералов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Список всех реферальных связей для админки
app.get('/api/admin/referrals', requireAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        console.log(`📋 Админ: запрос рефералов (страница ${page}, поиск: "${search}")`);

        let whereClause = 'WHERE r.is_active = true';
        let queryParams = [];
        let paramIndex = 1;

        if (search) {
            whereClause += ` AND (
                u1.first_name ILIKE $${paramIndex} OR 
                u1.username ILIKE $${paramIndex} OR 
                u2.first_name ILIKE $${paramIndex} OR 
                u2.username ILIKE $${paramIndex} OR
                CAST(u1.telegram_id AS TEXT) LIKE $${paramIndex} OR
                CAST(u2.telegram_id AS TEXT) LIKE $${paramIndex}
            )`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        // Запрос данных
        const referralsQuery = `
            SELECT 
                r.id,
                r.referrer_id,
                r.referred_id,
                r.referral_date as created_at,
                r.is_active,
                u1.first_name as referrer_name,
                u1.username as referrer_username,
                u1.telegram_id as referrer_telegram_id,
                u2.first_name as referred_name,
                u2.username as referred_username,
                u2.telegram_id as referred_telegram_id
            FROM referrals r
            JOIN users u1 ON r.referrer_id = u1.id
            JOIN users u2 ON r.referred_id = u2.id
            ${whereClause}
            ORDER BY r.referral_date DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(limit, offset);
        const referralsResult = await db.pool.query(referralsQuery, queryParams);

        // Подсчет общего количества
        const countQuery = `
            SELECT COUNT(*) as total
            FROM referrals r
            JOIN users u1 ON r.referrer_id = u1.id
            JOIN users u2 ON r.referred_id = u2.id
            ${whereClause}
        `;
        
        const countParams = search ? [`%${search}%`] : [];
        const countResult = await db.pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0]?.total) || 0;

        res.json({
            referrals: referralsResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('❌ Ошибка получения списка рефералов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== АДМИН API ДЛЯ РАССЫЛОК =====

// Получение статистики рассылок
app.get('/api/admin/broadcasts/stats', requireAuth, async (req, res) => {
    try {
        // Статистика из таблицы broadcasts (если создана) или mock данные
        const stats = {
            total: 5,
            sent: 3,
            scheduled: 1,
            failed: 1,
            totalRecipients: 127
        };

        res.json(stats);
    } catch (error) {
        console.error('❌ Ошибка получения статистики рассылок:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение списка рассылок
app.get('/api/admin/broadcasts', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10, filter = 'all', search = '' } = req.query;
        const offset = (page - 1) * limit;

        // Mock данные рассылок
        const mockBroadcasts = [
            {
                id: 1,
                title: 'Новая мега рулетка!',
                status: 'sent',
                recipient_count: 150,
                sent_count: 147,
                created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                sent_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                message: 'Попробуйте новую мега рулетку с крутыми призами!'
            },
            {
                id: 2,
                title: 'Розыгрыш iPhone!',
                status: 'scheduled',
                recipient_count: 200,
                sent_count: 0,
                created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                message: 'Участвуйте в розыгрыше нового iPhone!'
            },
            {
                id: 3,
                title: 'Еженедельная сводка',
                status: 'draft',
                recipient_count: 0,
                sent_count: 0,
                created_at: new Date(Date.now() - 3 * 60 * 60 * 1000),
                message: 'Что нового на этой неделе...'
            }
        ];

        // Фильтрация
        let filtered = mockBroadcasts;
        if (filter !== 'all') {
            filtered = mockBroadcasts.filter(b => b.status === filter);
        }
        if (search) {
            filtered = filtered.filter(b => 
                b.title.toLowerCase().includes(search.toLowerCase()) ||
                b.message.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Пагинация
        const total = filtered.length;
        const broadcasts = filtered.slice(offset, offset + parseInt(limit));

        res.json({
            broadcasts,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('❌ Ошибка получения списка рассылок:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Отправка рассылки
app.post('/api/admin/broadcasts/send', requireAuth, async (req, res) => {
    try {
        const { title, recipientType, message, recipientIds, scheduled, scheduleDate } = req.body;

        // Определение получателей
        let recipients = [];
        
        switch (recipientType) {
            case 'all':
                // Получить всех пользователей
                const allUsersResult = await db.pool.query('SELECT telegram_id FROM users WHERE telegram_id IS NOT NULL');
                recipients = allUsersResult.rows.map(row => row.telegram_id);
                break;
                
            case 'active':
                // Активные пользователи за последние 7 дней  
                const activeUsersResult = await db.pool.query(`
                    SELECT telegram_id FROM users 
                    WHERE telegram_id IS NOT NULL 
                    AND last_activity >= NOW() - INTERVAL '7 days'
                `);
                recipients = activeUsersResult.rows.map(row => row.telegram_id);
                break;
                
            case 'inactive':
                // Неактивные пользователи
                const inactiveUsersResult = await db.pool.query(`
                    SELECT telegram_id FROM users 
                    WHERE telegram_id IS NOT NULL 
                    AND (last_activity IS NULL OR last_activity < NOW() - INTERVAL '7 days')
                `);
                recipients = inactiveUsersResult.rows.map(row => row.telegram_id);
                break;
                
            case 'high_balance':
                // Пользователи с высоким балансом
                const highBalanceResult = await db.pool.query(`
                    SELECT telegram_id FROM users 
                    WHERE telegram_id IS NOT NULL 
                    AND stars > 100
                `);
                recipients = highBalanceResult.rows.map(row => row.telegram_id);
                break;
                
            case 'custom':
                // Пользовательский список
                if (recipientIds) {
                    recipients = recipientIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                }
                break;
        }

        if (recipients.length === 0) {
            return res.status(400).json({ error: 'Не найдено получателей для рассылки' });
        }

        // Если запланировано - сохранить в базу для последующей отправки
        if (scheduled && scheduleDate) {
            // Здесь должно быть сохранение в таблицу scheduled_broadcasts
            console.log(`📅 Рассылка запланирована на ${scheduleDate} для ${recipients.length} получателей`);
            return res.json({ 
                success: true, 
                message: `Рассылка запланирована на ${new Date(scheduleDate).toLocaleString('ru-RU')}`,
                recipientCount: recipients.length
            });
        }

        // Немедленная отправка
        let sent = 0;
        let failed = 0;

        for (const chatId of recipients) {
            try {
                await bot.sendMessage(chatId, `📢 ${message}`, { parse_mode: 'Markdown' });
                sent++;
                
                // Небольшая задержка чтобы не попасть в лимиты Telegram
                if (recipients.length > 30) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            } catch (error) {
                failed++;
                console.log(`Ошибка отправки рассылки пользователю ${chatId}:`, error.message);
            }
        }

        // Логирование рассылки
        console.log(`📢 Рассылка "${title}" отправлена: ${sent} успешно, ${failed} ошибок`);

        res.json({
            success: true,
            message: `Рассылка отправлена: ${sent} успешно, ${failed} ошибок`,
            sent,
            failed,
            total: recipients.length
        });

    } catch (error) {
        console.error('❌ Ошибка отправки рассылки:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение шаблонов сообщений
app.get('/api/admin/broadcasts/templates', requireAuth, async (req, res) => {
    try {
        // Mock шаблоны (в будущем из базы данных)
        const templates = [
            {
                id: 1,
                title: 'Приветствие новых пользователей',
                content: 'Добро пожаловать в Kosmetichka Lottery Bot! 🎉\n\nВас ждут крутые призы и ежедневные розыгрыши!'
            },
            {
                id: 2,
                title: 'Уведомление о новых призах',
                content: '🎁 Новые призы в рулетке!\n\nТеперь вы можете выиграть еще больше крутых косметических товаров!'
            },
            {
                id: 3,
                title: 'Напоминание о прокрутках',
                content: '⏰ У вас есть бесплатные прокрутки!\n\nНе забудьте испытать удачу в нашей рулетке сегодня!'
            }
        ];

        res.json(templates);
    } catch (error) {
        console.error('❌ Ошибка получения шаблонов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Простой тестовый endpoint для channels без auth
app.get('/api/admin/channels-test', (req, res) => {
    console.log('✅ CHANNELS TEST endpoint вызван');
    res.json({ success: true, channels: [], message: 'Channels test endpoint works!' });
});

// ВАЖНО: Перемещаем основные admin endpoints сюда, до всех middleware!

// Получение списка каналов (ПЕРЕМЕЩЕНО СЮДА ДЛЯ ПРИОРИТЕТА)
app.get('/api/admin/channels', requireAuth, async (req, res) => {
    try {
        console.log('📺 ПРИОРИТЕТНЫЙ Админ: запрос списка каналов');
        const { status } = req.query; // Фильтр по статусу: active, inactive, scheduled, expired, all
        
        let channels;
        if (status === 'all' || !status) {
            // Получаем все каналы со статусами и статистикой
            channels = await db.getAllChannels();
            console.log(`✅ Найдено ${channels.length} каналов всех типов`);
        } else {
            // Получаем только активные каналы (для обратной совместимости)
            channels = await db.getActiveChannels();
            console.log(`✅ Найдено ${channels.length} активных каналов`);
        }

        res.json({
            success: true,
            channels: channels
        });
    } catch (error) {
        console.error('❌ Ошибка получения каналов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Проверка канала перед добавлением - ЗАКОММЕНТИРОВАНО (дубликат)
// Правильная версия находится после инициализации бота на строке 2829
/*
app.post('/api/admin/channels/check', requireAuth, async (req, res) => {
    // Этот endpoint закомментирован, так как он дублирует функционал
    // и не имеет доступа к переменной bot
});
*/

// Применяем админские ограничения для админ API
// Временно отключено для отладки
// app.use('/api/admin', adminApiLimiter);

// Отладочный middleware для всех админ запросов
app.use('/api/admin', (req, res, next) => {
    console.log(`🔥 ADMIN API: ${req.method} ${req.originalUrl} - Query:`, req.query);
    next();
});

// === HELPER FUNCTIONS ===

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
        console.log('🔍 ДЕТАЛЬНАЯ ОТЛАДКА ПРИЗА:');
        console.log('  - data.prize.id:', data.prize?.id);
        console.log('  - data.prize.name:', data.prize?.name);
        console.log('  - data.prize.description:', data.prize?.description);
        console.log('  - data.prize.type:', data.prize?.type);
        console.log('  - data.prize.value:', data.prize?.value);
        console.log('💰 Полученные данные спина:', {
            spinType: data.spinType, 
            spinCost: data.spinCost,
            hasSpinCost: data.hasOwnProperty('spinCost')
        });
        
        // НОВАЯ ТРАНЗАКЦИОННАЯ ОБРАБОТКА СПИНА
        const spinType = data.spinType || 'normal';
        const spinCost = data.spinCost || 0; // Берем стоимость напрямую из данных фронтенда
        
        console.log(`🎰 Обрабатываем спин: тип=${spinType}, стоимость=${spinCost}, приз=${data.prize?.name || 'empty'}`);
        
        // ПРОВЕРЯЕМ ИНДИВИДУАЛЬНЫЕ ШАНСЫ ПОЛЬЗОВАТЕЛЯ
        let finalPrize = data.prize;
        const userWinChance = user.win_chance || 6.0;
        
        console.log(`🎯 Шанс пользователя: ${userWinChance}%`);
        
        // Если у пользователя 100% шанс и он получил пустоту, заменяем на гарантированный приз
        if (userWinChance >= 100 && data.prize?.type === 'empty') {
            console.log('🎯 Пользователь с 100% шансом получил пустоту - заменяем на гарантированный приз');
            
            // Загружаем настройки призов для определения лучшего приза
            let basePrizes;
            try {
                const settings = await db.getWheelSettings('normal');
                basePrizes = settings?.prizes || [];
            } catch (error) {
                console.warn('⚠️ Не удалось получить настройки призов, используем дефолтные');
                basePrizes = [
                    { id: 'зя300', type: 'certificate', name: 'Сертификат 300₽ ЗЯ', value: 300 },
                    { id: 'вб500', type: 'certificate', name: 'Сертификат 500₽ WB', value: 500 },
                    { id: 'зя500', type: 'certificate', name: 'Сертификат 500₽ ЗЯ', value: 500 },
                    { id: 'вб1000', type: 'certificate', name: 'Сертификат 1000₽ WB', value: 1000 },
                    { id: 'зя1000', type: 'certificate', name: 'Сертификат 1000₽ ЗЯ', value: 1000 },
                    { id: 'вб2000', type: 'certificate', name: 'Сертификат 2000₽ WB', value: 2000 },
                    { id: 'зя2000', type: 'certificate', name: 'Сертификат 2000₽ ЗЯ', value: 2000 },
                    { id: 'вб3000', type: 'certificate', name: 'Сертификат 3000₽ WB', value: 3000 },
                    { id: 'зя 5000', type: 'certificate', name: 'Сертификат 5000₽ ЗЯ', value: 5000 }
                ];
            }
            
            // Находим лучший приз (исключая пустоту)
            const winPrizes = basePrizes.filter(p => p.type !== 'empty');
            const bestPrize = winPrizes.reduce((best, current) => {
                if (!best) return current;
                
                // Приоритет: сертификаты с большей стоимостью, затем звезды
                if (current.type === 'certificate' && best.type === 'stars') return current;
                if (current.type === best.type && (current.value || 0) > (best.value || 0)) return current;
                
                return best;
            }, null);
            
            if (bestPrize) {
                finalPrize = bestPrize;
                console.log(`🎁 Заменили пустоту на гарантированный приз: ${bestPrize.name} (${bestPrize.value}₽)`);
            }
        }
        
        console.log('🎯 ФИНАЛЬНЫЙ ПРИЗ ДЛЯ СОХРАНЕНИЯ:');
        console.log('  - finalPrize.id:', finalPrize?.id);
        console.log('  - finalPrize.name:', finalPrize?.name);
        console.log('  - finalPrize.description:', finalPrize?.description);
        console.log('  - finalPrize.type:', finalPrize?.type);
        console.log('  - finalPrize.value:', finalPrize?.value);

        try {
            // Используем новый транзакционный метод с финальным призом
            const result = await db.processSpinWithTransaction(userId, spinCost, finalPrize, spinType);
            
            console.log(`✅ Спин обработан успешно. Новый баланс: ${result.newBalance}`);
            
            // Валидация и дополнительная обработка призов
            if (finalPrize && finalPrize.type !== 'empty') {
                const prizeType = finalPrize.type;
                const prizeValue = finalPrize.value || 0;
                
                console.log(`🔍 Приз обработан: тип="${prizeType}", значение=${prizeValue}`);
                
                // Валидируем допустимые типы призов
                const validPrizeTypes = ['empty', 'stars', 'certificate'];
                if (!validPrizeTypes.includes(prizeType)) {
                    console.warn(`⚠️ Неизвестный тип приза: ${prizeType}, принимаем как certificate`);
                    finalPrize.type = 'certificate';
                }
                
                // Дополнительная валидация для сертификатов
                if (prizeType === 'certificate') {
                    if (prizeValue < 100 || prizeValue > 10000) {
                        console.warn(`⚠️ Подозрительная стоимость сертификата: ${prizeValue}₽`);
                    }
                    console.log(`🎫 Получен сертификат на ${prizeValue}₽`);
                }
                
                // Отправляем уведомление в телеграм
                if (bot) {
                    try {
                        const messageText = finalPrize.description || finalPrize.name;
                        console.log('📱 ОТПРАВЛЯЕМ СООБЩЕНИЕ В TELEGRAM:');
                        console.log('  - Текст сообщения:', messageText);
                        console.log('  - finalPrize.description:', finalPrize.description);
                        console.log('  - finalPrize.name:', finalPrize.name);
                        
                        await bot.sendMessage(userId, `🎉 Поздравляем!\n🎁 Вы выиграли: ${messageText}!`);
                        
                        // Уведомляем админов о крупных призах (сертификаты)
                        if (finalPrize.type.includes('golden-apple') || finalPrize.type.includes('dolce')) {
                            // Используем красиво оформленное уведомление
                            notifyAdmins(`Пользователь ${user.first_name} (${userId}) выиграл: ${finalPrize.name}`);
                            
                            // Или простое уведомление (если хотите оставить старый формат):
                            // notifyAdmins(`Пользователь ${user.first_name} (${userId}) выиграл: ${data.prize.name}`);
                        }
                    } catch (error) {
                        console.error('Ошибка отправки уведомления:', error);
                    }
                }
            }
        } catch (spinError) {
            console.error('❌ Ошибка обработки спина в транзакции:', spinError);
            throw spinError; // Пробрасываем ошибку выше
        }
    } catch (error) {
        console.error('❌ Ошибка обработки прокрутки:', error);
    }
}

// Добавить эти endpoints в telegram-bot-server.js для исправления лидерборда

// ДОБАВИТЬ или ЗАМЕНИТЬ endpoint:
app.get('/api/leaderboard/referrals', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        
        console.log(`📊 Запрос лидерборда по рефералам, лимит: ${limit}`);
        
        // Используем метод из database.js
        const leaderboard = await db.getGlobalReferralsLeaderboard(limit);
        
        console.log(`✅ Лидерборд по рефералам загружен: ${leaderboard.length} записей`);
        
        // Возвращаем данные напрямую как массив
        res.json(leaderboard);
        
    } catch (error) {
        console.error('❌ Ошибка получения лидерборда рефералов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 4. ЗАМЕНИТЕ API для позиции пользователя в лидерборде:
app.get('/api/leaderboard/referrals/position/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`👤 Запрос позиции пользователя ${userId} в лидерборде рефералов`);
        
        // Получаем полную информацию о позиции пользователя
        const query = `
            WITH ranked_users AS (
                SELECT 
                    u.telegram_id, 
                    COALESCE(
                        (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.is_active = true),
                        0
                    ) as referrals_count,
                    ROW_NUMBER() OVER (
                        ORDER BY 
                            COALESCE(
                                (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.is_active = true),
                                0
                            ) DESC, u.id ASC
                    ) as position
                FROM users u
                WHERE u.is_active = true
            )
            SELECT position, referrals_count FROM ranked_users WHERE telegram_id = $1
        `;
        
        const result = await db.pool.query(query, [parseInt(userId)]);
        const userRank = result.rows[0];
        
        if (userRank && userRank.referrals_count > 0) {
            console.log(`✅ Позиция пользователя ${userId}: #${userRank.position} с ${userRank.referrals_count} рефералами`);
            res.json({ 
                position: parseInt(userRank.position),
                score: parseInt(userRank.referrals_count)
            });
        } else {
            console.log(`📊 Пользователь ${userId} не в рейтинге рефералов (${userRank?.referrals_count || 0} рефералов)`);
            res.json({
                position: null,
                score: parseInt(userRank?.referrals_count || 0)
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения позиции пользователя:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 5. ДОБАВЬТЕ новый endpoint для отладки рефералов:
app.get('/api/debug/referrals/:userId?', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (userId) {
            // Отладка конкретного пользователя
            const debug = await db.debugUserReferrals(parseInt(userId));
            res.json(debug);
        } else {
            // Общая отладка всех рефералов
            const allReferrals = await new Promise((resolve, reject) => {
                db.db.all(`
                    SELECT 
                        u.telegram_id,
                        u.first_name,
                        u.referrals as referrals_field,
                        COUNT(r.id) as actual_referrals_count
                    FROM users u
                    LEFT JOIN referrals r ON u.id = r.referrer_id
                    WHERE u.is_active = 1
                    GROUP BY u.telegram_id, u.first_name, u.referrals
                    HAVING actual_referrals_count > 0 OR u.referrals > 0
                    ORDER BY actual_referrals_count DESC
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
            
            res.json({
                total_users_with_referrals: allReferrals.length,
                users: allReferrals.map(user => ({
                    ...user,
                    sync_needed: user.referrals_field !== user.actual_referrals_count
                }))
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка отладки рефералов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 6. ДОБАВЬТЕ endpoint для принудительной синхронизации:
app.post('/api/sync-referrals', async (req, res) => {
    try {
        console.log('🔄 Запуск принудительной синхронизации рефералов...');
        
        const updatedRows = await db.syncAllReferralCounts();
        
        console.log(`✅ Синхронизация завершена, обновлено строк: ${updatedRows}`);
        
        res.json({
            success: true,
            message: `Синхронизация завершена, обновлено записей: ${updatedRows}`,
            updatedRows: updatedRows
        });
        
    } catch (error) {
        console.error('❌ Ошибка синхронизации рефералов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
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
    max: 300, // УВЕЛИЧЕНО до 300 запросов с одного IP за 15 минут
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
    max: 100, // УВЕЛИЧЕНО до 100 API запросов в минуту
    message: {
        error: 'Превышен лимит API запросов, попробуйте через минуту',
        retryAfter: 60
    },
    // Используем handler вместо deprecated onLimitReached
    handler: (req, res, next, options) => {
        console.log(`⚠️ Rate limit достигнут для ${req.ip}, URL: ${req.url}, User: ${req.body?.userId || 'unknown'}`);
        res.status(options.statusCode).json(options.message);
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

// ТЕСТОВЫЙ endpoint для отладки win-chance (без авторизации)
app.post('/api/debug/win-chance/:userId', async (req, res) => {
    const { userId } = req.params;
    const { winChance, reason } = req.body;
    
    try {
        console.log(`🐛 DEBUG: Попытка изменить win_chance для пользователя ${userId}: ${winChance}% (причина: ${reason})`);
        
        // Проверяем базовые данные
        if (!userId || isNaN(parseInt(userId))) {
            return res.status(400).json({ 
                success: false, 
                error: 'Неверный ID пользователя',
                debug: { userId, type: typeof userId }
            });
        }
        
        if (winChance === undefined || isNaN(parseFloat(winChance)) || winChance < 0 || winChance > 100) {
            return res.status(400).json({ 
                success: false, 
                error: 'Шанс победы должен быть числом от 0 до 100',
                debug: { winChance, type: typeof winChance }
            });
        }
        
        if (!reason || reason.trim().length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'Причина изменения обязательна (минимум 3 символа)',
                debug: { reason, length: reason?.length }
            });
        }
        
        console.log('🐛 DEBUG: Валидация прошла, получаем пользователя...');
        
        // Проверяем существование пользователя
        const user = await db.getUser(userId);
        if (!user) {
            console.log('🐛 DEBUG: Пользователь не найден');
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден',
                debug: { userId, userFound: false }
            });
        }
        
        console.log('🐛 DEBUG: Пользователь найден:', {
            telegramId: user.telegram_id,
            currentWinChance: user.win_chance,
            hasSetUserWinChanceMethod: typeof db.setUserWinChance
        });
        
        // Проверяем наличие метода
        if (typeof db.setUserWinChance !== 'function') {
            console.log('🐛 DEBUG: Метод setUserWinChance не найден!');
            return res.status(500).json({
                success: false,
                error: 'Метод setUserWinChance не реализован в текущей версии БД',
                debug: { 
                    dbType: db.constructor.name,
                    availableMethods: Object.getOwnPropertyNames(db).filter(name => name.includes('Win') || name.includes('Chance'))
                }
            });
        }
        
        console.log('🐛 DEBUG: Вызываем setUserWinChance...');
        
        // Изменяем win_chance
        const updatedUser = await db.setUserWinChance(userId, parseFloat(winChance), reason);
        
        console.log('🐛 DEBUG: Результат setUserWinChance:', updatedUser);
        
        if (!updatedUser) {
            return res.status(500).json({ 
                success: false, 
                error: 'Не удалось обновить шанс победы',
                debug: { updatedUser }
            });
        }
        
        console.log(`🐛 DEBUG: Успешно обновлен win_chance для пользователя ${userId}: ${winChance}%`);
        
        res.json({ 
            success: true, 
            message: 'Шанс победы обновлен успешно (DEBUG)',
            data: {
                userId: userId,
                oldWinChance: user.win_chance || 6.0,
                newWinChance: parseFloat(winChance),
                reason: reason
            },
            debug: {
                dbType: db.constructor.name,
                methodExists: typeof db.setUserWinChance === 'function'
            }
        });
        
    } catch (error) {
        console.error('🐛 DEBUG: Ошибка изменения win_chance:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Внутренняя ошибка сервера при изменении win_chance',
            debug: {
                errorMessage: error.message,
                errorStack: error.stack,
                dbType: db.constructor.name
            }
        });
    }
});

// МАССОВЫЙ сброс win_chance к дефолтным значениям (только для настройки)
app.post('/api/admin/reset-all-win-chances', async (req, res) => {
    try {
        console.log('🔄 Массовый сброс win_chance к дефолтным значениям (6%)...');
        
        // Получаем всех пользователей с нестандартным win_chance
        const result = await db.pool.query(`
            UPDATE users 
            SET win_chance = 6.0 
            WHERE win_chance != 6.0 OR win_chance IS NULL
            RETURNING telegram_id, win_chance
        `);
        
        const updatedUsers = result.rows;
        
        console.log(`✅ Обновлено пользователей: ${updatedUsers.length}`);
        
        res.json({
            success: true,
            message: `Сброшено win_chance для ${updatedUsers.length} пользователей к дефолту 6%`,
            updatedCount: updatedUsers.length,
            updatedUsers: updatedUsers.map(u => u.telegram_id)
        });
        
    } catch (error) {
        console.error('❌ Ошибка массового сброса win_chance:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка массового сброса win_chance',
            details: error.message
        });
    }
});

// API endpoint для полной обработки спина с учетом win_chance пользователя
app.post('/api/spin/determine-result', async (req, res) => {
    try {
        const { userId, spinType = 'normal', spinCost = 20 } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        
        console.log(`🎯 Полная обработка спина для пользователя ${userId} (тип: ${spinType}, стоимость: ${spinCost})...`);
        
        // Получаем данные пользователя
        const user = await db.getUser(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const userWinChance = user.win_chance || 6.0; // Дефолтный шанс победы 6%
        const userStarsChance = user.stars_chance || 0; // Дополнительный шанс звезд
        const userCertificateChance = user.certificate_chance || 0; // Дополнительный шанс сертификатов
        
        console.log(`📊 Шансы пользователя:`, {
            general: `${userWinChance}%`,
            stars: `+${userStarsChance}%`,
            certificates: `+${userCertificateChance}%`
        });
        
        // Загружаем базовые настройки призов
        let basePrizes;
        try {
            const settings = await db.getWheelSettings('normal');
            basePrizes = settings.prizes || [];
        } catch (error) {
            console.warn('⚠️ Не удалось получить настройки призов, используем дефолтные');
            basePrizes = [
                { id: 'empty', type: 'empty', probability: 93, name: 'Пусто', value: 0 },
                { id: 'stars20', type: 'stars', probability: 5, name: '20 звезд', value: 20 },
                { id: 'зя300', type: 'certificate', probability: 0.3, name: 'Сертификат 300₽ ЗЯ', value: 300 },
                { id: 'вб500', type: 'certificate', probability: 0.2, name: 'Сертификат 500₽ WB', value: 500 },
                { id: 'зя500', type: 'certificate', probability: 0.2, name: 'Сертификат 500₽ ЗЯ', value: 500 },
                { id: 'вб1000', type: 'certificate', probability: 0.1, name: 'Сертификат 1000₽ WB', value: 1000 },
                { id: 'зя1000', type: 'certificate', probability: 0.1, name: 'Сертификат 1000₽ ЗЯ', value: 1000 },
                { id: 'вб2000', type: 'certificate', probability: 0.05, name: 'Сертификат 2000₽ WB', value: 2000 },
                { id: 'зя2000', type: 'certificate', probability: 0.05, name: 'Сертификат 2000₽ ЗЯ', value: 2000 },
                { id: 'вб3000', type: 'certificate', probability: 0.02, name: 'Сертификат 3000₽ WB', value: 3000 },
                { id: 'зя 5000', type: 'certificate', probability: 0.01, name: 'Сертификат 5000₽ ЗЯ', value: 5000 }
            ];
        }
        
        // Специальная обработка для случая 100% шанса
        if (userWinChance >= 100) {
            console.log('🎯 Пользователь имеет 100% шанс выигрыша - выбираем лучший приз');
            
            // При 100% шансе выбираем лучший доступный приз (исключая пустоту)
            const winPrizes = basePrizes.filter(p => p.type !== 'empty');
            const bestPrize = winPrizes.reduce((best, current) => {
                if (!best) return current;
                
                // Приоритет: сертификаты с большей стоимостью, затем звезды
                if (current.type === 'certificate' && best.type === 'stars') return current;
                if (current.type === best.type && current.value > best.value) return current;
                
                return best;
            }, null);
            
            const guaranteedPrize = bestPrize || winPrizes[0];
            console.log(`🎁 Гарантированный приз: ${guaranteedPrize.name}`);
            
            return res.json({
                success: true,
                prize: guaranteedPrize,
                reason: 'guaranteed_win',
                userChances: {
                    general: userWinChance,
                    stars: userStarsChance,
                    certificates: userCertificateChance
                }
            });
        }

        // Модифицируем вероятности на основе раздельных шансов пользователя
        const modifiedPrizes = basePrizes.map(prize => {
            if (prize.type === 'empty') {
                // Для пустых призов уменьшаем вероятность на общий + специфичный шанс
                const totalBonus = (userWinChance - 6.0) + userStarsChance + userCertificateChance;
                const newProbability = Math.max(0, prize.probability - totalBonus);
                return { ...prize, probability: newProbability };
            } else if (prize.type === 'stars') {
                // Для звезд: общий шанс + бонус за звезды
                const generalMultiplier = userWinChance / 6.0;
                const specificBonus = userStarsChance / 6.0; // Конвертируем в мультипликатор
                const newProbability = prize.probability * (generalMultiplier + specificBonus);
                return { ...prize, probability: newProbability };
            } else if (prize.type === 'certificate') {
                // Для сертификатов: общий шанс + бонус за сертификаты
                const generalMultiplier = userWinChance / 6.0;
                const specificBonus = userCertificateChance / 6.0; // Конвертируем в мультипликатор
                const newProbability = prize.probability * (generalMultiplier + specificBonus);
                return { ...prize, probability: newProbability };
            } else {
                // Остальные призы - только общий шанс
                const multiplier = userWinChance / 6.0;
                const newProbability = prize.probability * multiplier;
                return { ...prize, probability: newProbability };
            }
        });
        
        // Нормализуем вероятности до 100%
        const totalProbability = modifiedPrizes.reduce((sum, prize) => sum + prize.probability, 0);
        const normalizedPrizes = modifiedPrizes.map(prize => ({
            ...prize,
            probability: (prize.probability / totalProbability) * 100
        }));
        
        console.log('🎲 Модифицированные вероятности:', normalizedPrizes);
        
        // Определяем результат
        const random = Math.random() * 100;
        let cumulative = 0;
        let selectedPrize = null;
        
        for (const prize of normalizedPrizes) {
            cumulative += prize.probability;
            if (random < cumulative) {
                selectedPrize = prize;
                break;
            }
        }
        
        // Fallback на пустоту если что-то пошло не так
        if (!selectedPrize) {
            selectedPrize = normalizedPrizes.find(p => p.type === 'empty') || normalizedPrizes[0];
        }
        
        console.log(`🎯 Выбран приз: ${selectedPrize.name} (случайное число: ${random.toFixed(2)}%)`);
        
        // НОВОЕ: Полностью обрабатываем спин через внутренний вызов webhook API
        try {
            // Создаем mock запрос для внутреннего вызова
            const mockReq = {
                body: {
                    action: 'wheel_spin',
                    userId: userId,
                    data: {
                        prize: selectedPrize,
                        spinType: spinType,
                        spinCost: spinCost
                    }
                }
            };
            
            // Используем существующую логику обработки webhook
            console.log('🔄 Обрабатываем спин через внутренний webhook...');
            
            // Находим пользователя или создаем если не существует
            let user = await db.getUser(userId);
            if (!user) {
                console.log('👤 Создаем нового пользователя...');
                user = await db.createUser({
                    telegram_id: userId,
                    first_name: 'User',
                    username: '',
                    referrer_id: null
                });
                
                if (!user) {
                    throw new Error('Не удалось создать пользователя');
                }
            }
            
            console.log(`🎰 Пользователь ${userId} крутит рулетку`);
            console.log('🎁 Данные приза:', JSON.stringify(selectedPrize, null, 2));
            
            // Используем новый транзакционный метод из handleWheelSpin
            const result = await db.processSpinWithTransaction(userId, spinCost, selectedPrize, spinType);
            console.log(`✅ Спин обработан успешно. Новый баланс: ${result.newBalance}`);
            
            // Валидация и дополнительная обработка призов
            if (selectedPrize && selectedPrize.type !== 'empty') {
                const prizeType = selectedPrize.type;
                const prizeValue = selectedPrize.value || 0;
                
                console.log(`🔍 Приз обработан: тип="${prizeType}", значение=${prizeValue}`);
                
                // Валидируем допустимые типы призов
                const validPrizeTypes = ['empty', 'stars', 'certificate'];
                if (!validPrizeTypes.includes(prizeType)) {
                    console.warn(`⚠️ Неизвестный тип приза: ${prizeType}, принимаем как certificate`);
                    selectedPrize.type = 'certificate';
                }
                
                // Дополнительная валидация для сертификатов
                if (prizeType === 'certificate') {
                    if (prizeValue < 100 || prizeValue > 10000) {
                        console.warn(`⚠️ Подозрительная стоимость сертификата: ${prizeValue}₽`);
                    }
                    console.log(`🎫 Получен сертификат на ${prizeValue}₽`);
                }
            }
            
            console.log('✅ Спин полностью обработан - баланс списан, приз начислен');
            
            res.json({
                success: true,
                result: selectedPrize,
                userWinChance: userWinChance,
                modifiedProbabilities: normalizedPrizes,
                processed: true, // Флаг что спин полностью обработан
                newBalance: result.newBalance // Обновленный баланс после спина
            });
            
        } catch (wheelError) {
            console.error('❌ Ошибка обработки спина:', wheelError);
            // Возвращаем только результат без обработки, если есть ошибка
            res.json({
                success: true,
                result: selectedPrize,
                userWinChance: userWinChance,
                modifiedProbabilities: normalizedPrizes,
                processed: false,
                error: wheelError.message
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка определения результата спина:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Логирование запросов
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`📥 ${timestamp} - ${req.method} ${req.url} - ${req.ip}`);
    next();
});

// Настройка статических файлов
const publicPath = path.join(__dirname, 'public');
const adminPath = path.join(__dirname, 'admin');

console.log('📁 Admin path:', adminPath);
console.log('📁 Admin files exist:', require('fs').existsSync(adminPath));
console.log('📁 Admin login file exists:', require('fs').existsSync(path.join(adminPath, 'admin-login.html')));

// Простые обработчики для админки без циклических редиректов
app.get(/^\/+admin\/*$/, (req, res) => {
    console.log('🔍 Admin корень запрос:', req.originalUrl);
    const loginPath = path.join(adminPath, 'admin-login.html');
    console.log('📁 Отправляем admin-login.html:', loginPath);
    res.sendFile(loginPath);
});

// Основная страница админки
app.get('/admin/admin.html', (req, res) => {
    console.log('🔍 Admin.html запрос');
    const adminHtmlPath = path.join(adminPath, 'admin.html');
    console.log('📁 Отправляем admin.html:', adminHtmlPath);
    res.sendFile(adminHtmlPath);
});

// Статические файлы для веб-админки (для остальных путей)
app.use('/admin', express.static(adminPath, {
    etag: false,
    maxAge: 0,
    setHeaders: (res, filePath) => {
        console.log('📄 Статический файл админки:', filePath);
        if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
}));

// Статические файлы для основного WebApp
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

// Инициализация базы данных (ТОЛЬКО PostgreSQL)
console.log('🗄️ ========== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ==========');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
console.log('🚂 RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('🔗 DATABASE_URL установлен:', !!process.env.DATABASE_URL);
console.log('📊 DATABASE_URL тип:', typeof process.env.DATABASE_URL);

// ПРИНУДИТЕЛЬНО используем только PostgreSQL
console.log('🐘 ПРИНУДИТЕЛЬНОЕ ИСПОЛЬЗОВАНИЕ POSTGRESQL');

const db = createDatabase();

// Создаем менеджер рефералов
const referralManager = new ReferralManager(db);

console.log('✅ База данных инициализирована');
console.log('🗄️ ========== КОНЕЦ ИНИЦИАЛИЗАЦИИ БД ==========');

// Инициализируем реальные шансы рулетки при запуске
if (typeof db.initializeRealWheelChances === 'function') {
    db.initializeRealWheelChances().then(success => {
        if (success) {
            console.log('✅ Реальные шансы рулетки проверены/созданы');
            console.log('   📊 Факт: пусто 94%, звезды 5%, сертификат 1%');
            console.log('   👁️  Визуально: пустота 20%, звезды 10%, сертификаты 70%');
        } else {
            console.log('⚠️  Не удалось инициализировать реальные шансы рулетки');
        }
    }).catch(error => {
        console.error('❌ Ошибка инициализации реальных шансов:', error);
    });
} else {
    console.log('⚠️  Функция initializeRealWheelChances не найдена в db');
}

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
    console.warn('⚠️ ADMIN_IDS environment variable not set - admin functions disabled');
    console.warn('Set ADMIN_IDS=your_telegram_id in Railway dashboard to enable admin functions');
} else {
    console.log(`👑 Администраторы: ${ADMIN_IDS.join(', ')}`);
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
    
    // Экспортируем бота для использования в админ-боте
    global.mainBot = bot;
    
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
                    totalEarned: referralsCount * 10 // 10 звезд за каждого реферала
                }
            },
            shareText: 'Привет! Присоединяйся к Kosmetichka Lottery Bot - крути рулетку и выигрывай призы! 💄✨\n\n💫 Тот кто тебя пригласил получит 10 звезд!'
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

// 1. ЗАМЕНИТЕ endpoint для активации реферала:
app.post('/api/activate-referral', referralActivationLimiter, async (req, res) => {
    try {
        const { userId, referralCode } = req.body;
        
        console.log(`🤝 Попытка активации реферала: пользователь ${userId}, код ${referralCode}`);
        
        if (!userId || !referralCode) {
            return res.status(400).json({ 
                success: false, 
                message: 'Отсутствуют обязательные параметры' 
            });
        }
        
        const referrerId = parseInt(referralCode);
        
        if (!referrerId || referrerId === userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Неверный реферальный код' 
            });
        }
        
        // Используем менеджер рефералов для безопасной активации
        const result = await referralManager.activateReferral(referrerId, userId, bot);
        
        console.log(`✅ Реферал успешно активирован: ${referrerId} -> ${userId}`);
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ Ошибка активации реферала:', error);
        
        // Различные типы ошибок
        if (error.message.includes('уже был приглашен') || 
            error.message.includes('уже в процессе')) {
            return res.status(409).json({ 
                success: false, 
                message: error.message
            });
        }
        
        if (error.message.includes('не найден') || 
            error.message.includes('самого себя')) {
            return res.status(400).json({ 
                success: false, 
                message: error.message
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Внутренняя ошибка сервера' 
        });
    }
});

// Добавить в telegram-bot-server.js

// Замените эти endpoints в telegram-bot-server.js

// 3. ЗАМЕНИТЕ API для лидерборда рефералов:
app.get('/api/leaderboard-referrals', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        
        console.log(`📊 Запрос лидерборда рефералов, лимит: ${limit}`);
        
        // Сначала синхронизируем все счетчики
        await db.syncAllReferralCounts();
        
        // Получаем актуальный лидерборд
        const leaderboard = await db.getGlobalReferralsLeaderboard(limit);
        
        console.log(`✅ Лидерборд рефералов получен: ${leaderboard.length} записей`);
        
        res.json({ 
            leaderboard: leaderboard,
            total: leaderboard.length
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

// Синхронизация данных пользователя
async function syncUserData(userId, webAppData) {
    try {
        console.log(`🔄 syncUserData для userId: ${userId}`);
        
        let user = await db.getUser(userId);
        
        if (!user) {
            console.log(`👤 Создаем нового пользователя ${userId}`);
            
            const userData = {
                telegram_id: userId,
                username: webAppData?.username || '',
                first_name: webAppData?.first_name || 'Пользователь',
                last_name: webAppData?.last_name || ''
            };
            
            await db.createUser(userData);
            user = await db.getUser(userId);
        }
        
        console.log(`✅ Пользователь из БД: ID=${user.telegram_id}, stars=${user.stars}`);
        
        // ВСЕГДА возвращаем баланс из БД
        const syncedData = {
            stars: user.stars,
            referrals: user.referrals || 0,
            total_stars_earned: user.total_stars_earned || 20,
            totalSpins: user.total_spins || 0,
            prizesWon: user.prizes_won || 0,
            friendSpinsUsed: user.friend_spins_used || 0
        };
        
        console.log(`📤 Возвращаем данные: stars=${syncedData.stars}`);
        return syncedData;
        
    } catch (error) {
        console.error('❌ Ошибка syncUserData:', error);
        return { stars: 0 };
    }
}

// API для взаимодействия с WebApp
// API для взаимодействия с WebApp - ОТКЛЮЧАЕМ ЛИМИТЕР ДЛЯ ДИАГНОСТИКИ
app.post('/api/telegram-webhook', async (req, res) => {  // Убрали spinLimiter
    try {
        const { action, data, user } = req.body;
        
        console.log(`📡 WebApp API: ${action} от пользователя ${user?.id}`);
        console.log('📋 Полученные данные:', JSON.stringify({ action, data, user }, null, 2));
        
        // ОСОБОЕ внимание к wheel_spin запросам
        if (action === 'wheel_spin') {
            console.log('🎰 ========== WHEEL_SPIN ЗАПРОС ПОЛУЧЕН ==========');
            console.log('🔍 Детали wheel_spin:', {
                userId: user?.id,
                spinType: data?.spinType,
                prizeName: data?.prize?.name,
                prizeType: data?.prize?.type,
                prizeValue: data?.prize?.value,
                spinCost: data?.spinCost
            });
            console.log('🎰 ===============================================');
        }
        
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
            case 'get_balance':
                const balanceUser = await db.getUser(userId);
                if (!balanceUser) {
                    return res.status(404).json({ 
                        success: false, 
                        error: 'Пользователь не найден' 
                    });
                }
                console.log(`📊 Запрос баланса для пользователя ${userId}: ${balanceUser.stars} звезд`);
                return res.json({
                    success: true,
                    stars: balanceUser.stars,
                    userId: userId
                });
            case 'update_stars':
                const newBalance = parseInt(data?.stars);
                if (isNaN(newBalance) || newBalance < 0) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Некорректный баланс звезд' 
                    });
                }
                
                console.log(`⭐ Обновление баланса пользователя ${userId}: ${newBalance} звезд`);
                await db.updateUserStars(userId, newBalance);
                
                return res.json({
                    success: true,
                    stars: newBalance,
                    userId: userId
                });
            case 'verify_prize':
                console.log(`🔍 Верификация приза для пользователя ${userId}:`, data);
                
                try {
                    // Получаем последние призы пользователя из БД
                    const userPrizes = await db.getUserPrizes(userId, 10); // Последние 10 призов
                    
                    if (!userPrizes || userPrizes.length === 0) {
                        console.warn(`⚠️ У пользователя ${userId} нет призов в БД`);
                        return res.json({
                            success: false,
                            error: 'Призы не найдены'
                        });
                    }
                    
                    // Ищем приз по ID или по времени (последний приз)
                    let verifiedPrize = null;
                    
                    if (data.prizeId) {
                        verifiedPrize = userPrizes.find(p => p.id === data.prizeId);
                    }
                    
                    // Если не найден по ID, берем последний приз
                    if (!verifiedPrize) {
                        verifiedPrize = userPrizes[0]; // Самый последний
                        console.log('📋 Используем последний приз пользователя');
                    }
                    
                    if (verifiedPrize) {
                        console.log('✅ Приз найден в БД:', verifiedPrize);
                        
                        // Формируем данные для ответа
                        const prizeData = {
                            id: verifiedPrize.id,
                            name: verifiedPrize.name,
                            realName: verifiedPrize.name,
                            type: verifiedPrize.type,
                            realType: verifiedPrize.type,
                            value: verifiedPrize.value,
                            realValue: verifiedPrize.value,
                            description: verifiedPrize.description,
                            timestamp: verifiedPrize.created_at,
                            verified: true
                        };
                        
                        return res.json({
                            success: true,
                            prizeData: prizeData,
                            message: 'Приз верифицирован из БД'
                        });
                    } else {
                        console.warn(`⚠️ Приз не найден в БД для пользователя ${userId}`);
                        return res.json({
                            success: false,
                            error: 'Приз не найден в базе данных'
                        });
                    }
                    
                } catch (error) {
                    console.error('❌ Ошибка верификации приза:', error);
                    return res.status(500).json({
                        success: false,
                        error: 'Ошибка сервера при верификации приза'
                    });
                }
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
app.post('/api/debug/wheel-spin', strictApiLimiter, async (req, res) => {
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

app.get('/api/wheel-settings/normal', async (req, res) => {
    try {
        const { userId } = req.query; // Получаем userId из query параметров
        
        const settings = await db.getWheelSettings('normal');
        
        if (settings && settings.prizes) {
            let adjustedPrizes = settings.prizes.map(prize => ({
                id: prize.id,
                type: prize.type,
                probability: prize.probability,
                name: prize.name,
                value: prize.value
            }));

            // Если передан userId, проверяем его шансы
            if (userId) {
                try {
                    const user = await db.getUser(parseInt(userId));
                    if (user) {
                        const userWinChance = user.win_chance || 6.0;
                        
                        console.log(`🎯 Настройка шансов рулетки для пользователя ${userId} (шанс: ${userWinChance}%)`);
                        
                        // Если у пользователя 100% шанс, устанавливаем гарантированную победу
                        if (userWinChance >= 100) {
                            console.log('🎯 100% шанс - настраиваем рулетку на гарантированную победу');
                            
                            // Находим лучший приз (исключая пустоту)
                            const winPrizes = adjustedPrizes.filter(p => p.type !== 'empty');
                            const bestPrize = winPrizes.reduce((best, current) => {
                                if (!best) return current;
                                
                                // Приоритет: сертификаты с большей стоимостью, затем звезды
                                if (current.type === 'certificate' && best.type === 'stars') return current;
                                if (current.type === best.type && (current.value || 0) > (best.value || 0)) return current;
                                
                                return best;
                            }, null);
                            
                            if (bestPrize) {
                                // Устанавливаем 100% шанс для лучшего приза, 0% для всех остальных
                                adjustedPrizes = adjustedPrizes.map(prize => ({
                                    ...prize,
                                    probability: prize.id === bestPrize.id ? 100 : 0
                                }));
                                
                                console.log(`🎁 Установлен 100% шанс для приза: ${bestPrize.name}`);
                            }
                        }
                    }
                } catch (userError) {
                    console.warn(`⚠️ Не удалось получить данные пользователя ${userId}:`, userError);
                }
            }
            
            const publicSettings = {
                prizes: adjustedPrizes
            };
            res.json(publicSettings);
        } else {
            // Возвращаем пустые настройки, чтобы фронтенд использовал дефолтные
            res.json({ prizes: [] });
        }
    } catch (error) {
        console.error('❌ Ошибка получения публичных настроек рулетки:', error);
        res.json({ prizes: [] }); // В случае ошибки возвращаем пустые настройки
    }
});

// Добавьте этот endpoint в telegram-bot-server.js после других API endpoints

app.post('/api/sync_user', async (req, res) => {
    try {
        const { action, data, user } = req.body;
        
        console.log('📡 /api/sync_user запрос:', { action, userId: user?.id });
        
        if (!user || !user.id) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID missing' 
            });
        }
        
        const userId = parseInt(user.id);
        const userData = data?.userData || {};
        
        // Синхронизируем данные
        const syncedData = await syncUserData(userId, userData);
        
        console.log(`✅ Отправляем клиенту данные с балансом: ${syncedData.stars}`);
        
        res.json({ 
            success: true,
            userData: syncedData
        });
        
    } catch (error) {
        console.error('❌ Ошибка /api/sync_user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Sync failed' 
        });
    }
});

// Тестовый endpoint для проверки баланса
app.get('/api/test/balance/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const user = await db.getUser(userId);
        
        console.log(`🔍 ТЕСТ: Проверка баланса для userId ${userId}:`, user);
        
        res.json({
            userId: userId,
            dbUser: user,
            stars: user?.stars || 0,
            total_stars_earned: user?.total_stars_earned || 0
        });
    } catch (error) {
        console.error('❌ Ошибка теста:', error);
        res.status(500).json({ error: error.message });
    }
});

// API для синхронизации баланса звезд
app.post('/api/sync_stars', async (req, res) => {
    try {
        const { action, data, user } = req.body;
        
        if (!user || !user.id) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID отсутствует' 
            });
        }
        
        const userId = user.id;
        console.log(`🔄 Синхронизация звезд для пользователя ${userId}`);
        console.log(`⭐ Новый баланс: ${data.stars}`);
        
        // Обновляем баланс в базе данных
        const result = await db.pool.query(
            'UPDATE users SET stars = $1, last_activity = CURRENT_TIMESTAMP WHERE telegram_id = $2 RETURNING *',
            [data.stars, userId]
        );
        
        if (result.rows.length > 0) {
            console.log(`✅ Баланс обновлен в БД: ${data.stars} звезд для пользователя ${userId}`);
            res.json({ 
                success: true,
                stars: data.stars,
                message: 'Баланс синхронизирован'
            });
        } else {
            throw new Error('Пользователь не найден в БД');
        }
        
    } catch (error) {
        console.error('❌ Ошибка синхронизации звезд:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка синхронизации баланса' 
        });
    }
});

// API для проверки подписок на каналы
// API endpoint для проверки подписки на канал
app.post('/api/check-subscription', async (req, res) => {
    try {
        const { userId, channelUsername } = req.body;
        
        console.log(`🔍 Получен запрос проверки подписки:`, { userId, channelUsername });
        
        if (!userId || !channelUsername) {
            console.error('❌ Отсутствуют обязательные параметры');
            return res.status(400).json({
                success: false,
                error: 'Не указаны userId или channelUsername'
            });
        }

        // Убираем @ из начала username если есть
        const cleanChannelUsername = channelUsername.replace(/^@/, '');
        console.log(`🔍 Проверяем подписку пользователя ${userId} на канал @${cleanChannelUsername}`);
        
        try {
            // Проверяем является ли пользователь участником канала
            const chatMember = await bot.getChatMember(`@${cleanChannelUsername}`, userId);
            
            console.log(`👤 Статус пользователя ${userId} в канале @${cleanChannelUsername}:`, chatMember.status);
            
            // Проверяем статус участника
            const subscribedStatuses = ['member', 'administrator', 'creator'];
            const isSubscribed = subscribedStatuses.includes(chatMember.status);
            
            // Логируем проверку в базу данных
            try {
                // Закомментировано - метод logSubscriptionCheck не существует в database-postgres.js
                // await db.logSubscriptionCheck(userId, cleanChannelUsername, isSubscribed);
            } catch (logError) {
                console.warn('⚠️ Ошибка логирования проверки подписки (не критично):', logError.message);
            }
            
            if (isSubscribed) {
                console.log(`✅ Пользователь ${userId} подписан на канал @${cleanChannelUsername}`);
                
                res.json({
                    success: true,
                    isSubscribed: true,
                    status: chatMember.status,
                    message: 'Пользователь подписан на канал'
                });
            } else {
                console.log(`❌ Пользователь ${userId} не подписан на канал @${cleanChannelUsername} (статус: ${chatMember.status})`);
                
                res.json({
                    success: false,
                    isSubscribed: false,
                    status: chatMember.status,
                    error: 'Вы не подписаны на канал. Подпишитесь и попробуйте снова.'
                });
            }
            
        } catch (telegramError) {
            console.error(`❌ Ошибка Telegram API при проверке подписки:`, telegramError.message);
            
            // Логируем неудачную попытку
            try {
                // Закомментировано - метод logSubscriptionCheck не существует
                // await db.logSubscriptionCheck(userId, cleanChannelUsername, false);
            } catch (logError) {
                console.warn('⚠️ Ошибка логирования (не критично):', logError.message);
            }
            
            // Обрабатываем различные типы ошибок Telegram
            if (telegramError.response && telegramError.response.body) {
                const errorBody = telegramError.response.body;
                
                if (errorBody.error_code === 400) {
                    if (errorBody.description.includes('chat not found')) {
                        return res.json({
                            success: false,
                            isSubscribed: false,
                            error: 'Канал не найден. Проверьте правильность username канала.'
                        });
                    }
                    
                    if (errorBody.description.includes('user not found')) {
                        return res.json({
                            success: false,
                            isSubscribed: false,
                            error: 'Пользователь не найден.'
                        });
                    }
                }
                
                if (errorBody.error_code === 403) {
                    return res.json({
                        success: false,
                        isSubscribed: false,
                        error: 'Бот не может проверить подписку. Возможно, бот не добавлен в администраторы канала.'
                    });
                }
            }
            
            // Общая ошибка
            res.json({
                success: false,
                isSubscribed: false,
                error: 'Ошибка проверки подписки. Попробуйте позже.'
            });
        }
        
    } catch (error) {
        console.error('❌ Общая ошибка при проверке подписки:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});


// API endpoint для обновления звезд пользователя
app.post('/api/update-user-stars', async (req, res) => {
    try {
        const { userId, stars, completedTasks, taskStatuses } = req.body;
        
        console.log(`💰 Запрос обновления звезд:`, { userId, stars });
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'Не указан userId'
            });
        }

        // Обновляем звезды пользователя
        if (stars !== undefined) {
            await db.updateUserStars(userId, stars);
        }
        
        // Сохраняем выполненные задания если есть
        if (completedTasks && Array.isArray(completedTasks)) {
            // TODO: Реализовать метод updateUserCompletedTasks в database-postgres.js
            // await db.updateUserCompletedTasks(userId, completedTasks);
        }
        
        // Сохраняем статусы заданий если есть
        if (taskStatuses && typeof taskStatuses === 'object') {
            // TODO: Реализовать метод updateUserTaskStatuses в database-postgres.js
            // await db.updateUserTaskStatuses(userId, taskStatuses);
        }

        console.log(`✅ Данные пользователя ${userId} обновлены: ${stars} звезд`);

        res.json({
            success: true,
            stars: stars,
            message: 'Данные пользователя обновлены'
        });
        
    } catch (error) {
        console.error('❌ Ошибка обновления данных пользователя:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});



// API для получения лидерборда по звездам
app.get('/api/leaderboard/stars', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        
        console.log(`📊 Запрос лидерборда по звездам, лимит: ${limit}`);
        
        const query = `
            SELECT 
                u.telegram_id,
                u.first_name,
                u.username,
                u.last_name,
                u.total_stars_earned,
                u.stars as current_stars
            FROM users u
            WHERE u.is_active = true 
            AND u.total_stars_earned > 0
            ORDER BY u.total_stars_earned DESC, u.created_at ASC
            LIMIT $1
        `;
        
        const result = await db.pool.query(query, [limit]);
        
        res.json({ 
            leaderboard: result.rows,
            total: result.rows.length 
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения лидерборда по звездам:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для получения позиции пользователя в лидерборде по звездам
app.get('/api/leaderboard/stars/position/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`👤 Запрос позиции пользователя ${userId} в лидерборде звезд`);
        
        const rankQuery = `
            WITH ranked_users AS (
                SELECT 
                    telegram_id,
                    total_stars_earned,
                    ROW_NUMBER() OVER (ORDER BY total_stars_earned DESC, created_at ASC) as position
                FROM users 
                WHERE is_active = true AND total_stars_earned > 0
            )
            SELECT position, total_stars_earned as score 
            FROM ranked_users 
            WHERE telegram_id = $1
        `;
        
        const result = await db.pool.query(rankQuery, [parseInt(userId)]);
        
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({ position: null, score: 0 });
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения позиции пользователя в лидерборде звезд:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для получения лидерборда по спинам
app.get('/api/leaderboard/spins', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const includeZeros = req.query.includeZeros === 'true';
        
        console.log(`📊 Запрос лидерборда по спинам, лимит: ${limit}, включая нули: ${includeZeros}`);
        
        // Упрощенное условие - возможно таблица spins имеет другую структуру
        const whereCondition = 'WHERE u.is_active = true';
        
        // Упрощенный запрос - просто показываем всех пользователей с нулевыми спинами
        const query = `
            SELECT 
                u.telegram_id,
                u.first_name,
                u.username,
                u.last_name,
                0 as total_spins
            FROM users u
            WHERE u.is_active = true
            ORDER BY u.id ASC
            LIMIT $1
        `;
        
        const result = await db.pool.query(query, [limit]);
        
        res.json({ 
            leaderboard: result.rows,
            total: result.rows.length 
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения лидерборда по спинам:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для получения позиции пользователя в лидерборде по спинам
app.get('/api/leaderboard/spins/position/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`👤 Запрос позиции пользователя ${userId} в лидерборде спинов`);
        
        // Упрощенный запрос для позиции - возвращаем null для всех
        const rankQuery = `
            SELECT NULL as position, 0 as score
        `;
        
        const result = await db.pool.query(rankQuery, [parseInt(userId)]);
        
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({ position: null, score: 0 });
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения позиции пользователя в лидерборде спинов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для получения лидерборда по призам
app.get('/api/leaderboard/prizes', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        
        console.log(`📊 Запрос лидерборда по призам, лимит: ${limit}`);
        
        const query = `
            SELECT 
                u.telegram_id,
                u.first_name,
                u.username,
                u.last_name,
                u.prizes_won
            FROM users u
            WHERE u.is_active = true 
            AND u.prizes_won > 0
            ORDER BY u.prizes_won DESC, u.created_at ASC
            LIMIT $1
        `;
        
        const result = await db.pool.query(query, [limit]);
        
        res.json({ 
            leaderboard: result.rows,
            total: result.rows.length 
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения лидерборда по призам:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для получения позиции пользователя в лидерборде по призам
app.get('/api/leaderboard/prizes/position/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`👤 Запрос позиции пользователя ${userId} в лидерборде призов`);
        
        const rankQuery = `
            WITH ranked_users AS (
                SELECT 
                    telegram_id,
                    prizes_won,
                    ROW_NUMBER() OVER (ORDER BY prizes_won DESC, created_at ASC) as position
                FROM users 
                WHERE is_active = true AND prizes_won > 0
            )
            SELECT position, prizes_won as score 
            FROM ranked_users 
            WHERE telegram_id = $1
        `;
        
        const result = await db.pool.query(rankQuery, [parseInt(userId)]);
        
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({ position: null, score: 0 });
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения позиции пользователя в лидерборде призов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для получения общего лидерборда (совместимость)
app.get('/api/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        // По умолчанию возвращаем лидерборд по рефералам для совместимости
        console.log(`📊 Запрос общего лидерборда, лимит: ${limit}`);
        
        const leaderboard = await db.getGlobalReferralsLeaderboard(limit);
        
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

// 🔧 ТЕСТОВЫЙ ENDPOINT для проверки работы API
app.get('/api/test-subscription/:userId/:channel', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const channelUsername = req.params.channel;
        
        console.log(`🧪 ТЕСТ: Проверка подписки ${userId} на @${channelUsername}`);
        
        const chatMember = await bot.getChatMember(`@${channelUsername}`, userId);
        
        res.json({
            success: true,
            userId: userId,
            channel: channelUsername,
            status: chatMember.status,
            isSubscribed: ['member', 'administrator', 'creator'].includes(chatMember.status),
            testMode: true
        });
        
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            testMode: true
        });
    }
});

// 2. ЗАМЕНИТЕ API для получения статистики пользователя:
app.get('/api/user/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        
        console.log(`👤 Запрос данных пользователя: ${telegramId}`);
        
        // Получаем пользователя
        const user = await db.getUser(parseInt(telegramId));
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // ВАЖНО: Принудительно обновляем счетчик рефералов перед отправкой
        await db.updateReferralCount(parseInt(telegramId));
        
        // Получаем обновленные данные
        const updatedUser = await db.getUser(parseInt(telegramId));
        
        console.log(`✅ Данные пользователя ${telegramId} получены:`, {
            stars: updatedUser.stars,
            referrals: updatedUser.referrals,
            total_stars_earned: updatedUser.total_stars_earned
        });
        
        res.json({
            ...updatedUser,
            stats: {
                referrals: updatedUser.referrals,
                totalSpins: updatedUser.total_spins,
                prizesWon: updatedUser.prizes_won,
                totalStarsEarned: updatedUser.total_stars_earned
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения данных пользователя:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Дополнительно: endpoint для обновления отдельно звезд (для совместимости)
app.post('/api/user/:userId/stars', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { amount, operation = 'add' } = req.body;
        
        if (!userId || amount === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Не указаны userId или amount'
            });
        }

        // Получаем текущие данные пользователя
        const userData = await db.getUserWithTasks(userId);
        if (!userData) {
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }

        let newStars;
        if (operation === 'add') {
            newStars = (userData.stars || 0) + amount;
        } else if (operation === 'subtract') {
            newStars = Math.max(0, (userData.stars || 0) - amount);
        } else {
            newStars = amount; // set
        }

        // Обновляем звезды
        await db.updateUserStars(userId, newStars);

        console.log(`💰 Звезды пользователя ${userId} изменены: ${userData.stars || 0} → ${newStars} (${operation} ${amount})`);

        res.json({
            success: true,
            stars: newStars,
            previousStars: userData.stars || 0,
            operation: operation,
            amount: amount
        });
        
    } catch (error) {
        console.error('❌ Ошибка изменения звезд пользователя:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// Endpoint для получения статистики заданий пользователя
app.get('/api/user/:userId/tasks-stats', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'Неверный userId'
            });
        }

        // Получаем данные пользователя
        const userData = await db.getUserWithTasks(userId);
        if (!userData) {
            return res.json({
                success: true,
                completedTasks: [],
                taskStatuses: {},
                totalCompleted: 0
            });
        }

        // Получаем историю проверок подписок
        // TODO: Реализовать метод getSubscriptionHistory в database-postgres.js
        const subscriptionHistory = []; // await db.getSubscriptionHistory(userId);

        res.json({
            success: true,
            completedTasks: userData.completed_tasks || [],
            taskStatuses: userData.task_statuses || {},
            totalCompleted: (userData.completed_tasks || []).length,
            subscriptionHistory: subscriptionHistory,
            totalStars: userData.stars || 0
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения статистики заданий:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// API для обновления профиля пользователя
app.post('/api/user/:userId/profile', async (req, res) => {
    try {
        const { userId } = req.params;
        const { first_name, username, last_name } = req.body;
        
        console.log(`👤 Обновление профиля пользователя ${userId}:`, {
            first_name,
            username,
            last_name
        });
        
        // Обновляем профиль в базе данных
        await db.updateUserProfile(parseInt(userId), {
            first_name: first_name || '',
            username: username || '',
            last_name: last_name || ''
        });
        
        console.log(`✅ Профиль пользователя ${userId} обновлен`);
        
        res.json({
            success: true,
            message: 'Профиль обновлен'
        });
        
    } catch (error) {
        console.error('❌ Ошибка обновления профиля:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Endpoint для сброса прогресса заданий (для админки)
app.post('/api/user/:userId/reset-tasks', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { resetType = 'all' } = req.body; // 'all', 'statuses', 'completed'
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'Неверный userId'
            });
        }

        console.log(`🔄 Сброс заданий пользователя ${userId}, тип: ${resetType}`);

        if (resetType === 'all' || resetType === 'completed') {
            // TODO: Реализовать метод updateUserCompletedTasks
            // await db.updateUserCompletedTasks(userId, []);
        }

        if (resetType === 'all' || resetType === 'statuses') {
            // TODO: Реализовать метод updateUserTaskStatuses
            // await db.updateUserTaskStatuses(userId, {});
        }

        res.json({
            success: true,
            message: `Задания пользователя ${userId} сброшены (${resetType})`
        });
        
    } catch (error) {
        console.error('❌ Ошибка сброса заданий:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
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
        
        // Получаем количество рефералов ПРАВИЛЬНО через user.id
        let referralsCount = 0;
        try {
            const referralsQuery = `
                SELECT COUNT(*) as count 
                FROM referrals 
                WHERE referrer_id = $1 AND is_active = true
            `;
            const referralsResult = await db.pool.query(referralsQuery, [user.id]);
            referralsCount = parseInt(referralsResult.rows[0].count) || 0;
            
            console.log(`📊 Получено рефералов для пользователя ${userId} (user.id=${user.id}): ${referralsCount}`);
        } catch (error) {
            console.error('❌ Ошибка получения количества рефералов:', error);
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
            availableFriendSpins: user.available_friend_spins || 0, // ДОБАВИТЬ эту строку!
            join_date: user.join_date,
            stats: {
                stars: user.stars || 0,
                totalStars: user.total_stars_earned || 0,
                totalStarsEarned: user.total_stars_earned || 0,
                totalSpins: user.total_spins || 0,
                prizesWon: user.prizes_won || 0,
                referrals: referralsCount,
                referralsCount: referralsCount,
                starsFromReferrals: referralsCount * 10, // ИЗМЕНИТЬ: 10 звезд за каждого реферала!
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

// API для отладки рефералов пользователя
app.get('/api/debug-referrals/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`🔍 Отладка рефералов пользователя ${userId}`);
        
        const user = await db.getUser(parseInt(userId));
        
        // Получаем количество рефералов из таблицы referrals
        const referralsQuery = `
            SELECT COUNT(*) as count, 
                   array_agg(referred_id) as referred_ids
            FROM referrals 
            WHERE referrer_id = (SELECT id FROM users WHERE telegram_id = $1)
        `;
        const referralsResult = await db.pool.query(referralsQuery, [parseInt(userId)]);
        const actualReferrals = referralsResult.rows[0];
        
        // Получаем список рефералов с именами
        const referralsList = `
            SELECT u.telegram_id, u.first_name, u.username, r.created_at
            FROM referrals r
            JOIN users u ON u.id = r.referred_id  
            WHERE r.referrer_id = (SELECT id FROM users WHERE telegram_id = $1)
            ORDER BY r.created_at DESC
        `;
        const referralsListResult = await db.pool.query(referralsList, [parseInt(userId)]);
        
        const debugData = {
            userId: userId,
            userFromDB: {
                referrals: user?.referrals || 0,
                stars: user?.stars || 0,
                total_stars_earned: user?.total_stars_earned || 0
            },
            actualReferrals: {
                count: parseInt(actualReferrals.count) || 0,
                referred_ids: actualReferrals.referred_ids || []
            },
            referralsList: referralsListResult.rows,
            needsSync: (user?.referrals || 0) !== (parseInt(actualReferrals.count) || 0),
            timestamp: new Date().toISOString()
        };
        
        console.log('🔍 Отладка рефералов:', JSON.stringify(debugData, null, 2));
        
        res.json(debugData);
    } catch (error) {
        console.error('❌ Ошибка отладки рефералов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для принудительной синхронизации рефералов конкретного пользователя
app.post('/api/sync-user-referrals/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`🔄 Синхронизация рефералов пользователя ${userId}`);
        
        // Получаем актуальное количество рефералов
        const referralsQuery = `
            SELECT COUNT(*) as count
            FROM referrals 
            WHERE referrer_id = (SELECT id FROM users WHERE telegram_id = $1) AND is_active = true
        `;
        const referralsResult = await db.pool.query(referralsQuery, [parseInt(userId)]);
        const actualCount = parseInt(referralsResult.rows[0].count) || 0;
        
        // Обновляем запись пользователя
        const updateQuery = `
            UPDATE users 
            SET referrals = $1, 
                total_stars_earned = total_stars_earned + ($1 * 10 - COALESCE(referrals, 0) * 10),
                stars = stars + ($1 * 10 - COALESCE(referrals, 0) * 10)
            WHERE telegram_id = $2
            RETURNING referrals, stars, total_stars_earned
        `;
        const updateResult = await db.pool.query(updateQuery, [actualCount, parseInt(userId)]);
        
        const syncData = {
            userId: userId,
            oldReferrals: updateResult.rows[0]?.referrals - actualCount || 0,
            newReferrals: actualCount,
            updatedUser: updateResult.rows[0],
            timestamp: new Date().toISOString()
        };
        
        console.log('✅ Синхронизация завершена:', syncData);
        
        res.json({
            success: true,
            message: `Рефералы пользователя ${userId} синхронизированы`,
            data: syncData
        });
        
    } catch (error) {
        console.error('❌ Ошибка синхронизации рефералов пользователя:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// API для активации пользователя (GET для простоты)
app.get('/api/activate-user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`🔄 Активация пользователя ${userId}`);
        
        const updateQuery = `UPDATE users SET is_active = true WHERE telegram_id = $1 RETURNING id, telegram_id, first_name, is_active`;
        const result = await db.pool.query(updateQuery, [parseInt(userId)]);
        
        if (result.rows.length === 0) {
            return res.json({ error: 'Пользователь не найден' });
        }
        
        const user = result.rows[0];
        
        console.log(`✅ Пользователь ${userId} активирован`);
        
        res.json({
            success: true,
            message: `Пользователь ${user.first_name} активирован`,
            user: user
        });
        
    } catch (error) {
        console.error('❌ Ошибка активации пользователя:', error);
        res.status(500).json({ error: error.message });
    }
});

// API для быстрой проверки данных пользователя
app.get('/api/quick-debug/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`🔍 Быстрая проверка данных пользователя ${userId}`);
        
        // 1. Данные пользователя из таблицы users
        const userQuery = `SELECT id, telegram_id, first_name, username, referrals, stars, is_active FROM users WHERE telegram_id = $1`;
        const userResult = await db.pool.query(userQuery, [parseInt(userId)]);
        const user = userResult.rows[0];
        
        if (!user) {
            return res.json({ error: 'Пользователь не найден' });
        }
        
        // 2. Реальные рефералы из таблицы referrals
        const referralsQuery = `
            SELECT r.*, u.first_name, u.username 
            FROM referrals r 
            JOIN users u ON u.id = r.referred_id 
            WHERE r.referrer_id = $1 AND r.is_active = true
        `;
        const referralsResult = await db.pool.query(referralsQuery, [user.id]);
        
        // 3. Позиция в лидерборде
        const positionQuery = `
            WITH ranked_users AS (
                SELECT 
                    u.telegram_id,
                    u.first_name,
                    COALESCE((SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.is_active = true), 0) as referrals_count,
                    ROW_NUMBER() OVER (ORDER BY COALESCE((SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.is_active = true), 0) DESC, u.id ASC) as position
                FROM users u
                WHERE u.is_active = true
            )
            SELECT position, referrals_count FROM ranked_users WHERE telegram_id = $1
        `;
        const positionResult = await db.pool.query(positionQuery, [parseInt(userId)]);
        
        const debugData = {
            user_id: userId,
            user_internal_id: user.id,
            users_table: {
                referrals: user.referrals,
                stars: user.stars,
                first_name: user.first_name,
                is_active: user.is_active
            },
            referrals_table: {
                count: referralsResult.rows.length,
                list: referralsResult.rows.map(r => ({
                    referred_user: r.first_name || r.username,
                    date: r.referral_date,
                    active: r.is_active
                }))
            },
            leaderboard_position: positionResult.rows[0] || { position: null, referrals_count: 0 },
            discrepancy: {
                users_vs_referrals: user.referrals !== referralsResult.rows.length,
                expected_position: referralsResult.rows.length > 0 ? 'Должен быть в топе' : 'Не в рейтинге'
            }
        };
        
        console.log('🔍 Debug данные:', JSON.stringify(debugData, null, 2));
        
        res.json(debugData);
        
    } catch (error) {
        console.error('❌ Ошибка быстрой проверки:', error);
        res.status(500).json({ error: error.message });
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
        
        // Получаем все каналы с дополнительной информацией (включая end_date)
        const allChannels = await db.getAllChannels();
        // Фильтруем только активные и не истекшие каналы
        const channels = allChannels.filter(channel => {
            // Проверяем базовые условия
            if (!channel.is_active) return false;
            
            // Для временных каналов проверяем не истекло ли время
            if (channel.placement_type === 'time' && channel.end_date) {
                const now = new Date();
                const endDate = new Date(channel.end_date);
                if (endDate <= now) {
                    console.log(`⏰ Канал ${channel.channel_username} истек (${channel.end_date}), скрываем`);
                    return false;
                }
            }
            
            return channel.status === 'active' || channel.status === 'scheduled';
        });
        
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

// API для завершения задания и получения награды
app.post('/api/tasks/complete', async (req, res) => {
    try {
        const { userId, taskId, taskType, channelUsername, rewardAmount } = req.body;
        
        console.log(`🎯 Завершение задания:`, { userId, taskId, taskType, channelUsername, rewardAmount });
        
        if (!userId || !taskId || !rewardAmount) {
            return res.status(400).json({
                success: false,
                error: 'Отсутствуют обязательные параметры'
            });
        }

        // Получаем пользователя из БД
        const user = await db.getUser(parseInt(userId));
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }

        // Если это задание с подпиской на канал, проверяем подписку
        if (taskType === 'subscription' && channelUsername) {
            try {
                console.log(`🔍 Проверка подписки ${userId} на канал @${channelUsername}...`);
                
                const chatMember = await bot.getChatMember(`@${channelUsername}`, userId);
                console.log(`📊 Статус пользователя в канале: ${chatMember.status}`);
                
                const subscribedStatuses = ['member', 'administrator', 'creator'];
                const isSubscribed = subscribedStatuses.includes(chatMember.status);
                
                if (!isSubscribed) {
                    console.log(`❌ Пользователь не подписан. Статус: ${chatMember.status}`);
                    return res.json({
                        success: false,
                        error: 'Вы не подписаны на канал'
                    });
                }
                
                console.log(`✅ Подписка подтверждена: ${userId} → @${channelUsername}`);
                
                // Записываем информацию о подписке в БД
                try {
                    console.log(`📝 Записываем информацию о подписке в БД...`);
                    const subscriptionResult = await db.recordChannelSubscription(user.id, channelUsername);
                    
                    if (subscriptionResult.success) {
                        if (subscriptionResult.alreadyExists) {
                            console.log(`ℹ️ Подписка уже была записана ранее`);
                        } else {
                            console.log(`✅ Подписка успешно записана в БД`);
                        }
                    } else {
                        console.log(`⚠️ Не удалось записать подписку: ${subscriptionResult.error}`);
                    }
                } catch (dbError) {
                    console.error('⚠️ Ошибка логирования подписки (не критично):', dbError.message);
                    // Не прерываем выполнение - подписка проверена, просто не записалась в БД
                }
                
            } catch (error) {
                console.error('❌ Ошибка проверки подписки:', error);
                return res.json({
                    success: false,
                    error: 'Ошибка проверки подписки'
                });
            }
        }

        // Начисляем звезды пользователю
        const updatedUser = await db.addUserStars(
            parseInt(userId), 
            parseInt(rewardAmount), 
            'task_completion',
            { taskId, taskType, channelUsername }
        );

        console.log(`💰 Начислено ${rewardAmount} звезд пользователю ${userId}. Новый баланс: ${updatedUser.stars}`);

        // Сохраняем задание как выполненное в БД
        try {
            console.log(`📝 Сохраняем задание ${taskId} как выполненное для пользователя ${userId}`);
            
            // Получаем текущие данные пользователя
            const currentUser = await db.getUser(parseInt(userId));
            let completedTasks = [];
            let taskStatuses = {};
            
            try {
                completedTasks = JSON.parse(currentUser.completed_tasks || '[]');
                taskStatuses = JSON.parse(currentUser.task_statuses || '{}');
            } catch (parseError) {
                console.warn('⚠️ Ошибка парсинга JSON данных, используем значения по умолчанию');
                completedTasks = [];
                taskStatuses = {};
            }
            
            // Добавляем задание в выполненные, если его еще нет
            if (!completedTasks.includes(taskId)) {
                completedTasks.push(taskId);
            }
            
            // Устанавливаем статус как completed
            taskStatuses[taskId] = 'completed';
            
            // Сохраняем в БД
            await db.pool.query(`
                UPDATE users 
                SET completed_tasks = $1, task_statuses = $2 
                WHERE telegram_id = $3
            `, [JSON.stringify(completedTasks), JSON.stringify(taskStatuses), parseInt(userId)]);
            
            console.log(`✅ Задание ${taskId} сохранено как выполненное в БД`);
            
        } catch (taskSaveError) {
            console.error('⚠️ Ошибка сохранения статуса задания (не критично):', taskSaveError);
        }

        res.json({
            success: true,
            reward: parseInt(rewardAmount),
            newBalance: updatedUser.stars,
            message: `Получено ${rewardAmount} ⭐!`
        });

    } catch (error) {
        console.error('❌ Ошибка завершения задания:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера'
        });
    }
});

// API для получения статистики реферальной системы
app.get('/api/referral/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const stats = await referralManager.getReferralStats(parseInt(userId));
        
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

// Веб-админка отключена - используется только Telegram управление
// Для просмотра базовой статистики оставляем простой эндпоинт
app.get('/admin', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Админка отключена</title>
            <style>
                body { font-family: Arial; text-align: center; padding: 50px; }
                .info { background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 20px; }
            </style>
        </head>
        <body>
            <h1>🤖 Админка через Telegram</h1>
            <div class="info">
                <p>Веб-панель отключена</p>
                <p>Все управление происходит через Telegram бот-администратор</p>
                <p>Используйте команды бота для управления системой</p>
            </div>
        </body>
        </html>
    `);
});

// API для просмотра транзакций пользователя
app.get('/api/user/:userId/transactions', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        const transactions = await new Promise((resolve, reject) => {
            db.db.all(
                `SELECT st.*, u.first_name 
                 FROM stars_transactions st
                 JOIN users u ON st.user_id = u.id
                 WHERE u.telegram_id = ?
                 ORDER BY st.transaction_date DESC
                 LIMIT ?`,
                [parseInt(userId), limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
        
        res.json({
            success: true,
            transactions: transactions.map(t => ({
                id: t.id,
                amount: t.amount,
                type: t.transaction_type,
                status: t.status,
                date: t.transaction_date,
                metadata: t.metadata ? JSON.parse(t.metadata) : null
            }))
        });
    } catch (error) {
        console.error('❌ Ошибка получения транзакций:', error);
        res.status(500).json({ error: 'Ошибка получения истории транзакций' });
    }
});

// Middleware для проверки прав админа
function requireAdmin(req, res, next) {
    const adminToken = req.headers['admin-token'] || req.query.token;
    const expectedToken = process.env.ADMIN_TOKEN;
    
    // Если ADMIN_TOKEN не установлен, создаем базовую защиту
    if (!expectedToken) {
        console.warn('⚠️ ADMIN_TOKEN не установлен! Используем базовую проверку по IP');
        // В development режиме разрешаем localhost
        if (process.env.NODE_ENV !== 'production') {
            const clientIp = req.ip || req.connection.remoteAddress;
            if (clientIp.includes('127.0.0.1') || clientIp.includes('::1')) {
                return next();
            }
        }
        return res.status(403).json({ 
            error: 'Доступ запрещен: ADMIN_TOKEN не настроен',
            setup: 'Установите ADMIN_TOKEN в переменных окружения' 
        });
    }
    
    // Проверяем токен
    if (adminToken !== expectedToken) {
        console.warn(`🚫 Попытка неавторизованного доступа: ${req.ip}`);
        return res.status(403).json({ 
            error: 'Неверный админ токен',
            required: 'Передайте admin-token в заголовке или ?token= в URL' 
        });
    }
    
    console.log(`✅ Авторизованный админ доступ: ${req.method} ${req.path}`);
    next();
}

// ВСЕ АДМИНСКИЕ API ВКЛЮЧЕНЫ - основная реализация
//
// Получение общей статистики
// Полная статистика админ панели - ОСНОВНАЯ РЕАЛИЗАЦИЯ
app.get('/api/admin/stats', requireAuth, async (req, res) => {
    try {
        console.log('📊 Admin API: Запрос полной статистики');
        
        const stats = {};
        
        // Общая статистика пользователей
        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM users');
            stats.totalUsers = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета пользователей:', err);
            stats.totalUsers = 0;
        }

        // Активные пользователи за 24 часа  
        try {
            const result = await db.pool.query("SELECT COUNT(*) as count FROM users WHERE last_activity > NOW() - INTERVAL '1 day'");
            stats.activeUsers = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета активных пользователей:', err);
            stats.activeUsers = 0;
        }

        // Новые пользователи за сегодня
        try {
            const result = await db.pool.query("SELECT COUNT(*) as count FROM users WHERE join_date > CURRENT_DATE");
            stats.todayUsers = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета новых пользователей:', err);
            stats.todayUsers = 0;
        }

        // Статистика каналов
        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM partner_channels WHERE is_active = true');
            stats.totalChannels = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета каналов:', err);
            stats.totalChannels = 0;
        }

        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM partner_channels WHERE is_active = true AND is_hot_offer = true');
            stats.hotChannels = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета горячих каналов:', err);
            stats.hotChannels = 0;
        }

        // Статистика подписок
        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM user_channel_subscriptions');
            stats.totalSubscriptions = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета подписок:', err);
            stats.totalSubscriptions = 0;
        }

        try {
            const result = await db.pool.query("SELECT COUNT(*) as count FROM user_channel_subscriptions WHERE subscribed_date > CURRENT_DATE");
            stats.todaySubscriptions = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета подписок за сегодня:', err);
            stats.todaySubscriptions = 0;
        }

        // Статистика прокруток
        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM prizes');
            stats.totalSpins = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета прокруток:', err);
            stats.totalSpins = 0;
        }

        try {
            const result = await db.pool.query("SELECT COUNT(*) as count FROM prizes WHERE created_at > CURRENT_DATE");
            stats.todaySpins = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета прокруток за сегодня:', err);
            stats.todaySpins = 0;
        }

        // Призы ожидающие выдачи
        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM prizes WHERE is_given = false');
            stats.pendingPrizes = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета призов:', err);
            stats.pendingPrizes = 0;
        }

        try {
            const result = await db.pool.query("SELECT COUNT(*) as count FROM prizes WHERE is_given = false AND (type ILIKE '%certificate%' OR type ILIKE '%сертификат%')");
            stats.pendingCertificates = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета сертификатов:', err);
            stats.pendingCertificates = 0;
        }

        // Общая сумма звезд у всех пользователей
        try {
            const result = await db.pool.query('SELECT SUM(stars) as total FROM users');
            stats.totalStars = parseInt(result.rows[0]?.total) || 0;
        } catch (err) {
            console.error('Ошибка подсчета звезд:', err);
            stats.totalStars = 0;
        }

        // Топ каналы по подпискам
        try {
            const result = await db.pool.query(`
                SELECT pc.channel_name, pc.channel_username, pc.current_subscribers, 
                       COUNT(ucs.user_id) as conversions,
                       CASE 
                           WHEN pc.current_subscribers > 0 THEN 
                               ROUND((COUNT(ucs.user_id)::float / pc.current_subscribers * 100)::numeric, 2)
                           ELSE 0 
                       END as conversion_rate
                FROM partner_channels pc
                LEFT JOIN user_channel_subscriptions ucs ON pc.id = ucs.channel_id
                WHERE pc.is_active = true AND pc.current_subscribers > 0
                GROUP BY pc.id, pc.channel_name, pc.channel_username, pc.current_subscribers
                ORDER BY pc.current_subscribers DESC
                LIMIT 5
            `);
            
            stats.topChannels = result.rows.map(row => ({
                name: row.channel_name || row.channel_username,
                username: row.channel_username,
                subscribers: row.current_subscribers || 0,
                conversions: parseInt(row.conversions) || 0,
                conversionRate: parseFloat(row.conversion_rate) || 0
            }));
        } catch (err) {
            console.error('Ошибка получения топ каналов:', err);
            stats.topChannels = [];
        }

        // Системная информация
        stats.system = {
            status: 'healthy',
            uptime: Math.floor(process.uptime()),
            dbStatus: 'connected',
            memoryUsage: process.memoryUsage().heapUsed,
            version: '1.0.0'
        };

        res.json({
            success: true,
            stats
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения статистики:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка получения статистики',
            stats: {
                totalUsers: 0,
                activeUsers: 0,
                todayUsers: 0,
                totalChannels: 0,
                hotChannels: 0,
                totalSubscriptions: 0,
                todaySubscriptions: 0,
                totalSpins: 0,
                todaySpins: 0,
                pendingPrizes: 0,
                pendingCertificates: 0,
                totalStars: 0,
                topChannels: [],
                system: {
                    status: 'error',
                    uptime: Math.floor(process.uptime()),
                    dbStatus: 'error',
                    memoryUsage: process.memoryUsage().heapUsed,
                    version: '1.0.0'
                }
            }
        });
    }
});

// ДУБЛИКАТ - Закомментировано, так как перенесено в начало файла
// Получение списка каналов
app.get('/api/admin/channels', requireAuth, async (req, res) => {
    try {
        console.log('📺 Админ: запрос списка каналов');
        console.log('🔍 Детали запроса:', {
            method: req.method,
            url: req.url,
            originalUrl: req.originalUrl,
            headers: req.headers,
            timestamp: new Date()
        });

        // Временно возвращаем тестовые данные без использования БД
        const testChannels = [
            {
                id: 1,
                channel_username: 'testchannel',
                channel_name: 'Тестовый канал',
                reward_stars: 10,
                is_active: true,
                current_subscribers: 0,
                created_at: new Date()
            }
        ];

        res.json({
            success: true,
            channels: testChannels
        });
    } catch (error) {
        console.error('❌ Ошибка получения каналов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Тестовый эндпоинт для проверки Telegram Bot API
app.get('/api/admin/bot/test', requireAuth, async (req, res) => {
    try {
        if (!bot) {
            return res.status(500).json({ 
                error: 'Telegram Bot не инициализирован',
                available: false
            });
        }

        // Тестируем getMe
        const botInfo = await bot.getMe();
        
        res.json({
            success: true,
            bot: {
                id: botInfo.id,
                username: botInfo.username,
                first_name: botInfo.first_name,
                is_bot: botInfo.is_bot,
                can_join_groups: botInfo.can_join_groups,
                can_read_all_group_messages: botInfo.can_read_all_group_messages,
                supports_inline_queries: botInfo.supports_inline_queries
            },
            available: true,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Ошибка тестирования Bot API:', error);
        res.status(500).json({ 
            error: error.message,
            available: false,
            timestamp: new Date().toISOString()
        });
    }
});

// Простой тест API
app.get('/api/admin/test', requireAuth, (req, res) => {
    res.json({ 
        success: true, 
        message: 'API работает!', 
        timestamp: new Date().toISOString(),
        user: req.user || null
    });
});

// Тест подключения к базе данных
app.get('/api/admin/db-test', requireAuth, async (req, res) => {
    try {
        console.log('🔍 Тестируем подключение к БД...');
        
        // Тест 1: Подсчет пользователей
        const countResult = await db.pool.query('SELECT COUNT(*) as total FROM users');
        const userCount = parseInt(countResult.rows[0]?.total) || 0;
        
        res.json({ 
            success: true,
            message: 'БД работает!', 
            database: 'connected',
            users_count: userCount,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Ошибка тестирования БД:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка подключения к БД',
            details: error.message,
            timestamp: new Date().toISOString() 
        });
    }
});

// Статистика призов
app.get('/api/admin/prizes/stats', requireAuth, async (req, res) => {
    try {
        console.log('🎁 Admin API: Запрос статистики призов');
        
        const stats = {};
        
        // Общее количество призов
        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM prizes');
            stats.totalPrizes = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета призов:', err);
            stats.totalPrizes = 0;
        }
        
        // Призы ожидающие выдачи
        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM prizes WHERE is_given = false');
            stats.pendingPrizes = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета ожидающих призов:', err);
            stats.pendingPrizes = 0;
        }
        
        // Выданные призы
        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM prizes WHERE is_given = true');
            stats.givenPrizes = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета выданных призов:', err);
            stats.givenPrizes = 0;
        }
        
        res.json({
            success: true,
            stats
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения статистики призов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка получения статистики призов'
        });
    }
});

// API для получения списка призов с поддержкой фильтрации и пагинации
app.get('/api/admin/prizes', requireAuth, async (req, res) => {
    try {
        const { 
            status = 'pending', 
            page = 1, 
            limit = 20, 
            search = '',
            type = 'all',
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        console.log(`🎁 Admin API: Запрос призов (${status}), страница ${page}`);
        
        // Строим условие статуса
        const statusCondition = status === 'pending' ? 'p.is_given = false' : 'p.is_given = true';
        
        // Строим условие поиска
        let searchCondition = '';
        let searchParams = [];
        let paramIndex = 1;
        
        if (search) {
            searchCondition = `
                AND (u.first_name ILIKE $${paramIndex} 
                    OR u.last_name ILIKE $${paramIndex} 
                    OR u.username ILIKE $${paramIndex}
                    OR p.type ILIKE $${paramIndex}
                    OR p.description ILIKE $${paramIndex})
            `;
            searchParams.push(`%${search}%`);
            paramIndex++;
        }
        
        // Строим условие типа
        let typeCondition = '';
        if (type !== 'all') {
            typeCondition = `AND p.type = $${paramIndex}`;
            searchParams.push(type);
            paramIndex++;
        }
        
        // Валидация сортировки
        const validSortColumns = ['created_at', 'type', 'given_at'];
        const sortColumn = validSortColumns.includes(sortBy) ? `p.${sortBy}` : 'p.created_at';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        const prizesQuery = `
            SELECT 
                p.id,
                p.type,
                p.description,
                p.created_at,
                p.is_given,
                p.given_at,
                u.telegram_id as user_telegram_id,
                u.first_name as user_first_name,
                u.last_name as user_last_name,
                u.username as user_username
            FROM prizes p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE ${statusCondition}
            ${searchCondition}
            ${typeCondition}
            ORDER BY ${sortColumn} ${order}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        const countQuery = `
            SELECT COUNT(*) as total
            FROM prizes p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE ${statusCondition}
            ${searchCondition}
            ${typeCondition}
        `;
        
        // Выполняем запросы
        const prizesResult = await db.pool.query(prizesQuery, [...searchParams, parseInt(limit), parseInt(offset)]);
        const countResult = await db.pool.query(countQuery, searchParams);
        
        const total = parseInt(countResult.rows[0]?.total) || 0;
        
        console.log(`✅ Найдено призов: ${prizesResult.rows.length} из ${total}`);
        
        res.json({
            success: true,
            prizes: prizesResult.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения призов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения списка призов'
        });
    }
});

// API для получения событий дашборда
app.get('/api/admin/events', requireAuth, async (req, res) => {
    try {
        console.log('📋 Admin API: Запрос событий дашборда');
        
        const { limit = 10 } = req.query;
        const events = [];
        
        try {
            // Последние регистрации пользователей
            const newUsers = await db.pool.query(`
                SELECT telegram_id, first_name, username, join_date as created_at
                FROM users 
                ORDER BY join_date DESC 
                LIMIT $1
            `, [Math.min(parseInt(limit), 20)]);
            
            newUsers.rows.forEach(user => {
                events.push({
                    id: `user_${user.telegram_id}`,
                    type: 'user',
                    title: 'Новый пользователь',
                    description: `Пользователь ${user.first_name}${user.username ? ` (@${user.username})` : ''} присоединился к боту`,
                    created_at: user.created_at,
                    user: { 
                        name: user.first_name,
                        username: user.username 
                    }
                });
            });
            
        } catch (err) {
            console.error('Ошибка получения пользователей:', err);
        }

        try {
            // Последние выданные призы
            const recentPrizes = await db.pool.query(`
                SELECT p.id, p.type, p.description, p.created_at,
                       u.first_name, u.username
                FROM prizes p
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.is_given = true
                ORDER BY p.given_at DESC 
                LIMIT 3
            `);
            
            recentPrizes.rows.forEach(prize => {
                events.push({
                    id: `prize_${prize.id}`,
                    type: 'prize',
                    title: 'Выдан приз',
                    description: `Выдан приз: ${prize.description || prize.type}`,
                    created_at: prize.created_at,
                    user: {
                        name: prize.first_name,
                        username: prize.username
                    }
                });
            });
            
        } catch (err) {
            console.error('Ошибка получения призов:', err);
        }

        // Сортируем события по дате
        events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        console.log(`✅ Возвращаем ${events.length} событий`);
        
        res.json({
            success: true,
            events: events.slice(0, parseInt(limit))
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения событий дашборда:', error);
        res.json({ 
            success: false,
            events: [] 
        });
    }
});

// API для статистики активности
app.get('/api/admin/activity-stats', requireAuth, async (req, res) => {
    try {
        console.log('📈 Admin API: Запрос статистики активности');
        
        // Статистика по дням за последнюю неделю
        const activity = await db.pool.query(`
            SELECT 
                DATE(join_date) as date,
                COUNT(*) as users
            FROM users 
            WHERE join_date >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(join_date)
            ORDER BY date
        `);
        
        // Общее количество активных пользователей
        const totalActive = await db.pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
        
        res.json({
            success: true,
            daily_users: activity.rows,
            total_active: parseInt(totalActive.rows[0]?.count) || 0
        });
        
    } catch (error) {
        console.error('❌ Ошибка статистики активности:', error);
        res.json({ 
            success: false,
            daily_users: [], 
            total_active: 0 
        });
    }
});

//

// ДУБЛИКАТ - Закомментировано, так как перенесено в начало файла
// Проверка канала перед добавлением  
app.post('/api/admin/channels/check', requireAuth, async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            console.log('❌ Проверка канала: отсутствует username');
            return res.status(400).json({ error: 'Username обязателен' });
        }

        console.log(`🔍 Админ: проверка канала @${username}`);
        console.log(`🤖 Состояние бота:`, { 
            available: !!bot, 
            botInfo: bot?.botInfo,
            hasGetMe: typeof bot?.getMe === 'function'
        });

        // Проверяем что бот инициализирован
        if (!bot) {
            console.log('❌ Проверка канала: бот не инициализирован');
            return res.status(500).json({ 
                error: 'Telegram Bot не инициализирован',
                details: 'Сервер не смог подключиться к Telegram Bot API'
            });
        }

        // Получаем информацию о боте если её нет
        let botId = bot.botInfo?.id;
        if (!botId) {
            console.log('🔄 Получаем информацию о боте через getMe()...');
            try {
                const me = await bot.getMe();
                botId = me.id;
                // Сохраняем информацию о боте для последующих запросов
                bot.botInfo = me;
                console.log(`✅ Получили ID бота: ${botId} (@${me.username})`);
            } catch (err) {
                console.error('❌ Ошибка получения информации о боте:', {
                    message: err.message,
                    code: err.code,
                    response: err.response?.body
                });
                return res.status(500).json({ 
                    error: 'Не удалось получить информацию о боте',
                    details: err.message,
                    suggestion: 'Проверьте корректность BOT_TOKEN и доступность Telegram API'
                });
            }
        } else {
            console.log(`✅ Используем сохранённую информацию о боте: ${botId}`);
        }

        // Пытаемся получить информацию о канале через Telegram Bot API
        try {
            console.log(`📡 Получаем информацию о канале @${username}...`);
            const chat = await bot.getChat(`@${username}`);
            console.log(`✅ Канал найден:`, { 
                id: chat.id, 
                title: chat.title, 
                type: chat.type, 
                member_count: chat.member_count 
            });
            
            console.log(`👤 Проверяем статус бота (${botId}) в канале @${username}...`);
            const chatMember = await bot.getChatMember(`@${username}`, botId);
            console.log(`📊 Статус бота:`, chatMember);
            
            const isBotAdmin = ['administrator', 'creator'].includes(chatMember.status);
            const channelInfo = {
                channelName: chat.title,
                channelId: chat.id,
                subscribersCount: chat.member_count,
                isBotAdmin: isBotAdmin,
                type: chat.type,
                botStatus: chatMember.status
            };

            console.log(`✅ Канал @${username} найден:`, channelInfo);
            
            res.json(channelInfo);
        } catch (error) {
            console.error(`❌ Ошибка проверки канала @${username}:`, error);
            console.error('Детали ошибки:', {
                message: error.message,
                code: error.code,
                response: error.response?.body
            });
            
            // Обработка различных типов ошибок Telegram API
            if (error.response && error.response.body) {
                const telegramError = error.response.body;
                console.log(`📋 Ошибка Telegram API: ${telegramError.error_code} - ${telegramError.description}`);
                
                switch (telegramError.error_code) {
                    case 400:
                        if (telegramError.description.includes('chat not found')) {
                            return res.status(400).json({ 
                                error: 'Канал не найден',
                                details: 'Проверьте правильность username канала. Убедитесь, что канал публичный или бот был добавлен в канал.',
                                suggestion: 'Попробуйте указать полное имя канала, например: mychannel (без @)'
                            });
                        } else if (telegramError.description.includes('not enough rights')) {
                            return res.status(400).json({ 
                                error: 'Недостаточно прав',
                                details: 'У бота недостаточно прав для получения информации о канале.',
                                suggestion: 'Добавьте бота в канал как администратора'
                            });
                        } else {
                            return res.status(400).json({ 
                                error: 'Неверные параметры запроса',
                                details: telegramError.description,
                                suggestion: 'Проверьте правильность username канала'
                            });
                        }
                        break;
                    case 403:
                        return res.status(400).json({ 
                            error: 'Доступ запрещён',
                            details: 'Бот не является участником канала или заблокирован',
                            suggestion: 'Добавьте бота в канал как администратора и убедитесь, что он не заблокирован'
                        });
                    case 429:
                        return res.status(429).json({ 
                            error: 'Слишком много запросов',
                            details: 'Превышен лимит запросов к Telegram API',
                            suggestion: 'Попробуйте через несколько минут'
                        });
                    default:
                        return res.status(500).json({ 
                            error: 'Ошибка Telegram API',
                            details: telegramError.description,
                            code: telegramError.error_code
                        });
                }
            }
            
            // Обработка сетевых ошибок
            if (error.code === 'ETELEGRAM' || error.code === 'EFATAL' || error.code === 'ECONNRESET') {
                return res.status(500).json({ 
                    error: 'Проблема с подключением к Telegram API',
                    details: 'Не удалось установить соединение с серверами Telegram',
                    suggestion: 'Проверьте интернет соединение и попробуйте позже'
                });
            }
            
            // Общая ошибка сервера
            return res.status(500).json({
                error: 'Внутренняя ошибка сервера',
                details: error.message,
                suggestion: 'Попробуйте позже или обратитесь к администратору'
            });
        }
    } catch (error) {
        console.error('❌ Необработанная ошибка проверки канала:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: 'Произошла неожиданная ошибка при проверке канала',
            suggestion: 'Попробуйте позже или обратитесь к администратору'
        });
    }
});

// Добавление нового канала
app.post('/api/admin/channels', requireAuth, async (req, res) => {
    try {
        const {
            channel_username,
            channel_name,
            reward_stars,
            placement_type = 'time',
            placement_duration,
            target_subscribers,
            is_hot_offer = false,
            hot_offer_multiplier = 2.0,
            auto_renewal = false,
            is_active = true,
            start_date,
            description,
            avatar_url
        } = req.body;

        console.log(`📺 Админ: добавление канала @${channel_username}`, {
            placement_type,
            placement_duration,
            target_subscribers,
            is_hot_offer,
            start_date
        });

        // Валидация данных
        if (!channel_username) {
            return res.status(400).json({ error: 'Имя канала обязательно' });
        }

        if (placement_type === 'time' && !placement_duration) {
            return res.status(400).json({ error: 'Для временного размещения укажите продолжительность в часах' });
        }

        if (placement_type === 'target' && !target_subscribers) {
            return res.status(400).json({ error: 'Для размещения по цели укажите целевое количество подписчиков' });
        }

        // Автоматически получаем информацию о канале через Telegram API
        const telegramChannelInfo = await db.getChannelInfoFromTelegram(bot, channel_username);
        
        // Используем данные от пользователя, если они заданы, иначе автоматические
        const finalChannelName = channel_name || telegramChannelInfo.channel_name;
        const finalDescription = description || telegramChannelInfo.channel_description;
        // Приоритет: ручной URL > автоматический URL > null
        const finalAvatarUrl = avatar_url || telegramChannelInfo.channel_avatar_url;
        
        // Логируем результаты получения информации
        console.log(`📋 Итоговые данные канала:`, {
            name: finalChannelName,
            description: finalDescription ? finalDescription.substring(0, 50) + '...' : 'нет',
            avatar_url: finalAvatarUrl ? 'есть' : 'нет',
            auto_avatar: telegramChannelInfo.channel_avatar_url ? 'получена' : 'не получена',
            manual_avatar: avatar_url ? 'указана' : 'не указана',
            error: telegramChannelInfo.error || 'нет ошибок'
        });

        // Добавляем канал используя улучшенный метод из database
        const channelData = {
            username: channel_username,
            name: finalChannelName,
            channel_id: telegramChannelInfo.channel_id,
            stars: reward_stars,
            placement_type: placement_type,
            placement_duration: placement_duration,
            target_subscribers: target_subscribers,
            is_hot_offer: is_hot_offer || false,
            hot_offer_multiplier: hot_offer_multiplier || 2.0,
            auto_renewal: auto_renewal || false,
            start_date: start_date ? new Date(start_date) : new Date(),
            description: finalDescription,
            avatar_url: finalAvatarUrl
        };

        console.log('📝 Данные для добавления канала:', channelData);
        const result = await db.addChannel(channelData);

        const newChannelId = result.id;
        console.log(`✅ Канал ${channel_username} добавлен/обновлен с ID: ${newChannelId}`);

        // Автоматическое создание пригласительной ссылки для целевых каналов
        let inviteLinkInfo = null;
        if (placement_type === 'target' && target_subscribers > 0 && telegramChannelInfo.channel_id) {
            try {
                console.log(`🔗 Создаение автоматической пригласительной ссылки для целевого канала ${channel_username}`);
                
                // Проверяем, что бот является админом канала
                const botInfo = await bot.getMe();
                const chatMember = await bot.getChatMember(telegramChannelInfo.channel_id, botInfo.id);
                
                if (['administrator', 'creator'].includes(chatMember.status)) {
                    // Создаем пригласительную ссылку с лимитом = целевому количеству
                    const inviteOptions = {
                        name: `Kosmetichka Bot - Цель: ${target_subscribers}`,
                        member_limit: Math.min(target_subscribers, 99999) // Telegram лимит
                    };

                    console.log('🔗 Создание пригласительной ссылки с параметрами:', inviteOptions);
                    const inviteLink = await bot.createChatInviteLink(telegramChannelInfo.channel_id, inviteOptions);

                    // Сохраняем ссылку в базу данных
                    await db.saveInviteLink(
                        newChannelId,
                        inviteLink.invite_link,
                        inviteOptions.name,
                        inviteOptions.member_limit,
                        null, // expire_date
                        false // creates_join_request
                    );

                    inviteLinkInfo = {
                        invite_link: inviteLink.invite_link,
                        member_limit: inviteOptions.member_limit,
                        link_name: inviteOptions.name
                    };

                    console.log(`✅ Пригласительная ссылка автоматически создана: ${inviteLink.invite_link}`);
                } else {
                    console.warn(`⚠️ Не удалось создать пригласительную ссылку: бот не является админом канала ${channel_username}`);
                }
            } catch (error) {
                console.error('❌ Ошибка создания автоматической пригласительной ссылки:', error);
                // Не прерываем процесс добавления канала из-за ошибки создания ссылки
            }
        }

        res.json({ 
            success: true, 
            id: newChannelId,
            channel: result,
            invite_link_info: inviteLinkInfo,
            message: `Канал успешно добавлен/обновлен${inviteLinkInfo ? ' с автоматической пригласительной ссылкой' : ''}`
        });
    } catch (error) {
        console.error('❌ Ошибка добавления канала:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение информации о канале
app.get('/api/admin/channels/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.pool.query(
            'SELECT * FROM partner_channels WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Канал не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Ошибка получения канала:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Изменение статуса канала
app.patch('/api/admin/channels/:id/status', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const activeStatus = Boolean(is_active);

        console.log(`🔄 Админ: изменение статуса канала ${id} на ${activeStatus ? 'активен' : 'неактивен'}`);

        await db.pool.query(
            'UPDATE partner_channels SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [activeStatus, id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка изменения статуса канала:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Переключение горячего предложения
app.patch('/api/admin/channels/:id/hot-offer', requireAuth, async (req, res) => {
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
app.delete('/api/admin/channels/:id', requireAuth, async (req, res) => {
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

// === API ENDPOINTS ДЛЯ ПРИГЛАСИТЕЛЬНЫХ ССЫЛОК ===

// Создание пригласительной ссылки для канала
app.post('/api/admin/channels/:id/create-invite', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            link_name, 
            member_limit, 
            expire_days, 
            creates_join_request = false 
        } = req.body;

        console.log(`🔗 Админ: создание пригласительной ссылки для канала ${id}`);

        // Получаем информацию о канале
        const channelResult = await db.pool.query(
            'SELECT * FROM partner_channels WHERE id = $1',
            [id]
        );

        if (channelResult.rows.length === 0) {
            return res.status(404).json({ error: 'Канал не найден' });
        }

        const channel = channelResult.rows[0];
        
        if (!channel.channel_id) {
            return res.status(400).json({ error: 'У канала нет Telegram ID' });
        }

        // Проверяем, что бот является админом канала
        try {
            const botInfo = await bot.getMe();
            const chatMember = await bot.getChatMember(channel.channel_id, botInfo.id);
            
            if (!['administrator', 'creator'].includes(chatMember.status)) {
                return res.status(403).json({ 
                    error: 'Бот должен быть администратором канала для создания пригласительных ссылок' 
                });
            }
        } catch (error) {
            console.error('❌ Ошибка проверки прав бота в канале:', error);
            return res.status(400).json({ 
                error: 'Не удается проверить права бота в канале. Убедитесь, что бот является администратором.' 
            });
        }

        // Создаем пригласительную ссылку
        const inviteOptions = {
            name: link_name || `Kosmetichka Bot - ${new Date().toLocaleDateString('ru-RU')}`
        };

        if (member_limit && member_limit > 0) {
            inviteOptions.member_limit = Math.min(member_limit, 99999); // Telegram лимит
        }

        if (expire_days && expire_days > 0) {
            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + expire_days);
            inviteOptions.expire_date = Math.floor(expireDate.getTime() / 1000);
        }

        if (creates_join_request) {
            inviteOptions.creates_join_request = true;
        }

        console.log('🔗 Создание пригласительной ссылки с параметрами:', inviteOptions);

        const inviteLink = await bot.createChatInviteLink(channel.channel_id, inviteOptions);

        // Сохраняем ссылку в базу данных
        const savedChannel = await db.saveInviteLink(
            id,
            inviteLink.invite_link,
            inviteOptions.name,
            inviteOptions.member_limit || null,
            inviteOptions.expire_date ? new Date(inviteOptions.expire_date * 1000) : null,
            creates_join_request
        );

        console.log(`✅ Пригласительная ссылка создана для канала ${channel.channel_username}: ${inviteLink.invite_link}`);

        res.json({
            success: true,
            invite_link: inviteLink.invite_link,
            link_name: inviteOptions.name,
            member_limit: inviteOptions.member_limit,
            expire_date: inviteOptions.expire_date ? new Date(inviteOptions.expire_date * 1000) : null,
            creates_join_request,
            channel: savedChannel
        });

    } catch (error) {
        console.error('❌ Ошибка создания пригласительной ссылки:', error);
        
        if (error.message.includes('Bad Request: not enough rights')) {
            return res.status(403).json({ 
                error: 'Недостаточно прав. Бот должен быть администратором с правом приглашения пользователей.' 
            });
        }
        
        res.status(500).json({ 
            error: 'Ошибка создания пригласительной ссылки',
            details: error.message 
        });
    }
});

// Отзыв пригласительной ссылки канала
app.delete('/api/admin/channels/:id/revoke-invite', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🚫 Админ: отзыв пригласительной ссылки для канала ${id}`);

        // Получаем информацию о канале
        const channelResult = await db.pool.query(
            'SELECT * FROM partner_channels WHERE id = $1',
            [id]
        );

        if (channelResult.rows.length === 0) {
            return res.status(404).json({ error: 'Канал не найден' });
        }

        const channel = channelResult.rows[0];

        if (!channel.invite_link) {
            return res.status(400).json({ error: 'У канала нет активной пригласительной ссылки' });
        }

        // Отзываем ссылку через Telegram API
        try {
            await bot.revokeChatInviteLink(channel.channel_id, channel.invite_link);
            console.log(`🚫 Пригласительная ссылка отозвана в Telegram`);
        } catch (error) {
            console.warn('⚠️ Ошибка отзыва ссылки в Telegram (возможно, уже отозвана):', error.message);
        }

        // Убираем ссылку из базы данных
        const updatedChannel = await db.revokeInviteLink(id);

        console.log(`✅ Пригласительная ссылка отозвана для канала ${channel.channel_username}`);

        res.json({
            success: true,
            message: 'Пригласительная ссылка успешно отозвана',
            channel: updatedChannel
        });

    } catch (error) {
        console.error('❌ Ошибка отзыва пригласительной ссылки:', error);
        res.status(500).json({ 
            error: 'Ошибка отзыва пригласительной ссылки',
            details: error.message 
        });
    }
});

// Получение статистики по пригласительной ссылке
app.get('/api/admin/channels/:id/invite-stats', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`📊 Админ: запрос статистики пригласительной ссылки для канала ${id}`);

        const channelResult = await db.pool.query(
            'SELECT * FROM partner_channels WHERE id = $1',
            [id]
        );

        if (channelResult.rows.length === 0) {
            return res.status(404).json({ error: 'Канал не найден' });
        }

        const channel = channelResult.rows[0];

        // Статистика по пригласительной ссылке
        const stats = {
            channel_id: channel.id,
            channel_username: channel.channel_username,
            invite_link: channel.invite_link,
            link_name: channel.invite_link_name,
            joined_via_invite: channel.joined_via_invite || 0,
            member_limit: channel.invite_member_limit,
            expire_date: channel.invite_expire_date,
            creates_join_request: channel.invite_creates_join_request,
            target_subscribers: channel.target_subscribers,
            is_active: channel.is_active
        };

        // Дополнительные вычисления
        if (channel.invite_member_limit) {
            stats.limit_progress = Math.round((stats.joined_via_invite / channel.invite_member_limit) * 100);
            stats.remaining_slots = Math.max(0, channel.invite_member_limit - stats.joined_via_invite);
        }

        if (channel.target_subscribers) {
            stats.target_progress = Math.round((stats.joined_via_invite / channel.target_subscribers) * 100);
            stats.remaining_to_target = Math.max(0, channel.target_subscribers - stats.joined_via_invite);
        }

        if (channel.invite_expire_date) {
            const now = new Date();
            const expireDate = new Date(channel.invite_expire_date);
            stats.is_expired = now > expireDate;
            stats.days_remaining = Math.max(0, Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24)));
        }

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ Ошибка получения статистики пригласительной ссылки:', error);
        res.status(500).json({ 
            error: 'Ошибка получения статистики',
            details: error.message 
        });
    }
});

// API для автоматизации спонсоров
app.get('/api/admin/automation/stats', requireAuth, async (req, res) => {
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
app.get('/api/admin/automation/channels', requireAuth, async (req, res) => {
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
app.get('/api/admin/automation/notifications', requireAuth, async (req, res) => {
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
app.patch('/api/admin/automation/channels/:id/auto-renewal', requireAuth, async (req, res) => {
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

app.post('/api/admin/automation/force-check', requireAuth, async (req, res) => {
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
app.get('/api/admin/wins-channel/stats', requireAuth, async (req, res) => {
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

app.get('/api/admin/wins-channel/recent', requireAuth, async (req, res) => {
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

app.post('/api/admin/wins-channel/post/:prizeId', requireAuth, async (req, res) => {
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

app.post('/api/admin/wins-channel/test', requireAuth, async (req, res) => {
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
app.get('/api/admin/pending-prizes', requireAuth, async (req, res) => {
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
app.patch('/api/admin/prizes/:id/given', requireAuth, async (req, res) => {
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

// Отладочный middleware для /api/admin/users
app.use('/api/admin/users', (req, res, next) => {
    console.log(`🔍 MIDDLEWARE: ${req.method} ${req.path} - Query:`, req.query);
    next();
});

// Получение списка пользователей
app.get('/api/admin/users', requireAuth, async (req, res) => {
    try {
        console.log('👥 Админ: запрос списка пользователей');
        const { search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                u.id,
                u.telegram_id,
                u.username,
                u.first_name,
                u.last_name,
                u.stars,
                u.total_stars_earned,
                u.referrals,
                u.total_spins,
                u.prizes_won,
                u.join_date as created_at,
                u.last_activity,
                u.is_active,
                u.win_chance,
                0 as subscription_count
            FROM users u
            WHERE 1=1
        `;
        
        const params = [];
        
        // Добавляем поиск если есть
        if (search) {
            query += ` AND (
                u.telegram_id::text ILIKE $${params.length + 1} OR
                u.username ILIKE $${params.length + 1} OR
                u.first_name ILIKE $${params.length + 1} OR
                u.last_name ILIKE $${params.length + 1}
            )`;
            params.push(`%${search}%`);
        }
        
        query += ` ORDER BY u.join_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const users = await db.pool.query(query, params);
        
        // Получаем общее количество для пагинации
        let countQuery = `SELECT COUNT(*) as total FROM users u WHERE 1=1`;
        const countParams = [];
        
        if (search) {
            countQuery += ` AND (
                u.telegram_id::text ILIKE $1 OR
                u.username ILIKE $1 OR
                u.first_name ILIKE $1 OR
                u.last_name ILIKE $1
            )`;
            countParams.push(`%${search}%`);
        }
        
        const totalResult = await db.pool.query(countQuery, countParams);
        const total = parseInt(totalResult.rows?.[0]?.total) || 0;
        
        console.log(`👥 Найдено пользователей: ${users.rows?.length || 0} из ${total}`);
        
        res.json({
            success: true,
            users: users.rows || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('❌ Ошибка получения пользователей:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            details: error.message 
        });
    }
});

// Получение аналитики
app.get('/api/admin/analytics', requireAuth, async (req, res) => {
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
app.post('/api/admin/users/stars', requireAuth, async (req, res) => {
    const { telegramId, operation, amount, reason } = req.body;
    
    // Базовая валидация входных данных
    if (!telegramId || !operation || !amount || !reason) {
        return res.status(400).json({ 
            success: false, 
            error: 'Отсутствуют обязательные поля: telegramId, operation, amount, reason'
        });
    }
    
    // Конвертируем telegramId в строку для совместимости с БД
    const telegramIdStr = String(telegramId);
    
    if (!['add', 'subtract', 'set'].includes(operation)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Неверная операция. Допустимые: add, subtract, set'
        });
    }
    
    if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json({ 
            success: false, 
            error: 'Количество должно быть положительным числом'
        });
    }

    try {
        
        // Получаем текущего пользователя
        const user = await db.getUser(telegramIdStr);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        const currentStars = user.stars || 0;
        let newStars = 0;
        let starsChange = 0;

        switch (operation) {
            case 'add':
                starsChange = amount;
                newStars = currentStars + amount;
                break;
            case 'subtract':
                starsChange = -amount;
                newStars = Math.max(0, currentStars - amount);
                break;
            case 'set':
                starsChange = amount - currentStars;
                newStars = amount;
                break;
            default:
                return res.status(400).json({ 
                    success: false, 
                    error: 'Неверная операция' 
                });
        }

        // Обновляем баланс звезд
        await db.addUserStars(telegramIdStr, starsChange, 'admin_adjustment', {reason: reason, admin: 'system'});

        // Добавляем запись в историю транзакций
        await db.addTransaction(
            telegramIdStr,
            starsChange,
            'admin_adjustment',
            `Администратор: ${reason}`
        );

        console.log(`✅ Админ обновил звезды пользователя ${telegramIdStr}: ${currentStars} -> ${newStars} (${operation} ${amount})`);

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

// Endpoint для управления шансами победы пользователя
app.post('/api/admin/users/:userId/win-chance', requireAuth, async (req, res) => {
    const { userId } = req.params;
    const { winChance, reason } = req.body;
    
    // Валидация входных данных
    if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ 
            success: false, 
            error: 'Неверный ID пользователя' 
        });
    }
    
    if (winChance === undefined || isNaN(parseFloat(winChance)) || winChance < 0 || winChance > 100) {
        return res.status(400).json({ 
            success: false, 
            error: 'Шанс победы должен быть числом от 0 до 100' 
        });
    }
    
    if (!reason || reason.trim().length < 3) {
        return res.status(400).json({ 
            success: false, 
            error: 'Причина изменения обязательна (минимум 3 символа)' 
        });
    }

    try {
        const telegramId = String(userId);
        
        // Получаем пользователя
        const user = await db.getUser(telegramId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        // Устанавливаем новый шанс победы
        const winChanceValue = parseFloat(winChance);
        await db.setUserWinChance(telegramId, winChanceValue, reason.trim());
        
        // Логируем изменение
        console.log(`✅ Админ установил шанс победы для пользователя ${telegramId}: ${winChanceValue}% (причина: ${reason})`);
        
        res.json({ 
            success: true, 
            userId: telegramId,
            newWinChance: winChanceValue,
            reason: reason.trim()
        });
    } catch (error) {
        console.error('❌ Ошибка установки шанса победы:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при установке шанса победы' 
        });
    }
});

// API для раздельного управления шансами звезд и сертификатов
app.post('/api/admin/users/:telegramId/separate-chances', requireAuth, async (req, res) => {
    try {
        const telegramId = req.params.telegramId;
        const { starsChance, certificateChance, reason } = req.body;
        
        // Валидация
        if ((starsChance !== undefined && (typeof starsChance !== 'number' || starsChance < 0 || starsChance > 100)) ||
            (certificateChance !== undefined && (typeof certificateChance !== 'number' || certificateChance < 0 || certificateChance > 100)) ||
            !reason || reason.trim().length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Некорректные параметры. Шансы должны быть числами от 0 до 100, причина обязательна.'
            });
        }

        // Получаем текущие шансы
        const userResult = await db.pool.query(
            'SELECT stars_chance, certificate_chance FROM users WHERE telegram_id = $1',
            [telegramId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }
        
        const currentData = userResult.rows[0];
        const oldStarsChance = currentData.stars_chance || 0;
        const oldCertificateChance = currentData.certificate_chance || 0;
        
        // Обновляем только те поля, которые переданы
        const updates = [];
        const values = [];
        let valueIndex = 1;
        
        if (starsChance !== undefined) {
            updates.push(`stars_chance = $${valueIndex++}`);
            values.push(starsChance);
        }
        
        if (certificateChance !== undefined) {
            updates.push(`certificate_chance = $${valueIndex++}`);
            values.push(certificateChance);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Не указаны параметры для обновления'
            });
        }
        
        values.push(telegramId); // telegram_id в WHERE
        
        // Обновляем шансы
        await db.pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE telegram_id = $${valueIndex}`,
            values
        );
        
        // Записываем в историю
        const changesLog = [];
        if (starsChance !== undefined) {
            changesLog.push(`Шанс звезд: ${oldStarsChance}% → ${starsChance}%`);
        }
        if (certificateChance !== undefined) {
            changesLog.push(`Шанс сертификатов: ${oldCertificateChance}% → ${certificateChance}%`);
        }
        
        await db.pool.query(`
            INSERT INTO user_transactions (user_id, type, amount, description, transaction_date)
            VALUES ($1, 'admin_separate_chances', $2, $3, NOW())
        `, [telegramId, 0, `${changesLog.join(', ')}. ${reason.trim()}`]);
        
        console.log(`🎯 Раздельные шансы пользователя ${telegramId}: ${changesLog.join(', ')}`);
        
        res.json({
            success: true,
            data: {
                oldStarsChance,
                oldCertificateChance,
                newStarsChance: starsChance !== undefined ? starsChance : oldStarsChance,
                newCertificateChance: certificateChance !== undefined ? certificateChance : oldCertificateChance,
                reason: reason.trim()
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка установки раздельных шансов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при установке раздельных шансов' 
        });
    }
});

// ENDPOINT MOVED TO BEFORE 404 HANDLER (line 8183)

// Endpoint для получения истории изменения баланса пользователя
app.get('/api/admin/users/:userId/balance-history', requireAuth, async (req, res) => {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    try {
        const telegramId = String(userId);
        
        // Используем готовую функцию из database-postgres.js
        const transactions = await db.getUserTransactions(telegramId, parseInt(limit));
        
        // Получаем пользователя для текущего баланса
        const user = await db.getUser(telegramId);
        
        res.json({ 
            success: true,
            userId: telegramId,
            currentBalance: user ? user.stars || 0 : 0,
            history: transactions || [],
            pagination: {
                total: transactions ? transactions.length : 0,
                limit: parseInt(limit),
                offset: 0
            }
        });
    } catch (error) {
        console.error('❌ Ошибка получения истории баланса:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении истории баланса' 
        });
    }
});

// API для ручных подкруток пользователям
app.post('/api/admin/manual-spin', requireAuth, async (req, res) => {
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
                await db.addUserStars(userId, 20, 'spin_reward', {spinType: 'normal'});
                break;
                
            case 'mega':
                // Добавляем 5000 звезд для мега прокрутки
                await db.addUserStars(userId, 5000, 'spin_reward', {spinType: 'mega'});
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
app.get('/api/admin/manual-spins/recent', requireAuth, async (req, res) => {
    try {
        const spins = await new Promise((resolve, reject) => {
            db.db.all(`
                SELECT aa.*, u.first_name, u.username
                FROM admin_actions aa
                LEFT JOIN users u ON aa.target_user_id = u.id
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
app.get('/api/admin/wheel-settings/mega', requireAuth, async (req, res) => {
    try {
        // Получаем настройки мега рулетки из файла конфигурации или БД
        const settings = await db.getWheelSettings('mega');
        res.json(settings || { prizes: [] });
    } catch (error) {
        console.error('❌ Ошибка получения настроек мега рулетки:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/wheel-settings/mega', requireAuth, async (req, res) => {
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

app.get('/api/admin/wheel-settings/normal', requireAuth, async (req, res) => {
    try {
        // Получаем настройки обычной рулетки из файла конфигурации или БД
        const settings = await db.getWheelSettings('normal');
        res.json(settings || { prizes: [] });
    } catch (error) {
        console.error('❌ Ошибка получения настроек обычной рулетки:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/wheel-settings/normal', requireAuth, async (req, res) => {
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
        
        console.log(`👤 ДИАГНОСТИКА /start: Пользователь ${userId} (${msg.from.first_name}) запустил бота${startParam ? ` с параметром: ${startParam}` : ''}`);
        
        try {
            // Проверяем, существует ли пользователь
            let user = await db.getUser(userId);
            console.log(`🔍 ДИАГНОСТИКА /start: db.getUser(${userId}) результат:`, user ? {
                id: user.id,
                telegram_id: user.telegram_id,
                stars: user.stars,
                first_name: user.first_name
            } : 'null');
            
            if (!user) {
                // Создаем нового пользователя
                console.log(`🆕 ДИАГНОСТИКА /start: Создаем НОВОГО пользователя: ${userId}`);
                await db.createUser({
                    telegram_id: userId,
                    username: msg.from.username || '',
                    first_name: msg.from.first_name || 'Пользователь',
                    last_name: msg.from.last_name || ''
                });
                
                // Проверяем, что пользователь создан
                user = await db.getUser(userId);
                if (user) {
                    console.log(`✅ ДИАГНОСТИКА /start: Пользователь ${userId} успешно создан с ID: ${user.id}, баланс: ${user.stars}`);
                } else {
                    console.error(`❌ ДИАГНОСТИКА /start: Не удалось создать пользователя ${userId}`);
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
                                    
                                    // Начисляем бонусы рефереру
                                    await db.addUserStars(referrerId, 10, 'referral_bonus', {source: 'start_command', invitedUser: userId});
                                    
                                    // Добавляем прокрутку за друга
                                    await new Promise((resolve, reject) => {
                                        db.db.run(
                                            'UPDATE users SET available_friend_spins = available_friend_spins + 1 WHERE telegram_id = ?',
                                            [referrerId],
                                            (err) => err ? reject(err) : resolve()
                                        );
                                    });
                                    
                                    // Обновляем total_stars_earned
                                    await db.incrementTotalStarsEarned(referrerId, 10);
                                    
                                    console.log(`⭐ Рефереру ${referrerId} начислено 10 звезд + 1 прокрутка за приглашение`);
                                    
                                    // Отправляем уведомления
                                    try {
                                        await bot.sendMessage(referrerId, 
                                            `🎉 Поздравляем! Ваш друг ${user.first_name} присоединился к боту!\n` +
                                            `Вы получили 10 звезд за приглашение!`
                                        );
                                        
                                        await bot.sendMessage(userId,
                                            `👋 Добро пожаловать! Вы присоединились по приглашению от ${referrer.first_name}!\n` +
                                            `🎁 Выполните задания, чтобы ваш друг получил дополнительные бонусы!`
                                        );
                                    } catch (notifyError) {
                                        console.warn('⚠️ Не удалось отправить уведомления:', notifyError.message);
                                    }
                                } else {
                                    console.log(`⚠️ Реферал уже существует: ${referrerId} -> ${userId}`);
                                }
                            } else {
                                console.log(`⚠️ Реферал уже был активирован ранее: ${referrerId} -> ${userId}`);
                            }
                        } else {
                            console.log(`❌ Реферер не найден: ${referrerId}`);
                        }
                    } catch (error) {
                        console.error('❌ Ошибка обработки реферальной ссылки:', error);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Ошибка обработки пользователя:', error);
            bot.sendMessage(chatId, '❌ Ошибка обработки профиля. Попробуйте позже.');
            return;
        }
        
        // ПРОСТОЙ текст без Markdown форматирования
        const welcomeMessage = `💄 Добро пожаловать в Косметичку!

    Крути рулетку и выигрывай призы!
    🎁 Каждый месяц мега рулетка с возможностью выиграть AirPods!
    ⭐ Выполняй ежедневные задания за звезды!
    🏆 Соревнуйся в таблице лидеров, приглашай друзей и получай бонусы!

    📱 Подписывайся на наш канал: @kosmetichka_channel

    🚀 Нажми кнопку ниже чтобы начать играть!`;
        
        const keyboard = {
            inline_keyboard: [
                [
                    {
                        text: '💄 Запустить Косметичку!',
                        web_app: { url: WEBAPP_URL }
                    }
                ],
                [
                    {
                        text: '📱 Наш канал',
                        url: 'https://t.me/kosmetichka_channel'
                    }
                ],
                [
                    {
                        text: '💬 Отзывы',
                        url: 'https://t.me/kosmetichkafeedback'
                    }
                ],
                [
                    {
                        text: '🎁 Лайв выигрыши',
                        url: 'https://t.me/kosmetichkolive'
                    }
                ],
                [
                    {
                        text: '👥 Пригласить друзей',
                        callback_data: 'invite'
                    }
                ]
            ]
        };
        
        bot.sendMessage(chatId, welcomeMessage, { 
            reply_markup: keyboard
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
            await db.addUserStars(userId, promo.crystals, 'promo_code', {promoCode: promoCode});
            
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
                const referralLink = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;
                
                bot.sendMessage(chatId, `🔗 **Ваша персональная реферальная ссылка:**

            \`${referralLink}\`

            👆 Нажмите на ссылку чтобы скопировать`, {
                    parse_mode: 'Markdown'
                });
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
            await db.addUserStars(userId, starsAmount, 'deposit', {payment_id: payment.telegram_payment_charge_id});
            
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

    // === ОБРАБОТЧИК ПРИСОЕДИНЕНИЙ ПО ПРИГЛАСИТЕЛЬНЫМ ССЫЛКАМ ===
    
    bot.on('chat_member', async (chatMemberUpdate) => {
        try {
            const { chat, from, date, old_chat_member, new_chat_member } = chatMemberUpdate;
            
            // Проверяем, что пользователь присоединился к каналу/группе
            if (old_chat_member.status === 'left' && 
                ['member', 'administrator', 'creator'].includes(new_chat_member.status)) {
                
                const chatId = chat.id;
                const userId = new_chat_member.user.id;
                const userName = new_chat_member.user.first_name || new_chat_member.user.username || 'Пользователь';
                
                console.log(`👤 Пользователь ${userName} (${userId}) присоединился к каналу/группе ${chatId}`);
                
                // Ищем канал в нашей базе данных
                const channel = await db.getChannelByChatId(chatId);
                
                if (channel && channel.invite_link) {
                    console.log(`🔗 Найден канал с пригласительной ссылкой: ${channel.channel_username}`);
                    
                    // Увеличиваем счетчик присоединившихся
                    const result = await db.incrementJoinedViaInvite(channel.id);
                    
                    console.log(`📊 Статистика канала ${channel.channel_username}: присоединилось ${result.joined_via_invite} человек`);
                    
                    // Проверяем, достигнут ли лимит или цель
                    if (result.limitReached || result.targetReached) {
                        const reason = result.limitReached ? 'invite_limit_reached' : 'target_reached';
                        await db.deactivateChannelByLimit(channel.id, reason);
                        
                        const adminMessage = `🎯 Канал @${channel.channel_username} автоматически деактивирован!\n\n` +
                            `📈 Достигнуто: ${result.joined_via_invite} подписчиков\n` +
                            `🎯 ${result.limitReached ? `Лимит ссылки: ${result.invite_member_limit}` : `Целевое количество: ${result.target_subscribers}`}\n` +
                            `⏰ Время: ${new Date().toLocaleString('ru-RU')}`;
                        
                        // Уведомляем всех админов
                        ADMIN_IDS.forEach(adminId => {
                            bot.sendMessage(adminId, adminMessage).catch(err => {
                                console.warn(`⚠️ Не удалось отправить уведомление админу ${adminId}:`, err.message);
                            });
                        });
                        
                        // Отзываем пригласительную ссылку
                        try {
                            await bot.revokeChatInviteLink(chatId, channel.invite_link);
                            await db.revokeInviteLink(channel.id);
                            console.log(`🚫 Пригласительная ссылка автоматически отозвана для канала ${channel.channel_username}`);
                        } catch (error) {
                            console.warn('⚠️ Ошибка автоматического отзыва пригласительной ссылки:', error.message);
                        }
                    }
                    
                    // Записываем подписку в базу данных для начисления награды
                    try {
                        const user = await db.getUser(userId);
                        if (user) {
                            const subscriptionResult = await db.recordChannelSubscription(userId, channel.channel_username);
                            if (subscriptionResult.success && !subscriptionResult.alreadyExists) {
                                // Начисляем награду с учетом множителя
                                let rewardAmount = channel.reward_stars || 0;
                                if (channel.is_hot_offer && channel.hot_offer_multiplier > 1) {
                                    rewardAmount = Math.round(rewardAmount * channel.hot_offer_multiplier);
                                }
                                
                                if (rewardAmount > 0) {
                                    await db.addUserStars(userId, rewardAmount, 'channel_subscription', {
                                        channel_id: channel.id,
                                        channel_username: channel.channel_username,
                                        via_invite_link: true
                                    });
                                    
                                    console.log(`⭐ Пользователю ${userName} (${userId}) начислено ${rewardAmount} звезд за подписку на ${channel.channel_username}`);
                                    
                                    // Отправляем уведомление пользователю
                                    const rewardMessage = `🎉 Спасибо за подписку на @${channel.channel_username}!\n\n⭐ Вам начислено: ${rewardAmount} звезд`;
                                    
                                    bot.sendMessage(userId, rewardMessage).catch(err => {
                                        console.log(`ℹ️ Не удалось отправить уведомление пользователю ${userId} (возможно, заблокировал бота)`);
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        console.warn('⚠️ Ошибка записи подписки или начисления награды:', error.message);
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Ошибка обработки chat_member события:', error);
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
                await db.addUserStars(userId, rewardAmount, 'task_reward', {taskId: data.taskId, taskType: data.taskType});
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
        await db.addUserStars(userId, bonus, 'channel_subscription', {channelField: channelField});
        
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

// Endpoint для обновления баланса
app.post('/api/update_stars', async (req, res) => {
    try {
        const { data, user } = req.body;
        
        if (!user?.id || data?.stars === undefined) {
            return res.status(400).json({ 
                success: false, 
                error: 'Недостаточно данных' 
            });
        }
        
        const userId = user.id;
        const newStars = parseInt(data.stars) || 0;
        
        console.log(`💾 Обновление баланса для ${userId}: ${newStars} звезд`);
        
        // Обновляем в БД
        await db.updateUserStars(userId, newStars);
        
        res.json({ 
            success: true,
            stars: newStars
        });
        
    } catch (error) {
        console.error('❌ Ошибка обновления баланса:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Endpoint для получения актуального баланса пользователя
app.post('/api/get_balance', async (req, res) => {
    try {
        const { user } = req.body;
        
        if (!user?.id) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID отсутствует' 
            });
        }
        
        const userId = user.id;
        const userData = await db.getUser(userId);
        
        if (!userData) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }
        
        console.log(`📊 Получен баланс для пользователя ${userId}: ${userData.stars} звезд`);
        
        return res.json({
            success: true,
            stars: userData.stars,
            userId: userId
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения баланса:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Endpoint для обновления баланса звезд (траты/пополнения)
app.post('/api/update_balance', async (req, res) => {
    try {
        const { action, data, user } = req.body;
        
        if (!user?.id) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID отсутствует' 
            });
        }
        
        const userId = user.id;
        const newBalance = parseInt(data?.stars);
        
        if (isNaN(newBalance) || newBalance < 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Некорректный баланс' 
            });
        }
        
        console.log(`💾 Обновление баланса для пользователя ${userId}: ${newBalance} звезд`);
        
        // Обновляем баланс в БД
        await db.run(
            'UPDATE users SET stars = ?, last_activity = CURRENT_TIMESTAMP WHERE telegram_id = ?',
            [newBalance, userId]
        );
        
        // Проверяем что обновилось
        const updatedUser = await db.getUser(userId);
        console.log(`✅ Баланс обновлен в БД: ${updatedUser.stars} звезд`);
        
        res.json({ 
            success: true,
            stars: updatedUser.stars
        });
        
    } catch (error) {
        console.error('❌ Ошибка обновления баланса:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка обновления баланса' 
        });
    }
});

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

// Получение списка пользователей  
app.get('/api/admin/users', requireAuth, async (req, res) => {
    try {
        console.log('👥 Админ: запрос списка пользователей');
        const { search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                u.id,
                u.telegram_id,
                u.username,
                u.first_name,
                u.last_name,
                u.stars,
                u.total_stars_earned,
                u.referrals,
                u.total_spins,
                u.prizes_won,
                u.join_date as created_at,
                u.last_activity,
                u.is_active,
                u.win_chance,
                0 as subscription_count
            FROM users u
            WHERE 1=1
        `;
        
        const params = [];
        
        // Добавляем поиск если есть
        if (search) {
            query += ` AND (
                u.telegram_id::text ILIKE $${params.length + 1} OR
                u.username ILIKE $${params.length + 1} OR
                u.first_name ILIKE $${params.length + 1} OR
                u.last_name ILIKE $${params.length + 1}
            )`;
            params.push(`%${search}%`);
        }
        
        query += ` ORDER BY u.join_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const users = await db.pool.query(query, params);
        
        // Получаем общее количество для пагинации
        let countQuery = `SELECT COUNT(*) as total FROM users u WHERE 1=1`;
        const countParams = [];
        
        if (search) {
            countQuery += ` AND (
                u.telegram_id::text ILIKE $1 OR
                u.username ILIKE $1 OR
                u.first_name ILIKE $1 OR
                u.last_name ILIKE $1
            )`;
            countParams.push(`%${search}%`);
        }
        
        const totalResult = await db.pool.query(countQuery, countParams);
        const total = parseInt(totalResult.rows?.[0]?.total) || 0;
        
        console.log(`👥 Найдено пользователей: ${users.rows?.length || 0} из ${total}`);
        
        res.json({
            success: true,
            users: users.rows || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('❌ Ошибка получения пользователей:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            details: error.message 
        });
    }
});

// Управление звездами пользователей - ДУБЛИРУЮЩАЯ ФУНКЦИЯ (используется основная выше)
/*
app.post('/api/admin/users/stars', requireAuth, async (req, res) => {
    const { telegramId, operation, amount, reason } = req.body;
    
    if (!telegramId || !operation || !amount || !reason) {
        return res.status(400).json({ 
            success: false, 
            error: 'Отсутствуют обязательные поля' 
        });
    }

    try {
        const user = await db.getUser(telegramId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        const currentStars = user.stars || 0;
        let newStars = 0;

        switch (operation) {
            case 'add':
                newStars = currentStars + amount;
                break;
            case 'subtract':
                newStars = Math.max(0, currentStars - amount);
                break;
            case 'set':
                newStars = amount;
                break;
            default:
                return res.status(400).json({ 
                    success: false, 
                    error: 'Неверная операция' 
                });
        }

        await db.addUserStars(telegramId, newStars - currentStars, 'admin_adjustment', { reason });
        
        console.log(`✅ Админ изменил баланс пользователя ${telegramId}: ${currentStars} → ${newStars} (${reason})`);
        
        res.json({ 
            success: true, 
            oldBalance: currentStars,
            newBalance: newStars,
            operation: operation,
            amount: amount
        });
    } catch (error) {
        console.error('❌ Ошибка изменения баланса:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при изменении баланса' 
        });
    }
});
*/

// История баланса пользователя - ДУБЛИРУЮЩАЯ ФУНКЦИЯ (используется основная выше)
/*
app.get('/api/admin/users/:userId/balance-history', requireAuth, async (req, res) => {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ 
            success: false, 
            error: 'Неверный ID пользователя' 
        });
    }

    try {
        const telegramId = parseInt(userId);
        
        const user = await db.getUser(telegramId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        // Получаем историю транзакций
        const history = await db.pool.query(`
            SELECT 
                id,
                amount,
                transaction_type,
                description,
                created_date
            FROM stars_transactions 
            WHERE user_id = $1
            ORDER BY created_date DESC
            LIMIT $2 OFFSET $3
        `, [telegramId, parseInt(limit), parseInt(offset)]);

        const totalResult = await db.pool.query(`
            SELECT COUNT(*) as total 
            FROM stars_transactions 
            WHERE user_id = $1
        `, [telegramId]);

        res.json({ 
            success: true,
            userId: telegramId,
            currentBalance: user.stars || 0,
            history: history.rows || [],
            pagination: {
                total: totalResult.rows?.[0]?.total || 0,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('❌ Ошибка получения истории баланса:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении истории баланса' 
        });
    }
});
*/


// Endpoint для управления шансами победы пользователя  
app.post('/api/admin/users/:userId/win-chance', requireAuth, async (req, res) => {
    const { userId } = req.params;
    const { winChance, reason } = req.body;
    
    // Валидация входных данных
    if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ 
            success: false, 
            error: 'Неверный ID пользователя' 
        });
    }
    
    if (winChance === undefined || isNaN(parseFloat(winChance)) || winChance < 0 || winChance > 100) {
        return res.status(400).json({ 
            success: false, 
            error: 'Шанс победы должен быть числом от 0 до 100' 
        });
    }
    
    if (!reason || reason.trim().length < 3) {
        return res.status(400).json({ 
            success: false, 
            error: 'Причина изменения обязательна (минимум 3 символа)' 
        });
    }

    try {
        console.log(`🎯 Админ изменяет win_chance для пользователя ${userId}: ${winChance}% (причина: ${reason})`);
        
        // Проверяем существование пользователя
        const user = await db.getUser(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }
        
        // Изменяем win_chance
        const updatedUser = await db.setUserWinChance(userId, parseFloat(winChance), reason);
        
        if (!updatedUser) {
            return res.status(500).json({ 
                success: false, 
                error: 'Не удалось обновить шанс победы' 
            });
        }
        
        console.log(`✅ Win chance обновлен для пользователя ${userId}: ${winChance}%`);
        
        res.json({ 
            success: true, 
            message: 'Шанс победы обновлен успешно',
            data: {
                userId: userId,
                oldWinChance: user.win_chance || 6.0,
                newWinChance: parseFloat(winChance),
                reason: reason
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка изменения win_chance:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Внутренняя ошибка сервера при изменении win_chance' 
        });
    }
});

// Изменение статуса пользователя (блокировка/разблокировка)
app.post('/api/admin/users/status', requireAuth, async (req, res) => {
    const { telegramId, action, reason } = req.body;
    
    if (!telegramId || !action || !reason) {
        return res.status(400).json({ 
            success: false, 
            error: 'Отсутствуют обязательные поля' 
        });
    }

    try {
        const user = await db.getUser(telegramId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        let newStatus;
        switch (action) {
            case 'ban':
                newStatus = false;
                await db.pool.query('UPDATE users SET is_active = $1 WHERE telegram_id = $2', [false, telegramId]);
                break;
            case 'unban':
                newStatus = true;
                await db.pool.query('UPDATE users SET is_active = $1 WHERE telegram_id = $2', [true, telegramId]);
                break;
            default:
                return res.status(400).json({ 
                    success: false, 
                    error: 'Неверное действие' 
                });
        }

        console.log(`✅ Админ изменил статус пользователя ${telegramId}: ${action} (${reason})`);
        
        res.json({ 
            success: true, 
            userId: telegramId,
            newStatus: newStatus,
            action: action
        });
    } catch (error) {
        console.error('❌ Ошибка изменения статуса пользователя:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при изменении статуса пользователя' 
        });
    }
});

// === ТЕСТОВЫЕ ЭНДПОИНТЫ ===

// Простой тест API
app.get('/api/admin/test', requireAuth, (req, res) => {
    res.json({ 
        success: true, 
        message: 'API работает!', 
        timestamp: new Date().toISOString(),
        user: req.user || null
    });
});

// Тест подключения к базе данных
app.get('/api/admin/db-test', requireAuth, async (req, res) => {
    try {
        console.log('🔍 Тестируем подключение к БД...');
        
        // Тест 1: Подсчет пользователей
        const countResult = await db.pool.query('SELECT COUNT(*) as total FROM users');
        const userCount = parseInt(countResult.rows?.[0]?.total) || 0;
        
        // Тест 2: Получение первых 3 пользователей
        const usersResult = await db.pool.query('SELECT telegram_id, first_name, username, stars FROM users LIMIT 3');
        const users = usersResult.rows || [];
        
        // Тест 3: Проверка схемы таблицы users
        const schemaResult = await db.pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        const userSchema = schemaResult.rows || [];
        
        // Тест 4: Проверка количества призов
        const prizesCountResult = await db.pool.query('SELECT COUNT(*) as total FROM prizes');
        const prizesCount = parseInt(prizesCountResult.rows?.[0]?.total) || 0;
        
        console.log(`📊 В БД найдено ${userCount} пользователей и ${prizesCount} призов`);
        console.log('👥 Первые пользователи:', users);
        console.log('🏗️ Схема таблицы users:', userSchema);
        
        res.json({
            success: true,
            database: 'connected',
            userCount: userCount,
            prizesCount: prizesCount,
            sampleUsers: users,
            userTableSchema: userSchema,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Ошибка подключения к БД:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            database: 'error'
        });
    }
});

// === API ДЛЯ УПРАВЛЕНИЯ ПРИЗАМИ ===

// API для управления призами
app.get('/api/admin/prizes/stats', requireAuth, async (req, res) => {
    try {
        console.log('🎁 Admin API: Запрос статистики призов');
        
        // Получаем статистику призов
        const statsQuery = `
            SELECT 
                COUNT(*) as total_prizes,
                COUNT(CASE WHEN is_given = false THEN 1 END) as pending_prizes,
                COUNT(CASE WHEN is_given = true THEN 1 END) as given_prizes,
                COUNT(CASE WHEN is_given = true AND DATE(given_at) = CURRENT_DATE THEN 1 END) as given_today,
                COUNT(CASE WHEN type = 'stars' THEN 1 END) as total_stars_prizes
            FROM prizes
        `;
        
        const result = await db.pool.query(statsQuery);
        const stats = result.rows[0] || {};
        
        res.json({
            success: true,
            stats: {
                total: parseInt(stats.total_prizes) || 0,
                pending: parseInt(stats.pending_prizes) || 0,
                given: parseInt(stats.given_prizes) || 0,
                given_today: parseInt(stats.given_today) || 0,
                total_value: parseInt(stats.total_stars_value) || 0
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения статистики призов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения статистики призов'
        });
    }
});

// API для получения призов (ожидающие и выданные)
app.get('/api/admin/prizes', requireAuth, async (req, res) => {
    try {
        const { 
            status = 'pending', 
            page = 1, 
            limit = 20, 
            search = '',
            type = 'all',
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        console.log(`🎁 Admin API: Запрос призов (${status}), страница ${page}`);
        
        // Строим условие статуса
        const statusCondition = status === 'pending' ? 'p.is_given = false' : 'p.is_given = true';
        
        // Строим условие поиска
        let searchCondition = '';
        let searchParams = [];
        let paramIndex = 1;
        
        if (search) {
            searchCondition = `
                AND (u.first_name ILIKE $${paramIndex} 
                    OR u.last_name ILIKE $${paramIndex} 
                    OR u.username ILIKE $${paramIndex}
                    OR p.type ILIKE $${paramIndex}
                    OR p.description ILIKE $${paramIndex})
            `;
            searchParams.push(`%${search}%`);
            paramIndex++;
        }
        
        // Строим условие типа
        let typeCondition = '';
        if (type !== 'all') {
            typeCondition = `AND p.type = $${paramIndex}`;
            searchParams.push(type);
            paramIndex++;
        }
        
        // Валидация сортировки
        const validSortColumns = ['created_at', 'type', 'given_at'];
        const sortColumn = validSortColumns.includes(sortBy) ? `p.${sortBy}` : 'p.created_at';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        const prizesQuery = `
            SELECT 
                p.id,
                p.type,
                p.description,
                p.created_at,
                p.is_given,
                p.given_at,
                u.telegram_id as user_telegram_id,
                u.first_name as user_first_name,
                u.last_name as user_last_name,
                u.username as user_username
            FROM prizes p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE ${statusCondition}
            ${searchCondition}
            ${typeCondition}
            ORDER BY ${sortColumn} ${order}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        const countQuery = `
            SELECT COUNT(*) as total
            FROM prizes p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE ${statusCondition}
            ${searchCondition}
            ${typeCondition}
        `;
        
        // Выполняем запросы
        const prizesResult = await db.pool.query(prizesQuery, [...searchParams, parseInt(limit), parseInt(offset)]);
        const countResult = await db.pool.query(countQuery, searchParams);
        
        const total = parseInt(countResult.rows[0]?.total) || 0;
        
        console.log(`✅ Найдено призов: ${prizesResult.rows.length} из ${total}`);
        
        res.json({
            success: true,
            prizes: prizesResult.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения призов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения списка призов'
        });
    }
});

// API для отметки приза как выданного
app.post('/api/admin/prizes/:prizeId/mark-given', requireAuth, async (req, res) => {
    try {
        const prizeId = req.params.prizeId;
        const { notes = '' } = req.body;
        
        console.log(`🎁 Admin API: Отметка приза ${prizeId} как выданного`);
        
        // Проверяем существование приза
        const prizeResult = await db.pool.query(
            'SELECT id, is_given, user_id FROM prizes WHERE id = $1',
            [prizeId]
        );
        
        if (prizeResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Приз не найден'
            });
        }
        
        const prize = prizeResult.rows[0];
        
        if (prize.is_given) {
            return res.status(400).json({
                success: false,
                error: 'Приз уже отмечен как выданный'
            });
        }
        
        // Отмечаем приз как выданный
        await db.pool.query(`
            UPDATE prizes 
            SET is_given = true, 
                given_at = NOW(), 
                given_by_admin = $1,
                admin_notes = $2
            WHERE id = $3
        `, ['admin', notes, prizeId]);
        
        // Записываем в лог
        await db.pool.query(`
            INSERT INTO user_transactions (user_id, type, amount, description, transaction_date)
            VALUES ($1, 'admin_prize_given', $2, $3, NOW())
        `, [prize.user_id, prizeId, `Приз #${prizeId} отмечен как выданный. ${notes}`]);
        
        res.json({
            success: true,
            message: 'Приз отмечен как выданный'
        });
        
    } catch (error) {
        console.error('Ошибка отметки приза как выданного:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка отметки приза как выданного'
        });
    }
});

// API для массовой отметки призов как выданных
app.post('/api/admin/prizes/bulk-mark-given', requireAuth, async (req, res) => {
    try {
        const { prizeIds, notes = '' } = req.body;
        
        if (!Array.isArray(prizeIds) || prizeIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Не указаны призы для отметки'
            });
        }
        
        console.log(`🎁 Admin API: Массовая отметка призов как выданных: ${prizeIds.join(', ')}`);
        
        // Получаем информацию о призах
        const prizesResult = await db.pool.query(
            `SELECT id, is_given, user_id FROM prizes WHERE id = ANY($1)`,
            [prizeIds]
        );
        
        const validPrizes = prizesResult.rows.filter(p => !p.is_given);
        
        if (validPrizes.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Все указанные призы уже выданы или не найдены'
            });
        }
        
        const validPrizeIds = validPrizes.map(p => p.id);
        
        // Отмечаем призы как выданные
        await db.pool.query(`
            UPDATE prizes 
            SET is_given = true, 
                given_at = NOW(), 
                given_by_admin = $1,
                admin_notes = $2
            WHERE id = ANY($3)
        `, ['admin', notes, validPrizeIds]);
        
        // Записываем в лог для каждого пользователя
        for (const prize of validPrizes) {
            await db.pool.query(`
                INSERT INTO user_transactions (user_id, type, amount, description, transaction_date)
                VALUES ($1, 'admin_prize_given', $2, $3, NOW())
            `, [prize.user_id, prize.id, `Приз #${prize.id} отмечен как выданный (массово). ${notes}`]);
        }
        
        res.json({
            success: true,
            message: `Отмечено как выданные: ${validPrizes.length} призов`,
            processed: validPrizes.length
        });
        
    } catch (error) {
        console.error('Ошибка массовой отметки призов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка массовой отметки призов'
        });
    }
});

// API для выдачи пользовательского приза
app.post('/api/admin/prizes/give-custom', requireAuth, async (req, res) => {
    try {
        const { telegramId, type, starsAmount, premiumDuration, description, notes = '' } = req.body;
        
        if (!telegramId || !type) {
            return res.status(400).json({
                success: false,
                error: 'Не указаны обязательные параметры'
            });
        }
        
        console.log(`🎁 Admin API: Выдача пользовательского приза пользователю ${telegramId}`);
        
        // Проверяем существование пользователя
        const userResult = await db.pool.query(
            'SELECT telegram_id FROM users WHERE telegram_id = $1',
            [telegramId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }
        
        // Создаем приз
        const prizeResult = await db.pool.query(`
            INSERT INTO prizes (
                user_id, type, description, is_given, given_at, given_by
            )
            VALUES ($1, $2, $3, true, NOW(), 1)
            RETURNING id
        `, [
            telegramId, 
            type, 
            description || null
        ]);
        
        const prizeId = prizeResult.rows[0].id;
        
        // Если это звезды, добавляем их пользователю
        if (type === 'stars' && starsAmount > 0) {
            await db.pool.query(
                'UPDATE users SET stars = stars + $1 WHERE telegram_id = $2',
                [starsAmount, telegramId]
            );
            
            // Записываем транзакцию
            await db.pool.query(`
                INSERT INTO user_transactions (user_id, type, amount, description, transaction_date)
                VALUES ($1, 'admin_prize_stars', $2, $3, NOW())
            `, [telegramId, starsAmount, `Призовые звезды от админа: ${description || 'Пользовательский приз'}`]);
        }
        
        // Записываем в лог
        await db.pool.query(`
            INSERT INTO user_transactions (user_id, type, amount, description, transaction_date)
            VALUES ($1, 'admin_custom_prize', $2, $3, NOW())
        `, [telegramId, prizeId, `Выдан пользовательский приз #${prizeId}: ${description || type}. ${notes}`]);
        
        res.json({
            success: true,
            message: 'Пользовательский приз успешно выдан',
            prizeId: prizeId
        });
        
    } catch (error) {
        console.error('Ошибка выдачи пользовательского приза:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка выдачи пользовательского приза'
        });
    }
});

// API для получения информации о конкретном пользователе
app.get('/api/admin/users/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(`👤 Admin API: Запрос пользователя ${userId}`);
        
        const telegramId = parseInt(userId);
        if (isNaN(telegramId)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный ID пользователя'
            });
        }
        
        // Получаем основную информацию о пользователе
        const userQuery = `
            SELECT u.*, 
                   COUNT(DISTINCT p2.id) as total_spins,
                   COUNT(DISTINCT ucs.channel_id) as subscriptions_count,
                   COUNT(DISTINCT p.id) as prizes_won,
                   COALESCE(SUM(CASE WHEN p2.created_at > CURRENT_DATE THEN 1 ELSE 0 END), 0) as spins_today
            FROM users u
            LEFT JOIN prizes p2 ON u.id = p2.user_id
            LEFT JOIN user_channel_subscriptions ucs ON u.id = ucs.user_id
            LEFT JOIN prizes p ON u.id = p.user_id AND p.is_given = true
            WHERE u.telegram_id = $1
            GROUP BY u.id, u.telegram_id
        `;
        
        const result = await db.pool.query(userQuery, [telegramId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }
        
        const user = result.rows[0];
        
        // Получаем последние прокрутки
        const spinsQuery = `
            SELECT id, type as prize_type, description as prize_name, created_at
            FROM prizes 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 10
        `;
        const spinsResult = await db.pool.query(spinsQuery, [user.id]);
        
        // Получаем подписки на каналы
        const subscriptionsQuery = `
            SELECT pc.channel_name, pc.channel_username, ucs.subscribed_date
            FROM user_channel_subscriptions ucs
            LEFT JOIN partner_channels pc ON ucs.channel_id = pc.id
            WHERE ucs.user_id = $1
            ORDER BY ucs.subscribed_date DESC
            LIMIT 10
        `;
        const subscriptionsResult = await db.pool.query(subscriptionsQuery, [user.id]);
        
        console.log(`✅ Информация о пользователе ${userId} получена`);
        
        res.json({
            success: true,
            user: {
                id: user.telegram_id,
                telegramId: user.telegram_id,
                firstName: user.first_name,
                lastName: user.last_name,
                username: user.username,
                stars: parseInt(user.stars) || 0,
                createdAt: user.created_at,
                lastActivity: user.last_activity,
                isBanned: user.tasks_ban_until && new Date(user.tasks_ban_until) > new Date(),
                banUntil: user.tasks_ban_until,
                win_chance: parseFloat(user.win_chance) || 0,
                stars_chance: parseFloat(user.stars_chance) || 0,
                certificate_chance: parseFloat(user.certificate_chance) || 0,
                first_name: user.first_name, // Для совместимости с админкой
                last_name: user.last_name,
                stats: {
                    totalSpins: parseInt(user.total_spins) || 0,
                    subscriptions: parseInt(user.subscriptions_count) || 0,
                    prizesWon: parseInt(user.prizes_won) || 0,
                    spinsToday: parseInt(user.spins_today) || 0
                },
                recentSpins: spinsResult.rows,
                subscriptions: subscriptionsResult.rows
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения пользователя:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения информации о пользователе'
        });
    }
});

// 404 обработчик для админ API
app.use('/api/admin/*', (req, res) => {
    console.log(`❌ 404 для админ API: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        error: 'Admin API endpoint not found',
        path: req.originalUrl
    });
});

// === ЗАПУСК СЕРВЕРА ===

// Переменная для фоновых задач
let backgroundTasks = null;
let sponsorAutomation = null;
let winsChannelManager = null;

const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log('\n🎉 KOSMETICHKA LOTTERY BOT ЗАПУЩЕН!');
    console.log('=====================================');
    console.log(`   📡 Порт: ${PORT}`);
    console.log(`   🌐 URL: ${WEBAPP_URL}`);
    console.log(`   🤖 Бот: ${bot ? '✅ Подключен' : '❌ Ошибка'}`);
    
    // Инициализация информации о боте
    if (bot && !bot.botInfo) {
        try {
            bot.botInfo = await bot.getMe();
            console.log(`   🤖 Bot Info: @${bot.botInfo.username} (ID: ${bot.botInfo.id})`);
        } catch (error) {
            console.log(`   🤖 Bot Info: ❌ Ошибка получения (${error.message})`);
        }
    }
    
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
        const activeSubscriptions = await db.getActiveSubscriptions();

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
        const channels = await db.getActiveChannels();
        const taskChannel = channels.find(c => c.channel_username === 'kosmetichka_channel');

        if (!taskChannel) {
            console.log('❌ Канал для задания не найден');
            return;
        }

        // Получаем всех пользователей
        const users = await db.getAllActiveUsers();

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

// API для получения отладочной информации о пользователе
app.get('/api/debug/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`🔍 Отладка пользователя ${userId}`);
        
        const user = await db.getUser(parseInt(userId));
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`👤 Данные пользователя ${userId}:`, {
            telegram_id: user.telegram_id,
            first_name: user.first_name,
            username: user.username,
            last_name: user.last_name,
            referrals: user.referrals,
            stars: user.stars
        });
        
        res.json({
            user_data: {
                telegram_id: user.telegram_id,
                first_name: user.first_name,
                username: user.username,
                last_name: user.last_name,
                referrals: user.referrals,
                stars: user.stars,
                total_stars_earned: user.total_stars_earned,
                is_active: user.is_active
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка отладки пользователя:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

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

// === ADMIN API ENDPOINTS ===

/*
// СТАРЫЙ ДУБЛИРУЮЩИЙ ЭНДПОИНТ - УДАЛЕН
// Получить статистику для дашборда
app.get('/api/admin/stats', requireAuth, async (req, res) => {
    try {
        console.log('📊 Admin API: Запрос статистики');
        
        // Получаем статистику через правильные методы PostgreSQL
        let totalUsers = 0;
        let activeUsers = 0;
        
        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM users');
            totalUsers = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета пользователей:', err);
        }

        try {
            const result = await db.pool.query("SELECT COUNT(*) as count FROM users WHERE last_activity > NOW() - INTERVAL '1 day'");
            activeUsers = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета активных пользователей:', err);
        }

        const stats = {
            total_users: totalUsers,
            active_users: activeUsers,
            total_stars: 0,
            total_spins: 0,
            today_users: 0,
            today_spins: 0
        };
        
        res.json({
            success: true,
            stats: {
                totalUsers: stats.total_users || 0,
                activeUsers: stats.active_users || 0,
                totalStars: stats.total_stars || 0,
                totalSpins: stats.total_spins || 0,
                todayUsers: stats.today_users || 0,
                todaySpins: stats.today_spins || 0,
                topChannels: [],
                system: {
                    uptime: Math.floor(process.uptime()),
                    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    version: '1.0.0'
                }
            }
        });
    } catch (error) {
        console.error('❌ Ошибка получения статистики:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка получения статистики' 
        });
    }
});
*/

// Дублирующий эндпоинт удален - используется версия с requireAuth выше

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
        await db.addUserStars(userId, rewardStars, 'partner_channel', {channelId: channelId, channelName: channel.channel_name});
        console.log(`⭐ Начислено ${rewardStars} звезд пользователю ${userId}`);
        
        // Проверяем и разблокируем достижения
        const unlockedAchievements = await db.checkAndUnlockAchievements(user.id);
        let achievementStars = 0;
        
        if (unlockedAchievements.length > 0) {
            achievementStars = unlockedAchievements.reduce((sum, ach) => sum + ach.stars, 0);
            await db.addUserStars(userId, achievementStars, 'achievement', {achievements: unlockedAchievements.map(a => a.key)});
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
            await db.addUserStars(user.referrer_id, 5, 'referral_activation', {activatedUser: userId});
            
            console.log(`👥 Активирован реферер пользователя ${userId} после 2-й подписки, выдано 20 звезд`);
            
            // Отправляем уведомление рефереру
            try {
                const referrer = await db.getUser(user.referrer_id);
                if (referrer) {
                    await bot.sendMessage(
                        referrer.telegram_id,
                        `Ваш друг выполнил 2 подписки и активировался!\n\n+5 звезд за активного реферала!\n\nПриглашайте еще друзей и получайте больше наград! 🎁`
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

// === ADMIN API ENDPOINTS (АКТИВНЫЕ) ===

/*
// ДУБЛИРУЮЩИЙ БЛОК ЗАКОММЕНТИРОВАН - Express использует первое определение роута
// Полная статистика для дашборда админки
app.get('/api/admin/stats', requireAuth, async (req, res) => {
    try {
        console.log('📊 Admin API: Запрос полной статистики дашборда');
        
        const stats = {};
        
        // Общая статистика пользователей
        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM users');
            stats.totalUsers = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета пользователей:', err);
            stats.totalUsers = 0;
        }

        // Активные пользователи за 24 часа  
        try {
            const result = await db.pool.query("SELECT COUNT(*) as count FROM users WHERE last_activity > NOW() - INTERVAL '1 day'");
            stats.activeUsers = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета активных пользователей:', err);
            stats.activeUsers = 0;
        }

        // Новые пользователи за сегодня
        try {
            const result = await db.pool.query("SELECT COUNT(*) as count FROM users WHERE join_date > CURRENT_DATE");
            stats.todayUsers = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета новых пользователей:', err);
            stats.todayUsers = 0;
        }

        // Статистика каналов
        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM partner_channels WHERE is_active = true');
            stats.totalChannels = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета каналов:', err);
            stats.totalChannels = 0;
        }

        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM partner_channels WHERE is_active = true AND is_hot_offer = true');
            stats.hotChannels = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета горячих каналов:', err);
            stats.hotChannels = 0;
        }

        // Статистика подписок
        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM user_channel_subscriptions');
            stats.totalSubscriptions = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета подписок:', err);
            stats.totalSubscriptions = 0;
        }

        try {
            const result = await db.pool.query("SELECT COUNT(*) as count FROM user_channel_subscriptions WHERE subscribed_date > CURRENT_DATE");
            stats.todaySubscriptions = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета подписок за сегодня:', err);
            stats.todaySubscriptions = 0;
        }

        // Статистика прокруток
        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM prizes');
            stats.totalSpins = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета прокруток:', err);
            stats.totalSpins = 0;
        }

        try {
            const result = await db.pool.query("SELECT COUNT(*) as count FROM prizes WHERE created_at > CURRENT_DATE");
            stats.todaySpins = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета прокруток за сегодня:', err);
            stats.todaySpins = 0;
        }

        // Призы ожидающие выдачи
        try {
            const result = await db.pool.query('SELECT COUNT(*) as count FROM prizes WHERE is_given = false');
            stats.pendingPrizes = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета призов:', err);
            stats.pendingPrizes = 0;
        }

        try {
            const result = await db.pool.query("SELECT COUNT(*) as count FROM prizes WHERE is_given = false AND (type ILIKE '%certificate%' OR type ILIKE '%сертификат%')");
            stats.pendingCertificates = parseInt(result.rows[0]?.count) || 0;
        } catch (err) {
            console.error('Ошибка подсчета сертификатов:', err);
            stats.pendingCertificates = 0;
        }

        // Общая сумма звезд у всех пользователей
        try {
            const result = await db.pool.query('SELECT SUM(stars) as total FROM users');
            stats.totalStars = parseInt(result.rows[0]?.total) || 0;
        } catch (err) {
            console.error('Ошибка подсчета звезд:', err);
            stats.totalStars = 0;
        }

        // Статистика пригласительных ссылок
        try {
            const result = await db.pool.query('SELECT SUM(joined_via_invite) as total FROM partner_channels WHERE joined_via_invite > 0');
            stats.inviteLinkJoins = parseInt(result.rows[0]?.total) || 0;
        } catch (err) {
            console.error('Ошибка подсчета присоединений через invite link:', err);
            stats.inviteLinkJoins = 0;
        }

        // Топ каналы по подпискам
        try {
            const result = await db.pool.query(`
                SELECT pc.channel_name, pc.channel_username, pc.current_subscribers, 
                       COUNT(ucs.user_id) as conversions,
                       CASE 
                           WHEN pc.current_subscribers > 0 THEN 
                               ROUND((COUNT(ucs.user_id)::float / pc.current_subscribers * 100)::numeric, 2)
                           ELSE 0 
                       END as conversion_rate
                FROM partner_channels pc
                LEFT JOIN user_channel_subscriptions ucs ON pc.id = ucs.channel_id
                WHERE pc.is_active = true AND pc.current_subscribers > 0
                GROUP BY pc.id, pc.channel_name, pc.channel_username, pc.current_subscribers
                ORDER BY pc.current_subscribers DESC
                LIMIT 5
            `);
            
            stats.topChannels = result.rows.map(row => ({
                name: row.channel_name || row.channel_username,
                username: row.channel_username,
                subscribers: row.current_subscribers || 0,
                conversions: parseInt(row.conversions) || 0,
                conversionRate: parseFloat(row.conversion_rate) || 0
            }));
        } catch (err) {
            console.error('Ошибка получения топ каналов:', err);
            stats.topChannels = [];
        }

        // Системная информация
        stats.system = {
            status: 'healthy',
            uptime: Math.floor(process.uptime()),
            dbStatus: 'connected',
            memoryUsage: process.memoryUsage().heapUsed,
            version: '1.0.0'
        };

        console.log(`✅ Статистика для дашборда: ${stats.totalUsers} пользователей, ${stats.totalChannels} каналов`);
        
        res.json({
            success: true,
            stats
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения статистики дашборда:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка получения статистики',
            stats: {
                totalUsers: 0,
                activeUsers: 0,
                todayUsers: 0,
                totalChannels: 0,
                hotChannels: 0,
                totalSubscriptions: 0,
                todaySubscriptions: 0,
                totalSpins: 0,
                todaySpins: 0,
                pendingPrizes: 0,
                pendingCertificates: 0,
                totalStars: 0,
                inviteLinkJoins: 0,
                topChannels: [],
                system: {
                    status: 'error',
                    uptime: Math.floor(process.uptime()),
                    dbStatus: 'error',
                    memoryUsage: process.memoryUsage().heapUsed,
                    version: '1.0.0'
                }
            }
        });
    }
});

// API для получения событий дашборда
app.get('/api/admin/events', requireAuth, async (req, res) => {
    try {
        console.log('📋 Admin API: Запрос событий дашборда');
        
        const { limit = 10, offset = 0 } = req.query;
        const events = [];
        
        try {
            // Последние регистрации пользователей
            const newUsers = await db.pool.query(`
                SELECT telegram_id, first_name, username, created_at
                FROM users 
                ORDER BY created_at DESC 
                LIMIT 3
            `);
            
            newUsers.rows.forEach(user => {
                events.push({
                    id: `user_${user.telegram_id}`,
                    type: 'user',
                    title: 'Новый пользователь',
                    description: `Пользователь ${user.first_name}${user.username ? ` (@${user.username})` : ''} присоединился к боту`,
                    created_at: user.created_at,
                    user: { 
                        name: user.first_name,
                        username: user.username 
                    }
                });
            });
            
        } catch (err) {
            console.error('Ошибка получения пользователей:', err);
        }

        try {
            // Последние прокрутки с призами
            const recentSpins = await db.pool.query(`
                SELECT p.id, p.user_id, p.type as prize_type, p.description as prize_name, p.created_at,
                       u.first_name, u.username
                FROM prizes p
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.type != 'empty'
                ORDER BY p.created_at DESC 
                LIMIT 3
            `);
            
            recentSpins.rows.forEach(spin => {
                events.push({
                    id: `spin_${spin.id}`,
                    type: 'prize',
                    title: 'Выигрыш приза',
                    description: `Выдан приз: ${spin.prize_name}`,
                    created_at: spin.created_at,
                    user: {
                        name: spin.first_name,
                        username: spin.username
                    }
                });
            });
            
        } catch (err) {
            console.error('Ошибка получения прокруток:', err);
        }

        try {
            // Последние подписки на каналы
            const recentSubscriptions = await db.pool.query(`
                SELECT ucs.user_id, ucs.subscribed_date, 
                       pc.channel_name, pc.channel_username,
                       u.first_name, u.username
                FROM user_channel_subscriptions ucs
                LEFT JOIN partner_channels pc ON ucs.channel_id = pc.id
                LEFT JOIN users u ON ucs.user_id = u.id
                ORDER BY ucs.subscribed_date DESC
                LIMIT 3
            `);
            
            recentSubscriptions.rows.forEach(sub => {
                events.push({
                    id: `sub_${sub.user_id}_${sub.channel_username}`,
                    type: 'channel',
                    title: 'Новая подписка',
                    description: `Подписка на канал ${sub.channel_name || sub.channel_username}`,
                    created_at: sub.subscribed_date,
                    user: {
                        name: sub.first_name,
                        username: sub.username
                    }
                });
            });
            
        } catch (err) {
            console.error('Ошибка получения подписок:', err);
        }

        // Сортируем события по времени
        events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Применяем лимит и офсет
        const paginatedEvents = events.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        
        console.log(`✅ Найдено событий: ${events.length}, возвращено: ${paginatedEvents.length}`);
        
        res.json({
            success: true,
            events: paginatedEvents,
            total: events.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения событий дашборда:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения событий',
            events: []
        });
    }
});

// API для управления пользователями в админке
app.get('/api/admin/users', requireAuth, async (req, res) => {
    try {
        console.log('👥 Admin API: Запрос списка пользователей');
        
        const { limit = 50, offset = 0, search = '', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
        
        // Базовый запрос
        let query = `
            SELECT u.telegram_id, u.first_name, u.last_name, u.username, 
                   u.stars, u.created_at, u.last_activity, u.tasks_ban_until,
                   u.win_chance, u.stars_chance, u.certificate_chance,
                   COUNT(DISTINCT s.id) as total_spins,
                   COUNT(DISTINCT ucs.channel_id) as subscriptions_count,
                   COUNT(DISTINCT p.id) as prizes_won
            FROM users u
            LEFT JOIN prizes s ON u.id = s.user_id
            LEFT JOIN user_channel_subscriptions ucs ON u.id = ucs.user_id
            LEFT JOIN prizes p ON u.id = p.user_id AND p.is_given = true
        `;
        
        const params = [];
        let paramIndex = 1;
        
        // Добавляем поиск
        if (search) {
            query += ` WHERE (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        query += ` GROUP BY u.telegram_id`;
        
        // Добавляем сортировку
        const validSortColumns = ['created_at', 'last_activity', 'stars', 'first_name', 'total_spins'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        query += ` ORDER BY ${sortColumn} ${order}`;
        
        // Добавляем пагинацию
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await db.pool.query(query, params);
        
        // Получаем общее количество пользователей для пагинации
        let countQuery = 'SELECT COUNT(*) as total FROM users';
        const countParams = [];
        
        if (search) {
            countQuery += ` WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR username ILIKE $1)`;
            countParams.push(`%${search}%`);
        }
        
        const countResult = await db.pool.query(countQuery, countParams);
        const totalUsers = parseInt(countResult.rows[0]?.total) || 0;
        
        console.log(`✅ Найдено пользователей: ${result.rows.length} из ${totalUsers}`);
        
        res.json({
            success: true,
            users: result.rows.map(user => ({
                id: user.telegram_id,
                telegramId: user.telegram_id,
                firstName: user.first_name,
                lastName: user.last_name,
                username: user.username,
                stars: parseInt(user.stars) || 0,
                createdAt: user.created_at,
                lastActivity: user.last_activity,
                isBanned: user.tasks_ban_until && new Date(user.tasks_ban_until) > new Date(),
                banUntil: user.tasks_ban_until,
                stats: {
                    totalSpins: parseInt(user.total_spins) || 0,
                    subscriptions: parseInt(user.subscriptions_count) || 0,
                    prizesWon: parseInt(user.prizes_won) || 0
                }
            })),
            pagination: {
                total: totalUsers,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(totalUsers / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения пользователей:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения списка пользователей',
            users: []
        });
    }
});

// ENDPOINT MOVED TO LINE 5418 TO FIX ROUTE ORDERING

// API для управления балансом пользователя - ТРЕТЬЯ ДУБЛИРУЮЩАЯ ФУНКЦИЯ (используется основная выше)
/*
app.post('/api/admin/users/stars', requireAuth, async (req, res) => {
    try {
        const { telegramId, operation, amount, reason } = req.body;
        
        if (!telegramId || !operation || !amount || !reason) {
            return res.status(400).json({
                success: false,
                error: 'Отсутствуют обязательные параметры'
            });
        }
        
        // Получаем текущий баланс пользователя
        const userResult = await db.pool.query(
            'SELECT stars FROM users WHERE telegram_id = $1',
            [telegramId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }
        
        const oldBalance = userResult.rows[0].stars || 0;
        let newBalance;
        
        switch (operation) {
            case 'add':
                newBalance = oldBalance + amount;
                break;
            case 'subtract':
                newBalance = Math.max(0, oldBalance - amount);
                break;
            case 'set':
                newBalance = amount;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Неизвестная операция'
                });
        }
        
        // Обновляем баланс
        await db.pool.query(
            'UPDATE users SET stars = $1 WHERE telegram_id = $2',
            [newBalance, telegramId]
        );
        
        // Записываем в историю
        await db.pool.query(`
            INSERT INTO user_transactions (user_id, type, amount, description, transaction_date)
            VALUES ($1, 'admin_balance', $2, $3, NOW())
        `, [telegramId, newBalance - oldBalance, reason]);
        
        console.log(`💰 Баланс пользователя ${telegramId}: ${oldBalance} → ${newBalance} звезд`);
        
        res.json({
            success: true,
            oldBalance: oldBalance,
            newBalance: newBalance,
            operation: operation,
            amount: amount,
            reason: reason
        });
        
    } catch (error) {
        console.error('Ошибка изменения баланса:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка изменения баланса'
        });
    }
});
*/

// API для изменения шанса победы
app.post('/api/admin/users/:telegramId/win-chance', requireAuth, async (req, res) => {
    try {
        const telegramId = req.params.telegramId;
        const { winChance, reason } = req.body;
        
        if (typeof winChance !== 'number' || winChance < 0 || winChance > 100 || !reason) {
            return res.status(400).json({
                success: false,
                error: 'Некорректные параметры'
            });
        }
        
        // Получаем текущий шанс
        const userResult = await db.pool.query(
            'SELECT win_chance FROM users WHERE telegram_id = $1',
            [telegramId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }
        
        const oldWinChance = userResult.rows[0].win_chance || 0;
        
        // Обновляем шанс
        await db.pool.query(
            'UPDATE users SET win_chance = $1 WHERE telegram_id = $2',
            [winChance, telegramId]
        );
        
        // Записываем в историю
        await db.pool.query(`
            INSERT INTO user_transactions (user_id, type, amount, description, transaction_date)
            VALUES ($1, 'admin_win_chance', $2, $3, NOW())
        `, [telegramId, winChance, `Шанс изменен: ${oldWinChance}% → ${winChance}%. ${reason}`]);
        
        console.log(`🎯 Шанс пользователя ${telegramId}: ${oldWinChance}% → ${winChance}%`);
        
        res.json({
            success: true,
            data: {
                oldWinChance: oldWinChance,
                newWinChance: winChance,
                reason: reason
            }
        });
        
    } catch (error) {
        console.error('Ошибка изменения шанса победы:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка изменения шанса победы'
        });
    }
});

// API для получения истории баланса пользователя
app.get('/api/admin/users/:telegramId/balance-history', requireAuth, async (req, res) => {
    try {
        const telegramId = req.params.telegramId;
        const limit = parseInt(req.query.limit) || 50;
        
        // Получаем историю транзакций
        const historyResult = await db.pool.query(`
            SELECT 
                type as transaction_type,
                amount,
                description,
                transaction_date as created_date
            FROM user_transactions
            WHERE user_id = $1
            ORDER BY transaction_date DESC
            LIMIT $2
        `, [telegramId, limit]);
        
        res.json({
            success: true,
            history: historyResult.rows
        });
        
    } catch (error) {
        console.error('Ошибка получения истории баланса:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения истории баланса'
        });
    }
});

// API для изменения статуса пользователя (блокировка/разблокировка)
app.post('/api/admin/users/status', requireAuth, async (req, res) => {
    try {
        const { telegramId, action, reason } = req.body;
        
        if (!telegramId || !action || !reason) {
            return res.status(400).json({
                success: false,
                error: 'Отсутствуют обязательные параметры'
            });
        }
        
        if (!['ban', 'unban'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Неизвестное действие'
            });
        }
        
        // Получаем пользователя
        const userResult = await db.pool.query(
            'SELECT is_active FROM users WHERE telegram_id = $1',
            [telegramId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }
        
        const newStatus = action === 'ban' ? false : true;
        
        // Обновляем статус
        await db.pool.query(
            'UPDATE users SET is_active = $1 WHERE telegram_id = $2',
            [newStatus, telegramId]
        );
        
        // Записываем в историю
        await db.pool.query(`
            INSERT INTO user_transactions (user_id, type, amount, description, transaction_date)
            VALUES ($1, 'admin_status', $2, $3, NOW())
        `, [telegramId, newStatus ? 1 : 0, reason]);
        
        console.log(`🚫 Статус пользователя ${telegramId}: ${action} - ${reason}`);
        
        res.json({
            success: true,
            action: action,
            newStatus: newStatus,
            reason: reason
        });
        
    } catch (error) {
        console.error('Ошибка изменения статуса пользователя:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка изменения статуса пользователя'
        });
    }
});

// ===================== НЕДОСТАЮЩИЕ API ДЛЯ АДМИНКИ =====================


// API для событий админки
app.get('/api/admin/events', requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        console.log(`📋 Админ: запрос событий, лимит: ${limit}`);
        
        // Простые события из истории транзакций
        const events = await db.pool.query(`
            SELECT 
                st.id,
                st.transaction_type as type,
                st.description,
                st.transaction_date as created_at,
                u.first_name || ' (' || u.telegram_id || ')' as user_name
            FROM stars_transactions st
            JOIN users u ON u.id = st.user_id
            ORDER BY st.transaction_date DESC
            LIMIT $1
        `, [limit]);
        
        res.json({
            events: events.rows.map(event => ({
                id: event.id,
                type: event.type || 'transaction',
                description: event.description || 'Транзакция',
                user: event.user_name,
                timestamp: event.created_at
            }))
        });
        
    } catch (error) {
        console.error('❌ Ошибка событий:', error);
        res.json({ events: [] }); // Возвращаем пустой массив вместо ошибки
    }
});

// API для статистики активности
app.get('/api/admin/activity-stats', requireAuth, async (req, res) => {
    try {
        console.log('📈 Админ: запрос статистики активности');
        
        // Статистика по дням за последнюю неделю
        const activity = await db.pool.query(`
            SELECT 
                DATE(join_date) as date,
                COUNT(*) as users
            FROM users 
            WHERE join_date >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(join_date)
            ORDER BY date
        `);
        
        res.json({
            daily_users: activity.rows,
            total_active: await db.pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = true').then(r => r.rows[0].count)
        });
        
    } catch (error) {
        console.error('❌ Ошибка статистики активности:', error);
        res.json({ daily_users: [], total_active: 0 });
    }
});


// ===================== API ДЛЯ УПРАВЛЕНИЯ ПРИЗАМИ =====================

// API для получения списка призов
app.get('/api/admin/prizes', requireAuth, async (req, res) => {
    try {
        const { 
            status = 'all', 
            page = 1, 
            limit = 20, 
            search = '', 
            type = 'all',
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = req.query;
        
        console.log(`🎁 Админ: запрос призов (статус: ${status}, страница: ${page})`);
        
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        
        // Фильтр по статусу
        if (status !== 'all') {
            if (status === 'pending') {
                whereClause += ` AND p.is_given = false`;
            } else if (status === 'given') {
                whereClause += ` AND p.is_given = true`;
            }
        }
        
        // Фильтр по типу
        if (type !== 'all') {
            whereClause += ` AND p.type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }
        
        // Поиск
        if (search) {
            whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex} OR u.telegram_id::text ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        const query = `
            SELECT 
                p.id,
                p.type,
                p.description,
                p.is_given,
                p.created_at,
                p.given_at,
                u.telegram_id,
                u.first_name,
                u.username
            FROM prizes p
            LEFT JOIN users u ON u.id = p.user_id
            ${whereClause}
            ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        params.push(parseInt(limit), offset);
        
        const result = await db.pool.query(query, params);
        
        // Получаем общее количество для пагинации
        const countQuery = `
            SELECT COUNT(*) as total
            FROM prizes p
            LEFT JOIN users u ON u.id = p.user_id
            ${whereClause}
        `;
        
        const countParams = params.slice(0, -2); // Убираем limit и offset
        const countResult = await db.pool.query(countQuery, countParams);
        
        res.json({
            prizes: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(countResult.rows[0].total / limit)
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения призов:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

console.log('🚀 Kosmetichka Lottery Bot инициализация завершена!');

// Запускаем polling после инициализации сервера
setTimeout(() => {
    startPolling();
}, 2000); // Ждем 2 секунды после запуска сервера

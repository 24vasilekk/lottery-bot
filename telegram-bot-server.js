// telegram-bot-server.js - ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ для Railway

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const Database = require('./database');

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

const BOT_USERNAME = process.env.BOT_USERNAME || 'kosmetichka_lottery_bot';
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
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data']
}));

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
app.post('/api/telegram-webhook', async (req, res) => {
    try {
        const { action, data, user } = req.body;
        
        console.log(`📡 WebApp API: ${action} от пользователя ${user?.id}`);
        
        if (!user || !user.id) {
            return res.status(400).json({ error: 'User data required' });
        }
        
        const userId = user.id;
        
        switch (action) {
            case 'wheel_spin':
                await handleWheelSpin(userId, data);
                break;
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
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для проверки подписок на каналы
app.post('/api/check-subscriptions', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }
        
        const subscriptions = await db.getUserSubscriptions(userId);
        
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

// === КОМАНДЫ БОТА ===

if (bot) {
    // Команда /start
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        console.log(`👤 Новый пользователь: ${userId} (${msg.from.first_name})`);
        
        try {
            // Проверяем, существует ли пользователь
            let user = await db.getUser(userId);
            
            if (!user) {
                // Создаем нового пользователя
                await db.createUser({
                    telegram_id: userId,
                    username: msg.from.username,
                    first_name: msg.from.first_name,
                    last_name: msg.from.last_name
                });
                console.log(`✅ Создан новый пользователь: ${userId}`);
            } else {
                // Обновляем активность существующего пользователя
                await db.updateUserActivity(userId);
                console.log(`🔄 Пользователь ${userId} вернулся`);
            }
        } catch (error) {
            console.error('❌ Ошибка обработки пользователя:', error);
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
⭐ Звезд: ${user.stars || 100}
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
/promo <код> - Активировать промокод
/help - Эта справка

🎯 **Как играть:**
1. Нажмите "Запустить Kosmetichka Lottery"
2. Крутите рулетку за кристаллы (10 💎 за прокрутку)
3. Выполняйте задания для получения кристаллов
4. Приглашайте друзей за бонусы

💎 **Кристаллы:**
• Получайте за выполнение заданий
• Тратьте на прокрутки рулетки
• Зарабатывайте за приглашение друзей

🎁 **Призы:**
• Сертификаты в Золотое яблоко
• Доставка Dolce Deals
• Дополнительные кристаллы

📱 **Подписывайтесь на @dolcedeals для скидок!**

❓ Есть вопросы? Пишите в поддержку.
        `;
        
        bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
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
                        bot.sendMessage(chatId, `📊 **Ваша статистика:**\n\n🎰 Прокруток: ${user.total_spins || 0}\n🎁 Призов: ${user.prizes_won || 0}\n⭐ Звезд: ${user.stars || 100}`, {
                            parse_mode: 'Markdown'
                        });
                    } else {
                        bot.sendMessage(chatId, '📊 Сначала запустите бота командой /start');
                    }
                    break;
                    
                case 'prizes':
                    if (user) {
                        const prizes = await db.getUserPrizes(userId);
                        if (prizes && prizes.length > 0) {
                            let message = '🎁 **Ваши призы:**\n\n';
                            prizes.slice(0, 5).forEach((prize, index) => {
                                message += `${index + 1}. ${prize.prize_name} - ${prize.prize_type}\n`;
                            });
                            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                        } else {
                            bot.sendMessage(chatId, '🎁 У вас пока нет призов. Крутите рулетку!');
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
                
            case 'invite':
                const shareText = '🎰 Привет! Присоединяйся к Kosmetichka Lottery Bot - крути рулетку и выигрывай призы! 💄✨';
                const botUrl = `https://t.me/${BOT_USERNAME}`;
                const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botUrl)}&text=${encodeURIComponent(shareText)}`;
                
                const inviteKeyboard = {
                    inline_keyboard: [
                        [
                            {
                                text: '👥 Пригласить друзей',
                                url: shareUrl
                            }
                        ]
                    ]
                };
                
                bot.sendMessage(chatId, '👥 **Приглашайте друзей и получайте бонусы!**\n\nЗа каждого приглашенного друга вы получите:\n• 50 ⭐ звезд\n• Дополнительные бонусы\n\nНажмите кнопку ниже, чтобы поделиться ботом:', {
                    reply_markup: inviteKeyboard,
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
        const user = await db.getUser(userId);
        if (!user) return;
        
        console.log(`🎰 Пользователь ${userId} крутит рулетку`);
        
        // Обновляем статистику прокруток
        await db.updateUserSpinStats(userId);
        
        // Добавляем запись в историю
        if (data.prize) {
            await db.addSpinHistory(userId, data.prize, data.spinType || 'normal');
            
            // Если приз не пустой - обрабатываем его
            if (data.prize.type !== 'empty') {
                // Обновляем статистику призов
                await db.updateUserPrizeStats(userId);
                
                // Добавляем приз в коллекцию пользователя
                await db.addUserPrize(userId, data.prize);
                
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
                            notifyAdmins(`🎉 Пользователь ${user.first_name} (${userId}) выиграл: ${data.prize.name}`);
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
        const user = await db.getUser(userId);
        if (!user) return webAppData;
        
        console.log(`🔄 Синхронизация данных пользователя ${userId}`);
        
        // Обновляем активность пользователя
        await db.updateUserActivity(userId);
        
        // Получаем актуальные данные из базы
        const prizes = await db.getUserPrizes(userId);
        const completedTasks = await db.getUserCompletedTasks(userId);
        const subscriptions = await db.getUserSubscriptions(userId);
        
        const syncedData = {
            ...webAppData,
            profile: {
                ...webAppData.profile,
                telegramId: userId,
                verified: true,
                name: user.first_name || 'Пользователь'
            },
            stats: {
                stars: user.stars || 100,
                totalSpins: user.total_spins || 0,
                prizesWon: user.prizes_won || 0,
                referrals: user.referrals || 0,
                totalStarsEarned: user.total_stars_earned || 100
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

// Уведомления администратора
function notifyAdmins(message) {
    ADMIN_IDS.forEach(adminId => {
        if (bot) {
            try {
                bot.sendMessage(adminId, `🔔 ${message}`);
            } catch (error) {
                console.error(`Ошибка отправки админу ${adminId}:`, error);
            }
        }
    });
}

// Обработка ошибок Express
app.use((error, req, res, next) => {
    console.error('❌ Express ошибка:', error);
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера', 
        message: process.env.NODE_ENV === 'development' ? error.message : 'Что-то пошло не так'
    });
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

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🎉 KOSMETICHKA LOTTERY BOT ЗАПУЩЕН!');
    console.log('=====================================');
    console.log(`   📡 Порт: ${PORT}`);
    console.log(`   🌐 URL: ${WEBAPP_URL}`);
    console.log(`   🤖 Бот: ${bot ? '✅ Подключен' : '❌ Ошибка'}`);
    console.log(`   📁 Static: ${fs.existsSync(publicPath) ? '✅' : '❌'}`);
    console.log(`   ⚡ Готов к работе!`);
    console.log('\n🔗 Для тестирования:');
    console.log(`   • Health: ${WEBAPP_URL}/health`);
    console.log(`   • Debug: ${WEBAPP_URL}/debug`);
    console.log('=====================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Получен сигнал SIGTERM, завершаем работу...');
    botPolling = false;
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

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

console.log('🚀 Kosmetichka Lottery Bot инициализация завершена!');

// Запускаем polling после инициализации сервера
setTimeout(() => {
    startPolling();
}, 2000); // Ждем 2 секунды после запуска сервера
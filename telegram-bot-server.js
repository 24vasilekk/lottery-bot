// telegram-bot-server.js - ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ для Railway

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// Загружаем переменные окружения
if (fs.existsSync('.env')) {
    require('dotenv').config();
}

// Настройки
const BOT_TOKEN = process.env.BOT_TOKEN || '7607592239:AAHimwv6gNj8dzm9L96eQQPjkz59AdSO198';

// Определяем URL для Railway
let WEBAPP_URL = process.env.WEBAPP_URL;
if (!WEBAPP_URL) {
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        WEBAPP_URL = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    } else if (process.env.RAILWAY_PRIVATE_DOMAIN) {
        WEBAPP_URL = `https://${process.env.RAILWAY_PRIVATE_DOMAIN}`;
    } else {
        // Для Railway используем стандартный формат
        WEBAPP_URL = 'https://lottery-bot.railway.app';
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

// База данных пользователей (в памяти)
const users = new Map();

// Промокоды
const PROMO_CODES = {
    'WELCOME2024': { crystals: 100, used: new Set() },
    'LUCKY777': { crystals: 77, used: new Set() },
    'FRIENDS': { crystals: 50, used: new Set() },
    'NEWBIE': { crystals: 200, used: new Set() },
    'DOLCEDEALS': { crystals: 150, used: new Set() }
};

// ID администраторов
const ADMIN_IDS = [123456789]; // Замените на ваши ID

// Создаем и настраиваем бота
let bot;
try {
    bot = new TelegramBot(BOT_TOKEN, { 
        polling: true,
        request: {
            agentOptions: {
                keepAlive: true,
                family: 4
            }
        }
    });
    console.log('🤖 Telegram Bot инициализирован успешно');
} catch (error) {
    console.error('❌ Ошибка инициализации бота:', error.message);
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
        users: users.size,
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
        users: users.size,
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

// === КОМАНДЫ БОТА ===

if (bot) {
    // Команда /start
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        console.log(`👤 Новый пользователь: ${userId} (${msg.from.first_name})`);
        
        // Сохраняем пользователя
        users.set(userId, {
            id: userId,
            username: msg.from.username,
            first_name: msg.from.first_name,
            chat_id: chatId,
            created_at: new Date().toISOString(),
            webapp_data: {
                stats: {
                    crystals: 150,
                    totalSpins: 0,
                    prizesWon: 0,
                    referrals: 0,
                    totalCrystalsEarned: 150
                },
                tasks: {
                    completed: [],
                    daily: {
                        lastReset: null,
                        completed: []
                    }
                },
                prizes: []
            }
        });
        
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
    bot.onText(/\/stats/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const user = users.get(userId);
        
        if (!user) {
            bot.sendMessage(chatId, '❌ Сначала запустите бота командой /start');
            return;
        }
        
        const stats = user.webapp_data?.stats || {};
        const registrationDate = new Date(user.created_at).toLocaleDateString('ru-RU');
        
        const message = `
👤 **Ваш профиль:**

🆔 ID: ${userId}
📅 Дата регистрации: ${registrationDate}

📊 **Статистика:**
🎰 Прокруток: ${stats.totalSpins || 0}
🎁 Призов: ${stats.prizesWon || 0}
💎 Кристаллов: ${stats.crystals || 150}
👥 Рефералов: ${stats.referrals || 0}

🎮 Играйте больше, чтобы улучшить статистику!
        `;
        
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // Команда /promo для промокодов
    bot.onText(/\/promo (.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const promoCode = match[1].toUpperCase();
        
        const user = users.get(userId);
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
        
        if (!user.webapp_data) user.webapp_data = { stats: { crystals: 0 } };
        user.webapp_data.stats.crystals += promo.crystals;
        user.webapp_data.stats.totalCrystalsEarned += promo.crystals;
        
        bot.sendMessage(chatId, `✅ Промокод активирован!\n💎 Получено ${promo.crystals} кристаллов`);
        
        // Уведомляем админов
        notifyAdmins(`Пользователь ${user.first_name} (${userId}) активировал промокод ${promoCode}`);
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
        
        // Получаем топ пользователей
        const topUsers = Array.from(users.values())
            .filter(user => user.webapp_data && user.webapp_data.stats)
            .sort((a, b) => (b.webapp_data.stats.totalSpins || 0) - (a.webapp_data.stats.totalSpins || 0))
            .slice(0, 10);
        
        if (topUsers.length === 0) {
            bot.sendMessage(chatId, '📊 Пока нет активных игроков. Будьте первым!');
            return;
        }
        
        let message = '🏆 **Топ-10 игроков:**\n\n';
        
        topUsers.forEach((user, index) => {
            const position = index + 1;
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
            const name = user.first_name || 'Игрок';
            const spins = user.webapp_data.stats.totalSpins || 0;
            const prizes = user.webapp_data.stats.prizesWon || 0;
            
            message += `${medal} ${name} - ${spins} прокруток, ${prizes} призов\n`;
        });
        
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // Обработка callback кнопок
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const userId = query.from.id;
        const data = query.data;
        
        await bot.answerCallbackQuery(query.id);
        
        const user = users.get(userId);
        
        switch (data) {
            case 'stats':
                if (user && user.webapp_data) {
                    const stats = user.webapp_data.stats;
                    bot.sendMessage(chatId, `📊 **Ваша статистика:**\n\n🎰 Прокруток: ${stats.totalSpins || 0}\n🎁 Призов: ${stats.prizesWon || 0}\n💎 Кристаллов: ${stats.crystals || 150}`, {
                        parse_mode: 'Markdown'
                    });
                } else {
                    bot.sendMessage(chatId, '📊 Сначала поиграйте в рулетку!');
                }
                break;
                
            case 'prizes':
                if (user && user.webapp_data && user.webapp_data.prizes && user.webapp_data.prizes.length > 0) {
                    let message = '🎁 **Ваши призы:**\n\n';
                    user.webapp_data.prizes.slice(0, 5).forEach((prize, index) => {
                        message += `${index + 1}. ${prize.name} - ${prize.description}\n`;
                    });
                    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                } else {
                    bot.sendMessage(chatId, '🎁 У вас пока нет призов. Крутите рулетку!');
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
                
                bot.sendMessage(chatId, '👥 **Приглашайте друзей и получайте бонусы!**\n\nЗа каждого приглашенного друга вы получите:\n• 50 💎 кристаллов\n• Дополнительные бонусы\n\nНажмите кнопку ниже, чтобы поделиться ботом:', {
                    reply_markup: inviteKeyboard,
                    parse_mode: 'Markdown'
                });
                break;
        }
    });

    // Обработка ошибок бота
    bot.on('error', (error) => {
        console.error('❌ Ошибка бота:', error);
    });

    bot.on('polling_error', (error) => {
        console.error('❌ Ошибка polling:', error);
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
    const user = users.get(userId);
    if (!user) return;
    
    console.log(`🎰 Пользователь ${userId} крутит рулетку`);
    
    // Обновляем статистику
    if (!user.webapp_data) user.webapp_data = { stats: {}, prizes: [] };
    if (!user.webapp_data.stats) user.webapp_data.stats = {};
    
    user.webapp_data.stats.totalSpins = (user.webapp_data.stats.totalSpins || 0) + 1;
    
    // Логика обработки призов
    if (bot && data.prize && data.prize.type !== 'empty') {
        try {
            user.webapp_data.stats.prizesWon = (user.webapp_data.stats.prizesWon || 0) + 1;
            
            // Добавляем приз в список
            if (!user.webapp_data.prizes) user.webapp_data.prizes = [];
            user.webapp_data.prizes.unshift({
                ...data.prize,
                timestamp: new Date().toISOString(),
                id: Date.now()
            });
            
            await bot.sendMessage(user.chat_id, `🎉 Поздравляем!\n🎁 Вы выиграли: ${data.prize.description || data.prize.name}!`);
            
            // Уведомляем админов о крупных призах
            if (data.prize.type === 'golden-apple' || data.prize.type === 'dolce') {
                notifyAdmins(`🎉 Пользователь ${user.first_name} (${userId}) выиграл: ${data.prize.name}`);
            }
        } catch (error) {
            console.error('Ошибка отправки уведомления:', error);
        }
    }
}

// Обработка выполнения задания
async function handleTaskCompleted(userId, data) {
    const user = users.get(userId);
    if (!user) return;
    
    console.log(`✅ Пользователь ${userId} выполнил задание: ${data.taskId}`);
    
    if (bot) {
        try {
            await bot.sendMessage(user.chat_id, `✅ Задание выполнено!\n💎 Получено ${data.reward} кристаллов`);
        } catch (error) {
            console.error('Ошибка отправки уведомления:', error);
        }
    }
}

// Обработка подписки на канал
async function handleChannelSubscription(userId, data) {
    const user = users.get(userId);
    if (!user) return;
    
    console.log(`📱 Пользователь ${userId} подписался на канал: ${data.channel}`);
    
    // Даем бонус за подписку
    if (!user.webapp_data) user.webapp_data = { stats: {} };
    if (!user.webapp_data.stats) user.webapp_data.stats = {};
    
    const bonus = data.channel === 'dolcedeals' ? 100 : 75;
    user.webapp_data.stats.crystals = (user.webapp_data.stats.crystals || 0) + bonus;
    
    if (bot) {
        try {
            await bot.sendMessage(user.chat_id, `📱 Спасибо за подписку на канал!\n💎 Получено ${bonus} кристаллов`);
        } catch (error) {
            console.error('Ошибка отправки уведомления:', error);
        }
    }
}

// Синхронизация данных пользователя
async function syncUserData(userId, webAppData) {
    const user = users.get(userId);
    if (!user) return webAppData;
    
    console.log(`🔄 Синхронизация данных пользователя ${userId}`);
    
    const syncedData = {
        ...webAppData,
        profile: {
            ...webAppData.profile,
            telegramId: userId,
            verified: true
        }
    };
    
    user.webapp_data = syncedData;
    return syncedData;
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
    server.close(() => {
        if (bot) {
            bot.stopPolling();
        }
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 Получен сигнал SIGINT, завершаем работу...');
    server.close(() => {
        if (bot) {
            bot.stopPolling();
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
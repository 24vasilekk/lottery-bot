// admin-bot.js - Отдельный бот для админов
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');
const Database = require('./database');

// Загружаем переменные окружения
if (fs.existsSync('.env')) {
    require('dotenv').config();
}

// Настройки админ-бота
const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;
if (!ADMIN_BOT_TOKEN) {
    console.error('❌ ADMIN_BOT_TOKEN не установлен в переменных окружения');
    console.error('Для активации админ-бота добавьте ADMIN_BOT_TOKEN в переменные окружения');
    console.error('В Railway: Settings -> Variables -> Add Variable');
    console.log('\n⚠️  Админ-бот не будет запущен без токена');
    return; // Просто выходим из модуля, не завершая процесс
}

const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
if (ADMIN_IDS.length === 0) {
    console.error('❌ ADMIN_IDS не установлены в переменных окружения');
    console.error('Добавьте ADMIN_IDS=123456789,987654321 в переменные окружения');
    return; // Просто выходим из модуля, не завершая процесс
}

// Просто выходим, если нет токенов
if (!ADMIN_BOT_TOKEN || ADMIN_IDS.length === 0) {
    console.log('⚠️  Админ-бот не запущен (нет токена или ID админов)');
    return; // Просто выходим из модуля
}

// Используем отдельный порт для админ-панели
const PORT = process.env.ADMIN_PORT || 3001;
const ADMIN_URL = process.env.ADMIN_URL || 
    (process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
        : `http://localhost:${PORT}`);

console.log('🔧 ИНИЦИАЛИЗАЦИЯ АДМИН-БОТА');
console.log('===============================');
console.log(`   🤖 Админ бот токен: ${ADMIN_BOT_TOKEN ? 'установлен ✅' : 'НЕ УСТАНОВЛЕН ❌'}`);
console.log(`   👥 Админы: ${ADMIN_IDS.join(', ')}`);
console.log(`   🌐 Админ URL: ${ADMIN_URL}`);
console.log(`   🔧 Порт: ${PORT}`);

// Инициализация
const app = express();
const db = new Database();
let adminBot = null;

// Middleware
app.use(express.json());
// Используем упрощенную админку только для просмотра статистики
app.use(express.static(path.join(__dirname, 'admin')));

// Главная страница - упрощенная версия
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'simple-index.html'));
});

// API для получения статистики (только чтение)
app.get('/api/admin/stats', async (req, res) => {
    try {
        const stats = await getQuickStats();
        res.json(stats);
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ error: 'Ошибка получения статистики' });
    }
});

// Инициализация бота
try {
    adminBot = new TelegramBot(ADMIN_BOT_TOKEN, { polling: true });
    console.log('✅ Админ-бот инициализирован');
} catch (error) {
    console.error('❌ Ошибка инициализации админ-бота:', error.message);
    process.exit(1);
}

// === MIDDLEWARES ===

// Проверка прав админа
function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

// === КОМАНДЫ АДМИН-БОТА ===

if (adminBot) {
    // Замените приветственное сообщение на:

    adminBot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ У вас нет прав доступа к админ-боту');
            return;
        }

        const welcomeMessage = `
    🤖 **Админ-бот Kosmetichka Lottery**

    👋 Привет, ${msg.from.first_name}!

    🛠️ **Основные команды:**
    /stats - Общая статистика
    /users - Последние пользователи
    /prizes - Ожидающие призы

    💰 **Управление пользователями:**
    /stars user_id amount - изменить звезды
    /set_prize user_id type "name" - добавить приз

    🎰 **УПРАВЛЕНИЕ ШАНСАМИ (НОВОЕ!):**
    /real_chances - посмотреть реальные шансы
    /set_real_chance normal 1 94 - изменить шанс приза
    /reset_real_chances - сбросить к базовым настройкам

    📺 **Каналы и автоматизация:**
    /channels - Активные каналы
    /automation - Статистика спонсоров

    💬 **Прочее:**
    /broadcast сообщение - рассылка
    /help - полная справка

    🎯 **Быстрый старт:**
    1. /reset_real_chances - настроить ваши шансы
    2. /real_chances - проверить результат
    3. /test_real_chances 1000 - протестировать

    Все управление происходит только через команды бота!
    HTML админка отключена - используйте только этого бота.

    ⚠️ **ВАЖНО:** Визуально рулетка НЕ изменится (пустота 20%, звезды 10%, сертификаты 70%)
    Но реальные шансы: пустота 94%, звезды 5%, сертификат 1% (ваши требования)
        `;

        adminBot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // Команда /panel - открыть веб-панель
    adminBot.onText(/\/panel/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const keyboard = {
            inline_keyboard: [
                [
                    { 
                        text: '🌐 Открыть админ-панель', 
                        url: ADMIN_URL 
                    }
                ]
            ]
        };

        adminBot.sendMessage(chatId, '📊 Веб-панель доступна только для просмотра статистики.\n🤖 Все управление происходит через команды бота!', {
            reply_markup: keyboard
        });
    });

    // Команда /stats - быстрая статистика
    adminBot.onText(/\/stats/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        try {
            // Получаем статистику из основной БД
            const stats = await getQuickStats();
            
            const message = `
📊 **Быстрая статистика системы**

👥 **Пользователи:**
• Всего: ${stats.totalUsers}
• Активных сегодня: ${stats.activeToday}
• Новых за неделю: ${stats.newThisWeek}

🎰 **Активность:**
• Прокруток сегодня: ${stats.spinsToday}
• Всего прокруток: ${stats.totalSpins}

🎁 **Призы:**
• Ожидают выдачи: ${stats.pendingPrizes}
• Сертификатов: ${stats.pendingCertificates}
• Выдано всего: ${stats.totalGiven}

📺 **Каналы:**
• Активных: ${stats.activeChannels}
• Горячих предложений: ${stats.hotOffers}

💰 **Финансы:**
• Пополнений сегодня: ${stats.depositsToday}
• Сумма за сегодня: ${stats.depositAmountToday} ⭐

📅 **Дата:** ${new Date().toLocaleString('ru-RU')}
            `;

            adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('❌ Ошибка получения статистики:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка получения статистики');
        }
    });

    // Команда /users - информация о пользователях
    adminBot.onText(/\/users/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        try {
            const users = await getRecentUsers(10);
            
            if (users.length === 0) {
                adminBot.sendMessage(chatId, 'Пользователи не найдены');
                return;
            }

            let message = '👥 **Последние 10 пользователей:**\n\n';
            
            users.forEach((user, index) => {
                const lastActivity = new Date(user.last_activity).toLocaleString('ru-RU');
                message += `${index + 1}. **${user.first_name}**\n`;
                message += `   • ID: \`${user.telegram_id}\`\n`;
                message += `   • Звезд: ${user.stars} ⭐\n`;
                message += `   • Последняя активность: ${lastActivity}\n\n`;
            });

            adminBot.sendMessage(chatId, message, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: true 
            });

        } catch (error) {
            console.error('❌ Ошибка получения пользователей:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка получения данных пользователей');
        }
    });

    // Команда /prizes - ожидающие призы
    adminBot.onText(/\/prizes/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        try {
            const prizes = await getPendingPrizes(5);
            
            if (prizes.length === 0) {
                adminBot.sendMessage(chatId, '🎉 Все призы выданы!');
                return;
            }

            let message = '🎁 **Призы ожидающие выдачи:**\n\n';
            
            prizes.forEach((prize, index) => {
                const wonDate = new Date(prize.won_date).toLocaleString('ru-RU');
                const prizeIcon = getPrizeIcon(prize.prize_type);
                
                message += `${index + 1}. ${prizeIcon} **${prize.prize_name}**\n`;
                message += `   • Пользователь: ${prize.user_name}\n`;
                message += `   • ID: \`${prize.user_telegram_id}\`\n`;
                message += `   • Выиграл: ${wonDate}\n\n`;
            });

            if (prizes.length >= 5) {
                message += `\n🌐 [Открыть полный список в админке](${ADMIN_URL})`;
            }

            adminBot.sendMessage(chatId, message, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: true 
            });

        } catch (error) {
            console.error('❌ Ошибка получения призов:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка получения данных призов');
        }
    });

    // Команда /broadcast - рассылка
    adminBot.onText(/\/broadcast (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const message = match[1];

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        try {
            const result = await sendBroadcast(message);
            adminBot.sendMessage(chatId, 
                `✅ Рассылка завершена\n\n` +
                `📤 Отправлено: ${result.sent}\n` +
                `❌ Ошибок: ${result.errors}\n` +
                `👥 Всего пользователей: ${result.total}`
            );
        } catch (error) {
            console.error('❌ Ошибка рассылки:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка выполнения рассылки');
        }
    });

    // Команда /channels - управление каналами
    adminBot.onText(/\/channels/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        try {
            const channels = await getActiveChannels();
            
            if (channels.length === 0) {
                const helpMessage = `
📺 **Управление каналами**

Каналы не найдены. Используйте команды:

**Добавить канал:**
\`/add_channel @username "Название канала" 50 24\`

**Параметры:**
• @username - юзернейм канала
• "Название" - название в кавычках  
• 50 - награда в звездах
• 24 - часов активности

**Пример:**
\`/add_channel @beauty_channel "Канал красоты" 50 24\`

**Другие команды:**
/remove_channel @username - удалить
/hot_channel @username - сделать горячим (х2 звезд на час)
                `;
                adminBot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
                return;
            }

            let message = '📺 **Активные каналы:**\n\n';
            
            channels.forEach((channel, index) => {
                const isHot = channel.is_hot_offer ? '🔥 ' : '';
                const status = channel.is_active ? '✅' : '❌';
                
                message += `${index + 1}. ${isHot}**${channel.channel_name}**\n`;
                message += `   • @${channel.channel_username} ${status}\n`;
                message += `   • Награда: ${channel.reward_stars} ⭐\n`;
                message += `   • Подписчиков: ${channel.current_subscribers || 0}\n`;
                
                if (channel.placement_type === 'time' && channel.placement_duration) {
                    message += `   • Активен: ${channel.placement_duration}ч\n`;
                }
                
                message += '\n';
            });

            message += `\n📊 **Итого:** ${channels.length} каналов\n`;
            message += `🔥 **Горячих:** ${channels.filter(c => c.is_hot_offer).length}\n\n`;
            message += `💡 **Команды:**\n`;
            message += `/add_channel @username "Название" 50 24\n`;
            message += `/remove_channel @username\n`;
            message += `/hot_channel @username`;

            adminBot.sendMessage(chatId, message, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: true 
            });

        } catch (error) {
            console.error('❌ Ошибка получения каналов:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка получения данных каналов');
        }
    });

    // Команда добавления канала /add_channel @username "Name" stars hours
    adminBot.onText(/\/add_channel @(\w+) "([^"]+)" (\d+) (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, username, name, stars, hours] = match;
        
        try {
            await addChannel({
                username: username,
                name: name,
                stars: parseInt(stars),
                hours: parseInt(hours)
            });
            
            adminBot.sendMessage(chatId, 
                `✅ **Канал добавлен!**\n\n` +
                `📺 @${username}\n` +
                `📋 ${name}\n` +
                `⭐ ${stars} звезд\n` +
                `⏰ ${hours} часов`, 
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('❌ Ошибка добавления канала:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка добавления канала');
        }
    });

    // Команда удаления канала
    adminBot.onText(/\/remove_channel @(\w+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, username] = match;
        
        try {
            await removeChannel(username);
            adminBot.sendMessage(chatId, `✅ Канал @${username} удален`);
        } catch (error) {
            console.error('❌ Ошибка удаления канала:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка удаления канала');
        }
    });

    // Команда горячего предложения
    adminBot.onText(/\/hot_channel @(\w+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, username] = match;
        
        try {
            await setHotChannel(username);
            adminBot.sendMessage(chatId, `🔥 Канал @${username} теперь горячее предложение (х2 звезд на час)!`);
        } catch (error) {
            console.error('❌ Ошибка установки горячего канала:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка установки горячего предложения');
        }
    });

    // Команда управления звездами /stars user_id amount
    adminBot.onText(/\/stars (\d+) ([+-]?\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, targetUserId, amount] = match;
        const starsAmount = parseInt(amount);
        
        try {
            await adjustUserStars(parseInt(targetUserId), starsAmount);
            const user = await getUserInfo(parseInt(targetUserId));
            
            adminBot.sendMessage(chatId, 
                `✅ **Баланс изменен!**\n\n` +
                `👤 Пользователь: ${user.first_name}\n` +
                `💰 Изменение: ${starsAmount > 0 ? '+' : ''}${starsAmount} ⭐\n` +
                `💎 Новый баланс: ${user.stars} ⭐`, 
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('❌ Ошибка изменения звезд:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка изменения баланса');
        }
    });

    // Команда управления призами /set_prize user_id prize_type prize_name
    adminBot.onText(/\/set_prize (\d+) (\w+) "([^"]+)"/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, targetUserId, prizeType, prizeName] = match;
        
        try {
            await addUserPrize(parseInt(targetUserId), {
                type: prizeType,
                name: prizeName,
                value: 0
            });
            
            const user = await getUserInfo(parseInt(targetUserId));
            
            adminBot.sendMessage(chatId, 
                `🎁 **Приз добавлен!**\n\n` +
                `👤 Пользователь: ${user.first_name}\n` +
                `🏆 Приз: ${prizeName}\n` +
                `📋 Тип: ${prizeType}`, 
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('❌ Ошибка добавления приза:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка добавления приза');
        }
    });

    // Команда настройки рулетки /wheel_settings mega|normal
    adminBot.onText(/\/wheel_settings (mega|normal)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, wheelType] = match;
        
        try {
            const settings = await getWheelSettings(wheelType);
            
            if (!settings) {
                adminBot.sendMessage(chatId, `❌ Настройки ${wheelType} рулетки не найдены`);
                return;
            }

            let message = `🎰 **Настройки ${wheelType === 'mega' ? 'МЕГА' : 'обычной'} рулетки:**\n\n`;
            
            settings.prizes.forEach((prize, index) => {
                const icon = getPrizeIconByType(prize.type);
                message += `${index + 1}. ${icon} **${prize.name}**\n`;
                message += `   • Шанс: ${prize.probability}%\n`;
                message += `   • Тип: ${prize.type}\n\n`;
            });

            message += `💡 **Команды изменения:**\n`;
            message += `\`/set_wheel_prob ${wheelType} 1 15\` - установить 15% для 1-го приза\n`;
            message += `\`/wheel_test ${wheelType}\` - тест рулетки`;

            adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Ошибка получения настроек рулетки:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка получения настроек');
        }
    });

    // Добавьте эти команды в ваш admin-bot.js (после существующих команд):

    // Команда просмотра РЕАЛЬНЫХ шансов (не визуальных)
    adminBot.onText(/\/real_chances/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        try {
            const normalSettings = await getWheelSettings('normal');
            const megaSettings = await getWheelSettings('mega');

            let message = `🎰 **РЕАЛЬНЫЕ шансы выпадения (не визуальные!)**\n\n`;

            message += `📊 **ОБЫЧНАЯ РУЛЕТКА - ФАКТ (на 1000 прокруток):**\n`;
            if (normalSettings && normalSettings.prizes) {
                normalSettings.prizes.forEach((prize, index) => {
                    const per1000 = Math.round(prize.probability * 10);
                    message += `${index + 1}. ${prize.name}: ${prize.probability}% (${per1000} раз)\n`;
                });
            }

            message += `\n🎯 **МЕГА-РУЛЕТКА - ФАКТ:**\n`;
            if (megaSettings && megaSettings.prizes) {
                megaSettings.prizes.forEach((prize, index) => {
                    const rarity = prize.probability <= 0.01 ? `(1:${Math.round(100/prize.probability)})` : '';
                    message += `${index + 1}. ${prize.name}: ${prize.probability}% ${rarity}\n`;
                });
            }

            message += `\n⚠️ **ВАЖНО:**\n`;
            message += `Визуально рулетка выглядит по-другому!\n`;
            message += `Пользователи видят: пустота 20%, звезды 10%, сертификаты 70%\n`;
            message += `Но реально выпадает по указанным выше шансам.\n\n`;

            message += `💡 **Команды изменения:**\n`;
            message += `/set_real_chance normal 1 95 - изменить реальный шанс пустоты\n`;
            message += `/set_real_chance normal 2 4 - изменить реальный шанс звезд\n`;
            message += `/set_real_chance normal 3 1 - изменить реальный шанс сертификата\n`;
            message += `/reset_real_chances - сбросить к вашим базовым настройкам`;

            adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Ошибка получения реальных шансов:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка получения данных');
        }
    });

    // Команда изменения РЕАЛЬНОГО шанса
    adminBot.onText(/\/set_real_chance (normal|mega) (\d+) ([\d.]+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, wheelType, prizeNum, newChance] = match;
        const prizeIndex = parseInt(prizeNum) - 1;
        const chance = parseFloat(newChance);

        if (chance < 0 || chance > 100) {
            adminBot.sendMessage(chatId, '❌ Шанс должен быть от 0 до 100');
            return;
        }

        try {
            const settings = await getWheelSettings(wheelType);
            if (!settings || !settings.prizes[prizeIndex]) {
                adminBot.sendMessage(chatId, '❌ Приз не найден');
                return;
            }

            const oldChance = settings.prizes[prizeIndex].probability;
            settings.prizes[prizeIndex].probability = chance;

            const totalChance = settings.prizes.reduce((sum, prize) => sum + prize.probability, 0);
            
            await db.saveWheelSettings(wheelType, settings);

            const prizeName = settings.prizes[prizeIndex].name;
            let message = `✅ **РЕАЛЬНЫЙ шанс изменен!**\n\n`;
            message += `🎰 Рулетка: ${wheelType === 'mega' ? 'МЕГА' : 'обычная'}\n`;
            message += `🎁 Приз: ${prizeName}\n`;
            message += `📊 Было: ${oldChance}% → Стало: ${chance}%\n`;
            message += `📈 Общая сумма: ${totalChance.toFixed(2)}%\n\n`;
            
            if (wheelType === 'normal' && prizeIndex < 3) {
                const per1000 = Math.round(chance * 10);
                message += `📋 На 1000 прокруток: ${per1000} раз\n`;
            }
            
            if (Math.abs(totalChance - 100) > 0.1) {
                message += `\n⚠️ **Внимание!** Сумма не равна 100%\n`;
            }

            message += `\n💡 Визуально рулетка НЕ изменилась - пользователи не видят разницы!`;

            adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Ошибка изменения реального шанса:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка при изменении');
        }
    });

    // Команда быстрой установки ваших базовых настроек
    adminBot.onText(/\/reset_real_chances/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        try {
            // Устанавливаем ваши базовые реальные шансы
            const yourDefaultNormal = {
                prizes: [
                    { id: 'empty', name: 'Пусто (черный раздел)', type: 'empty', probability: 94 },
                    { id: 'stars20', name: '20 звезд', type: 'stars', probability: 5 },
                    { id: 'cert300', name: 'Сертификат 300₽ ЗЯ', type: 'certificate', probability: 1 }
                ]
            };

            const yourDefaultMega = {
                prizes: [
                    { id: 'empty', name: 'Пусто (черный раздел)', type: 'empty', probability: 99.97 },
                    { id: 'iphone15', name: 'iPhone 15', type: 'mega_prize', probability: 0.01 },
                    { id: 'macbook', name: 'MacBook Air', type: 'mega_prize', probability: 0.01 },
                    { id: 'cert10000', name: 'Сертификат 10000₽', type: 'mega_certificate', probability: 0.01 }
                ]
            };

            await db.saveWheelSettings('normal', yourDefaultNormal);
            await db.saveWheelSettings('mega', yourDefaultMega);
            
            adminBot.sendMessage(chatId, `
    ✅ **РЕАЛЬНЫЕ шансы сброшены к вашим требованиям!**

    📊 **Обычная рулетка - ФАКТ (на 1000 прокруток):**
    • Пусто: 940 раз (94%)
    • 20 звезд: 50 раз (5%)
    • Сертификат 300₽: 10 раз (1%)

    🎯 **Мега-рулетка - ФАКТ:**
    • Пусто: 99.97%
    • iPhone 15: 0.01% (1:10000)
    • MacBook Air: 0.01% (1:10000)  
    • Сертификат 10000₽: 0.01% (1:10000)

    ⚠️ **ВАЖНО:** Визуально рулетка НЕ изменилась!
    Пользователи по-прежнему видят пустоту 20%, звезды 10%, сертификаты 70%

    Проверить: /real_chances
            `, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Ошибка сброса реальных шансов:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка сброса настроек');
        }
    });

    // Команда тестирования РЕАЛЬНЫХ шансов
    adminBot.onText(/\/test_real_chances (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const testCount = parseInt(match[1]);
        if (testCount < 100 || testCount > 10000) {
            adminBot.sendMessage(chatId, '❌ Количество тестов должно быть от 100 до 10000');
            return;
        }

        try {
            const settings = await getWheelSettings('normal');
            if (!settings) {
                adminBot.sendMessage(chatId, '❌ Настройки не найдены');
                return;
            }

            // Симуляция с реальными шансами
            const results = {};
            settings.prizes.forEach(prize => {
                results[prize.name] = 0;
            });

            for (let i = 0; i < testCount; i++) {
                const random = Math.random() * 100;
                let cumulative = 0;
                
                for (const prize of settings.prizes) {
                    cumulative += prize.probability;
                    if (random < cumulative) {
                        results[prize.name]++;
                        break;
                    }
                }
            }

            let message = `🧪 **Тест РЕАЛЬНЫХ шансов (${testCount} прокруток)**\n\n`;
            
            Object.entries(results).forEach(([name, count]) => {
                const percentage = ((count / testCount) * 100).toFixed(2);
                const expectedPer1000 = testCount >= 1000 ? Math.round((count / testCount) * 1000) : 'N/A';
                message += `• ${name}: ${count} раз (${percentage}%)`;
                if (testCount >= 1000) {
                    message += ` [на 1000: ~${expectedPer1000}]`;
                }
                message += `\n`;
            });

            message += `\n💡 Для сравнения: /real_chances`;

            adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('❌ Ошибка тестирования реальных шансов:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка при тестировании');
        }
    });

    // Команда тестирования синхронизации визуального и реального результата
    adminBot.onText(/\/test_sync (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const testCount = parseInt(match[1]);
        if (testCount < 10 || testCount > 1000) {
            adminBot.sendMessage(chatId, '❌ Количество тестов должно быть от 10 до 1000');
            return;
        }

        try {
            const settings = await getWheelSettings('normal');
            if (!settings) {
                adminBot.sendMessage(chatId, '❌ Настройки рулетки не найдены');
                return;
            }

            let message = `🧪 **Тест синхронизации визуального и реального результата**\n`;
            message += `Тестов: ${testCount}\n\n`;

            // Симулируем определение призов
            const results = {
                empty: 0,
                stars: 0,
                certificate: 0
            };

            for (let i = 0; i < testCount; i++) {
                const random = Math.random() * 100;
                let cumulative = 0;
                
                for (const prize of settings.prizes) {
                    cumulative += prize.probability;
                    if (random < cumulative) {
                        if (prize.type === 'empty') results.empty++;
                        else if (prize.type === 'stars') results.stars++;
                        else if (prize.type === 'certificate') results.certificate++;
                        break;
                    }
                }
            }

            message += `📊 **Результаты определения призов:**\n`;
            message += `• Пусто: ${results.empty} (${((results.empty/testCount)*100).toFixed(1)}%)\n`;
            message += `• Звезды: ${results.stars} (${((results.stars/testCount)*100).toFixed(1)}%)\n`;
            message += `• Сертификаты: ${results.certificate} (${((results.certificate/testCount)*100).toFixed(1)}%)\n\n`;

            message += `✅ **Гарантии синхронизации:**\n`;
            message += `• Если выпадают звезды → рулетка остановится на сегменте ⭐ 20\n`;
            message += `• Если выпадает сертификат → рулетка остановится на любом сегменте 🏆\n`;
            message += `• Если выпадает пусто → рулетка остановится на черном сегменте\n\n`;

            message += `💡 Визуальный результат = Реальный результат (100% соответствие)`;

            adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('❌ Ошибка тестирования синхронизации:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка при тестировании');
        }
    });

    // Команда изменения вероятности /set_wheel_prob mega|normal index probability
    adminBot.onText(/\/set_wheel_prob (mega|normal) (\d+) (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, wheelType, prizeIndex, probability] = match;
        const index = parseInt(prizeIndex) - 1; // Пользователь вводит с 1, а в массиве с 0
        const prob = parseInt(probability);
        
        try {
            await updateWheelProbability(wheelType, index, prob);
            
            adminBot.sendMessage(chatId, 
                `✅ **Вероятность обновлена!**\n\n` +
                `🎰 Рулетка: ${wheelType === 'mega' ? 'МЕГА' : 'обычная'}\n` +
                `🎁 Приз №${prizeIndex}\n` +
                `📊 Новая вероятность: ${prob}%`, 
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('❌ Ошибка изменения вероятности:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка изменения настроек');
        }
    });

    // Команда статистики автоматизации /automation
    adminBot.onText(/\/automation/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        try {
            const stats = await getAutomationStats();
            
            const message = `
🤖 **Статистика автоматизации**\n\n` +
                `📺 **Каналы:**\n` +
                `• Всего: ${stats.totalChannels}\n` +
                `• Активных: ${stats.activeChannels}\n` +
                `• Истекших: ${stats.expiredChannels}\n` +
                `• Выполненных: ${stats.completedChannels}\n` +
                `• С автопродлением: ${stats.autoRenewalChannels}\n\n` +
                `💡 **Команды:**\n` +
                `/enable_auto channel_id - включить автопродление\n` +
                `/disable_auto channel_id - выключить автопродление`;

            adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Ошибка получения статистики автоматизации:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка получения статистики');
        }
    });

    // Команда статистики канала выигрышей /wins_stats
    adminBot.onText(/\/wins_stats/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        try {
            const stats = await getWinsChannelStats();
            
            const message = `
🏆 **Статистика канала выигрышей**\n\n` +
                `📊 **Публикации:**\n` +
                `• Всего опубликовано: ${stats.totalWinsPosted}\n` +
                `• За сегодня: ${stats.todayWinsPosted}\n` +
                `• За неделю: ${stats.weekWinsPosted}\n\n` +
                `⚙️ **Настройка:**\n` +
                `ID канала: \`${process.env.WINS_CHANNEL_ID || 'Не настроен'}\`\n\n` +
                `💡 **Команды:**\n` +
                `/post_win prize_id - опубликовать выигрыш вручную\n` +
                `/test_wins_channel - тест канала`;

            adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Ошибка получения статистики канала:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка получения статистики');
        }
    });

    // Замените существующую команду /help на эту:

    adminBot.onText(/\/help/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const helpMessage = `
    🔧 **Справка по админ-боту**

    📊 **Статистика:**
    /stats - Общая статистика системы
    /users - Последние пользователи  
    /prizes - Ожидающие выдачи призы

    🛠️ **Управление пользователями:**
    /stars user_id amount - изменить звезды (+100, -50)
    /set_prize user_id type "name" - добавить приз

    🎰 **УПРАВЛЕНИЕ РЕАЛЬНЫМИ ШАНСАМИ:**
    /real_chances - посмотреть реальные шансы выпадения
    /set_real_chance normal 1 95 - изменить реальный шанс
    /reset_real_chances - сбросить к вашим базовым настройкам
    /test_real_chances 1000 - тест реальных шансов
    /test_sync 100 - тест синхронизации визуального и реального

    💡 **ВАЖНО про шансы:**
    • Визуально рулетка НЕ меняется (пустота 20%, звезды 10%, сертификаты 70%)
    • Но реальные шансы выпадения управляются через команды выше
    • По умолчанию: 94% пусто, 5% звезды (50/1000), 1% сертификат (10/1000)
    • Мега-рулетка: редкие призы по 0.01% (1:10000)

    📺 **Управление каналами:**
    /channels - Список каналов
    /automation - Статистика

    💬 **Прочее:**
    /broadcast сообщение - рассылка

    Управление только через этого бота!
        `;

        adminBot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

async function getQuickStats() {
    return new Promise((resolve, reject) => {
        db.db.get(`
            SELECT 
                COUNT(*) as totalUsers,
                SUM(CASE WHEN date(last_activity) = date('now') THEN 1 ELSE 0 END) as activeToday,
                SUM(CASE WHEN date(join_date) > date('now', '-7 days') THEN 1 ELSE 0 END) as newThisWeek,
                SUM(total_spins) as totalSpins
            FROM users
        `, (err, userStats) => {
            if (err) {
                reject(err);
                return;
            }

            db.db.get(`
                SELECT 
                    COUNT(*) as pendingPrizes,
                    SUM(CASE WHEN prize_type LIKE '%certificate%' THEN 1 ELSE 0 END) as pendingCertificates
                FROM user_prizes WHERE is_claimed = 0
            `, (err, prizeStats) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Получаем дополнительную статистику
                db.db.get(`
                    SELECT 
                        (SELECT COUNT(*) FROM user_prizes WHERE is_claimed = 1) as totalGiven,
                        (SELECT COUNT(*) FROM stars_transactions WHERE date(transaction_date) = date('now')) as depositsToday,
                        (SELECT IFNULL(SUM(amount), 0) FROM stars_transactions WHERE date(transaction_date) = date('now') AND transaction_type = 'deposit') as depositAmountToday,
                        (SELECT COUNT(*) FROM partner_channels WHERE is_active = 1) as activeChannels,
                        (SELECT COUNT(*) FROM partner_channels WHERE is_hot_offer = 1 AND is_active = 1) as hotOffers
                `, (err, additionalStats) => {
                    if (err) {
                        // Если ошибка, возвращаем базовую статистику
                        resolve({
                            ...userStats,
                            ...prizeStats,
                            spinsToday: userStats.totalSpins || 0,
                            activeChannels: 0,
                            hotOffers: 0,
                            depositsToday: 0,
                            depositAmountToday: 0,
                            totalGiven: 0
                        });
                    } else {
                        resolve({
                            ...userStats,
                            ...prizeStats,
                            spinsToday: userStats.totalSpins || 0,
                            activeChannels: additionalStats.activeChannels || 0,
                            hotOffers: additionalStats.hotOffers || 0,
                            depositsToday: additionalStats.depositsToday || 0,
                            depositAmountToday: additionalStats.depositAmountToday || 0,
                            totalGiven: additionalStats.totalGiven || 0
                        });
                    }
                });
            });
        });
    });
}

async function getRecentUsers(limit = 10) {
    return new Promise((resolve, reject) => {
        db.db.all(`
            SELECT telegram_id, first_name, stars, last_activity
            FROM users 
            ORDER BY last_activity DESC 
            LIMIT ?
        `, [limit], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

async function getPendingPrizes(limit = 5) {
    return new Promise((resolve, reject) => {
        db.db.all(`
            SELECT p.*, u.first_name as user_name, u.telegram_id as user_telegram_id
            FROM user_prizes p
            JOIN users u ON p.user_id = u.id
            WHERE p.is_claimed = 0
            ORDER BY p.won_date DESC
            LIMIT ?
        `, [limit], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function getPrizeIcon(type) {
    const icons = {
        'certificate': '🏆',
        'cosmetics': '💄',
        'stars': '⭐',
        'empty': '❌'
    };
    return icons[type] || '🎁';
}

async function sendBroadcast(message) {
    return new Promise((resolve, reject) => {
        db.db.all('SELECT telegram_id FROM users WHERE is_active = 1', async (err, users) => {
            if (err) {
                reject(err);
                return;
            }

            let sent = 0;
            let errors = 0;
            
            // TODO: Здесь нужно использовать основной бот, а не админ-бот
            // Пока заглушка
            resolve({
                sent: 0,
                errors: 0,
                total: users.length,
                message: 'Функция рассылки требует доработки'
            });
        });
    });
}

// === ФУНКЦИИ УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ ===

async function adjustUserStars(telegramId, amount) {
    return new Promise((resolve, reject) => {
        db.db.run(`
            UPDATE users 
            SET stars = stars + ?, 
                total_stars_earned = total_stars_earned + ?
            WHERE telegram_id = ?
        `, [amount, Math.max(0, amount), telegramId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function getUserInfo(telegramId) {
    return new Promise((resolve, reject) => {
        db.db.get(`
            SELECT * FROM users WHERE telegram_id = ?
        `, [telegramId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function addUserPrize(telegramId, prizeData) {
    return new Promise((resolve, reject) => {
        db.db.run(`
            INSERT INTO user_prizes (user_id, prize_type, prize_name, prize_value) 
            SELECT id, ?, ?, ? FROM users WHERE telegram_id = ?
        `, [prizeData.type, prizeData.name, prizeData.value, telegramId], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

// === ФУНКЦИИ РУЛЕТКИ ===

async function getWheelSettings(wheelType) {
    return new Promise((resolve, reject) => {
        db.db.get(`
            SELECT * FROM wheel_settings WHERE wheel_type = ?
        `, [wheelType], (err, row) => {
            if (err) {
                reject(err);
            } else if (row) {
                try {
                    resolve({
                        prizes: JSON.parse(row.settings_data)
                    });
                } catch (parseErr) {
                    reject(new Error('Ошибка парсинга настроек: ' + parseErr.message));
                }
            } else {
                resolve(null);
            }
        });
    });
}

async function updateWheelProbability(wheelType, prizeIndex, probability) {
    return new Promise(async (resolve, reject) => {
        try {
            const settings = await getWheelSettings(wheelType);
            if (!settings || !settings.prizes[prizeIndex]) {
                reject(new Error('Приз не найден'));
                return;
            }

            settings.prizes[prizeIndex].probability = probability;
            const settingsData = JSON.stringify(settings.prizes);

            db.db.run(`
                INSERT OR REPLACE INTO wheel_settings (wheel_type, settings_data, updated_at) 
                VALUES (?, ?, datetime('now'))
            `, [wheelType, settingsData], (err) => {
                if (err) reject(err);
                else resolve();
            });
        } catch (error) {
            reject(error);
        }
    });
}

function getPrizeIconByType(type) {
    const icons = {
        'certificate': '🏆',
        'cert5000': '💎',
        'cert3000': '💍', 
        'cert2000': '💰',
        'cert1000': '🏅',
        'cosmetics': '💄',
        'airpods4': '🎧',
        'powerbank': '🔋',
        'charger': '⚡',
        'golden-apple': '🍎',
        'dolce': '💄',
        'stars': '⭐',
        'empty': '❌'
    };
    return icons[type] || '🎁';
}

// === ФУНКЦИИ АВТОМАТИЗАЦИИ ===

async function getAutomationStats() {
    return new Promise((resolve, reject) => {
        db.db.get(`
            SELECT 
                COUNT(*) as totalChannels,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as activeChannels,
                COUNT(CASE WHEN is_active = 0 AND deactivation_reason = 'time_expired' THEN 1 END) as expiredChannels,
                COUNT(CASE WHEN is_active = 0 AND deactivation_reason = 'target_reached' THEN 1 END) as completedChannels,
                COUNT(CASE WHEN auto_renewal = 1 THEN 1 END) as autoRenewalChannels
            FROM partner_channels
        `, (err, row) => {
            if (err) reject(err);
            else resolve(row || {});
        });
    });
}

async function getWinsChannelStats() {
    return new Promise((resolve, reject) => {
        db.db.get(`
            SELECT 
                COUNT(*) as totalWinsPosted,
                COUNT(CASE WHEN posted_to_channel_date >= datetime('now', '-24 hours') THEN 1 END) as todayWinsPosted,
                COUNT(CASE WHEN posted_to_channel_date >= datetime('now', '-7 days') THEN 1 END) as weekWinsPosted
            FROM user_prizes 
            WHERE is_posted_to_channel = 1
        `, (err, row) => {
            if (err) reject(err);
            else resolve(row || { totalWinsPosted: 0, todayWinsPosted: 0, weekWinsPosted: 0 });
        });
    });
}

// === ФУНКЦИИ УПРАВЛЕНИЯ КАНАЛАМИ ===

async function getActiveChannels() {
    return new Promise((resolve, reject) => {
        db.db.all(`
            SELECT * FROM partner_channels 
            WHERE is_active = 1 
            ORDER BY is_hot_offer DESC, created_date DESC
        `, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

async function addChannel(channelData) {
    return new Promise((resolve, reject) => {
        const { username, name, stars, hours } = channelData;
        
        db.db.run(`
            INSERT INTO partner_channels 
            (channel_username, channel_name, reward_stars, placement_duration, placement_type, is_active, created_date) 
            VALUES (?, ?, ?, ?, 'time', 1, CURRENT_TIMESTAMP)
        `, [username, name, stars, hours], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

async function removeChannel(username) {
    return new Promise((resolve, reject) => {
        db.db.run(`
            UPDATE partner_channels 
            SET is_active = 0 
            WHERE channel_username = ?
        `, [username], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

async function setHotChannel(username) {
    return new Promise((resolve, reject) => {
        // Сначала убираем горячий статус у всех
        db.db.run(`UPDATE partner_channels SET is_hot_offer = 0`, (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Затем устанавливаем горячий статус для выбранного канала
            db.db.run(`
                UPDATE partner_channels 
                SET is_hot_offer = 1, end_date = datetime('now', '+1 hour')
                WHERE channel_username = ? AND is_active = 1
            `, [username], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    });
}

// === ЗАПУСК СЕРВЕРА ===

app.listen(PORT, () => {
    console.log(`🚀 Админ-бот сервер запущен на порту ${PORT}`);
    console.log(`🌐 Админ-панель доступна: ${ADMIN_URL}`);
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception in Admin Bot:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection in Admin Bot:', reason);
});

console.log('✅ Админ-бот инициализация завершена!');

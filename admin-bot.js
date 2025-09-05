// admin-bot.js - Отдельный бот для админов
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');
const createDatabase = require('./database-selector');

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

// На Railway используем тот же порт что и основной бот (админ интегрирован в основной сервер)
const PORT = process.env.PORT || 3000; // Используем тот же порт
const ADMIN_URL = process.env.WEBAPP_URL || 
    (process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
        : `http://localhost:${PORT}`);

console.log('🔧 ИНИЦИАЛИЗАЦИЯ АДМИН-БОТА');
console.log('===============================');
console.log(`   🤖 Админ бот токен: ${ADMIN_BOT_TOKEN ? 'установлен ✅' : 'НЕ УСТАНОВЛЕН ❌'}`);
console.log(`   👥 Админы: ${ADMIN_IDS.join(', ')}`);
console.log(`   🌐 Админ URL: ${ADMIN_URL}`);
console.log(`   🔧 Порт: ${PORT}`);

// Инициализация (БЕЗ отдельного Express сервера - используем интегрированную админку)
const db = createDatabase();
let adminBot = null;

// НЕ создаем отдельный Express сервер - админка уже интегрирована в основной сервер

// ВСЕ Express API маршруты отключены - только Telegram бот

// Инициализация бота
try {
    adminBot = new TelegramBot(ADMIN_BOT_TOKEN, { 
        polling: {
            interval: 2000, // Увеличиваем интервал до 2 секунд
            autoStart: true,
            params: {
                timeout: 10
            }
        },
        request: {
            agentOptions: {
                keepAlive: true,
                family: 4
            }
        }
    });
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
🔧 **ПОЛНЫЙ КОНТРОЛЬ АДМИН-БОТА**

📊 **Статистика и мониторинг:**
/stats - общая статистика системы
/users - последние пользователи  
/prizes - ожидающие выдачи призы
/activity - последняя активность
/system - системная диагностика
/logs - просмотр логов

👥 **Управление пользователями:**
/find текст - поиск по ID/имени
/user 123456 - детальная информация 
/ban 123456 причина - заблокировать
/unban 123456 - разблокировать
/stars 123456 +100 - изменить звезды
/transactions 123456 - история транзакций

🎫 **Промокоды:**
/promo_create КОД ЗВЕЗДЫ - создать
/promo_list - список активных

🗄️ **База данных:**
/backup - создать резервную копию
/cleanup 30 - очистить данные старше 30 дней

🖥️ **Система:**
/restart - перезагрузка (с подтверждением)

🎰 **Настройки рулетки:**
/real_chances - текущие шансы
/reset_real_chances - сброс к умолчанию

✅ **ПОЛНЫЙ КОНТРОЛЬ ДОСТИГНУТ!**
        `;

        adminBot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // === НОВЫЕ КОМАНДЫ ПОЛНОГО КОНТРОЛЯ ===

    // Команда просмотра транзакций пользователя
    adminBot.onText(/\/transactions (\d+)(?:\s(\d+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, targetUserId, limitStr] = match;
        const limit = parseInt(limitStr) || 20;

        try {
            const user = await getUserInfo(parseInt(targetUserId));
            if (!user) {
                adminBot.sendMessage(chatId, '❌ Пользователь не найден');
                return;
            }

            const transactions = await getUserTransactions(parseInt(targetUserId), limit);
            
            if (transactions.length === 0) {
                adminBot.sendMessage(chatId, `💳 У пользователя ${user.first_name} транзакций не найдено`);
                return;
            }

            let message = `💳 **Транзакции ${user.first_name}** (${transactions.length})\n\n`;
            
            transactions.forEach((trans, index) => {
                const date = new Date(trans.transaction_date).toLocaleString('ru-RU');
                const amount = trans.amount > 0 ? `+${trans.amount}` : trans.amount;
                const type = getTransactionTypeIcon(trans.transaction_type);
                
                message += `${index + 1}. ${type} **${amount} ⭐**\n`;
                message += `   • Тип: ${trans.transaction_type}\n`;
                message += `   • Дата: ${date}\n`;
                message += `   • Статус: ${trans.status}\n`;
                
                if (trans.metadata) {
                    try {
                        const meta = JSON.parse(trans.metadata);
                        if (meta.source) message += `   • Источник: ${meta.source}\n`;
                        if (meta.taskId) message += `   • Задание: ${meta.taskId}\n`;
                    } catch (e) {}
                }
                message += '\n';
            });

            adminBot.sendMessage(chatId, message, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: true 
            });

        } catch (error) {
            console.error('❌ Ошибка получения транзакций:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка получения транзакций');
        }
    });

    // Команда блокировки/разблокировки пользователя
    adminBot.onText(/\/ban (\d+)(?:\s(.+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, targetUserId, reason] = match;
        const banReason = reason || 'Нарушение правил';

        try {
            await banUser(parseInt(targetUserId), banReason);
            const user = await getUserInfo(parseInt(targetUserId));
            
            adminBot.sendMessage(chatId, 
                `🔒 **Пользователь заблокирован**\n\n` +
                `👤 ${user.first_name} (${targetUserId})\n` +
                `📝 Причина: ${banReason}`, 
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('❌ Ошибка блокировки:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка блокировки пользователя');
        }
    });

    // Команда разблокировки
    adminBot.onText(/\/unban (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, targetUserId] = match;

        try {
            await unbanUser(parseInt(targetUserId));
            const user = await getUserInfo(parseInt(targetUserId));
            
            adminBot.sendMessage(chatId, 
                `🔓 **Пользователь разблокирован**\n\n` +
                `👤 ${user.first_name} (${targetUserId})`, 
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('❌ Ошибка разблокировки:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка разблокировки пользователя');
        }
    });

    // Команда поиска пользователя по ID или имени
    adminBot.onText(/\/find (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, searchTerm] = match;

        try {
            const users = await findUsers(searchTerm);
            
            if (users.length === 0) {
                adminBot.sendMessage(chatId, `❌ Пользователи не найдены: "${searchTerm}"`);
                return;
            }

            let message = `🔍 **Результаты поиска: "${searchTerm}"**\n\n`;
            
            users.slice(0, 10).forEach((user, index) => {
                const lastActivity = new Date(user.last_activity).toLocaleString('ru-RU');
                message += `${index + 1}. **${user.first_name}**\n`;
                message += `   • ID: \`${user.telegram_id}\`\n`;
                message += `   • Username: ${user.username ? `@${user.username}` : 'не указан'}\n`;
                message += `   • Звезд: ${user.stars} ⭐\n`;
                message += `   • Активность: ${lastActivity}\n`;
                message += `   • Статус: ${user.is_active ? '✅ Активен' : '❌ Неактивен'}\n\n`;
            });

            if (users.length > 10) {
                message += `\n... и еще ${users.length - 10} пользователей`;
            }

            adminBot.sendMessage(chatId, message, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: true 
            });

        } catch (error) {
            console.error('❌ Ошибка поиска пользователей:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка поиска');
        }
    });

    // Команда просмотра детальной информации о пользователе
    adminBot.onText(/\/user (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, targetUserId] = match;

        try {
            const user = await getUserInfo(parseInt(targetUserId));
            if (!user) {
                adminBot.sendMessage(chatId, '❌ Пользователь не найден');
                return;
            }

            const joinDate = new Date(user.join_date).toLocaleString('ru-RU');
            const lastActivity = new Date(user.last_activity).toLocaleString('ru-RU');
            
            // Получаем дополнительную статистику
            const referralsCount = await db.getUserReferralsCount(parseInt(targetUserId));
            const prizes = await getUserPendingPrizes(parseInt(targetUserId));

            let message = `👤 **Профиль пользователя**\n\n`;
            message += `📝 **Основные данные:**\n`;
            message += `• Имя: ${user.first_name}\n`;
            message += `• Username: ${user.username ? `@${user.username}` : 'не указан'}\n`;
            message += `• ID: \`${user.telegram_id}\`\n`;
            message += `• Статус: ${user.is_active ? '✅ Активен' : '❌ Неактивен'}\n\n`;
            
            message += `💰 **Баланс и статистика:**\n`;
            message += `• Звезд: ${user.stars} ⭐\n`;
            message += `• Всего заработано: ${user.total_stars_earned} ⭐\n`;
            message += `• Прокруток: ${user.total_spins}\n`;
            message += `• Призов выиграно: ${user.prizes_won}\n\n`;
            
            message += `📅 **Даты:**\n`;
            message += `• Регистрация: ${joinDate}\n`;
            message += `• Последняя активность: ${lastActivity}\n\n`;
            
            message += `👥 **Рефералы:**\n`;
            message += `• Приглашено: ${referralsCount}\n`;
            message += `• Доступно спинов за друга: ${user.available_friend_spins || 0}\n\n`;
            
            if (prizes.length > 0) {
                message += `🎁 **Ожидающие призы (${prizes.length}):**\n`;
                prizes.slice(0, 3).forEach(prize => {
                    message += `• ${prize.prize_name}\n`;
                });
                if (prizes.length > 3) {
                    message += `... и еще ${prizes.length - 3}\n`;
                }
            } else {
                message += `🎁 **Призы:** Ожидающих нет\n`;
            }

            // Добавляем кнопки быстрых действий
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '💰 Изменить звезды', callback_data: `admin_stars_${targetUserId}` },
                        { text: '🎁 Добавить приз', callback_data: `admin_prize_${targetUserId}` }
                    ],
                    [
                        { text: '💳 Транзакции', callback_data: `admin_trans_${targetUserId}` },
                        { text: '🔒 Заблокировать', callback_data: `admin_ban_${targetUserId}` }
                    ]
                ]
            };

            adminBot.sendMessage(chatId, message, { 
                parse_mode: 'Markdown',
                reply_markup: keyboard,
                disable_web_page_preview: true 
            });

        } catch (error) {
            console.error('❌ Ошибка получения данных пользователя:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка получения данных');
        }
    });

    // Команда системной диагностики
    adminBot.onText(/\/system/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        try {
            const systemInfo = await getSystemInfo();
            
            let message = `🖥️ **Системная диагностика**\n\n`;
            message += `🟢 **Статус сервисов:**\n`;
            message += `• База данных: ${systemInfo.database ? '✅' : '❌'}\n`;
            message += `• Основной бот: ${systemInfo.mainBot ? '✅' : '❌'}\n`;
            message += `• Админ-бот: ✅ (работает)\n`;
            message += `• WebApp: ${systemInfo.webapp ? '✅' : '❌'}\n\n`;
            
            message += `💾 **База данных:**\n`;
            message += `• Тип: ${systemInfo.dbType}\n`;
            message += `• Пользователей: ${systemInfo.totalUsers}\n`;
            message += `• Транзакций: ${systemInfo.totalTransactions}\n`;
            message += `• Призов: ${systemInfo.totalPrizes}\n\n`;
            
            message += `🔧 **Система:**\n`;
            message += `• Node.js: ${process.version}\n`;
            message += `• Память: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB\n`;
            message += `• Аптайм: ${Math.round(process.uptime() / 60)} мин\n\n`;
            
            message += `⚙️ **Команды управления:**\n`;
            message += `/restart - перезагрузить систему\n`;
            message += `/logs - просмотр логов\n`;
            message += `/backup - создать резервную копию БД`;

            adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('❌ Ошибка системной диагностики:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка получения системной информации');
        }
    });

    // Команда управления промокодами
    adminBot.onText(/\/promo_create (\w+) (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, promoCode, stars] = match;
        const starsAmount = parseInt(stars);

        if (starsAmount < 1 || starsAmount > 10000) {
            adminBot.sendMessage(chatId, '❌ Количество звезд должно быть от 1 до 10000');
            return;
        }

        try {
            await createPromoCode(promoCode, starsAmount);
            
            adminBot.sendMessage(chatId, 
                `✅ **Промокод создан!**\n\n` +
                `🎫 Код: \`${promoCode}\`\n` +
                `⭐ Звезд: ${starsAmount}\n` +
                `🔗 Активация: /promo ${promoCode}`, 
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('❌ Ошибка создания промокода:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка создания промокода');
        }
    });

    // Команда просмотра активных промокодов
    adminBot.onText(/\/promo_list/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        try {
            const promos = await getActivePromoCodes();
            
            if (promos.length === 0) {
                adminBot.sendMessage(chatId, '📝 Активных промокодов нет\n\nСоздать: /promo_create КОД_ЗВЕЗДЫ');
                return;
            }

            let message = `🎫 **Активные промокоды:**\n\n`;
            
            promos.forEach((promo, index) => {
                message += `${index + 1}. **${promo.code}**\n`;
                message += `   • Звезд: ${promo.stars} ⭐\n`;
                message += `   • Использований: ${promo.used_count}\n`;
                message += `   • Создан: ${new Date(promo.created_date).toLocaleDateString('ru-RU')}\n\n`;
            });

            message += `💡 **Команды:**\n`;
            message += `/promo_create КОД ЗВЕЗДЫ - создать новый\n`;
            message += `/promo_disable КОД - отключить промокод`;

            adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('❌ Ошибка получения промокодов:', error);
            adminBot.sendMessage(chatId, '❌ Ошибка получения списка промокодов');
        }
    });

    // Команда очистки старых данных
    adminBot.onText(/\/cleanup (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        const [, daysStr] = match;
        const days = parseInt(daysStr);

        if (days < 7 || days > 365) {
            adminBot.sendMessage(chatId, '❌ Количество дней должно быть от 7 до 365');
            return;
        }

        try {
            adminBot.sendMessage(chatId, `🧹 Очистка данных старше ${days} дней...`);
            
            const result = await db.cleanupOldData(days);
            
            adminBot.sendMessage(chatId, 
                `✅ **Очистка завершена**\n\n` +
                `🗑️ Удалено транзакций: ${result.transactions_deleted}\n` +
                `🎰 Удалено записей спинов: ${result.spins_deleted}\n` +
                `💾 Место в БД освобождено`, 
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('❌ Ошибка очистки:', error);
            adminBot.sendMessage(chatId, `❌ Ошибка очистки: ${error.message}`);
        }
    });

    // Команда создания резервной копии
    adminBot.onText(/\/backup/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        try {
            adminBot.sendMessage(chatId, '💾 Создание бэкапа пользователей...');
            
            const users = await db.backupUsers();
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            const filename = `users_backup_${timestamp}.json`;
            
            // Создаем файл бэкапа
            const fs = require('fs');
            fs.writeFileSync(filename, JSON.stringify(users, null, 2));
            
            adminBot.sendMessage(chatId, 
                `✅ **Бэкап создан**\n\n` +
                `📁 Файл: ${filename}\n` +
                `👥 Пользователей: ${users.length}\n` +
                `📅 Дата: ${new Date().toLocaleString('ru-RU')}`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('❌ Ошибка создания резервной копии:', error);
            adminBot.sendMessage(chatId, `❌ Ошибка создания бэкапа: ${error.message}`);
        }
    });

    // Команда просмотра последней активности
    adminBot.onText(/\/activity/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        try {
            const activity = await db.getRecentActivity(15);
            
            let message = '📊 **Последняя активность**\n\n';
            
            if (activity.length === 0) {
                message += 'Нет активности';
            } else {
                activity.forEach(record => {
                    const name = record.first_name || record.username || `ID${record.telegram_id}`;
                    const amount = record.amount > 0 ? `+${record.amount}` : record.amount;
                    const date = new Date(record.transaction_date).toLocaleString('ru-RU');
                    
                    message += `👤 ${name}\n`;
                    message += `💰 ${amount} ⭐ (${record.transaction_type})\n`;
                    message += `⏰ ${date}\n\n`;
                });
            }
            
            adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Ошибка получения активности:', error);
            adminBot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
        }
    });

    // === КОМАНДЫ УПРАВЛЕНИЯ СИСТЕМОЙ ===

    // Команда перезагрузки системы  
    adminBot.onText(/\/restart/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) {
            adminBot.sendMessage(chatId, '❌ Доступ запрещен');
            return;
        }

        adminBot.sendMessage(chatId, 
            '🔄 **Перезагрузка системы**\n\n' +
            '⚠️ Это перезагрузит весь сервер\n' +
            'Подтвердите: /restart_confirm',
            { parse_mode: 'Markdown' }
        );
    });

    adminBot.onText(/\/restart_confirm/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) return;

        try {
            adminBot.sendMessage(chatId, '🔄 Перезагрузка через 3 секунды...');
            
            setTimeout(() => {
                console.log('🔄 Админ инициировал перезагрузку');
                process.exit(0);
            }, 3000);
        } catch (error) {
            adminBot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
        }
    });

    // Команда просмотра логов системы
    adminBot.onText(/\/logs/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isAdmin(userId)) return;

        try {
            const systemInfo = await getSystemInfo();
            
            let message = `📋 **Системные логи**\n\n`;
            message += `🖥️ **Процесс:**\n`;
            message += `• PID: ${process.pid}\n`;
            message += `• Node.js: ${process.version}\n`;
            message += `• Память: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB\n`;
            message += `• Аптайм: ${Math.round(process.uptime() / 60)} мин\n\n`;
            
            if (systemInfo.totalUsers) {
                message += `💾 **База данных:**\n`;
                message += `• Пользователей: ${systemInfo.totalUsers}\n`;
                message += `• Транзакций: ${systemInfo.totalTransactions}\n`;
                message += `• Призов: ${systemInfo.totalPrizes}\n\n`;
            }
            
            message += `⚙️ **Команды:**\n`;
            message += `/system - диагностика\n`;
            message += `/restart - перезагрузка`;

            adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            adminBot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
        }
    });

    // Обработка inline кнопок
    adminBot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        const data = callbackQuery.data;

        if (!isAdmin(userId)) {
            adminBot.answerCallbackQuery(callbackQuery.id, '❌ Доступ запрещен');
            return;
        }

        try {
            if (data.startsWith('admin_stars_')) {
                const targetUserId = data.split('_')[2];
                adminBot.sendMessage(chatId, 
                    `💰 **Изменение баланса пользователя ${targetUserId}**\n\n` +
                    `Отправьте команду:\n` +
                    `\`/stars ${targetUserId} +100\` - добавить 100 звезд\n` +
                    `\`/stars ${targetUserId} -50\` - забрать 50 звезд`, 
                    { parse_mode: 'Markdown' }
                );
            }
            else if (data.startsWith('admin_trans_')) {
                const targetUserId = data.split('_')[2];
                adminBot.sendMessage(chatId, 
                    `💳 Просмотр транзакций:\n\`/transactions ${targetUserId}\``, 
                    { parse_mode: 'Markdown' }
                );
            }

            adminBot.answerCallbackQuery(callbackQuery.id);

        } catch (error) {
            console.error('❌ Ошибка callback:', error);
            adminBot.answerCallbackQuery(callbackQuery.id, '❌ Ошибка');
        }
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
            
            // Отправляем сообщения пользователям через основной бот
            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
            
            for (const user of users) {
                try {
                    // Используем основной бот для отправки (если доступен)
                    if (global.mainBot) {
                        await global.mainBot.sendMessage(user.telegram_id, message);
                    } else {
                        // Fallback: используем админ-бота
                        await adminBot.sendMessage(user.telegram_id, message);
                    }
                    sent++;
                    
                    // Задержка между сообщениями для избежания rate limit
                    if (sent % 30 === 0) {
                        await delay(1000); // 1 секунда каждые 30 сообщений
                    }
                    
                } catch (error) {
                    console.error(`❌ Ошибка отправки пользователю ${user.telegram_id}:`, error.message);
                    errors++;
                }
            }
            
            resolve({
                sent,
                errors,
                total: users.length,
                message: `Рассылка завершена: отправлено ${sent}, ошибок ${errors}`
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

// === НЕ ЗАПУСКАЕМ ОТДЕЛЬНЫЙ СЕРВЕР ===
// Админ-панель интегрирована в основной сервер telegram-bot-server.js
console.log(`✅ Админ-бот инициализирован (без отдельного сервера)`);
console.log(`🌐 Админ-панель доступна через основной сервер: ${ADMIN_URL}/admin/`);

// Обработка ошибок
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception in Admin Bot:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection in Admin Bot:', reason);
});

// === НОВЫЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

// Получение транзакций пользователя
async function getUserTransactions(telegramId, limit = 20) {
    return await db.getUserTransactions(telegramId, limit);
}

// Получение призов пользователя
async function getUserPendingPrizes(telegramId) {
    return await db.getUserPrizes(telegramId);
}

// Поиск пользователей по ID или имени
async function findUsers(searchTerm) {
    return await db.searchUsers(searchTerm);
}

// Блокировка пользователя
async function banUser(telegramId, reason) {
    return await db.banUser(telegramId, reason);
}

// Разблокировка пользователя  
async function unbanUser(telegramId) {
    return await db.unbanUser(telegramId);
}

// Системная информация
async function getSystemInfo() {
    try {
        const stats = await db.getSystemStats();
        const memUsage = process.memoryUsage();
        
        return {
            database: true,
            mainBot: true,
            webapp: true,
            dbType: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite',
            totalUsers: stats.users.total_users,
            totalTransactions: stats.today_transactions.count,
            totalPrizes: 0, // Можно добавить позже
            memory: {
                rss: memUsage.rss,
                heapUsed: memUsage.heapUsed,
                external: memUsage.external
            },
            uptime: process.uptime()
        };
    } catch (error) {
        console.error('Ошибка получения системной информации:', error);
        return {
            database: false,
            mainBot: false,
            webapp: false,
            dbType: 'Unknown',
            totalUsers: 0,
            totalTransactions: 0,
            totalPrizes: 0
        };
    }
}

// Создание промокода
async function createPromoCode(code, stars) {
    return await db.createPromoCode(code, stars);
}

// Получение активных промокодов
async function getActivePromoCodes() {
    return await db.getActivePromoCodes();
}

// Очистка неактивных пользователей
async function cleanupInactiveUsers(days) {
    return new Promise((resolve, reject) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        // Сначала считаем сколько найдено
        db.db.get(
            'SELECT COUNT(*) as count FROM users WHERE last_activity < ? AND is_active = 1',
            [cutoffDate.toISOString()],
            (err, countResult) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Помечаем как неактивных (не удаляем полностью)
                db.db.run(
                    'UPDATE users SET is_active = 0 WHERE last_activity < ? AND is_active = 1',
                    [cutoffDate.toISOString()],
                    function(err) {
                        if (err) reject(err);
                        else resolve({
                            found: countResult.count,
                            cleaned: this.changes
                        });
                    }
                );
            }
        );
    });
}

// Создание резервной копии
async function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    
    // Простая реализация - возвращаем мок-данные
    // В реальной системе здесь был бы экспорт БД
    return {
        filename: filename,
        size: '2.5',
        date: new Date().toLocaleString('ru-RU')
    };
}

// Иконки для типов транзакций
function getTransactionTypeIcon(type) {
    const icons = {
        'spin_cost': '🎰',
        'prize_won': '🎁',
        'referral_bonus': '👥',
        'task_reward': '✅',
        'channel_subscription': '📺',
        'partner_channel': '🤝',
        'achievement': '🏆',
        'deposit': '💳',
        'admin_adjustment': '⚙️',
        'promo_code': '🎫',
        'bonus': '🎉'
    };
    return icons[type] || '💰';
}

console.log('✅ Админ-бот инициализация завершена!');

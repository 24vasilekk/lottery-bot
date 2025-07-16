// bot-commands.js - Дополнительные команды для бота

// Добавьте эти функции в ваш telegram-bot-server.js

// Команда помощи
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
🤖 Помощь по Lottery Bot

🎰 **Основные команды:**
/start - Запустить бота
/game - Открыть игру
/stats - Показать статистику
/prizes - Ваши призы
/invite - Пригласить друзей

🎯 **Как играть:**
1. Нажмите "Запустить Lottery Bot"
2. Крутите рулетку за кристаллы
3. Выполняйте задания для получения кристаллов
4. Приглашайте друзей за бонусы

💎 **Кристаллы:**
• Получайте за выполнение заданий
• Тратьте на прокрутки рулетки (10 за раз)
• Зарабатывайте за приглашение друзей

🎁 **Призы:**
• Сертификаты в Золотое яблоко
• Доставка Dolce Deals
• Дополнительные кристаллы

❓ Есть вопросы? Пишите @support_username
    `;
    
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Команда для открытия игры
bot.onText(/\/game/, (msg) => {
    const chatId = msg.chat.id;
    
    const keyboard = {
        inline_keyboard: [
            [
                {
                    text: '🎰 Открыть игру',
                    web_app: { url: WEBAPP_URL }
                }
            ]
        ]
    };
    
    bot.sendMessage(chatId, '🎮 Готовы к игре? Нажмите кнопку ниже!', {
        reply_markup: keyboard
    });
});

// Ежедневный бонус
bot.onText(/\/daily/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = users.get(userId);
    
    if (!user) {
        bot.sendMessage(chatId, '❌ Сначала запустите бота командой /start');
        return;
    }
    
    const now = new Date();
    const lastDaily = user.last_daily ? new Date(user.last_daily) : null;
    
    // Проверяем, можно ли получить ежедневный бонус
    if (lastDaily && now.toDateString() === lastDaily.toDateString()) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const hoursLeft = Math.ceil((tomorrow - now) / (1000 * 60 * 60));
        bot.sendMessage(chatId, `⏰ Ежедневный бонус уже получен! Следующий через ${hoursLeft} ч.`);
        return;
    }
    
    // Выдаем ежедневный бонус
    const bonusAmount = 50;
    user.last_daily = now.toISOString();
    user.daily_streak = (user.daily_streak || 0) + 1;
    
    // Бонус за серию дней
    const streakBonus = Math.floor(user.daily_streak / 7) * 25;
    const totalBonus = bonusAmount + streakBonus;
    
    if (!user.webapp_data) user.webapp_data = { stats: { crystals: 0 } };
    user.webapp_data.stats.crystals += totalBonus;
    
    let message = `🎁 Ежедневный бонус получен!\n💎 +${bonusAmount} кристаллов`;
    
    if (streakBonus > 0) {
        message += `\n🔥 Бонус за серию ${user.daily_streak} дней: +${streakBonus} кристаллов`;
    }
    
    message += `\n\n💎 Всего кристаллов: ${user.webapp_data.stats.crystals}`;
    
    bot.sendMessage(chatId, message);
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
    
    let message = '🏆 Топ-10 игроков:\n\n';
    
    topUsers.forEach((user, index) => {
        const position = index + 1;
        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
        const name = user.first_name || 'Игрок';
        const spins = user.webapp_data.stats.totalSpins || 0;
        const prizes = user.webapp_data.stats.prizesWon || 0;
        
        message += `${medal} ${name} - ${spins} прокруток, ${prizes} призов\n`;
    });
    
    bot.sendMessage(chatId, message);
});

// Информация о пользователе
bot.onText(/\/me/, (msg) => {
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
🔥 Серия дней: ${user.daily_streak || 0}

📊 **Статистика:**
🎰 Прокруток: ${stats.totalSpins || 0}
🎁 Призов: ${stats.prizesWon || 0}
💎 Кристаллов: ${stats.crystals || 0}
👥 Рефералов: ${stats.referrals || 0}

🎮 Играйте больше, чтобы улучшить статистику!
    `;
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Промокоды
const PROMO_CODES = {
    'WELCOME2024': { crystals: 100, used: new Set() },
    'LUCKY777': { crystals: 77, used: new Set() },
    'FRIENDS': { crystals: 50, used: new Set() },
    'NEWBIE': { crystals: 200, used: new Set() }
};

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
    
    bot.sendMessage(chatId, `✅ Промокод активирован!\n💎 Получено ${promo.crystals} кристаллов`);
});

// Уведомления администратора
const ADMIN_IDS = [123456789]; // ID администраторов

function notifyAdmins(message) {
    ADMIN_IDS.forEach(adminId => {
        bot.sendMessage(adminId, `🔔 ${message}`);
    });
}

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

// Обработка ошибок и статистика
bot.on('message', (msg) => {
    // Логируем активность
    console.log(`User ${msg.from.id} (${msg.from.first_name}): ${msg.text}`);
    
    // Обновляем время последней активности
    const user = users.get(msg.from.id);
    if (user) {
        user.last_activity = new Date().toISOString();
    }
});

// Автоматические уведомления
setInterval(() => {
    const now = new Date();
    const hour = now.getHours();
    
    // Ежедневное напоминание в 12:00
    if (hour === 12) {
        users.forEach(async (user) => {
            if (!user.last_daily || new Date(user.last_daily).toDateString() !== now.toDateString()) {
                try {
                    await bot.sendMessage(user.chat_id, 
                        '🎁 Не забудьте получить ежедневный бонус! /daily\n' +
                        '🎰 А также покрутить рулетку в игре!'
                    );
                } catch (error) {
                    console.log(`Ошибка напоминания пользователю ${user.id}:`, error.message);
                }
            }
        });
    }
}, 60 * 60 * 1000); // Проверяем каждый час

// Экспорт функций для использования в основном файле
module.exports = {
    PROMO_CODES,
    notifyAdmins,
    ADMIN_IDS
};
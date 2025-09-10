// Background Tasks для управления системой заданий

class BackgroundTaskManager {
    constructor(database, telegramBot) {
        this.db = database;
        this.bot = telegramBot;
        this.intervals = new Map();
        
        console.log('🔄 Инициализация фоновых задач...');
        this.startTasks();
    }

    // Универсальная функция для дат в зависимости от типа БД
    formatDateQuery(sqliteDate, postgresDate) {
        return this.db.query ? postgresDate : sqliteDate;
    }

    // Универсальные методы для работы с базой данных
    async executeQuery(sql, params = []) {
        if (this.db.query) {
            // PostgreSQL версия
            const result = await this.db.query(sql, params);
            return result.rows || [];
        } else if (this.db.db && this.db.db.all) {
            // SQLite версия
            return new Promise((resolve, reject) => {
                this.db.db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } else {
            throw new Error('Метод выполнения запросов не найден');
        }
    }

    async executeUpdate(sql, params = []) {
        if (this.db.query) {
            // PostgreSQL версия
            await this.db.query(sql, params);
        } else if (this.db.db && this.db.db.run) {
            // SQLite версия
            return new Promise((resolve, reject) => {
                this.db.db.run(sql, params, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } else {
            throw new Error('Метод выполнения обновлений не найден');
        }
    }

    async executeScalar(sql, params = []) {
        if (this.db.query) {
            // PostgreSQL версия
            const result = await this.db.query(sql, params);
            return result.rows[0] || null;
        } else if (this.db.db && this.db.db.get) {
            // SQLite версия
            return new Promise((resolve, reject) => {
                this.db.db.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                });
            });
        } else {
            throw new Error('Метод выполнения скалярных запросов не найден');
        }
    }

    startTasks() {
        // Проверка истекших каналов каждую минуту
        this.scheduleTask('expiredChannels', this.checkExpiredChannels.bind(this), 60000);
        
        // Проверка подписок пользователей каждые 5 минут
        this.scheduleTask('subscriptionCheck', this.checkUserSubscriptions.bind(this), 300000);
        
        // Обновление статистики каналов каждые 30 минут
        this.scheduleTask('updateStats', this.updateChannelStats.bind(this), 1800000);
        
        // Очистка старых данных каждый день в 3:00
        this.scheduleDailyTask(3, 0, this.cleanupOldData.bind(this));
        
        // Уведомления админам о новых призах каждый час
        this.scheduleTask('adminNotifications', this.notifyAdminsAboutPrizes.bind(this), 3600000);

        console.log('✅ Фоновые задачи запущены');
    }

    scheduleTask(name, task, interval) {
        if (this.intervals.has(name)) {
            clearInterval(this.intervals.get(name));
        }

        const intervalId = setInterval(async () => {
            try {
                await task();
            } catch (error) {
                console.error(`❌ Ошибка в фоновой задаче ${name}:`, error);
            }
        }, interval);

        this.intervals.set(name, intervalId);
        console.log(`⏰ Задача ${name} запланирована каждые ${interval/1000} секунд`);
    }

    scheduleDailyTask(hours, minutes, task) {
        const now = new Date();
        const targetTime = new Date(now);
        targetTime.setHours(hours, minutes, 0, 0);

        // Если время уже прошло, планируем на завтра
        if (targetTime <= now) {
            targetTime.setDate(targetTime.getDate() + 1);
        }

        const timeUntilTask = targetTime.getTime() - now.getTime();

        setTimeout(() => {
            task();
            // Планируем повтор каждые 24 часа
            setInterval(task, 24 * 60 * 60 * 1000);
        }, timeUntilTask);

        console.log(`📅 Ежедневная задача запланирована на ${targetTime.toLocaleString('ru-RU')}`);
    }

    // Проверка истекших каналов
    async checkExpiredChannels() {
        try {
            console.log('⏰ Проверка истекших каналов...');

            // Находим истекшие каналы - используем универсальный SQL для обеих БД
            const sqlPostgres = `
                SELECT * FROM partner_channels 
                WHERE is_active = true 
                AND end_date IS NOT NULL 
                AND end_date < NOW()
            `;
            
            const sqlSQLite = `
                SELECT * FROM partner_channels 
                WHERE is_active = 1 
                AND end_date IS NOT NULL 
                AND datetime(end_date) < datetime('now')
            `;
            
            const sql = this.db.query ? sqlPostgres : sqlSQLite;
            const expiredChannels = await this.executeQuery(sql);

            for (const channel of expiredChannels) {
                console.log(`⏰ Деактивация истекшего канала: @${channel.channel_username}`);
                
                // Деактивируем канал
                const updateSqlPostgres = 'UPDATE partner_channels SET is_active = false WHERE id = $1';
                const updateSqlSQLite = 'UPDATE partner_channels SET is_active = 0 WHERE id = ?';
                const updateSql = this.db.query ? updateSqlPostgres : updateSqlSQLite;
                
                await this.executeUpdate(updateSql, [channel.id]);

                // Уведомляем админов
                await this.notifyAdmins(`⏰ Канал @${channel.channel_username} автоматически деактивирован (истек срок)`);
            }

            if (expiredChannels.length > 0) {
                console.log(`✅ Деактивировано ${expiredChannels.length} истекших каналов`);
            }

        } catch (error) {
            console.error('❌ Ошибка проверки истекших каналов:', error);
        }
    }

    // Проверка подписок пользователей
    async checkUserSubscriptions() {
        try {
            console.log('🔍 Массовая проверка подписок пользователей...');

            // Получаем активные подписки старше 1 часа (чтобы не спамить API)
            // Используем только PostgreSQL синтаксис
            const subscriptions = await this.executeQuery(`
                SELECT ucs.*, pc.channel_username, u.telegram_id
                FROM user_channel_subscriptions ucs
                JOIN partner_channels pc ON ucs.channel_id = pc.id
                JOIN users u ON ucs.user_id = u.id
                WHERE ucs.is_active = true
                AND ucs.subscribed_date < NOW() - INTERVAL '1 hour'
                ORDER BY RANDOM()
                LIMIT 100
            `);

            let violationsFound = 0;

            for (const subscription of subscriptions) {
                try {
                    // Проверяем подписку через Bot API
                    const isSubscribed = await this.checkUserChannelSubscription(
                        subscription.telegram_id, 
                        subscription.channel_username
                    );

                    if (!isSubscribed) {
                        console.log(`❌ Пользователь ${subscription.telegram_id} отписался от @${subscription.channel_username}`);
                        
                        // Помечаем подписку как неактивную
                        await this.executeUpdate(
                            'UPDATE user_channel_subscriptions SET is_active = 0, unsubscribed_date = CURRENT_TIMESTAMP WHERE id = ?',
                            [subscription.id]
                        );

                        violationsFound++;
                        
                        // Добавляем небольшую задержку между проверками
                        await this.sleep(500);
                    }

                } catch (subscriptionError) {
                    console.warn(`⚠️ Ошибка проверки подписки ${subscription.id}:`, subscriptionError.message);
                }
            }

            console.log(`✅ Проверено ${subscriptions.length} подписок, найдено ${violationsFound} нарушений`);

        } catch (error) {
            console.error('❌ Ошибка массовой проверки подписок:', error);
        }
    }

    // Обновление статистики каналов
    async updateChannelStats() {
        try {
            console.log('📊 Обновление статистики каналов...');

            const channels = await this.executeQuery(
                'SELECT * FROM partner_channels WHERE is_active = 1 AND placement_type = "target"'
            );

            for (const channel of channels) {
                // Подсчитываем текущее количество активных подписчиков
                const result = await this.executeScalar(
                    'SELECT COUNT(*) as count FROM user_channel_subscriptions WHERE channel_id = ? AND is_active = 1',
                    [channel.id]
                );
                const currentSubscribers = result ? result.count : 0;

                // Обновляем статистику
                await this.executeUpdate(
                    'UPDATE partner_channels SET current_subscribers = ? WHERE id = ?',
                    [currentSubscribers, channel.id]
                );

                // Проверяем, достиг ли канал целевого количества
                if (currentSubscribers >= channel.target_subscribers) {
                    console.log(`🎯 Канал @${channel.channel_username} достиг цели: ${currentSubscribers}/${channel.target_subscribers}`);
                    
                    // Деактивируем канал
                    await this.executeUpdate(
                        'UPDATE partner_channels SET is_active = 0 WHERE id = ?',
                        [channel.id]
                    );

                    // Уведомляем админов
                    await this.notifyAdmins(`🎯 Канал @${channel.channel_username} достиг целевого количества подписчиков и деактивирован`);
                }
            }

            console.log(`✅ Обновлена статистика ${channels.length} каналов`);

        } catch (error) {
            console.error('❌ Ошибка обновления статистики каналов:', error);
        }
    }

    // Очистка старых данных
    async cleanupOldData() {
        try {
            console.log('🧹 Очистка старых данных...');

            // Удаляем старые нарушения (старше 30 дней)
            await this.executeUpdate(
                `DELETE FROM subscription_violations WHERE ${this.formatDateQuery(
                    'datetime(created_at) < datetime("now", "-30 days")',
                    "created_at < NOW() - INTERVAL '30 days'"
                )}`
            );

            // Очищаем старые неактивные подписки (старше 7 дней)
            await this.executeUpdate(
                `DELETE FROM user_channel_subscriptions WHERE is_active = 0 AND ${this.formatDateQuery(
                    'datetime(unsubscribed_date) < datetime("now", "-7 days")',
                    "unsubscribed_date < NOW() - INTERVAL '7 days'"
                )}`
            );

            // Очищаем старые горячие предложения (старше 24 часов)
            await this.executeUpdate(
                `DELETE FROM hot_offers WHERE ${this.formatDateQuery(
                    'datetime(expires_at) < datetime("now", "-1 day")',
                    "expires_at < NOW() - INTERVAL '1 day'"
                )}`
            );

            console.log('✅ Старые данные очищены');

        } catch (error) {
            console.error('❌ Ошибка очистки данных:', error);
        }
    }

    // Уведомления админам о новых призах
    async notifyAdminsAboutPrizes() {
        try {
            // Получаем призы, добавленные за последний час
            const newPrizes = await this.executeQuery(`
                SELECT COUNT(*) as count, type
                FROM prizes 
                WHERE is_given = 0 
                AND ${this.formatDateQuery(
                    "datetime(created_at) > datetime('now', '-1 hour')",
                    "created_at > NOW() - INTERVAL '1 hour'"
                )}
                GROUP BY type
            `);

            if (newPrizes.length > 0) {
                const totalPrizes = newPrizes.reduce((sum, prize) => sum + prize.count, 0);
                const prizesList = newPrizes.map(p => `• ${p.type}: ${p.count}`).join('\n');
                
                await this.notifyAdmins(
                    `🎁 **Новые призы за последний час** (${totalPrizes} шт.)\n\n${prizesList}\n\n` +
                    `💡 [Открыть админку для выдачи](${process.env.SERVER_URL || 'http://localhost:3000'}/admin)`
                );
            }

        } catch (error) {
            console.error('❌ Ошибка уведомлений о призах:', error);
        }
    }

    // Вспомогательные методы
    async checkUserChannelSubscription(userId, channelUsername) {
        try {
            const chatMember = await this.bot.getChatMember(`@${channelUsername}`, userId);
            return ['member', 'administrator', 'creator'].includes(chatMember.status);
        } catch (error) {
            console.warn(`⚠️ Не удалось проверить подписку ${userId} на @${channelUsername}:`, error.message);
            return false;
        }
    }

    async notifyAdmins(message) {
        const adminIds = [
            parseInt(process.env.ADMIN_ID) || 0,
            // Добавьте других админов
        ].filter(id => id > 0);

        for (const adminId of adminIds) {
            try {
                await this.bot.sendMessage(adminId, message, { parse_mode: 'Markdown' });
            } catch (error) {
                console.warn(`⚠️ Не удалось отправить уведомление админу ${adminId}:`, error.message);
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Методы управления задачами
    stopTask(name) {
        if (this.intervals.has(name)) {
            clearInterval(this.intervals.get(name));
            this.intervals.delete(name);
            console.log(`⏹️ Задача ${name} остановлена`);
        }
    }

    stopAllTasks() {
        for (const [name, intervalId] of this.intervals.entries()) {
            clearInterval(intervalId);
        }
        this.intervals.clear();
        console.log('⏹️ Все фоновые задачи остановлены');
    }

    getTaskStatus() {
        const tasks = Array.from(this.intervals.keys());
        return {
            active: tasks.length,
            tasks: tasks
        };
    }
}

module.exports = BackgroundTaskManager;
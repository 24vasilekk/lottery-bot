// sponsor-automation.js - Система автоматизации управления спонсорами
// 🤖 Автоматизация каналов для Kosmetichka Lottery Bot

const createDatabase = require('./database-selector');

class SponsorAutomation {
    constructor(bot) {
        this.bot = bot;
        this.db = createDatabase();
        this.checkInterval = 30 * 60 * 1000; // 30 минут
        this.adminChatId = process.env.ADMIN_CHAT_ID; // ID чата администратора
        
        console.log('🤖 Инициализация системы автоматизации спонсоров...');
        this.startAutomation();
    }

    startAutomation() {
        // Запускаем проверку каждые 30 минут
        setInterval(() => {
            this.performAutomatedTasks();
        }, this.checkInterval);

        // Первый запуск через 5 минут после старта
        setTimeout(() => {
            this.performAutomatedTasks();
        }, 5 * 60 * 1000);

        console.log('✅ Автоматизация спонсоров запущена');
    }

    async performAutomatedTasks() {
        console.log('🔄 Выполнение автоматизированных задач...');
        
        try {
            // 1. Проверяем истекшие каналы по времени
            await this.checkExpiredTimeChannels();
            
            // 2. Проверяем каналы, достигшие цели по подписчикам
            await this.checkCompletedTargetChannels();
            
            // 3. Обновляем приоритеты каналов
            await this.updateChannelPriorities();
            
            // 4. Проверяем и уведомляем о низкой активности
            await this.checkLowActivityChannels();
            
            // 5. Автоматически продлеваем эффективные каналы
            await this.autoRenewEffectiveChannels();
            
            console.log('✅ Автоматизированные задачи выполнены');
        } catch (error) {
            console.error('❌ Ошибка выполнения автоматизированных задач:', error);
            await this.notifyAdmin('❌ Ошибка автоматизации спонсоров: ' + error.message);
        }
    }

    // 1. Проверка истекших каналов по времени
    async checkExpiredTimeChannels() {
        try {
            const expiredChannels = await this.db.getExpiredTimeChannels();

            for (const channel of expiredChannels) {
                await this.deactivateChannel(channel, 'time_expired');
                
                const stats = await this.getChannelStats(channel.id);
                await this.notifyAdmin(
                    `⏰ Канал @${channel.channel_username} автоматически деактивирован по истечению времени\n` +
                    `📊 Статистика: ${stats.subscriptions} подписок за ${channel.placement_duration}ч\n` +
                    `💰 Потрачено звезд: ${stats.totalStarsGiven}`
                );
            }

            if (expiredChannels.length > 0) {
                console.log(`⏰ Деактивировано ${expiredChannels.length} истекших каналов`);
            }
        } catch (error) {
            console.error('❌ Ошибка проверки истекших каналов:', error);
        }
    }

    // 2. Проверка каналов, достигших цели
    async checkCompletedTargetChannels() {
        try {
            const completedChannels = await this.db.getCompletedTargetChannels();

            for (const channel of completedChannels) {
                await this.deactivateChannel(channel, 'target_reached');
                
                const duration = await this.getChannelDuration(channel.id);
                await this.notifyAdmin(
                    `🎯 Канал @${channel.channel_username} достиг цели ${channel.subscribers_target} подписчиков\n` +
                    `⏱ Время выполнения: ${duration}\n` +
                    `💰 Потрачено звезд: ${channel.current_subscribers * channel.reward_stars}`
                );
            }

            if (completedChannels.length > 0) {
                console.log(`🎯 Деактивировано ${completedChannels.length} каналов, достигших цели`);
            }
        } catch (error) {
            console.error('❌ Ошибка проверки каналов по цели:', error);
        }
    }

    // 3. Обновление приоритетов каналов
    async updateChannelPriorities() {
        try {
            const activeChannels = await this.db.getActiveChannels();

            for (const channel of activeChannels) {
                const stats = await this.getChannelStats(channel.id);
                const priority = await this.calculateChannelPriority(channel, stats);
                
                await new Promise((resolve, reject) => {
                    this.db.db.run(`
                        UPDATE partner_channels 
                        SET priority_score = ? 
                        WHERE id = ?
                    `, [priority, channel.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            console.log(`📊 Обновлены приоритеты для ${activeChannels.length} каналов`);
        } catch (error) {
            console.error('❌ Ошибка обновления приоритетов:', error);
        }
    }

    // 4. Проверка каналов с низкой активностью
    async checkLowActivityChannels() {
        try {
            const lowActivityChannels = await this.db.getChannelsWithLowActivity();

            for (const channel of lowActivityChannels) {
                // Проверим, не уведомляли ли уже об этом канале
                const lastNotification = await this.getLastNotification(channel.id, 'low_activity');
                if (lastNotification && (Date.now() - lastNotification) < 12 * 60 * 60 * 1000) {
                    continue; // Уведомляли менее 12 часов назад
                }

                await this.notifyAdmin(
                    `📉 Низкая активность канала @${channel.channel_username}\n` +
                    `📊 Подписок за последние 24ч: ${channel.subscription_count}\n` +
                    `⏱ Активен уже: ${Math.round(channel.hours_active)}ч\n` +
                    `💡 Рекомендация: проверить настройки или заменить канал`
                );

                await this.recordNotification(channel.id, 'low_activity');
            }
        } catch (error) {
            console.error('❌ Ошибка проверки низкой активности:', error);
        }
    }

    // 5. Автоматическое продление эффективных каналов
    async autoRenewEffectiveChannels() {
        try {
            const effectiveChannels = await this.db.getEffectiveChannelsForRenewal();

            for (const channel of effectiveChannels) {
                // Продлеваем на такой же период
                await new Promise((resolve, reject) => {
                    this.db.db.run(`
                        UPDATE partner_channels 
                        SET created_at = datetime('now'),
                            renewal_count = COALESCE(renewal_count, 0) + 1
                        WHERE id = ?
                    `, [channel.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                await this.notifyAdmin(
                    `🔄 Автоматически продлен эффективный канал @${channel.channel_username}\n` +
                    `📊 Подписок: ${channel.total_subscriptions}\n` +
                    `🔄 Количество продлений: ${(channel.renewal_count || 0) + 1}`
                );
            }

            if (effectiveChannels.length > 0) {
                console.log(`🔄 Автоматически продлено ${effectiveChannels.length} эффективных каналов`);
            }
        } catch (error) {
            console.error('❌ Ошибка автопродления каналов:', error);
        }
    }

    // Вспомогательные методы
    async deactivateChannel(channel, reason) {
        await this.db.query(`
            UPDATE partner_channels 
            SET is_active = false, 
                deactivation_reason = $1,
                deactivated_at = NOW()
            WHERE id = $2
        `, [reason, channel.id]);
    }

    async getChannelStats(channelId) {
        const result = await this.db.query(`
            SELECT 
                COUNT(*) as subscriptions,
                COALESCE(SUM(stars_earned), 0) as totalStarsGiven,
                MIN(subscribed_date) as firstSubscription,
                MAX(subscribed_date) as lastSubscription
            FROM user_channel_subscriptions 
            WHERE channel_id = $1
        `, [channelId]);

        const stats = result.rows[0] || { subscriptions: '0', totalStarsGiven: '0' };
        
        // Конвертируем строки в числа
        return {
            subscriptions: parseInt(stats.subscriptions) || 0,
            totalStarsGiven: parseInt(stats.totalStarsGiven) || 0,
            firstSubscription: stats.firstSubscription,
            lastSubscription: stats.lastSubscription
        };
    }

    async getChannelDuration(channelId) {
        const result = await this.db.query(`
            SELECT created_date FROM partner_channels WHERE id = $1
        `, [channelId]);

        const channel = result.rows[0];
        if (!channel) return 'неизвестно';

        const startTime = new Date(channel.created_date);
        const endTime = new Date();
        const diffHours = Math.round((endTime - startTime) / (1000 * 60 * 60));
        
        if (diffHours < 24) {
            return `${diffHours}ч`;
        } else {
            const days = Math.floor(diffHours / 24);
            const hours = diffHours % 24;
            return `${days}д ${hours}ч`;
        }
    }

    async calculateChannelPriority(channel, stats) {
        // Алгоритм расчета приоритета канала
        let priority = 50; // Базовый приоритет

        // Бонус за активность
        const hoursSinceCreated = (Date.now() - new Date(channel.created_at)) / (1000 * 60 * 60);
        const subscriptionsPerHour = stats.subscriptions / Math.max(hoursSinceCreated, 1);
        priority += subscriptionsPerHour * 10;

        // Бонус за горячие предложения
        if (channel.is_hot_offer) {
            priority += 20;
        }

        // Штраф за длительность без активности
        if (subscriptionsPerHour < 0.1 && hoursSinceCreated > 12) {
            priority -= 30;
        }

        // Бонус за высокую награду (привлекает больше пользователей)
        if (channel.reward_stars >= 100) {
            priority += 15;
        }

        return Math.max(0, Math.min(100, Math.round(priority)));
    }

    async getLastNotification(channelId, type) {
        try {
            // Создаем таблицу если её нет
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS admin_notifications (
                    id SERIAL PRIMARY KEY,
                    channel_id INTEGER,
                    notification_type VARCHAR(50),
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            const result = await this.db.query(`
                SELECT created_at FROM admin_notifications 
                WHERE channel_id = $1 AND notification_type = $2 
                ORDER BY created_at DESC LIMIT 1
            `, [channelId, type]);

            return result.rows[0] ? new Date(result.rows[0].created_at).getTime() : null;
        } catch (error) {
            console.error('❌ Ошибка getLastNotification:', error);
            return null;
        }
    }

    async recordNotification(channelId, type) {
        await this.db.query(`
            INSERT INTO admin_notifications (channel_id, notification_type, created_at)
            VALUES ($1, $2, NOW())
        `, [channelId, type]);
    }

    async notifyAdmin(message) {
        if (!this.adminChatId || !this.bot) {
            console.log('📢 Admin notification:', message);
            return;
        }

        try {
            await this.bot.sendMessage(this.adminChatId, 
                `🤖 <b>Автоматизация спонсоров</b>\n\n${message}`, 
                { parse_mode: 'HTML' }
            );
        } catch (error) {
            console.error('❌ Ошибка отправки уведомления админу:', error);
        }
    }

    // Публичные методы для внешнего использования
    async getAutomationStats() {
        try {
            const stats = await new Promise((resolve, reject) => {
                this.db.db.get(`
                    SELECT 
                        COUNT(*) as totalChannels,
                        COUNT(CASE WHEN is_active = 1 THEN 1 END) as activeChannels,
                        COUNT(CASE WHEN is_active = 0 AND deactivation_reason = 'time_expired' THEN 1 END) as expiredChannels,
                        COUNT(CASE WHEN is_active = 0 AND deactivation_reason = 'target_reached' THEN 1 END) as completedChannels,
                        COUNT(CASE WHEN auto_renewal = 1 THEN 1 END) as autoRenewalChannels
                    FROM partner_channels
                `, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            return stats;
        } catch (error) {
            console.error('❌ Ошибка получения статистики автоматизации:', error);
            return null;
        }
    }

    async enableAutoRenewal(channelId) {
        await new Promise((resolve, reject) => {
            this.db.db.run(`
                UPDATE partner_channels 
                SET auto_renewal = 1 
                WHERE id = ?
            `, [channelId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async disableAutoRenewal(channelId) {
        await new Promise((resolve, reject) => {
            this.db.db.run(`
                UPDATE partner_channels 
                SET auto_renewal = 0 
                WHERE id = ?
            `, [channelId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

module.exports = SponsorAutomation;
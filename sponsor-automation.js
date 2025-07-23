// sponsor-automation.js - Система автоматизации управления спонсорами
// 🤖 Автоматизация каналов для Kosmetichka Lottery Bot

const Database = require('./database');

class SponsorAutomation {
    constructor(bot) {
        this.bot = bot;
        this.db = new Database();
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
            const expiredChannels = await new Promise((resolve, reject) => {
                this.db.db.all(`
                    SELECT * FROM partner_channels 
                    WHERE placement_type = 'time' 
                    AND is_active = 1 
                    AND datetime(created_at, '+' || placement_duration || ' hours') <= datetime('now')
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });

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
            const completedChannels = await new Promise((resolve, reject) => {
                this.db.db.all(`
                    SELECT * FROM partner_channels 
                    WHERE placement_type = 'target' 
                    AND is_active = 1 
                    AND current_subscribers >= subscribers_target
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });

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
            const activeChannels = await new Promise((resolve, reject) => {
                this.db.db.all(`
                    SELECT * FROM partner_channels 
                    WHERE is_active = 1
                    ORDER BY created_at DESC
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });

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
            const lowActivityChannels = await new Promise((resolve, reject) => {
                this.db.db.all(`
                    SELECT pc.*, 
                           COUNT(ucs.id) as subscription_count,
                           (julianday('now') - julianday(pc.created_at)) * 24 as hours_active
                    FROM partner_channels pc
                    LEFT JOIN user_channel_subscriptions ucs ON pc.id = ucs.channel_id 
                        AND ucs.created_at >= datetime('now', '-24 hours')
                    WHERE pc.is_active = 1 
                        AND pc.created_at <= datetime('now', '-6 hours')
                    GROUP BY pc.id
                    HAVING subscription_count < 2 AND hours_active >= 6
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });

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
            const effectiveChannels = await new Promise((resolve, reject) => {
                this.db.db.all(`
                    SELECT pc.*, 
                           COUNT(ucs.id) as total_subscriptions,
                           (julianday('now') - julianday(pc.created_at)) * 24 as hours_active
                    FROM partner_channels pc
                    LEFT JOIN user_channel_subscriptions ucs ON pc.id = ucs.channel_id
                    WHERE pc.placement_type = 'time' 
                        AND pc.is_active = 1
                        AND datetime(pc.created_at, '+' || pc.placement_duration || ' hours') <= datetime('now', '+2 hours')
                        AND pc.auto_renewal = 1
                    GROUP BY pc.id
                    HAVING total_subscriptions >= 10 OR (total_subscriptions * 1.0 / hours_active) >= 0.5
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });

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
        await new Promise((resolve, reject) => {
            this.db.db.run(`
                UPDATE partner_channels 
                SET is_active = 0, 
                    deactivation_reason = ?,
                    deactivated_at = datetime('now')
                WHERE id = ?
            `, [reason, channel.id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getChannelStats(channelId) {
        const stats = await new Promise((resolve, reject) => {
            this.db.db.get(`
                SELECT 
                    COUNT(*) as subscriptions,
                    SUM(stars_earned) as totalStarsGiven,
                    MIN(created_at) as firstSubscription,
                    MAX(created_at) as lastSubscription
                FROM user_channel_subscriptions 
                WHERE channel_id = ?
            `, [channelId], (err, row) => {
                if (err) reject(err);
                else resolve(row || { subscriptions: 0, totalStarsGiven: 0 });
            });
        });

        return stats || { subscriptions: 0, totalStarsGiven: 0 };
    }

    async getChannelDuration(channelId) {
        const channel = await new Promise((resolve, reject) => {
            this.db.db.get(`
                SELECT created_at FROM partner_channels WHERE id = ?
            `, [channelId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!channel) return 'неизвестно';

        const startTime = new Date(channel.created_at);
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
        const result = await new Promise((resolve, reject) => {
            this.db.db.get(`
                SELECT created_at FROM admin_notifications 
                WHERE channel_id = ? AND notification_type = ? 
                ORDER BY created_at DESC LIMIT 1
            `, [channelId, type], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        return result ? new Date(result.created_at).getTime() : null;
    }

    async recordNotification(channelId, type) {
        await new Promise((resolve, reject) => {
            this.db.db.run(`
                INSERT INTO admin_notifications (channel_id, notification_type, created_at)
                VALUES (?, ?, datetime('now'))
            `, [channelId, type], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
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
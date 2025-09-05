// referral-manager.js - Централизованный менеджер реферальной системы с защитой от race conditions

const crypto = require('crypto');

class ReferralManager {
    constructor(database) {
        this.db = database;
        this.activationLocks = new Map(); // Для предотвращения параллельных активаций
        this.LOCK_TIMEOUT = 30000; // 30 секунд таймаут для блокировки
        
        // Очистка истекших блокировок каждые 5 минут
        setInterval(() => this.cleanupExpiredLocks(), 5 * 60 * 1000);
    }

    // Генерация уникального ключа блокировки
    generateLockKey(referrerId, userId) {
        return `${referrerId}-${userId}`;
    }

    // Очистка истекших блокировок
    cleanupExpiredLocks() {
        const now = Date.now();
        for (const [key, lock] of this.activationLocks) {
            if (lock.expiresAt < now) {
                this.activationLocks.delete(key);
            }
        }
    }

    // Безопасная активация реферала с защитой от race conditions
    async activateReferral(referrerId, userId, bot = null) {
        const lockKey = this.generateLockKey(referrerId, userId);
        
        // Проверяем, не заблокирована ли уже эта операция
        const existingLock = this.activationLocks.get(lockKey);
        if (existingLock && existingLock.expiresAt > Date.now()) {
            throw new Error('Активация уже в процессе');
        }
        
        // Создаем блокировку
        this.activationLocks.set(lockKey, {
            createdAt: Date.now(),
            expiresAt: Date.now() + this.LOCK_TIMEOUT
        });
        
        try {
            // Начинаем транзакцию
            await this.beginTransaction();
            
            try {
                // Проверяем, что пользователи существуют
                const referrer = await this.getUserWithLock(referrerId);
                const user = await this.getUserWithLock(userId);
                
                if (!referrer) {
                    throw new Error('Реферер не найден');
                }
                
                if (!user) {
                    throw new Error('Пользователь не найден');
                }
                
                // Проверяем, что это не self-referral
                if (referrerId === userId) {
                    throw new Error('Нельзя приглашать самого себя');
                }
                
                // Проверяем, не был ли уже этот пользователь приглашен кем-то
                const existingReferral = await this.checkExistingReferral(userId);
                if (existingReferral) {
                    throw new Error('Пользователь уже был приглашен другим участником');
                }
                
                // Добавляем реферала в БД
                const referralAdded = await this.addReferralRecord(referrerId, userId);
                
                if (!referralAdded) {
                    throw new Error('Не удалось добавить реферала');
                }
                
                // Начисляем награды рефереру
                await this.addReferrerRewards(referrerId, userId);
                
                // Обновляем счетчик рефералов
                await this.updateReferralCounter(referrerId);
                
                // Коммитим транзакцию
                await this.commitTransaction();
                
                // Отправляем уведомления (вне транзакции)
                if (bot) {
                    this.sendNotifications(bot, referrer, user, referrerId, userId).catch(err => {
                        console.warn('⚠️ Не удалось отправить уведомления:', err.message);
                    });
                }
                
                return {
                    success: true,
                    message: 'Реферал успешно активирован',
                    referrerId,
                    userId,
                    rewards: {
                        stars: 10,
                        spins: 1
                    }
                };
                
            } catch (error) {
                // Откатываем транзакцию при ошибке
                await this.rollbackTransaction();
                throw error;
            }
            
        } finally {
            // Всегда снимаем блокировку
            this.activationLocks.delete(lockKey);
        }
    }

    // Методы для работы с транзакциями
    async beginTransaction() {
        if (this.db.query) {
            // PostgreSQL
            await this.db.query('BEGIN');
        } else if (this.db.db) {
            // SQLite
            return new Promise((resolve, reject) => {
                this.db.db.run('BEGIN TRANSACTION', err => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }

    async commitTransaction() {
        if (this.db.query) {
            // PostgreSQL
            await this.db.query('COMMIT');
        } else if (this.db.db) {
            // SQLite
            return new Promise((resolve, reject) => {
                this.db.db.run('COMMIT', err => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }

    async rollbackTransaction() {
        if (this.db.query) {
            // PostgreSQL
            await this.db.query('ROLLBACK');
        } else if (this.db.db) {
            // SQLite
            return new Promise((resolve, reject) => {
                this.db.db.run('ROLLBACK', err => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }

    // Получение пользователя с блокировкой для записи
    async getUserWithLock(telegramId) {
        if (this.db.query) {
            // PostgreSQL - используем FOR UPDATE для блокировки
            const result = await this.db.query(
                'SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE',
                [telegramId]
            );
            return result.rows[0];
        } else if (this.db.db) {
            // SQLite - не поддерживает FOR UPDATE, но транзакции обеспечивают изоляцию
            return new Promise((resolve, reject) => {
                this.db.db.get(
                    'SELECT * FROM users WHERE telegram_id = ?',
                    [telegramId],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
        }
    }

    // Проверка существующего реферала
    async checkExistingReferral(userId) {
        if (this.db.query) {
            // PostgreSQL
            const result = await this.db.query(
                `SELECT r.*, u.telegram_id as referrer_telegram_id, u.first_name as referrer_name
                 FROM referrals r
                 JOIN users u ON r.referrer_id = u.id
                 JOIN users u2 ON r.referred_id = u2.id
                 WHERE u2.telegram_id = $1`,
                [userId]
            );
            return result.rows[0];
        } else if (this.db.db) {
            // SQLite
            return new Promise((resolve, reject) => {
                this.db.db.get(
                    `SELECT r.*, u.telegram_id as referrer_telegram_id, u.first_name as referrer_name
                     FROM referrals r
                     JOIN users u ON r.referrer_id = u.id
                     JOIN users u2 ON r.referred_id = u2.id
                     WHERE u2.telegram_id = ?`,
                    [userId],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
        }
    }

    // Добавление записи о реферале
    async addReferralRecord(referrerId, userId) {
        if (this.db.query) {
            // PostgreSQL
            const result = await this.db.query(
                `INSERT INTO referrals (referrer_id, referred_id, created_at)
                 SELECT u1.id, u2.id, NOW()
                 FROM users u1, users u2
                 WHERE u1.telegram_id = $1 AND u2.telegram_id = $2
                 ON CONFLICT (referrer_id, referred_id) DO NOTHING
                 RETURNING id`,
                [referrerId, userId]
            );
            return result.rows.length > 0;
        } else if (this.db.db) {
            // SQLite
            return new Promise((resolve, reject) => {
                this.db.db.run(
                    `INSERT OR IGNORE INTO referrals (referrer_id, referred_id, created_at)
                     SELECT u1.id, u2.id, datetime('now')
                     FROM users u1, users u2
                     WHERE u1.telegram_id = ? AND u2.telegram_id = ?`,
                    [referrerId, userId],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.changes > 0);
                    }
                );
            });
        }
    }

    // Начисление наград рефереру
    async addReferrerRewards(referrerId, userId) {
        // Начисляем 10 звезд
        await this.db.addUserStars(referrerId, 10, 'referral_bonus', {
            source: 'referral_activation',
            invitedUser: userId
        });
        
        // Добавляем прокрутку за друга
        if (this.db.query) {
            // PostgreSQL
            await this.db.query(
                'UPDATE users SET available_friend_spins = available_friend_spins + 1 WHERE telegram_id = $1',
                [referrerId]
            );
        } else if (this.db.db) {
            // SQLite
            await new Promise((resolve, reject) => {
                this.db.db.run(
                    'UPDATE users SET available_friend_spins = available_friend_spins + 1 WHERE telegram_id = ?',
                    [referrerId],
                    err => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }
        
        // Обновляем total_stars_earned
        await this.db.incrementTotalStarsEarned(referrerId, 10);
    }

    // Обновление счетчика рефералов
    async updateReferralCounter(referrerId) {
        if (this.db.query) {
            // PostgreSQL
            await this.db.query(
                `UPDATE users u
                 SET referrals = (
                     SELECT COUNT(*) 
                     FROM referrals r
                     WHERE r.referrer_id = u.id
                 )
                 WHERE u.telegram_id = $1`,
                [referrerId]
            );
        } else if (this.db.db) {
            // SQLite
            await new Promise((resolve, reject) => {
                this.db.db.run(
                    `UPDATE users
                     SET referrals = (
                         SELECT COUNT(*) 
                         FROM referrals r
                         WHERE r.referrer_id = users.id
                     )
                     WHERE telegram_id = ?`,
                    [referrerId],
                    err => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }
    }

    // Отправка уведомлений
    async sendNotifications(bot, referrer, user, referrerId, userId) {
        try {
            // Уведомление рефереру
            await bot.sendMessage(referrerId, 
                `🎉 Поздравляем! Ваш друг ${user.first_name} присоединился к боту!\n` +
                `⭐ Вы получили 10 звезд за приглашение!\n` +
                `🎰 И дополнительную прокрутку рулетки!`
            );
            
            // Уведомление новому пользователю
            await bot.sendMessage(userId,
                `👋 Добро пожаловать! Вы присоединились по приглашению от ${referrer.first_name}!\n` +
                `🎁 Выполните задания, чтобы ваш друг получил дополнительные бонусы!`
            );
        } catch (error) {
            console.warn('⚠️ Ошибка отправки уведомлений:', error.message);
        }
    }

    // Проверка и активация при первом входе
    async checkAndActivateOnFirstVisit(userId, startParam, bot = null) {
        if (!startParam || !startParam.startsWith('ref_')) {
            return null;
        }
        
        const referralCode = startParam.replace('ref_', '');
        const referrerId = parseInt(referralCode);
        
        if (!referrerId || referrerId === userId) {
            return null;
        }
        
        try {
            const result = await this.activateReferral(referrerId, userId, bot);
            return result;
        } catch (error) {
            console.warn(`⚠️ Не удалось активировать реферал при первом входе: ${error.message}`);
            return null;
        }
    }

    // Получение статистики рефералов
    async getReferralStats(userId) {
        const stats = {
            totalReferrals: 0,
            activeReferrals: 0,
            totalEarned: 0,
            referrals: []
        };
        
        if (this.db.query) {
            // PostgreSQL
            const result = await this.db.query(
                `SELECT 
                    u.telegram_id,
                    u.first_name,
                    u.last_name,
                    u.username,
                    u.stars,
                    u.created_date,
                    r.created_at as referral_date,
                    (SELECT COUNT(*) FROM user_channel_subscriptions WHERE user_id = u.id) as tasks_completed
                 FROM referrals r
                 JOIN users u ON r.referred_id = u.id
                 JOIN users ref ON r.referrer_id = ref.id
                 WHERE ref.telegram_id = $1
                 ORDER BY r.created_at DESC`,
                [userId]
            );
            
            stats.referrals = result.rows;
            stats.totalReferrals = result.rows.length;
            stats.activeReferrals = result.rows.filter(r => r.tasks_completed > 0).length;
            stats.totalEarned = stats.totalReferrals * 10; // 10 звезд за каждого
            
        } else if (this.db.db) {
            // SQLite
            const referrals = await new Promise((resolve, reject) => {
                this.db.db.all(
                    `SELECT 
                        u.telegram_id,
                        u.first_name,
                        u.last_name,
                        u.username,
                        u.stars,
                        u.created_date,
                        r.created_at as referral_date,
                        (SELECT COUNT(*) FROM user_channel_subscriptions WHERE user_id = u.id) as tasks_completed
                     FROM referrals r
                     JOIN users u ON r.referred_id = u.id
                     JOIN users ref ON r.referrer_id = ref.id
                     WHERE ref.telegram_id = ?
                     ORDER BY r.created_at DESC`,
                    [userId],
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    }
                );
            });
            
            stats.referrals = referrals;
            stats.totalReferrals = referrals.length;
            stats.activeReferrals = referrals.filter(r => r.tasks_completed > 0).length;
            stats.totalEarned = stats.totalReferrals * 10;
        }
        
        return stats;
    }
}

module.exports = ReferralManager;
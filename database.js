// database.js - База данных для lottery-bot
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, 'lottery_bot.db');
        this.init();
    }

    init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Ошибка подключения к БД:', err);
                    reject(err);
                } else {
                    console.log('✅ База данных подключена');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    createTables() {
        return new Promise((resolve, reject) => {
            const tables = [
                // Пользователи
                `CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id INTEGER UNIQUE NOT NULL,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    stars INTEGER DEFAULT 20,
                    total_stars_earned INTEGER DEFAULT 20,
                    referrals INTEGER DEFAULT 0,
                    total_spins INTEGER DEFAULT 0,
                    prizes_won INTEGER DEFAULT 0,
                    available_friend_spins INTEGER DEFAULT 1,
                    join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_daily_reset DATE, -- дата последнего сброса ежедневных заданий
                    daily_streak INTEGER DEFAULT 0, -- серия дней подряд
                    referrer_id INTEGER, -- кто пригласил этого пользователя
                    is_referrer_verified BOOLEAN DEFAULT 0, -- выполнил ли 2 подписки для активации реферера
                    tasks_ban_until DATETIME, -- до какого времени заблокированы задания
                    violation_count INTEGER DEFAULT 0, -- количество нарушений подписок
                    is_subscribed_channel1 BOOLEAN DEFAULT 0,
                    is_subscribed_channel2 BOOLEAN DEFAULT 0,
                    is_subscribed_dolcedeals BOOLEAN DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY(referrer_id) REFERENCES users(id)
                )`,

                // Призы пользователей
                `CREATE TABLE IF NOT EXISTS user_prizes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    prize_type TEXT NOT NULL,
                    prize_name TEXT NOT NULL,
                    prize_value INTEGER,
                    is_claimed BOOLEAN DEFAULT 0,
                    won_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    claimed_date DATETIME,
                    is_posted_to_channel BOOLEAN DEFAULT 0,
                    posted_to_channel_date DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )`,

                // История прокруток
                `CREATE TABLE IF NOT EXISTS spin_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    prize_id INTEGER,
                    spin_type TEXT DEFAULT 'normal', -- normal, mega, friend
                    won_prize TEXT,
                    spin_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )`,

                // Выполненные задания
                `CREATE TABLE IF NOT EXISTS user_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    task_id TEXT NOT NULL,
                    task_type TEXT NOT NULL, -- daily, friends, active
                    reward_type TEXT,
                    reward_amount INTEGER,
                    completed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    UNIQUE(user_id, task_id)
                )`,

                // Рефералы
                `CREATE TABLE IF NOT EXISTS referrals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    referrer_id INTEGER,
                    referred_id INTEGER,
                    referral_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(referrer_id) REFERENCES users(id),
                    FOREIGN KEY(referred_id) REFERENCES users(id),
                    UNIQUE(referrer_id, referred_id)
                )`,

                // Настройки каналов для проверки подписок
                `CREATE TABLE IF NOT EXISTS channels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_username TEXT UNIQUE NOT NULL,
                    channel_id TEXT,
                    channel_name TEXT NOT NULL,
                    is_required BOOLEAN DEFAULT 1,
                    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,

                // Лидерборд (кеш для быстрого доступа)
                `CREATE TABLE IF NOT EXISTS leaderboard (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    username TEXT,
                    first_name TEXT,
                    total_stars INTEGER,
                    total_prizes INTEGER,
                    rank_position INTEGER,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )`,

                // Каналы-партнеры для системы заданий
                `CREATE TABLE IF NOT EXISTS partner_channels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_username TEXT NOT NULL, -- без @
                    channel_id TEXT, -- для API запросов
                    channel_name TEXT NOT NULL,
                    reward_stars INTEGER DEFAULT 50,
                    placement_type TEXT DEFAULT 'time', -- 'time' или 'target'
                    placement_duration INTEGER, -- часы для time типа
                    target_subscribers INTEGER, -- цель подписчиков для target типа
                    current_subscribers INTEGER DEFAULT 0, -- текущее количество через бота
                    is_active BOOLEAN DEFAULT 1,
                    is_hot_offer BOOLEAN DEFAULT 0, -- горячее предложение
                    hot_offer_multiplier REAL DEFAULT 2.0, -- множитель для горячего предложения
                    auto_renewal BOOLEAN DEFAULT 0, -- автоматическое продление
                    priority_score INTEGER DEFAULT 50, -- приоритет отображения (0-100)
                    renewal_count INTEGER DEFAULT 0, -- количество продлений
                    deactivation_reason TEXT, -- причина деактивации
                    deactivated_at DATETIME, -- время деактивации
                    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    end_date DATETIME, -- рассчитывается автоматически
                    UNIQUE(channel_username)
                )`,

                // Подписки пользователей на каналы-партнеры
                `CREATE TABLE IF NOT EXISTS user_channel_subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    channel_id INTEGER,
                    subscribed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    unsubscribed_date DATETIME,
                    is_active BOOLEAN DEFAULT 1,
                    is_verified BOOLEAN DEFAULT 0, -- проверено ли через API
                    stars_earned INTEGER DEFAULT 0,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(channel_id) REFERENCES partner_channels(id),
                    UNIQUE(user_id, channel_id)
                )`,

                // История проверок подписок (для отслеживания штрафов)
                `CREATE TABLE IF NOT EXISTS subscription_violations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    channel_id INTEGER,
                    violation_type TEXT, -- 'early_unsubscribe', 'fake_subscription'
                    violation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    penalty_duration INTEGER DEFAULT 24, -- часы блокировки
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(channel_id) REFERENCES partner_channels(id)
                )`,

                // Ежедневные задания (шаблоны)
                `CREATE TABLE IF NOT EXISTS daily_tasks_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_key TEXT UNIQUE NOT NULL, -- 'daily_login', 'daily_spins_3'
                    task_name TEXT NOT NULL,
                    task_description TEXT,
                    reward_stars INTEGER DEFAULT 0,
                    reward_spins INTEGER DEFAULT 0,
                    required_count INTEGER DEFAULT 1, -- сколько раз нужно выполнить
                    task_type TEXT DEFAULT 'daily', -- daily, achievement
                    is_active BOOLEAN DEFAULT 1
                )`,

                // Прогресс пользователей по ежедневным заданиям
                `CREATE TABLE IF NOT EXISTS user_daily_progress (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    task_key TEXT,
                    progress_date DATE, -- YYYY-MM-DD для ежедневных заданий
                    current_progress INTEGER DEFAULT 0,
                    is_completed BOOLEAN DEFAULT 0,
                    completed_date DATETIME,
                    stars_earned INTEGER DEFAULT 0,
                    spins_earned INTEGER DEFAULT 0,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    UNIQUE(user_id, task_key, progress_date)
                )`,

                // Горячие предложения (активные)
                `CREATE TABLE IF NOT EXISTS hot_offers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_id INTEGER,
                    multiplier REAL DEFAULT 2.0,
                    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    end_time DATETIME,
                    max_participants INTEGER,
                    current_participants INTEGER DEFAULT 0,
                    notification_sent BOOLEAN DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY(channel_id) REFERENCES partner_channels(id)
                )`,

                // Транзакции пополнения звезд через Telegram Stars
                `CREATE TABLE IF NOT EXISTS stars_transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    amount INTEGER NOT NULL,
                    transaction_type TEXT NOT NULL, -- 'deposit', 'bonus', 'refund'
                    telegram_payment_id TEXT, -- telegram_payment_charge_id
                    provider_payment_id TEXT, -- provider_payment_charge_id (если есть)
                    currency TEXT DEFAULT 'XTR', -- Telegram Stars = XTR
                    total_amount INTEGER, -- сумма в самых мелких единицах валюты
                    status TEXT DEFAULT 'completed', -- completed, pending, failed, refunded
                    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT, -- дополнительная информация в JSON формате
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )`,

                // Настройки рулеток
                `CREATE TABLE IF NOT EXISTS wheel_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    wheel_type TEXT NOT NULL UNIQUE, -- 'mega' или 'normal'
                    settings_data TEXT NOT NULL, -- JSON с настройками призов
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,

                // Уведомления администратора для автоматизации
                `CREATE TABLE IF NOT EXISTS admin_notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_id INTEGER,
                    notification_type TEXT NOT NULL, -- 'low_activity', 'expired', 'target_reached'
                    message TEXT,
                    is_read BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(channel_id) REFERENCES partner_channels(id)
                )`,

                // Награды за подписки (для проверки каждые 12 часов)
                `CREATE TABLE IF NOT EXISTS subscription_rewards (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    channel_id INTEGER NOT NULL,
                    stars_earned INTEGER NOT NULL DEFAULT 20,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(channel_id) REFERENCES partner_channels(id)
                )`,

                // Действия администратора (логирование)
                `CREATE TABLE IF NOT EXISTS admin_actions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    action_type TEXT NOT NULL, -- 'manual_spin', 'add_stars', 'change_settings', etc.
                    target_user_id INTEGER,
                    details TEXT, -- JSON с дополнительной информацией
                    admin_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(target_user_id) REFERENCES users(id)
                )`,

                // Достижения убраны - не используются
            ];

            let completed = 0;
            tables.forEach((sql, index) => {
                this.db.run(sql, (err) => {
                    if (err) {
                        console.error(`❌ Ошибка создания таблицы ${index + 1}:`, err);
                        reject(err);
                    } else {
                        completed++;
                        if (completed === tables.length) {
                            console.log('✅ Все таблицы созданы');
                            this.insertDefaultChannels().then(resolve).catch(reject);
                        }
                    }
                });
            });
        });
    }

    insertDefaultChannels() {
        return new Promise((resolve, reject) => {
            const channels = [
                ['kosmetichka_channel', '@kosmetichka_channel', 'Kosmetichka Channel'],
                ['kosmetichka_instagram', '@kosmetichka', 'Kosmetichka Instagram'],
                ['dolcedeals', '@dolcedeals', 'Dolce Deals']
            ];

            let completed = 0;
            channels.forEach(([username, id, name]) => {
                this.db.run(
                    'INSERT OR IGNORE INTO channels (channel_username, channel_id, channel_name) VALUES (?, ?, ?)',
                    [username, id, name],
                    (err) => {
                        if (err) {
                            console.error('❌ Ошибка добавления канала:', err);
                        }
                        completed++;
                        if (completed === channels.length) {
                            console.log('✅ Каналы добавлены');
                            this.insertDefaultDailyTasks().then(resolve).catch(reject);
                        }
                    }
                );
            });
        });
    }

    insertDefaultDailyTasks() {
        return new Promise((resolve, reject) => {
            const dailyTasks = [
                // Ежедневные задания
                ['daily_login', 'Ежедневный вход', 'Зайти в приложение', 5, 0, 1, 'daily'],
                ['daily_spins_3', '3 прокрутки', 'Сделать 3 прокрутки рулетки', 10, 0, 3, 'daily'],
                ['daily_spins_10', '10 прокруток', 'Сделать 10 прокруток рулетки', 25, 0, 10, 'daily'],
                ['daily_invite_friend', 'Пригласить друга', 'Пригласить одного нового друга', 20, 0, 1, 'daily'],
                ['daily_hot_offer', 'Горячее предложение', 'Выполнить любое горячее предложение', 30, 0, 1, 'daily'],

                // Достижения
                ['achievement_first_sub', 'Первая подписка', 'Подписаться на первый канал-партнер', 10, 0, 1, 'achievement'],
                ['achievement_subs_5', '5 подписок', 'Подписаться на 5 каналов-партнеров', 30, 0, 5, 'achievement'],
                ['achievement_subs_10', '10 подписок', 'Подписаться на 10 каналов-партнеров', 50, 0, 10, 'achievement'],
                ['achievement_subs_25', '25 подписок', 'Подписаться на 25 каналов-партнеров', 100, 0, 25, 'achievement'],
                ['achievement_subs_50', '50 подписок', 'Подписаться на 50 каналов-партнеров', 250, 0, 50, 'achievement'],
                ['achievement_subs_100', '100 подписок', 'Подписаться на 100 каналов-партнеров', 500, 0, 100, 'achievement'],
                
                // Дополнительные ежедневные
                ['daily_power_hour', 'Power Hour', 'Зайти в приложение во время Power Hour', 15, 0, 1, 'daily']
            ];

            let completed = 0;
            dailyTasks.forEach(([key, name, description, stars, spins, count, type]) => {
                this.db.run(
                    `INSERT OR IGNORE INTO daily_tasks_templates 
                     (task_key, task_name, task_description, reward_stars, reward_spins, required_count, task_type) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [key, name, description, stars, spins, count, type],
                    (err) => {
                        if (err) {
                            console.error('❌ Ошибка добавления задания:', err);
                        }
                        completed++;
                        if (completed === dailyTasks.length) {
                            console.log('✅ Базовые задания добавлены');
                            resolve();
                        }
                    }
                );
            });
        });
    }

    // === МЕТОДЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ===

    async getUser(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE telegram_id = ?',
                [telegramId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async createUser(userData) {
        return new Promise((resolve, reject) => {
            const { telegram_id, username, first_name, last_name } = userData;
            this.db.run(
                `INSERT INTO users (telegram_id, username, first_name, last_name) 
                 VALUES (?, ?, ?, ?)`,
                [telegram_id, username, first_name, last_name],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async updateUserActivity(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE telegram_id = ?',
                [telegramId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // 🆕 ДОБАВИТЬ ЭТОТ МЕТОД ДЛЯ ЛОГИРОВАНИЯ ПРОВЕРОК ПОДПИСКИ
    async logSubscriptionCheck(userId, channelUsername, isSubscribed) {
        return new Promise((resolve, reject) => {
            const timestamp = new Date().toISOString();
            
            this.db.run(
                `INSERT INTO subscription_checks 
                 (user_id, channel_username, is_subscribed, check_date) 
                 VALUES (?, ?, ?, ?)`,
                [userId, channelUsername, isSubscribed ? 1 : 0, timestamp],
                function(err) {
                    if (err) {
                        console.error('❌ Ошибка записи проверки подписки:', err);
                        // Не прерываем выполнение из-за ошибки логирования
                        resolve();
                    } else {
                        console.log(`📝 Записана проверка подписки: ${userId} -> ${channelUsername} = ${isSubscribed}`);
                        resolve();
                    }
                }
            );
        });
    }

    // 🆕 ДОБАВИТЬ ЭТОТ МЕТОД ДЛЯ ПОЛУЧЕНИЯ ИСТОРИИ ПРОВЕРОК
    async getSubscriptionHistory(userId, channelUsername = null) {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM subscription_checks WHERE user_id = ?';
            let params = [userId];
            
            if (channelUsername) {
                query += ' AND channel_username = ?';
                params.push(channelUsername);
            }
            
            query += ' ORDER BY check_date DESC LIMIT 50';
            
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('❌ Ошибка получения истории проверок:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    // 🆕 ДОБАВИТЬ ЭТОТ МЕТОД ДЛЯ СТАТИСТИКИ ПРОВЕРОК
    async getSubscriptionStats(channelUsername = null) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT 
                    channel_username,
                    COUNT(*) as total_checks,
                    SUM(is_subscribed) as successful_checks,
                    COUNT(DISTINCT user_id) as unique_users,
                    DATE(check_date) as check_date
                FROM subscription_checks
            `;
            let params = [];

            if (channelUsername) {
                query += ' WHERE channel_username = ?';
                params.push(channelUsername);
            }

            query += ' GROUP BY channel_username, DATE(check_date) ORDER BY check_date DESC LIMIT 100';

            this.db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('❌ Ошибка получения статистики проверок:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    // 🆕 ДОБАВИТЬ ЭТОТ МЕТОД ДЛЯ ОЧИСТКИ СТАРЫХ ЗАПИСЕЙ
    async cleanOldSubscriptionChecks(daysToKeep = 30) {
        return new Promise((resolve, reject) => {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const cutoffDateString = cutoffDate.toISOString();

            this.db.run(
                'DELETE FROM subscription_checks WHERE check_date < ?',
                [cutoffDateString],
                function(err) {
                    if (err) {
                        console.error('❌ Ошибка очистки старых записей проверок:', err);
                        reject(err);
                    } else {
                        console.log(`🧹 Удалено ${this.changes} старых записей проверок (старше ${daysToKeep} дней)`);
                        resolve(this.changes);
                    }
                }
            );
        });
    }
    // 3. Убедитесь, что метод updateUserStars работает правильно:
    async updateUserStars(telegramId, amount) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET stars = stars + ? WHERE telegram_id = ?',
                [amount, telegramId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async debugReferrals() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT 
                    u.telegram_id,
                    u.first_name,
                    u.username,
                    u.referrals as referrals_field,
                    COUNT(r.referred_id) as actual_referrals_count
                FROM users u
                LEFT JOIN referrals r ON u.telegram_id = r.referrer_id
                WHERE u.is_active = 1
                GROUP BY u.telegram_id, u.first_name, u.username, u.referrals
                ORDER BY actual_referrals_count DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // === МЕТОДЫ ДЛЯ ПРОКРУТОК ===

    async addSpinHistory(telegramId, prizeData, spinType = 'normal') {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO spin_history (user_id, prize_id, spin_type, won_prize) 
                 SELECT id, ?, ?, ? FROM users WHERE telegram_id = ?`,
                [prizeData.id, spinType, prizeData.name, telegramId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async updateUserSpinStats(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET total_spins = total_spins + 1 WHERE telegram_id = ?',
                [telegramId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async updateUserProfile(telegramId, profileData) {
        return new Promise((resolve, reject) => {
            const { username, first_name, last_name } = profileData;
            this.db.run(
                `UPDATE users SET 
                 username = ?, 
                 first_name = ?, 
                 last_name = ?,
                 last_activity = CURRENT_TIMESTAMP 
                 WHERE telegram_id = ?`,
                [username, first_name, last_name, telegramId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // === МЕТОДЫ ДЛЯ ПРИЗОВ ===

    async addUserPrize(telegramId, prizeData) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO user_prizes (user_id, prize_type, prize_name, prize_value) 
                 SELECT id, ?, ?, ? FROM users WHERE telegram_id = ?`,
                [prizeData.type, prizeData.name, prizeData.value, telegramId],
                function(err) {
                    if (err) reject(err);
                    else {
                        // Обновляем счетчик призов
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    // Добавление приза с транзакцией (безопасно)
    async addUserPrizeWithTransaction(telegramId, prizeData, spinType = 'normal') {
        return new Promise((resolve, reject) => {
            const db = this.db; // Сохраняем ссылку на this.db
            
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                let prizeId = null;
                let completed = 0;
                const operations = 3; // Количество операций в транзакции
                
                // 1. Добавляем приз
                db.run(
                    `INSERT INTO user_prizes (user_id, prize_type, prize_name, prize_value) 
                     SELECT id, ?, ?, ? FROM users WHERE telegram_id = ?`,
                    [prizeData.type, prizeData.name, prizeData.value || 0, telegramId],
                    function(err) {
                        if (err) {
                            console.error('❌ Ошибка добавления приза:', err);
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        prizeId = this.lastID;
                        completed++;
                        console.log(`✅ Приз добавлен с ID: ${prizeId}`);
                        if (completed === operations) db.run('COMMIT', () => resolve(prizeId));
                    }
                );
                
                // 2. Обновляем статистику призов
                db.run(
                    'UPDATE users SET prizes_won = prizes_won + 1 WHERE telegram_id = ?',
                    [telegramId],
                    function(err) {
                        if (err) {
                            console.error('❌ Ошибка обновления статистики призов:', err);
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        completed++;
                        console.log('✅ Статистика призов обновлена');
                        if (completed === operations) db.run('COMMIT', () => resolve(prizeId));
                    }
                );
                
                // 3. Добавляем в историю прокруток
                db.run(
                    `INSERT INTO spin_history (user_id, prize_id, spin_type, won_prize) 
                     SELECT id, ?, ?, ? FROM users WHERE telegram_id = ?`,
                    [prizeId, spinType, prizeData.name, telegramId],
                    function(err) {
                        if (err) {
                            console.error('❌ Ошибка добавления в историю:', err);
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        completed++;
                        console.log('✅ Запись в историю добавлена');
                        if (completed === operations) db.run('COMMIT', () => resolve(prizeId));
                    }
                );
            });
        });
    }

    async updateUserPrizeStats(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET prizes_won = prizes_won + 1 WHERE telegram_id = ?',
                [telegramId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async getUserPrizes(telegramId) {
        return new Promise((resolve, reject) => {
            console.log(`🔍 Database: Запрос призов для telegram_id: ${telegramId}`);
            
            this.db.all(
                `SELECT up.* FROM user_prizes up
                 JOIN users u ON up.user_id = u.id
                 WHERE u.telegram_id = ?
                 ORDER BY up.won_date DESC`,
                [telegramId],
                (err, rows) => {
                    if (err) {
                        console.error('❌ Database: Ошибка получения призов:', err);
                        reject(err);
                    } else {
                        console.log(`✅ Database: Найдено призов: ${rows ? rows.length : 0}`);
                        if (rows && rows.length > 0) {
                            console.log('📋 Database: Первый приз:', rows[0]);
                        }
                        resolve(rows || []);
                    }
                }
            );
        });
    }

    // === МЕТОДЫ ДЛЯ ЗАДАНИЙ ===

    async completeTask(telegramId, taskData) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR IGNORE INTO user_tasks 
                 (user_id, task_id, task_type, reward_type, reward_amount)
                 SELECT id, ?, ?, ?, ? FROM users WHERE telegram_id = ?`,
                [taskData.id, taskData.type, taskData.reward.type, taskData.reward.amount, telegramId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes > 0); // true если задание было добавлено
                }
            );
        });
    }

    async getUserCompletedTasks(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT ut.task_id FROM user_tasks ut
                 JOIN users u ON ut.user_id = u.id
                 WHERE u.telegram_id = ?`,
                [telegramId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(row => row.task_id));
                }
            );
        });
    }

    // === МЕТОДЫ ДЛЯ РЕФЕРАЛОВ ===

    async addReferral(referrerTelegramId, referredTelegramId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR IGNORE INTO referrals (referrer_id, referred_id)
                SELECT r.id, rf.id FROM users r, users rf
                WHERE r.telegram_id = ? AND rf.telegram_id = ?`,
                [referrerTelegramId, referredTelegramId],
                async (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        if (this.changes > 0) {
                            console.log(`✅ Добавлен реферал: ${referrerTelegramId} -> ${referredTelegramId}`);
                            
                            // Обновляем счетчик рефералов у пригласившего
                            try {
                                await this.updateReferralCount(referrerTelegramId);
                                resolve(true);
                            } catch (updateErr) {
                                console.error('❌ Ошибка обновления счетчика рефералов:', updateErr);
                                resolve(true); // Реферал все равно добавлен
                            }
                        } else {
                            console.log(`⚠️ Реферал уже существует: ${referrerTelegramId} -> ${referredTelegramId}`);
                            resolve(false);
                        }
                    }
                }
            );
        });
    }

    // 3. Проверьте, что поле referrals обновляется правильно:

    // 2. ЗАМЕНИТЕ метод updateReferralCount на эту версию:
    async updateReferralCount(telegramId) {
        return new Promise((resolve, reject) => {
            // Сначала получаем фактическое количество рефералов из таблицы referrals
            this.db.get(`
                SELECT COUNT(*) as count 
                FROM referrals r
                JOIN users u ON r.referrer_id = u.id
                WHERE u.telegram_id = ?
            `, [telegramId], (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const actualCount = result?.count || 0;
                
                // Обновляем поле referrals точным фактическим значением
                this.db.run(
                    'UPDATE users SET referrals = ? WHERE telegram_id = ?',
                    [actualCount, telegramId],
                    (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            console.log(`📊 Обновлен счетчик рефералов для ${telegramId}: ${actualCount}`);
                            resolve();
                        }
                    }
                );
            });
        });
    }

    async getReferral(referrerId, userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT r.* FROM referrals r
                 JOIN users ref ON r.referrer_id = ref.id
                 JOIN users rfd ON r.referred_id = rfd.id
                 WHERE ref.telegram_id = ? AND rfd.telegram_id = ?`,
                [referrerId, userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async getUserReferralsCount(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT COUNT(*) as count FROM referrals r
                 JOIN users u ON r.referrer_id = u.id
                 WHERE u.telegram_id = ?`,
                [telegramId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.count : 0);
                }
            );
        });
    }

    // === МЕТОДЫ ДЛЯ НАСТРОЕК РУЛЕТКИ ===

    async getWheelSettings(wheelType) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM wheel_settings WHERE wheel_type = ?',
                [wheelType],
                (err, row) => {
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
                }
            );
        });
    }

    async saveWheelSettings(wheelType, settings) {
        return new Promise((resolve, reject) => {
            const settingsData = JSON.stringify(settings.prizes);
            
            this.db.run(
                `INSERT OR REPLACE INTO wheel_settings (wheel_type, settings_data, updated_at) 
                 VALUES (?, ?, datetime('now'))`,
                [wheelType, settingsData],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    // === МЕТОДЫ ДЛЯ ЛИДЕРБОРДА ===

    // ИСПРАВЛЕННЫЙ МЕТОД для лидерборда рефералов пользователя
    async getReferralsLeaderboard(telegramId, limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT 
                    u.id,
                    u.username,
                    u.first_name,
                    COUNT(r2.referred_id) as referrals_count,
                    ROW_NUMBER() OVER (ORDER BY COUNT(r2.referred_id) DESC, u.join_date ASC) as rank_position
                FROM users u
                JOIN referrals r ON u.telegram_id = r.referred_id
                LEFT JOIN referrals r2 ON u.telegram_id = r2.referrer_id
                WHERE r.referrer_id = ?
                AND u.is_active = 1
                GROUP BY u.id, u.username, u.first_name, u.join_date
                ORDER BY referrals_count DESC, u.join_date ASC
                LIMIT ?
            `, [telegramId, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // ИСПРАВЛЕННЫЙ МЕТОД ДЛЯ ГЛОБАЛЬНОГО ЛИДЕРБОРДА ПО РЕФЕРАЛАМ
    async getGlobalReferralsLeaderboard(limit = 20) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT 
                    u.telegram_id,
                    u.first_name,
                    u.username,
                    COUNT(r.referred_id) as referrals_count,
                    u.total_stars_earned,
                    u.join_date
                FROM users u
                LEFT JOIN referrals r ON u.telegram_id = r.referrer_id
                WHERE u.is_active = 1
                GROUP BY u.telegram_id, u.first_name, u.username, u.total_stars_earned, u.join_date
                HAVING referrals_count > 0
                ORDER BY referrals_count DESC, u.total_stars_earned DESC, u.join_date ASC
                LIMIT ?
            `, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // НОВЫЙ МЕТОД ДЛЯ ПОЛУЧЕНИЯ ПОЗИЦИИ ПОЛЬЗОВАТЕЛЯ ПО РЕФЕРАЛАМ
    // ИСПРАВЛЕННЫЙ МЕТОД ДЛЯ ПОЛУЧЕНИЯ ПОЗИЦИИ ПОЛЬЗОВАТЕЛЯ ПО РЕФЕРАЛАМ
    async getUserReferralRank(userId) {
        return new Promise((resolve, reject) => {
            // Сначала получаем количество рефералов пользователя
            const userQuery = `
                SELECT 
                    u.telegram_id,
                    u.first_name,
                    COUNT(r.referred_id) as referrals_count
                FROM users u
                LEFT JOIN referrals r ON u.telegram_id = r.referrer_id
                WHERE u.telegram_id = ?
                GROUP BY u.telegram_id, u.first_name
            `;
            
            this.db.get(userQuery, [userId], (error, userResult) => {
                if (error) {
                    console.error('❌ Ошибка получения данных пользователя:', error);
                    return reject(error);
                }
                
                if (!userResult) {
                    return resolve({ position: null, referrals_count: 0 });
                }
                
                const userReferrals = userResult.referrals_count || 0;
                
                // Получаем позицию пользователя в общем рейтинге
                const rankQuery = `
                    SELECT COUNT(*) + 1 as position
                    FROM (
                        SELECT 
                            u.telegram_id,
                            COUNT(r.referred_id) as referrals_count,
                            u.total_stars_earned,
                            u.join_date
                        FROM users u
                        LEFT JOIN referrals r ON u.telegram_id = r.referrer_id
                        WHERE u.is_active = 1
                        GROUP BY u.telegram_id, u.total_stars_earned, u.join_date
                        HAVING 
                            referrals_count > ? OR 
                            (referrals_count = ? AND u.total_stars_earned > (
                                SELECT total_stars_earned FROM users WHERE telegram_id = ?
                            )) OR
                            (referrals_count = ? AND u.total_stars_earned = (
                                SELECT total_stars_earned FROM users WHERE telegram_id = ?
                            ) AND u.join_date < (
                                SELECT join_date FROM users WHERE telegram_id = ?
                            ))
                    ) ranked_users
                `;
                
                this.db.get(rankQuery, [
                    userReferrals, userReferrals, userId, 
                    userReferrals, userId, userId
                ], (error, rankResult) => {
                    if (error) {
                        console.error('❌ Ошибка получения ранга:', error);
                        return reject(error);
                    }
                    
                    const position = rankResult?.position || null;
                    
                    resolve({
                        position: position,
                        referrals_count: userReferrals,
                        first_name: userResult.first_name
                    });
                });
            });
        });
    }

    async updateLeaderboard() {
        return new Promise((resolve, reject) => {
            // Очищаем старый лидерборд
            this.db.run('DELETE FROM leaderboard', (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Заполняем новыми данными
                this.db.run(`
                    INSERT INTO leaderboard (user_id, username, first_name, total_stars, total_prizes, rank_position)
                    SELECT 
                        id,
                        username,
                        first_name,
                        total_stars_earned,
                        prizes_won,
                        ROW_NUMBER() OVER (ORDER BY total_stars_earned DESC, prizes_won DESC) as rank_position
                    FROM users
                    WHERE is_active = 1 AND total_stars_earned > 100
                    ORDER BY total_stars_earned DESC, prizes_won DESC
                    LIMIT 100
                `, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    async getLeaderboard(limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM leaderboard ORDER BY rank_position LIMIT ?',
                [limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async getUserRank(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT l.rank_position FROM leaderboard l
                 JOIN users u ON l.user_id = u.id
                 WHERE u.telegram_id = ?`,
                [telegramId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.rank_position : null);
                }
            );
        });
    }

    // === МЕТОДЫ ДЛЯ ПОДПИСОК ===

    async updateUserSubscription(telegramId, channelField, isSubscribed) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE users SET ${channelField} = ? WHERE telegram_id = ?`;
            this.db.run(sql, [isSubscribed ? 1 : 0, telegramId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getUserSubscriptions(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT is_subscribed_channel1, is_subscribed_channel2, is_subscribed_dolcedeals
                 FROM users WHERE telegram_id = ?`,
                [telegramId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || {});
                }
            );
        });
    }

    // === МЕТОДЫ ДЛЯ СИСТЕМЫ ЗАДАНИЙ ===

    // Управление каналами-партнерами
    async addPartnerChannel(channelData) {
        return new Promise((resolve, reject) => {
            const { username, channelId, name, rewardStars, placementType, duration, targetSubs, isHotOffer, multiplier } = channelData;
            
            // Рассчитываем end_date если это временное размещение
            let endDate = null;
            if (placementType === 'time' && duration) {
                endDate = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString(); // duration в часах
            }
            
            this.db.run(
                `INSERT INTO partner_channels 
                 (channel_username, channel_id, channel_name, reward_stars, placement_type, 
                  placement_duration, target_subscribers, is_hot_offer, hot_offer_multiplier, end_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [username, channelId, name, rewardStars, placementType, duration, targetSubs, 
                 isHotOffer ? 1 : 0, multiplier, endDate],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getActivePartnerChannels() {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            this.db.all(
                `SELECT * FROM partner_channels 
                 WHERE is_active = 1 
                 AND (end_date IS NULL OR end_date > ?) 
                 AND (placement_type = 'target' OR target_subscribers IS NULL OR current_subscribers < target_subscribers)
                 ORDER BY is_hot_offer DESC, created_date DESC`,
                [now],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async updatePartnerChannelSubscribers(channelId, increment = 1) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE partner_channels SET current_subscribers = current_subscribers + ? WHERE id = ?',
                [increment, channelId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Управление подписками пользователей
    async addUserChannelSubscription(userId, channelId, starsEarned) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR REPLACE INTO user_channel_subscriptions 
                 (user_id, channel_id, stars_earned, is_verified) 
                 VALUES (?, ?, ?, 1)`,
                [userId, channelId, starsEarned],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getUserChannelSubscriptions(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT ucs.*, pc.channel_username, pc.channel_name, pc.reward_stars
                 FROM user_channel_subscriptions ucs
                 JOIN partner_channels pc ON ucs.channel_id = pc.id  
                 WHERE ucs.user_id = ? AND ucs.is_active = 1
                 ORDER BY ucs.subscribed_date DESC`,
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async checkUserSubscription(userId, channelId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT * FROM user_channel_subscriptions 
                 WHERE user_id = ? AND channel_id = ? AND is_active = 1`,
                [userId, channelId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    // Управление ежедневными заданиями
    async getDailyTasksTemplates(type = 'daily') {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM daily_tasks_templates WHERE task_type = ? AND is_active = 1 ORDER BY id',
                [type],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async getUserDailyProgress(userId, date = null) {
        if (!date) {
            date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        }
        
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT udp.*, dtt.task_name, dtt.task_description, dtt.reward_stars, dtt.required_count
                 FROM user_daily_progress udp
                 JOIN daily_tasks_templates dtt ON udp.task_key = dtt.task_key
                 WHERE udp.user_id = ? AND udp.progress_date = ?`,
                [userId, date],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async updateDailyTaskProgress(userId, taskKey, progressIncrement = 1) {
        const today = new Date().toISOString().split('T')[0];
        
        return new Promise((resolve, reject) => {
            const db = this.db;
            
            // Получаем шаблон задания
            db.get(
                'SELECT * FROM daily_tasks_templates WHERE task_key = ? AND is_active = 1',
                [taskKey],
                (err, template) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (!template) {
                        resolve(null);
                        return;
                    }
                    
                    // Добавляем или обновляем прогресс
                    db.run(
                        `INSERT OR REPLACE INTO user_daily_progress 
                         (user_id, task_key, progress_date, current_progress, is_completed) 
                         VALUES (?, ?, ?, 
                                COALESCE((SELECT current_progress FROM user_daily_progress 
                                        WHERE user_id = ? AND task_key = ? AND progress_date = ?), 0) + ?, 
                                CASE WHEN COALESCE((SELECT current_progress FROM user_daily_progress 
                                                  WHERE user_id = ? AND task_key = ? AND progress_date = ?), 0) + ? >= ? 
                                     THEN 1 ELSE 0 END)`,
                        [userId, taskKey, today, userId, taskKey, today, progressIncrement,
                         userId, taskKey, today, progressIncrement, template.required_count],
                        function(err) {
                            if (err) reject(err);
                            else resolve(this.changes);
                        }
                    );
                }
            );
        });
    }

    // Система штрафов (уменьшены наказания)
    async addSubscriptionViolation(userId, channelId, violationType, penaltyDuration = 12) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO subscription_violations 
                 (user_id, channel_id, violation_type, penalty_duration) 
                 VALUES (?, ?, ?, ?)`,
                [userId, channelId, violationType, penaltyDuration],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async updateUserTasksBan(userId, banHours) {
        return new Promise((resolve, reject) => {
            const banUntil = new Date(Date.now() + banHours * 60 * 60 * 1000).toISOString();
            
            this.db.run(
                `UPDATE users SET 
                 tasks_ban_until = ?,
                 violation_count = violation_count + 1
                 WHERE id = ?`,
                [banUntil, userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Проверка блокировки заданий
    async isUserTasksBanned(userId) {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            
            this.db.get(
                'SELECT * FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (!row) {
                        resolve(false);
                        return;
                    }
                    
                    // Проверяем есть ли колонка tasks_ban_until и не истек ли бан
                    if (row.tasks_ban_until && new Date(row.tasks_ban_until) > new Date(now)) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }
            );
        });
    }

    // 1. Метод для обновления total_stars_earned
    async incrementTotalStarsEarned(telegramId, amount) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET total_stars_earned = total_stars_earned + ? WHERE telegram_id = ?',
                [amount, telegramId],
                (err) => {
                    if (err) reject(err);
                    else {
                        console.log(`⭐ Обновлено total_stars_earned для ${telegramId}: +${amount}`);
                        resolve();
                    }
                }
            );
        });
    }

    // === ТРАНЗАКЦИИ TELEGRAM STARS ===

    // Добавить транзакцию пополнения звезд
    async addStarsTransaction(transaction) {
        return new Promise((resolve, reject) => {
            const {
                user_id,
                amount,
                type = 'deposit',
                telegram_payment_id,
                provider_payment_id,
                currency = 'XTR',
                total_amount,
                metadata = null
            } = transaction;

            this.db.run(`
                INSERT INTO stars_transactions 
                (user_id, amount, transaction_type, telegram_payment_id, 
                 provider_payment_id, currency, total_amount, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                user_id, 
                amount, 
                type, 
                telegram_payment_id, 
                provider_payment_id, 
                currency, 
                total_amount,
                metadata ? JSON.stringify(metadata) : null
            ], function(err) {
                if (err) {
                    console.error('❌ Ошибка добавления транзакции:', err);
                    reject(err);
                } else {
                    console.log(`✅ Транзакция записана: ${amount} звезд для пользователя ${user_id}`);
                    resolve(this.lastID);
                }
            });
        });
    }

    // Получить историю транзакций пользователя
    async getUserTransactions(userId, limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM stars_transactions 
                WHERE user_id = ? 
                ORDER BY transaction_date DESC 
                LIMIT ?
            `, [userId, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // Получить статистику по транзакциям
    async getTransactionsStats() {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(amount) as total_deposited,
                    AVG(amount) as average_deposit,
                    COUNT(DISTINCT user_id) as users_with_deposits
                FROM stars_transactions 
                WHERE transaction_type = 'deposit' AND status = 'completed'
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // === СТАТИСТИКА ===

    async getStats() {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT 
                    COUNT(*) as total_users,
                    SUM(total_spins) as total_spins,
                    SUM(prizes_won) as total_prizes_won,
                    AVG(total_stars_earned) as avg_stars
                FROM users WHERE is_active = 1
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Ошибка закрытия БД:', err);
                } else {
                    console.log('✅ База данных закрыта');
                }
            });
        }
    }

    // === МЕТОДЫ ДЛЯ КАНАЛОВ И ЗАДАНИЙ ===
    
    async getActiveChannels() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM partner_channels 
                WHERE is_active = 1 
                ORDER BY is_hot_offer DESC, created_date DESC
            `, (err, rows) => {
                if (err) {
                    console.error('❌ Ошибка получения активных каналов:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
    
    async getDailyTasksForUser(userId) {
        return new Promise((resolve, reject) => {
            // Простые ежедневные задания для начала
            const dailyTasks = [
                {
                    id: 'daily_login',
                    name: 'Ежедневный вход',
                    description: 'Заходите в приложение каждый день',
                    reward_stars: 10,
                    completed: true // Всегда выполнено при входе
                }
            ];
            resolve(dailyTasks);
        });
    }
    
    async getActiveHotOffers() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM partner_channels 
                WHERE is_active = 1 AND is_hot_offer = 1
                AND (end_date IS NULL OR end_date > datetime('now'))
                ORDER BY created_date DESC
            `, (err, rows) => {
                if (err) {
                    console.error('❌ Ошибка получения горячих предложений:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
}

module.exports = Database;

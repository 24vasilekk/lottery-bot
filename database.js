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
                    stars INTEGER DEFAULT 100,
                    total_stars_earned INTEGER DEFAULT 100,
                    referrals INTEGER DEFAULT 0,
                    total_spins INTEGER DEFAULT 0,
                    prizes_won INTEGER DEFAULT 0,
                    available_friend_spins INTEGER DEFAULT 1,
                    join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                    is_subscribed_channel1 BOOLEAN DEFAULT 0,
                    is_subscribed_channel2 BOOLEAN DEFAULT 0,
                    is_subscribed_dolcedeals BOOLEAN DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1
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
                )`
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

    async updateUserStars(telegramId, starsChange) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE users SET 
                 stars = stars + ?, 
                 total_stars_earned = total_stars_earned + ?
                 WHERE telegram_id = ?`,
                [starsChange, Math.max(0, starsChange), telegramId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
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
            this.db.all(
                `SELECT up.* FROM user_prizes up
                 JOIN users u ON up.user_id = u.id
                 WHERE u.telegram_id = ?
                 ORDER BY up.won_date DESC`,
                [telegramId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
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
                function(err) {
                    if (err) reject(err);
                    else {
                        if (this.changes > 0) {
                            // Обновляем счетчик рефералов
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    }
                }
            );
        });
    }

    async updateReferralCount(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET referrals = referrals + 1 WHERE telegram_id = ?',
                [telegramId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // === МЕТОДЫ ДЛЯ ЛИДЕРБОРДА ===

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
}

module.exports = Database;
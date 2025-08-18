// database-postgres.js - PostgreSQL версия базы данных для Railway
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class DatabasePostgres {
    constructor() {
        // Конфигурация подключения из переменных окружения Railway
        const connectionString = process.env.DATABASE_URL;
        
        if (!connectionString && process.env.NODE_ENV === 'production') {
            console.error('❌ DATABASE_URL не установлен!');
            console.error('📌 Добавьте PostgreSQL в Railway:');
            console.error('1. Откройте проект в Railway');
            console.error('2. New -> Database -> Add PostgreSQL');
            console.error('3. Railway автоматически добавит DATABASE_URL');
            process.exit(1);
        }

        // Для локальной разработки используем SQLite
        if (!connectionString) {
            console.log('⚠️  Используем SQLite для локальной разработки');
            const Database = require('./database.js');
            return new Database();
        }

        // Настройка пула соединений
        this.pool = new Pool({
            connectionString,
            ssl: {
                rejectUnauthorized: false
            },
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Обработка ошибок пула
        this.pool.on('error', (err) => {
            console.error('Неожиданная ошибка в пуле PostgreSQL:', err);
        });

        console.log('🐘 Подключение к PostgreSQL...');
        this.init();
    }

    async init() {
        try {
            // Проверяем соединение
            const client = await this.pool.connect();
            console.log('✅ PostgreSQL подключен успешно');
            client.release();

            // Создаем таблицы
            await this.createTables();
            
            // Инициализируем начальные данные
            await this.initializeData();
        } catch (error) {
            console.error('❌ Ошибка подключения к PostgreSQL:', error);
            throw error;
        }
    }

    async createTables() {
        const client = await this.pool.connect();
        
        try {
            console.log('🔨 Создание таблиц PostgreSQL...');
            
            // Начинаем транзакцию
            await client.query('BEGIN');

            // 1. Таблица пользователей
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    telegram_id BIGINT UNIQUE NOT NULL,
                    username VARCHAR(255),
                    first_name VARCHAR(255),
                    last_name VARCHAR(255),
                    stars INTEGER DEFAULT 20,
                    total_stars_earned INTEGER DEFAULT 20,
                    referrals INTEGER DEFAULT 0,
                    total_spins INTEGER DEFAULT 0,
                    prizes_won INTEGER DEFAULT 0,
                    available_friend_spins INTEGER DEFAULT 1,
                    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_daily_reset DATE,
                    daily_streak INTEGER DEFAULT 0,
                    referrer_id INTEGER REFERENCES users(id),
                    is_referrer_verified BOOLEAN DEFAULT FALSE,
                    tasks_ban_until TIMESTAMP,
                    violation_count INTEGER DEFAULT 0,
                    is_subscribed_channel1 BOOLEAN DEFAULT FALSE,
                    is_subscribed_channel2 BOOLEAN DEFAULT FALSE,
                    is_subscribed_dolcedeals BOOLEAN DEFAULT FALSE,
                    is_active BOOLEAN DEFAULT TRUE,
                    completed_tasks TEXT DEFAULT '[]',
                    task_statuses TEXT DEFAULT '{}',
                    friend_spins_used INTEGER DEFAULT 0
                )
            `);

            // 2. Индекс для быстрого поиска по telegram_id
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_users_telegram_id 
                ON users(telegram_id)
            `);

            // 3. Таблица истории прокруток
            await client.query(`
                CREATE TABLE IF NOT EXISTS spin_history (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    spin_type VARCHAR(50),
                    prize_name VARCHAR(255),
                    prize_type VARCHAR(50),
                    prize_value INTEGER DEFAULT 0,
                    spin_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 4. Таблица призов пользователей
            await client.query(`
                CREATE TABLE IF NOT EXISTS user_prizes (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    prize_type VARCHAR(50),
                    prize_value VARCHAR(255),
                    description TEXT,
                    won_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_claimed BOOLEAN DEFAULT FALSE,
                    claimed_date TIMESTAMP
                )
            `);

            // 5. Таблица рефералов
            await client.query(`
                CREATE TABLE IF NOT EXISTS referrals (
                    id SERIAL PRIMARY KEY,
                    referrer_id INTEGER REFERENCES users(id),
                    referred_id INTEGER REFERENCES users(id),
                    referral_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE,
                    reward_given BOOLEAN DEFAULT FALSE,
                    UNIQUE(referrer_id, referred_id)
                )
            `);

            // 6. Таблица транзакций звезд
            await client.query(`
                CREATE TABLE IF NOT EXISTS stars_transactions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    amount INTEGER NOT NULL,
                    transaction_type VARCHAR(50),
                    description TEXT,
                    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    balance_after INTEGER,
                    telegram_payment_charge_id VARCHAR(255),
                    status VARCHAR(50) DEFAULT 'completed'
                )
            `);

            // 7. Таблица каналов
            await client.query(`
                CREATE TABLE IF NOT EXISTS channels (
                    id SERIAL PRIMARY KEY,
                    channel_id VARCHAR(100) UNIQUE,
                    channel_name VARCHAR(255),
                    channel_username VARCHAR(255),
                    bonus_stars INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 8. Таблица подписок пользователей
            await client.query(`
                CREATE TABLE IF NOT EXISTS user_channel_subscriptions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    channel_id VARCHAR(100),
                    subscribed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_valid BOOLEAN DEFAULT TRUE,
                    check_count INTEGER DEFAULT 0,
                    UNIQUE(user_id, channel_id)
                )
            `);

            // 9. Таблица настроек рулетки
            await client.query(`
                CREATE TABLE IF NOT EXISTS wheel_settings (
                    id SERIAL PRIMARY KEY,
                    wheel_type VARCHAR(50) UNIQUE NOT NULL,
                    settings TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 10. Таблица лидерборда
            await client.query(`
                CREATE TABLE IF NOT EXISTS leaderboard (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) UNIQUE,
                    display_name VARCHAR(255),
                    stars_earned INTEGER DEFAULT 0,
                    spins_count INTEGER DEFAULT 0,
                    referrals_count INTEGER DEFAULT 0,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Коммитим транзакцию
            await client.query('COMMIT');
            console.log('✅ Все таблицы PostgreSQL созданы успешно');
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Ошибка создания таблиц:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async initializeData() {
        try {
            // Добавляем начальные каналы
            await this.addChannel('@kosmetichka', 'Косметичка', 5);
            await this.addChannel('@dolcedeals', 'Dolce Deals', 10);
            
            console.log('✅ Начальные данные инициализированы');
        } catch (error) {
            console.error('⚠️  Ошибка инициализации данных:', error);
        }
    }

    // === МЕТОДЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ===

    async getUser(telegramId) {
        const query = 'SELECT * FROM users WHERE telegram_id = $1';
        const result = await this.pool.query(query, [telegramId]);
        return result.rows[0] || null;
    }

    async createUser(userData) {
        const { telegram_id, username, first_name, last_name } = userData;
        
        const query = `
            INSERT INTO users (telegram_id, username, first_name, last_name, stars, total_stars_earned) 
            VALUES ($1, $2, $3, $4, 20, 20)
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [telegram_id, username, first_name, last_name]);
        console.log(`✅ Пользователь ${telegram_id} создан с балансом 20 звезд`);
        return result.rows[0];
    }

    async updateUserActivity(telegramId) {
        const query = 'UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE telegram_id = $1';
        await this.pool.query(query, [telegramId]);
    }

    async updateUserStars(telegramId, stars, totalEarned = null) {
        let query;
        let params;
        
        if (totalEarned !== null) {
            query = `
                UPDATE users 
                SET stars = $2, total_stars_earned = $3, last_activity = CURRENT_TIMESTAMP 
                WHERE telegram_id = $1
                RETURNING stars, total_stars_earned
            `;
            params = [telegramId, stars, totalEarned];
        } else {
            query = `
                UPDATE users 
                SET stars = $2, last_activity = CURRENT_TIMESTAMP 
                WHERE telegram_id = $1
                RETURNING stars, total_stars_earned
            `;
            params = [telegramId, stars];
        }
        
        const result = await this.pool.query(query, params);
        return result.rows[0];
    }

    async addUserStars(telegramId, amount) {
        const query = `
            UPDATE users 
            SET stars = stars + $2, 
                total_stars_earned = total_stars_earned + $2,
                last_activity = CURRENT_TIMESTAMP 
            WHERE telegram_id = $1
            RETURNING stars, total_stars_earned
        `;
        
        const result = await this.pool.query(query, [telegramId, amount]);
        console.log(`⭐ Пользователю ${telegramId} добавлено ${amount} звезд`);
        return result.rows[0];
    }

    async subtractUserStars(telegramId, amount) {
        const query = `
            UPDATE users 
            SET stars = GREATEST(0, stars - $2), 
                last_activity = CURRENT_TIMESTAMP 
            WHERE telegram_id = $1
            RETURNING stars
        `;
        
        const result = await this.pool.query(query, [telegramId, amount]);
        console.log(`⭐ У пользователя ${telegramId} списано ${amount} звезд`);
        return result.rows[0];
    }

    // === МЕТОДЫ ДЛЯ ПРИЗОВ ===

    async addUserPrize(telegramId, prizeData) {
        const user = await this.getUser(telegramId);
        if (!user) throw new Error('Пользователь не найден');

        const query = `
            INSERT INTO user_prizes (user_id, prize_type, prize_value, description)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [
            user.id,
            prizeData.type,
            prizeData.value,
            prizeData.description || prizeData.name
        ]);
        
        return result.rows[0];
    }

    async getUserPrizes(telegramId) {
        const user = await this.getUser(telegramId);
        if (!user) return [];

        const query = `
            SELECT * FROM user_prizes 
            WHERE user_id = $1 
            ORDER BY won_date DESC
        `;
        
        const result = await this.pool.query(query, [user.id]);
        return result.rows;
    }

    // === МЕТОДЫ ДЛЯ ИСТОРИИ ПРОКРУТОК ===

    async addSpinHistory(telegramId, spinData) {
        const user = await this.getUser(telegramId);
        if (!user) throw new Error('Пользователь не найден');

        const query = `
            INSERT INTO spin_history (user_id, spin_type, prize_name, prize_type, prize_value)
            VALUES ($1, $2, $3, $4, $5)
        `;
        
        await this.pool.query(query, [
            user.id,
            spinData.spinType || 'normal',
            spinData.prizeName,
            spinData.prizeType,
            spinData.prizeValue || 0
        ]);

        // Обновляем счетчик прокруток
        await this.pool.query(
            'UPDATE users SET total_spins = total_spins + 1 WHERE id = $1',
            [user.id]
        );
    }

    // === МЕТОДЫ ДЛЯ РЕФЕРАЛОВ ===

    async addReferral(referrerId, referredId) {
        const referrer = await this.getUser(referrerId);
        const referred = await this.getUser(referredId);
        
        if (!referrer || !referred) return false;

        try {
            const query = `
                INSERT INTO referrals (referrer_id, referred_id)
                VALUES ($1, $2)
                ON CONFLICT (referrer_id, referred_id) DO NOTHING
                RETURNING *
            `;
            
            const result = await this.pool.query(query, [referrer.id, referred.id]);
            
            if (result.rows.length > 0) {
                // Обновляем счетчик рефералов
                await this.pool.query(
                    'UPDATE users SET referrals = referrals + 1 WHERE id = $1',
                    [referrer.id]
                );
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка добавления реферала:', error);
            return false;
        }
    }

    async getUserReferralsCount(telegramId) {
        const user = await this.getUser(telegramId);
        if (!user) return 0;

        const query = `
            SELECT COUNT(*) as count 
            FROM referrals 
            WHERE referrer_id = $1 AND is_active = true
        `;
        
        const result = await this.pool.query(query, [user.id]);
        return parseInt(result.rows[0].count) || 0;
    }

    // === МЕТОДЫ ДЛЯ КАНАЛОВ ===

    async addChannel(channelId, channelName, bonusStars = 0) {
        const query = `
            INSERT INTO channels (channel_id, channel_name, channel_username, bonus_stars)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (channel_id) DO UPDATE
            SET channel_name = $2, bonus_stars = $4
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [
            channelId,
            channelName,
            channelId,
            bonusStars
        ]);
        
        return result.rows[0];
    }

    async getChannels() {
        const query = 'SELECT * FROM channels WHERE is_active = true';
        const result = await this.pool.query(query);
        return result.rows;
    }

    // === МЕТОДЫ ДЛЯ ТРАНЗАКЦИЙ ===

    async addTransaction(telegramId, amount, type, description) {
        const user = await this.getUser(telegramId);
        if (!user) throw new Error('Пользователь не найден');

        const newBalance = user.stars + amount;
        
        const query = `
            INSERT INTO stars_transactions 
            (user_id, amount, transaction_type, description, balance_after)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [
            user.id,
            amount,
            type,
            description,
            newBalance
        ]);
        
        return result.rows[0];
    }

    // === МЕТОДЫ ДЛЯ НАСТРОЕК РУЛЕТКИ ===
    
    async getWheelSettings(wheelType) {
        try {
            const result = await this.pool.query(
                'SELECT * FROM wheel_settings WHERE wheel_type = $1',
                [wheelType]
            );
            
            if (result.rows.length > 0) {
                return {
                    prizes: JSON.parse(result.rows[0].settings_data)
                };
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения настроек рулетки:', error);
            throw error;
        }
    }

    async saveWheelSettings(wheelType, settings) {
        try {
            const settingsData = JSON.stringify(settings.prizes);
            
            await this.pool.query(
                `INSERT INTO wheel_settings (wheel_type, settings_data, updated_at) 
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (wheel_type) 
                 DO UPDATE SET settings_data = EXCLUDED.settings_data, updated_at = NOW()`,
                [wheelType, settingsData]
            );
        } catch (error) {
            console.error('Ошибка сохранения настроек рулетки:', error);
            throw error;
        }
    }

    async initializeRealWheelChances() {
        try {
            // Проверяем существующие настройки
            const existingNormal = await this.getWheelSettings('normal');
            const existingMega = await this.getWheelSettings('mega');
            
            // ОБЫЧНАЯ РУЛЕТКА - РЕАЛЬНЫЕ ШАНСЫ (не визуальные!)
            if (!existingNormal) {
                const realNormalChances = {
                    prizes: [
                        {
                            id: 'empty',
                            name: 'Пусто (черный раздел)',
                            type: 'empty',
                            probability: 94, // РЕАЛЬНО 940 из 1000 прокруток
                            description: 'Попробуйте еще раз!'
                        },
                        {
                            id: 'stars20',
                            name: '20 звезд',
                            type: 'stars',
                            probability: 5, // РЕАЛЬНО 50 из 1000 прокруток
                            description: 'Получено 20 звезд',
                            value: 20
                        },
                        {
                            id: 'cert300',
                            name: 'Сертификат 300₽ ЗЯ',
                            type: 'certificate',
                            probability: 1, // РЕАЛЬНО 10 из 1000 прокруток
                            description: 'Сертификат на 300 рублей в Золотое Яблоко',
                            value: 300
                        }
                    ]
                };
                
                await this.saveWheelSettings('normal', realNormalChances);
                console.log('✅ Инициализированы РЕАЛЬНЫЕ шансы обычной рулетки');
            }
            
            // МЕГА-РУЛЕТКА - призы 1:10000
            if (!existingMega) {
                const realMegaChances = {
                    prizes: [
                        {
                            id: 'empty',
                            name: 'Пусто (черный раздел)',
                            type: 'empty', 
                            probability: 99.97, // Почти все
                            description: 'Попробуйте еще раз!'
                        },
                        {
                            id: 'iphone15',
                            name: 'iPhone 15',
                            type: 'mega_prize',
                            probability: 0.01, // 1:10000
                            description: 'iPhone 15 128GB',
                            value: 80000
                        },
                        {
                            id: 'macbook',
                            name: 'MacBook Air',
                            type: 'mega_prize',
                            probability: 0.01, // 1:10000
                            description: 'MacBook Air M2',
                            value: 120000
                        },
                        {
                            id: 'cert10000',
                            name: 'Сертификат 10000₽',
                            type: 'mega_certificate',
                            probability: 0.01, // 1:10000
                            description: 'Сертификат на 10000 рублей',
                            value: 10000
                        }
                    ]
                };
                
                await this.saveWheelSettings('mega', realMegaChances);
                console.log('✅ Инициализированы РЕАЛЬНЫЕ шансы мега-рулетки');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка инициализации реальных шансов:', error);
            return false;
        }
    }

    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

    async query(text, params) {
        return this.pool.query(text, params);
    }

    async close() {
        await this.pool.end();
        console.log('🔌 PostgreSQL соединение закрыто');
    }
}

module.exports = DatabasePostgres;
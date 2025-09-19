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

        // Требуем настройку PostgreSQL
        if (!connectionString) {
            console.error('❌ DATABASE_URL не установлен!');
            console.error('Для работы требуется PostgreSQL база данных.');
            console.error('Установите DATABASE_URL или настройте переменные окружения PG_*');
            throw new Error('DATABASE_URL required for PostgreSQL connection');
        }

        // Настройка пула соединений
        this.pool = new Pool({
            connectionString,
            ssl: process.env.NODE_ENV === 'production' ? {
                rejectUnauthorized: false  // Railway использует самоподписанные сертификаты
            } : {
                rejectUnauthorized: false
            },
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            acquireTimeoutMillis: 60000,
            createTimeoutMillis: 10000,
            destroyTimeoutMillis: 5000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 200,
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
                    friend_spins_used INTEGER DEFAULT 0,
                    win_chance DECIMAL(5,2) DEFAULT 0.0
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
                    status VARCHAR(50) DEFAULT 'completed',
                    metadata JSONB
                )
            `);

            // Миграция: добавляем колонку metadata если её нет
            await client.query(`
                ALTER TABLE stars_transactions 
                ADD COLUMN IF NOT EXISTS metadata JSONB
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

            // 8. Таблица подписок пользователей (удалена, заменена на таблицу ниже)

            // 9. Таблица настроек рулетки
            await client.query(`
                CREATE TABLE IF NOT EXISTS wheel_settings (
                    id SERIAL PRIMARY KEY,
                    wheel_type VARCHAR(50) UNIQUE NOT NULL,
                    settings_data TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Миграция: переименовываем колонку settings в settings_data если нужно
            try {
                // Проверяем, есть ли старая колонка 'settings'
                const checkColumn = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'wheel_settings' AND column_name = 'settings'
                `);
                
                if (checkColumn.rows.length > 0) {
                    console.log('🔄 Миграция: переименовываем колонку settings → settings_data');
                    await client.query('ALTER TABLE wheel_settings RENAME COLUMN settings TO settings_data');
                    console.log('✅ Миграция wheel_settings завершена');
                }
            } catch (migrationError) {
                console.log('ℹ️ Миграция wheel_settings не требуется или уже выполнена');
            }

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

            // 11. Таблица каналов-партнеров
            await client.query(`
                CREATE TABLE IF NOT EXISTS partner_channels (
                    id SERIAL PRIMARY KEY,
                    channel_username VARCHAR(255) NOT NULL,
                    channel_id VARCHAR(100),
                    channel_name VARCHAR(255) NOT NULL,
                    channel_description TEXT,
                    channel_avatar_url TEXT,
                    reward_stars INTEGER DEFAULT 50,
                    placement_type VARCHAR(20) DEFAULT 'time',
                    placement_duration INTEGER,
                    target_subscribers INTEGER,
                    current_subscribers INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    is_hot_offer BOOLEAN DEFAULT FALSE,
                    hot_offer_multiplier REAL DEFAULT 2.0,
                    auto_renewal BOOLEAN DEFAULT FALSE,
                    priority_score INTEGER DEFAULT 50,
                    renewal_count INTEGER DEFAULT 0,
                    deactivation_reason TEXT,
                    deactivated_at TIMESTAMP,
                    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    end_date TIMESTAMP,
                    UNIQUE(channel_username)
                )
            `);

            // 12. Подписки пользователей на каналы-партнеры
            await client.query(`
                CREATE TABLE IF NOT EXISTS user_channel_subscriptions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    channel_id INTEGER REFERENCES partner_channels(id),
                    subscribed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    unsubscribed_date TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE,
                    is_verified BOOLEAN DEFAULT FALSE,
                    stars_earned INTEGER DEFAULT 0,
                    UNIQUE(user_id, channel_id)
                )
            `);

            // 13. Добавляем недостающие поля в user_prizes
            await client.query(`
                ALTER TABLE user_prizes 
                ADD COLUMN IF NOT EXISTS is_posted_to_channel BOOLEAN DEFAULT FALSE
            `);

            // 14. Добавляем поля для пригласительных ссылок в partner_channels
            await client.query(`
                ALTER TABLE partner_channels 
                ADD COLUMN IF NOT EXISTS invite_link TEXT,
                ADD COLUMN IF NOT EXISTS invite_link_name VARCHAR(100),
                ADD COLUMN IF NOT EXISTS joined_via_invite INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS invite_member_limit INTEGER,
                ADD COLUMN IF NOT EXISTS invite_expire_date TIMESTAMP,
                ADD COLUMN IF NOT EXISTS invite_creates_join_request BOOLEAN DEFAULT FALSE
            `);
            
            await client.query(`
                ALTER TABLE user_prizes 
                ADD COLUMN IF NOT EXISTS posted_to_channel_date TIMESTAMP
            `);

            // 14. Таблица призов (для админского мониторинга)
            await client.query(`
                CREATE TABLE IF NOT EXISTS prizes (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    type VARCHAR(50) NOT NULL,
                    description TEXT,
                    is_given BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    given_at TIMESTAMP,
                    given_by INTEGER
                )
            `);

            // 15. Таблица промокодов
            await client.query(`
                CREATE TABLE IF NOT EXISTS promo_codes (
                    id SERIAL PRIMARY KEY,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    stars_amount INTEGER NOT NULL,
                    max_uses INTEGER DEFAULT NULL,
                    current_uses INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_date TIMESTAMP DEFAULT NULL
                )
            `);

            // 16. Таблица использования промокодов
            await client.query(`
                CREATE TABLE IF NOT EXISTS promo_usage (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    promo_code VARCHAR(50) NOT NULL,
                    used_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    stars_received INTEGER,
                    UNIQUE(user_id, promo_code)
                )
            `);

            // МИГРАЦИЯ: Добавляем недостающие колонки если их нет
            try {
                console.log('🔄 Проверка миграций...');
                
                // Проверяем существование колонки updated_at в partner_channels
                const checkUpdatedAt = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'partner_channels' 
                    AND column_name = 'updated_at'
                `);
                
                if (checkUpdatedAt.rows.length === 0) {
                    console.log('📝 Добавляем колонку updated_at в partner_channels...');
                    await client.query(`
                        ALTER TABLE partner_channels 
                        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    `);
                    console.log('✅ Колонка updated_at добавлена');
                } else {
                    console.log('✅ Колонка updated_at уже существует');
                }

                // Проверяем существование колонки win_chance в users
                const checkWinChance = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND column_name = 'win_chance'
                `);
                
                if (checkWinChance.rows.length === 0) {
                    console.log('📝 Добавляем колонку win_chance в users...');
                    await client.query(`
                        ALTER TABLE users 
                        ADD COLUMN win_chance DECIMAL(5,2) DEFAULT 0.0
                    `);
                    console.log('✅ Колонка win_chance добавлена');
                } else {
                    console.log('✅ Колонка win_chance уже существует');
                }

                // Добавляем раздельные шансы для звезд и сертификатов
                const checkStarsChance = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND column_name = 'stars_chance'
                `);
                
                if (checkStarsChance.rows.length === 0) {
                    console.log('📝 Добавляем колонку stars_chance в users...');
                    await client.query(`
                        ALTER TABLE users 
                        ADD COLUMN stars_chance DECIMAL(5,2) DEFAULT 0.0
                    `);
                    console.log('✅ Колонка stars_chance добавлена');
                } else {
                    console.log('✅ Колонка stars_chance уже существует');
                }

                const checkCertificateChance = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND column_name = 'certificate_chance'
                `);
                
                if (checkCertificateChance.rows.length === 0) {
                    console.log('📝 Добавляем колонку certificate_chance в users...');
                    await client.query(`
                        ALTER TABLE users 
                        ADD COLUMN certificate_chance DECIMAL(5,2) DEFAULT 0.0
                    `);
                    console.log('✅ Колонка certificate_chance добавлена');
                } else {
                    console.log('✅ Колонка certificate_chance уже существует');
                }

                // Исправляем тип данных channel_id в user_channel_subscriptions если нужно
                const checkChannelIdType = await client.query(`
                    SELECT data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'user_channel_subscriptions' 
                    AND column_name = 'channel_id'
                `);
                
                if (checkChannelIdType.rows.length > 0 && checkChannelIdType.rows[0].data_type === 'character varying') {
                    console.log('📝 Исправляем тип данных channel_id в user_channel_subscriptions...');
                    try {
                        await client.query(`
                            ALTER TABLE user_channel_subscriptions 
                            ALTER COLUMN channel_id TYPE INTEGER USING channel_id::integer
                        `);
                        console.log('✅ Тип данных channel_id исправлен на INTEGER');
                    } catch (typeError) {
                        // Если не удается преобразовать, очищаем таблицу и меняем тип
                        console.log('⚠️ Не удалось преобразовать тип, очищаем таблицу...');
                        await client.query('DELETE FROM user_channel_subscriptions');
                        await client.query(`
                            ALTER TABLE user_channel_subscriptions 
                            ALTER COLUMN channel_id TYPE INTEGER USING 1
                        `);
                        console.log('✅ Тип данных channel_id исправлен (таблица очищена)');
                    }
                } else {
                    console.log('✅ Тип данных channel_id уже корректен');
                }

                // Проверяем и добавляем недостающие колонки в user_channel_subscriptions
                const checkIsActive = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'user_channel_subscriptions' 
                    AND column_name = 'is_active'
                `);
                
                if (checkIsActive.rows.length === 0) {
                    console.log('📝 Добавляем колонку is_active в user_channel_subscriptions...');
                    await client.query(`
                        ALTER TABLE user_channel_subscriptions 
                        ADD COLUMN is_active BOOLEAN DEFAULT TRUE
                    `);
                    console.log('✅ Колонка is_active добавлена');
                } else {
                    console.log('✅ Колонка is_active уже существует');
                }

                // Проверяем колонку is_verified
                const checkIsVerified = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'user_channel_subscriptions' 
                    AND column_name = 'is_verified'
                `);
                
                if (checkIsVerified.rows.length === 0) {
                    console.log('📝 Добавляем колонку is_verified в user_channel_subscriptions...');
                    await client.query(`
                        ALTER TABLE user_channel_subscriptions 
                        ADD COLUMN is_verified BOOLEAN DEFAULT FALSE
                    `);
                    console.log('✅ Колонка is_verified добавлена');
                } else {
                    console.log('✅ Колонка is_verified уже существует');
                }

                // Проверяем колонку stars_earned
                const checkStarsEarned = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'user_channel_subscriptions' 
                    AND column_name = 'stars_earned'
                `);
                
                if (checkStarsEarned.rows.length === 0) {
                    console.log('📝 Добавляем колонку stars_earned в user_channel_subscriptions...');
                    await client.query(`
                        ALTER TABLE user_channel_subscriptions 
                        ADD COLUMN stars_earned INTEGER DEFAULT 0
                    `);
                    console.log('✅ Колонка stars_earned добавлена');
                } else {
                    console.log('✅ Колонка stars_earned уже существует');
                }

                // Проверяем и добавляем колонки для описания и аватарки канала
                const checkChannelDescription = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'partner_channels' 
                    AND column_name = 'channel_description'
                `);
                
                if (checkChannelDescription.rows.length === 0) {
                    console.log('📝 Добавляем колонку channel_description в partner_channels...');
                    await client.query(`
                        ALTER TABLE partner_channels 
                        ADD COLUMN channel_description TEXT
                    `);
                    console.log('✅ Колонка channel_description добавлена');
                } else {
                    console.log('✅ Колонка channel_description уже существует');
                }

                const checkChannelAvatar = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'partner_channels' 
                    AND column_name = 'channel_avatar_url'
                `);
                
                if (checkChannelAvatar.rows.length === 0) {
                    console.log('📝 Добавляем колонку channel_avatar_url в partner_channels...');
                    await client.query(`
                        ALTER TABLE partner_channels 
                        ADD COLUMN channel_avatar_url TEXT
                    `);
                    console.log('✅ Колонка channel_avatar_url добавлена');
                } else {
                    console.log('✅ Колонка channel_avatar_url уже существует');
                }
                
                console.log('✅ Миграции завершены');
            } catch (migrationError) {
                console.warn('⚠️ Ошибка миграции (может быть не критично):', migrationError.message);
            }

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
            // Добавляем начальные каналы в partner_channels
            await this.addChannel({
                username: 'kosmetichka',
                name: 'Косметичка',
                stars: 50,
                hours: 24
            });
            
            await this.addChannel({
                username: 'dolcedeals',
                name: 'Dolce Deals', 
                stars: 75,
                hours: 48
            });
            
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

    async addUserStars(telegramId, amount, transactionType = 'bonus', metadata = null) {
        const client = await this.pool.connect();
        
        try {
            // Получаем user_id
            const userResult = await client.query(
                'SELECT id FROM users WHERE telegram_id = $1',
                [telegramId]
            );
            
            if (!userResult.rows[0]) {
                throw new Error('Пользователь не найден');
            }
            
            const userId = userResult.rows[0].id;
            
            // Обновляем баланс
            const updateResult = await client.query(
                `UPDATE users 
                 SET stars = stars + $2, 
                     total_stars_earned = total_stars_earned + $2,
                     last_activity = CURRENT_TIMESTAMP 
                 WHERE telegram_id = $1
                 RETURNING stars, total_stars_earned`,
                [telegramId, amount]
            );
            
            console.log(`⭐ Пользователю ${telegramId} добавлено ${amount} звезд`);
            
            // Записываем транзакцию
            try {
                await client.query(
                    `INSERT INTO stars_transactions 
                     (user_id, amount, transaction_type, status, metadata)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [userId, amount, transactionType, 'completed', 
                     metadata ? JSON.stringify(metadata) : null]
                );
                console.log(`📝 Транзакция записана: +${amount} звезд (${transactionType})`);
            } catch (transErr) {
                console.error('⚠️ Ошибка записи транзакции:', transErr);
                // Не прерываем выполнение, так как баланс уже обновлен
            }
            
            return updateResult.rows[0];
        } finally {
            client.release();
        }
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

    // Новый метод для обработки спина с полной транзакционностью (PostgreSQL)
    async processSpinWithTransaction(telegramId, spinCost, prizeData, spinType = 'normal') {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            console.log('🔄 Начата транзакция спина');
            
            // 1. Получаем пользователя и проверяем баланс
            const userResult = await client.query(
                'SELECT id, stars FROM users WHERE telegram_id = $1',
                [telegramId]
            );
            
            if (!userResult.rows[0]) {
                throw new Error('Пользователь не найден');
            }
            
            const user = userResult.rows[0];
            const userId = user.id;
            const currentBalance = user.stars;
            
            // 2. Списываем звезды если это платный спин
            if (spinCost > 0) {
                if (currentBalance < spinCost) {
                    throw new Error(`Недостаточно звезд: ${currentBalance} < ${spinCost}`);
                }
                
                await client.query(
                    'UPDATE users SET stars = stars - $1 WHERE telegram_id = $2',
                    [spinCost, telegramId]
                );
                console.log(`💰 Списано ${spinCost} звезд`);
                
                // Записываем транзакцию списания
                await client.query(
                    `INSERT INTO stars_transactions 
                     (user_id, amount, transaction_type, status, metadata)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [userId, -spinCost, 'spin_cost', 'completed', 
                     JSON.stringify({spinType, timestamp: Date.now()})]
                );
            }
            
            let prizeId = null;
            let finalBalance = currentBalance - spinCost;
            
            // 3. Добавляем приз (если не пусто)
            if (prizeData.type !== 'empty') {
                // ИСПРАВЛЕНО: Сохраняем приз в таблицу prizes (для админ панели)
                const prizeResult = await client.query(
                    `INSERT INTO prizes 
                     (user_id, type, description, is_given)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id`,
                    [userId, prizeData.type, prizeData.name || prizeData.description, false]
                );
                prizeId = prizeResult.rows[0].id;
                console.log(`🎁 Приз добавлен в prizes: ${prizeData.name} (ID: ${prizeId})`);
                
                // Также сохраняем в user_prizes для истории пользователя
                await client.query(
                    `INSERT INTO user_prizes 
                     (user_id, prize_type, description, prize_value)
                     VALUES ($1, $2, $3, $4)`,
                    [userId, prizeData.type, prizeData.name || prizeData.description, prizeData.value || 0]
                );
                console.log(`📝 Приз также записан в user_prizes для истории`);
                
                // Если приз - звезды, начисляем их
                if (prizeData.type === 'stars' && prizeData.value > 0) {
                    await client.query(
                        'UPDATE users SET stars = stars + $1, total_stars_earned = total_stars_earned + $1 WHERE telegram_id = $2',
                        [prizeData.value, telegramId]
                    );
                    finalBalance += prizeData.value;
                    console.log(`⭐ Начислено ${prizeData.value} звезд, новый баланс: ${finalBalance}`);
                    
                    // Записываем транзакцию начисления
                    await client.query(
                        `INSERT INTO stars_transactions 
                         (user_id, amount, transaction_type, status, metadata)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [userId, prizeData.value, 'prize_won', 'completed',
                         JSON.stringify({
                            prizeType: prizeData.type,
                            prizeName: prizeData.name,
                            timestamp: Date.now()
                         })]
                    );
                }
            }
            
            // 4. Обновляем статистику
            await client.query(
                `UPDATE users 
                 SET total_spins = total_spins + 1,
                     prizes_won = prizes_won + $1
                 WHERE telegram_id = $2`,
                [prizeData.type !== 'empty' ? 1 : 0, telegramId]
            );
            
            // 5. Добавляем в историю спинов
            await client.query(
                `INSERT INTO spin_history 
                 (user_id, spin_type, prize_name, prize_type, prize_value)
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, spinType, prizeData.name || prizeData.description, prizeData.type, prizeData.value || 0]
            );
            
            await client.query('COMMIT');
            console.log('✅ Транзакция спина успешно завершена');
            
            // Получаем актуальный баланс после всех операций
            const actualBalanceResult = await client.query(
                'SELECT stars FROM users WHERE telegram_id = $1',
                [telegramId]
            );
            const actualBalance = actualBalanceResult.rows[0]?.stars || 0;
            
            console.log(`🔍 Финальная проверка баланса: расчетный=${finalBalance}, актуальный=${actualBalance}`);
            
            return {
                success: true,
                prizeId: prizeId,
                newBalance: actualBalance // Возвращаем актуальный баланс из БД
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Ошибка транзакции спина:', error);
            throw error;
        } finally {
            client.release();
        }
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

    // Проверить существование реферальной связи
    async getReferral(referrerId, referredId) {
        try {
            const query = `
                SELECT * FROM referrals 
                WHERE referrer_id = $1 AND referred_id = $2
            `;
            const result = await this.pool.query(query, [referrerId, referredId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Ошибка получения реферала:', error);
            return null;
        }
    }

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

    // === МЕТОДЫ ДЛЯ АВТОМАТИЗАЦИИ ===

    async getChannelsWithLowActivity() {
        const query = `
            SELECT pc.*, 
                   COUNT(ucs.id) as subscription_count,
                   EXTRACT(EPOCH FROM (NOW() - pc.created_date)) / 3600 as hours_active
            FROM partner_channels pc
            LEFT JOIN user_channel_subscriptions ucs ON pc.id = ucs.channel_id 
                AND ucs.subscribed_date >= NOW() - INTERVAL '24 hours'
            WHERE pc.is_active = true 
                AND pc.created_date <= NOW() - INTERVAL '6 hours'
            GROUP BY pc.id, pc.created_date
            HAVING COUNT(ucs.id) < 2 AND EXTRACT(EPOCH FROM (NOW() - pc.created_date)) / 3600 >= 6
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    async getExpiredTimeChannels() {
        const query = `
            SELECT * FROM partner_channels 
            WHERE placement_type = 'time' 
            AND is_active = true 
            AND created_date + (placement_duration::text || ' hours')::INTERVAL <= NOW()
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    async getCompletedTargetChannels() {
        const query = `
            SELECT * FROM partner_channels 
            WHERE placement_type = 'target' 
            AND is_active = true 
            AND current_subscribers >= target_subscribers
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    async getEffectiveChannelsForRenewal() {
        const query = `
            SELECT pc.*, 
                   COUNT(ucs.id) as total_subscriptions,
                   EXTRACT(EPOCH FROM (NOW() - pc.created_date)) / 3600 as hours_active
            FROM partner_channels pc
            LEFT JOIN user_channel_subscriptions ucs ON pc.id = ucs.channel_id
            WHERE pc.placement_type = 'time' 
                AND pc.is_active = true
                AND pc.created_date + (pc.placement_duration::text || ' hours')::INTERVAL <= NOW() + INTERVAL '2 hours'
                AND pc.auto_renewal = true
            GROUP BY pc.id, pc.created_date, pc.placement_duration, pc.placement_type, pc.is_active, pc.auto_renewal
            HAVING COUNT(ucs.id) >= 10 OR (COUNT(ucs.id)::FLOAT / (EXTRACT(EPOCH FROM (NOW() - pc.created_date)) / 3600)) >= 0.5
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }


    async getActiveSubscriptions() {
        const query = `
            SELECT ucs.*, u.telegram_id, pc.channel_username, pc.channel_name
            FROM user_channel_subscriptions ucs
            JOIN users u ON ucs.user_id = u.id  
            JOIN partner_channels pc ON ucs.channel_id = pc.id
            WHERE ucs.is_active = true AND ucs.is_verified = true
            AND ucs.subscribed_date <= NOW() - INTERVAL '1 hour'
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    async getAllActiveUsers() {
        const query = 'SELECT id, telegram_id FROM users WHERE is_active = true';
        const result = await this.pool.query(query);
        return result.rows;
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
            (user_id, amount, transaction_type, status, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [
            user.id,
            amount,
            type,
            'completed',
            JSON.stringify({ 
                description: description,
                balance_after: newBalance,
                timestamp: Date.now()
            })
        ]);
        
        return result.rows[0];
    }

    async getUserTransactions(telegramId, limit = 10) {
        const user = await this.getUser(telegramId);
        if (!user) return [];

        const query = `
            SELECT amount, transaction_type, transaction_date, status, metadata
            FROM stars_transactions 
            WHERE user_id = $1 
            ORDER BY transaction_date DESC
            LIMIT $2
        `;
        
        const result = await this.pool.query(query, [user.id, limit]);
        return result.rows;
    }

    async searchUsers(searchTerm) {
        const query = `
            SELECT telegram_id, username, first_name, last_name, stars, is_active
            FROM users 
            WHERE username ILIKE $1 
               OR first_name ILIKE $1 
               OR last_name ILIKE $1
               OR CAST(telegram_id AS TEXT) LIKE $1
            ORDER BY last_activity DESC
            LIMIT 50
        `;
        
        const result = await this.pool.query(query, [`%${searchTerm}%`]);
        return result.rows;
    }

    async getAllUsers(limit = 100, offset = 0) {
        const query = `
            SELECT telegram_id, username, first_name, last_name, stars, 
                   total_stars_earned, referrals, total_spins, is_active,
                   join_date, last_activity
            FROM users 
            ORDER BY join_date DESC
            LIMIT $1 OFFSET $2
        `;
        
        const result = await this.pool.query(query, [limit, offset]);
        return result.rows;
    }

    async getUsersCount() {
        const result = await this.pool.query('SELECT COUNT(*) as count FROM users');
        return parseInt(result.rows[0].count);
    }

    async banUser(telegramId, reason = 'Нарушение правил') {
        const query = `
            UPDATE users 
            SET is_active = false, 
                violation_count = violation_count + 1,
                tasks_ban_until = NOW() + INTERVAL '7 days'
            WHERE telegram_id = $1
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [telegramId]);
        
        if (result.rows.length > 0) {
            await this.addUserStars(telegramId, 0, 'ban', { reason, timestamp: Date.now() });
            return result.rows[0];
        }
        return null;
    }

    async unbanUser(telegramId) {
        const query = `
            UPDATE users 
            SET is_active = true, 
                tasks_ban_until = NULL
            WHERE telegram_id = $1
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [telegramId]);
        
        if (result.rows.length > 0) {
            await this.addUserStars(telegramId, 0, 'unban', { timestamp: Date.now() });
            return result.rows[0];
        }
        return null;
    }

    async setUserWinChance(telegramId, winChance, reason) {
        const query = `
            UPDATE users 
            SET win_chance = $2
            WHERE telegram_id = $1
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [telegramId, winChance]);
        
        if (result.rows.length > 0) {
            // Записываем лог изменения шанса победы
            await this.addTransaction(telegramId, 0, 'win_chance_change', 
                `Изменение шанса победы на ${winChance}%. Причина: ${reason}`
            );
            return result.rows[0];
        }
        return null;
    }

    async getUserWinChance(telegramId) {
        const query = 'SELECT win_chance FROM users WHERE telegram_id = $1';
        const result = await this.pool.query(query, [telegramId]);
        
        if (result.rows.length > 0) {
            return parseFloat(result.rows[0].win_chance) || 0.0;
        }
        return 0.0;
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
                            probability: 93, // РЕАЛЬНО 930 из 1000 прокруток (уменьшено из-за новых сертификатов)
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
                            probability: 0.3, // РЕАЛЬНО 3 из 1000 прокруток
                            description: 'Сертификат на 300 рублей в Золотое Яблоко',
                            value: 300
                        },
                        {
                            id: 'cert500_za',
                            name: 'Сертификат 500₽ ЗЯ',
                            type: 'certificate',
                            probability: 0.2, // РЕАЛЬНО 2 из 1000 прокруток
                            description: 'Сертификат на 500 рублей в Золотое Яблоко',
                            value: 500
                        },
                        {
                            id: 'cert500_wb',
                            name: 'Сертификат 500₽ WB',
                            type: 'certificate',
                            probability: 0.2, // РЕАЛЬНО 2 из 1000 прокруток
                            description: 'Сертификат на 500 рублей в Wildberries',
                            value: 500
                        },
                        {
                            id: 'cert1000_za',
                            name: 'Сертификат 1000₽ ЗЯ',
                            type: 'certificate',
                            probability: 0.1, // РЕАЛЬНО 1 из 1000 прокруток
                            description: 'Сертификат на 1000 рублей в Золотое Яблоко',
                            value: 1000
                        },
                        {
                            id: 'cert1000_wb',
                            name: 'Сертификат 1000₽ WB',
                            type: 'certificate',
                            probability: 0.1, // РЕАЛЬНО 1 из 1000 прокруток
                            description: 'Сертификат на 1000 рублей в Wildberries',
                            value: 1000
                        },
                        {
                            id: 'cert2000_za',
                            name: 'Сертификат 2000₽ ЗЯ',
                            type: 'certificate',
                            probability: 0.05, // РЕАЛЬНО 0.5 из 1000 прокруток
                            description: 'Сертификат на 2000 рублей в Золотое Яблоко',
                            value: 2000
                        },
                        {
                            id: 'cert2000_wb',
                            name: 'Сертификат 2000₽ WB',
                            type: 'certificate',
                            probability: 0.05, // РЕАЛЬНО 0.5 из 1000 прокруток
                            description: 'Сертификат на 2000 рублей в Wildberries',
                            value: 2000
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

    // === ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ДЛЯ АДМИН-БОТА ===

    async getSystemStats() {
        try {
            const stats = {};
            
            // Общая статистика пользователей
            const userStats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(*) FILTER (WHERE is_active = true) as active_users,
                    COUNT(*) FILTER (WHERE is_active = false) as banned_users,
                    SUM(stars) as total_stars,
                    SUM(total_spins) as total_spins,
                    AVG(stars) as avg_stars
                FROM users
            `);
            
            stats.users = userStats.rows[0];
            
            // Статистика транзакций за сегодня
            const todayTransactions = await this.pool.query(`
                SELECT 
                    COUNT(*) as count,
                    SUM(amount) as total_amount
                FROM stars_transactions 
                WHERE DATE(transaction_date) = CURRENT_DATE
            `);
            
            stats.today_transactions = todayTransactions.rows[0];
            
            return stats;
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            return null;
        }
    }

    async getRecentActivity(limit = 10) {
        const query = `
            SELECT u.telegram_id, u.username, u.first_name, 
                   st.amount, st.transaction_type, st.transaction_date
            FROM stars_transactions st
            JOIN users u ON st.user_id = u.id
            ORDER BY st.transaction_date DESC
            LIMIT $1
        `;
        
        const result = await this.pool.query(query, [limit]);
        return result.rows;
    }

    async cleanupOldData(days = 30) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Удаляем старые транзакции
            const transactionsResult = await client.query(`
                DELETE FROM stars_transactions 
                WHERE transaction_date < NOW() - INTERVAL '${days} days'
                RETURNING COUNT(*)
            `);
            
            // Удаляем старую историю спинов
            const spinsResult = await client.query(`
                DELETE FROM spin_history 
                WHERE spin_date < NOW() - INTERVAL '${days} days'
                RETURNING COUNT(*)
            `);
            
            await client.query('COMMIT');
            
            return {
                transactions_deleted: transactionsResult.rowCount || 0,
                spins_deleted: spinsResult.rowCount || 0
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async backupUsers() {
        try {
            const result = await this.pool.query(`
                SELECT telegram_id, username, first_name, stars, 
                       total_stars_earned, referrals, total_spins, 
                       join_date, is_active
                FROM users 
                ORDER BY join_date ASC
            `);
            
            return result.rows;
        } catch (error) {
            console.error('Ошибка создания бэкапа:', error);
            return [];
        }
    }

    // === МЕТОДЫ ДЛЯ ПРОМОКОДОВ ===

    async createPromoCode(code, starsAmount, maxUses = null) {
        const query = `
            INSERT INTO promo_codes (code, stars_amount, max_uses)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [code.toUpperCase(), starsAmount, maxUses]);
        return result.rows[0];
    }

    async getActivePromoCodes() {
        const query = `
            SELECT p.*, COUNT(pu.user_id) as used_count
            FROM promo_codes p
            LEFT JOIN promo_usage pu ON p.code = pu.promo_code
            WHERE p.is_active = true
            GROUP BY p.id, p.code, p.stars_amount, p.max_uses, p.current_uses, p.is_active, p.created_date, p.expires_date
            ORDER BY p.created_date DESC
        `;
        
        const result = await this.pool.query(query);
        return result.rows;
    }

    async usePromoCode(telegramId, promoCode) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Получаем пользователя
            const userResult = await client.query(
                'SELECT id FROM users WHERE telegram_id = $1',
                [telegramId]
            );
            
            if (!userResult.rows[0]) {
                throw new Error('Пользователь не найден');
            }
            
            const userId = userResult.rows[0].id;
            
            // Проверяем промокод
            const promoResult = await client.query(
                'SELECT * FROM promo_codes WHERE code = $1 AND is_active = true',
                [promoCode.toUpperCase()]
            );
            
            if (!promoResult.rows[0]) {
                throw new Error('Промокод не найден или неактивен');
            }
            
            const promo = promoResult.rows[0];
            
            // Проверяем лимит использований
            if (promo.max_uses && promo.current_uses >= promo.max_uses) {
                throw new Error('Промокод исчерпан');
            }
            
            // Проверяем, не использовал ли уже этот пользователь
            const usageCheck = await client.query(
                'SELECT id FROM promo_usage WHERE user_id = $1 AND promo_code = $2',
                [userId, promoCode.toUpperCase()]
            );
            
            if (usageCheck.rows[0]) {
                throw new Error('Промокод уже использован');
            }
            
            // Записываем использование
            await client.query(
                'INSERT INTO promo_usage (user_id, promo_code, stars_received) VALUES ($1, $2, $3)',
                [userId, promoCode.toUpperCase(), promo.stars_amount]
            );
            
            // Обновляем счетчик использований
            await client.query(
                'UPDATE promo_codes SET current_uses = current_uses + 1 WHERE code = $1',
                [promoCode.toUpperCase()]
            );
            
            // Начисляем звезды пользователю
            await client.query(
                'UPDATE users SET stars = stars + $1, total_stars_earned = total_stars_earned + $1 WHERE telegram_id = $2',
                [promo.stars_amount, telegramId]
            );
            
            // Записываем транзакцию
            await client.query(
                `INSERT INTO stars_transactions 
                 (user_id, amount, transaction_type, status, metadata)
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, promo.stars_amount, 'promo_code', 'completed',
                 JSON.stringify({ promoCode: promoCode.toUpperCase(), timestamp: Date.now() })]
            );
            
            await client.query('COMMIT');
            
            return {
                success: true,
                stars: promo.stars_amount,
                code: promoCode.toUpperCase()
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // === МЕТОДЫ ДЛЯ КАНАЛОВ-ПАРТНЕРОВ ===

    async recordChannelSubscription(userId, channelUsername) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Найти канал по username
            const channelResult = await client.query(
                'SELECT id, reward_stars FROM partner_channels WHERE channel_username = $1 AND is_active = true',
                [channelUsername]
            );
            
            if (!channelResult.rows || channelResult.rows.length === 0) {
                console.log(`⚠️ Канал @${channelUsername} не найден или не активен`);
                return { success: false, error: 'Channel not found' };
            }
            
            const channel = channelResult.rows[0];
            
            // Проверить, не записана ли уже подписка
            const existingSubscription = await client.query(
                'SELECT id FROM user_channel_subscriptions WHERE user_id = $1 AND channel_id = $2',
                [userId, channel.id]
            );
            
            if (existingSubscription.rows && existingSubscription.rows.length > 0) {
                console.log(`ℹ️ Подписка уже существует для user_id=${userId}, channel_id=${channel.id}`);
                await client.query('COMMIT');
                return { success: true, alreadyExists: true };
            }
            
            // Записать новую подписку
            await client.query(
                'INSERT INTO user_channel_subscriptions (user_id, channel_id, is_active, is_verified, stars_earned) VALUES ($1, $2, $3, $4, $5)',
                [userId, channel.id, true, true, channel.reward_stars || 0]
            );
            
            await client.query('COMMIT');
            console.log(`✅ Подписка записана: user_id=${userId}, channel_id=${channel.id}`);
            return { success: true, channelId: channel.id, rewardStars: channel.reward_stars };
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Ошибка записи подписки:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getActiveChannels() {
        const query = `
            SELECT * FROM partner_channels 
            WHERE is_active = true 
            ORDER BY is_hot_offer DESC, created_date DESC
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    async getAllChannels() {
        const query = `
            SELECT pc.*, 
                   COUNT(DISTINCT ucs.user_id) as total_subscribers,
                   CASE 
                       WHEN pc.placement_type = 'time' AND pc.start_date > NOW() THEN 'scheduled'
                       WHEN pc.placement_type = 'time' AND pc.start_date + (pc.placement_duration::text || ' hours')::INTERVAL < NOW() THEN 'expired'
                       WHEN pc.placement_type = 'target' AND pc.current_subscribers >= pc.target_subscribers THEN 'completed'
                       WHEN pc.is_active = false THEN 'inactive'
                       WHEN pc.is_active = true THEN 'active'
                       ELSE 'unknown'
                   END as status,
                   CASE 
                       WHEN pc.placement_type = 'time' THEN 
                           pc.start_date + (pc.placement_duration::text || ' hours')::INTERVAL
                       ELSE NULL
                   END as end_date
            FROM partner_channels pc
            LEFT JOIN user_channel_subscriptions ucs ON pc.id = ucs.channel_id AND ucs.is_active = true
            GROUP BY pc.id
            ORDER BY pc.created_date DESC
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    async addChannel(channelData) {
        const { 
            username, 
            name, 
            stars, 
            placement_type = 'time',
            placement_duration = null,
            target_subscribers = null,
            is_hot_offer = false,
            hot_offer_multiplier = 2.0,
            auto_renewal = false,
            start_date = null,
            channel_id = null,
            description = null,
            avatar_url = null
        } = channelData;
        
        const query = `
            INSERT INTO partner_channels 
            (channel_username, channel_name, channel_id, reward_stars, 
             placement_type, placement_duration, target_subscribers,
             is_hot_offer, hot_offer_multiplier, auto_renewal,
             is_active, start_date, channel_description, channel_avatar_url) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (channel_username) 
            DO UPDATE SET 
                channel_name = EXCLUDED.channel_name,
                channel_id = COALESCE(EXCLUDED.channel_id, partner_channels.channel_id),
                reward_stars = EXCLUDED.reward_stars,
                placement_type = EXCLUDED.placement_type,
                placement_duration = EXCLUDED.placement_duration,
                target_subscribers = EXCLUDED.target_subscribers,
                is_hot_offer = EXCLUDED.is_hot_offer,
                hot_offer_multiplier = EXCLUDED.hot_offer_multiplier,
                auto_renewal = EXCLUDED.auto_renewal,
                is_active = true,
                start_date = EXCLUDED.start_date,
                channel_description = EXCLUDED.channel_description,
                channel_avatar_url = EXCLUDED.channel_avatar_url,
                updated_at = NOW()
            RETURNING *
        `;
        
        const params = [
            username, 
            name, 
            channel_id,
            stars, 
            placement_type,
            placement_duration,
            target_subscribers,
            is_hot_offer,
            hot_offer_multiplier,
            auto_renewal,
            true, // is_active
            start_date || new Date(),
            description,
            avatar_url
        ];
        
        const result = await this.pool.query(query, params);
        return result.rows[0];
    }

    async removeChannel(username) {
        const query = `
            UPDATE partner_channels 
            SET is_active = false, deactivated_at = NOW(), deactivation_reason = 'manual_removal'
            WHERE channel_username = $1
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [username]);
        return result.rowCount;
    }

    async setHotChannel(username) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Убираем hot статус у всех
            await client.query('UPDATE partner_channels SET is_hot_offer = false');
            
            // Устанавливаем hot статус для выбранного канала
            const result = await client.query(`
                UPDATE partner_channels 
                SET is_hot_offer = true, end_date = NOW() + INTERVAL '1 hour'
                WHERE channel_username = $1 AND is_active = true
                RETURNING *
            `, [username]);
            
            await client.query('COMMIT');
            return result.rowCount;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getActiveHotOffers() {
        const query = `
            SELECT * FROM partner_channels 
            WHERE is_active = true AND is_hot_offer = true
            AND (end_date IS NULL OR end_date > NOW())
            ORDER BY created_date DESC
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    // === МЕТОДЫ ДЛЯ ЗАДАНИЙ ===

    async getUserWithTasks(telegramId) {
        const query = `
            SELECT u.*, 
                   COALESCE(u.completed_tasks, '[]') as completed_tasks,
                   COALESCE(u.task_statuses, '{}') as task_statuses
            FROM users u 
            WHERE u.telegram_id = $1
        `;
        const result = await this.pool.query(query, [telegramId]);
        
        if (result.rows[0]) {
            const user = result.rows[0];
            try {
                user.completed_tasks = JSON.parse(user.completed_tasks);
                user.task_statuses = JSON.parse(user.task_statuses);
            } catch (e) {
                user.completed_tasks = [];
                user.task_statuses = {};
            }
            return user;
        }
        return null;
    }

    async getDailyTasksForUser(telegramId) {
        // Простые ежедневные задания
        const dailyTasks = [
            {
                id: 'daily_login',
                name: 'Ежедневный вход',
                description: 'Заходите в приложение каждый день',
                reward_stars: 10,
                completed: true
            }
        ];
        return dailyTasks;
    }

    // === МЕТОДЫ ДЛЯ ЛИДЕРБОРДА ===

    async getLeaderboard(limit = 10) {
        const query = `
            SELECT u.telegram_id, u.username, u.first_name,
                   u.total_stars_earned, u.total_spins, u.referrals,
                   ROW_NUMBER() OVER (ORDER BY u.total_stars_earned DESC) as rank
            FROM users u
            WHERE u.is_active = true
            ORDER BY u.total_stars_earned DESC
            LIMIT $1
        `;
        const result = await this.pool.query(query, [limit]);
        return result.rows;
    }

    async updateLeaderboard(telegramId) {
        const user = await this.getUser(telegramId);
        if (!user) return false;

        const query = `
            INSERT INTO leaderboard (user_id, display_name, stars_earned, spins_count, referrals_count)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                display_name = EXCLUDED.display_name,
                stars_earned = EXCLUDED.stars_earned,
                spins_count = EXCLUDED.spins_count,
                referrals_count = EXCLUDED.referrals_count,
                last_updated = NOW()
        `;
        
        await this.pool.query(query, [
            user.id,
            user.first_name || user.username || `User${user.telegram_id}`,
            user.total_stars_earned,
            user.total_spins,
            user.referrals
        ]);
        
        return true;
    }

    async getUserRank(telegramId) {
        const query = `
            WITH ranked_users AS (
                SELECT telegram_id, 
                       ROW_NUMBER() OVER (ORDER BY total_stars_earned DESC) as rank
                FROM users 
                WHERE is_active = true
            )
            SELECT rank FROM ranked_users WHERE telegram_id = $1
        `;
        const result = await this.pool.query(query, [telegramId]);
        return result.rows[0]?.rank || null;
    }

    async getReferralsLeaderboard(limit = 10) {
        const query = `
            SELECT 
                u.telegram_id, 
                u.username, 
                u.first_name,
                COALESCE(
                    (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id),
                    0
                ) as referrals_count,
                ROW_NUMBER() OVER (
                    ORDER BY 
                        COALESCE(
                            (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id),
                            0
                        ) DESC
                ) as rank
            FROM users u
            WHERE u.is_active = true
            ORDER BY 
                COALESCE(
                    (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id),
                    0
                ) DESC, u.id ASC
            LIMIT $1
        `;
        const result = await this.pool.query(query, [limit]);
        return result.rows;
    }

    async getGlobalReferralsLeaderboard(limit = 10) {
        return this.getReferralsLeaderboard(limit);
    }

    async getUserReferralRank(telegramId) {
        const query = `
            WITH ranked_users AS (
                SELECT 
                    u.telegram_id, 
                    COALESCE(
                        (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id),
                        0
                    ) as referrals_count,
                    ROW_NUMBER() OVER (
                        ORDER BY 
                            COALESCE(
                                (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id),
                                0
                            ) DESC, u.id ASC
                    ) as rank
                FROM users u
                WHERE u.is_active = true
            )
            SELECT rank FROM ranked_users WHERE telegram_id = $1
        `;
        const result = await this.pool.query(query, [telegramId]);
        return result.rows[0]?.rank || null;
    }

    async updateReferralCount(telegramId) {
        try {
            const user = await this.getUser(telegramId);
            if (!user) {
                console.log(`⚠️ Пользователь ${telegramId} не найден для обновления рефералов`);
                return 0;
            }

            // Подсчитываем актуальное количество рефералов
            const countQuery = `
                SELECT COUNT(*) as total_referrals
                FROM referrals r
                JOIN users u ON r.referred_id = u.id
                WHERE r.referrer_id = $1 AND u.is_active = true
            `;
            
            const countResult = await this.pool.query(countQuery, [user.id]);
            const actualCount = parseInt(countResult.rows[0].total_referrals) || 0;

            // Обновляем счетчик в таблице users
            const updateQuery = `
                UPDATE users 
                SET referrals = $1, last_activity = CURRENT_TIMESTAMP 
                WHERE telegram_id = $2
                RETURNING referrals
            `;
            
            const updateResult = await this.pool.query(updateQuery, [actualCount, telegramId]);
            
            console.log(`📊 Обновлен счетчик рефералов для ${telegramId}: ${actualCount}`);
            return actualCount;
        } catch (error) {
            console.error('❌ Ошибка обновления счетчика рефералов:', error);
            return 0;
        }
    }

    async debugUserReferrals(telegramId) {
        const user = await this.getUser(telegramId);
        if (!user) return null;

        // Получаем всех рефералов пользователя
        const query = `
            SELECT r.*, u.telegram_id, u.first_name, u.is_active
            FROM referrals r
            JOIN users u ON r.referred_id = u.id
            WHERE r.referrer_id = $1
            ORDER BY r.referral_date DESC
        `;
        
        const result = await this.pool.query(query, [user.id]);
        
        return {
            user_id: telegramId,
            total_referrals: user.referrals,
            actual_referrals: result.rows,
            discrepancy: user.referrals !== result.rows.length
        };
    }

    async syncAllReferralCounts() {
        const query = `
            UPDATE users 
            SET referrals = (
                SELECT COUNT(*) 
                FROM referrals r 
                WHERE r.referrer_id = users.id AND r.is_active = true
            )
            WHERE id IN (
                SELECT DISTINCT referrer_id 
                FROM referrals 
                WHERE referrer_id IS NOT NULL
            )
        `;
        
        const result = await this.pool.query(query);
        return result.rowCount;
    }

    // === АВТОМАТИЧЕСКОЕ ПОЛУЧЕНИЕ ИНФОРМАЦИИ О КАНАЛЕ ===
    
    async getChannelInfoFromTelegram(bot, channelUsername) {
        try {
            console.log(`🔍 Получение информации о канале @${channelUsername} через Telegram API...`);
            
            // Очищаем username от символов
            const cleanUsername = channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`;
            
            // Получаем информацию о чате
            const chatInfo = await bot.getChat(cleanUsername);
            console.log(`✅ Информация о канале получена:`, {
                id: chatInfo.id,
                title: chatInfo.title,
                type: chatInfo.type,
                description: chatInfo.description?.substring(0, 100) + '...',
                has_photo: !!chatInfo.photo
            });
            
            let avatarUrl = null;
            
            // Получаем аватарку канала если есть
            if (chatInfo.photo) {
                try {
                    console.log(`📷 Структура photo объекта:`, chatInfo.photo);
                    
                    // Пробуем получить файл по big_file_id
                    const fileId = chatInfo.photo.big_file_id || chatInfo.photo.small_file_id;
                    if (fileId) {
                        const photoFile = await bot.getFile(fileId);
                        // Получаем токен из переменной окружения или из бота
                        const botToken = process.env.BOT_TOKEN || bot.token;
                        avatarUrl = `https://api.telegram.org/file/bot${botToken}/${photoFile.file_path}`;
                        console.log(`🖼️ Аватарка канала найдена: ${avatarUrl}`);
                    } else {
                        console.warn(`⚠️ Не найден file_id для аватарки @${channelUsername}`);
                    }
                } catch (photoError) {
                    console.error(`❌ Ошибка получения файла аватарки для @${channelUsername}:`, photoError.message);
                    
                    // Проверим права бота
                    if (photoError.message.includes('Forbidden') || photoError.message.includes('400')) {
                        console.warn(`⚠️ Возможно, бот не является участником канала @${channelUsername}`);
                        console.warn(`💡 Для получения аватарки канала, бот должен быть добавлен в канал как администратор`);
                    }
                }
            } else {
                console.log(`📷 У канала @${channelUsername} нет аватарки или нет доступа к ней`);
            }
            
            return {
                channel_id: chatInfo.id.toString(),
                channel_name: chatInfo.title || channelUsername,
                channel_description: chatInfo.description || null,
                channel_avatar_url: avatarUrl,
                type: chatInfo.type,
                members_count: chatInfo.members_count || null
            };
            
        } catch (error) {
            console.error(`❌ Ошибка получения информации о канале @${channelUsername}:`, error.message);
            
            // Дополнительная диагностика
            if (error.message.includes('Bad Request: chat not found')) {
                console.warn(`⚠️ Канал @${channelUsername} не найден или недоступен`);
            } else if (error.message.includes('Forbidden')) {
                console.warn(`⚠️ Нет доступа к каналу @${channelUsername} - бот должен быть участником канала`);
            }
            
            // Возвращаем базовую информацию если API недоступно
            return {
                channel_id: null,
                channel_name: channelUsername,
                channel_description: null,
                channel_avatar_url: null,
                type: 'channel',
                members_count: null,
                error: error.message
            };
        }
    }

    // === МЕТОДЫ ДЛЯ ПРИГЛАСИТЕЛЬНЫХ ССЫЛОК ===

    async saveInviteLink(channelId, inviteLink, linkName, memberLimit, expireDate, createsJoinRequest = false) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                UPDATE partner_channels 
                SET invite_link = $2, 
                    invite_link_name = $3, 
                    invite_member_limit = $4, 
                    invite_expire_date = $5,
                    invite_creates_join_request = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 
                RETURNING *
            `, [channelId, inviteLink, linkName, memberLimit, expireDate, createsJoinRequest]);

            console.log(`✅ Пригласительная ссылка сохранена для канала ID ${channelId}`);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Ошибка сохранения пригласительной ссылки:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async revokeInviteLink(channelId) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                UPDATE partner_channels 
                SET invite_link = NULL, 
                    invite_link_name = NULL, 
                    invite_member_limit = NULL, 
                    invite_expire_date = NULL,
                    invite_creates_join_request = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 
                RETURNING *
            `, [channelId]);

            console.log(`✅ Пригласительная ссылка отозвана для канала ID ${channelId}`);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Ошибка отзыва пригласительной ссылки:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async incrementJoinedViaInvite(channelId) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                UPDATE partner_channels 
                SET joined_via_invite = COALESCE(joined_via_invite, 0) + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 
                RETURNING joined_via_invite, invite_member_limit, target_subscribers
            `, [channelId]);

            const channel = result.rows[0];
            console.log(`✅ Счетчик присоединившихся увеличен для канала ID ${channelId}: ${channel.joined_via_invite}`);
            
            // Проверяем, достигнут ли лимит
            if (channel.invite_member_limit && channel.joined_via_invite >= channel.invite_member_limit) {
                console.log(`🎯 Достигнут лимит пригласительной ссылки для канала ID ${channelId}`);
                return { ...channel, limitReached: true };
            }

            // Проверяем, достигнута ли цель для целевого канала
            if (channel.target_subscribers && channel.joined_via_invite >= channel.target_subscribers) {
                console.log(`🎯 Достигнута цель для целевого канала ID ${channelId}`);
                return { ...channel, targetReached: true };
            }

            return { ...channel, limitReached: false, targetReached: false };
        } catch (error) {
            console.error('❌ Ошибка увеличения счетчика присоединений:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getChannelByInviteLink(inviteLink) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM partner_channels WHERE invite_link = $1',
                [inviteLink]
            );

            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Ошибка поиска канала по пригласительной ссылке:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getChannelByChatId(chatId) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM partner_channels WHERE channel_id = $1',
                [chatId.toString()]
            );

            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Ошибка поиска канала по chat_id:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async deactivateChannelByLimit(channelId, reason = 'invite_limit_reached') {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                UPDATE partner_channels 
                SET is_active = FALSE,
                    deactivation_reason = $2,
                    deactivated_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 
                RETURNING *
            `, [channelId, reason]);

            console.log(`🔄 Канал ID ${channelId} деактивирован по причине: ${reason}`);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Ошибка деактивации канала:', error);
            throw error;
        } finally {
            client.release();
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
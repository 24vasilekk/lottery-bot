const { Client } = require('pg');

async function testProblematicQueries() {
    const client = new Client({
        connectionString: 'postgresql://postgres:xoIMWOtNInnWGHXnxiYCEBVmpUBcisbo@gondola.proxy.rlwy.net:59145/railway',
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('✅ Подключение к БД установлено\n');

        // Тест 1: Запрос призов (который давал ошибку 500)
        console.log('🎁 Тест 1: API призов');
        try {
            const prizesQuery = `
                SELECT p.id, p.user_id, p.type, p.description, p.is_given, p.created_at, p.given_at,
                       u.first_name as user_first_name,
                       u.last_name as user_last_name,
                       u.username as user_username
                FROM prizes p
                LEFT JOIN users u ON p.user_id = u.id
                ORDER BY p.created_at DESC 
                LIMIT 10
            `;
            const prizesResult = await client.query(prizesQuery);
            console.log(`✅ Найдено ${prizesResult.rows.length} призов`);
            console.table(prizesResult.rows.slice(0, 3));
        } catch (err) {
            console.error('❌ Ошибка запроса призов:', err.message);
        }

        // Тест 2: Запрос пользователей
        console.log('\n👥 Тест 2: API пользователей');
        try {
            const usersQuery = `
                SELECT u.id, u.telegram_id, u.first_name, u.username, u.stars, u.join_date, u.last_activity,
                       COUNT(DISTINCT p2.id) as total_spins,
                       COUNT(DISTINCT ucs.channel_id) as subscriptions_count,
                       COUNT(DISTINCT p.id) as prizes_won
                FROM users u
                LEFT JOIN prizes p2 ON u.id = p2.user_id
                LEFT JOIN user_channel_subscriptions ucs ON u.id = ucs.user_id
                LEFT JOIN prizes p ON u.id = p.user_id AND p.is_given = true
                GROUP BY u.id, u.telegram_id
                ORDER BY u.id DESC
                LIMIT 5
            `;
            const usersResult = await client.query(usersQuery);
            console.log(`✅ Найдено ${usersResult.rows.length} пользователей`);
            console.table(usersResult.rows);
        } catch (err) {
            console.error('❌ Ошибка запроса пользователей:', err.message);
        }

        // Тест 3: Запрос конкретного пользователя
        console.log('\n👤 Тест 3: Конкретный пользователь');
        try {
            const userId = 6671460008; // Telegram ID из логов
            const userDetailQuery = `
                SELECT u.*, 
                       COUNT(DISTINCT p2.id) as total_spins,
                       COUNT(DISTINCT ucs.channel_id) as subscriptions_count,
                       COUNT(DISTINCT p.id) as prizes_won,
                       COALESCE(SUM(CASE WHEN p2.created_at > CURRENT_DATE THEN 1 ELSE 0 END), 0) as spins_today
                FROM users u
                LEFT JOIN prizes p2 ON u.id = p2.user_id
                LEFT JOIN user_channel_subscriptions ucs ON u.id = ucs.user_id
                LEFT JOIN prizes p ON u.id = p.user_id AND p.is_given = true
                WHERE u.telegram_id = $1
                GROUP BY u.id, u.telegram_id
            `;
            const userResult = await client.query(userDetailQuery, [userId]);
            
            if (userResult.rows.length > 0) {
                console.log(`✅ Пользователь ${userId} найден`);
                console.table(userResult.rows);
                
                // Получаем последние призы пользователя
                const userPrizesQuery = `
                    SELECT id, type as prize_type, description as prize_name, created_at
                    FROM prizes 
                    WHERE user_id = $1 
                    ORDER BY created_at DESC 
                    LIMIT 10
                `;
                const userPrizesResult = await client.query(userPrizesQuery, [userResult.rows[0].id]);
                console.log(`🎁 У пользователя ${userPrizesResult.rows.length} призов`);
                console.table(userPrizesResult.rows);
            } else {
                console.log(`❌ Пользователь ${userId} не найден`);
            }
        } catch (err) {
            console.error('❌ Ошибка запроса пользователя:', err.message);
        }

        // Тест 4: Проверка статистики
        console.log('\n📊 Тест 4: Статистика');
        try {
            // Новые пользователи за сегодня
            const todayUsers = await client.query("SELECT COUNT(*) as count FROM users WHERE join_date > CURRENT_DATE");
            console.log(`👥 Новых пользователей сегодня: ${todayUsers.rows[0].count}`);
            
            // Активность по дням
            const activity = await client.query(`
                SELECT 
                    DATE(join_date) as date,
                    COUNT(*) as users
                FROM users 
                WHERE join_date >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY DATE(join_date)
                ORDER BY date
            `);
            console.log(`📈 Активность за 7 дней: ${activity.rows.length} дней`);
            console.table(activity.rows);
        } catch (err) {
            console.error('❌ Ошибка статистики:', err.message);
        }

    } catch (error) {
        console.error('❌ Общая ошибка:', error.message);
    } finally {
        await client.end();
    }
}

testProblematicQueries();
const { Client } = require('pg');

async function checkDatabase() {
    const client = new Client({
        connectionString: 'postgresql://postgres:xoIMWOtNInnWGHXnxiYCEBVmpUBcisbo@gondola.proxy.rlwy.net:59145/railway',
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔌 Подключаемся к PostgreSQL...');
        await client.connect();
        console.log('✅ Подключение успешно!\n');

        // Проверяем схему таблицы users
        console.log('📋 Схема таблицы users:');
        const usersSchema = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        console.table(usersSchema.rows);

        // Проверяем количество записей
        console.log('\n📊 Статистика таблиц:');
        const userCount = await client.query('SELECT COUNT(*) as count FROM users');
        const prizesCount = await client.query('SELECT COUNT(*) as count FROM prizes');
        
        console.log(`👥 Пользователей: ${userCount.rows[0].count}`);
        console.log(`🎁 Призов: ${prizesCount.rows[0].count}`);

        // Проверяем первых пользователей
        console.log('\n👤 Первые 3 пользователя:');
        const firstUsers = await client.query('SELECT id, telegram_id, first_name, join_date FROM users ORDER BY id LIMIT 3');
        console.table(firstUsers.rows);

        // Проверяем последних пользователей
        console.log('\n👤 Последние 3 пользователя:');
        const lastUsers = await client.query('SELECT id, telegram_id, first_name, join_date FROM users ORDER BY id DESC LIMIT 3');
        console.table(lastUsers.rows);

        // Проверяем первые призы
        console.log('\n🎁 Первые 3 приза:');
        const firstPrizes = await client.query('SELECT id, user_id, type, description, created_at FROM prizes ORDER BY id LIMIT 3');
        console.table(firstPrizes.rows);

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    } finally {
        await client.end();
        console.log('\n🔌 Соединение закрыто');
    }
}

checkDatabase();
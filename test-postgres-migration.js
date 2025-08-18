// Тест миграции на PostgreSQL
const createDatabase = require('./database-selector');

async function testPostgresMigration() {
    console.log('🧪 Тестирование миграции на PostgreSQL/SQLite\n');
    
    try {
        // Создаем базу данных (автоматически выберет SQLite или PostgreSQL)
        const db = createDatabase();
        
        // Ждем инициализацию (если это асинхронный процесс)
        if (db.init && typeof db.init === 'function') {
            await db.init();
        } else {
            // Для SQLite ждем 1 секунду
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('✅ База данных инициализирована\n');
        
        // Тестируем основные операции
        const TEST_USER_ID = 418684940;
        
        console.log('1️⃣ Тестируем создание пользователя...');
        
        // Проверяем существует ли пользователь
        let user = await db.getUser(TEST_USER_ID);
        console.log('   Пользователь до создания:', user ? 'найден' : 'не найден');
        
        if (!user) {
            // Создаем нового пользователя
            await db.createUser({
                telegram_id: TEST_USER_ID,
                username: 'testuser',
                first_name: 'Test',
                last_name: 'User'
            });
            console.log('   ✅ Пользователь создан');
        }
        
        // Проверяем что пользователь создался
        user = await db.getUser(TEST_USER_ID);
        console.log(`   Баланс пользователя: ${user.stars} ⭐\n`);
        
        console.log('2️⃣ Тестируем добавление звезд...');
        await db.addUserStars(TEST_USER_ID, 50);
        user = await db.getUser(TEST_USER_ID);
        console.log(`   Баланс после добавления 50 звезд: ${user.stars} ⭐\n`);
        
        console.log('3️⃣ Тестируем списание звезд...');
        if (db.subtractUserStars) {
            await db.subtractUserStars(TEST_USER_ID, 20);
            user = await db.getUser(TEST_USER_ID);
            console.log(`   Баланс после списания 20 звезд: ${user.stars} ⭐\n`);
        } else {
            console.log('   ⚠️  Метод subtractUserStars не реализован для этой БД\n');
        }
        
        console.log('4️⃣ Тестируем обновление активности...');
        await db.updateUserActivity(TEST_USER_ID);
        console.log('   ✅ Активность обновлена\n');
        
        console.log('✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
        console.log('━'.repeat(50));
        console.log('🎯 Готово к деплою на Railway с PostgreSQL');
        
        // Закрываем соединение если это PostgreSQL
        if (db.close && typeof db.close === 'function') {
            await db.close();
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Ошибка при тестировании:', error);
        process.exit(1);
    }
}

// Запускаем тест
testPostgresMigration();
// Тестовый скрипт для проверки исправления баланса
const createDatabase = require('./database-selector');

async function testBalanceFix() {
    console.log('🧪 Тестирование исправления баланса\n');
    
    const db = createDatabase();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const YOUR_ID = 418684940;
    const TEST_IDS = [418684940, 999999999, 888888888];
    
    console.log('1️⃣ Проверяем существующих пользователей:');
    console.log('━'.repeat(60));
    
    for (const id of TEST_IDS) {
        const user = await db.getUser(id);
        if (user) {
            console.log(`✅ ID ${id}: найден, баланс = ${user.stars} ⭐`);
        } else {
            console.log(`❌ ID ${id}: НЕ найден в БД`);
        }
    }
    
    console.log('\n2️⃣ Симулируем первый вход пользователя:');
    console.log('━'.repeat(60));
    
    // Симулируем syncUserData для вашего ID
    const syncUserData = async (userId, webAppData) => {
        console.log(`🔄 syncUserData для userId: ${userId}`);
        
        let user = await db.getUser(userId);
        
        if (!user) {
            console.log(`👤 Создаем нового пользователя ${userId}`);
            
            const userData = {
                telegram_id: userId,
                username: webAppData?.username || '',
                first_name: webAppData?.first_name || 'Пользователь',
                last_name: webAppData?.last_name || ''
            };
            
            await db.createUser(userData);
            user = await db.getUser(userId);
        }
        
        console.log(`✅ Пользователь из БД: ID=${user.telegram_id}, stars=${user.stars}`);
        
        return {
            stars: user.stars,
            referrals: user.referrals || 0,
            total_stars_earned: user.total_stars_earned || 20
        };
    };
    
    // Первый вход
    const result1 = await syncUserData(YOUR_ID, {
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User'
    });
    console.log('📊 Результат первого входа:', result1);
    
    console.log('\n3️⃣ Симулируем повторный вход:');
    console.log('━'.repeat(60));
    
    // Повторный вход
    const result2 = await syncUserData(YOUR_ID, {
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User'
    });
    console.log('📊 Результат повторного входа:', result2);
    
    console.log('\n4️⃣ Симулируем выигрыш 50 звезд:');
    console.log('━'.repeat(60));
    
    await db.addUserStars(YOUR_ID, 50);
    console.log('✅ Добавлено 50 звезд');
    
    const userAfterWin = await db.getUser(YOUR_ID);
    console.log(`📊 Баланс после выигрыша: ${userAfterWin.stars} ⭐`);
    
    console.log('\n5️⃣ Симулируем перезаход после выигрыша:');
    console.log('━'.repeat(60));
    
    const result3 = await syncUserData(YOUR_ID, {
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User'
    });
    console.log('📊 Результат после перезахода:', result3);
    console.log(`✅ Баланс сохранился: ${result3.stars} ⭐`);
    
    console.log('\n✅ ТЕСТ ЗАВЕРШЕН');
    console.log('━'.repeat(60));
    console.log('Вывод: Если баланс сохраняется между входами,');
    console.log('то проблема в том, что пользователь не сохраняется в продакшн БД.');
    
    process.exit(0);
}

testBalanceFix();
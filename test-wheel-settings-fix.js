// test-wheel-settings-fix.js - Тест исправления таблицы wheel_settings
console.log('🛠️ ========== ТЕСТ ИСПРАВЛЕНИЯ WHEEL_SETTINGS ==========\n');

// Имитируем Railway окружение
process.env.DATABASE_URL = "postgresql://postgres:xoIMWOtNInnWGHXnxiYCEBVmpUBcisbo@postgres.railway.internal:5432/railway";

const createDatabase = require('./database-selector');

async function testWheelSettingsFix() {
    console.log('🔧 Тест исправления таблицы wheel_settings...\n');
    
    try {
        console.log('🐘 Подключение к PostgreSQL...');
        const db = createDatabase();
        
        // Инициализируем базу данных (создаст таблицы)
        if (db.init && typeof db.init === 'function') {
            await db.init();
            console.log('✅ База данных инициализирована');
        }
        
        console.log('\n🎯 Тестируем методы wheel_settings...');
        
        // 1. Проверяем, что можем получить настройки (должно быть null)
        console.log('1️⃣ Проверка получения настроек...');
        const existingNormal = await db.getWheelSettings('normal');
        console.log('Результат getWheelSettings("normal"):', existingNormal === null ? 'null (корректно)' : existingNormal);
        
        // 2. Тестируем сохранение настроек
        console.log('\n2️⃣ Тестируем сохранение настроек...');
        const testSettings = {
            prizes: [
                {
                    id: 'test',
                    name: 'Тест',
                    type: 'stars',
                    probability: 100,
                    value: 10
                }
            ]
        };
        
        await db.saveWheelSettings('test', testSettings);
        console.log('✅ Настройки сохранены');
        
        // 3. Проверяем получение сохраненных настроек
        console.log('\n3️⃣ Проверяем получение сохраненных настроек...');
        const savedSettings = await db.getWheelSettings('test');
        console.log('Сохраненные настройки:', savedSettings);
        
        if (savedSettings && savedSettings.prizes && savedSettings.prizes.length > 0) {
            console.log('✅ Настройки корректно получены из базы');
        } else {
            console.log('❌ Ошибка получения настроек');
        }
        
        // 4. Тестируем инициализацию реальных шансов
        console.log('\n4️⃣ Тестируем initializeRealWheelChances...');
        const initResult = await db.initializeRealWheelChances();
        
        if (initResult) {
            console.log('✅ initializeRealWheelChances выполнен успешно');
        } else {
            console.log('❌ Ошибка в initializeRealWheelChances');
        }
        
        console.log('\n✅ ========== ВСЕ ТЕСТЫ ПРОЙДЕНЫ ==========');
        
        if (db.close) await db.close();
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ ========== ОШИБКА ТЕСТА ==========');
        console.error('Ошибка:', error.message);
        console.error('Код ошибки:', error.code);
        console.error('Стек:', error.stack);
        process.exit(1);
    }
}

testWheelSettingsFix();
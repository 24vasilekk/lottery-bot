// Скрипт проверки окружения Railway
console.log('🚂 ========== ПРОВЕРКА ОКРУЖЕНИЯ RAILWAY ==========\n');

// Проверяем основные переменные Railway
const railwayVars = {
    'DATABASE_URL': process.env.DATABASE_URL,
    'RAILWAY_ENVIRONMENT': process.env.RAILWAY_ENVIRONMENT,
    'RAILWAY_PROJECT_NAME': process.env.RAILWAY_PROJECT_NAME,
    'RAILWAY_SERVICE_NAME': process.env.RAILWAY_SERVICE_NAME,
    'PORT': process.env.PORT,
    'NODE_ENV': process.env.NODE_ENV
};

console.log('🔍 Переменные окружения:');
Object.entries(railwayVars).forEach(([key, value]) => {
    if (key === 'DATABASE_URL' && value) {
        // Скрываем пароль в DATABASE_URL для безопасности
        const maskedUrl = value.replace(/:([^@]+)@/, ':****@');
        console.log(`  ${key}: ${maskedUrl}`);
    } else {
        console.log(`  ${key}: ${value || 'НЕ УСТАНОВЛЕНА'}`);
    }
});

console.log('\n📊 Анализ:');

// Проверяем DATABASE_URL
if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не установлена!');
    console.log('   Это означает что будет использован SQLite');
    console.log('   Нужно установить DATABASE_URL на Railway');
} else if (process.env.DATABASE_URL.startsWith('postgres')) {
    console.log('✅ DATABASE_URL указывает на PostgreSQL');
} else {
    console.log('⚠️  DATABASE_URL установлена, но не PostgreSQL');
}

// Проверяем окружение Railway
const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_NAME);
console.log(`${isRailway ? '✅' : '❌'} Railway окружение ${isRailway ? 'обнаружено' : 'НЕ обнаружено'}`);

// Проверяем какую БД выберет selector
console.log('\n🎯 Тест database-selector:');
const createDatabase = require('./database-selector');
const db = createDatabase();

console.log('\n💡 РЕКОМЕНДАЦИИ:');
if (!process.env.DATABASE_URL) {
    console.log('1. Убедитесь что на Railway установлена переменная DATABASE_URL');
    console.log('2. Она должна начинаться с "postgresql://"');
    console.log('3. После установки перезапустите сервис на Railway');
} else {
    console.log('✅ DATABASE_URL корректно настроена');
    console.log('   PostgreSQL будет использоваться автоматически');
}

console.log('\n✅ ========== ПРОВЕРКА ЗАВЕРШЕНА ==========');
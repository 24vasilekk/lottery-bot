// database-selector.js - Автоматический выбор между SQLite и PostgreSQL

module.exports = function() {
    console.log('🔍 DATABASE_URL проверка:', {
        exists: !!process.env.DATABASE_URL,
        starts_with_postgres: process.env.DATABASE_URL?.startsWith('postgres'),
        railway_detected: !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_PROJECT_NAME
    });
    
    // ПРИНУДИТЕЛЬНО используем PostgreSQL для всех сред
    console.log('🐘 Принудительно используется PostgreSQL');
    console.log('📡 DATABASE_URL длина:', process.env.DATABASE_URL?.length || 0);
    
    // Если DATABASE_URL не установлен, используем значение по умолчанию для разработки
    if (!process.env.DATABASE_URL) {
        console.log('⚠️ DATABASE_URL не установлен - требуется настройка PostgreSQL');
        // Не падаем, пытаемся подключиться к PostgreSQL с пустым URL
        // Это заставит использовать переменные среды или значения по умолчанию
    }
    
    const DatabasePostgres = require('./database-postgres.js');
    return new DatabasePostgres();
};
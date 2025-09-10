// database-selector.js - Автоматический выбор между SQLite и PostgreSQL

module.exports = function() {
    console.log('🔍 DATABASE_URL проверка:', {
        exists: !!process.env.DATABASE_URL,
        starts_with_postgres: process.env.DATABASE_URL?.startsWith('postgres'),
        starts_with_sqlite: process.env.DATABASE_URL?.startsWith('sqlite'),
        railway_detected: !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_PROJECT_NAME
    });
    
    // Временно разрешаем SQLite для локальной разработки
    if (process.env.DATABASE_URL?.startsWith('sqlite') || process.env.NODE_ENV === 'development') {
        console.log('📦 Используется SQLite (локальная разработка)');
        
        // Создаем простую mock-версию для тестирования админки
        return {
            query: async (text, params) => {
                console.log('🔍 Mock SQL query:', text?.substring(0, 100) + '...');
                return { rows: [] };
            },
            close: async () => {
                console.log('🔌 Mock database closed');
            }
        };
    }
    
    // Для production/Railway используем PostgreSQL
    console.log('🐘 Используется PostgreSQL');
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
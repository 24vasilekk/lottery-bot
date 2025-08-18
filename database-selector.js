// database-selector.js - Автоматический выбор между SQLite и PostgreSQL

module.exports = function() {
    console.log('🔍 DATABASE_URL проверка:', {
        exists: !!process.env.DATABASE_URL,
        starts_with_postgres: process.env.DATABASE_URL?.startsWith('postgres'),
        railway_detected: !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_PROJECT_NAME
    });
    
    // Если есть DATABASE_URL или явно Railway - используем PostgreSQL
    if (process.env.DATABASE_URL || process.env.RAILWAY_ENVIRONMENT) {
        console.log('🐘 Используется PostgreSQL (Railway)');
        console.log('📡 DATABASE_URL длина:', process.env.DATABASE_URL?.length || 0);
        
        const DatabasePostgres = require('./database-postgres.js');
        return new DatabasePostgres();
    } else {
        console.log('📦 Используется SQLite (локальная разработка)');
        const Database = require('./database.js');
        return new Database();
    }
};
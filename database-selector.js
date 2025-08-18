// database-selector.js - Автоматический выбор между SQLite и PostgreSQL

module.exports = function() {
    // Если есть DATABASE_URL - используем PostgreSQL
    if (process.env.DATABASE_URL) {
        console.log('🐘 Используется PostgreSQL (Railway)');
        const DatabasePostgres = require('./database-postgres.js');
        return new DatabasePostgres();
    } else {
        console.log('📦 Используется SQLite (локальная разработка)');
        const Database = require('./database.js');
        return new Database();
    }
};
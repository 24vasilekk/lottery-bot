// health-check.js - Упрощенная проверка для Railway
console.log('🚀 Health Check запущен:', new Date().toISOString());
console.log('🔐 NODE_ENV:', process.env.NODE_ENV);
console.log('📡 PORT:', process.env.PORT);
console.log('🤖 BOT_TOKEN:', process.env.BOT_TOKEN ? 'SET' : 'MISSING');
console.log('🗄️ DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'MISSING');

try {
    // Минимальная проверка основных модулей
    require('express');
    require('node-telegram-bot-api');
    console.log('📦 Core modules: OK');
    
    // Проверяем только критичные файлы
    require('./database-selector');
    console.log('🗃️ Database selector: OK');
    
    console.log('✅ Health check completed successfully');
} catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
}
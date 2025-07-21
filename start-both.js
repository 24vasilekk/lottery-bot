// start-both.js - Запуск основного и админ-бота в одном процессе для Railway
console.log('🚀 Запуск Kosmetichka Lottery System...');
console.log('=====================================');

// Проверяем переменные окружения
const mainBotToken = process.env.BOT_TOKEN;
const adminBotToken = process.env.ADMIN_BOT_TOKEN;

if (!mainBotToken) {
    console.error('❌ BOT_TOKEN не установлен!');
    process.exit(1);
}

console.log('📋 Конфигурация:');
console.log(`   🤖 Основной бот: ${mainBotToken ? '✅' : '❌'}`);
console.log(`   👑 Админ-бот: ${adminBotToken ? '✅' : '❌ (опционально)'}`);
console.log(`   🌐 Порт: ${process.env.PORT || 3000}`);

// Запускаем основной сервер
require('./telegram-bot-server.js');

// Запускаем админ-бота только если есть токен
if (adminBotToken) {
    console.log('\n👑 Запуск админ-бота через 3 секунды...');
    
    // Задержка чтобы основной бот успел инициализироваться
    setTimeout(() => {
        try {
            // Меняем порт для админ-панели чтобы не было конфликта
            process.env.ADMIN_PORT = '3001';
            
            // Запускаем админ-бота в том же процессе
            require('./admin-bot.js');
            
            console.log('✅ Оба бота запущены успешно!');
        } catch (error) {
            console.error('❌ Ошибка запуска админ-бота:', error);
            console.log('⚠️  Основной бот продолжит работу без админ-панели');
        }
    }, 3000);
} else {
    console.log('\n⚠️  ADMIN_BOT_TOKEN не установлен - работает только основной бот');
    console.log('💡 Добавьте ADMIN_BOT_TOKEN в переменные Railway для активации админ-бота');
}
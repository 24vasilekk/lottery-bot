// Проверка переменных окружения
require('dotenv').config();

console.log('=== ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ===\n');

console.log('Основной бот:');
console.log('BOT_TOKEN:', process.env.BOT_TOKEN ? '✅ Установлен' : '❌ НЕ установлен');

console.log('\nАдмин-бот:');
console.log('ADMIN_BOT_TOKEN:', process.env.ADMIN_BOT_TOKEN ? '✅ Установлен' : '❌ НЕ установлен');
console.log('ADMIN_IDS:', process.env.ADMIN_IDS || '❌ НЕ установлен');
console.log('ADMIN_PORT:', process.env.ADMIN_PORT || '3001 (по умолчанию)');

console.log('\n=== ПРОВЕРКА ТОКЕНОВ ===');
if (process.env.BOT_TOKEN) {
    console.log('BOT_TOKEN: ✅ Установлен (длина:', process.env.BOT_TOKEN.length, 'символов)');
    // БЕЗОПАСНОСТЬ: Не логируем содержимое токена
}
if (process.env.ADMIN_BOT_TOKEN) {
    console.log('ADMIN_BOT_TOKEN: ✅ Установлен (длина:', process.env.ADMIN_BOT_TOKEN.length, 'символов)');
    // БЕЗОПАСНОСТЬ: Не логируем содержимое токена
}

console.log('\n💡 Подсказка: Убедитесь, что в .env файле нет пробелов вокруг знака =');
console.log('Правильно: ADMIN_BOT_TOKEN=1234567890:ABCdef...');
console.log('Неправильно: ADMIN_BOT_TOKEN = 1234567890:ABCdef...');
#!/usr/bin/env node

// Безопасный запуск бота с проверкой конфликтов
const { spawn, exec } = require('child_process');
const fs = require('fs');

console.log('🚀 Запуск Kosmetichka Lottery Bot (безопасный режим)');
console.log('================================================');

// Проверяем наличие основного файла
if (!fs.existsSync('./telegram-bot-server.js')) {
    console.error('❌ Файл telegram-bot-server.js не найден!');
    process.exit(1);
}

// Сначала останавливаем все запущенные экземпляры
console.log('🔄 Остановка всех запущенных экземпляров...');

exec('node stop-all-bots.js', (error, stdout, stderr) => {
    if (error) {
        console.log('⚠️  Ошибка при остановке процессов:', error.message);
    }
    
    console.log(stdout);
    
    // Ждем 3 секунды для полной остановки
    setTimeout(() => {
        console.log('🚀 Запуск нового экземпляра бота...');
        
        // Запускаем новый экземпляр
        const botProcess = spawn('node', ['telegram-bot-server.js'], {
            stdio: 'inherit',
            detached: false
        });
        
        // Обработка завершения процесса
        botProcess.on('close', (code) => {
            console.log(`\n🛑 Бот завершен с кодом ${code}`);
        });
        
        // Обработка ошибок
        botProcess.on('error', (error) => {
            console.error('❌ Ошибка запуска бота:', error);
        });
        
        // Обработка сигналов завершения
        process.on('SIGINT', () => {
            console.log('\n🛑 Получен сигнал завершения, остановка бота...');
            botProcess.kill('SIGTERM');
            setTimeout(() => {
                process.exit(0);
            }, 2000);
        });
        
        process.on('SIGTERM', () => {
            console.log('🛑 Получен SIGTERM, остановка бота...');
            botProcess.kill('SIGTERM');
            setTimeout(() => {
                process.exit(0);
            }, 2000);
        });
        
        console.log('✅ Бот запущен успешно!');
        console.log('📊 Для остановки используйте Ctrl+C');
        
    }, 3000);
});
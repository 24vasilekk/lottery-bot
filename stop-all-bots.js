#!/usr/bin/env node

// Скрипт для остановки всех запущенных экземпляров бота
const { exec } = require('child_process');

console.log('🔍 Поиск запущенных экземпляров бота...');

// Ищем все процессы с telegram-bot-server
exec('ps aux | grep -i "telegram-bot-server" | grep -v grep', (error, stdout, stderr) => {
    if (error) {
        console.log('✅ Нет запущенных экземпляров бота');
        return;
    }

    const lines = stdout.trim().split('\n');
    if (lines.length === 0) {
        console.log('✅ Нет запущенных экземпляров бота');
        return;
    }

    console.log(`🚨 Найдено ${lines.length} запущенных экземпляров:`);
    
    lines.forEach(line => {
        const parts = line.split(/\s+/);
        const pid = parts[1];
        const command = parts.slice(10).join(' ');
        
        console.log(`   PID: ${pid} - ${command}`);
        
        // Убиваем процесс
        exec(`kill -9 ${pid}`, (killError) => {
            if (killError) {
                console.log(`❌ Не удалось убить процесс ${pid}: ${killError.message}`);
            } else {
                console.log(`✅ Процесс ${pid} остановлен`);
            }
        });
    });
});

// Также ищем node процессы
exec('ps aux | grep -i "node.*lottery" | grep -v grep', (error, stdout, stderr) => {
    if (error) {
        return;
    }

    const lines = stdout.trim().split('\n').filter(line => line.length > 0);
    if (lines.length === 0) {
        return;
    }

    console.log(`🔍 Найдено ${lines.length} node процессов с lottery:`);
    
    lines.forEach(line => {
        const parts = line.split(/\s+/);
        const pid = parts[1];
        const command = parts.slice(10).join(' ');
        
        console.log(`   PID: ${pid} - ${command}`);
        
        // Убиваем процесс
        exec(`kill -9 ${pid}`, (killError) => {
            if (killError) {
                console.log(`❌ Не удалось убить процесс ${pid}: ${killError.message}`);
            } else {
                console.log(`✅ Процесс ${pid} остановлен`);
            }
        });
    });
});

// Ожидаем завершения всех операций
setTimeout(() => {
    console.log('\n🎯 Все экземпляры бота остановлены!');
    console.log('✅ Теперь можно безопасно запускать новый экземпляр');
}, 2000);
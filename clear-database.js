#!/usr/bin/env node
// clear-database.js - Скрипт для очистки базы данных

const createDatabase = require('./database-selector');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function clearDatabase() {
    console.log('🗑️  ОЧИСТКА БАЗЫ ДАННЫХ KOSMETICHKA LOTTERY BOT');
    console.log('================================================');
    console.log('⚠️  ВНИМАНИЕ: Это действие необратимо!');
    console.log('⚠️  Будут удалены ВСЕ пользователи, призы и история');
    console.log('');

    const answer = await new Promise(resolve => {
        rl.question('Вы уверены? Напишите "YES" для подтверждения: ', resolve);
    });

    if (answer !== 'YES') {
        console.log('❌ Очистка отменена');
        rl.close();
        return;
    }

    try {
        const db = createDatabase();
        
        console.log('🔄 Очистка таблиц...');
        
        // Отключаем проверки внешних ключей
        await db.run('PRAGMA foreign_keys = OFF');
        
        // Удаляем все данные
        await db.run('DELETE FROM user_prizes');
        await db.run('DELETE FROM spin_history');
        await db.run('DELETE FROM user_tasks');
        await db.run('DELETE FROM referrals');
        await db.run('DELETE FROM users');
        
        // Сбрасываем счетчики автоинкремента
        await db.run('DELETE FROM sqlite_sequence');
        
        // Включаем обратно проверки внешних ключей
        await db.run('PRAGMA foreign_keys = ON');
        
        console.log('✅ База данных очищена успешно!');
        console.log('');
        console.log('📊 Статистика:');
        console.log('   • Пользователи: 0');
        console.log('   • Призы: 0');
        console.log('   • История: 0');
        console.log('   • Задания: 0');
        console.log('   • Рефералы: 0');
        
    } catch (error) {
        console.error('❌ Ошибка при очистке базы данных:', error);
    }
    
    rl.close();
    process.exit(0);
}

// Метод run уже есть в PostgreSQL версии базы данных

clearDatabase();
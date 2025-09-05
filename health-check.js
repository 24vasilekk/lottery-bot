// health-check.js - Простая проверка работоспособности для Railway
console.log('🚀 Запуск проверки здоровья системы...');
console.log('📅 Время запуска:', new Date().toISOString());

try {
    // Проверка переменных окружения
    console.log('🔐 Проверка переменных окружения:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - PORT:', process.env.PORT);
    console.log('  - BOT_TOKEN:', process.env.BOT_TOKEN ? 'Установлен ✅' : 'Отсутствует ❌');
    console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? 'Установлен ✅' : 'Отсутствует ❌');
    
    // Проверка модулей
    console.log('\n📦 Проверка основных модулей:');
    
    const express = require('express');
    console.log('  - Express:', express ? 'Загружен ✅' : 'Ошибка ❌');
    
    const TelegramBot = require('node-telegram-bot-api');
    console.log('  - TelegramBot:', TelegramBot ? 'Загружен ✅' : 'Ошибка ❌');
    
    const path = require('path');
    console.log('  - Path:', path ? 'Загружен ✅' : 'Ошибка ❌');
    
    // Проверка наших файлов
    console.log('\n📁 Проверка локальных файлов:');
    
    const createDatabase = require('./database-selector');
    console.log('  - database-selector:', createDatabase ? 'Загружен ✅' : 'Ошибка ❌');
    
    const ReferralManager = require('./referral-manager');
    console.log('  - referral-manager:', ReferralManager ? 'Загружен ✅' : 'Ошибка ❌');
    
    const validation = require('./utils/validation');
    console.log('  - validation:', validation ? 'Загружен ✅' : 'Ошибка ❌');
    
    const authMiddleware = require('./admin/auth-middleware');
    console.log('  - auth-middleware:', authMiddleware ? 'Загружен ✅' : 'Ошибка ❌');
    
    console.log('\n✅ Все базовые проверки пройдены успешно!');
    console.log('🚀 Система готова к запуску основного сервера');
    
} catch (error) {
    console.error('❌ Ошибка при проверке:', error.message);
    console.error('📍 Stack trace:', error.stack);
    process.exit(1);
}
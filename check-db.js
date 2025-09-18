#!/usr/bin/env node

const https = require('https');

// Проверка состояния БД через API
async function checkDatabase() {
    console.log('🔍 Проверяем состояние базы данных...\n');
    
    const options = {
        hostname: 'lottery-bot-updated-production.up.railway.app',
        port: 443,
        path: '/api/admin/db-test',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer your-admin-token', // Нужен реальный токен
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('📊 Результат проверки БД:');
                    console.log(JSON.stringify(result, null, 2));
                    resolve(result);
                } catch (err) {
                    console.error('❌ Ошибка парсинга ответа:', err);
                    console.log('Сырой ответ:', data);
                    reject(err);
                }
            });
        });

        req.on('error', (err) => {
            console.error('❌ Ошибка запроса:', err);
            reject(err);
        });

        req.end();
    });
}

// Проверка API пользователей
async function checkUsersAPI() {
    console.log('\n👥 Проверяем API пользователей...\n');
    
    const options = {
        hostname: 'lottery-bot-updated-production.up.railway.app',
        port: 443,
        path: '/api/admin/users?page=1&limit=5',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer your-admin-token',
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            
            console.log('HTTP Status:', res.statusCode);
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('📊 Результат API пользователей:');
                    console.log(JSON.stringify(result, null, 2));
                    resolve(result);
                } catch (err) {
                    console.error('❌ Ошибка парсинга ответа:', err);
                    console.log('Сырой ответ:', data);
                    reject(err);
                }
            });
        });

        req.on('error', (err) => {
            console.error('❌ Ошибка запроса:', err);
            reject(err);
        });

        req.end();
    });
}

// Выполняем проверки
async function main() {
    console.log('🚀 Диагностика состояния lottery bot БД\n');
    console.log('⚠️  ПРИМЕЧАНИЕ: Для работы нужен реальный admin токен\n');
    
    try {
        await checkDatabase();
        await checkUsersAPI();
        console.log('\n✅ Диагностика завершена');
    } catch (err) {
        console.error('\n❌ Ошибка диагностики:', err.message);
    }
}

main();
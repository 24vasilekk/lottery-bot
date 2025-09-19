#!/usr/bin/env node

const createDatabase = require('./database-selector');

async function resetWheelSettings() {
    const db = createDatabase();
    
    console.log('🎯 Сброс настроек рулетки...');
    
    try {
        // Удаляем существующие настройки
        await db.pool.query('DELETE FROM wheel_settings WHERE wheel_type = $1', ['normal']);
        console.log('✅ Удалены старые настройки обычной рулетки');
        
        // Инициализируем новые настройки
        await db.initializeRealWheelChances();
        console.log('✅ Инициализированы новые настройки рулетки');
        
        // Проверяем результат
        const settings = await db.getWheelSettings('normal');
        console.log('📊 Новые настройки рулетки:');
        console.log('   Всего призов:', settings.prizes.length);
        
        settings.prizes.forEach(prize => {
            console.log(`   - ${prize.name}: ${prize.probability}%`);
        });
        
        const totalProb = settings.prizes.reduce((sum, p) => sum + p.probability, 0);
        console.log(`   📈 Общая вероятность: ${totalProb}%`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    }
}

resetWheelSettings();
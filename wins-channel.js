// wins-channel.js - Система автоматического постинга выигрышей
// 🏆 Канал постинга выигрышей для Kosmetichka Lottery Bot
// 
// 📢 НАСТРОЙКА КАНАЛА ВЫИГРЫШЕЙ:
// 1. Канал для трансляций: https://t.me/kosmetichkolive
// 2. Добавьте бота в администраторы канала @kosmetichkolive
// 3. Установите переменную окружения: WINS_CHANNEL_ID=-1001234567890 (ID канала с минусом)
// 4. Система автоматически публикует значительные выигрыши каждые 2 минуты

const createDatabase = require('./database-selector');

class WinsChannelManager {
    constructor(bot) {
        this.bot = bot;
        this.db = createDatabase();
        this.channelId = process.env.WINS_CHANNEL_ID; // ID канала для постинга выигрышей
        this.checkInterval = 2 * 60 * 1000; // Проверяем каждые 2 минуты
        
        console.log('🏆 Инициализация системы постинга выигрышей...');
        this.startWinPosting();
    }

    startWinPosting() {
        // Запускаем проверку каждые 2 минуты
        setInterval(() => {
            this.checkAndPostNewWins();
        }, this.checkInterval);

        // Первый запуск через 30 секунд после старта
        setTimeout(() => {
            this.checkAndPostNewWins();
        }, 30 * 1000);

        console.log('✅ Система автоматического постинга выигрышей запущена');
    }

    async checkAndPostNewWins() {
        if (!this.channelId || !this.bot) {
            console.log('⚠️ Канал выигрышей не настроен - пропускаем постинг');
            return;
        }

        try {
            console.log('🔍 Проверка новых выигрышей для постинга...');
            
            // Получаем выигрыши, которые еще не были опубликованы
            const unpostedWins = await this.getUnpostedWins();
            
            if (unpostedWins.length === 0) {
                console.log('📝 Новых выигрышей для постинга нет');
                return;
            }

            console.log(`🎉 Найдено ${unpostedWins.length} новых выигрышей для постинга`);

            // Постим каждый выигрыш
            for (const win of unpostedWins) {
                await this.postWinToChannel(win);
                await this.markAsPosted(win.id);
                
                // Делаем паузу между постами
                await this.sleep(3000);
            }

        } catch (error) {
            console.error('❌ Ошибка проверки и постинга выигрышей:', error);
        }
    }

    async getUnpostedWins() {
        try {
            // Получаем значительные выигрыши за последние 24 часа
            const wins = await this.db.pool.query(`
                SELECT p.*, u.first_name, u.username, u.telegram_id
                FROM prizes p
                JOIN users u ON p.user_id = u.id
                WHERE p.created_at >= NOW() - INTERVAL '24 hours'
                    AND (p.is_posted_to_channel IS NULL OR p.is_posted_to_channel = false)
                    AND p.type IN ('airpods4', 'cert5000', 'cert3000', 'cert2000', 'cert1000', 'powerbank', 'charger', 'golden-apple', 'dolce')
                ORDER BY p.created_at DESC
                LIMIT 10
            `);

            return wins.rows || [];
        } catch (error) {
            console.error('❌ Ошибка получения неопубликованных выигрышей:', error);
            return [];
        }
    }

    async postWinToChannel(win) {
        try {
            const message = this.formatWinMessage(win);
            
            // Отправляем сообщение в канал
            await this.bot.sendMessage(this.channelId, message, {
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });

            console.log(`🏆 Выигрыш опубликован в канал: ${win.prize_name} для пользователя ${win.first_name}`);

        } catch (error) {
            console.error('❌ Ошибка отправки выигрыша в канал:', error);
            throw error;
        }
    }

    formatWinMessage(win) {
        const prizeEmojis = {
            'airpods4': '🎧',
            'cert5000': '💎', 
            'cert3000': '💍',
            'cert2000': '💰',
            'cert1000': '🏅',
            'powerbank': '🔋',
            'charger': '⚡',
            'golden-apple': '🍎',
            'dolce': '💄'
        };

        const emoji = prizeEmojis[win.type] || '🎁';
        const userName = win.first_name || 'Пользователь';
        const userHandle = win.username ? `@${win.username}` : `ID: ${win.telegram_id}`;
        const prizeValue = this.getPrizeValue(win.type);
        
        const winTime = new Date(win.created_at).toLocaleString('ru-RU', {
            timeZone: 'Europe/Moscow',
            day: '2-digit',
            month: '2-digit', 
            hour: '2-digit',
            minute: '2-digit'
        });

        return `🎉 <b>НОВЫЙ ВЫИГРЫШ!</b> 🎉

${emoji} <b>${win.description || this.getPrizeName(win.type)}</b>
💸 Стоимость: <b>${prizeValue}</b>

👤 Победитель: <b>${userName}</b> (${userHandle})
🕐 Время: ${winTime}

🎰 Хочешь тоже выиграть? Попробуй свою удачу!
🔗 Играть: @kosmetichkalottery_bot

#выигрыш #удача #kosmetichka`;
    }

    getPrizeValue(prizeType) {
        const values = {
            'airpods4': '12 000₽',
            'cert5000': '5 000₽',
            'cert3000': '3 000₽', 
            'cert2000': '2 000₽',
            'cert1000': '1 000₽',
            'powerbank': '2 500₽',
            'charger': '3 500₽',
            'golden-apple': '15 000₽',
            'dolce': '8 000₽'
        };
        
        return values[prizeType] || 'Бесценно';
    }

    getPrizeName(prizeType) {
        const names = {
            'airpods4': 'AirPods 4',
            'cert5000': 'Сертификат 5000₽',
            'cert3000': 'Сертификат 3000₽',
            'cert2000': 'Сертификат 2000₽', 
            'cert1000': 'Сертификат 1000₽',
            'powerbank': 'PowerBank',
            'charger': 'Зарядное устройство',
            'golden-apple': 'Золотое яблоко',
            'dolce': 'Dolce косметика'
        };
        
        return names[prizeType] || 'Приз';
    }

    async markAsPosted(prizeId) {
        try {
            await this.db.pool.query(`
                UPDATE prizes 
                SET is_posted_to_channel = true, 
                    posted_to_channel_date = NOW()
                WHERE id = $1
            `, [prizeId]);
        } catch (error) {
            console.error('❌ Ошибка отметки приза как опубликованного:', error);
        }
    }

    async addPostedColumn() {
        try {
            // Добавляем колонки для отслеживания постинга в канал (PostgreSQL синтаксис)
            await this.db.pool.query(`
                ALTER TABLE prizes 
                ADD COLUMN IF NOT EXISTS is_posted_to_channel BOOLEAN DEFAULT FALSE
            `);
            
            await this.db.pool.query(`
                ALTER TABLE prizes 
                ADD COLUMN IF NOT EXISTS posted_to_channel_date TIMESTAMP
            `);
            
            console.log('✅ Колонки для постинга в канал добавлены');
        } catch (error) {
            // Колонки уже существуют - это нормально  
            if (!error.message.includes('already exists')) {
                console.error('❌ Ошибка добавления колонок:', error);
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Публичные методы для внешнего использования

    async getChannelStats() {
        try {
            const stats = await this.db.pool.query(`
                SELECT 
                    COUNT(*) as total_wins_posted,
                    COUNT(CASE WHEN posted_to_channel_date >= NOW() - INTERVAL '24 hours' THEN 1 END) as today_wins_posted,
                    COUNT(CASE WHEN posted_to_channel_date >= NOW() - INTERVAL '7 days' THEN 1 END) as week_wins_posted
                FROM prizes 
                WHERE is_posted_to_channel = true
            `);

            const row = stats.rows[0] || {};
            return {
                totalWinsPosted: parseInt(row.total_wins_posted) || 0,
                todayWinsPosted: parseInt(row.today_wins_posted) || 0,
                weekWinsPosted: parseInt(row.week_wins_posted) || 0
            };
        } catch (error) {
            console.error('❌ Ошибка получения статистики канала:', error);
            return { totalWinsPosted: 0, todayWinsPosted: 0, weekWinsPosted: 0 };
        }
    }

    async getRecentPostedWins() {
        try {
            const wins = await this.db.pool.query(`
                SELECT p.*, u.first_name, u.username
                FROM prizes p
                JOIN users u ON p.user_id = u.id
                WHERE p.is_posted_to_channel = true
                ORDER BY p.posted_to_channel_date DESC
                LIMIT 20
            `);

            return wins.rows || [];
        } catch (error) {
            console.error('❌ Ошибка получения недавних постов:', error);
            return [];
        }
    }

    async manualPostWin(prizeId) {
        try {
            const winResult = await this.db.pool.query(`
                SELECT p.*, u.first_name, u.username, u.telegram_id
                FROM prizes p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = $1
            `, [prizeId]);

            const win = winResult.rows[0];
            if (!win) {
                throw new Error('Приз не найден');
            }

            await this.postWinToChannel(win);
            await this.markAsPosted(prizeId);

            console.log(`✅ Выигрыш ${prizeId} успешно опубликован вручную`);
            return true;

        } catch (error) {
            console.error(`❌ Ошибка ручного постинга выигрыша ${prizeId}:`, error);
            throw error;
        }
    }

    async testChannelConnection() {
        if (!this.channelId || !this.bot) {
            throw new Error('Канал выигрышей не настроен');
        }

        try {
            const testMessage = `🧪 <b>Тестовое сообщение</b>

Система постинга выигрышей работает корректно!
Время теста: ${new Date().toLocaleString('ru-RU')}

#тест #система`;

            await this.bot.sendMessage(this.channelId, testMessage, {
                parse_mode: 'HTML'
            });

            console.log('✅ Тестовое сообщение успешно отправлено в канал выигрышей');
            return true;

        } catch (error) {
            console.error('❌ Ошибка отправки тестового сообщения:', error);
            throw error;
        }
    }
}

module.exports = WinsChannelManager;
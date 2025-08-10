// telegram-integration.js - Интеграция с Telegram Web Apps

class TelegramIntegration {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.user = null;
        this.init();
    }

    init() {
        if (!this.tg) {
            console.warn('Telegram WebApp не найден. Работаем в демо-режиме.');
            
            // Генерируем уникальный ID для каждой сессии браузера
            let testUserId = localStorage.getItem('test_user_id');
            if (!testUserId) {
                // Генерируем случайный ID в диапазоне тестовых ID (от 900000000 до 999999999)
                testUserId = Math.floor(Math.random() * 100000000) + 900000000;
                localStorage.setItem('test_user_id', testUserId.toString());
                console.log('🆕 Создан новый уникальный тестовый ID для демо-режима:', testUserId);
            } else {
                console.log('📱 Используем существующий тестовый ID для демо-режима:', testUserId);
            }
            
            // Создаем уникального тестового пользователя для работы в браузере
            this.user = {
                id: parseInt(testUserId),
                first_name: 'Test User',
                username: 'testuser' + testUserId.toString().slice(-4) // Уникальный username
            };
            console.log('👤 Данные уникального тестового пользователя:', this.user);
            return;
        }

        // Настраиваем Telegram WebApp
        this.tg.ready();
        this.tg.expand();
        
        // Получаем данные пользователя
        this.user = this.tg.initDataUnsafe?.user;
        
        // Если нет данных пользователя (браузер), создаем УНИКАЛЬНОГО тестового пользователя
        if (!this.user) {
            console.warn('⚠️ Нет данных пользователя Telegram, создаем уникального тестового пользователя');
            
            // Генерируем уникальный ID для каждой сессии браузера
            let testUserId = localStorage.getItem('test_user_id');
            if (!testUserId) {
                // Генерируем случайный ID в диапазоне тестовых ID (от 900000000 до 999999999)
                testUserId = Math.floor(Math.random() * 100000000) + 900000000;
                localStorage.setItem('test_user_id', testUserId.toString());
                console.log('🆕 Создан новый уникальный тестовый ID:', testUserId);
            } else {
                console.log('📱 Используем существующий тестовый ID:', testUserId);
            }
            
            this.user = {
                id: parseInt(testUserId),
                first_name: 'Test User',
                username: 'testuser' + testUserId.toString().slice(-4) // Уникальный username
            };
        }
        
        console.log('👤 Данные пользователя:', this.user);
        
        // Настраиваем тему
        this.setupTheme();
        
        // Настраиваем кнопки
        this.setupMainButton();
        this.setupBackButton();
        
        // Обработчики событий
        this.setupEventHandlers();
        
        // НЕ вызываем initUser здесь - app еще не готов!
    }

    setupTheme() {
        // Применяем цвета темы Telegram
        const themeParams = this.tg.themeParams;
        
        if (themeParams.bg_color) {
            document.documentElement.style.setProperty('--tg-bg-color', themeParams.bg_color);
        }
        
        if (themeParams.text_color) {
            document.documentElement.style.setProperty('--tg-text-color', themeParams.text_color);
        }
        
        // Устанавливаем цвет заголовка
        this.tg.setHeaderColor('#1a1a1a');
    }

    setupMainButton() {
        // Главная кнопка Telegram
        this.tg.MainButton.text = 'Крутить рулетку';
        this.tg.MainButton.color = '#EF55A5';
        this.tg.MainButton.textColor = '#FFFFFF';
        
        // Обработчик нажатия главной кнопки
        this.tg.MainButton.onClick(() => {
            if (app && app.wheelManager) {
                app.wheelManager.spin();
            }
        });
    }

    setupBackButton() {
        // Кнопка "Назад"
        this.tg.BackButton.onClick(() => {
            if (app.currentScreen !== 'main') {
                app.switchScreen('main');
                this.hideBackButton();
            } else {
                this.tg.close();
            }
        });
    }

    setupEventHandlers() {
        // Слушаем события приложения
        document.addEventListener('screenChanged', (e) => {
            this.handleScreenChange(e.detail.screen);
        });
        
        document.addEventListener('wheelSpin', (e) => {
            this.handleWheelSpin(e.detail);
        });
        
        document.addEventListener('taskCompleted', (e) => {
            this.handleTaskCompleted(e.detail);
        });
    }

    initUser() {
        if (!this.user) {
            console.error('❌ TelegramIntegration: Нет данных пользователя');
            return;
        }
        
        console.log('👤 TelegramIntegration: Инициализация пользователя:', this.user);
        
        // Проверяем, что app существует
        if (!window.app) {
            console.error('❌ TelegramIntegration: app еще не инициализирован');
            return;
        }
        
        // ИСПРАВЛЕНО: НЕ обновляем данные с DEFAULT_USER_DATA
        // Только обновляем профиль телеграм-данными, НЕ ТРОГАЯ баланс
        const displayName = this.user.username ? `@${this.user.username}` : (this.user.first_name || 'Пользователь');
        
        // Обновляем ТОЛЬКО профиль, НЕ весь объект userData
        if (window.app.gameData && window.app.gameData.profile) {
            window.app.gameData.profile.name = displayName;
            window.app.gameData.profile.username = this.user.username || '';
            window.app.gameData.profile.first_name = this.user.first_name || '';
            window.app.gameData.profile.telegramId = this.user.id;
        }

        console.log('📋 TelegramIntegration: Данные пользователя:', {
            id: this.user.id,
            username: this.user.username,
            first_name: this.user.first_name,
            displayName: displayName
        });
        
        console.log('📋 TelegramIntegration: Обновлен только профиль, баланс НЕ тронут');
        
        // Обновляем только UI, НЕ вызываем updateUserData с дефолтными данными
        window.app.updateUI();
        
        console.log('✅ TelegramIntegration: Инициализация завершена, синхронизация с сервером...');
    }

    handleScreenChange(screen) {
        switch (screen) {
            case 'main':
                this.tg.MainButton.text = 'Крутить рулетку';
                this.tg.MainButton.show();
                this.hideBackButton();
                break;
            case 'tasks':
                this.tg.MainButton.text = 'Выполнить задание';
                this.tg.MainButton.show();
                this.showBackButton();
                break;
            case 'profile':
                this.tg.MainButton.hide();
                this.showBackButton();
                break;
        }
    }

    handleWheelSpin(result) {
        console.log('🎰 TelegramIntegration: обработка выигрыша', result);
        
        if (!this.user) {
            console.error('❌ Нет данных пользователя Telegram');
            return;
        }
        
        // Отправляем результат на сервер
        const data = {
            userId: this.user.id,
            prize: result.prize,
            spinType: result.spinType || 'normal',
            timestamp: new Date().toISOString(),
            user: this.user // Добавляем данные пользователя для создания в БД
        };
        
        console.log('📤 Отправка на сервер:', data);
        this.sendToServer('wheel_spin', data);
        
        // Показываем haptic feedback
        if (this.tg.HapticFeedback) {
            this.tg.HapticFeedback.notificationOccurred('success');
        }
    }

    handleTaskCompleted(task) {
        // Отправляем выполнение задания на сервер
        this.sendToServer('task_completed', {
            userId: this.user?.id,
            taskId: task.id,
            reward: task.reward,
            timestamp: new Date().toISOString()
        });
        
        // Haptic feedback
        this.tg.HapticFeedback.impactOccurred('medium');
    }

    showMainButton() {
        this.tg.MainButton.show();
    }

    hideMainButton() {
        this.tg.MainButton.hide();
    }

    showBackButton() {
        this.tg.BackButton.show();
    }

    hideBackButton() {
        this.tg.BackButton.hide();
    }

    // Отправка данных на сервер с retry логикой
// Замените функцию sendToServer в public/js/telegram-integration.js:

    async sendToServer(action, data, maxRetries = 3) {
        if (!this.user) {
            console.error('❌ sendToServer: нет пользователя');
            return { success: false, error: 'No user data' };
        }
        
        console.log(`📡 sendToServer: ${action}`);
        console.log('📋 Исходные данные:', data);
        console.log('👤 Пользователь:', this.user);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const payload = {
                    action,
                    data,
                    user: this.user
                };
                
                console.log(`📤 Попытка ${attempt}/${maxRetries} - отправка payload:`, payload);
                
                // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА перед отправкой
                if (action === 'wheel_spin') {
                    if (!data.spinType) {
                        console.warn('⚠️ spinType отсутствует, устанавливаем normal');
                        data.spinType = 'normal';
                    }
                    
                    if (!data.prize) {
                        console.error('❌ Приз отсутствует в данных!');
                        return { success: false, error: 'Prize data missing' };
                    }
                    
                    if (!data.prize.id) {
                        console.warn('⚠️ ID приза отсутствует, генерируем новый');
                        data.prize.id = Math.floor(Math.random() * 1000000);
                    }
                    
                    console.log('✅ Валидация wheel_spin данных прошла успешно');
                }
                
                const response = await fetch('/api/telegram-webhook', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Telegram-Init-Data': this.tg.initData || '',
                        'X-Telegram-User-ID': this.user.id.toString()
                    },
                    body: JSON.stringify(payload)
                });
                
                console.log(`📡 HTTP статус: ${response.status} ${response.statusText}`);
                
                // Получаем текст ответа для отладки
                const responseText = await response.text();
                console.log('📄 Сырой ответ сервера:', responseText);
                
                if (!response.ok) {
                    console.error(`❌ HTTP ошибка: ${response.status}`);
                    
                    // Пытаемся распарсить ошибку как JSON
                    let errorData;
                    try {
                        errorData = JSON.parse(responseText);
                    } catch (e) {
                        errorData = { error: responseText };
                    }
                    
                    // Логируем детали ошибки
                    console.error('📋 Детали ошибки:', errorData);
                    
                    // Для 429 ошибки пытаемся еще раз с задержкой
                    if (response.status === 429) {
                        console.warn(`⚠️ Rate limit (попытка ${attempt}/${maxRetries})`);
                        
                        if (attempt < maxRetries) {
                            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                            console.log(`⏳ Ожидание ${delay}ms перед повтором...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                            continue;
                        }
                    }
                    
                    // Для других ошибок тоже пытаемся повторить
                    if (attempt < maxRetries && response.status >= 500) {
                        const delay = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
                        console.log(`🔄 Повтор через ${delay}ms для ошибки ${response.status}...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    
                    return { 
                        success: false, 
                        error: errorData.error || `HTTP ${response.status}`,
                        details: errorData.details || errorData,
                        status: response.status
                    };
                }
                
                // Парсим успешный ответ
                let result;
                try {
                    result = JSON.parse(responseText);
                } catch (e) {
                    console.warn('⚠️ Не удалось распарсить JSON ответ, используем как есть');
                    result = { success: true, data: responseText };
                }
                
                console.log(`✅ sendToServer успешно (попытка ${attempt}):`, result);
                return result;
                
            } catch (error) {
                console.error(`❌ sendToServer ошибка (попытка ${attempt}/${maxRetries}):`, error);
                
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`🔄 Повтор через ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    return { 
                        success: false, 
                        error: error.message || 'Network error',
                        details: error
                    };
                }
            }
        }
    }

    // ДОБАВЬТЕ метод для отладки:
    debugConnection() {
        console.log('🔍 === ОТЛАДКА TELEGRAM INTEGRATION ===');
        console.log('User ID:', this.user?.id);
        console.log('User data:', this.user);
        console.log('Telegram WebApp ready:', !!this.tg);
        console.log('Init data:', this.tg?.initData?.slice(0, 50) + '...');
        console.log('sendToServer function:', typeof this.sendToServer);
        console.log('=== КОНЕЦ ОТЛАДКИ ===');
    }

    async syncWithServer() {
        if (!this.user) {
            console.error('❌ syncWithServer: нет данных пользователя');
            return;
        }
        
        console.log('🔄 Синхронизация с сервером...');
        
        try {
            const response = await this.sendToServer('sync_user', {
                userData: {
                    // Отправляем только ID для получения данных
                    telegramId: this.user.id
                },
                user: this.user
            });
            
            console.log('📡 Ответ сервера:', response);
            
            if (response?.userData && window.app) {
                // ВАЖНО: Баланс ВСЕГДА берем с сервера
                const serverStars = response.userData.stars;
                
                console.log(`⭐ Получен баланс с сервера: ${serverStars}`);
                
                // Обновляем ТОЛЬКО если есть валидное значение с сервера
                if (typeof serverStars === 'number') {
                    window.app.gameData.stars = serverStars;
                    window.app.gameData.total_stars_earned = response.userData.total_stars_earned || serverStars;
                    
                    // Обновляем остальные данные
                    if (response.userData.referrals !== undefined) {
                        window.app.gameData.referrals = response.userData.referrals;
                    }
                    if (response.userData.totalSpins !== undefined) {
                        window.app.gameData.totalSpins = response.userData.totalSpins;
                    }
                    if (response.userData.prizesWon !== undefined) {
                        window.app.gameData.prizesWon = response.userData.prizesWon;
                    }
                    
                    console.log(`✅ Данные обновлены. Баланс: ${window.app.gameData.stars}`);
                    
                    // НЕ сохраняем в localStorage - только обновляем UI
                    window.app.updateInterface();
                } else {
                    console.error('❌ Невалидный баланс с сервера:', serverStars);
                }
            }
        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error);
        }
    }

    // Методы для вызова из приложения
    showAlert(message) {
        this.tg.showAlert(message);
    }

    showConfirm(message, callback) {
        this.tg.showConfirm(message, callback);
    }

    close() {
        this.tg.close();
    }

    // Отправка данных обратно в бот
    sendDataToBot(data) {
        this.tg.sendData(JSON.stringify(data));
    }
}

// Инициализация при загрузке
let telegramIntegration;

function initTelegramIntegration() {
    console.log('🚀 Инициализация TelegramIntegration...');
    telegramIntegration = new TelegramIntegration();
    // Глобальный доступ
    window.telegramIntegration = telegramIntegration;
    console.log('✅ TelegramIntegration создан и добавлен в window');
}

// Инициализируем сразу если DOM уже готов, иначе ждем DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTelegramIntegration);
} else {
    initTelegramIntegration();
}

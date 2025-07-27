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
            // Создаем тестового пользователя для работы в браузере
            this.user = {
                id: 123456789, // Тестовый ID
                first_name: 'Test User',
                username: 'testuser'
            };
            console.log('👤 Данные тестового пользователя:', this.user);
            return;
        }

        // Настраиваем Telegram WebApp
        this.tg.ready();
        this.tg.expand();
        
        // Получаем данные пользователя
        this.user = this.tg.initDataUnsafe?.user;
        
        // Если нет данных пользователя (браузер), создаем тестового пользователя
        if (!this.user) {
            console.warn('⚠️ Нет данных пользователя Telegram, создаем тестового пользователя');
            this.user = {
                id: 123456789, // Тестовый ID
                first_name: 'Test User',
                username: 'testuser'
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
        
        // Проверяем, что у app есть метод getUserData
        if (!window.app.getUserData) {
            console.error('❌ TelegramIntegration: метод getUserData не найден');
            return;
        }
        
        // Получаем сохраненные данные пользователя
        const userData = window.app.getUserData();
        
        // Обновляем профиль данными из Telegram
        userData.profile.name = this.user.username ? `@${this.user.username}` : (this.user.first_name || 'Пользователь');
        userData.profile.username = this.user.username || '';
        userData.profile.first_name = this.user.first_name || '';
        userData.profile.telegramId = this.user.id;
        
        console.log('📋 TelegramIntegration: Обновленные данные пользователя:', userData.profile);
        
        // Сохраняем и обновляем UI
        window.app.updateUserData(userData);
        window.app.updateUI();
        
        // Отправляем данные на сервер
        this.syncWithServer();
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
    async sendToServer(action, data, maxRetries = 3) {
        if (!this.user) {
            console.error('❌ sendToServer: нет пользователя');
            return { success: false, error: 'No user data' };
        }
        
        console.log(`📡 sendToServer: ${action}`, data);
        console.log('👤 sendToServer: user data:', this.user);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const payload = {
                    action,
                    data,
                    user: this.user
                };
                
                console.log(`📤 Попытка ${attempt}/${maxRetries}:`, payload);
                
                const response = await fetch('/api/telegram-webhook', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Telegram-Init-Data': this.tg.initData || ''
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log('✅ Ответ сервера:', result);
                return result;
                
            } catch (error) {
                console.error(`❌ Попытка ${attempt} неудачна:`, error);
                
                // Если это последняя попытка - возвращаем ошибку
                if (attempt === maxRetries) {
                    console.error('❌ Все попытки исчерпаны');
                    return { success: false, error: error.message };
                }
                
                // Ждем перед следующей попыткой (экспоненциальная задержка)
                const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
                console.log(`⏳ Ожидание ${delay}ms перед следующей попыткой...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // Синхронизация с сервером
    async syncWithServer() {
        if (!this.user) return;
        
        try {
            const response = await this.sendToServer('sync_user', {
                userData: window.app.getUserData(),
                user: this.user // Добавляем данные пользователя
            });
            
            if (response?.userData) {
                window.app.updateUserData(response.userData);
                window.app.updateUI();
            }
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
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

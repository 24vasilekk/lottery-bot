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
            return;
        }

        // Настраиваем Telegram WebApp
        this.tg.ready();
        this.tg.expand();
        
        // Получаем данные пользователя
        this.user = this.tg.initDataUnsafe?.user;
        
        // Настраиваем тему
        this.setupTheme();
        
        // Настраиваем кнопки
        this.setupMainButton();
        this.setupBackButton();
        
        // Обработчики событий
        this.setupEventHandlers();
        
        // Инициализируем пользователя
        this.initUser();
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
        if (!this.user) return;
        
        // Получаем сохраненные данные пользователя
        const userData = app.getUserData();
        
        // Обновляем профиль данными из Telegram
        userData.profile.name = this.user.first_name || 'Пользователь';
        userData.profile.username = this.user.username || '';
        userData.profile.telegramId = this.user.id;
        userData.profile.avatarUrl = this.user.photo_url || '';
        
        // Сохраняем и обновляем UI
        app.updateUserData(userData);
        app.updateUI();
        
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
        // Отправляем результат на сервер
        this.sendToServer('wheel_spin', {
            userId: this.user?.id,
            prize: result.prize,
            timestamp: new Date().toISOString()
        });
        
        // Показываем haptic feedback
        this.tg.HapticFeedback.notificationOccurred('success');
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

    // Отправка данных на сервер
    async sendToServer(action, data) {
        if (!this.user) return;
        
        try {
            const response = await fetch('/api/telegram-webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': this.tg.initData
                },
                body: JSON.stringify({
                    action,
                    data,
                    user: this.user
                })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка отправки данных');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Ошибка отправки на сервер:', error);
        }
    }

    // Синхронизация с сервером
    async syncWithServer() {
        if (!this.user) return;
        
        try {
            const response = await this.sendToServer('sync_user', {
                userData: app.getUserData()
            });
            
            if (response?.userData) {
                app.updateUserData(response.userData);
                app.updateUI();
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

document.addEventListener('DOMContentLoaded', () => {
    telegramIntegration = new TelegramIntegration();
});

// Глобальный доступ
window.telegramIntegration = telegramIntegration;
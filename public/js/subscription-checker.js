// subscription-checker.js - Проверка подписок на каналы

class SubscriptionChecker {
    constructor() {
        this.requiredChannels = [
            {
                id: 'kosmetichka_channel',
                name: 'Kosmetichka Channel', 
                url: 'https://t.me/kosmetichka_channel',
                required: true
            },
            {
                id: 'kosmetichka_instagram',
                name: 'Kosmetichka Instagram',
                url: 'https://instagram.com/kosmetichka',
                required: true
            },
            {
                id: 'dolcedeals',
                name: 'Dolce Deals',
                url: 'https://t.me/dolcedeals',
                required: true
            }
        ];
        
        this.userSubscriptions = {};
        this.checkInProgress = false;
    }

    // Проверить все подписки
    async checkAllSubscriptions() {
        if (this.checkInProgress) return;
        
        this.checkInProgress = true;
        
        try {
            const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
            if (!user) {
                console.error('Пользователь не найден');
                return false;
            }

            // Получаем текущие подписки из API
            const response = await fetch('/api/check-subscriptions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: user.id })
            });

            if (!response.ok) {
                throw new Error('Ошибка получения подписок');
            }

            const data = await response.json();
            this.userSubscriptions = data.subscriptions;

            // Проверяем, все ли обязательные каналы подписаны
            const missingSubscriptions = this.getMissingSubscriptions();
            
            if (missingSubscriptions.length > 0) {
                this.showSubscriptionModal(missingSubscriptions);
                return false;
            } else {
                this.hideSubscriptionModal();
                return true;
            }
        } catch (error) {
            console.error('Ошибка проверки подписок:', error);
            return false;
        } finally {
            this.checkInProgress = false;
        }
    }

    // Получить список недостающих подписок
    getMissingSubscriptions() {
        return this.requiredChannels.filter(channel => {
            const subscriptionKey = this.getSubscriptionKey(channel.id);
            return channel.required && !this.userSubscriptions[subscriptionKey];
        });
    }

    // Преобразовать ID канала в ключ подписки
    getSubscriptionKey(channelId) {
        const keyMap = {
            'kosmetichka_channel': 'channel1',
            'kosmetichka_instagram': 'channel2',
            'dolcedeals': 'dolcedeals'
        };
        return keyMap[channelId] || channelId;
    }

    // Показать модал с требованием подписки
    showSubscriptionModal(missingChannels) {
        const modal = document.getElementById('subscription-modal');
        const channelsContainer = document.getElementById('subscription-channels');
        
        if (!modal || !channelsContainer) {
            console.error('Элементы модала подписок не найдены');
            return;
        }

        // Очищаем контейнер
        channelsContainer.innerHTML = '';

        // Добавляем каналы
        missingChannels.forEach(channel => {
            const channelElement = document.createElement('div');
            channelElement.className = 'subscription-channel';
            channelElement.innerHTML = `
                <div class="channel-info">
                    <div class="channel-name">${channel.name}</div>
                    <a href="${channel.url}" target="_blank" class="subscribe-button">
                        <i class="fas fa-external-link-alt"></i>
                        Подписаться
                    </a>
                </div>
            `;
            channelsContainer.appendChild(channelElement);
        });

        modal.classList.add('active');
    }

    // Скрыть модал подписок
    hideSubscriptionModal() {
        const modal = document.getElementById('subscription-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Проверить подписки перед определенным действием
    async checkBeforeAction(action) {
        const hasAllSubscriptions = await this.checkAllSubscriptions();
        
        if (hasAllSubscriptions) {
            // Выполняем действие
            if (typeof action === 'function') {
                action();
            }
            return true;
        } else {
            // Показываем уведомление
            this.showNotification('Для продолжения подпишитесь на все каналы!', 'warning');
            return false;
        }
    }

    // Уведомить об изменении подписки
    async notifySubscription(channelId) {
        try {
            const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
            if (!user) return;

            await fetch('/api/telegram-webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'subscribe_channel',
                    data: { channel: channelId },
                    user: { id: user.id }
                })
            });
        } catch (error) {
            console.error('Ошибка уведомления о подписке:', error);
        }
    }

    // Показать уведомление
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2a2a2a;
            color: white;
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #EF55A5;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1001;
            max-width: 300px;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Инициализация
    init() {
        // Делаем доступным глобально
        window.subscriptionChecker = this;
        
        // Добавляем стили для анимации
        if (!document.getElementById('subscription-styles')) {
            const style = document.createElement('style');
            style.id = 'subscription-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                
                .subscription-channel {
                    margin: 15px 0;
                    padding: 15px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                
                .channel-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .channel-name {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .subscribe-button {
                    background: linear-gradient(45deg, #EF55A5, #FF6B9D);
                    color: white;
                    text-decoration: none;
                    padding: 8px 15px;
                    border-radius: 15px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    transition: transform 0.2s;
                }
                
                .subscribe-button:hover {
                    transform: translateY(-1px);
                }
                
                .notification {
                    pointer-events: auto;
                }
                
                .notification-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: #999;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: 10px;
                }
            `;
            document.head.appendChild(style);
        }
        
        console.log('✅ Subscription Checker инициализирован');
    }
}

// Создаем и инициализируем проверщик подписок
const subscriptionChecker = new SubscriptionChecker();
subscriptionChecker.init();

export default subscriptionChecker;
// Система уведомлений (Toast notifications)
class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.defaultDuration = 5000;
        this.maxNotifications = 5;
        this.zIndex = 2000;
        
        this.init();
    }

    init() {
        // Создать контейнер если его нет
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    // Показать уведомление
    show(type, title, message, options = {}) {
        const id = this.generateId();
        const duration = options.duration !== undefined ? options.duration : this.defaultDuration;
        const persistent = options.persistent === true;
        const actions = options.actions || [];

        // Ограничить количество уведомлений
        if (this.notifications.size >= this.maxNotifications) {
            const oldestId = this.notifications.keys().next().value;
            this.remove(oldestId);
        }

        const notification = {
            id,
            type,
            title,
            message,
            duration,
            persistent,
            actions,
            createdAt: Date.now(),
            element: null,
            timer: null
        };

        // Создать DOM элемент
        notification.element = this.createElement(notification);
        
        // Добавить в контейнер
        this.container.appendChild(notification.element);
        
        // Добавить в коллекцию
        this.notifications.set(id, notification);

        // Анимация появления
        requestAnimationFrame(() => {
            notification.element.classList.add('show');
        });

        // Автоматическое удаление
        if (!persistent && duration > 0) {
            notification.timer = setTimeout(() => {
                this.remove(id);
            }, duration);
        }

        // Обновить иконки Lucide если доступны
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        return id;
    }

    // Показать успешное уведомление
    showSuccess(title, message, options = {}) {
        return this.show('success', title, message, options);
    }

    // Показать ошибку
    showError(title, message, options = {}) {
        return this.show('error', title, message, {
            duration: 8000, // Ошибки показываем дольше
            ...options
        });
    }

    // Показать предупреждение
    showWarning(title, message, options = {}) {
        return this.show('warning', title, message, options);
    }

    // Показать информационное уведомление
    showInfo(title, message, options = {}) {
        return this.show('info', title, message, options);
    }

    // Показать уведомление с подтверждением
    showConfirm(title, message, onConfirm, onCancel) {
        const actions = [
            {
                text: 'Отмена',
                class: 'btn-secondary',
                onClick: () => {
                    if (onCancel) onCancel();
                }
            },
            {
                text: 'Подтвердить',
                class: 'btn-primary',
                onClick: () => {
                    if (onConfirm) onConfirm();
                }
            }
        ];

        return this.show('info', title, message, {
            persistent: true,
            actions
        });
    }

    // Показать загрузку
    showLoading(title, message = 'Пожалуйста, подождите...') {
        return this.show('loading', title, message, {
            persistent: true
        });
    }

    // Удалить уведомление
    remove(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Очистить таймер
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        // Анимация исчезновения
        notification.element.classList.remove('show');
        notification.element.classList.add('hiding');

        // Удалить через время анимации
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            this.notifications.delete(id);
        }, 300);
    }

    // Удалить все уведомления
    removeAll() {
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.remove(id));
    }

    // Удалить все уведомления определенного типа
    removeByType(type) {
        for (const [id, notification] of this.notifications) {
            if (notification.type === type) {
                this.remove(id);
            }
        }
    }

    // Обновить уведомление
    update(id, updates) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Обновить данные
        Object.assign(notification, updates);

        // Пересоздать элемент если изменились title или message
        if (updates.title || updates.message || updates.type) {
            const newElement = this.createElement(notification);
            notification.element.parentNode.replaceChild(newElement, notification.element);
            notification.element = newElement;
            
            // Обновить иконки
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    // Создать DOM элемент уведомления
    createElement(notification) {
        const { id, type, title, message, actions } = notification;
        
        const element = document.createElement('div');
        element.className = `toast toast-${type}`;
        element.setAttribute('data-id', id);

        // Иконка
        const icon = this.getIcon(type);
        
        // Действия
        const actionsHtml = actions.length > 0 
            ? `<div class="toast-actions">${actions.map(action => 
                `<button class="btn btn-sm ${action.class || ''}" data-action="${action.text}">${action.text}</button>`
              ).join('')}</div>`
            : '';

        element.innerHTML = `
            <div class="toast-icon">
                <i data-lucide="${icon}" class="toast-icon-svg"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
                ${actionsHtml}
            </div>
            <button class="toast-close" data-action="close">
                <i data-lucide="x" class="close-icon"></i>
            </button>
        `;

        // Обработчики событий
        this.attachEventListeners(element, notification);

        return element;
    }

    // Прикрепить обработчики событий
    attachEventListeners(element, notification) {
        const { id, actions } = notification;

        // Закрытие по клику на кнопку
        const closeBtn = element.querySelector('.toast-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.remove(id);
        });

        // Пауза при наведении мыши
        element.addEventListener('mouseenter', () => {
            if (notification.timer) {
                clearTimeout(notification.timer);
                notification.timer = null;
            }
        });

        // Возобновление таймера при уходе мыши
        element.addEventListener('mouseleave', () => {
            if (!notification.persistent && notification.duration > 0) {
                const remainingTime = notification.duration - (Date.now() - notification.createdAt);
                if (remainingTime > 0) {
                    notification.timer = setTimeout(() => {
                        this.remove(id);
                    }, Math.min(remainingTime, 1000));
                }
            }
        });

        // Обработчики действий
        actions.forEach(action => {
            const actionBtn = element.querySelector(`[data-action="${action.text}"]`);
            if (actionBtn) {
                actionBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (action.onClick) {
                        action.onClick();
                    }
                    // Закрыть уведомление после действия, если не указано иное
                    if (action.keepOpen !== true) {
                        this.remove(id);
                    }
                });
            }
        });
    }

    // Получить иконку для типа уведомления
    getIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info',
            loading: 'loader'
        };
        return icons[type] || 'info';
    }

    // Генерировать уникальный ID
    generateId() {
        return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Получить все активные уведомления
    getActive() {
        return Array.from(this.notifications.values());
    }

    // Получить количество активных уведомлений
    getCount() {
        return this.notifications.size;
    }

    // Показать прогресс операции
    showProgress(title, initialProgress = 0) {
        const id = this.generateId();
        
        const notification = {
            id,
            type: 'progress',
            title,
            progress: initialProgress,
            persistent: true,
            element: null
        };

        // Создать элемент с прогрессом
        const element = document.createElement('div');
        element.className = 'toast toast-progress';
        element.setAttribute('data-id', id);

        element.innerHTML = `
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-progress">
                    <div class="toast-progress-bar" style="width: ${initialProgress}%"></div>
                </div>
                <div class="toast-progress-text">${initialProgress}%</div>
            </div>
            <button class="toast-close" data-action="close">
                <i data-lucide="x" class="close-icon"></i>
            </button>
        `;

        // Обработчик закрытия
        element.querySelector('.toast-close').addEventListener('click', () => {
            this.remove(id);
        });

        notification.element = element;
        
        // Добавить в контейнер и коллекцию
        this.container.appendChild(element);
        this.notifications.set(id, notification);

        // Анимация появления
        requestAnimationFrame(() => {
            element.classList.add('show');
        });

        // Вернуть объект для управления прогрессом
        return {
            id,
            updateProgress: (progress, text) => {
                const progressBar = element.querySelector('.toast-progress-bar');
                const progressText = element.querySelector('.toast-progress-text');
                
                if (progressBar) {
                    progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
                }
                
                if (progressText) {
                    progressText.textContent = text || `${progress}%`;
                }
                
                notification.progress = progress;
                
                // Автоматически закрыть при 100%
                if (progress >= 100) {
                    setTimeout(() => this.remove(id), 1000);
                }
            },
            complete: (message) => {
                this.update(id, {
                    type: 'success',
                    title: message || 'Завершено'
                });
                setTimeout(() => this.remove(id), 2000);
            },
            error: (message) => {
                this.update(id, {
                    type: 'error',
                    title: message || 'Ошибка'
                });
            },
            remove: () => this.remove(id)
        };
    }
}

// Глобальный экземпляр
const NotificationManager = new NotificationManager();

// Упрощенные глобальные функции
window.showSuccess = (title, message, options) => NotificationManager.showSuccess(title, message, options);
window.showError = (title, message, options) => NotificationManager.showError(title, message, options);
window.showWarning = (title, message, options) => NotificationManager.showWarning(title, message, options);
window.showInfo = (title, message, options) => NotificationManager.showInfo(title, message, options);
window.showConfirm = (title, message, onConfirm, onCancel) => NotificationManager.showConfirm(title, message, onConfirm, onCancel);
window.showLoading = (title, message) => NotificationManager.showLoading(title, message);
window.showProgress = (title, progress) => NotificationManager.showProgress(title, progress);

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotificationManager };
}
// dom-safe.js - Безопасные утилиты для работы с DOM

/**
 * Создает DOM элемент безопасным способом без использования innerHTML
 * @param {string} tagName - Имя тега
 * @param {Object} attributes - Атрибуты элемента
 * @param {string|Node|Array} content - Содержимое элемента
 * @returns {HTMLElement}
 */
function createSafeElement(tagName, attributes = {}, content = '') {
    const element = document.createElement(tagName);
    
    // Устанавливаем атрибуты
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Устанавливаем содержимое
    if (Array.isArray(content)) {
        content.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
    } else if (typeof content === 'string') {
        element.textContent = content;
    } else if (content instanceof Node) {
        element.appendChild(content);
    }
    
    return element;
}

/**
 * Безопасная замена innerHTML для модальных окон
 * @param {HTMLElement} container - Контейнер
 * @param {Object} config - Конфигурация содержимого
 */
function createSafeModal(container, config) {
    // Очищаем контейнер
    container.textContent = '';
    
    const modalContent = createSafeElement('div', { 
        class: 'modal-content',
        style: config.style || {}
    });
    
    // Кнопка закрытия
    if (config.closable !== false) {
        const closeBtn = createSafeElement('button', {
            class: 'close-button',
            'aria-label': 'Закрыть'
        }, '×');
        closeBtn.onclick = config.onClose || (() => container.classList.remove('active'));
        modalContent.appendChild(closeBtn);
    }
    
    // Иконка/анимация
    if (config.icon) {
        const animation = createSafeElement('div', { class: 'prize-animation' });
        const icon = createSafeElement('i', { 
            class: config.icon.class || 'fas fa-gift',
            style: config.icon.style || {}
        });
        animation.appendChild(icon);
        modalContent.appendChild(animation);
    }
    
    // Заголовок
    if (config.title) {
        const title = createSafeElement('h3', {
            style: config.titleStyle || {}
        }, config.title);
        modalContent.appendChild(title);
    }
    
    // Описание
    if (config.description) {
        const desc = createSafeElement('p', {
            style: config.descriptionStyle || {}
        }, config.description);
        modalContent.appendChild(desc);
    }
    
    // Кнопки
    if (config.buttons && Array.isArray(config.buttons)) {
        config.buttons.forEach(btnConfig => {
            const button = createSafeElement('button', {
                class: btnConfig.class || 'admin-contact-button',
                style: btnConfig.style || {}
            }, btnConfig.text || 'OK');
            
            if (btnConfig.onclick) {
                button.onclick = btnConfig.onclick;
            }
            
            modalContent.appendChild(button);
        });
    }
    
    container.appendChild(modalContent);
}

/**
 * Санитизация HTML строк (базовая реализация)
 * @param {string} html - HTML строка
 * @returns {string} - Безопасная строка
 */
function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

/**
 * Безопасное добавление CSS классов
 * @param {HTMLElement} element - Элемент
 * @param {string|Array} classes - Классы для добавления
 */
function addSafeClasses(element, classes) {
    if (typeof classes === 'string') {
        classes = classes.split(' ');
    }
    
    classes.forEach(className => {
        // Валидация имени класса (только буквы, цифры, дефисы, подчеркивания)
        if (/^[a-zA-Z0-9_-]+$/.test(className)) {
            element.classList.add(className);
        }
    });
}

// Экспортируем для глобального использования
window.createSafeElement = createSafeElement;
window.createSafeModal = createSafeModal;
window.sanitizeHTML = sanitizeHTML;
window.addSafeClasses = addSafeClasses;

export { createSafeElement, createSafeModal, sanitizeHTML, addSafeClasses };
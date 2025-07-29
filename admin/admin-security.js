// admin-security.js - Безопасные утилиты для админ-панели

/**
 * Безопасное создание элементов таблицы
 */
function createSafeTableCell(content, classes = '') {
    const cell = document.createElement('td');
    if (classes) cell.className = classes;
    
    if (typeof content === 'string') {
        cell.textContent = content;
    } else if (content instanceof Node) {
        cell.appendChild(content);
    } else if (Array.isArray(content)) {
        content.forEach(item => {
            if (typeof item === 'string') {
                cell.appendChild(document.createTextNode(item));
            } else if (item instanceof Node) {
                cell.appendChild(item);
            }
        });
    }
    
    return cell;
}

/**
 * Создание безопасного badge элемента
 */
function createBadge(text, type = 'primary') {
    const badge = document.createElement('span');
    badge.className = `badge bg-${type}`;
    badge.textContent = text;
    return badge;
}

/**
 * Создание безопасной кнопки
 */
function createSafeButton(text, classes = '', onClick = null) {
    const button = document.createElement('button');
    button.className = classes;
    button.textContent = text;
    
    if (onClick && typeof onClick === 'function') {
        button.addEventListener('click', onClick);
    }
    
    return button;
}

/**
 * Создание безопасной иконки
 */
function createIcon(iconClass) {
    const icon = document.createElement('i');
    // Валидация класса иконки
    if (/^(fas|fab|far)\s+fa-[\w-]+$/.test(iconClass)) {
        icon.className = iconClass;
    }
    return icon;
}

/**
 * Безопасное создание контейнера с классами
 */
function createContainer(tag = 'div', classes = '') {
    const container = document.createElement(tag);
    if (classes && /^[a-zA-Z0-9\s_-]+$/.test(classes)) {
        container.className = classes;
    }
    return container;
}

/**
 * Санитизация и валидация пользовательских данных
 */
function sanitizeUserData(data) {
    if (typeof data === 'string') {
        return data.replace(/[<>'"&]/g, (match) => {
            const entityMap = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '&': '&amp;'
            };
            return entityMap[match];
        });
    }
    return data;
}

/**
 * Безопасное заполнение таблицы
 */
function populateTableSafely(tableId, data, columnConfigs) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    
    // Очищаем таблицу
    tbody.textContent = '';
    
    if (data.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = columnConfigs.length;
        cell.className = 'text-center text-muted';
        cell.textContent = 'Нет данных для отображения';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }
    
    data.forEach(item => {
        const row = document.createElement('tr');
        
        columnConfigs.forEach(config => {
            const cell = document.createElement('td');
            
            if (config.render && typeof config.render === 'function') {
                const content = config.render(item);
                if (content instanceof Node) {
                    cell.appendChild(content);
                } else {
                    cell.textContent = sanitizeUserData(content);
                }
            } else if (config.field) {
                cell.textContent = sanitizeUserData(item[config.field] || '');
            }
            
            if (config.className) {
                cell.className = config.className;
            }
            
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
}

/**
 * Безопасное создание алерта
 */
function createSafeAlert(message, type = 'info', dismissible = true) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}${dismissible ? ' alert-dismissible fade show' : ''}`;
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = sanitizeUserData(message);
    alertDiv.appendChild(messageSpan);
    
    if (dismissible) {
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close';
        closeBtn.setAttribute('data-bs-dismiss', 'alert');
        closeBtn.setAttribute('aria-label', 'Close');
        alertDiv.appendChild(closeBtn);
    }
    
    return alertDiv;
}

/**
 * Безопасная установка статистики
 */
function updateStatSafely(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        // Валидация числового значения
        const numValue = parseInt(value);
        element.textContent = isNaN(numValue) ? '0' : numValue.toString();
    }
}

// Экспортируем функции для глобального использования
window.createSafeTableCell = createSafeTableCell;
window.createBadge = createBadge;
window.createSafeButton = createSafeButton;
window.createIcon = createIcon;
window.createContainer = createContainer;
window.sanitizeUserData = sanitizeUserData;
window.populateTableSafely = populateTableSafely;
window.createSafeAlert = createSafeAlert;
window.updateStatSafely = updateStatSafely;
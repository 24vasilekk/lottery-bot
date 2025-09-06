// Утилиты для форматирования данных
class Formatters {
    // Форматирование даты и времени
    static formatDate(date, options = {}) {
        if (!date) return '—';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '—';

        const defaultOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            ...options
        };

        return d.toLocaleDateString('ru-RU', defaultOptions);
    }

    // Форматирование даты (только дата)
    static formatDateOnly(date) {
        return this.formatDate(date, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    // Форматирование времени (только время)
    static formatTimeOnly(date) {
        return this.formatDate(date, {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Относительное время (например, "2 часа назад")
    static formatRelativeTime(date) {
        if (!date) return '—';
        
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;

        if (diff < 60000) return 'только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} дн назад`;
        
        return this.formatDateOnly(date);
    }

    // Форматирование числа с разделителями тысяч
    static formatNumber(number, options = {}) {
        if (number === null || number === undefined) return '—';
        
        const num = Number(number);
        if (isNaN(num)) return '—';

        return num.toLocaleString('ru-RU', options);
    }

    // Форматирование денежных сумм
    static formatCurrency(amount, currency = 'RUB') {
        return this.formatNumber(amount, {
            style: 'currency',
            currency: currency
        });
    }

    // Форматирование процентов
    static formatPercent(value, decimals = 1) {
        if (value === null || value === undefined) return '—';
        
        const num = Number(value);
        if (isNaN(num)) return '—';

        return `${num.toFixed(decimals)}%`;
    }

    // Форматирование размера файла
    static formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 Б';

        const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    }

    // Форматирование длительности
    static formatDuration(seconds) {
        if (!seconds || seconds < 0) return '0 сек';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours} ч ${minutes} мин`;
        }
        if (minutes > 0) {
            return `${minutes} мин ${secs} сек`;
        }
        return `${secs} сек`;
    }

    // Сокращение длинного текста
    static truncate(text, maxLength = 50, suffix = '...') {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    }

    // Форматирование имени пользователя
    static formatUserName(user) {
        if (!user) return 'Неизвестно';
        
        if (user.first_name && user.last_name) {
            return `${user.first_name} ${user.last_name}`;
        }
        
        if (user.first_name) {
            return user.first_name;
        }
        
        if (user.username) {
            return `@${user.username}`;
        }
        
        return `ID: ${user.id || user.telegram_id}`;
    }

    // Форматирование ID пользователя с префиксом
    static formatUserId(id) {
        if (!id) return '—';
        return `ID: ${id}`;
    }

    // Форматирование статуса
    static formatStatus(status, statusMap = {}) {
        if (!status) return '—';
        
        const defaultMap = {
            active: 'Активен',
            inactive: 'Неактивен',
            banned: 'Заблокирован',
            pending: 'Ожидает',
            completed: 'Завершен',
            cancelled: 'Отменен'
        };

        const map = { ...defaultMap, ...statusMap };
        return map[status] || status;
    }

    // Форматирование типа приза
    static formatPrizeType(type) {
        const types = {
            stars: '⭐ Звезды',
            certificate: '🎫 Сертификат',
            custom: '🎁 Кастомный',
            bonus: '💎 Бонус'
        };
        
        return types[type] || type;
    }

    // Форматирование канала
    static formatChannel(channel) {
        if (!channel) return '—';
        
        if (typeof channel === 'string') {
            return channel.startsWith('@') ? channel : `@${channel}`;
        }
        
        if (channel.username) {
            return `@${channel.username}`;
        }
        
        return channel.name || channel.title || '—';
    }

    // Форматирование JSON для отображения
    static formatJSON(obj, indent = 2) {
        if (!obj) return '';
        
        try {
            return JSON.stringify(obj, null, indent);
        } catch (error) {
            return String(obj);
        }
    }

    // Форматирование булевых значений
    static formatBoolean(value, trueText = 'Да', falseText = 'Нет') {
        if (value === true) return trueText;
        if (value === false) return falseText;
        return '—';
    }

    // Форматирование массива в строку
    static formatArray(array, separator = ', ', formatter = null) {
        if (!Array.isArray(array) || array.length === 0) return '—';
        
        if (formatter && typeof formatter === 'function') {
            return array.map(formatter).join(separator);
        }
        
        return array.join(separator);
    }

    // Форматирование рейтинга/оценки
    static formatRating(rating, maxRating = 5) {
        if (rating === null || rating === undefined) return '—';
        
        const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(maxRating - Math.floor(rating));
        return `${stars} (${rating}/${maxRating})`;
    }

    // Форматирование прогресса
    static formatProgress(current, total, showPercent = true) {
        if (!total || total === 0) return '0%';
        
        const percentage = Math.round((current / total) * 100);
        
        if (showPercent) {
            return `${current}/${total} (${percentage}%)`;
        }
        
        return `${current}/${total}`;
    }

    // Форматирование цвета статуса
    static getStatusColor(status) {
        const colors = {
            active: '#48bb78',      // зеленый
            inactive: '#718096',    // серый
            banned: '#f56565',      // красный
            pending: '#ed8936',     // оранжевый
            completed: '#48bb78',   // зеленый
            cancelled: '#f56565',   // красный
            warning: '#ecc94b',     // желтый
            info: '#4299e1',        // синий
            success: '#48bb78',     // зеленый
            error: '#f56565'        // красный
        };
        
        return colors[status] || '#718096';
    }

    // Форматирование изменений (для статистики)
    static formatChange(current, previous, isPercent = false) {
        if (previous === null || previous === undefined || previous === 0) {
            return { text: '—', color: '#718096', isPositive: null };
        }
        
        const change = current - previous;
        const changePercent = (change / previous) * 100;
        const isPositive = change > 0;
        
        const text = isPercent 
            ? `${isPositive ? '+' : ''}${changePercent.toFixed(1)}%`
            : `${isPositive ? '+' : ''}${this.formatNumber(change)}`;
            
        const color = isPositive ? '#48bb78' : change < 0 ? '#f56565' : '#718096';
        
        return { text, color, isPositive };
    }

    // Безопасное получение вложенного свойства
    static safeGet(obj, path, defaultValue = '—') {
        if (!obj || !path) return defaultValue;
        
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
        
        return current === null || current === undefined ? defaultValue : current;
    }

    // Создание avatar-а из имени пользователя
    static createAvatar(name, size = 40) {
        if (!name) return '';
        
        const initials = name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();
            
        const colors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c',
            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
            '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
        ];
        
        const colorIndex = name.length % colors.length;
        const backgroundColor = colors[colorIndex];
        
        return `<div class="user-avatar" style="
            width: ${size}px;
            height: ${size}px;
            background: ${backgroundColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: ${size * 0.4}px;
        ">${initials}</div>`;
    }

    // Подсветка поискового запроса в тексте
    static highlightSearch(text, query) {
        if (!text || !query) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // Форматирование IP адреса (если нужно скрыть часть)
    static formatIP(ip, maskLast = false) {
        if (!ip) return '—';
        
        if (maskLast) {
            const parts = ip.split('.');
            if (parts.length === 4) {
                parts[3] = 'xxx';
                return parts.join('.');
            }
        }
        
        return ip;
    }

    // Форматирование User Agent (сокращенно)
    static formatUserAgent(ua) {
        if (!ua) return '—';
        
        // Извлечь название браузера
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        if (ua.includes('Opera')) return 'Opera';
        
        return 'Другой';
    }

    // Экранирование HTML
    static escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Безопасное отображение HTML
    static sanitizeHtml(html) {
        if (!html || typeof html !== 'string') return '';
        
        return html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Formatters };
}
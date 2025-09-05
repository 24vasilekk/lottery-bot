// Утилиты для валидации данных
class Validators {
    // Проверить обязательное поле
    static required(value, message = 'Поле обязательно для заполнения') {
        if (value === null || value === undefined || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
            return { valid: false, message };
        }
        return { valid: true };
    }

    // Проверить минимальную длину
    static minLength(value, min, message = null) {
        if (!value) return { valid: true }; // Пропустить если пустое
        
        const length = String(value).length;
        if (length < min) {
            return {
                valid: false,
                message: message || `Минимальная длина: ${min} символов`
            };
        }
        return { valid: true };
    }

    // Проверить максимальную длину
    static maxLength(value, max, message = null) {
        if (!value) return { valid: true };
        
        const length = String(value).length;
        if (length > max) {
            return {
                valid: false,
                message: message || `Максимальная длина: ${max} символов`
            };
        }
        return { valid: true };
    }

    // Проверить email
    static email(value, message = 'Некорректный email адрес') {
        if (!value) return { valid: true };
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return { valid: false, message };
        }
        return { valid: true };
    }

    // Проверить URL
    static url(value, message = 'Некорректный URL') {
        if (!value) return { valid: true };
        
        try {
            new URL(value);
            return { valid: true };
        } catch {
            return { valid: false, message };
        }
    }

    // Проверить число
    static number(value, message = 'Должно быть числом') {
        if (!value && value !== 0) return { valid: true };
        
        const num = Number(value);
        if (isNaN(num)) {
            return { valid: false, message };
        }
        return { valid: true };
    }

    // Проверить целое число
    static integer(value, message = 'Должно быть целым числом') {
        if (!value && value !== 0) return { valid: true };
        
        const num = Number(value);
        if (isNaN(num) || !Number.isInteger(num)) {
            return { valid: false, message };
        }
        return { valid: true };
    }

    // Проверить минимальное значение
    static min(value, minValue, message = null) {
        if (!value && value !== 0) return { valid: true };
        
        const num = Number(value);
        if (isNaN(num) || num < minValue) {
            return {
                valid: false,
                message: message || `Минимальное значение: ${minValue}`
            };
        }
        return { valid: true };
    }

    // Проверить максимальное значение
    static max(value, maxValue, message = null) {
        if (!value && value !== 0) return { valid: true };
        
        const num = Number(value);
        if (isNaN(num) || num > maxValue) {
            return {
                valid: false,
                message: message || `Максимальное значение: ${maxValue}`
            };
        }
        return { valid: true };
    }

    // Проверить диапазон
    static range(value, min, max, message = null) {
        if (!value && value !== 0) return { valid: true };
        
        const num = Number(value);
        if (isNaN(num) || num < min || num > max) {
            return {
                valid: false,
                message: message || `Значение должно быть от ${min} до ${max}`
            };
        }
        return { valid: true };
    }

    // Проверить регулярное выражение
    static pattern(value, regex, message = 'Некорректный формат') {
        if (!value) return { valid: true };
        
        if (!regex.test(value)) {
            return { valid: false, message };
        }
        return { valid: true };
    }

    // Проверить Telegram ID
    static telegramId(value, message = 'Некорректный Telegram ID') {
        if (!value) return { valid: true };
        
        const id = String(value).trim();
        
        // Telegram ID должен быть положительным числом
        if (!/^\d+$/.test(id) || Number(id) <= 0) {
            return { valid: false, message };
        }
        
        return { valid: true };
    }

    // Проверить имя пользователя Telegram
    static telegramUsername(value, message = 'Некорректное имя пользователя Telegram') {
        if (!value) return { valid: true };
        
        let username = String(value).trim();
        
        // Убрать @ если есть
        if (username.startsWith('@')) {
            username = username.substring(1);
        }
        
        // Проверить формат
        if (!/^[a-zA-Z0-9_]{5,32}$/.test(username)) {
            return { valid: false, message };
        }
        
        return { valid: true };
    }

    // Проверить канал Telegram
    static telegramChannel(value, message = 'Некорректное имя канала') {
        if (!value) return { valid: true };
        
        let channel = String(value).trim();
        
        // Должен начинаться с @
        if (!channel.startsWith('@')) {
            return {
                valid: false,
                message: 'Имя канала должно начинаться с @'
            };
        }
        
        // Убрать @ для проверки
        const channelName = channel.substring(1);
        
        // Проверить формат
        if (!/^[a-zA-Z0-9_]{5,32}$/.test(channelName)) {
            return { valid: false, message };
        }
        
        return { valid: true };
    }

    // Проверить процент (0-100)
    static percentage(value, message = 'Значение должно быть от 0 до 100') {
        const numResult = this.number(value, 'Должно быть числом');
        if (!numResult.valid) return numResult;
        
        return this.range(value, 0, 100, message);
    }

    // Проверить положительное число
    static positive(value, message = 'Значение должно быть положительным') {
        const numResult = this.number(value, 'Должно быть числом');
        if (!numResult.valid) return numResult;
        
        if (Number(value) <= 0) {
            return { valid: false, message };
        }
        
        return { valid: true };
    }

    // Проверить дату
    static date(value, message = 'Некорректная дата') {
        if (!value) return { valid: true };
        
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            return { valid: false, message };
        }
        
        return { valid: true };
    }

    // Проверить дату в будущем
    static futureDate(value, message = 'Дата должна быть в будущем') {
        const dateResult = this.date(value, 'Некорректная дата');
        if (!dateResult.valid) return dateResult;
        
        if (!value) return { valid: true };
        
        const date = new Date(value);
        const now = new Date();
        
        if (date <= now) {
            return { valid: false, message };
        }
        
        return { valid: true };
    }

    // Проверить совпадение с другим полем
    static match(value, otherValue, message = 'Значения не совпадают') {
        if (value !== otherValue) {
            return { valid: false, message };
        }
        return { valid: true };
    }

    // Проверить JSON
    static json(value, message = 'Некорректный JSON') {
        if (!value) return { valid: true };
        
        try {
            JSON.parse(value);
            return { valid: true };
        } catch {
            return { valid: false, message };
        }
    }

    // Проверить массив значений
    static oneOf(value, allowedValues, message = null) {
        if (!value) return { valid: true };
        
        if (!allowedValues.includes(value)) {
            return {
                valid: false,
                message: message || `Допустимые значения: ${allowedValues.join(', ')}`
            };
        }
        
        return { valid: true };
    }

    // Кастомная валидация
    static custom(value, validator, message = 'Некорректное значение') {
        try {
            const result = validator(value);
            if (result === false) {
                return { valid: false, message };
            }
            if (typeof result === 'object' && !result.valid) {
                return result;
            }
            return { valid: true };
        } catch (error) {
            return { valid: false, message: error.message || message };
        }
    }
}

// Класс для валидации форм
class FormValidator {
    constructor() {
        this.rules = new Map();
        this.errors = new Map();
        this.customMessages = new Map();
    }

    // Добавить правило валидации
    addRule(fieldName, validators) {
        this.rules.set(fieldName, validators);
        return this;
    }

    // Добавить кастомное сообщение
    setMessage(fieldName, validatorName, message) {
        const key = `${fieldName}.${validatorName}`;
        this.customMessages.set(key, message);
        return this;
    }

    // Валидировать поле
    validateField(fieldName, value) {
        const fieldRules = this.rules.get(fieldName);
        if (!fieldRules) return { valid: true };

        for (const rule of fieldRules) {
            const { validator, params = [], message } = this.parseRule(rule);
            
            // Получить кастомное сообщение если есть
            const customMessage = this.customMessages.get(`${fieldName}.${validator}`);
            const validationMessage = customMessage || message;

            let result;
            if (typeof Validators[validator] === 'function') {
                result = Validators[validator](value, ...params, validationMessage);
            } else {
                console.warn(`Валидатор "${validator}" не найден`);
                continue;
            }

            if (!result.valid) {
                this.errors.set(fieldName, result.message);
                return result;
            }
        }

        this.errors.delete(fieldName);
        return { valid: true };
    }

    // Валидировать всю форму
    validate(data) {
        this.errors.clear();
        let isValid = true;

        for (const [fieldName] of this.rules) {
            const value = data[fieldName];
            const result = this.validateField(fieldName, value);
            
            if (!result.valid) {
                isValid = false;
            }
        }

        return {
            valid: isValid,
            errors: Object.fromEntries(this.errors)
        };
    }

    // Парсить правило валидации
    parseRule(rule) {
        if (typeof rule === 'string') {
            // Простое правило: "required"
            return { validator: rule, params: [] };
        }

        if (typeof rule === 'object') {
            if (rule.validator) {
                // Объект: { validator: 'min', params: [10], message: 'Минимум 10' }
                return rule;
            }

            // Объект с ключами-валидаторами: { required: true, min: 10 }
            const validator = Object.keys(rule)[0];
            const params = Array.isArray(rule[validator]) ? rule[validator] : [rule[validator]];
            return { validator, params };
        }

        if (typeof rule === 'function') {
            // Функция валидации
            return {
                validator: 'custom',
                params: [rule]
            };
        }

        console.warn('Некорректное правило валидации:', rule);
        return { validator: 'required', params: [] };
    }

    // Получить ошибки
    getErrors() {
        return Object.fromEntries(this.errors);
    }

    // Получить ошибку для поля
    getError(fieldName) {
        return this.errors.get(fieldName);
    }

    // Очистить ошибки
    clearErrors() {
        this.errors.clear();
        return this;
    }

    // Очистить ошибку для поля
    clearError(fieldName) {
        this.errors.delete(fieldName);
        return this;
    }

    // Есть ли ошибки
    hasErrors() {
        return this.errors.size > 0;
    }
}

// Утилиты для работы с DOM формами
class FormUtils {
    // Получить данные формы
    static getFormData(form) {
        const formData = new FormData(form);
        const data = {};

        for (const [key, value] of formData.entries()) {
            // Обработка checkbox-ов
            const input = form.querySelector(`[name="${key}"]`);
            if (input && input.type === 'checkbox') {
                data[key] = input.checked;
            } else if (input && input.type === 'number') {
                data[key] = value === '' ? null : Number(value);
            } else {
                data[key] = value;
            }
        }

        return data;
    }

    // Заполнить форму данными
    static fillForm(form, data) {
        for (const [key, value] of Object.entries(data)) {
            const input = form.querySelector(`[name="${key}"]`);
            if (!input) continue;

            if (input.type === 'checkbox') {
                input.checked = Boolean(value);
            } else if (input.type === 'radio') {
                const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
                if (radio) radio.checked = true;
            } else {
                input.value = value || '';
            }
        }
    }

    // Показать ошибки в форме
    static showErrors(form, errors) {
        // Очистить предыдущие ошибки
        this.clearErrors(form);

        for (const [fieldName, message] of Object.entries(errors)) {
            const input = form.querySelector(`[name="${fieldName}"]`);
            if (!input) continue;

            // Добавить класс ошибки
            input.classList.add('error');

            // Создать элемент с сообщением об ошибке
            const errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            errorEl.textContent = message;

            // Вставить после поля
            input.parentNode.appendChild(errorEl);
        }
    }

    // Очистить ошибки в форме
    static clearErrors(form) {
        // Убрать классы ошибок
        form.querySelectorAll('.error').forEach(el => {
            el.classList.remove('error');
        });

        // Удалить сообщения об ошибках
        form.querySelectorAll('.field-error').forEach(el => {
            el.remove();
        });
    }

    // Валидировать форму в реальном времени
    static setupRealTimeValidation(form, validator) {
        const inputs = form.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            const fieldName = input.name;
            if (!fieldName) return;

            // Валидация при потере фокуса
            input.addEventListener('blur', () => {
                const value = input.type === 'checkbox' ? input.checked : input.value;
                const result = validator.validateField(fieldName, value);

                // Очистить предыдущие ошибки для этого поля
                this.clearFieldError(input);

                if (!result.valid) {
                    this.showFieldError(input, result.message);
                }
            });

            // Очистка ошибки при вводе
            input.addEventListener('input', () => {
                if (input.classList.contains('error')) {
                    this.clearFieldError(input);
                }
            });
        });
    }

    // Показать ошибку для конкретного поля
    static showFieldError(input, message) {
        input.classList.add('error');

        const errorEl = document.createElement('div');
        errorEl.className = 'field-error';
        errorEl.textContent = message;

        input.parentNode.appendChild(errorEl);
    }

    // Очистить ошибку для конкретного поля
    static clearFieldError(input) {
        input.classList.remove('error');

        const errorEl = input.parentNode.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Validators, FormValidator, FormUtils };
}
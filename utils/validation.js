// validation.js - Валидация входных данных

/**
 * Валидация Telegram User ID
 */
function validateTelegramId(id) {
    if (typeof id === 'string') {
        id = parseInt(id);
    }
    
    return {
        isValid: Number.isInteger(id) && id > 0 && id < 9007199254740991, // JavaScript safe integer
        value: id,
        error: !Number.isInteger(id) || id <= 0 ? 'Invalid Telegram ID' : null
    };
}

/**
 * Валидация типа прокрутки
 */
function validateSpinType(type) {
    const validTypes = ['normal', 'mega', 'friend', 'stars'];
    
    return {
        isValid: typeof type === 'string' && validTypes.includes(type),
        value: type,
        error: !validTypes.includes(type) ? `Spin type must be one of: ${validTypes.join(', ')}` : null
    };
}

/**
 * Валидация количества звезд
 */
function validateStarsAmount(amount) {
    if (typeof amount === 'string') {
        amount = parseInt(amount);
    }
    
    return {
        isValid: Number.isInteger(amount) && amount >= 0 && amount <= 999999,
        value: amount,
        error: !Number.isInteger(amount) || amount < 0 || amount > 999999 
            ? 'Stars amount must be between 0 and 999999' : null
    };
}

/**
 * Валидация строковых данных
 */
function validateString(str, minLength = 0, maxLength = 1000, allowEmpty = true) {
    if (typeof str !== 'string') {
        return {
            isValid: false,
            value: '',
            error: 'Value must be a string'
        };
    }
    
    if (!allowEmpty && str.length === 0) {
        return {
            isValid: false,
            value: str,
            error: 'String cannot be empty'
        };
    }
    
    if (str.length < minLength || str.length > maxLength) {
        return {
            isValid: false,
            value: str,
            error: `String length must be between ${minLength} and ${maxLength} characters`
        };
    }
    
    // Проверка на потенциально опасные символы
    const dangerousPattern = /<script|javascript:|data:|vbscript:|on\w+\s*=/i;
    if (dangerousPattern.test(str)) {
        return {
            isValid: false,
            value: str,
            error: 'String contains potentially dangerous content'
        };
    }
    
    return {
        isValid: true,
        value: str.trim(),
        error: null
    };
}

/**
 * Валидация операций со звездами
 */
function validateStarsOperation(operation) {
    const validOps = ['add', 'subtract', 'set'];
    
    return {
        isValid: typeof operation === 'string' && validOps.includes(operation),
        value: operation,
        error: !validOps.includes(operation) ? `Operation must be one of: ${validOps.join(', ')}` : null
    };
}

/**
 * Валидация объекта приза
 */
function validatePrize(prize) {
    const errors = [];
    
    if (!prize || typeof prize !== 'object') {
        return {
            isValid: false,
            value: null,
            error: 'Prize must be an object'
        };
    }
    
    // Проверяем обязательные поля
    const requiredFields = ['id', 'name', 'type'];
    for (const field of requiredFields) {
        if (!prize[field]) {
            errors.push(`Prize.${field} is required`);
        }
    }
    
    // Валидируем типы
    if (prize.id && !Number.isInteger(Number(prize.id))) {
        errors.push('Prize.id must be a number');
    }
    
    if (prize.name) {
        const nameValidation = validateString(prize.name, 1, 100, false);
        if (!nameValidation.isValid) {
            errors.push(`Prize.name: ${nameValidation.error}`);
        }
    }
    
    if (prize.value && !Number.isInteger(Number(prize.value))) {
        errors.push('Prize.value must be a number');
    }
    
    return {
        isValid: errors.length === 0,
        value: prize,
        error: errors.length > 0 ? errors.join(', ') : null
    };
}

/**
 * Валидация данных канала
 */
function validateChannelData(channel) {
    const errors = [];
    
    if (!channel || typeof channel !== 'object') {
        return {
            isValid: false,
            value: null,
            error: 'Channel data must be an object'
        };
    }
    
    // Валидируем username канала
    if (channel.username) {
        const usernamePattern = /^[a-zA-Z0-9_]{5,32}$/;
        if (!usernamePattern.test(channel.username)) {
            errors.push('Channel username must be 5-32 characters, letters, numbers and underscore only');
        }
    }
    
    // Валидируем reward_stars
    if (channel.reward_stars !== undefined) {
        const starsValidation = validateStarsAmount(channel.reward_stars);
        if (!starsValidation.isValid) {
            errors.push(`Channel reward_stars: ${starsValidation.error}`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        value: channel,
        error: errors.length > 0 ? errors.join(', ') : null
    };
}

/**
 * Комплексная валидация запроса
 */
function validateRequest(data, schema) {
    const errors = [];
    const validatedData = {};
    
    for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];
        
        // Проверяем обязательные поля
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`Field '${field}' is required`);
            continue;
        }
        
        // Если поле не обязательное и отсутствует, пропускаем
        if (!rules.required && (value === undefined || value === null)) {
            validatedData[field] = rules.default !== undefined ? rules.default : null;
            continue;
        }
        
        // Применяем валидацию по типу
        let validation;
        switch (rules.type) {
            case 'telegram_id':
                validation = validateTelegramId(value);
                break;
            case 'spin_type':
                validation = validateSpinType(value);
                break;
            case 'stars_amount':
                validation = validateStarsAmount(value);
                break;
            case 'string':
                validation = validateString(value, rules.minLength, rules.maxLength, rules.allowEmpty);
                break;
            case 'stars_operation':
                validation = validateStarsOperation(value);
                break;
            case 'prize':
                validation = validatePrize(value);
                break;
            case 'channel':
                validation = validateChannelData(value);
                break;
            default:
                validation = { isValid: true, value: value, error: null };
        }
        
        if (!validation.isValid) {
            errors.push(`Field '${field}': ${validation.error}`);
        } else {
            validatedData[field] = validation.value;
        }
    }
    
    return {
        isValid: errors.length === 0,
        data: validatedData,
        errors: errors
    };
}

module.exports = {
    validateTelegramId,
    validateSpinType,
    validateStarsAmount,
    validateString,
    validateStarsOperation,
    validatePrize,
    validateChannelData,
    validateRequest
};
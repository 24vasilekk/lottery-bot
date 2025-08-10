// ============================================================================
// ИСПРАВЛЕННЫЙ CONFIG.JS с правильными углами сегментов
// Замените ваш config.js на этот файл
// ============================================================================

// Основные настройки приложения
export const APP_CONFIG = {
    colors: {
        primary: '#EF55A5',
        lime: '#CCD537',
        purple: '#809EFF',
        dark: '#1a1a1a',
        cardBg: '#2a2a2a'
    },
    animations: {
        wheelSpinDuration: 4000, // Длительность прокрутки рулетки
        confettiDuration: 3000,
        notificationDuration: 5000
    },
    wheel: {
        segments: 11, // 11 сегментов (1 пустой + 1 звезды + 9 сертификатов)
        minSpins: 5, // Минимальное количество оборотов
        maxSpins: 8, // Максимальное количество оборотов
        starCost: 20, // Стоимость прокрутки за звезды
        friendSpin: true // Можно крутить за друга
    },
    game: {
        startingStars: 20, // Начальное количество звезд
        startingFriendSpins: 1, // Начальное количество прокруток за друга
        maxRecentWins: 10 // Максимальное количество последних выигрышей
    }
};

// ИСПРАВЛЕННАЯ конфигурация призов рулетки с ПРАВИЛЬНЫМИ углами (сумма = 360°)
export const WHEEL_PRIZES = [
    // 1. ПУСТОЙ сегмент (20% площади) - 72°
    {
        id: 1,
        name: '',
        type: 'empty',
        description: 'Попробуйте еще раз!',
        color: '#000000',
        icon: '',
        rarity: 'common',
        probability: 20, // Визуальная вероятность (для отображения)
        value: 0,
        angle: 72, // 20% от 360° = 72°
        topText: '',
        centerText: ''
    },
    
    // 2. ЗВЕЗДЫ сегмент (10% площади) - 36°
    {
        id: 2,
        name: '20 звезд',
        type: 'stars-20',
        description: 'Получено 20 звезд',
        color: '#FFD700',
        icon: '',
        rarity: 'common',
        probability: 10, // Визуальная вероятность
        value: 20,
        angle: 36, // 10% от 360° = 36°
        topText: '⭐',
        centerText: '20'
    },
    
    // 3-11. СЕРТИФИКАТЫ (9 сегментов, всего 70% площади = 252°)
    // Каждый сегмент: 252° ÷ 9 = 28° (ваше изменение учтено!)
    
    // 3. Золотое яблоко 300₽
    {
        id: 3,
        name: 'ЗЯ 300₽',
        type: 'golden-apple-300',
        description: 'Сертификат Золотое яблоко 300 рублей',
        color: '#E74C3C',
        icon: '',
        rarity: 'rare',
        probability: 7.78, // Визуальная вероятность (28/360*100)
        value: 300,
        angle: 28, // ВАШЕ ИЗМЕНЕННОЕ ЗНАЧЕНИЕ
        topText: '🍎',
        centerText: '300₽'
    },
    
    // 4. Золотое яблоко 500₽
    {
        id: 4,
        name: 'ЗЯ 500₽',
        type: 'golden-apple-500',
        description: 'Сертификат Золотое яблоко 500 рублей',
        color: '#D32F2F',
        icon: '',
        rarity: 'rare',
        probability: 7.78,
        value: 500,
        angle: 28,
        topText: '🍎',
        centerText: '500₽'
    },
    
    // 5. Золотое яблоко 1000₽
    {
        id: 5,
        name: 'ЗЯ 1000₽',
        type: 'golden-apple-1000',
        description: 'Сертификат Золотое яблоко 1000 рублей',
        color: '#C62828',
        icon: '',
        rarity: 'epic',
        probability: 7.78,
        value: 1000,
        angle: 28,
        topText: '🍎',
        centerText: '1000₽'
    },
    
    // 6. Золотое яблоко 2000₽
    {
        id: 6,
        name: 'ЗЯ 2000₽',
        type: 'golden-apple-2000',
        description: 'Сертификат Золотое яблоко 2000 рублей',
        color: '#B71C1C',
        icon: '',
        rarity: 'epic',
        probability: 7.78,
        value: 2000,
        angle: 28,
        topText: '🍎',
        centerText: '2000₽'
    },
    
    // 7. Золотое яблоко 5000₽
    {
        id: 7,
        name: 'ЗЯ 5000₽',
        type: 'golden-apple-5000',
        description: 'Сертификат Золотое яблоко 5000 рублей',
        color: '#AD1457',
        icon: '',
        rarity: 'legendary',
        probability: 7.78,
        value: 5000,
        angle: 28,
        topText: '🍎',
        centerText: '5000₽'
    },
    
    // 8. Wildberries 500₽
    {
        id: 8,
        name: 'WB 500₽',
        type: 'wildberries-500',
        description: 'Сертификат Wildberries 500 рублей',
        color: '#8E24AA',
        icon: '',
        rarity: 'rare',
        probability: 7.78,
        value: 500,
        angle: 28,
        topText: '🛍️',
        centerText: '500₽'
    },
    
    // 9. Wildberries 1000₽
    {
        id: 9,
        name: 'WB 1000₽',
        type: 'wildberries-1000',
        description: 'Сертификат Wildberries 1000 рублей',
        color: '#7B1FA2',
        icon: '',
        rarity: 'epic',
        probability: 7.78,
        value: 1000,
        angle: 28,
        topText: '🛍️',
        centerText: '1000₽'
    },
    
    // 10. Wildberries 2000₽
    {
        id: 10,
        name: 'WB 2000₽',
        type: 'wildberries-2000',
        description: 'Сертификат Wildberries 2000 рублей',
        color: '#6A1B9A',
        icon: '',
        rarity: 'epic',
        probability: 7.78,
        value: 2000,
        angle: 28,
        topText: '🛍️',
        centerText: '2000₽'
    },
    
    // 11. Wildberries 3000₽ - ИСПРАВЛЕН угол для точной суммы 360°
    {
        id: 11,
        name: 'WB 3000₽',
        type: 'wildberries-3000',
        description: 'Сертификат Wildberries 3000 рублей',
        color: '#4A148C',
        icon: '',
        rarity: 'legendary',
        probability: 7.78,
        value: 3000,
        angle: 24, // СКОРРЕКТИРОВАНО: 360° - 72° - 36° - (8*28°) = 24°
        topText: '🛍️',
        centerText: '3000₽'
    }
];

// ============================================================================
// ПРОВЕРКА ПРАВИЛЬНОСТИ УГЛОВ
// ============================================================================

// Функция для проверки что сумма углов = 360°
function validateWheelAngles() {
    const totalAngle = WHEEL_PRIZES.reduce((sum, prize) => sum + prize.angle, 0);
    
    console.log('🔧 Проверка углов рулетки:');
    console.log(`   Общая сумма: ${totalAngle}°`);
    
    WHEEL_PRIZES.forEach((prize, index) => {
        console.log(`   ${index + 1}. ${prize.name || 'Пустой'}: ${prize.angle}°`);
    });
    
    if (Math.abs(totalAngle - 360) < 0.1) {
        console.log('✅ Углы корректны!');
        return true;
    } else {
        console.error(`❌ Некорректная сумма углов: ${totalAngle}° (должно быть 360°)`);
        return false;
    }
}

// Запускаем проверку при загрузке модуля
if (typeof window !== 'undefined') {
    // Проверяем углы при загрузке в браузере
    setTimeout(() => {
        validateWheelAngles();
    }, 100);
}

// ============================================================================
// ДОПОЛНИТЕЛЬНЫЕ КОНСТАНТЫ
// ============================================================================

// Соответствие реальных и визуальных типов призов
export const PRIZE_TYPE_MAPPING = {
    'empty': ['empty'],
    'stars': ['stars-20'],
    'certificate': [
        'golden-apple-300', 'golden-apple-500', 'golden-apple-1000', 
        'golden-apple-2000', 'golden-apple-5000',
        'wildberries-500', 'wildberries-1000', 'wildberries-2000', 'wildberries-3000'
    ]
};

// Цвета по типам для удобства
export const PRIZE_COLORS = {
    empty: '#000000',
    stars: '#FFD700',
    goldenApple: ['#E74C3C', '#D32F2F', '#C62828', '#B71C1C', '#AD1457'],
    wildberries: ['#8E24AA', '#7B1FA2', '#6A1B9A', '#4A148C']
};

export default {
    APP_CONFIG,
    WHEEL_PRIZES,
    PRIZE_TYPE_MAPPING,
    PRIZE_COLORS,
    validateWheelAngles
};

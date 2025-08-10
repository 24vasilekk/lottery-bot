// public/js/config.js - КОНФИГУРАЦИЯ БЕЗ ИКОНОК

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

// ЧИСТАЯ конфигурация призов рулетки - БЕЗ ИКОНОК
export const WHEEL_PRIZES = [
    // 1. ПУСТОЙ сегмент (20% площади) - никакого текста
    {
        id: 1,
        name: '',
        type: 'empty',
        description: 'Попробуйте еще раз!',
        color: '#000000',
        icon: '', // Пустая иконка
        rarity: 'common',
        probability: 20, // 20%
        value: 0,
        angle: 72, // 20% от 360° = 72°
        topText: '', // Ничего вверху
        centerText: '' // Ничего по центру
    },
    
    // 2. ЗВЕЗДЫ сегмент (10% площади)
    {
        id: 2,
        name: '20 звезд',
        type: 'stars-20',
        description: 'Получено 20 звезд',
        color: '#FFD700',
        icon: '', // Без иконки
        rarity: 'common',
        probability: 10, // 10%
        value: 20,
        angle: 36, // 10% от 360° = 36°
        topText: '⭐', // Звезда вверху перпендикулярно
        centerText: '20' // 20 по центру параллельно
    },
    
    // 3-11. СЕРТИФИКАТЫ (9 сегментов по ~7.78% каждый = 70% общая площади)
    {
        id: 3,
        name: 'ЗЯ 300₽',
        type: 'golden-apple-300',
        description: 'Сертификат Золотое яблоко на 300₽',
        color: '#FF6B6B',
        icon: '',
        rarity: 'rare',
        probability: 5.56,
        value: 300,
        angle: 28,
        topText: 'ЗЯ', // ЗЯ вверху перпендикулярно
        centerText: '300₽' // Сумма по центру параллельно
    },
    {
        id: 4,
        name: 'WB 500₽',
        type: 'wildberries-500',
        description: 'Сертификат Wildberries на 500₽',
        color: '#8E44AD',
        icon: '',
        rarity: 'rare',
        probability: 7.78,
        value: 500,
        angle: 28,
        topText: 'WB', // WB вверху перпендикулярно
        centerText: '500₽' // Сумма по центру параллельно
    },
    {
        id: 5,
        name: 'ЗЯ 500₽',
        type: 'golden-apple-500',
        description: 'Сертификат Золотое яблоко на 500₽',
        color: '#E74C3C',
        icon: '',
        rarity: 'rare',
        probability: 7.78,
        value: 500,
        angle: 28,
        topText: 'ЗЯ',
        centerText: '500₽'
    },
    {
        id: 6,
        name: 'WB 1000₽',
        type: 'wildberries-1000',
        description: 'Сертификат Wildberries на 1000₽',
        color: '#9B59B6',
        icon: '',
        rarity: 'epic',
        probability: 7.78,
        value: 1000,
        angle: 28,
        topText: 'WB',
        centerText: '1000₽'
    },
    {
        id: 7,
        name: 'ЗЯ 1000₽',
        type: 'golden-apple-1000',
        description: 'Сертификат Золотое яблоко на 1000₽',
        color: '#C0392B',
        icon: '',
        rarity: 'epic',
        probability: 7.78,
        value: 1000,
        angle: 28,
        topText: 'ЗЯ',
        centerText: '1000₽'
    },
    {
        id: 8,
        name: 'WB 2000₽',
        type: 'wildberries-2000',
        description: 'Сертификат Wildberries на 2000₽',
        color: '#6C3483',
        icon: '',
        rarity: 'epic',
        probability: 7.78,
        value: 2000,
        angle: 28,
        topText: 'WB',
        centerText: '2000₽'
    },
    {
        id: 9,
        name: 'ЗЯ 2000₽',
        type: 'golden-apple-2000',
        description: 'Сертификат Золотое яблоко на 2000₽',
        color: '#A93226',
        icon: '',
        rarity: 'epic',
        probability: 7.78,
        value: 2000,
        angle: 28,
        topText: 'ЗЯ',
        centerText: '2000₽'
    },
    {
        id: 10,
        name: 'WB 3000₽',
        type: 'wildberries-3000',
        description: 'Сертификат Wildberries на 3000₽',
        color: '#512E5F',
        icon: '',
        rarity: 'legendary',
        probability: 7.78,
        value: 3000,
        angle: 28,
        topText: 'WB',
        centerText: '3000₽'
    },
    {
        id: 11,
        name: 'ЗЯ 5000₽',
        type: 'golden-apple-5000',
        description: 'Сертификат Золотое яблоко на 5000₽',
        color: '#922B21',
        icon: '',
        rarity: 'legendary',
        probability: 7.78,
        value: 5000,
        angle: 28,
        topText: 'ЗЯ',
        centerText: '5000₽'
    }
];

// Остальная конфигурация остается без изменений
export const DEFAULT_USER_DATA = {
    stars: 20,
    level: 1,
    experience: 0,
    friendSpins: 1,
    friendSpinsUsed: 0,
    totalSpins: 0,
    prizesWon: 0,
    recentWins: [],
    achievements: [],
    firstVisit: Date.now(),
    lastVisit: Date.now(),
    referrals: 0,
    totalStarsEarned: 20
};

export const TASKS_CONFIG = [
    {
        id: 'spin_wheel_10',
        name: 'Крутим колесо!',
        description: 'Прокрути рулетку 10 раз',
        icon: '🎰',
        reward: { type: 'stars', amount: 100 },
        target: 10,
        current: 0,
        completed: false
    },
    {
        id: 'win_5_prizes',
        name: 'Везунчик',
        description: 'Выиграй 5 призов',
        icon: '🏆',
        reward: { type: 'friend_spins', amount: 2 },
        target: 5,
        current: 0,
        completed: false
    },
    {
        id: 'collect_200_stars',
        name: 'Звездный коллекционер',
        description: 'Собери 200 звезд',
        icon: '⭐',
        reward: { type: 'stars', amount: 50 },
        target: 200,
        current: 0,
        completed: false
    }
];

export const PLAYER_LEVELS = [
    { level: 1, minExperience: 0, reward: { type: 'stars', amount: 20 } },
    { level: 2, minExperience: 100, reward: { type: 'stars', amount: 30 } },
    { level: 3, minExperience: 250, reward: { type: 'friend_spins', amount: 1 } },
    { level: 4, minExperience: 500, reward: { type: 'stars', amount: 50 } },
    { level: 5, minExperience: 1000, reward: { type: 'friend_spins', amount: 2 } }
];

export const ACHIEVEMENTS = [
    {
        id: 'first_spin',
        name: 'Первый раз',
        description: 'Прокрути рулетку в первый раз',
        icon: '🎯',
        reward: { type: 'stars', amount: 10 },
        condition: (gameData) => gameData.totalSpins >= 1
    },
    {
        id: 'lucky_streak',
        name: 'Удачная серия',
        description: 'Выиграй 10 призов',
        icon: '🍀',
        reward: { type: 'stars', amount: 200 },
        condition: (gameData) => gameData.prizesWon >= 10
    },
    {
        id: 'social_butterfly',
        name: 'Социальная бабочка',
        description: 'Пригласи 5 друзей',
        icon: '🦋',
        reward: { type: 'stars', amount: 300 },
        condition: (gameData) => gameData.referrals >= 5
    },
    {
        id: 'star_collector',
        name: 'Звездный коллекционер',
        description: 'Собери 5000 звезд',
        icon: '⭐',
        reward: { type: 'friend_spins', amount: 3 },
        condition: (gameData) => gameData.totalStarsEarned >= 5000
    }
];

export const NOTIFICATION_CONFIG = {
    types: {
        success: { icon: '✅', color: '#4CAF50', duration: 4000 },
        error: { icon: '❌', color: '#f44336', duration: 5000 },
        info: { icon: 'ℹ️', color: '#2196F3', duration: 3000 },
        achievement: { icon: '🏆', color: '#FFD700', duration: 6000 }
    }
};

// Экспорт всех конфигураций
export default {
    APP_CONFIG,
    WHEEL_PRIZES,
    DEFAULT_USER_DATA,
    TASKS_CONFIG,
    PLAYER_LEVELS,
    ACHIEVEMENTS,
    NOTIFICATION_CONFIG
};

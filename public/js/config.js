// public/js/config.js - Configuration file with ES6 modules

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
        wheelSpinDuration: 4000,
        confettiDuration: 3000,
        notificationDuration: 5000
    },
    wheel: {
        segments: 12,
        minSpins: 5,
        maxSpins: 8,
        starCost: 20, // Стоимость прокрутки за звезды
        friendSpin: true // Можно крутить за друга
    }
};

// Конфигурация призов рулетки (ОБНОВЛЕННАЯ)
export const WHEEL_PRIZES = [
    {
        id: 1,
        name: 'Золотое яблоко 3000₽',
        type: 'golden-apple-3000',
        description: 'Сертификат в магазин Золотое яблоко на 3000₽',
        color: '#FFD700',
        icon: '💎',
        rarity: 'legendary',
        probability: 0.5,
        value: 3000
    },
    {
        id: 2,
        name: '200 ⭐',
        type: 'stars-200',
        description: 'Получено 200 звезд',
        color: '#9C27B0',
        icon: '⭐',
        rarity: 'epic',
        probability: 2,
        value: 200
    },
    {
        id: 3,
        name: 'Золотое яблоко 2000₽',
        type: 'golden-apple-2000',
        description: 'Сертификат в магазин Золотое яблоко на 2000₽',
        color: '#FF9800',
        icon: '🎁',
        rarity: 'epic',
        probability: 1,
        value: 2000
    },
    {
        id: 4,
        name: 'Dolce Deals',
        type: 'dolce-deals',
        description: 'Сертификат на доставку Dolce Deals',
        color: '#E91E63',
        icon: '🍰',
        rarity: 'epic',
        probability: 1.5,
        value: 1500
    },
    {
        id: 5,
        name: '100 ⭐',
        type: 'stars-100',
        description: 'Получено 100 звезд',
        color: '#3F51B5',
        icon: '💫',
        rarity: 'rare',
        probability: 5,
        value: 100
    },
    {
        id: 6,
        name: 'Золотое яблоко 1500₽',
        type: 'golden-apple-1500',
        description: 'Сертификат в магазин Золотое яблоко на 1500₽',
        color: '#FF5722',
        icon: '🎈',
        rarity: 'rare',
        probability: 3,
        value: 1500
    },
    {
        id: 7,
        name: '75 ⭐',
        type: 'stars-75',
        description: 'Получено 75 звезд',
        color: '#009688',
        icon: '✨',
        rarity: 'common',
        probability: 8,
        value: 75
    },
    {
        id: 8,
        name: 'Золотое яблоко 1000₽',
        type: 'golden-apple-1000',
        description: 'Сертификат в магазин Золотое яблоко на 1000₽',
        color: '#4CAF50',
        icon: '🎀',
        rarity: 'common',
        probability: 5,
        value: 1000
    },
    {
        id: 9,
        name: '50 ⭐',
        type: 'stars-50',
        description: 'Получено 50 звезд',
        color: '#FFC107',
        icon: '🌟',
        rarity: 'common',
        probability: 12,
        value: 50
    },
    {
        id: 10,
        name: 'Золотое яблоко 500₽',
        type: 'golden-apple-500',
        description: 'Сертификат в магазин Золотое яблоко на 500₽',
        color: '#795548',
        icon: '🎊',
        rarity: 'common',
        probability: 8,
        value: 500
    },
    {
        id: 11,
        name: '25 ⭐',
        type: 'stars-25',
        description: 'Получено 25 звезд',
        color: '#607D8B',
        icon: '💖',
        rarity: 'common',
        probability: 15,
        value: 25
    },
    {
        id: 12,
        name: 'Повезет в следующий раз',
        type: 'empty',
        description: 'В этот раз не повезло, попробуйте еще раз!',
        color: '#9E9E9E',
        icon: '🌙',
        rarity: 'empty',
        probability: 38,
        value: 0
    }
];

// Пользователь по умолчанию
export const DEFAULT_USER_DATA = {
    stars: 100,
    referrals: 0,
    totalSpins: 0,
    totalStarsEarned: 0,
    prizesWon: 0,
    availableFriendSpins: 1,
    completedTasks: [],
    prizes: [],
    lastDailyReset: 0,
    profile: {
        name: 'Пользователь',
        avatar: '👤',
        joinDate: Date.now()
    }
};

// Конфигурация заданий (ИСПРАВЛЕННАЯ)
export const TASKS_CONFIG = {
    daily: [
        {
            id: 'daily_spin',
            name: 'Первая прокрутка',
            description: 'Сделай первую прокрутку сегодня',
            reward: { type: 'stars', amount: 20 },
            icon: '🎯',
            completed: false
        },
        {
            id: 'daily_login',
            name: 'Ежедневный вход',
            description: 'Заходи в приложение каждый день',
            reward: { type: 'stars', amount: 10 },
            icon: '📅',
            completed: false
        },
        {
            id: 'daily_share',
            name: 'Поделись с друзьями',
            description: 'Поделись приложением в социальных сетях',
            reward: { type: 'stars', amount: 15 },
            icon: '📱',
            completed: false
        }
    ],
    friends: [
        {
            id: 'invite_1_friend',
            name: 'Пригласи 1 друга',
            description: 'Пригласи одного друга в приложение',
            reward: { type: 'stars', amount: 100 },
            icon: '👤',
            completed: false,
            required: 1
        },
        {
            id: 'invite_5_friends',
            name: 'Пригласи 5 друзей',
            description: 'Пригласи 5 друзей в приложение',
            reward: { type: 'stars', amount: 300 },
            icon: '👥',
            completed: false,
            required: 5
        },
        {
            id: 'invite_10_friends',
            name: 'Пригласи 10 друзей',
            description: 'Пригласи 10 друзей в приложение',
            reward: { type: 'stars', amount: 700 },
            icon: '👨‍👩‍👧‍👦',
            completed: false,
            required: 10
        },
        {
            id: 'invite_20_friends',
            name: 'Пригласи 20 друзей',
            description: 'Пригласи 20 друзей в приложение',
            reward: { type: 'stars', amount: 1500 },
            icon: '🎉',
            completed: false,
            required: 20
        },
        {
            id: 'invite_40_friends',
            name: 'Пригласи 40 друзей',
            description: 'Пригласи 40 друзей в приложение',
            reward: { type: 'stars', amount: 3500 },
            icon: '🏆',
            completed: false,
            required: 40
        }
    ],
    active: [
        {
            id: 'subscribe_channel1',
            name: 'Подпишись на канал',
            description: 'Подпишись на наш Telegram канал',
            reward: { type: 'stars', amount: 50 },
            icon: '📺',
            completed: false,
            url: 'https://t.me/kosmetichka_channel'
        },
        {
            id: 'subscribe_channel2',
            name: 'Подпишись на Instagram',
            description: 'Подпишись на наш Instagram',
            reward: { type: 'stars', amount: 50 },
            icon: '📸',
            completed: false,
            url: 'https://instagram.com/kosmetichka'
        },
        {
            id: 'rate_app',
            name: 'Оцени приложение',
            description: 'Поставь оценку приложению в App Store',
            reward: { type: 'stars', amount: 30 },
            icon: '⭐',
            completed: false
        }
    ]
};

// Конфигурация мега рулетки
export const MEGA_ROULETTE_CONFIG = {
    cost: 5000, // Стоимость прокрутки в звездах
    cooldownDays: 30, // Кулдаун в днях
    prizes: [
        { id: 'airpods4', name: 'AirPods 4', icon: '🎧', rarity: 'legendary', value: 25000, probability: 0.1 },
        { id: 'cert5000', name: 'Сертификат 5000₽', icon: '💎', rarity: 'epic', value: 5000, probability: 1.9 },
        { id: 'cert3000', name: 'Сертификат 3000₽', icon: '💰', rarity: 'rare', value: 3000, probability: 5 },
        { id: 'powerbank', name: 'Повербанк', icon: '🔋', rarity: 'rare', value: 2000, probability: 8 },
        { id: 'cert2000', name: 'Сертификат 2000₽', icon: '💳', rarity: 'common', value: 2000, probability: 15 },
        { id: 'charger', name: 'Беспроводная зарядка', icon: '⚡', rarity: 'common', value: 1500, probability: 20 },
        { id: 'cert1000', name: 'Сертификат 1000₽', icon: '🎁', rarity: 'common', value: 1000, probability: 25 },
        { id: 'empty', name: 'Повезет в следующий раз', icon: '🌟', rarity: 'empty', value: 0, probability: 25.1 }
    ]
};

// Лидерборд (примерные данные)
export const SAMPLE_LEADERBOARD = [
    {
        position: 1,
        name: 'Анна К.',
        avatar: '👸',
        spins: 156,
        prizes: 45,
        stars: 2500,
        referrals: 23
    },
    {
        position: 2,
        name: 'Мария С.',
        avatar: '🌸',
        spins: 142,
        prizes: 38,
        stars: 2200,
        referrals: 18
    },
    {
        position: 3,
        name: 'Елена В.',
        avatar: '💎',
        spins: 128,
        prizes: 35,
        stars: 1980,
        referrals: 15
    },
    {
        position: 4,
        name: 'Дарья М.',
        avatar: '🌺',
        spins: 115,
        prizes: 32,
        stars: 1750,
        referrals: 12
    },
    {
        position: 5,
        name: 'Ольга Р.',
        avatar: '💄',
        spins: 98,
        prizes: 28,
        stars: 1650,
        referrals: 10
    }
];
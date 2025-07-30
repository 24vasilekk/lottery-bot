// public/js/config.js - ПОЛНАЯ ОРИГИНАЛЬНАЯ КОНФИГУРАЦИЯ

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
        segments: 12,
        minSpins: 5, // Минимальное количество оборотов
        maxSpins: 8, // Максимальное количество оборотов
        starCost: 20, // Стоимость прокрутки за звезды
        friendSpin: true // Можно крутить за друга
    },
    game: {
        startingStars: 100, // Начальное количество звезд
        startingFriendSpins: 1, // Начальное количество прокруток за друга
        maxRecentWins: 10 // Максимальное количество последних выигрышей
    }
};

// Конфигурация призов рулетки (ПОЛНАЯ С ПРАВИЛЬНЫМИ ВЕРОЯТНОСТЯМИ)
export const WHEEL_PRIZES = [
    {
        id: 1,
        name: 'Золотое яблоко 3000₽',
        type: 'golden-apple-3000',
        description: 'Сертификат в магазин Золотое яблоко на 3000₽',
        color: '#FFD700',
        icon: '💎',
        rarity: 'legendary',
        probability: 1, // 1%
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
        probability: 3, // 3%
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
        probability: 2, // 2%
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
        probability: 2.5, // 2.5%
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
        probability: 7, // 7%
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
        probability: 4, // 4%
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
        probability: 8, // 8%
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
        probability: 6, // 6%
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
        probability: 12, // 12%
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
        probability: 8, // 8%
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
        probability: 15, // 15%
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
        probability: 30, // 30%
        value: 0
    }
];

// Пользователь по умолчанию (ОБНОВЛЕННЫЙ)
export const DEFAULT_USER_DATA = {
    stars: APP_CONFIG.game.startingStars, // 100 звезд
    referrals: 0,
    totalSpins: 0,
    totalStarsEarned: APP_CONFIG.game.startingStars,
    prizesWon: 0,
    availableFriendSpins: APP_CONFIG.game.startingFriendSpins, // 1 прокрутка за друга
    completedTasks: [],
    prizes: [],
    recentWins: [],
    lastDailyReset: 0,
    profile: {
        name: 'Пользователь',
        avatar: '👤',
        joinDate: Date.now()
    },
    settings: {
        notifications: true,
        sounds: true,
        animations: true
    }
};

// public/js/config.js - Обновленная конфигурация заданий

export const TASKS_CONFIG = {
    // Активные задания (в основном подписки на каналы)
    active: [
        {
            id: 'subscribe_main_channel',
            name: 'Подпишись на канал',
            description: 'Наш основной новостной канал',
            type: 'channel_subscription', // Тип задания - подписка на канал
            channelUsername: 'kosmetichka_spin', // Username канала без @
            url: 'https://t.me/kosmetichka_spin', // Ссылка для перехода к каналу
            reward: { type: 'stars', amount: 20 }
        },
        {
            id: 'subscribe_promo_channel',
            name: 'Подпишись на канал',
            description: 'Подпишись на наш канал с лайв выигрышами',
            type: 'channel_subscription',
            channelUsername: 'kosmetichkolive', // Username канала
            url: 'https://t.me/kosmetichkolive',
            reward: { type: 'stars', amount: 20 }
        },
        {
            id: 'subscribe_beauty_tips',
            name: 'Подпишись на канал',
            description: 'Подпишись на dolce deals',
            type: 'channel_subscription',
            channelUsername: 'dolcedeals',
            url: 'https://t.me/dolcedeals',
            reward: { type: 'stars', amount: 20 }
        },
    ],

    // Задания с друзьями (реферальная программа)
    friends: [
        {
            id: 'invite_1_friend',
            name: 'Пригласи 1 друга',
            description: 'Поделись ссылкой и пригласи одного друга',
            required_friends: 1,
            reward: { type: 'stars', amount: 20 }
        },
        {
            id: 'invite_5_friends',
            name: 'Пригласи 5 друзей',
            description: 'Приводи друзей и получай больше звезд!',
            required_friends: 5,
            reward: { type: 'stars', amount: 100 }
        },
        {
            id: 'invite_10_friends',
            name: 'Пригласи 10 друзей',
            description: 'Стань лидером по приглашениям',
            required_friends: 10,
            reward: { type: 'stars', amount: 200 }
        }
    ]
};

// Типы заданий:
// - 'channel_subscription': требует проверки подписки на канал через Telegram API
// - 'external_action': внешние действия (подписка в соцсетях, оценка приложения)
// - 'referral': задания связанные с приглашением друзей

// Для заданий типа 'channel_subscription' обязательны поля:
// - channelUsername: username канала без символа @
// - url: ссылка на канал для удобства пользователя

// Для заданий типа 'external_action':
// - url: ссылка на внешний ресурс
// - проверка выполнения не производится автоматически

// Для заданий типа 'referral':
// - required_friends: количество приглашенных друзей для выполнения
// Уровни игрока
export const PLAYER_LEVELS = [
    { level: 1, requiredStars: 0, title: 'Новичок', icon: '🌱', reward: 0 },
    { level: 2, requiredStars: 500, title: 'Любитель красоты', icon: '💄', reward: 50 },
    { level: 3, requiredStars: 1500, title: 'Косметический гуру', icon: '✨', reward: 100 },
    { level: 4, requiredStars: 3000, title: 'Мастер стиля', icon: '👑', reward: 200 },
    { level: 5, requiredStars: 5000, title: 'Икона красоты', icon: '💎', reward: 500 },
    { level: 6, requiredStars: 10000, title: 'Легенда Kosmetichka', icon: '🌟', reward: 1000 }
];

// Достижения
export const ACHIEVEMENTS = [
    {
        id: 'first_spin',
        name: 'Первая прокрутка',
        description: 'Сделай первую прокрутку рулетки',
        icon: '🎰',
        reward: { type: 'stars', amount: 25 },
        condition: (gameData) => gameData.totalSpins >= 1
    },
    {
        id: 'first_win',
        name: 'Первый выигрыш',
        description: 'Выиграй первый приз',
        icon: '🎁',
        reward: { type: 'stars', amount: 50 },
        condition: (gameData) => gameData.prizesWon >= 1
    },
    {
        id: 'collector',
        name: 'Коллекционер',
        description: 'Выиграй 10 призов',
        icon: '💎',
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

// Настройки уведомлений
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

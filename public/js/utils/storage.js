// storage.js - #?@02;5=85 ;>:0;L=K< E@0=8;8I5< 8 A>AB>O=85< ?>;L7>20B5;O

// >;CG8BL 40==K5 ?>;L7>20B5;O
window.getUserData = function() {
    const app = window.app;
    if (!app || !app.gameData) {
        console.warn('App not initialized, returning default data');
        return {
            stats: {
                stars: 0,
                totalSpins: 0,
                prizesWon: 0,
                totalStarsEarned: 0,
                achievements: []
            },
            prizes: []
        };
    }
    
    // @5>1@07C5< D>@<0B 40==KE 4;O A>2<5AB8<>AB8
    return {
        stats: {
            stars: app.gameData.stars || 0,
            totalSpins: app.gameData.totalSpins || 0,
            prizesWon: app.gameData.totalWins || 0,
            totalStarsEarned: app.gameData.totalStarsEarned || 0,
            achievements: app.gameData.achievements || []
        },
        prizes: app.gameData.recentWins || []
    };
};

// 1=>28BL 40==K5 ?>;L7>20B5;O
window.updateUserData = function(userData) {
    const app = window.app;
    if (!app || !app.gameData) {
        console.warn('App not initialized, cannot update data');
        return;
    }
    
    // 1=>2;O5< 40==K5 2 ?@8;>65=88
    if (userData.stats) {
        app.gameData.stars = userData.stats.stars;
        app.gameData.totalSpins = userData.stats.totalSpins;
        app.gameData.totalWins = userData.stats.prizesWon;
        app.gameData.totalStarsEarned = userData.stats.totalStarsEarned;
        app.gameData.achievements = userData.stats.achievements;
    }
    
    // ИСПРАВЛЕНИЕ: Поддерживаем также прямой формат userData.stars для совместимости
    if (userData.stars !== undefined) {
        app.gameData.stars = userData.stars;
    }
    
    if (userData.prizes) {
        app.gameData.recentWins = userData.prizes;
    }
    
    // !>E@0=O5< 8 >1=>2;O5< 8=B5@D59A
    app.saveGameData();
    app.updateInterface();
    
    // 1=>2;O5< 2A5 M:@0=K
    if (app.screens.profile) {
        app.screens.profile.updateStats();
    }
};

// 1=>28BL >B>1@065=85 72574 2> 2A5E <5AB0E
window.updateStarDisplay = function() {
    const app = window.app;
    if (!app || !app.gameData) {
        console.warn('App not initialized');
        return;
    }
    
    // 1=>2;O5< >A=>2=>9 AG5BG8: 2 header
    const mainStarCount = document.getElementById('star-count');
    if (mainStarCount) {
        mainStarCount.textContent = app.gameData.stars || 0;
    }
    
    // 1=>2;O5< 2A5 M;5<5=BK A 0B@81CB>< data-stars
    document.querySelectorAll('[data-stars]').forEach(el => {
        el.textContent = app.gameData.stars || 0;
    });
    
    // 1=>2;O5< AG5BG8: 2 ?@>D8;5
    const profileStars = document.querySelector('#profile-screen .stat-value');
    if (profileStars) {
        profileStars.textContent = app.gameData.stars || 0;
    }
    
    // 1=>2;O5< AG5BG8: 2 M:@0=5 7040=89
    const tasksStars = document.querySelector('#tasks-screen .header-stars');
    if (tasksStars) {
        tasksStars.textContent = app.gameData.stars || 0;
    }
    
    // !8=E@>=870F8O A A5@25@><, 5A;8 4>ABC?=0
    if (window.telegramIntegration && window.telegramIntegration.syncWithServer) {
        // B;>65==0O A8=E@>=870F8O 4;O 871560=8O G0ABKE 70?@>A>2
        clearTimeout(window.syncTimeout);
        window.syncTimeout = setTimeout(() => {
            window.telegramIntegration.syncWithServer();
        }, 1000);
    }
};

// -:A?>@B8@C5< 4;O 8A?>;L7>20=8O 2 <>4C;OE
export { getUserData, updateUserData, updateStarDisplay };
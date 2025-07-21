// public/js/screens/profile.js - ИЗМЕНЁННАЯ ВЕРСИЯ БЕЗ ДОСТИЖЕНИЙ, НАСТРОЕК, СТАТИСТИКИ И О ПРИЛОЖЕНИИ

export class ProfileScreen {
    constructor(app) {
        this.app = app;
    }

    render() {
        const gameData = this.app.gameData;
        
        return `
            <div id="profile-screen" class="screen">
                <div class="profile-header">
                    <div class="profile-avatar">
                        ${this.app.tg?.initDataUnsafe?.user?.first_name?.charAt(0) || '👤'}
                    </div>
                    <div class="profile-info">
                        <h2 class="profile-name">${this.app.tg?.initDataUnsafe?.user?.first_name || 'Пользователь'}</h2>
                        <div class="profile-stats">
                            <div class="stat-item">
                                <div class="stat-value">${gameData.stars}</div>
                                <div class="stat-label">⭐ Звезды</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${gameData.totalSpins || 0}</div>
                                <div class="stat-label">🎯 Прокрутки</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${gameData.prizes?.length || gameData.prizesWon || 0}</div>
                                <div class="stat-label">🎁 Призы</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="profile-content">
                    <!-- ОСНОВНАЯ СЕКЦИЯ: История призов -->
                    <div class="section">
                        <h3 class="section-title">🎁 История призов</h3>
                        <div class="prize-history">
                            ${this.renderPrizeHistory()}
                        </div>
                    </div>

                    <!-- ОСНОВНАЯ СЕКЦИЯ: Рефералы -->
                    <div class="section">
                        <h3 class="section-title">👥 Рефералы</h3>
                        <div class="referral-section">
                            <div class="referral-info">
                                <div class="referral-count">
                                    <span class="count-number">${gameData.referrals || 0}</span>
                                    <span class="count-label">Приглашенных друзей</span>
                                </div>
                                <div class="referral-earnings">
                                    <span class="earnings-number">${(gameData.referrals || 0) * 50}</span>
                                    <span class="earnings-label">⭐ Заработано с рефералов</span>
                                </div>
                            </div>
                            
                            <div class="referral-action">
                                <button id="share-referral" class="share-btn">
                                    <i class="fas fa-share"></i>
                                    Пригласить друга
                                </button>
                                <p class="referral-bonus">+50 ⭐ за каждого друга</p>
                            </div>
                            
                            <div class="referral-levels">
                                <h4>🏆 Уровни рефералов</h4>
                                <div class="level-progress">
                                    ${this.renderReferralLevels()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ОСНОВНАЯ СЕКЦИЯ: Лидерборд -->
                    <div class="section">
                        <h3 class="section-title">🏅 Лидерборд</h3>
                        <div class="leaderboard-tabs">
                            <button class="leaderboard-tab active" data-type="spins">По прокруткам</button>
                            <button class="leaderboard-tab" data-type="prizes">По призам</button>
                        </div>
                        <div class="leaderboard-content">
                            ${this.renderLeaderboard()}
                        </div>
                    </div>

                    <!-- ДОПОЛНИТЕЛЬНЫЙ ОТСТУП ДЛЯ ПОЛНОЙ ПРОКРУТКИ -->
                    <div style="height: 60px;"></div>
                </div>
            </div>
        `;
    }

    init() {
        console.log('👤 Инициализация экрана профиля...');
        this.setupEventListeners();
        console.log('✅ Экран профиля инициализирован');
    }

    setupEventListeners() {
        // Кнопка "Пригласить друга"
        const shareBtn = document.getElementById('share-referral');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareReferralLink();
            });
        }

        // Переключатели лидерборда
        const leaderboardTabs = document.querySelectorAll('.leaderboard-tab');
        leaderboardTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.switchLeaderboard(type);
            });
        });
    }

    renderPrizeHistory() {
        const prizes = this.app.gameData.recentWins || this.app.gameData.prizes || [];
        
        if (prizes.length === 0) {
            return `
                <div class="empty-history">
                    <i class="fas fa-gift"></i>
                    <p>Пока нет выигрышей</p>
                    <span>Крутите рулетку, чтобы выиграть призы!</span>
                </div>
            `;
        }

        return prizes.slice(0, 10).map(prize => {
            const prizeIcon = this.getPrizeIcon(prize.type || prize.name);
            const prizeValue = prize.value ? `+${prize.value} ⭐` : '';
            const date = prize.timestamp ? this.formatDate(prize.timestamp) : 'Недавно';
            
            return `
                <div class="prize-history-item">
                    <div class="prize-icon">${prizeIcon}</div>
                    <div class="prize-info">
                        <div class="prize-name">${prize.name || prize.type}</div>
                        <div class="prize-date">${date}</div>
                    </div>
                    <div class="prize-value">${prizeValue}</div>
                </div>
            `;
        }).join('');
    }

    renderReferralLevels() {
        const referrals = this.app.gameData.referrals || 0;
        const levels = [
            { count: 1, reward: 50, icon: '🥉' },
            { count: 5, reward: 300, icon: '🥈' },
            { count: 10, reward: 700, icon: '🥇' },
            { count: 20, reward: 1500, icon: '💎' },
            { count: 40, reward: 3500, icon: '👑' }
        ];

        return levels.map(level => {
            const isUnlocked = referrals >= level.count;
            const progress = Math.min((referrals / level.count) * 100, 100);
            
            return `
                <div class="referral-level ${isUnlocked ? 'unlocked' : 'locked'}">
                    <div class="level-icon">${level.icon}</div>
                    <div class="level-info">
                        <div class="level-name">${level.count} друзей</div>
                        <div class="level-reward">+${level.reward} ⭐ бонус</div>
                        <div class="level-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <span class="progress-text">${referrals}/${level.count}</span>
                        </div>
                    </div>
                    ${isUnlocked ? '<div class="level-check">✅</div>' : ''}
                </div>
            `;
        }).join('');
    }

    renderLeaderboard() {
        // Здесь будет загружаться реальный лидерборд с сервера
        const mockLeaderboard = [
            { name: 'Анна К.', spins: 247, prizes: 18, avatar: '👩' },
            { name: 'Мария Д.', spins: 198, prizes: 15, avatar: '👱‍♀️' },
            { name: 'Елена С.', spins: 176, prizes: 12, avatar: '👩‍🦰' },
            { name: 'Вы', spins: this.app.gameData.totalSpins || 0, prizes: this.app.gameData.prizesWon || 0, avatar: '👤', isUser: true }
        ];

        return mockLeaderboard.map((user, index) => {
            return `
                <div class="leaderboard-item ${user.isUser ? 'user-item' : ''}">
                    <div class="leader-rank">${index + 1}</div>
                    <div class="leader-avatar">${user.avatar}</div>
                    <div class="leader-info">
                        <div class="leader-name">${user.name}</div>
                        <div class="leader-stats">
                            <span>🎯 ${user.spins}</span>
                            <span>🎁 ${user.prizes}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    switchLeaderboard(type) {
        // Переключение между лидербордами по прокруткам и призам
        document.querySelectorAll('.leaderboard-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        
        // Здесь можно добавить логику загрузки разных типов лидербордов
        console.log(`Переключение лидерборда на тип: ${type}`);
    }

    shareReferralLink() {
        const userId = this.app.tg?.initDataUnsafe?.user?.id || 'user';
        const botUsername = 'kosmetichka_lottery_bot'; // Заменить на реальное имя бота
        const referralLink = `https://t.me/${botUsername}?start=${userId}`;
        
        const shareText = `🎁 Присоединяйся к Kosmetichka Lottery!\n\nПолучи 50 звезд за регистрацию и выигрывай крутые призы! 💄✨\n\n${referralLink}`;
        
        if (this.app.tg) {
            this.app.tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`);
        } else {
            navigator.clipboard.writeText(referralLink).then(() => {
                this.app.showStatusMessage('Ссылка скопирована!', 'success');
            }).catch(() => {
                this.app.showStatusMessage('Не удалось скопировать ссылку', 'error');
            });
        }
    }

    getPrizeIcon(prizeType) {
        const icons = {
            'stars': '⭐',
            'certificate': '🎁',
            'golden_apple': '🍎',
            'dolce_deals': '🛍️',
            'beauty_set': '💄',
            'jewelry': '💎',
            'empty': '🌟'
        };
        
        return icons[prizeType] || '🎁';
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    destroy() {
        console.log('🧹 Очистка экрана профиля...');
        // Здесь можно очистить обработчики событий, если необходимо
    }
}
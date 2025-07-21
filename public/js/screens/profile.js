// public/js/screens/profile.js - ВЕРСИЯ С ВКЛАДКАМИ: ПРОФИЛЬ + ЛИДЕРБОРД

export class ProfileScreen {
    constructor(app) {
        this.app = app;
        this.currentTab = 'profile'; // profile | leaderboard
    }

    render() {
        const gameData = this.app.gameData;
        
        return `
            <div id="profile-screen" class="screen">
                <!-- Вкладки профиля -->
                <div class="profile-tabs">
                    <button class="profile-tab active" data-tab="profile">
                        <i class="fas fa-user"></i>
                        Профиль
                    </button>
                    <button class="profile-tab" data-tab="leaderboard">
                        <i class="fas fa-trophy"></i>
                        Лидерборд
                    </button>
                </div>

                <!-- Контент вкладки "Профиль" -->
                <div id="profile-tab-content" class="tab-content active">
                    <!-- Информация о пользователе -->
                    <div class="section">
                        <h3 class="section-title">👤 Информация о пользователе</h3>
                        <div class="user-info-card">
                            <div class="user-avatar">
                                ${this.app.tg?.initDataUnsafe?.user?.first_name?.charAt(0) || '👤'}
                            </div>
                            <div class="user-details">
                                <div class="user-item">
                                    <span class="user-label">ID:</span>
                                    <span class="user-value">${this.app.tg?.initDataUnsafe?.user?.id || 'Неизвестно'}</span>
                                </div>
                                <div class="user-item">
                                    <span class="user-label">Ник:</span>
                                    <span class="user-value">@${this.app.tg?.initDataUnsafe?.user?.username || 'не указан'}</span>
                                </div>
                                <div class="user-item">
                                    <span class="user-label">Имя:</span>
                                    <span class="user-value">${this.app.tg?.initDataUnsafe?.user?.first_name || 'Пользователь'}</span>
                                </div>
                                <div class="user-item">
                                    <span class="user-label">Звезды:</span>
                                    <span class="user-value stars">${gameData.stars} ⭐</span>
                                </div>
                                <div class="user-item">
                                    <span class="user-label">Прокрутки:</span>
                                    <span class="user-value">${gameData.totalSpins || 0}</span>
                                </div>
                                <div class="user-item">
                                    <span class="user-label">Призы:</span>
                                    <span class="user-value">${gameData.prizes?.length || gameData.prizesWon || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Рефералы (без уровней) -->
                    <div class="section">
                        <h3 class="section-title">👥 Рефералы</h3>
                        <div class="referral-simple">
                            <div class="referral-stats">
                                <div class="referral-stat-item">
                                    <div class="stat-number">${gameData.referrals || 0}</div>
                                    <div class="stat-desc">Приглашенных друзей</div>
                                </div>
                                <div class="referral-stat-item">
                                    <div class="stat-number">${(gameData.referrals || 0) * 50}</div>
                                    <div class="stat-desc">⭐ Заработано с рефералов</div>
                                </div>
                            </div>
                            
                            <div class="referral-action">
                                <button id="share-referral" class="share-btn">
                                    <i class="fas fa-share"></i>
                                    Пригласить друга
                                </button>
                                <p class="referral-bonus">+50 ⭐ за каждого друга</p>
                            </div>
                        </div>
                    </div>

                    <!-- История призов -->
                    <div class="section">
                        <h3 class="section-title">🎁 История призов</h3>
                        <div class="prize-history">
                            ${this.renderPrizeHistory()}
                        </div>
                    </div>

                    <!-- Отступ для навигации -->
                    <div style="height: 60px;"></div>
                </div>

                <!-- Контент вкладки "Лидерборд" -->
                <div id="leaderboard-tab-content" class="tab-content">
                    <div class="section">
                        <h3 class="section-title">🏆 Топ по рефералам</h3>
                        <div class="leaderboard-description">
                            <p>Лидеры по количеству приглашенных друзей</p>
                        </div>
                        <div class="leaderboard-content">
                            ${this.renderReferralLeaderboard()}
                        </div>
                    </div>

                    <!-- Отступ для навигации -->
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
        // Переключение вкладок
        const profileTabs = document.querySelectorAll('.profile-tab');
        profileTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.closest('.profile-tab').dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Кнопка "Пригласить друга"
        const shareBtn = document.getElementById('share-referral');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareReferralLink();
            });
        }
    }

    switchTab(tabName) {
        console.log(`🔄 Переключение на вкладку: ${tabName}`);
        
        this.currentTab = tabName;
        
        // Обновляем активные вкладки
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Показываем нужный контент
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetContent = document.getElementById(`${tabName}-tab-content`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
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

    renderReferralLeaderboard() {
        // Здесь будет загружаться реальный лидерборд с сервера
        // Пока используем моковые данные с фокусом на рефералы
        const mockLeaderboard = [
            { name: 'Кристина В.', referrals: 47, avatar: '👩', position: 1 },
            { name: 'Анна К.', referrals: 34, avatar: '👱‍♀️', position: 2 },
            { name: 'Мария Д.', referrals: 28, avatar: '👩‍🦰', position: 3 },
            { name: 'Елена С.', referrals: 22, avatar: '🧑‍🦱', position: 4 },
            { name: 'Софья М.', referrals: 19, avatar: '👩‍🦳', position: 5 },
            { name: 'Дарья Л.', referrals: 15, avatar: '👩‍🦲', position: 6 },
            { name: 'Валерия К.', referrals: 12, avatar: '👸', position: 7 },
            { name: 'Алиса П.', referrals: 9, avatar: '👩‍💼', position: 8 },
            { name: 'Вы', referrals: this.app.gameData.referrals || 0, avatar: '👤', isUser: true, position: this.calculateUserPosition() }
        ];

        // Сортируем по количеству рефералов
        const sortedLeaderboard = mockLeaderboard.sort((a, b) => b.referrals - a.referrals);
        
        // Обновляем позиции после сортировки
        sortedLeaderboard.forEach((user, index) => {
            user.position = index + 1;
        });

        return sortedLeaderboard.map(user => {
            const medal = this.getMedalForPosition(user.position);
            
            return `
                <div class="leaderboard-item ${user.isUser ? 'user-item' : ''}">
                    <div class="leader-rank">
                        ${medal || user.position}
                    </div>
                    <div class="leader-avatar">${user.avatar}</div>
                    <div class="leader-info">
                        <div class="leader-name">${user.name}</div>
                        <div class="leader-stats">
                            <span class="referral-count">
                                <i class="fas fa-users"></i>
                                ${user.referrals} друзей
                            </span>
                            <span class="referral-earnings">
                                <i class="fas fa-star"></i>
                                ${user.referrals * 50} звезд
                            </span>
                        </div>
                    </div>
                    ${user.isUser ? '<div class="user-badge">ВЫ</div>' : ''}
                </div>
            `;
        }).join('');
    }

    getMedalForPosition(position) {
        const medals = {
            1: '🥇',
            2: '🥈', 
            3: '🥉'
        };
        return medals[position] || null;
    }

    calculateUserPosition() {
        // Простой расчет позиции пользователя (в реальности будет с сервера)
        const userReferrals = this.app.gameData.referrals || 0;
        if (userReferrals >= 30) return Math.floor(Math.random() * 3) + 1; // Топ-3
        if (userReferrals >= 15) return Math.floor(Math.random() * 5) + 4; // 4-8 место
        if (userReferrals >= 5) return Math.floor(Math.random() * 10) + 9; // 9-18 место
        return Math.floor(Math.random() * 20) + 19; // 19+ место
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
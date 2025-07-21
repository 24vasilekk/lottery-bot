// public/js/screens/profile.js - УЛУЧШЕННАЯ ВЕРСИЯ С АНИМАЦИЯМИ

export class ProfileScreen {
    constructor(app) {
        this.app = app;
        this.currentTab = 'profile';
        this.animationTimeout = null;
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
                    <div class="section user-info-section">
                        <h3 class="section-title">
                            <i class="fas fa-sparkles"></i>
                            Информация о пользователе
                        </h3>
                        <div class="user-info-card">
                            <div class="user-avatar" id="user-avatar">
                                ${this.app.tg?.initDataUnsafe?.user?.first_name?.charAt(0) || '👤'}
                            </div>
                            <div class="user-details">
                                <div class="user-item" data-animate="slideIn">
                                    <span class="user-label">
                                        <i class="fas fa-id-card"></i>
                                        ID:
                                    </span>
                                    <span class="user-value">${this.app.tg?.initDataUnsafe?.user?.id || 'Неизвестно'}</span>
                                </div>
                                <div class="user-item" data-animate="slideIn">
                                    <span class="user-label">
                                        <i class="fas fa-at"></i>
                                        Ник:
                                    </span>
                                    <span class="user-value">@${this.app.tg?.initDataUnsafe?.user?.username || 'не указан'}</span>
                                </div>
                                <div class="user-item" data-animate="slideIn">
                                    <span class="user-label">
                                        <i class="fas fa-user-circle"></i>
                                        Имя:
                                    </span>
                                    <span class="user-value">${this.app.tg?.initDataUnsafe?.user?.first_name || 'Пользователь'}</span>
                                </div>
                                <div class="user-item stars-item" data-animate="slideIn">
                                    <span class="user-label">
                                        <i class="fas fa-star"></i>
                                        Звезды:
                                    </span>
                                    <span class="user-value stars" id="stars-count">${gameData.stars} ⭐</span>
                                </div>
                                <div class="user-item" data-animate="slideIn">
                                    <span class="user-label">
                                        <i class="fas fa-sync-alt"></i>
                                        Прокрутки:
                                    </span>
                                    <span class="user-value" id="spins-count">${gameData.totalSpins || 0}</span>
                                </div>
                                <div class="user-item" data-animate="slideIn">
                                    <span class="user-label">
                                        <i class="fas fa-gift"></i>
                                        Призы:
                                    </span>
                                    <span class="user-value" id="prizes-count">${gameData.prizes?.length || gameData.prizesWon || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Рефералы -->
                    <div class="section referral-section">
                        <h3 class="section-title">
                            <i class="fas fa-users"></i>
                            Рефералы
                        </h3>
                        <div class="referral-simple">
                            <div class="referral-stats">
                                <div class="referral-stat-item" data-animate="countUp" data-value="${gameData.referrals || 0}">
                                    <div class="stat-number" id="referrals-count">0</div>
                                    <div class="stat-desc">Приглашенных друзей</div>
                                </div>
                                <div class="referral-stat-item" data-animate="countUp" data-value="${(gameData.referrals || 0) * 50}">
                                    <div class="stat-number" id="referral-earnings">0</div>
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
                    <div class="section prize-section">
                        <h3 class="section-title">
                            <i class="fas fa-trophy"></i>
                            История призов
                        </h3>
                        <div class="prize-history" id="prize-history">
                            ${this.renderPrizeHistory()}
                        </div>
                    </div>

                    <!-- Отступ для навигации -->
                    <div style="height: 60px;"></div>
                </div>

                <!-- Контент вкладки "Лидерборд" -->
                <div id="leaderboard-tab-content" class="tab-content">
                    <div class="section leaderboard-section">
                        <h3 class="section-title">
                            <i class="fas fa-crown"></i>
                            Топ по рефералам
                        </h3>
                        <div class="leaderboard-description">
                            <p>🌟 Лидеры по количеству приглашенных друзей получают особые награды!</p>
                        </div>
                        <div class="leaderboard-content" id="leaderboard-content">
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
        this.startAnimations();
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

        // Кнопка "Пригласить друга" с эффектом
        const shareBtn = document.getElementById('share-referral');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                this.animateButtonClick(e.target);
                this.shareReferralLink();
            });
        }

        // Анимация при клике на аватар
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.addEventListener('click', () => {
                this.animateAvatar();
            });
        }

        // Анимация звезд при клике
        const starsCount = document.getElementById('stars-count');
        if (starsCount) {
            starsCount.addEventListener('click', () => {
                this.animateStars();
            });
        }
    }

    switchTab(tabName) {
        console.log(`🔄 Переключение на вкладку: ${tabName}`);
        
        this.currentTab = tabName;
        
        // Обновляем активные вкладки с анимацией
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Скрываем текущий контент
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Показываем новый контент с задержкой для плавности
        setTimeout(() => {
            const targetContent = document.getElementById(`${tabName}-tab-content`);
            if (targetContent) {
                targetContent.classList.add('active');
                this.startAnimations(); // Перезапускаем анимации для новой вкладки
            }
        }, 150);
    }

    startAnimations() {
        // Анимация появления элементов
        const elementsToAnimate = document.querySelectorAll('[data-animate]');
        elementsToAnimate.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
                
                // Анимация счетчиков
                if (element.dataset.animate === 'countUp') {
                    this.animateCountUp(element);
                }
            }, index * 100);
        });

        // Анимация элементов лидерборда
        const leaderboardItems = document.querySelectorAll('.leaderboard-item');
        leaderboardItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, index * 80);
        });

        // Анимация истории призов
        const prizeItems = document.querySelectorAll('.prize-history-item');
        prizeItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, index * 60);
        });
    }

    animateCountUp(element) {
        const target = parseInt(element.dataset.value) || 0;
        const numberElement = element.querySelector('.stat-number');
        if (!numberElement) return;

        let current = 0;
        const increment = target / 30; // 30 кадров анимации
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            numberElement.textContent = Math.floor(current);
        }, 50);
    }

    animateButtonClick(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }

    animateAvatar() {
        const avatar = document.getElementById('user-avatar');
        if (!avatar) return;

        avatar.style.transform = 'scale(1.1) rotate(5deg)';
        setTimeout(() => {
            avatar.style.transform = '';
        }, 300);
    }

    animateStars() {
        const starsElement = document.getElementById('stars-count');
        if (!starsElement) return;

        // Создаем анимацию звездочек
        for (let i = 0; i < 5; i++) {
            const star = document.createElement('div');
            star.textContent = '⭐';
            star.style.position = 'absolute';
            star.style.pointerEvents = 'none';
            star.style.fontSize = '16px';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.opacity = '0';
            star.style.transform = 'scale(0)';
            star.style.transition = 'all 1s ease-out';
            star.style.zIndex = '1000';
            
            starsElement.appendChild(star);
            
            setTimeout(() => {
                star.style.opacity = '1';
                star.style.transform = 'scale(1) translateY(-20px)';
            }, i * 100);
            
            setTimeout(() => {
                star.style.opacity = '0';
                star.style.transform = 'scale(0) translateY(-40px)';
                setTimeout(() => star.remove(), 500);
            }, 1000 + i * 100);
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

        return prizes.slice(0, 10).map((prize, index) => {
            const prizeIcon = this.getPrizeIcon(prize.type || prize.name);
            const prizeValue = prize.value ? `+${prize.value} ⭐` : '';
            const date = prize.timestamp ? this.formatDate(prize.timestamp) : 'Недавно';
            
            return `
                <div class="prize-history-item" data-index="${index}">
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

        const sortedLeaderboard = mockLeaderboard.sort((a, b) => b.referrals - a.referrals);
        
        sortedLeaderboard.forEach((user, index) => {
            user.position = index + 1;
        });

        return sortedLeaderboard.map((user, index) => {
            const medal = this.getMedalForPosition(user.position);
            const pulseClass = user.position <= 3 ? 'pulse-animation' : '';
            
            return `
                <div class="leaderboard-item ${user.isUser ? 'user-item' : ''} ${pulseClass}" data-position="${user.position}">
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
        const userReferrals = this.app.gameData.referrals || 0;
        if (userReferrals >= 30) return Math.floor(Math.random() * 3) + 1;
        if (userReferrals >= 15) return Math.floor(Math.random() * 5) + 4;
        if (userReferrals >= 5) return Math.floor(Math.random() * 10) + 9;
        return Math.floor(Math.random() * 20) + 19;
    }

    shareReferralLink() {
        const userId = this.app.tg?.initDataUnsafe?.user?.id || 'user';
        const botUsername = 'kosmetichka_lottery_bot';
        const referralLink = `https://t.me/${botUsername}?start=${userId}`;
        
        const shareText = `🎁 Присоединяйся к Kosmetichka Lottery!\n\n💄 Выигрывай сертификаты в Золотое Яблоко!\n🛍️ Получай подарки от Dolce Deals!\n⭐ +50 звезд за регистрацию!\n\n${referralLink}`;
        
        if (this.app.tg) {
            this.app.tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`);
            
            // Показываем успешное сообщение
            this.app.showStatusMessage('🚀 Ссылка для приглашения отправлена!', 'success');
        } else {
            navigator.clipboard.writeText(referralLink).then(() => {
                this.app.showStatusMessage('📋 Ссылка скопирована в буфер обмена!', 'success');
            }).catch(() => {
                this.app.showStatusMessage('❌ Не удалось скопировать ссылку', 'error');
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
            'cosmetics': '💋',
            'perfume': '🌸',
            'skincare': '✨',
            'makeup': '🎨',
            'empty': '🌟'
        };
        
        return icons[prizeType] || '🎁';
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'Вчера';
        } else if (diffDays < 7) {
            return `${diffDays} дн. назад`;
        } else {
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
            });
        }
    }

    updateStats(newGameData) {
        // Обновляем счетчики с анимацией
        const starsElement = document.getElementById('stars-count');
        const spinsElement = document.getElementById('spins-count');
        const prizesElement = document.getElementById('prizes-count');
        
        if (starsElement && newGameData.stars !== undefined) {
            this.animateValueChange(starsElement, newGameData.stars);
        }
        
        if (spinsElement && newGameData.totalSpins !== undefined) {
            this.animateValueChange(spinsElement, newGameData.totalSpins);
        }
        
        if (prizesElement) {
            const prizesCount = newGameData.prizes?.length || newGameData.prizesWon || 0;
            this.animateValueChange(prizesElement, prizesCount);
        }
    }

    animateValueChange(element, newValue) {
        const currentValue = parseInt(element.textContent) || 0;
        if (currentValue === newValue) return;
        
        element.style.transform = 'scale(1.2)';
        element.style.color = '#CCD537';
        
        setTimeout(() => {
            element.textContent = newValue + (element.classList.contains('stars') ? ' ⭐' : '');
            element.style.transform = '';
            element.style.color = '';
        }, 200);
    }

    destroy() {
        console.log('🧹 Очистка экрана профиля...');
        
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
        }
        
        // Очищаем все таймеры анимаций
        const animatedElements = document.querySelectorAll('[data-animate]');
        animatedElements.forEach(element => {
            element.style.transition = '';
            element.style.transform = '';
            element.style.opacity = '';
        });
    }
}
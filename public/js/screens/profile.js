// public/js/screens/profile.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

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
                        ${this.renderUserAvatar()}
                    </div>
                    <div class="profile-info">
                        <h2 class="profile-name">${this.getUserDisplayName()}</h2>
                        <div class="profile-telegram-id">ID: ${this.getTelegramId()}</div>
                        <div class="profile-stats">
                            <div class="stat-item">
                                <div class="stat-value">${gameData.stars}</div>
                                <div class="stat-label">⭐ Звезды</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${gameData.referrals || 0}</div>
                                <div class="stat-label">👥 Рефералы</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="profile-content">
                    <div class="section">
                        <h3 class="section-title">📊 Статистика</h3>
                        <div class="stats-grid">
                            <div class="stats-card">
                                <div class="stats-icon">⭐</div>
                                <div class="stats-content">
                                    <div class="stats-value">${gameData.totalStarsEarned || gameData.stars}</div>
                                    <div class="stats-desc">Всего звезд заработано</div>
                                </div>
                            </div>
                            
                            
                            <div class="stats-card">
                                <div class="stats-icon">👥</div>
                                <div class="stats-content">
                                    <div class="stats-value">${gameData.referrals || 0}</div>
                                    <div class="stats-desc">Друзей приглашено</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <h3 class="section-title">👥 Рефералы</h3>
                        <div class="referral-section">
                            <div class="referral-info">
                                <div class="referral-count">
                                    <span class="count-number">${gameData.referrals || 0}</span>
                                    <span class="count-label">Приглашенных друзей</span>
                                </div>
                                <div class="referral-bonus">
                                    <span class="bonus-number">${(gameData.referrals || 0) * 100}</span>
                                    <span class="bonus-label">⭐ Бонусных звезд получено</span>
                                </div>
                            </div>
                            
                            <button id="share-referral" class="referral-btn">
                                <i class="fas fa-share"></i>
                                Пригласить друга
                            </button>
                            
                            <div class="referral-description">
                                <p>За каждого приглашенного друга вы получаете:</p>
                                <ul>
                                    <li>💯 100 звезд бонусом</li>
                                    <li>🎯 1 дополнительная прокрутка</li>
                                    <li>🏆 Прогресс к достижениям</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <h3 class="section-title">🏆 История сертификатов</h3>
                        <div class="prizes-history">
                            ${this.renderPrizesHistory()}
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
    }

    calculateLevel() {
        const totalStars = this.app.gameData.totalStarsEarned || this.app.gameData.stars || 0;
        return Math.floor(totalStars / 1000) + 1;
    }

    renderPrizesHistory() {
        const gameData = this.app.gameData;
        const allPrizes = gameData.prizes || [];

        // Фильтруем только сертификаты (исключаем звезды и пустые призы)
        const certificatePrizes = allPrizes.filter(prize => {
            const prizeType = prize.type || '';
            return prizeType.startsWith('golden-apple-') || prizeType === 'dolce-deals';
        });

        if (certificatePrizes.length === 0) {
            return `
                <div class="empty-prizes">
                    <div class="empty-icon">🏆</div>
                    <div class="empty-text">Сертификатов пока нет</div>
                    <div class="empty-subtitle">Крутите рулетку и выигрывайте сертификаты!</div>
                </div>
            `;
        }

        // Сортируем призы по дате получения (новые сначала) и берем максимум 5
        const sortedPrizes = [...certificatePrizes]
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 5);

        return sortedPrizes.map(prize => `
            <div class="prize-item">
                <div class="prize-icon">${this.getPrizeIcon(prize)}</div>
                <div class="prize-content">
                    <div class="prize-name">${prize.name || 'Неизвестный приз'}</div>
                    <div class="prize-details">
                        <span class="prize-type">${this.getPrizeTypeLabel(prize)}</span>
                        ${prize.value ? `<span class="prize-value">${prize.value} ⭐</span>` : ''}
                    </div>
                    <div class="prize-date">${this.formatDate(prize.timestamp || Date.now())}</div>
                </div>
                <div class="prize-status">
                    ${prize.claimed ? 
                        '<span class="status-claimed">✅ Получен</span>' : 
                        '<span class="status-pending">⏳ Ожидает</span>'
                    }
                </div>
            </div>
        `).join('');
    }

    getPrizeIcon(prize) {
        // Иконки для разных типов призов
        const prizeIcons = {
            'golden-apple-3000': '💎',
            'golden-apple-2000': '🎁',
            'golden-apple-1500': '🎈',
            'golden-apple-1000': '🎀',
            'golden-apple-500': '🎊',
            'stars-200': '⭐',
            'stars-100': '💫',
            'stars-75': '✨',
            'stars-50': '🌟',
            'stars-25': '💖',
            'dolce-deals': '🍰',
            'empty': '🌙'
        };

        return prizeIcons[prize.type] || prize.icon || '🎁';
    }

    getUserDisplayName() {
        // Пробуем получить данные из разных источников
        const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user || 
                            this.app.tg?.initDataUnsafe?.user ||
                            window.telegramIntegration?.user;
        
        if (telegramUser?.username) {
            return `@${telegramUser.username}`;
        } else if (telegramUser?.first_name) {
            return telegramUser.first_name;
        }
        return 'Пользователь';
    }

    getTelegramId() {
        // Пробуем получить ID из разных источников
        const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user || 
                            this.app.tg?.initDataUnsafe?.user ||
                            window.telegramIntegration?.user;
        
        return telegramUser?.id || 'Неизвестно';
    }

    getPrizeTypeLabel(prize) {
        const typeLabels = {
            'golden-apple-3000': 'Золотое яблоко 3000₽',
            'golden-apple-2000': 'Золотое яблоко 2000₽',
            'golden-apple-1500': 'Золотое яблоко 1500₽',
            'golden-apple-1000': 'Золотое яблоко 1000₽',
            'golden-apple-500': 'Золотое яблоко 500₽',
            'stars-200': '200 звезд',
            'stars-100': '100 звезд',
            'stars-75': '75 звезд',
            'stars-50': '50 звезд',
            'stars-25': '25 звезд',
            'dolce-deals': 'Dolce Deals',
            'empty': 'Повезет в следующий раз'
        };

        return typeLabels[prize.type] || prize.description || 'Приз';
    }

    shareReferralLink() {
        const userId = this.getTelegramId();
        const botUsername = 'kosmetichka_bot'; // Замените на реальное имя бота
        const referralLink = `https://t.me/${botUsername}?start=ref_${userId}`;
        
        const message = `🎉 Присоединяйся к игре "Косметичка"!\n\n💄 Крути рулетку и выигрывай призы от косметических брендов!\n⭐ Получай звезды и обменивай на подарки!\n\n${referralLink}`;
        
        if (this.app.tg?.isVersionAtLeast('6.1')) {
            this.app.tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`);
        } else {
            // Fallback для старых версий
            navigator.clipboard.writeText(referralLink).then(() => {
                this.app.showStatusMessage('Ссылка скопирована в буфер обмена!', 'success');
            }).catch(() => {
                this.app.showStatusMessage('Не удалось скопировать ссылку', 'error');
            });
        }
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

    renderUserAvatar() {
        const user = this.app.tg?.initDataUnsafe?.user;
        
        // Пытаемся получить фото профиля из Telegram
        if (user?.photo_url) {
            return `<img src="${user.photo_url}" alt="Аватар ${user.first_name}" 
                         style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="avatar-fallback" style="display: none; width: 100%; height: 100%; 
                         display: flex; align-items: center; justify-content: center; 
                         font-size: 36px; font-weight: bold;">
                        ${user.first_name?.charAt(0).toUpperCase() || '👤'}
                    </div>`;
        } else if (user?.first_name) {
            return user.first_name.charAt(0).toUpperCase();
        }
        
        return '👤';
    }

    destroy() {
        console.log('🧹 Очистка экрана профиля...');
        // Здесь можно очистить обработчики событий, если необходимо
    }
}

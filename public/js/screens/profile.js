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
                        <div class="profile-telegram-id">ID: ${this.app.tg?.initDataUnsafe?.user?.id || 'Неизвестно'}</div>
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
                            
                            
                            <div class="stats-card">
                                <div class="stats-icon">💎</div>
                                <div class="stats-content">
                                    <div class="stats-value">${this.calculateLevel()}</div>
                                    <div class="stats-desc">Текущий уровень</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <h3 class="section-title">🏆 Достижения</h3>
                        <div class="achievements-grid">
                            ${this.renderAchievements()}
                        </div>
                    </div>

                    <div class="section">
                        <h3 class="section-title">🏆 История призов</h3>
                        <div class="prizes-history">
                            ${this.renderPrizesHistory()}
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
                        <h3 class="section-title">⚙️ Настройки</h3>
                        <div class="settings-list">
                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">🔔 Уведомления</div>
                                    <div class="setting-desc">Получать уведомления о новых призах</div>
                                </div>
                                <div class="setting-toggle">
                                    <input type="checkbox" id="notifications-toggle" ${gameData.settings?.notifications !== false ? 'checked' : ''}>
                                    <label for="notifications-toggle" class="toggle-switch"></label>
                                </div>
                            </div>
                            
                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">🎵 Звуки</div>
                                    <div class="setting-desc">Воспроизводить звуки при выигрыше</div>
                                </div>
                                <div class="setting-toggle">
                                    <input type="checkbox" id="sounds-toggle" ${gameData.settings?.sounds !== false ? 'checked' : ''}>
                                    <label for="sounds-toggle" class="toggle-switch"></label>
                                </div>
                            </div>
                            
                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">✨ Анимации</div>
                                    <div class="setting-desc">Показывать анимации и эффекты</div>
                                </div>
                                <div class="setting-toggle">
                                    <input type="checkbox" id="animations-toggle" ${gameData.settings?.animations !== false ? 'checked' : ''}>
                                    <label for="animations-toggle" class="toggle-switch"></label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <h3 class="section-title">📱 О приложении</h3>
                        <div class="app-info">
                            <div class="info-item">
                                <span class="info-label">Версия:</span>
                                <span class="info-value">1.0.0</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Пользователь ID:</span>
                                <span class="info-value">${this.app.tg?.initDataUnsafe?.user?.id || 'Неизвестно'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Дата регистрации:</span>
                                <span class="info-value">${this.formatDate(gameData.registrationDate || Date.now())}</span>
                            </div>
                        </div>
                        
                        <div class="action-buttons">
                            <button id="reset-progress" class="btn-danger">
                                <i class="fas fa-trash"></i>
                                Сброс прогресса
                            </button>
                            
                            <button id="export-data" class="btn-secondary">
                                <i class="fas fa-download"></i>
                                Экспорт данных
                            </button>
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

        // Переключатели настроек
        const notificationsToggle = document.getElementById('notifications-toggle');
        const soundsToggle = document.getElementById('sounds-toggle');
        const animationsToggle = document.getElementById('animations-toggle');

        if (notificationsToggle) {
            notificationsToggle.addEventListener('change', (e) => {
                this.updateSetting('notifications', e.target.checked);
            });
        }

        if (soundsToggle) {
            soundsToggle.addEventListener('change', (e) => {
                this.updateSetting('sounds', e.target.checked);
            });
        }

        if (animationsToggle) {
            animationsToggle.addEventListener('change', (e) => {
                this.updateSetting('animations', e.target.checked);
            });
        }

        // Кнопка сброса прогресса
        const resetBtn = document.getElementById('reset-progress');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetProgress();
            });
        }

        // Кнопка экспорта данных
        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }
    }

    calculateLevel() {
        const totalStars = this.app.gameData.totalStarsEarned || this.app.gameData.stars || 0;
        return Math.floor(totalStars / 1000) + 1;
    }

    renderAchievements() {
        const gameData = this.app.gameData;
        const achievements = [];
        
        // Достижения за регистрацию
        achievements.push({
            icon: '🎉',
            name: 'Добро пожаловать!',
            description: 'Зарегистрировался в игре',
            unlocked: true
        });
        
        // Достижение за друзей
        if (gameData.referrals >= 1) {
            achievements.push({
                icon: '👥',
                name: 'Друг-помощник',
                description: 'Пригласил первого друга',
                unlocked: true
            });
        }
        
        // Заблокированные достижения (только связанные со звездами и рефералами)
        const lockedAchievements = [
            {
                icon: '🌟',
                name: 'Звездный игрок',
                description: 'Собери 10000 звезд',
                unlocked: false,
                progress: gameData.totalStarsEarned || 0,
                target: 10000
            },
            {
                icon: '👑',
                name: 'Лидер сообщества',
                description: 'Пригласи 20 друзей',
                unlocked: false,
                progress: gameData.referrals || 0,
                target: 20
            }
        ];
        
        const allAchievements = [...achievements, ...lockedAchievements];
        
        if (allAchievements.length === 0) {
            return '<div class="empty-achievements">Достижений пока нет. Играйте и получайте награды!</div>';
        }
        
        return allAchievements.map(achievement => `
            <div class="achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-content">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    ${!achievement.unlocked && achievement.progress !== undefined ? 
                        `<div class="achievement-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min((achievement.progress / achievement.target) * 100, 100)}%"></div>
                            </div>
                            <span class="progress-text">${achievement.progress}/${achievement.target}</span>
                        </div>` : ''}
                </div>
            </div>
        `).join('');
    }

    renderPrizesHistory() {
        const gameData = this.app.gameData;
        const prizes = gameData.prizes || [];

        if (prizes.length === 0) {
            return `
                <div class="empty-prizes">
                    <div class="empty-icon">🎁</div>
                    <div class="empty-text">Призов пока нет</div>
                    <div class="empty-subtitle">Крутите рулетку и выигрывайте подарки!</div>
                </div>
            `;
        }

        // Сортируем призы по дате получения (новые сначала)
        const sortedPrizes = [...prizes].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

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
        const user = this.app.tg?.initDataUnsafe?.user;
        if (user?.username) {
            return `@${user.username}`;
        } else if (user?.first_name) {
            return user.first_name;
        }
        return 'Пользователь';
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
        const userId = this.app.tg?.initDataUnsafe?.user?.id;
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

    updateSetting(setting, value) {
        if (!this.app.gameData.settings) {
            this.app.gameData.settings = {};
        }
        
        this.app.gameData.settings[setting] = value;
        this.app.saveGameData();
        
        this.app.showStatusMessage(`Настройка "${setting}" ${value ? 'включена' : 'отключена'}`, 'success');
    }

    resetProgress() {
        if (confirm('Вы уверены, что хотите сбросить весь прогресс? Это действие нельзя отменить!')) {
            // Сохраняем только базовые данные
            const newGameData = {
                stars: 100,
                availableFriendSpins: 1,
                referrals: 0,
                registrationDate: Date.now(),
                settings: this.app.gameData.settings || {}
            };
            
            this.app.gameData = newGameData;
            this.app.saveGameData();
            
            // Обновляем UI
            this.app.updateUI();
            
            // Переходим на главный экран
            this.app.navigation.navigateTo('main');
            
            this.app.showStatusMessage('Прогресс успешно сброшен!', 'success');
        }
    }

    exportData() {
        const dataStr = JSON.stringify(this.app.gameData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `kosmetichka_data_${Date.now()}.json`;
        link.click();
        
        this.app.showStatusMessage('Данные экспортированы!', 'success');
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

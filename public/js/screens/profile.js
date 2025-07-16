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
                                <div class="stat-value">${gameData.prizesWon || 0}</div>
                                <div class="stat-label">🎁 Призы</div>
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
                                <div class="stats-icon">🎯</div>
                                <div class="stats-content">
                                    <div class="stats-value">${gameData.totalSpins || 0}</div>
                                    <div class="stats-desc">Общее количество прокруток</div>
                                </div>
                            </div>
                            
                            <div class="stats-card">
                                <div class="stats-icon">🎁</div>
                                <div class="stats-content">
                                    <div class="stats-value">${gameData.prizesWon || 0}</div>
                                    <div class="stats-desc">Призов выиграно</div>
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
                                <div class="stats-icon">🔥</div>
                                <div class="stats-content">
                                    <div class="stats-value">${this.calculateWinRate()}%</div>
                                    <div class="stats-desc">Процент выигрышей</div>
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
                        <h3 class="section-title">🎁 История призов</h3>
                        <div class="prize-history">
                            ${this.renderPrizeHistory()}
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

    calculateWinRate() {
        const totalSpins = this.app.gameData.totalSpins || 0;
        const prizesWon = this.app.gameData.prizesWon || 0;
        
        if (totalSpins === 0) return 0;
        return Math.round((prizesWon / totalSpins) * 100);
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
        
        // Достижение за 10 прокруток
        if (gameData.totalSpins >= 10) {
            achievements.push({
                icon: '🔥',
                name: 'Активный игрок',
                description: 'Сделал 10 прокруток',
                unlocked: true
            });
        }
        
        // Достижение за первый приз
        if (gameData.prizesWon >= 1) {
            achievements.push({
                icon: '🎁',
                name: 'Первый приз',
                description: 'Выиграл первый приз',
                unlocked: true
            });
        }
        
        // Достижение за друзей
        if (gameData.referrals >= 1) {
            achievements.push({
                icon: '👥',
                name: 'Друг-помощник',
                description: 'Пригласил первого друга',
                unlocked: true
            });
        }
        
        // Заблокированные достижения
        const lockedAchievements = [
            {
                icon: '💎',
                name: 'Коллекционер',
                description: 'Выиграй 50 призов',
                unlocked: false,
                progress: gameData.prizesWon || 0,
                target: 50
            },
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

    renderPrizeHistory() {
        const recentWins = this.app.gameData.recentWins || [];
        
        if (recentWins.length === 0) {
            return '<div class="empty-history">История призов пуста. Крутите рулетку, чтобы выиграть призы!</div>';
        }

        return recentWins.map((win, index) => `
            <div class="prize-history-item">
                <div class="prize-icon">${win.prize.icon}</div>
                <div class="prize-info">
                    <div class="prize-name">${win.prize.name}</div>
                    <div class="prize-date">${this.formatDate(win.timestamp)}</div>
                </div>
                <div class="prize-value">${win.prize.value ? `${win.prize.value}₽` : ''}</div>
            </div>
        `).join('');
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
                totalSpins: 0,
                prizesWon: 0,
                referrals: 0,
                recentWins: [],
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

    destroy() {
        console.log('🧹 Очистка экрана профиля...');
        // Здесь можно очистить обработчики событий, если необходимо
    }
}
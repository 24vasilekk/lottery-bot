// Основной модуль приложения админ панели
class AdminApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.isLoading = false;
        this.notifications = [];
        
        this.init();
    }

    // Безопасный вызов уведомлений
    showNotification(type, title, message) {
        if (window.NotificationManager && typeof window.NotificationManager[`show${type}`] === 'function') {
            window.NotificationManager[`show${type}`](title, message);
        } else {
            console.log(`${type}: ${title} - ${message}`);
        }
    }

    async init() {
        try {
            console.log('🚀 Инициализация админ панели...');
            
            // Показать загрузчик
            this.showLoader();
            
            // Простая проверка аутентификации для браузера
            const sessionAuth = sessionStorage.getItem('admin-logged-in');
            const localAuth = localStorage.getItem('admin-logged-in');
            const isAuthenticated = sessionAuth === 'true' || localAuth === 'true';
            
            console.log('🔐 Проверка аутентификации:', { sessionAuth, localAuth, isAuthenticated });
            
            if (!isAuthenticated) {
                console.log('❌ Не авторизован, перенаправляем на страницу входа');
                window.location.href = 'admin-login.html';
                return;
            }
            
            console.log('✅ Пользователь авторизован, продолжаем загрузку...');

            // Получить данные пользователя
            this.currentUser = {
                id: 1,
                name: 'Администратор',
                username: 'admin',
                isAdmin: true
            };
            
            // Инициализировать компоненты
            this.initializeComponents();
            
            // Настроить роутинг
            this.setupRouting();
            
            // Загрузить начальную страницу
            await this.loadPage(this.getCurrentPageFromURL());
            
            // Скрыть загрузчик и показать приложение
            console.log('🎨 Скрываем загрузчик и показываем приложение...');
            this.hideLoader();
            
            // Запустить периодические обновления
            this.startPeriodicUpdates();
            
            console.log('🎉 Админ панель полностью загружена!');
            
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.showNotification('Error', 'Ошибка загрузки админ панели', error.message);
            this.hideLoader();
        }
    }


    initializeComponents() {
        // Настроить боковое меню
        this.setupSidebar();
        
        // Настроить верхнюю панель
        this.setupTopBar();
        
        // Настроить модальные окна
        this.setupModals();
        
        // Настроить переключатель темы
        this.setupThemeToggle();
        
        // Обновить информацию о пользователе
        this.updateUserInfo();
        
        // Инициализировать иконки Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const menuItems = document.querySelectorAll('.menu-item');

        // Переключение сайдбара
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
        });

        // Восстановить состояние сайдбара
        if (localStorage.getItem('sidebar-collapsed') === 'true') {
            sidebar.classList.add('collapsed');
        }

        // Навигация по меню
        menuItems.forEach(item => {
            const link = item.querySelector('.menu-link');
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const page = item.getAttribute('data-page');
                if (page && page !== this.currentPage) {
                    await this.loadPage(page);
                    this.updateURL(page);
                }
            });
        });

        // Мобильное меню
        this.setupMobileMenu();
    }

    setupMobileMenu() {
        // Создать оверлей для мобильного меню
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebar-overlay';
        document.body.appendChild(overlay);

        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebar-toggle');

        // Открытие/закрытие мобильного меню
        const toggleMobileMenu = () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('mobile-open');
                overlay.classList.toggle('active');
                document.body.style.overflow = sidebar.classList.contains('mobile-open') ? 'hidden' : '';
            }
        };

        sidebarToggle.addEventListener('click', toggleMobileMenu);
        overlay.addEventListener('click', toggleMobileMenu);

        // Закрывать меню при изменении размера экрана
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && sidebar.classList.contains('mobile-open')) {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    setupTopBar() {
        // Уведомления
        const notificationsBtn = document.getElementById('notifications-btn');
        const notificationsMenu = document.getElementById('notifications-menu');
        
        if (notificationsBtn && notificationsMenu) {
            notificationsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notificationsMenu.classList.toggle('active');
            });

            document.addEventListener('click', () => {
                notificationsMenu.classList.remove('active');
            });
        }

        // Быстрые действия
        const quickActionsBtn = document.getElementById('quick-actions-btn');
        const quickActionsMenu = document.getElementById('quick-actions-menu');
        
        if (quickActionsBtn && quickActionsMenu) {
            quickActionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                quickActionsMenu.classList.toggle('active');
            });

            document.addEventListener('click', () => {
                quickActionsMenu.classList.remove('active');
            });

            // Обработчики быстрых действий
            const quickActions = document.querySelectorAll('.quick-action');
            quickActions.forEach(action => {
                action.addEventListener('click', (e) => {
                    const actionType = action.getAttribute('data-action');
                    this.handleQuickAction(actionType);
                });
            });
        }

        // Выход
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    setupModals() {
        const modalOverlay = document.getElementById('modal-overlay');
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });

            // Закрытие по Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
                    this.closeModal();
                }
            });
        }
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = themeToggle?.querySelector('.theme-icon');
        
        // Загрузить сохраненную тему
        const savedTheme = localStorage.getItem('admin-theme') || 'light';
        this.setTheme(savedTheme);

        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                this.setTheme(newTheme);
            });
        }
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('admin-theme', theme);
        
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.setAttribute('data-lucide', theme === 'light' ? 'moon' : 'sun');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    updateUserInfo() {
        if (this.currentUser) {
            const userName = document.getElementById('user-name');
            const userRole = document.getElementById('user-role');
            
            if (userName) {
                userName.textContent = this.currentUser.name || 'Администратор';
            }
            
            if (userRole) {
                userRole.textContent = this.currentUser.role || 'Admin';
            }
        }
    }

    setupRouting() {
        // Обработка изменения URL
        window.addEventListener('popstate', (e) => {
            const page = this.getCurrentPageFromURL();
            this.loadPage(page);
        });
    }

    getCurrentPageFromURL() {
        const hash = window.location.hash.substring(1);
        return hash || 'dashboard';
    }

    updateURL(page) {
        window.history.pushState({ page }, '', `#${page}`);
    }

    async loadPage(page) {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showPageLoader();
            
            // Обновить активный пункт меню
            this.updateActiveMenuItem(page);
            
            // Обновить заголовок страницы
            this.updatePageTitle(page);
            
            // Загрузить компонент страницы
            await this.loadPageComponent(page);
            
            this.currentPage = page;
            
        } catch (error) {
            console.error(`Ошибка загрузки страницы ${page}:`, error);
            this.showNotification('Error', 'Ошибка загрузки страницы', error.message);
        } finally {
            this.isLoading = false;
            this.hidePageLoader();
        }
    }

    updateActiveMenuItem(page) {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === page) {
                item.classList.add('active');
            }
        });
    }

    updatePageTitle(page) {
        const titles = {
            dashboard: 'Дашборд',
            users: 'Пользователи',
            channels: 'Каналы',
            wheel: 'Настройки рулетки',
            prizes: 'Призы',
            analytics: 'Аналитика',
            broadcasts: 'Рассылки',
            settings: 'Настройки'
        };
        
        const pageTitle = document.getElementById('current-page-title');
        if (pageTitle) {
            pageTitle.textContent = titles[page] || 'Админ панель';
        }
        
        document.title = `${titles[page] || 'Админ панель'} - Kosmetichka Lottery`;
    }

    async loadPageComponent(page) {
        console.log(`📄 Загружаем компонент страницы: ${page}`);
        const pageContent = document.getElementById('page-content');
        
        try {
            let component;
            
            switch (page) {
                case 'dashboard':
                    console.log('📊 Создаем DashboardComponent...');
                    component = new DashboardComponent();
                    window.dashboardPage = component;
                    break;
                case 'users':
                    console.log('👥 Создаем UsersPage...');
                    component = new UsersPage();
                    window.usersPage = component;
                    break;
                case 'channels':
                    console.log('📺 Создаем ChannelsPage...');
                    component = new ChannelsPage();
                    window.channelsPage = component;
                    break;
                case 'prizes':
                    console.log('🎁 Создаем PrizesPage...');
                    component = new PrizesPage();
                    window.prizesPage = component;
                    break;
                case 'wheel':
                case 'analytics':
                case 'broadcasts':
                case 'settings':
                    // Заглушки для страниц в разработке
                    const placeholderContent = this.renderPlaceholderPage(page);
                    pageContent.innerHTML = placeholderContent;
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                    return;
                default:
                    throw new Error(`Неизвестная страница: ${page}`);
            }
            
            // Рендер компонента
            if (page === 'dashboard') {
                // DashboardComponent работает по-старому (принимает container)
                console.log('📊 Рендерим Dashboard через container...');
                await component.render(pageContent);
            } else {
                // Новые компоненты возвращают HTML
                console.log(`📄 Рендерим ${page} через HTML...`);
                const content = await component.render();
                pageContent.innerHTML = content;
                
                // Инициализация компонента
                if (component.init) {
                    await component.init();
                }
            }
            
            // Обновить иконки после рендеринга
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
        } catch (error) {
            pageContent.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="alert-circle" class="empty-state-icon"></i>
                    <h3 class="empty-state-title">Ошибка загрузки</h3>
                    <p class="empty-state-message">Не удалось загрузить страницу: ${error.message}</p>
                    <button class="btn btn-primary" onclick="app.loadPage('${page}')">Попробовать снова</button>
                </div>
            `;
            throw error;
        }
    }

    renderPlaceholderPage(page) {
        const titles = {
            wheel: 'Настройки рулетки',
            analytics: 'Аналитика',
            broadcasts: 'Рассылки',
            settings: 'Настройки системы'
        };
        
        const icons = {
            wheel: 'target',
            analytics: 'bar-chart-3',
            broadcasts: 'send',
            settings: 'settings'
        };
        
        const features = {
            wheel: [
                'Настройка секторов рулетки',
                'Управление вероятностями выпадения',
                'Тестирование настроек',
                'Статистика крутов'
            ],
            analytics: [
                'Графики активности пользователей',
                'Аналитика по каналам',
                'Отчеты по выручке',
                'Экспорт данных'
            ],
            broadcasts: [
                'Создание рассылок',
                'Шаблоны сообщений',
                'Планировщик отправки',
                'Статистика доставки'
            ],
            settings: [
                'Общие настройки бота',
                'Управление промокодами',
                'Настройки канала выигрышей',
                'Резервное копирование'
            ]
        };
        
        const title = titles[page] || 'Страница';
        const icon = icons[page] || 'help-circle';
        const featureList = (features[page] || []).map(f => `<li>${f}</li>`).join('');
        
        return `
            <div class="placeholder-page">
                <div class="placeholder-content">
                    <div class="placeholder-icon">
                        <i data-lucide="${icon}" class="placeholder-icon-element"></i>
                    </div>
                    <h1 class="placeholder-title">${title}</h1>
                    <p class="placeholder-subtitle">Эта страница находится в разработке</p>
                    <div class="placeholder-features">
                        <h3>Планируемые возможности:</h3>
                        <ul class="placeholder-list">
                            ${featureList}
                        </ul>
                    </div>
                    <button class="btn btn-primary" onclick="app.loadPage('dashboard')">
                        <i data-lucide="home" class="btn-icon"></i>
                        На главную
                    </button>
                </div>
            </div>
        `;
    }

    async handleQuickAction(actionType) {
        switch (actionType) {
            case 'add-channel':
                // Открыть модальное окно добавления канала
                if (typeof ChannelsComponent !== 'undefined') {
                    const channelsComponent = new ChannelsComponent();
                    channelsComponent.showAddChannelModal();
                }
                break;
                
            case 'manual-spin':
                // Открыть модальное окно ручной прокрутки
                this.showManualSpinModal();
                break;
                
            case 'broadcast':
                // Перейти на страницу рассылок
                await this.loadPage('broadcasts');
                this.updateURL('broadcasts');
                break;
                
            case 'add-prize':
                // Открыть модальное окно выдачи приза
                this.showAddPrizeModal();
                break;
        }
    }

    showManualSpinModal() {
        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">Ручная прокрутка</h3>
                <button class="modal-close" onclick="app.closeModal()">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="manual-spin-form">
                    <div class="form-group">
                        <label class="form-label">Telegram ID пользователя</label>
                        <input type="text" class="form-input" id="spin-user-id" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Причина</label>
                        <input type="text" class="form-input" id="spin-reason" placeholder="Например: Компенсация за ошибку">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.closeModal()">Отмена</button>
                <button class="btn btn-primary" onclick="app.executeManualSpin()">Выдать прокрутку</button>
            </div>
        `;
        
        this.showModal(modalContent);
    }

    async executeManualSpin() {
        const userId = document.getElementById('spin-user-id').value;
        const reason = document.getElementById('spin-reason').value;
        
        if (!userId) {
            this.showNotification('Error', 'Ошибка', 'Введите Telegram ID пользователя');
            return;
        }
        
        try {
            await APIClient.post('/api/admin/manual-spin', {
                userId: userId,
                reason: reason || 'Ручная выдача администратором'
            });
            
            this.showNotification('Success', 'Успешно', 'Прокрутка выдана пользователю');
            this.closeModal();
            
        } catch (error) {
            this.showNotification('Error', 'Ошибка', 'Не удалось выдать прокрутку: ' + error.message);
        }
    }

    showAddPrizeModal() {
        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">Выдать приз</h3>
                <button class="modal-close" onclick="app.closeModal()">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="add-prize-form">
                    <div class="form-group">
                        <label class="form-label">Telegram ID пользователя</label>
                        <input type="text" class="form-input" id="prize-user-id" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Тип приза</label>
                        <select class="form-select" id="prize-type" required>
                            <option value="">Выберите тип приза</option>
                            <option value="stars">Звезды</option>
                            <option value="certificate">Сертификат</option>
                            <option value="custom">Кастомный приз</option>
                        </select>
                    </div>
                    <div class="form-group" id="prize-amount-group" style="display: none;">
                        <label class="form-label">Количество звезд</label>
                        <input type="number" class="form-input" id="prize-amount" min="1">
                    </div>
                    <div class="form-group" id="prize-description-group" style="display: none;">
                        <label class="form-label">Описание приза</label>
                        <input type="text" class="form-input" id="prize-description" placeholder="Например: Сертификат на 1000 рублей">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.closeModal()">Отмена</button>
                <button class="btn btn-primary" onclick="app.executeAddPrize()">Выдать приз</button>
            </div>
        `;
        
        this.showModal(modalContent);
        
        // Обработчик изменения типа приза
        document.getElementById('prize-type').addEventListener('change', (e) => {
            const amountGroup = document.getElementById('prize-amount-group');
            const descriptionGroup = document.getElementById('prize-description-group');
            
            if (e.target.value === 'stars') {
                amountGroup.style.display = 'block';
                descriptionGroup.style.display = 'none';
            } else if (e.target.value === 'certificate' || e.target.value === 'custom') {
                amountGroup.style.display = 'none';
                descriptionGroup.style.display = 'block';
            } else {
                amountGroup.style.display = 'none';
                descriptionGroup.style.display = 'none';
            }
        });
    }

    async executeAddPrize() {
        const userId = document.getElementById('prize-user-id').value;
        const prizeType = document.getElementById('prize-type').value;
        const prizeAmount = document.getElementById('prize-amount').value;
        const prizeDescription = document.getElementById('prize-description').value;
        
        if (!userId || !prizeType) {
            this.showNotification('Error', 'Ошибка', 'Заполните все обязательные поля');
            return;
        }
        
        try {
            let prizeData = {
                userId: userId,
                type: prizeType
            };
            
            if (prizeType === 'stars') {
                prizeData.amount = parseInt(prizeAmount);
            } else {
                prizeData.description = prizeDescription;
            }
            
            await APIClient.post('/api/admin/prizes/give', prizeData);
            
            this.showNotification('Success', 'Успешно', 'Приз выдан пользователю');
            this.closeModal();
            
        } catch (error) {
            this.showNotification('Error', 'Ошибка', 'Не удалось выдать приз: ' + error.message);
        }
    }

    showModal(content) {
        const modalOverlay = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');
        
        modalContent.innerHTML = content;
        modalOverlay.classList.add('active');
        
        // Обновить иконки в модальном окне
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    closeModal() {
        const modalOverlay = document.getElementById('modal-overlay');
        modalOverlay.classList.remove('active');
    }

    showLoader() {
        document.getElementById('loading-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }

    hideLoader() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
    }

    showPageLoader() {
        const pageContent = document.getElementById('page-content');
        pageContent.innerHTML = `
            <div class="loader-overlay">
                <div class="loader"></div>
            </div>
        `;
    }

    hidePageLoader() {
        // Содержимое страницы будет заменено компонентом
    }

    async logout() {
        try {
            // Очистить сессию
            sessionStorage.removeItem('admin-logged-in');
            localStorage.removeItem('admin-logged-in');
            window.location.href = 'admin-login.html';
        } catch (error) {
            console.error('Ошибка выхода:', error);
            window.location.href = 'admin-login.html';
        }
    }

    startPeriodicUpdates() {
        // Обновлять уведомления каждые 30 секунд
        setInterval(() => {
            this.updateNotifications();
        }, 30000);

        // Обновлять бейджи каждые 60 секунд
        setInterval(() => {
            this.updateBadges();
        }, 60000);
    }

    async updateNotifications() {
        try {
            // Заглушка для уведомлений
            const notifications = [];
            this.updateNotificationBadge(notifications.length);
            this.renderNotifications(notifications);
        } catch (error) {
            console.error('Ошибка загрузки уведомлений:', error);
        }
    }

    async updateBadges() {
        try {
            // Заглушка для статистики бейджей
            const stats = {
                new_users: Math.floor(Math.random() * 10),
                pending_prizes: Math.floor(Math.random() * 5)
            };
            
            // Обновить бейджи пользователей
            const usersBadge = document.getElementById('users-badge');
            if (usersBadge && stats.new_users) {
                usersBadge.textContent = stats.new_users;
                usersBadge.style.display = stats.new_users > 0 ? 'inline' : 'none';
            }
            
            // Обновить бейджи призов
            const prizesBadge = document.getElementById('prizes-badge');
            if (prizesBadge && stats.pending_prizes) {
                prizesBadge.textContent = stats.pending_prizes;
                prizesBadge.style.display = stats.pending_prizes > 0 ? 'inline' : 'none';
            }
            
        } catch (error) {
            console.error('Ошибка обновления бейджей:', error);
        }
    }

    updateNotificationBadge(count) {
        const badge = document.getElementById('notifications-count');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline' : 'none';
        }
    }

    renderNotifications(notifications) {
        const container = document.getElementById('notifications-list');
        if (!container) return;
        
        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-message">Нет новых уведомлений</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = notifications.map(notification => `
            <div class="notification-item">
                <div class="notification-content">
                    <h5 class="notification-title">${notification.title}</h5>
                    <p class="notification-message">${notification.message}</p>
                    <small class="notification-time">${this.formatDate(notification.created_at)}</small>
                </div>
                <button class="notification-close" onclick="app.markNotificationRead(${notification.id})">
                    <i data-lucide="x"></i>
                </button>
            </div>
        `).join('');
        
        // Обновить иконки
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async markNotificationRead(notificationId) {
        try {
            await APIClient.post(`/api/admin/notifications/${notificationId}/read`);
            await this.updateNotifications();
        } catch (error) {
            console.error('Ошибка отметки уведомления:', error);
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
        
        return date.toLocaleDateString('ru-RU');
    }
}

// Инициализация приложения
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new AdminApp();
});

// Глобальная обработка ошибок
window.addEventListener('unhandledrejection', (event) => {
    console.error('Необработанная ошибка:', event.reason);
    if (window.app && typeof window.app.showNotification === 'function') {
        window.app.showNotification('Error', 'Системная ошибка', 'Произошла неожиданная ошибка');
    } else {
        console.error('Системная ошибка: Произошла неожиданная ошибка');
    }
});
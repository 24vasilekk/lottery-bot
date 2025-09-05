// Роутер для Single Page Application
class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.beforeRouteChange = null;
        this.afterRouteChange = null;
        this.notFoundHandler = null;
        this.guards = [];
        
        this.init();
    }

    init() {
        // Обработчик изменения URL
        window.addEventListener('popstate', (e) => {
            this.handleRouteChange(e.state);
        });

        // Перехват кликов по ссылкам
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (link && !link.hasAttribute('data-no-router')) {
                e.preventDefault();
                const route = link.getAttribute('href').substring(1);
                this.navigate(route);
            }
        });
    }

    // Добавить маршрут
    addRoute(path, handler, options = {}) {
        const route = {
            path,
            handler,
            name: options.name,
            meta: options.meta || {},
            guards: options.guards || [],
            beforeEnter: options.beforeEnter,
            afterEnter: options.afterEnter
        };

        this.routes.set(path, route);
        return this;
    }

    // Добавить несколько маршрутов
    addRoutes(routes) {
        routes.forEach(route => {
            this.addRoute(route.path, route.handler, route);
        });
        return this;
    }

    // Навигация к маршруту
    async navigate(path, params = {}, options = {}) {
        try {
            const route = this.findRoute(path);
            
            if (!route) {
                return this.handleNotFound(path);
            }

            // Выполнить глобальные guards
            for (const guard of this.guards) {
                const result = await guard(route, this.currentRoute);
                if (result === false || typeof result === 'string') {
                    if (typeof result === 'string') {
                        return this.navigate(result);
                    }
                    return false;
                }
            }

            // Выполнить guards конкретного маршрута
            for (const guard of route.guards) {
                const result = await guard(route, this.currentRoute);
                if (result === false || typeof result === 'string') {
                    if (typeof result === 'string') {
                        return this.navigate(result);
                    }
                    return false;
                }
            }

            // Вызвать beforeRouteChange hook
            if (this.beforeRouteChange) {
                const canProceed = await this.beforeRouteChange(route, this.currentRoute);
                if (canProceed === false) {
                    return false;
                }
            }

            // Вызвать beforeEnter hook маршрута
            if (route.beforeEnter) {
                const canProceed = await route.beforeEnter(route, this.currentRoute);
                if (canProceed === false) {
                    return false;
                }
            }

            // Обновить URL если нужно
            if (!options.silent) {
                this.updateURL(path, params);
            }

            const previousRoute = this.currentRoute;
            this.currentRoute = { ...route, path, params };

            // Выполнить handler маршрута
            try {
                await route.handler(this.currentRoute, previousRoute);
            } catch (error) {
                console.error('Ошибка выполнения маршрута:', error);
                throw error;
            }

            // Вызвать afterEnter hook маршрута
            if (route.afterEnter) {
                await route.afterEnter(this.currentRoute, previousRoute);
            }

            // Вызвать afterRouteChange hook
            if (this.afterRouteChange) {
                await this.afterRouteChange(this.currentRoute, previousRoute);
            }

            return true;

        } catch (error) {
            console.error('Ошибка навигации:', error);
            this.handleError(error, path);
            return false;
        }
    }

    // Найти маршрут
    findRoute(path) {
        // Сначала ищем точное совпадение
        if (this.routes.has(path)) {
            return this.routes.get(path);
        }

        // Затем ищем по шаблонам
        for (const [routePath, route] of this.routes) {
            if (this.matchRoute(routePath, path)) {
                return route;
            }
        }

        return null;
    }

    // Проверить соответствие маршрута
    matchRoute(routePath, path) {
        // Простая проверка с параметрами
        const routeParts = routePath.split('/');
        const pathParts = path.split('/');

        if (routeParts.length !== pathParts.length) {
            return false;
        }

        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const pathPart = pathParts[i];

            // Параметр маршрута
            if (routePart.startsWith(':')) {
                continue;
            }

            // Wildcard
            if (routePart === '*') {
                continue;
            }

            // Точное совпадение
            if (routePart !== pathPart) {
                return false;
            }
        }

        return true;
    }

    // Извлечь параметры из пути
    extractParams(routePath, path) {
        const params = {};
        const routeParts = routePath.split('/');
        const pathParts = path.split('/');

        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const pathPart = pathParts[i];

            if (routePart.startsWith(':')) {
                const paramName = routePart.substring(1);
                params[paramName] = decodeURIComponent(pathPart);
            }
        }

        return params;
    }

    // Обновить URL
    updateURL(path, params = {}) {
        const url = this.buildURL(path, params);
        const state = { path, params };
        
        if (window.location.hash.substring(1) !== path) {
            window.history.pushState(state, '', '#' + url);
        }
    }

    // Построить URL с параметрами
    buildURL(path, params = {}) {
        let url = path;
        const queryParams = [];

        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
            }
        });

        if (queryParams.length > 0) {
            url += '?' + queryParams.join('&');
        }

        return url;
    }

    // Обработать изменение маршрута
    async handleRouteChange(state) {
        const path = this.getCurrentPath();
        const params = this.getQueryParams();
        
        await this.navigate(path, params, { silent: true });
    }

    // Получить текущий путь
    getCurrentPath() {
        const hash = window.location.hash.substring(1);
        const [path] = hash.split('?');
        return path || '/';
    }

    // Получить параметры запроса
    getQueryParams() {
        const hash = window.location.hash.substring(1);
        const [, query] = hash.split('?');
        const params = {};

        if (query) {
            query.split('&').forEach(param => {
                const [key, value] = param.split('=');
                if (key) {
                    params[decodeURIComponent(key)] = decodeURIComponent(value || '');
                }
            });
        }

        return params;
    }

    // Обработать "страница не найдена"
    handleNotFound(path) {
        console.warn(`Маршрут не найден: ${path}`);
        
        if (this.notFoundHandler) {
            this.notFoundHandler(path);
        } else {
            // Редирект на главную страницу по умолчанию
            this.navigate('/');
        }
    }

    // Обработать ошибку
    handleError(error, path) {
        console.error(`Ошибка маршрута ${path}:`, error);
        
        // Можно показать страницу ошибки или уведомление
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.showError('Ошибка навигации', error.message);
        }
    }

    // Добавить глобальный guard
    beforeEach(guard) {
        this.guards.push(guard);
        return this;
    }

    // Установить handler для "страница не найдена"
    onNotFound(handler) {
        this.notFoundHandler = handler;
        return this;
    }

    // Установить глобальные hooks
    beforeRoute(handler) {
        this.beforeRouteChange = handler;
        return this;
    }

    afterRoute(handler) {
        this.afterRouteChange = handler;
        return this;
    }

    // Перейти назад
    back() {
        window.history.back();
    }

    // Перейти вперед
    forward() {
        window.history.forward();
    }

    // Заменить текущий маршрут
    async replace(path, params = {}) {
        await this.navigate(path, params, { replace: true });
    }

    // Получить информацию о текущем маршруте
    getCurrentRoute() {
        return this.currentRoute;
    }

    // Проверить активность маршрута
    isActive(path, exact = false) {
        if (!this.currentRoute) return false;

        if (exact) {
            return this.currentRoute.path === path;
        }

        return this.currentRoute.path.startsWith(path);
    }

    // Построить URL для маршрута по имени
    buildRouteURL(name, params = {}) {
        const route = Array.from(this.routes.values()).find(r => r.name === name);
        
        if (!route) {
            console.warn(`Маршрут с именем "${name}" не найден`);
            return '#/';
        }

        return '#' + this.buildURL(route.path, params);
    }

    // Навигация по имени маршрута
    async navigateByName(name, params = {}) {
        const route = Array.from(this.routes.values()).find(r => r.name === name);
        
        if (!route) {
            console.warn(`Маршрут с именем "${name}" не найден`);
            return false;
        }

        return await this.navigate(route.path, params);
    }

    // Запуск роутера
    start() {
        const currentPath = this.getCurrentPath();
        const currentParams = this.getQueryParams();
        
        // Если нет пути, перейти на главную
        if (!currentPath || currentPath === '/') {
            this.navigate('dashboard');
        } else {
            this.navigate(currentPath, currentParams, { silent: true });
        }
    }
}

// Guards для проверки аутентификации
const authGuard = async (to, from) => {
    const authManager = new AuthManager();
    const isAuthenticated = await authManager.checkAuth();
    
    if (!isAuthenticated) {
        return 'login';
    }
    
    return true;
};

const adminGuard = async (to, from) => {
    const authManager = new AuthManager();
    const isAdmin = authManager.isAdmin();
    
    if (!isAdmin) {
        NotificationManager.showError('Доступ запрещен', 'У вас нет прав администратора');
        return false;
    }
    
    return true;
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Router, authGuard, adminGuard };
}
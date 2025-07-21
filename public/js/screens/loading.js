// loading.js - Loading Screen Module

export class LoadingScreen {
    constructor() {
        this.container = document.getElementById('loading-screen');
        this.statusMessage = 'Инициализация';
    }

    render() {
        this.container.innerHTML = `
            <div class="loading-screen">
                <div class="loading-content">
                    <div class="loading-logo">💄</div>
                    <div class="loading-title">Kosmetichka</div>
                    <div class="loading-subtitle">Рулетка красоты и призов</div>
                    <div class="loading-spinner"></div>
                    <div id="loading-status" class="loading-status">
                        <span class="loading-dots">${this.statusMessage}</span>
                    </div>
                </div>
            </div>
        `;
    }

    updateStatus(message) {
        this.statusMessage = message;
        const statusEl = this.container.querySelector('.loading-dots');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    show() {
        this.render();
        this.container.style.display = 'block';
        this.container.classList.remove('hidden');
    }

    hide() {
        this.container.classList.add('hidden');
        
        setTimeout(() => {
            this.container.style.display = 'none';
        }, 800);
    }

    // Loading stages
    async startLoadingSequence() {
        const stages = [
            { message: 'Подключение к Telegram', delay: 500 },
            { message: 'Загрузка данных пользователя', delay: 800 },
            { message: 'Инициализация интерфейса', delay: 600 },
            { message: 'Подготовка игры', delay: 400 }
        ];

        for (const stage of stages) {
            this.updateStatus(stage.message);
            await new Promise(resolve => setTimeout(resolve, stage.delay));
        }
    }
}
// public/js/screens/deposit.js - Deposit Screen Module (TELEGRAM STARS)

export class DepositScreen {
    constructor(app) {
        this.app = app;
        this.userBalance = 0;
        this.transactionHistory = [];
        this.depositAmounts = [
            { amount: 100, bonus: 0, popular: false },
            { amount: 200, bonus: 0, popular: false },
            { amount: 500, bonus: 25, popular: true },
            { amount: 1000, bonus: 100, popular: false },
            { amount: 2500, bonus: 300, popular: false }
        ];
    }

    render() {
        return `
            <div id="deposit-screen" class="screen">
                <div class="header">
                    <h2>💰 Пополнить баланс</h2>
                </div>

                <div class="deposit-tabs">
                    <button class="deposit-tab active" data-tab="quick">⚡ Быстро</button>
                    <button class="deposit-tab" data-tab="custom">✏️ Сумма</button>
                    <button class="deposit-tab" data-tab="history">📊 История</button>
                </div>

                <div id="quick-deposit" class="deposit-section active">
                    ${this.renderQuickDeposit()}
                </div>

                <div id="custom-deposit" class="deposit-section">
                    ${this.renderCustomDeposit()}
                </div>

                <div id="history-deposit" class="deposit-section">
                    ${this.renderTransactionHistory()}
                </div>

            </div>
        `;
    }

    renderQuickDeposit() {
        return `
            <div class="quick-deposit-container">
                <h3>🎯 Выберите сумму пополнения</h3>
                <div class="deposit-options">
                    ${this.depositAmounts.map(option => this.renderDepositOption(option)).join('')}
                </div>
            </div>
        `;
    }

    renderDepositOption(option) {
        const totalAmount = option.amount + option.bonus;
        const popularBadge = option.popular ? '<div class="popular-badge">🔥 Популярно</div>' : '';
        const bonusBadge = option.bonus > 0 ? `<div class="bonus-badge">+${option.bonus} ⭐ бонус</div>` : '';
        
        return `
            <div class="deposit-option ${option.popular ? 'popular' : ''}" 
                 onclick="handleDepositOption(${option.amount})">
                ${popularBadge}
                <div class="deposit-amount">${option.amount} ⭐</div>
                ${bonusBadge}
                <div class="deposit-total">Получите: ${totalAmount} ⭐</div>
                <div class="deposit-price">${option.amount} Telegram Stars</div>
                <button class="deposit-btn">Пополнить</button>
            </div>
        `;
    }

    renderCustomDeposit() {
        return `
            <div class="custom-deposit-container">
                <h3>✏️ Произвольная сумма</h3>
                
                <div class="custom-input-group">
                    <label for="custom-amount">Введите количество звезд:</label>
                    <div class="input-wrapper">
                        <input type="number" 
                               id="custom-amount" 
                               min="50" 
                               max="2500" 
                               placeholder="100"
                               class="custom-amount-input">
                        <span class="input-suffix">⭐</span>
                    </div>
                    <div class="input-info">
                        Минимум: 50 ⭐ • Максимум: 2500 ⭐
                    </div>
                </div>

                <div class="custom-summary" id="custom-summary">
                    <div class="summary-row">
                        <span>К оплате:</span>
                        <span id="custom-pay-amount">0 Telegram Stars</span>
                    </div>
                    <div class="summary-row">
                        <span>Получите:</span>
                        <span id="custom-receive-amount">0 ⭐</span>
                    </div>
                </div>

                <button class="custom-deposit-btn" id="custom-deposit-btn" onclick="handleCustomDeposit()" disabled>
                    Пополнить на произвольную сумму
                </button>
            </div>
        `;
    }

    renderTransactionHistory() {
        if (!this.transactionHistory || this.transactionHistory.length === 0) {
            return `
                <div class="history-container">
                    <h3>📊 История пополнений</h3>
                    <div class="empty-history">
                        <div class="empty-icon">📭</div>
                        <p>История пополнений пуста</p>
                        <p>Сделайте первое пополнение, чтобы увидеть историю транзакций</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="history-container">
                <h3>📊 История пополнений</h3>
                <div class="history-list">
                    ${this.transactionHistory.map(transaction => this.renderTransactionItem(transaction)).join('')}
                </div>
            </div>
        `;
    }

    renderTransactionItem(transaction) {
        const date = new Date(transaction.transaction_date);
        const dateStr = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const statusClass = transaction.status === 'completed' ? 'success' : 
                           transaction.status === 'pending' ? 'pending' : 'failed';
        
        const statusIcon = transaction.status === 'completed' ? '✅' : 
                          transaction.status === 'pending' ? '⏳' : '❌';

        return `
            <div class="transaction-item ${statusClass}">
                <div class="transaction-info">
                    <div class="transaction-amount">+${transaction.amount} ⭐</div>
                    <div class="transaction-date">${dateStr}</div>
                </div>
                <div class="transaction-status">
                    <span class="status-icon">${statusIcon}</span>
                    <span class="status-text">${this.getStatusText(transaction.status)}</span>
                </div>
            </div>
        `;
    }

    getStatusText(status) {
        switch (status) {
            case 'completed': return 'Завершено';
            case 'pending': return 'Ожидание';
            case 'failed': return 'Ошибка';
            case 'refunded': return 'Возврат';
            default: return 'Неизвестно';
        }
    }

    async init() {
        this.setupEventListeners();
        await this.loadUserBalance();
        await this.loadTransactionHistory();
        this.updateDisplay();
        console.log('✅ Экран пополнения инициализирован');
    }

    setupEventListeners() {
        // Переключение вкладок
        const depositTabs = document.querySelectorAll('.deposit-tab');
        depositTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // Обработка ввода произвольной суммы
        const customAmountInput = document.getElementById('custom-amount');
        if (customAmountInput) {
            customAmountInput.addEventListener('input', () => {
                this.updateCustomSummary();
            });
        }

        // Глобальные обработчики
        window.handleDepositOption = (amount) => {
            this.handleDepositOption(amount);
        };

        window.handleCustomDeposit = () => {
            this.handleCustomDeposit();
        };
    }

    switchTab(tabName) {
        // Обновляем вкладки
        document.querySelectorAll('.deposit-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        // Обновляем секции
        document.querySelectorAll('.deposit-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const sectionId = `${tabName}-deposit`;
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    }

    async loadUserBalance() {
        try {
            const userData = this.app.getUserData();
            this.userBalance = userData.stars || 0;
        } catch (error) {
            console.error('❌ Ошибка загрузки баланса:', error);
            this.userBalance = 0;
        }
    }

    async loadTransactionHistory() {
        if (!this.app.tg?.initDataUnsafe?.user?.id) return;

        try {
            const userId = this.app.tg.initDataUnsafe.user.id;
            const response = await fetch(`/api/user/${userId}/transactions`);
            const data = await response.json();
            
            if (data.success) {
                this.transactionHistory = data.transactions;
            } else {
                this.transactionHistory = [];
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки истории транзакций:', error);
            this.transactionHistory = [];
        }
    }

    updateDisplay() {
        const balanceElement = document.getElementById('current-balance');
        if (balanceElement) {
            balanceElement.textContent = `${this.userBalance} ⭐`;
        }

        // Обновляем историю транзакций если вкладка активна
        const historySection = document.getElementById('history-deposit');
        if (historySection && historySection.classList.contains('active')) {
            historySection.innerHTML = this.renderTransactionHistory();
        }
    }

    updateCustomSummary() {
        const input = document.getElementById('custom-amount');
        const payAmount = document.getElementById('custom-pay-amount');
        const receiveAmount = document.getElementById('custom-receive-amount');
        const depositBtn = document.getElementById('custom-deposit-btn');

        if (!input || !payAmount || !receiveAmount || !depositBtn) return;

        const amount = parseInt(input.value) || 0;
        const isValid = amount >= 50 && amount <= 2500;

        // Расчет бонуса для произвольной суммы
        let bonus = 0;
        if (amount >= 2000) bonus = Math.floor(amount * 0.15);
        else if (amount >= 1000) bonus = Math.floor(amount * 0.10);
        else if (amount >= 500) bonus = Math.floor(amount * 0.05);

        const totalReceive = amount + bonus;

        payAmount.textContent = `${amount} Telegram Stars`;
        receiveAmount.textContent = `${totalReceive} ⭐${bonus > 0 ? ` (+ ${bonus} бонус)` : ''}`;
        
        depositBtn.disabled = !isValid;
        depositBtn.textContent = isValid 
            ? `Пополнить на ${amount} ⭐` 
            : 'Введите корректную сумму';
    }

    async handleDepositOption(amount) {
        try {
            console.log(`💰 Пополнение на ${amount} звезд`);
            
            if (!this.app.tg?.initDataUnsafe?.user?.id) {
                this.app.showStatusMessage('Ошибка: нет данных пользователя', 'error');
                return;
            }

            // Показываем загрузку
            this.app.showStatusMessage('Создание счета для оплаты...', 'info');

            const userId = this.app.tg.initDataUnsafe.user.id;
            
            // Отправляем запрос на создание платежа
            const response = await fetch('/api/deposit/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId, 
                    amount,
                    userData: this.app.getUserData()
                })
            });

            const result = await response.json();

            if (result.success) {
                this.app.showStatusMessage('Счет создан! Проверьте чат с ботом', 'success');
                
                // Открываем чат с ботом
                if (this.app.tg && this.app.tg.openTelegramLink) {
                    this.app.tg.openTelegramLink('https://t.me/kosmetichka_lottery_bot');
                }
            } else {
                this.app.showStatusMessage(result.error || 'Ошибка создания платежа', 'error');
            }

        } catch (error) {
            console.error('❌ Ошибка обработки депозита:', error);
            this.app.showStatusMessage('Ошибка создания платежа', 'error');
        }
    }

    async handleCustomDeposit() {
        const input = document.getElementById('custom-amount');
        const amount = parseInt(input.value);

        if (amount < 50 || amount > 2500) {
            this.app.showStatusMessage('Сумма должна быть от 50 до 2500 звезд', 'error');
            return;
        }

        await this.handleDepositOption(amount);
    }

    // Методы для обновления данных после платежа
    async refreshBalance() {
        await this.loadUserBalance();
        await this.loadTransactionHistory();
        this.updateDisplay();
    }

    onPaymentCompleted(amount) {
        this.userBalance += amount;
        this.updateDisplay();
        this.app.showStatusMessage(`Пополнение на ${amount} ⭐ выполнено!`, 'success');
        
        // Haptic feedback
        if (this.app.tg?.HapticFeedback) {
            this.app.tg.HapticFeedback.notificationOccurred('success');
        }
    }
}

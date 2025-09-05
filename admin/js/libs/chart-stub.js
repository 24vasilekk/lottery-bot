// Заглушка для Chart.js из-за CSP ограничений
// В продакшене нужно загрузить полную версию локально

window.Chart = class ChartStub {
    constructor(ctx, config) {
        console.log('Chart.js stub: Creating chart', config.type);
        this.ctx = ctx;
        this.config = config;
        this.data = config.data || {};
        this.options = config.options || {};
    }
    
    update() {
        console.log('Chart.js stub: Update called');
    }
    
    destroy() {
        console.log('Chart.js stub: Destroy called');
    }
    
    render() {
        console.log('Chart.js stub: Render called');
    }
    
    resize() {
        console.log('Chart.js stub: Resize called');
    }
    
    stop() {
        console.log('Chart.js stub: Stop called');
    }
    
    reset() {
        console.log('Chart.js stub: Reset called');
    }
    
    toBase64Image() {
        return 'data:image/png;base64,';
    }
};
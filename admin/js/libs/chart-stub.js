// Простая реализация Chart.js для админки
// Рисует реальные графики на Canvas

window.Chart = class SimpleChart {
    constructor(ctx, config) {
        console.log('SimpleChart: Creating chart', config.type);
        
        this.canvas = ctx.canvas || ctx;
        this.ctx = this.canvas.getContext('2d');
        this.config = config;
        this.data = config.data || {};
        this.options = config.options || {};
        this.type = config.type;
        
        // Устанавливаем размеры
        this.width = this.canvas.width || 400;
        this.height = this.canvas.height || 200;
        
        // Создаем графики
        this.render();
    }
    
    update() {
        console.log('SimpleChart: Update called');
        this.render();
    }
    
    destroy() {
        console.log('SimpleChart: Destroy called');
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
    
    render() {
        console.log('SimpleChart: Rendering', this.type);
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        switch(this.type) {
            case 'line':
                this.renderLineChart();
                break;
            case 'doughnut':
                this.renderDoughnutChart();
                break;
            default:
                this.renderPlaceholder();
        }
    }
    
    renderLineChart() {
        const padding = 40;
        const chartWidth = this.width - padding * 2;
        const chartHeight = this.height - padding * 2;
        
        if (!this.data.datasets || this.data.datasets.length === 0) {
            this.renderPlaceholder();
            return;
        }
        
        // Найдем максимальное значение
        let maxValue = 0;
        this.data.datasets.forEach(dataset => {
            if (dataset.data) {
                maxValue = Math.max(maxValue, ...dataset.data.filter(v => typeof v === 'number'));
            }
        });
        
        if (maxValue === 0) maxValue = 100;
        
        // Рисуем оси
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        
        // Y-ось
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, this.height - padding);
        this.ctx.stroke();
        
        // X-ось
        this.ctx.beginPath();
        this.ctx.moveTo(padding, this.height - padding);
        this.ctx.lineTo(this.width - padding, this.height - padding);
        this.ctx.stroke();
        
        // Рисуем линии данных
        this.data.datasets.forEach((dataset, index) => {
            if (!dataset.data || dataset.data.length === 0) return;
            
            const color = dataset.borderColor || this.getDefaultColor(index);
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            const stepX = chartWidth / (dataset.data.length - 1);
            
            dataset.data.forEach((value, i) => {
                const x = padding + (i * stepX);
                const y = this.height - padding - ((value / maxValue) * chartHeight);
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            });
            
            this.ctx.stroke();
            
            // Рисуем точки
            this.ctx.fillStyle = color;
            dataset.data.forEach((value, i) => {
                const x = padding + (i * stepX);
                const y = this.height - padding - ((value / maxValue) * chartHeight);
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            });
        });
        
        // Подписи
        this.renderLabels();
    }
    
    renderDoughnutChart() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.min(centerX, centerY) - 40;
        const innerRadius = radius * 0.6;
        
        if (!this.data.datasets || this.data.datasets.length === 0) {
            this.renderPlaceholder();
            return;
        }
        
        const dataset = this.data.datasets[0];
        if (!dataset.data || dataset.data.length === 0) {
            this.renderPlaceholder();
            return;
        }
        
        const total = dataset.data.reduce((sum, value) => sum + value, 0);
        if (total === 0) {
            this.renderPlaceholder();
            return;
        }
        
        let currentAngle = -Math.PI / 2; // Начинаем сверху
        
        dataset.data.forEach((value, index) => {
            const sliceAngle = (value / total) * Math.PI * 2;
            const color = dataset.backgroundColor?.[index] || this.getDefaultColor(index);
            
            // Рисуем сегмент
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            this.ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
            this.ctx.closePath();
            this.ctx.fill();
            
            currentAngle += sliceAngle;
        });
        
        // Рисуем легенду
        this.renderDoughnutLegend();
    }
    
    renderDoughnutLegend() {
        if (!this.data.labels) return;
        
        const legendX = 20;
        let legendY = 30;
        
        this.ctx.font = '12px Arial';
        
        this.data.labels.forEach((label, index) => {
            const color = this.data.datasets[0]?.backgroundColor?.[index] || this.getDefaultColor(index);
            
            // Цветной квадратик
            this.ctx.fillStyle = color;
            this.ctx.fillRect(legendX, legendY - 8, 12, 12);
            
            // Текст
            this.ctx.fillStyle = '#333';
            this.ctx.fillText(label, legendX + 18, legendY + 2);
            
            legendY += 20;
        });
    }
    
    renderLabels() {
        if (!this.data.labels) return;
        
        this.ctx.font = '10px Arial';
        this.ctx.fillStyle = '#666';
        this.ctx.textAlign = 'center';
        
        const padding = 40;
        const chartWidth = this.width - padding * 2;
        const stepX = chartWidth / (this.data.labels.length - 1);
        
        this.data.labels.forEach((label, index) => {
            const x = padding + (index * stepX);
            const y = this.height - 15;
            this.ctx.fillText(label, x, y);
        });
    }
    
    renderPlaceholder() {
        this.ctx.fillStyle = '#f5f5f5';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = '#999';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Нет данных для отображения', this.width / 2, this.height / 2);
    }
    
    getDefaultColor(index) {
        const colors = [
            '#667eea', '#f093fb', '#4facfe', '#43e97b', 
            '#ffa726', '#ef5350', '#ab47bc', '#26c6da'
        ];
        return colors[index % colors.length];
    }
    
    resize() {
        console.log('SimpleChart: Resize called');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.render();
    }
    
    stop() {
        console.log('SimpleChart: Stop called');
    }
    
    reset() {
        console.log('SimpleChart: Reset called');
        this.render();
    }
    
    toBase64Image() {
        return this.canvas.toDataURL();
    }
};
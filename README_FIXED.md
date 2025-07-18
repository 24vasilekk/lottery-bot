# Kosmetichka Lottery Bot - Исправленная версия

## Исправленные проблемы

### ❌ Проблема: 409 Conflict Error
**Описание**: `ETELEGRAM: 409 Conflict: terminated by other getUpdates request`

**Причина**: Несколько экземпляров бота пытались получать обновления одновременно.

**Решение**:
1. ✅ Отключен автоматический polling при инициализации
2. ✅ Добавлена функция безопасного запуска `startPolling()`
3. ✅ Улучшена обработка ошибок polling с автоматическим переподключением
4. ✅ Добавлены скрипты для управления процессами

## Новые файлы

### 1. `stop-all-bots.js`
Останавливает все запущенные экземпляры бота перед новым запуском.

### 2. `start-safe.js`
Безопасный запуск бота с проверкой конфликтов.

## Как использовать

### Способ 1: Безопасный запуск (рекомендуется)
```bash
node start-safe.js
```

### Способ 2: Остановка всех экземпляров перед запуском
```bash
node stop-all-bots.js
sleep 3
node telegram-bot-server.js
```

### Способ 3: Обычный запуск (если уверены, что других экземпляров нет)
```bash
node telegram-bot-server.js
```

## Изменения в коде

### telegram-bot-server.js
1. **Строка 104**: `polling: false` - отключен автоматический polling
2. **Строки 118-140**: Добавлена функция `startPolling()` для безопасного запуска
3. **Строки 610-648**: Улучшена обработка ошибок с фильтрацией логирования
4. **Строки 981-999**: Улучшен graceful shutdown
5. **Строки 1015-1017**: Запуск polling с задержкой после инициализации сервера
6. **Строка 18**: Добавлен режим отладки через переменную `DEBUG_MODE`

## Настройка логирования

### Обычный режим (по умолчанию)
```bash
node telegram-bot-server.js
```
Показывает только важные сообщения и ошибки без технических подробностей.

### Режим отладки
```bash
DEBUG_MODE=true node telegram-bot-server.js
```
Показывает подробную информацию об ошибках и соединениях.

### Через .env файл
Создайте файл `.env` на основе `.env.example`:
```
DEBUG_MODE=false
BOT_TOKEN=your_token_here
WEBAPP_URL=https://your-domain.com
```

## Диагностика

### Проверка статуса бота
```bash
curl https://your-domain.com/health
```

### Проверка debug информации
```bash
curl https://your-domain.com/debug
```

### Проверка запущенных процессов
```bash
ps aux | grep -i "telegram-bot-server"
ps aux | grep -i "node.*lottery"
```

## Мониторинг

Бот теперь автоматически:
- ✅ Обнаруживает конфликты polling (409 ошибки)
- ✅ Переподключается при потере соединения
- ✅ Логирует все ошибки для диагностики
- ✅ Безопасно завершает работу при получении сигналов остановки

## Примечания

1. **Не запускайте несколько экземпляров одновременно** - это вызовет 409 ошибку
2. **Используйте `start-safe.js`** для автоматической проверки и остановки конфликтующих процессов
3. **Проверяйте логи** для диагностики проблем
4. **На продакшене используйте PM2** или другой менеджер процессов для автоматического перезапуска

## Решение проблем

### Если бот все еще не работает:
1. Остановите все процессы: `node stop-all-bots.js`
2. Подождите 10 секунд
3. Запустите безопасно: `node start-safe.js`

### Если 409 ошибка продолжается:
1. Проверьте, что токен бота не используется в других местах
2. Убедитесь, что нет других экземпляров на других серверах
3. Попробуйте сбросить webhook: `curl -X POST https://api.telegram.org/bot<TOKEN>/deleteWebhook`

---

**Автор исправлений**: Claude Code Assistant  
**Дата**: $(date)  
**Версия**: 1.0.1
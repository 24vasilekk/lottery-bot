# 🚂 Настройка Railway для Lottery Bot

## Проблема
После деплоя на Railway бот использует SQLite вместо PostgreSQL, что приводит к потере данных при перезапусках.

## ✅ Решение

### 1. Добавить PostgreSQL на Railway
1. Перейдите в проект на railway.app
2. Нажмите "Add Service" → "Database" → "PostgreSQL"
3. Дождитесь создания базы данных

### 2. Настроить переменную DATABASE_URL
1. В настройках сервиса бота найдите вкладку "Variables"
2. Добавьте переменную `DATABASE_URL` со значением из PostgreSQL сервиса
3. Формат: `postgresql://postgres:password@host:5432/railway`

### 3. Проверить настройки
После деплоя выполните на Railway:
```bash
node verify-railway-env.js
```

Вы должны увидеть:
- ✅ DATABASE_URL указывает на PostgreSQL
- ✅ Railway окружение обнаружено
- 🐘 Используется PostgreSQL (Railway)

## 🔍 Диагностика

### Локальная проверка
```bash
node verify-railway-env.js
```

### Проверка на Railway
В логах должно быть:
```
🐘 Используется PostgreSQL (Railway)
📡 DATABASE_URL длина: [число больше 0]
```

## ⚠️ Важно
- SQLite файлы добавлены в .gitignore и не должны попасть в продакшн
- После настройки DATABASE_URL перезапустите сервис
- Используйте `verify-railway-env.js` для проверки настроек

## 🐛 Если проблема осталась
1. Проверьте что DATABASE_URL установлена в Variables
2. Убедитесь что она начинается с `postgresql://`
3. Перезапустите сервис после изменений
4. Проверьте логи инициализации базы данных
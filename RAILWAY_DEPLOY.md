# 🚂 Развертывание на Railway

## Вариант 1: Два отдельных проекта (РЕКОМЕНДУЕТСЯ)

### Проект 1: Основной бот

1. Создайте новый проект на Railway
2. Подключите GitHub репозиторий
3. В настройках проекта добавьте переменные:

```env
BOT_TOKEN=ваш_основной_бот_токен
BOT_USERNAME=kosmetichka_lottery_bot
SERVER_URL=https://ваш-проект.up.railway.app
WEBAPP_URL=https://ваш-проект.up.railway.app
PORT=3000
```

4. В Settings → Deploy → Start Command оставьте пустым (будет использоваться npm start)

### Проект 2: Админ-бот

1. Создайте ВТОРОЙ новый проект на Railway
2. Подключите тот же GitHub репозиторий
3. В настройках добавьте переменные:

```env
ADMIN_BOT_TOKEN=ваш_админ_бот_токен
ADMIN_IDS=123456789,987654321
ADMIN_PORT=3001
ADMIN_URL=https://ваш-админ-проект.up.railway.app
```

4. В Settings → Deploy → Start Command укажите:
```
npm run admin
```

## Вариант 2: Один проект с двумя ботами

1. В одном проекте Railway добавьте ВСЕ переменные:

```env
# Основной бот
BOT_TOKEN=ваш_основной_бот_токен
BOT_USERNAME=kosmetichka_lottery_bot
SERVER_URL=https://ваш-проект.up.railway.app
WEBAPP_URL=https://ваш-проект.up.railway.app

# Админ-бот
ADMIN_BOT_TOKEN=ваш_админ_бот_токен
ADMIN_IDS=123456789,987654321
ADMIN_PORT=3001
```

2. В Settings → Deploy → Start Command укажите:
```
npm run both
```

## ⚠️ Важно для Railway

1. **Порты**: Railway автоматически предоставляет переменную `PORT`. Админ-бот будет использовать `ADMIN_PORT`.

2. **Домены**: Каждый проект получает свой домен вида `xxx.up.railway.app`

3. **Переменные окружения**: Добавляются в Settings → Variables

4. **Логи**: Смотрите в разделе Deployments → View Logs

## 🔍 Как найти свой Telegram ID

1. Запустите основной бот
2. Напишите ему `/start`
3. В логах Railway найдите строку: `👤 Пользователь 123456789 ...`
4. Скопируйте это число в `ADMIN_IDS`

## 🚨 Если админ-бот не работает

1. Проверьте логи в Railway
2. Убедитесь, что:
   - `ADMIN_BOT_TOKEN` правильный
   - `ADMIN_IDS` содержит ваш Telegram ID
   - Вы создали бота через @BotFather
   - Start Command = `npm run admin`

## 💡 Рекомендация

Используйте **Вариант 1** (два проекта) для лучшей изоляции и безопасности. Это также позволит масштабировать проекты независимо.
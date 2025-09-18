# 🔍 API ENDPOINTS AUDIT REPORT
*Сравнение API между приложением и админкой*

## 📊 ПОЛЬЗОВАТЕЛИ (Users)

### Приложение использует:
- `/api/user/${userId}` - основные данные пользователя ✅
- `/api/user/${userId}/prizes` - призы пользователя ❓
- `/api/user/${userId}/transactions` - транзакции ✅
- `/api/user/${userId}/tasks` - задания пользователя ❓
- `/api/user/${userId}/referrals` - рефералы ❓
- `/api/user/${userId}/profile` (POST) - обновление профиля ✅
- `/api/user/${userId}/balance-sync` - синхронизация баланса ❓

### Админка использует:
- `/api/admin/users` - список пользователей ✅
- `/api/admin/users/${userId}` - данные конкретного пользователя ✅
- `/api/admin/users/${userId}/balance-history` - история баланса ✅
- `/api/admin/users/stars` (POST) - операции со звездами ✅
- `/api/admin/users/${userId}/win-chance` (POST) - шанс выигрыша ✅
- `/api/admin/users/status` (POST) - статус пользователя ✅
- `/api/admin/users/search` - поиск пользователей ✅

### ⚠️ Проблемы:
1. **Дублирование endpoints в сервере** - найдено несколько копий одинаковых API
2. **Неиспользуемые endpoints** - некоторые API в приложении не имеют реализации
3. **Параметры userId vs telegramId** - несоответствие в некоторых endpoints

## 🎁 ПРИЗЫ (Prizes)

### Приложение использует:
- `/api/user/${telegramId}/prizes` - призы пользователя ❓
- `/api/user/claim-prize` (POST) - получение приза ❓
- `/api/leaderboard/prizes/position/${userId}` - позиция в лидерборде призов ❓

### Админка использует:
- `/api/admin/prizes/stats` - статистика призов ✅
- `/api/admin/prizes` - список призов ✅
- `/api/admin/prizes/${prizeId}/mark-given` (POST) - отметить как выданный ✅
- `/api/admin/prizes/bulk-mark-given` (POST) - массовая отметка ✅
- `/api/admin/prizes/give-custom` (POST) - выдать кастомный приз ✅

### ⚠️ Проблемы:
1. **Отсутствует `/api/user/${telegramId}/prizes`** в сервере
2. **Отсутствует `/api/user/claim-prize`** в сервере  
3. **Различные источники данных** - приложение и админка могут показывать разные призы

## 🏆 ЛИДЕРБОРД (Leaderboard)

### Приложение использует:
- `/api/leaderboard-referrals?limit=15` - лидерборд рефералов ✅
- `/api/leaderboard/referrals/position/${userId}` - позиция пользователя ✅
- `/api/leaderboard/stars/position/${userId}` - позиция по звездам ❓
- `/api/leaderboard/spins/position/${userId}` - позиция по спинам ❓
- `/api/leaderboard/prizes/position/${userId}` - позиция по призам ❓

### Админка использует:
- Не использует лидерборд напрямую, только в компоненте рефералов ❓

### ⚠️ Проблемы:
1. **Отсутствуют многие position endpoints** в сервере
2. **Лидерборд не интегрирован в админку** - нет единого API

## 🔄 РЕФЕРАЛЫ (Referrals)

### Приложение использует:
- `/api/user/${telegramId}/referrals` - рефералы пользователя ❓
- `/api/sync-referrals` (POST) - синхронизация рефералов ✅
- `/api/leaderboard-referrals` - лидерборд рефералов ✅

### Админка использует:
- `/api/admin/referrals/stats` - статистика рефералов ✅
- `/api/admin/referrals` - список рефералов ✅

### ⚠️ Проблемы:
1. **Исправлена проблема в `/api/user/${userId}`** - теперь правильно считает рефералы
2. **Отсутствует `/api/user/${telegramId}/referrals`** в сервере

## 📋 ЗАДАНИЯ (Tasks)

### Приложение использует:
- `/api/tasks/available/${userId}` - доступные задания ❓
- `/api/user/${userId}/tasks` - задания пользователя ❓
- `/api/update-user-stars` (POST) - обновление звезд ❓

### Админка использует:
- Не использует задания напрямую ❓

## 🔥 КРИТИЧЕСКИЕ ПРОБЛЕМЫ НАЙДЕНЫ:

### 1. **ДУБЛИРОВАНИЕ ENDPOINTS**
```
НАЙДЕНО ДУБЛИРОВАНИЕ в telegram-bot-server.js:
- app.get('/api/admin/users', ...) - строки 4589, 6812, 8856
- app.post('/api/admin/users/stars', ...) - строки 4721, 6897, 9048
- app.get('/api/user-referral-rank/:userId', ...) - строки 910, 1629
```

### 2. **ОТСУТСТВУЮЩИЕ ENDPOINTS**
```
ПРИЛОЖЕНИЕ ПЫТАЕТСЯ ИСПОЛЬЗОВАТЬ, НО НЕТ В СЕРВЕРЕ:
- /api/user/${telegramId}/prizes
- /api/user/claim-prize
- /api/user/${userId}/tasks
- /api/user/${telegramId}/referrals
- /api/tasks/available/${userId}
- /api/leaderboard/stars/position/${userId}
- /api/leaderboard/spins/position/${userId}  
- /api/leaderboard/prizes/position/${userId}
```

### 3. **НЕСООТВЕТСТВИЕ ПАРАМЕТРОВ**
```
CONFUSION userId vs telegramId:
- Некоторые endpoints ожидают userId (внутренний ID)
- Другие ожидают telegramId (Telegram ID)
- Приложение иногда передает не те параметры
```

## ✅ ПЛАН ИСПРАВЛЕНИЯ:

1. **Удалить дублирующиеся endpoints**
2. **Добавить отсутствующие endpoints** 
3. **Стандартизировать параметры** (везде использовать telegramId)
4. **Создать единые источники данных** для призов и заданий
5. **Добавить лидерборд в админку**

## 🎯 ПРИОРИТЕТ: ВЫСОКИЙ
Эти проблемы могут вызывать ошибки 404, неправильные данные и рассинхронизацию между приложением и админкой.
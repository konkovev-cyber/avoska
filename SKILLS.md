# Skills — шпаргалка

## 📋 Команды

| Действие | Команда |
|----------|---------|
| Показать все навыки | `npm run skills` |
| Поиск навыка | `npm run skills -- <поиск>` |
| Подключить навык | `npm run skills:connect -- <название>` |

## 🔥 Популярные навыки

### Для разработки
```bash
npm run skills:connect -- brainstorming
npm run skills:connect -- tdd-workflow
npm run skills:connect -- frontend-design
npm run skills:connect -- systematic-debugging
npm run skills:connect -- webapp-testing
```

### Для архитектуры
```bash
npm run skills:connect -- architect-review
npm run skills:connect -- software-architecture
npm run skills:connect -- design-orchestration
```

### Для безопасности
```bash
npm run skills:connect -- security-auditor
npm run skills:connect -- vulnerability-scanner
npm run skills:connect -- sql-injection-testing
```

### Для работы с документами
```bash
npm run skills:connect -- docx
npm run skills:connect -- xlsx
npm run skills:connect -- pptx
npm run skills:connect -- pdf
```

## 💡 Примеры использования

```
@brainstorming помоги придумать фичи для приложения доставки еды

@tdd-workflow напиши тесты для функции расчёта скидки

@frontend-design создай компонент карточки товара

@architect-review оцени архитектуру нового сервиса уведомлений
```

## 📂 Структура

```
_tools/           ← 600+ навыков (источник)
.qwen/skills/     ← подключённые навыки
scripts/
  list-skills.js  ← поиск навыков
  connect-skill.js ← подключение навыков
```

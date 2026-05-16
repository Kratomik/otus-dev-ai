# Цели Яндекс.Метрики — EcoTrack

Счётчик: `VITE_YANDEX_METRIKA_ID` (по умолчанию **109250000**).

События отправляются через `window.ym(counterId, 'reachGoal', <идентификатор>, <параметры>)` — см. `src/hooks/useAnalytics.ts`, `src/hooks/useYandexMetrika.ts`.

> **Важно:** идентификатор цели в интерфейсе Метрики должен **точно совпадать** со строкой, передаваемой в `trackEvent()` / `reachGoal`.  
> В таблице ниже указаны **рекомендуемые** идентификаторы в формате `snake_case` и **текущие** имена в коде (PascalCase). Перед продакшеном выберите один формат и синхронизируйте Метрику с кодом.

---

## 1. Основные JavaScript-цели

### 1.1. `calculator_calculated` — расчёт выполнен

| Поле | Значение |
|------|----------|
| **Идентификатор в Метрике** | `calculator_calculated` |
| **Имя события в коде (сейчас)** | `CalculatorCalculated` |
| **Условие достижения** | Пользователь нажал «Рассчитать», валидация прошла, расчёт CO₂ завершён успешно |
| **Параметры** | `transport` (number), `food` (number), `energy` (number), `shopping` (number), `total_co2` (number) |
| **Где в коде** | `src/pages/Calculator.tsx` — после расчёта в `handleCalculate` |

```ts
trackEvent('CalculatorCalculated', {
  transport,
  food,
  energy,
  shopping,
  total_co2: total,
})
```

---

### 1.2. `recommendation_clicked` — совет применён / выбран

| Поле | Значение |
|------|----------|
| **Идентификатор в Метрике** | `recommendation_clicked` |
| **Имя события в коде (сейчас)** | `RecommendationClicked` |
| **Условие достижения** | Пользователь кликнул по карточке рекомендации на странице Recommendations |
| **Параметры** | `recommendation_id` (number), `difficulty` (string), `impact` (number) |
| **Где в коде** | `src/pages/Recommendations.tsx` — `handleRecommendationClick` |

```ts
trackEvent('RecommendationClicked', {
  recommendation_id: recommendationId,
  difficulty,
  impact,
})
```

---

### 1.3. `badge_earned` — получен бейдж

| Поле | Значение |
|------|----------|
| **Идентификатор в Метрике** | `badge_earned` |
| **Имя события в коде (сейчас)** | `BadgeEarned` |
| **Условие достижения** | В списке бейджей пользователя появился новый элемент (сравнение с предыдущим состоянием; первая загрузка не считается «получением») |
| **Параметры** | `badge_name` (string), `earned_at` (string, ISO 8601) |
| **Где в коде** | `src/pages/Progress.tsx` — `useEffect` по изменению `data.badges` |

```ts
trackEvent('BadgeEarned', { badge_name: badgeName, earned_at: earnedAt })
```

---

### 1.4. `goal_set` — цель установлена

| Поле | Значение |
|------|----------|
| **Идентификатор в Метрике** | `goal_set` |
| **Имя события в коде (сейчас)** | `GoalSet` |
| **Условие достижения** | Пользователь указал тип цели и положительное целевое значение, нажал «Установить цель» |
| **Параметры** | `goal_type` (string: `co2_reduction` \| `xp` \| `level`), `target_value` (number) |
| **Где в коде** | `src/pages/Progress.tsx` — `handleSetGoal` |

```ts
trackEvent('GoalSet', { goal_type: goalType, target_value })
```

---

### 1.5. `pdf_exported` — экспорт отчёта

| Поле | Значение |
|------|----------|
| **Идентификатор в Метрике** | `pdf_exported` |
| **Имя события в коде (сейчас)** | `ProgressExported` |
| **Условие достижения** | Пользователь нажал «Экспорт PDF» на странице Progress (запускается `window.print()`) |
| **Параметры** | `format` (string, всегда `'pdf'`) |
| **Где в коде** | `src/pages/Progress.tsx` — `handleExportPdf` |

```ts
trackEvent('ProgressExported', { format: 'pdf' })
```

---

## 2. Настройка целей в интерфейсе Яндекс.Метрики

Повторите для каждой цели из раздела 1.

1. Откройте [metrika.yandex.ru](https://metrika.yandex.ru) → выберите счётчик **109250000** (или ваш из `.env`).
2. **Настройки** → **Цели** → **Добавить цель**.
3. Заполните поля:
   - **Название:** понятное описание (например, «Расчёт калькулятора»).
   - **Тип условия:** **JavaScript-событие**.
   - **Идентификатор цели:** как в таблице (например, `calculator_calculated`).
4. Сохраните цель.

### Пример: цель «Расчёт выполнен»

| Шаг | Значение |
|-----|----------|
| Тип | JavaScript-событие |
| Идентификатор | `calculator_calculated` |
| Совпадение с кодом | Сейчас в коде — `CalculatorCalculated`; для срабатывания цели идентификаторы должны совпадать (см. примечание в начале документа) |

### Проверка в браузере

1. Задайте `VITE_YANDEX_METRIKA_ID=109250000` в `frontend/.env.local`.
2. Запустите `npm run dev` в `frontend/`.
3. Выполните действие (расчёт, клик по совету и т.д.).
4. В Metrika → **Отчёты** → **Конверсии** / **Цели** — событие появится с задержкой (обычно до нескольких часов; в режиме отладки — быстрее через [отладчик](https://yandex.ru/support/metrica/general/check-goal.html)).

---

## 3. Дополнительные события в приложении

Не входят в обязательный список из ТЗ, но уже отправляются в коде:

| Событие | Назначение | Файл |
|---------|------------|------|
| `SPA_Navigation` | Переход между маршрутами | `src/App.tsx` |
| `RecommendationsViewed` | Загрузка списка советов | `src/pages/Recommendations.tsx` |
| `ProgressViewed` | Просмотр страницы прогресса | `src/pages/Progress.tsx` |
| `CalculationSaved` | Автосохранение расчёта | `src/pages/Calculator.tsx` |
| `UserLoggedIn` | Успешный вход (`email` / `yandex`) | `src/pages/Login.tsx`, `src/lib/finishAuthSession.ts` |
| `UserRegistered` | Успешная регистрация | `src/pages/Register.tsx` |
| `ErrorOccurred` | Ошибки (auth, API, глобальные, Error Boundary) | `src/lib/errorTracking.ts`, страницы auth |

---

## 4. Синхронизация имён (рекомендация)

Чтобы цели в Метрике с идентификаторами `snake_case` срабатывали без расхождений, замените в коде строки событий, например:

| Было | Стало |
|------|-------|
| `CalculatorCalculated` | `calculator_calculated` |
| `RecommendationClicked` | `recommendation_clicked` |
| `BadgeEarned` | `badge_earned` |
| `GoalSet` | `goal_set` |
| `ProgressExported` | `pdf_exported` |

Либо создайте цели в Метрике с идентификаторами **как в коде сейчас** (PascalCase / `ProgressExported`).

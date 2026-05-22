**Промт по созданию .cursorrules:**

```bash
# Role
You are an expert Frontend Engineer specializing in React 18, TypeScript, Vite, Tailwind CSS, and Testing Library. You prioritize accessibility (WCAG 2.1 AA), performance, and clean, maintainable code.

# Project Context
- App: EcoTrack v1.0 (MVP)
- Stack: React 18 + TS + Vite + Tailwind CSS + Recharts + React Router DOM
- Testing: Vitest + React Testing Library
- Design: Bright/Playful concept. Colors: #00E676, #2979FF, #F5F9F7, #0D1B2A. Fonts: Inter, Roboto Mono.
- Requirements: Mobile-first, touch targets ≥44px, prefers-reduced-motion support, graceful error handling, mock data for UI.

# Rules
1. ALWAYS use TypeScript strictly. No `any`. Use explicit interfaces/types.
2. Follow component-driven architecture. Keep components ≤150 lines. Extract logic to hooks if needed.
3. Use Tailwind for styling. Apply responsive prefixes (sm, md, lg). Ensure min-h-[44px] for interactive elements.
4. WCAG 2.1 AA: semantic HTML, aria-labels, proper contrast, keyboard navigation.
5. Handle UI states: loading, error, success, empty. Never leave UI broken.
6. Write tests with Vitest & RTL. Focus on user behavior, not implementation details.
7. Use mock data instead of API calls for MVP.
8. Keep constants/types in `/lib` or `/data`. Avoid magic numbers.
9. When generating code, output ONLY the code + brief explanation.
10. If fixing bugs, explain root cause → provide corrected code → suggest test case.
```

**Инициализация проекта:**

```bash
# 1. Инициализация Vite + React + TS
npm create vite@latest . -- --template react-ts

# 2. Установка зависимостей
npm install react-router-dom recharts lucide-react clsx tailwind-merge
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event

# 3. Настройка Tailwind
npx tailwindcss init -p

# 4. Очистка шаблона Vite
rm src/App.css src/App.tsx src/main.tsx
```

**Структура и Роутинг:**

```bash
@Codebase Create the project structure for EcoTrack v1.0:
- src/components/Layout.tsx (sidebar nav with icons, responsive)
- src/pages/Calculator.tsx
- src/pages/Recommendations.tsx
- src/pages/Progress.tsx
- src/main.tsx (init React Router)
- src/App.tsx (Routes setup)
Use React 18, TS, Tailwind. Colors: #00E676, #2979FF, #F5F9F7, #0D1B2A. Fonts: Inter. Add loading/error state placeholders. Ensure mobile-first layout. Output all files.
```

**Разработка компоненты:**

```bash
Реализуй компонент Calculator согласно ТЗ:
- 4 поля: transport, food, energy, shopping (type="number")
- Расчёт по IPCC: transport*0.21 + food*0.18 + energy*0.23 + shopping*0.15
- Вывод: итог в т CO₂/год, сравнение со средним РФ (12.5), PieChart из recharts
- Состояния: loading (при расчёте), error (если input < 0), success (графики)
- Mock-данные не нужны, считаем на лету. Валидация input. WCAG 2.1 AA.
```

```bash
Реализуй Recommendations:
- Mock-массив из 3 советов (текст, экономия CO₂, сложность: Легко/Средне/Сложно, impact 1-10)
- Карточки с бейджами, анимация появления (200-300ms cubic-bezier)
- Обработка пустого состояния и ошибки загрузки (fallback UI)
- Touch targets ≥44px, contrast ≥4.5:1, aria-labels.
```

```bash
Реализуй Progress:
- Уровень, XP бар (650/1000), бейджи (🌱, 🚲, 🔋)
- Кнопка "Экспорт PDF" (disabled пока, но с hover/active states)
- Адаптивная сетка, prefers-reduced-motion поддержка
- Graceful degradation если данные отсутствуют.
```

**Тестирование и отладка кода:**

```bash
Напиши Vitest + RTL тесты для Calculator.tsx:
1. Рендеринг полей и кнопки
2. Ввод 100 в "energy", клик "Рассчитать" → проверка вывода 23.00
3. Обработка ошибки при вводе отрицательного числа
Используй userEvent, waitFor, getByRole, getByLabelText. Mock ResizeObserver для Recharts.
```

```bash
@Terminal Проанализируй ошибку Vitest. Объясни причину, предложи исправленный код теста. Учти, что Recharts требует mock для ResponsiveContainer в jsdom.
```


**Адаптив и Оптимизация:**

 ```bash
@Codebase Проверь все компоненты на:
1. Mobile-first адаптивность (breakpoints sm/md/lg)
2. min-h-[44px] для всех кнопок/инпутов
3. prefers-reduced-motion (отключить анимации если пользователь предпочитает)
4. Оптимизируй рендеринг: вынеси статичные данные в useMemo, добавь React.memo где уместно
5. Убедись, что код отформатирован, нет unused imports, типы строгие.
```

**Генерация отчета**

```bash
@Codebase Сгенерируй файл development_report.md на основе текущего проекта. Включи:
- Описание процесса разработки с AI
- Примеры использованных промптов
- Проблемы и решения (тесты, адаптив, доступность)
- Выводы и рекомендации
- Ссылки на стек и инструменты
Формат: Markdown, структурировано, без воды.
```

**Интеграция с supabase:**

```bash
@Codebase Настрой клиент Supabase в src/lib/supabase.ts. 
Установи @supabase/supabase-js. Экспортируй клиент. 
Добавь типы TS для таблиц: Calculations, UserProgress, Recommendation.
Сделай хелперы: signUp, signIn, signOut, getCurrentUser.
Обработай ошибки сети и валидации.
```

**Создание хуков**

```bash
@Codebase Создай src/hooks/useEcoData.ts. 
Реализуй React хуки:
1. useCalculations(): загрузка истории, сохранение нового расчёта (INSERT), автосохранение последнего.
2. useProgress(): загрузка/обновление XP и уровня (UPSERT).
3. useRecommendations(): fetch активных рекомендаций из БД.
Добавь состояния loading, error, success. Используй useEffect и useCallback. Обработай 401 (редирект на логин).
```

**Замена Mock на реальные данные**

```bash
@Calculator.tsx @useEcoData.ts Интегрируй useCalculations. 
При нажатии "Рассчитать" сохраняй расчёт в БД. 
Покажи loading spinner при сохранении. 
Если ошибка, покажи alert с текстом ошибки. 
Используй currentUser из useSession.
```

**Поиск проблем в логах:**

```bash
@Terminal docker compose logs -f --tail=500 backend | grep -E "error|warn|500"
Проанализируй выведенные логи:
1. Выдели повторяющиеся ошибки
2. Определи корневую причину (root cause)
3. Предложи конкретные исправления в коде
4. Укажи, какие логи нужно добавить для лучшей диагностики
```

**Анализ типичных ошибок:**

```bash
@File: docker-logs.json (скопируйте JSON-логи из docker compose logs --tail=100)
Найди в логах паттерны:
1. Ошибки подключения к БД (P1000, P1001)
2. Ошибки валидации (400, 422)
3. Ошибки аутентификации (401, 403)
4. Таймауты и медленные запросы (>1000ms)
Выведи таблицу: Частота | Уровень | Файл/Роут | Решение
```

**Оптимизация frontend:**

```bash
@Codebase Проанализируй производительность React-приложения и предложи оптимизации:

1. Найди тяжелые компоненты (рендеринг больших списков, сложные вычисления).
2. Предложи внедрение React.lazy() и Suspense для роутов (Recommendations, Progress), чтобы они загружались только по требованию (Code Splitting).
3. Проверь использование useMemo и useCallback для предотвращения лишних ререндеров.
4. Проверь импорты: нет ли импортов библиотек целиком (например, lodash), где можно импортировать модули отдельно?
5. Предложи настройки Vite (vite.config.ts) для оптимизации сборки (terser, compression, chunkSizeWarningLimit).

Примени эти изменения, создай diff и объясни, что улучшено.
```


**Оптимизация backend:**

```bash
@Codebase Проанализируй производительность Backend (Fastify + Prisma/Supabase):

1. Проверь запросы к БД:
   - Нет ли N+1 проблемы (запрос в цикле)?
   - Используются ли индексы для часто фильтруемых полей?
2. Предложи добавление GZIP-сжатия ответов в Fastify.
3. Проверь кэширование:
   - Есть ли данные, которые редко меняются (например, рекомендации)? Предложи простое in-memory кэширование.
4. Проверь безопасность и лимиты:
   - Настроен ли helmet для заголовков безопасности?
   - Настроен ли rate-limit для предотвращения DDoS?

Создай необходимые улучшения кода.
```
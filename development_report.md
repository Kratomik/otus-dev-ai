# EcoTrack v1.0 — Development Report

## 1) Процесс разработки с AI

Разработка велась итеративно в формате "задача -> генерация кода -> проверка -> правка":

1. **Скелет приложения**
   - Создана структура React-приложения с роутингом:
     - `src/main.tsx` (инициализация Router)
     - `src/App.tsx` (маршруты)
     - `src/components/Layout.tsx` (responsive sidebar)
     - `src/pages/Calculator.tsx`
     - `src/pages/Recommendations.tsx`
     - `src/pages/Progress.tsx`
2. **UI и дизайн-система MVP**
   - Применены цвета: `#00E676`, `#2979FF`, `#F5F9F7`, `#0D1B2A`
   - Подключён шрифт `Inter`
   - Реализован mobile-first подход (Tailwind `sm/md/lg`)
3. **Бизнес-логика**
   - В `Calculator` добавлена формула IPCC:
     - `transport*0.21 + food*0.18 + energy*0.23 + shopping*0.15`
   - Добавлено сравнение с базовым значением РФ `12.5`
4. **Доступность и UX**
   - Добавлены состояния `loading/error/success/empty`
   - Проверены touch targets (`min-h-[44px]`)
   - Добавлены `aria-*` атрибуты для форм и интерактивных элементов
   - Добавлен `motion-reduce` для пользователей с `prefers-reduced-motion`
5. **Тестирование и стабилизация**
   - Настроен Vitest + RTL (jsdom, setup)
   - Добавлены тесты сценариев калькулятора
   - Добавлены моки для `ResizeObserver` и сценариев с Recharts
6. **Оптимизация бандла**
   - График вынесен в lazy chunk:
     - `src/components/EmissionsPieChart.tsx`
     - загрузка через `React.lazy` + `Suspense`

---

## 2) Примеры использованных промптов

Ниже реальные типы задач, которые давались AI:

- "Create the project structure for EcoTrack v1.0: Layout, Calculator, Recommendations, Progress, Router setup."
- "Реализуй Calculator согласно ТЗ: 4 поля, формула IPCC, loading/error/success, PieChart."
- "Реализуй Recommendations: mock-массив, бейджи, анимация, fallback empty/error."
- "Реализуй Progress: уровень, XP бар 650/1000, бейджи, disabled export button."
- "Напиши Vitest + RTL тесты для Calculator.tsx с userEvent, waitFor, getByRole/getByLabelText."
- "Проверь mobile-first, min-h-[44px], prefers-reduced-motion, оптимизируй рендеринг."

Паттерн эффективного промпта:
- Чёткое ТЗ (что именно, какие поля, какая формула, какие состояния)
- Ограничения (WCAG, mobile-first, инструменты)
- Критерии приёмки (какие тесты, какой ожидаемый результат)

---

## 3) Проблемы и решения

## 3.1 Конфигурация Tailwind/Vite
- **Проблема:** сборка падала из-за конфликта конфигурации Tailwind plugin.
- **Решение:** приведена конфигурация к рабочему варианту для текущего стека, поправлены `tailwind.config.js`, `index.css`, `vite.config.ts`.
- **Результат:** `npm run build` проходит стабильно.

## 3.2 Тесты и асинхронные состояния
- **Проблема:** флаки в тестах из-за таймеров и `act(...)` предупреждений.
- **Решение:** использование fake timers/`waitFor`, корректное ожидание переходов `loading -> success`.
- **Результат:** тесты стали стабильными.

## 3.3 Recharts в jsdom
- **Проблема:** ошибки в тестовой среде из-за `ResizeObserver`.
- **Решение:** добавлен mock `ResizeObserver` в тестах.
- **Результат:** компоненты с графиками корректно тестируются.

## 3.4 Lazy-loading графика
- **Проблема:** предупреждение о крупном чанке.
- **Решение:** вынесен график в отдельный ленивый компонент `EmissionsPieChart`.
- **Результат:** основной bundle уменьшился, график грузится по требованию.

## 3.5 Адаптивность и доступность
- **Проблема:** необходимость системной проверки UI по WCAG и touch UX.
- **Решение:** добавлены/проверены `min-h-[44px]`, aria-labels, fallback UI, `motion-reduce`.
- **Результат:** интерфейс лучше работает на мобильных и в accessibility-сценариях.

---

## 4) Выводы и рекомендации

### Выводы
- AI-итерации ускоряют MVP-разработку при наличии чётких acceptance-критериев.
- Наибольший выигрыш: генерация boilerplate, UI-состояний и тестовых сценариев.
- Наибольшие риски: конфигурация toolchain и стабильность асинхронных тестов.

### Рекомендации
1. **Зафиксировать единый стиль промптов**
   - Шаблон: цель -> ограничения -> критерии приёмки -> expected output.
2. **Сразу включать тестируемость в ТЗ**
   - Явно задавать сценарии `success/error/empty/loading`.
3. **Поддерживать perf-бюджет**
   - Сохранять lazy-loading для тяжёлых библиотек визуализации.
4. **Добавить CI шаги**
   - `npm test`, `npm run build`, линт в PR-пайплайн.
5. **Расширить покрытие тестами**
   - Проверки `Recommendations`/`Progress` не только на рендер, но и на fallback/interaction.

---

## 5) Стек и инструменты

### Core stack
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)

### Testing
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library user-event](https://testing-library.com/docs/user-event/intro/)
- [jest-dom matchers](https://github.com/testing-library/jest-dom)

### Dev tooling
- [ESLint](https://eslint.org/)
- [PostCSS](https://postcss.org/)
- [Autoprefixer](https://github.com/postcss/autoprefixer)


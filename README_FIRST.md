# Almazov Schedule Hub — release 2.8.0-rc.5 (Master RC)

Версия приложения: **2.8.0-rc.5** (кандидат в релиз).
Версия интерфейса: **2.8.0-rc.5**.
Движок официального расписания: **4.9.0-rc.1**.

> **Статус данных на 11.10.2026: BLOCKED_FOR_PRODUCTION.** Последняя записанная синхронизация получила 10 PDF КУГ, но отчёт содержит SHA-256 только для 6 и четыре ошибки разбора; новый прямой запрос PDF завершился тайм-аутом. Официальный хаб публикует 10 КУГ: Лечебное дело 1–6, Педиатрия 1–2, Клиническая психология 1–2. Локальный снимок неполон: нет прямой практики для группы 103, групп 217–222 и 225–229, групп 501–512 и групп 601–618. Пока официальные PDF не будут скачаны и разобраны, недостающие занятия не добавлять по догадке. См. [`reports/official-coverage-audit-2026-10-10.md`](reports/official-coverage-audit-2026-10-10.md) и [`docs/PRODUCTION_SYNC_AND_RELEASE.md`](docs/PRODUCTION_SYNC_AND_RELEASE.md).

> **Локальный режим:** данные расписания загружаются из `dist/data/schedules`; для работы не требуются API, Redis или доступ к сети. Личные события и настройки хранятся в браузере. Обращения и заметки поддержки также остаются на этом устройстве и не отправляются. Это работоспособная статическая сборка, но её расписание пока неполное.


## Integration changes in RC5 (2026-10-11)

- The practice parser now emits newline-delimited JSON diagnostics for extractor errors, candidate rejection, garbled matrix cells, missing groups, event counts and parser selection. Candidates from PDFPlumber and PyMuPDF are unioned/deduplicated before whole-roster validation, so a partial extractor does not discard rows recoverable by the other backend.
- The Stream A 4th-course matrix has a dedicated real-PDF fixture regression: 250 weekly assignments for groups 401–412, no inferred weekdays, exact time bounds, duplicate rejection and structured completion diagnostics. The CI schedule-sync workflow runs this regression before ingestion.
- Settings now use a touch-friendly 12-color preset grid, a custom color picker, immediate schedule preview, local persistence and optional collapsed gradient presets. Solid colors clear an active gradient for predictable appearance.
- The timetable exposes only “Все”, “Лекции”, “ПЗ” and “Контроль” as type filters. Seminar, lab and clinical lesson types are still parsed, stored and rendered by “Все”; only their separate filter buttons were removed.

Validation for this patch: TypeScript build passes, Node tests pass 83/83, canonical Python regression passes 13/13, and production/data/cache contracts pass when run individually. The environment lacks npm lockfile/dependencies for minification, so the current `dist` is not minified. Official live-sync remains blocked by network/DNS and the stored recovery snapshot remains explicitly partial; this RC5 is an integration patch, not a production declaration.

## Локально, без API/backend

```bash
npm run start:static
```

Открой `http://127.0.0.1:4173`. Эта команда запускает только статическую раздачу уже собранной папки `dist/`. Если нужно пересобрать приложение после изменения исходников: `npm install`, затем `npm run build:start:static`. Без npm можно запустить имеющуюся сборку напрямую: `node scripts/serve-static.mjs`. В любом случае API, Redis и `npm start` не нужны.

Static-режим показывает опубликованные источником курсы, потоки и группы, которые присутствуют в снимках. Непубликованные сочетания остаются пустыми с пометкой об отсутствии официального источника; приложение не подставляет расписание другой группы или курса.

## Публикация

Запрос охватывает локальный статический запуск. В этой копии репозитория отсутствует каталог `.github/workflows`, а live-данные не проходят production gate. Публикация на GitHub Pages не настроена и не выполняется.

## Независимая перепроверка кода

По итогам аудита обновлены регрессионные контракты, исправлена текущая ссылка на ПЗ 4Б, добавлена узкая проверка метаданных Педиатрии 2 курса и введён строгий pre-deploy gate. `npm run qa` завершился с кодом 0 (последний локальный прогон); новая проверка Педиатрии закрыта отдельными позитивными/негативными тестами. Локальная сборка по-прежнему неминифицирована, live SHA-256 отсутствуют, и `python scripts/validate_production_release.py` обязан завершаться с BLOCKED до сетевой синхронизации. Подробности: [`docs/PRODUCTION_SYNC_AND_RELEASE.md`](docs/PRODUCTION_SYNC_AND_RELEASE.md).

## Данные и функции локальной версии

- Расписание, курс/поток/группа и КУГ читаются из статических файлов `dist/`; приложение не обращается к API, Redis, внешнему серверу расписаний или аналитике.
- Профиль, тема, домашние задания, личные события и ссылки сохраняются в браузере. Файлы материалов и заметки поддержки хранятся в IndexedDB этого браузера.
- Запись поддержки — локальная заметка, а не отправленное обращение. Приложение показывает это рядом с записью.
- Данные расписания в этом снимке неполные для части групп. Статическая сборка не заполняет пропуски расписанием другой группы и не назначает день недели матричному занятию.

## Важное

- Локальный `data/official-schedules.json` является bootstrap-слоем и не блокирует отображение уже имеющихся официальных событий.
- Полнота live-расписания 1–6 курсов проверяется отдельно CI и генератором перед публикацией.
- Нативные `<select>`, `<input type="date">` и `<input type="datetime-local">` визуально заменяются единым UI Kit с клавиатурной навигацией, доступностью и поддержкой обеих тем. Исходные поля остаются синхронизированными с моделью приложения.
- Персонализация хранится в `localStorage`, бинарные пользовательские материалы — в IndexedDB браузера (до 25 MiB на файл). Первая миграция схемы делает резервную копию прежнего центрального JSON и не удаляет legacy-ключи. Личные данные не синхронизируются между устройствами автоматически; очистка хранилища браузера может удалить локальные материалы.
- GitHub Pages не распаковывает ZIP автоматически: в репозиторий загружается содержимое архива, а не сам ZIP.

**Обновление официального расписания:** пользовательского импорта файлов в интерфейсе нет. Статический сайт читает только вложенные snapshots. Команда `npm run sync:official` предназначена для обновления исходных данных в среде с доступом к сайту; перед её использованием нужно устранить текущие пробелы покрытия и пройти строгие проверки.

**Пользовательские материалы:** PDF, DOCX, XLSX, PPTX, ZIP, JPG/JPEG и PNG; файлы доступны в том же браузере для выбранной программы/курса/группы.

Официальный источник расписания: https://education.almazovcentre.ru/about_institute/programm/specialist_programme/student/


## Установка на телефон (Master RC)

Подробная инструкция Android APK и iPhone PWA находится в [`docs/ANDROID_INSTALL.md`](docs/ANDROID_INSTALL.md). APK создаётся вручную через GitHub Actions workflow `Build Android APK (RC)`; ссылка на APK начнёт работать после успешной сборки и прикрепления файла к GitHub Release.

## Official data recovery status (carried forward from RC4; RC5 code only)

- `npm run recover:offline-safe` applies the official week-number calendar to cached 4A/4B/5B rotation matrices, rebuilds the clearly marked local recovery snapshot for the currently published Pediatrics/Clinical Psychology 1–2 course rules, and refreshes the per-group coverage audit. This is for local review only; it does not pass the production gate.
- `npm run sync:official` is the production synchronization path. It must run with network access, fetch current official PDFs, record content hashes, build all snapshots and pass `scripts/validate_production_release.py`. Do not replace it with the offline command for deployment.
- Current hard blockers: official PDF raw-byte SHA-256 and checkedAt missing in this runtime; course 2 Flow B practice remains a partial 12-event cache (official PDF has groups 217–229); course 5 Flow A has no parsed event assignments; course 6 practice is quarantined due a corrupt local text layer; Pediatrics/Clinical Psychology rules are recovery-only. `version.json` remains `BLOCKED_FOR_PRODUCTION_UNTIL_LIVE_SYNC_GATE_PASSES`.
- The 2026/2027 week calendar has been reviewed in official PDF text, but the raw PDF bytes could not be downloaded in this runtime. It includes a source anomaly `31.12.2027` inside the 2026/2027 calendar. This anomaly is preserved, not silently corrected.
- The recovered weekly rotation mapping preserves `matrixWeekNumber` and maps it directly to `calendarWeekNumber = matrixWeekNumber` (offset 0). The official PDF preview shows a single date label `03.09.2025` under matrix week 1 (inside official calendar week 1, `2026-09-01`–`2026-09-05`) and `07.09.2025–12.09.2025` under matrix week 2 (official calendar week 2, `2026-09-07`–`2026-09-12`). The 2025 date labels are quarantined; no weekday or actual lesson date is inferred from a matrix column. The production gate enforces this direct mapping and exact official calendar ranges.

## Full project package (2026-10-11)

This archive contains the current project tree, generated `dist`, schedule data, tests, fixtures and audit reports. See [`PACKAGE_STATUS_2026-10-11.md`](PACKAGE_STATUS_2026-10-11.md) and [`reports/data-coverage-latest.md`](reports/data-coverage-latest.md) for current readiness and blockers. The static build works locally, but the schedule data remains `not-ready` for publication until missing and conflicting assignments are resolved and specialist recovery snapshots are verified.

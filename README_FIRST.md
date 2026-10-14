# Almazov Student — 2.8.0-rc.6

Веб-приложение для повседневного расписания, задач, материалов и личных заметок.

## Охват расписания

- Лечебное дело: 1–6 курсы, лекции и ПЗ из официальных источников.
- Педиатрия и Клиническая психология: опубликованные 1–2 курсы. Старшие курсы появятся после публикации источников.
- Циклы старших курсов показываются по официальным учебным неделям. Если неделя содержит несколько дисциплин, приложение не выдумывает дни перехода между ними: рядом доступен исходный PDF.
- Для 4–6 курсов доступен личный импорт ПЗ. Сохранённый импорт имеет приоритет для выбранной группы.

## Проверка перед публикацией

Текущий результат проверки источников: `reports/production-release-audit.json`. Дополнительный отчёт целостности: `reports/data-coverage-latest.json`. Публикация требует свежей синхронизации, отсутствия блокеров, успешного полного QA и минифицированной сборки. Исторические отчёты не заменяют эти проверки.

Проверка источников запланирована с целевым интервалом 40 минут. GitHub Actions может задерживать запуск; точный интервал не гарантирован. Открытое приложение также проверяет обновлённый снимок раз в 40 минут и после возврата в сеть. При ошибке публикации остаётся предыдущая версия.

Профиль, ФИО преподавателей, заметки, задачи и материалы сохраняются на прежнем устройстве и адресе сайта. Обновление не очищает эти данные. Перенос между устройствами, браузерами или доменами не происходит автоматически.

## Android

Этот выпуск — сайт и PWA. Старый ключ подписи APK утрачен; совместимое обновление установленного APK пока не опубликовано. Не удаляйте старое приложение до сохранения личных данных.

## Локально, без API/backend

```bash
npm run start:static
```

Открой `http://127.0.0.1:4173`. Эта команда запускает только статическую раздачу уже собранной папки `dist/`. Если нужно пересобрать приложение после изменения исходников: `npm install`, затем `npm run build:start:static`. Без npm можно запустить имеющуюся сборку напрямую: `node scripts/serve-static.mjs`. В любом случае API, Redis и `npm start` не нужны.

Static-режим показывает опубликованные источником курсы, потоки и группы, которые присутствуют в снимках. Непубликованные сочетания остаются пустыми с пометкой об отсутствии официального источника; приложение не подставляет расписание другой группы или курса.

## Публикация

Для GitHub Pages подготовлен workflow `.github/workflows/pages.yml`: перед сборкой он синхронизирует все опубликованные официальные расписания и пропускает релиз только после полного production gate и QA. URL Pages использует корень сайта без `/dist/`. Ветка релиза находится в PR #2; пока актуальная синхронизация официальных данных не проходит gate, сайт не развёрнут в production. Это не даёт показать студентам неполное или противоречивое расписание как готовое.

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

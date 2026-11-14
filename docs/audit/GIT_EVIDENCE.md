# Реальные коммиты и PR ЛР7–12

Срез исходников: `98a1be3a00d8327f44e62c38e9984410360a696b` в `codex/lab7-12-final-audit`. Всего предков HEAD: **211**, после `lab-6b/router-forms`: **147** уникальных коммитов. Последующие документальные коммиты не приписываются этому срезу.

Числовой минимум 40 суммарно за недели 9–15 превышен. Количество само по себе не доказывает осмысленность/распределение по учебным неделям: даты сохранены, пустые коммиты и искусственное переписывание истории не применяются.

| ЛР | Историческая ветка | SHA | Новых относительно предыдущей ветки |
|---|---|---|---|
| 7 | lab-7/fastapi | `0c8d984` | 3 (ancestor=True) |
| 8 | lab-8/postgresql-orm | `19bdbf2` | 3 (ancestor=True) |
| 9 | lab-9/jwt-auth | `2b1f5dd` | 2 (ancestor=True) |
| 10 | lab-10/fullstack | `3018cf2` | 2 (ancestor=True) |
| 11 | lab-11/docker | `13fcd07` | 4 (ancestor=True) |
| 12 | lab-12/deployment | `1065a49` | 17 (ancestor=True) |

Имена исторических веток сохранены; отдельные части SQL/ORM находятся в общей ветке ЛР8. Поздние доработки идут последовательными codex-ветками; они не означают переписывание исходной ЛР или merge PR.

## PR

| № | Ветка → база | Состояние |
|---|---|---|
| [8](https://github.com/shumakaro/booknest/pull/8) | lab-7/fastapi → lab-6b/router-forms | open; merged=False |
| [9](https://github.com/shumakaro/booknest/pull/9) | lab-8/postgresql-orm → lab-7/fastapi | open; merged=False |
| [10](https://github.com/shumakaro/booknest/pull/10) | lab-9/jwt-auth → lab-8/postgresql-orm | open; merged=False |
| [11](https://github.com/shumakaro/booknest/pull/11) | lab-10/fullstack → lab-9/jwt-auth | open; merged=False |
| [12](https://github.com/shumakaro/booknest/pull/12) | lab-11/docker → lab-10/fullstack | open; merged=False |
| [13](https://github.com/shumakaro/booknest/pull/13) | lab-12/deployment → lab-11/docker | open; merged=False |
| [14](https://github.com/shumakaro/booknest/pull/14) | codex/global-book-search → lab-12/deployment | open; merged=False |
| [15](https://github.com/shumakaro/booknest/pull/15) | codex/lab-reports-7-12 → codex/global-book-search | open; merged=False |
| [16](https://github.com/shumakaro/booknest/pull/16) | codex/book-card-polish → codex/lab-reports-7-12 | open; merged=False |
| [17](https://github.com/shumakaro/booknest/pull/17) | codex/loading-transitions → codex/book-card-polish | open; merged=False |
| [18](https://github.com/shumakaro/booknest/pull/18) | codex/catalog-search-filters → codex/loading-transitions | open; merged=False |
| [19](https://github.com/shumakaro/booknest/pull/19) | codex/book-details-import → codex/catalog-search-filters | open; merged=False |
| [20](https://github.com/shumakaro/booknest/pull/20) | codex/catalog-forms-crud → codex/book-details-import | open; merged=False |
| [21](https://github.com/shumakaro/booknest/pull/21) | codex/wishlist-usability → codex/catalog-forms-crud | open; merged=False |
| [22](https://github.com/shumakaro/booknest/pull/22) | codex/loans-history → codex/wishlist-usability | open; merged=False |
| [23](https://github.com/shumakaro/booknest/pull/23) | codex/auth-session-usability → codex/loans-history | open; merged=False |
| [24](https://github.com/shumakaro/booknest/pull/24) | codex/librarian-workspace → codex/auth-session-usability | open; merged=False |
| [25](https://github.com/shumakaro/booknest/pull/25) | codex/accessibility-feedback → codex/librarian-workspace | open; merged=False |
| [26](https://github.com/shumakaro/booknest/pull/26) | codex/api-contracts → codex/accessibility-feedback | open; merged=False |
| [27](https://github.com/shumakaro/booknest/pull/27) | codex/orm-measurements → codex/api-contracts | open; merged=False |
| [28](https://github.com/shumakaro/booknest/pull/28) | codex/security-regressions → codex/orm-measurements | open; merged=False |
| [29](https://github.com/shumakaro/booknest/pull/29) | codex/container-ci-reproducibility → codex/security-regressions | open; merged=False |
| [30](https://github.com/shumakaro/booknest/pull/30) | codex/neon-verification → codex/container-ci-reproducibility | open; merged=False |
| [31](https://github.com/shumakaro/booknest/pull/31) | codex/render-release-check → codex/neon-verification | open; merged=False |
| [32](https://github.com/shumakaro/booknest/pull/32) | codex/manual-acceptance-checklist → codex/render-release-check | open; merged=False |
| [33](https://github.com/shumakaro/booknest/pull/33) | codex/lab7-12-final-audit → codex/manual-acceptance-checklist | open; merged=False |

## Хронология после ЛР6

Файлы каждого коммита перечислены в git-evidence.json для последующего сопоставления с пунктами лабораторных. Таблица не выдает каждый документационный коммит за новую функцию.

| Коммит | Авторская дата | Сообщение |
|---|---|---|
| [1dc4d1c](https://github.com/shumakaro/booknest/commit/1dc4d1c0f44d6adfee542e541c2fb31f00691612) | 2026-11-06T11:43:56+05:00 | feat: реализован REST API книг и авторов на FastAPI |
| [2a8a4bc](https://github.com/shumakaro/booknest/commit/2a8a4bc275a734b5bf5704057569b6b83ebdbe8d) | 2026-11-06T11:48:02+05:00 | test: проверены контракты API и добавлены типы клиента из OpenAPI |
| [0c8d984](https://github.com/shumakaro/booknest/commit/0c8d9841d42407571a6f5111bf5f24bd292503cb) | 2026-11-06T11:50:26+05:00 | docs: подготовлены материалы недели 9 и отчёт по лабораторной №7 |
| [4870a42](https://github.com/shumakaro/booknest/commit/4870a42728533138e32a09d1a79c09b70d8e2d3a) | 2026-11-06T11:51:38+05:00 | feat: спроектирована схема PostgreSQL и подготовлены SQL-запросы |
| [0255f49](https://github.com/shumakaro/booknest/commit/0255f49a2aea753453bffde7963843f66b26858e) | 2026-11-06T12:50:14+05:00 | feat: API переведён на PostgreSQL с миграциями и транзакционной выдачей |
| [19bdbf2](https://github.com/shumakaro/booknest/commit/19bdbf2d594a41fef3da4076311d31bf180ad1cb) | 2026-11-06T13:51:58+05:00 | docs: завершены материалы недель 10–11 и сохранено восстановленное состояние |
| [f91c12c](https://github.com/shumakaro/booknest/commit/f91c12cb0c4c0b05872bf88f565b8099e025c425) | 2026-11-06T16:12:42+05:00 | feat: реализованы JWT роли и защищённые выдачи с клиентской авторизацией |
| [2b1f5dd](https://github.com/shumakaro/booknest/commit/2b1f5dd8c5f090704f9ec6bf8fc329778eb320be) | 2026-11-06T16:12:43+05:00 | docs: оформлены аудит безопасности и материалы недели 12 |
| [aa6a1c6](https://github.com/shumakaro/booknest/commit/aa6a1c61809b2915de5c38284640e87b8be2b8c3) | 2026-11-06T16:35:49+05:00 | feat: выполнена интеграция BookNest с собственным API и реальными формами |
| [3018cf2](https://github.com/shumakaro/booknest/commit/3018cf258a067a302c8a5c31d73a580e6bf81ac2) | 2026-11-06T16:36:57+05:00 | docs: обновлены воспроизводимый запуск и описание проверок Full Stack |
| [57f999c](https://github.com/shumakaro/booknest/commit/57f999cc45e5fb3243a7341e4d2b9610748fd9bb) | 2026-11-06T18:00:43+05:00 | feat: добавлены контейнеры BookNest и проверки CI |
| [7642852](https://github.com/shumakaro/booknest/commit/7642852b6058d58d6eb26ed723586183e02ee2dd) | 2026-11-06T18:00:44+05:00 | docs: оформлены диагностика Docker и материалы недели 14 |
| [54f7b5d](https://github.com/shumakaro/booknest/commit/54f7b5dfcc7b9b750567b6a5fca7f9ba12bb1a76) | 2026-11-06T18:16:44+05:00 | fix: устранена гонка ожидания e2e и уточнён контроль размера образов |
| [13fcd07](https://github.com/shumakaro/booknest/commit/13fcd07573b5a55c7c591638ea115432a6ede008) | 2026-11-06T18:36:49+05:00 | test: подтверждены контейнеры и сохранность данных в GitHub Actions |
| [92c16e5](https://github.com/shumakaro/booknest/commit/92c16e50ef95c31c750a3bd2fd85ad280ec399f2) | 2026-11-06T19:46:29+05:00 | feat: подготовлено безопасное развертывание и восстановление BookNest |
| [1c6e2fc](https://github.com/shumakaro/booknest/commit/1c6e2fc11587ed8e250082cdced40787a25ccd24) | 2026-11-06T19:57:42+05:00 | test: подтверждены резервное восстановление и защита прокси в CI |
| [fd199c9](https://github.com/shumakaro/booknest/commit/fd199c96c14c758711f72bb6aec64752f086d244) | 2026-11-06T20:35:12+05:00 | docs: проверены все страницы шести отчетов и исправлено оформление |
| [21f18fe](https://github.com/shumakaro/booknest/commit/21f18fe22743f2c9ed5b054e7bb68b3bdd650849) | 2026-11-10T18:52:08+05:00 | docs: выполнен аудит требований ЛР 7–12 и составлен план доработок |
| [abfd7de](https://github.com/shumakaro/booknest/commit/abfd7de8fe10604a57c803715a5aaf71988d0a92) | 2026-11-10T19:01:54+05:00 | feat: оформлены кремовая библиотека и адаптивные карточки с анимациями |
| [b8f7869](https://github.com/shumakaro/booknest/commit/b8f7869b5edba51371397789de239abcc415af08) | 2026-11-10T19:01:55+05:00 | feat: добавлены каркас загрузки и уведомления действий читателя |
| [fccd198](https://github.com/shumakaro/booknest/commit/fccd1988ea704100a8cf11d2d295d1ea3035d01a) | 2026-11-10T19:03:06+05:00 | test: проверены адаптивность темы и состояния нового интерфейса |
| [61ead29](https://github.com/shumakaro/booknest/commit/61ead29c003609057a054c201c975719462d1c6f) | 2026-11-10T19:14:04+05:00 | fix: разделены уведомления успеха и доступные ошибки выдачи |
| [82c9bc2](https://github.com/shumakaro/booknest/commit/82c9bc2b21c5ef4b7901d97ea29959ce4ce10ad6) | 2026-11-10T19:14:06+05:00 | fix: заблокированы повторные нажатия избранного во время записи |
| [b80720e](https://github.com/shumakaro/booknest/commit/b80720ea3c88b460b7616e76585609f32df1bb39) | 2026-11-10T19:15:31+05:00 | test: подтверждены реальные сценарии BookNest после редизайна |
| [018924a](https://github.com/shumakaro/booknest/commit/018924a1799f96a375e9ba83207b312825ae335f) | 2026-11-10T19:58:49+05:00 | feat: настроены Neon CLI и конфигурация существующего облачного проекта |
| [1674c84](https://github.com/shumakaro/booknest/commit/1674c84ac67a6cd4604da3727c5cb0be18e2aa79) | 2026-11-10T19:58:49+05:00 | feat: подключены pooled и direct URL Neon с изоляцией тестовой базы |
| [709d0b2](https://github.com/shumakaro/booknest/commit/709d0b2ff206bcb87b97bdf033260ff7e0f0cb12) | 2026-11-10T19:58:50+05:00 | test: подтверждена сквозная работа React FastAPI и Neon |
| [02384f4](https://github.com/shumakaro/booknest/commit/02384f49c374f5ab55205fe9d25ad8391b8b0606) | 2026-11-10T20:15:26+05:00 | feat: подготовлен единый Docker-образ React и FastAPI для Render |
| [496ec06](https://github.com/shumakaro/booknest/commit/496ec06023f3f75ecbbaddf7da0e59d5d0dd038f) | 2026-11-10T20:15:27+05:00 | test: добавлены проверки SPA origin и сквозной запуск Render-образа в CI |
| [d7a85e6](https://github.com/shumakaro/booknest/commit/d7a85e6d4d4f2689189742167dc6062f8d4278bc) | 2026-11-10T20:15:27+05:00 | docs: описаны настройки Render секреты и фактические проверки публикации |
| [1065a49](https://github.com/shumakaro/booknest/commit/1065a49d73230d302d2713b50e5c106bde0443a7) | 2026-11-10T20:21:40+05:00 | docs: сохранены успешные CI сборка и сквозные проверки Render-образа |
| [d943346](https://github.com/shumakaro/booknest/commit/d94334667b884d6d555848c211ff240c8497fe37) | 2026-11-10T21:00:23+05:00 | feat: добавлен независимый поиск Open Library через FastAPI с кэшем и таймаутами |
| [79a54a2](https://github.com/shumakaro/booknest/commit/79a54a2b9a0de33a641e393c8b53d0e8b510c357) | 2026-11-10T21:00:23+05:00 | feat: разделены библиотека и глобальный поиск с накоплением страниц и деталями |
| [d839813](https://github.com/shumakaro/booknest/commit/d839813242640f68044326a4c7652bb42bbe6d50) | 2026-11-10T21:00:24+05:00 | test: проверены поиск за первыми тридцатью книгами пагинация ошибки и возврат из деталей |
| [459b22a](https://github.com/shumakaro/booknest/commit/459b22a1e8af63170b195fc6f327ec77565c8b7a) | 2026-11-10T21:02:24+05:00 | docs: сохранены причины замены поиска реальные проверки и план второй части |
| [b817c3d](https://github.com/shumakaro/booknest/commit/b817c3d8ca033cc2344eb4b2c307643df40fd41d) | 2026-11-10T22:18:10+05:00 | feat: добавлен транзакционный импорт книг без дублей и безопасная миграция происхождения |
| [6a2d0da](https://github.com/shumakaro/booknest/commit/6a2d0daac94911aeb0dead552329ce1a5d5192ec) | 2026-11-10T22:18:11+05:00 | feat: добавлены форма импорта библиотекаря и обложки собственного каталога |
| [63b8fdd](https://github.com/shumakaro/booknest/commit/63b8fdd831634a7c3c47f751e7f9a5e2f4d2e070) | 2026-11-10T22:18:11+05:00 | test: подтверждены повтор импорта права доступа сохранность правок и миграция копии Neon |
| [41c5c57](https://github.com/shumakaro/booknest/commit/41c5c5710654d31a076b215f6bfa619cf1bcf942) | 2026-11-10T22:23:33+05:00 | feat: подготовлена защищенная замена учебных книг с проверенным восстановлением резервной копии |
| [064a0a2](https://github.com/shumakaro/booknest/commit/064a0a2a350462c896ce43715f17d97f2e523a0f) | 2026-11-10T23:46:19+05:00 | fix: включен инструмент обновления каталога в тестовый Docker-образ |
| [b952814](https://github.com/shumakaro/booknest/commit/b95281484abeadbd971dc3c0bf5a2272b1fc97c4) | 2026-11-10T23:53:04+05:00 | docs: подтверждены обновление Neon публикация Render и успешная приемка двух каталогов |
| [3b0392d](https://github.com/shumakaro/booknest/commit/3b0392d871754ca604c84fccda52346051b09d0c) | 2026-11-11T00:36:50+05:00 | docs: подготовлен подробный отчет ЛР 7 с практикой СРС и ответами |
| [c8f8527](https://github.com/shumakaro/booknest/commit/c8f85276dcd7efc981cc72b860a0161cffcfd6bf) | 2026-11-11T00:36:51+05:00 | docs: подготовлен подробный отчет ЛР 8 с практикой СРС и ответами |
| [cb4d605](https://github.com/shumakaro/booknest/commit/cb4d605d8db04cecf724f3e6884f23300a9089d4) | 2026-11-11T00:36:51+05:00 | docs: подготовлен подробный отчет ЛР 9 с практикой СРС и ответами |
| [4279aa8](https://github.com/shumakaro/booknest/commit/4279aa8bf57aa185bc08457b98e457bb8ef7408b) | 2026-11-11T00:36:52+05:00 | docs: подготовлен подробный отчет ЛР 10 с практикой СРС и ответами |
| [5b31605](https://github.com/shumakaro/booknest/commit/5b31605fe3e7e29a5c08ba7e160511801f494408) | 2026-11-11T00:36:53+05:00 | docs: подготовлен подробный отчет ЛР 11 с практикой СРС и ответами |
| [81c1bfc](https://github.com/shumakaro/booknest/commit/81c1bfc40671099836a393718c5b2123912d06a2) | 2026-11-11T00:36:54+05:00 | docs: подготовлен подробный отчет ЛР 12 с практикой СРС и ответами |
| [2ebe0c5](https://github.com/shumakaro/booknest/commit/2ebe0c5958545e85fbf199c9f4d552f8134544a4) | 2026-11-11T00:37:37+05:00 | docs: добавлены список скриншотов и проверка оформления шести отчетов |
| [86f1670](https://github.com/shumakaro/booknest/commit/86f16703d7d4d74b769c8f578e406880909b244a) | 2026-11-11T00:38:46+05:00 | docs: зафиксирована публикация отчетов и отдельный PR 15 |
| [f6a0abf](https://github.com/shumakaro/booknest/commit/f6a0abf70968c1d3d5c678bb81d729f495640891) | 2026-11-11T00:50:42+05:00 | feat: улучшены карточки книг эффекты фокус и отметки доступности |
| [5fed887](https://github.com/shumakaro/booknest/commit/5fed8874dfdd55fc546d4c19a204710e42c82cb9) | 2026-11-11T00:50:43+05:00 | test: проверены эффекты карточек адаптивность и сенсорное управление |
| [2078f64](https://github.com/shumakaro/booknest/commit/2078f64dd5683570be8cfee41a1cb06ef244cc29) | 2026-11-11T00:50:43+05:00 | docs: разделены семь этапов доработок и описан результат первого |
| [1c3dade](https://github.com/shumakaro/booknest/commit/1c3dadee71080768bbafd3745a9ab5770e0a4bb7) | 2026-11-11T00:51:47+05:00 | docs: сохранена ссылка на PR 16 первого этапа |
| [586ddb8](https://github.com/shumakaro/booknest/commit/586ddb83ffb1c3cc901d3b24902382c537f0e5b3) | 2026-11-11T01:03:11+05:00 | feat: добавлены плавное появление результатов и каркас загрузки ЛР10 |
| [ff13a25](https://github.com/shumakaro/booknest/commit/ff13a258df84199bf840e25296e1b439d4fa0bca) | 2026-11-11T01:03:12+05:00 | feat: улучшены подгрузка страниц и возврат к позиции глобального поиска |
| [2c5c892](https://github.com/shumakaro/booknest/commit/2c5c89281277b6ef71d672b3f825c9d334fc8ec6) | 2026-11-11T01:03:13+05:00 | test: проверены подгрузка анимации повтор ошибки и сохранение прокрутки |
| [9a9240c](https://github.com/shumakaro/booknest/commit/9a9240cfb0bd3139d7b2277e9d6bf996a39d9af7) | 2026-11-11T01:03:14+05:00 | docs: определены шестнадцать этапов только для лабораторных 7–12 |
| [21ce00c](https://github.com/shumakaro/booknest/commit/21ce00cb037ad8577fcfe4550f8c563cf36ffed3) | 2026-11-11T01:04:54+05:00 | docs: сохранены PR 17 и повторная проверка второго этапа |
| [6657e1b](https://github.com/shumakaro/booknest/commit/6657e1b184c2b2c7309888eba1fb298a4a2a881e) | 2026-11-11T01:26:12+05:00 | feat: добавлен поиск книг по автору с учетом русского регистра и пробелов |
| [135129f](https://github.com/shumakaro/booknest/commit/135129f920717aca839372d142ffd94031d4b54b) | 2026-11-11T01:26:13+05:00 | feat: добавлены метки фильтров проверка ссылок и диапазон результатов |
| [2e1b798](https://github.com/shumakaro/booknest/commit/2e1b7989e236b953790509a5e2d2bae5501bd793) | 2026-11-11T01:26:14+05:00 | fix: сохранен возврат из книги к фильтрам странице и прокрутке каталога |
| [ec95583](https://github.com/shumakaro/booknest/commit/ec9558393a0229b43321a457ac3084f500b218ba) | 2026-11-11T01:26:14+05:00 | test: проверены поиск автора пагинация фильтры и навигация каталога |
| [67aa858](https://github.com/shumakaro/booknest/commit/67aa858d998232770ae0b9329f7e478ae0a0cf4f) | 2026-11-11T01:26:15+05:00 | docs: описаны третий этап реальные проверки и ограничения поиска |
| [cf8c564](https://github.com/shumakaro/booknest/commit/cf8c564a619e7202a808f4079644488164e393f5) | 2026-11-11T01:28:00+05:00 | docs: сохранены PR 18 и завершение третьего этапа |
| [5f6af3a](https://github.com/shumakaro/booknest/commit/5f6af3a514672e404fcdf9386828f7606c2e1ae0) | 2026-11-11T01:49:40+05:00 | feat: оформлены страницы книг с обложками характеристиками и описанием |
| [3838e32](https://github.com/shumakaro/booknest/commit/3838e3254b95bd51576e61f74b849506d799a5a0) | 2026-11-11T01:49:41+05:00 | feat: добавлены предпросмотр импорта и защита повторной отправки |
| [02b9f03](https://github.com/shumakaro/booknest/commit/02b9f0314a43dfb64a7b6bafde26c92b363d9635) | 2026-11-11T01:49:42+05:00 | fix: исключена подмена деталей книги запоздавшим ответом после отмены |
| [2b04bc0](https://github.com/shumakaro/booknest/commit/2b04bc09a72f1dd425bc0cf2616f89e81a68311f) | 2026-11-11T01:49:43+05:00 | test: проверены детали роли ошибки импорта и сохранение серверных данных |
| [18c01c7](https://github.com/shumakaro/booknest/commit/18c01c7a72bada02d5592603b909ae69660e23c2) | 2026-11-11T01:49:44+05:00 | docs: описаны четвертый этап проверки и ограничения данных издания |
| [6625bbf](https://github.com/shumakaro/booknest/commit/6625bbfc71fd587158de5e7425a7685a8c8d4752) | 2026-11-11T01:51:11+05:00 | docs: сохранены PR 19 и завершение четвертого этапа |
| [8a5fa0c](https://github.com/shumakaro/booknest/commit/8a5fa0c9cfb1ad0e63dace51c5f83261ebbc68db) | 2026-11-11T09:28:31+05:00 | fix: разрешен пустой ISBN и сохранение только измененных полей книги |
| [6f40fb2](https://github.com/shumakaro/booknest/commit/6f40fb28b8248234865874a8c5abc5685c5f5cee) | 2026-11-11T09:28:32+05:00 | feat: улучшены формы книг подсказки фокус и подтверждение отмены удаления |
| [c5e7c95](https://github.com/shumakaro/booknest/commit/c5e7c95be58d30b61a881f6da3a0fffa2ce647f3) | 2026-11-11T09:28:33+05:00 | fix: выделен конфликт ISBN без ошибочной подмены других конфликтов |
| [bf121bf](https://github.com/shumakaro/booknest/commit/bf121bf25b5875bf0450f6027684d7f07786cc3b) | 2026-11-11T09:28:35+05:00 | test: проверены формы частичный PATCH ISBN и сохранение истории выдач |
| [5c6c5b0](https://github.com/shumakaro/booknest/commit/5c6c5b04aea318d54b5a3e350062d8062d34d9c5) | 2026-11-11T09:28:36+05:00 | docs: описаны пятый этап проверки и восстановление локальной тестовой среды |
| [8377de1](https://github.com/shumakaro/booknest/commit/8377de1f7aee739aad223add3ef3975d794c024d) | 2026-11-11T09:29:54+05:00 | docs: сохранены PR 20 и завершение пятого этапа |
| [9e63f03](https://github.com/shumakaro/booknest/commit/9e63f03ae451b7895f70235ecd942bf13e71836c) | 2026-11-11T09:46:24+05:00 | feat: добавлено личное желаемое в детали книги с откатом ошибок |
| [daa0573](https://github.com/shumakaro/booknest/commit/daa05739d713ccea7bc14c85d6a5ad0f41d2b6ad) | 2026-11-11T09:46:30+05:00 | feat: добавлены поиск сортировка и состояния списка желаемого |
| [abe3751](https://github.com/shumakaro/booknest/commit/abe3751aa19b5eae167fa156726367fc8f74783f) | 2026-11-11T09:46:36+05:00 | test: проверены страницы желаемого владение и откат изменений |
| [e9e171c](https://github.com/shumakaro/booknest/commit/e9e171ca7666dcd3f0da16d05ce5e8f2702711e8) | 2026-11-11T09:46:42+05:00 | docs: описаны доработки желаемого проверки и ограничения этапа 6 |
| [82951d5](https://github.com/shumakaro/booknest/commit/82951d5f390aea0d65f3a5918fbd7be48e88107e) | 2026-11-11T09:47:23+05:00 | docs: сохранены коммиты и PR 21 завершенного этапа желаемого |
| [c38598f](https://github.com/shumakaro/booknest/commit/c38598fb142277b16c2e1e07841fb2b68143db1c) | 2026-11-11T10:01:18+05:00 | feat: добавлены SQL-фильтры выдач и актуальное состояние под блокировкой |
| [017d74d](https://github.com/shumakaro/booknest/commit/017d74d8fde1da2573e3546ce92a6dad1064b48c) | 2026-11-11T10:01:24+05:00 | feat: разделены текущие выдачи просрочки и история возвратов |
| [ee54c18](https://github.com/shumakaro/booknest/commit/ee54c18c33631bcb0be122d337d5eee594661438) | 2026-11-11T10:01:31+05:00 | fix: защищена повторная выдача и сохранен возврат к списку выдач |
| [08280d8](https://github.com/shumakaro/booknest/commit/08280d88f42857fb849df5596c5168d80dbac78b) | 2026-11-11T10:01:38+05:00 | test: проверены сроки возвраты последняя копия и регрессии интерфейса |
| [688f190](https://github.com/shumakaro/booknest/commit/688f190882380583b4be9ea857312d79cec57d0c) | 2026-11-11T10:01:44+05:00 | docs: описаны изменения выдач результаты и ограничения этапа 7 |
| [9c7c784](https://github.com/shumakaro/booknest/commit/9c7c78433a8560bb0199c72a44f9f839cd3fd392) | 2026-11-11T10:03:06+05:00 | docs: сохранены коммиты PR 22 и условия обновления Render |
| [d3e8533](https://github.com/shumakaro/booknest/commit/d3e853316b60f0f4faae2512d7497595585ad9ab) | 2026-11-12T20:09:48+05:00 | fix: защищен сеанс от запоздавших ответов и повторов другого аккаунта |
| [4105719](https://github.com/shumakaro/booknest/commit/4105719177055398c9e3636aab570b6db71439fb) | 2026-11-12T20:09:55+05:00 | feat: улучшены формы входа регистрации и сохранение страницы назначения |
| [6e3bc52](https://github.com/shumakaro/booknest/commit/6e3bc528159f7cecbfae58d1f028baf3eac338a6) | 2026-11-12T20:10:03+05:00 | feat: показаны текущий пользователь и проверяемый выход из сеанса |
| [bb04dd3](https://github.com/shumakaro/booknest/commit/bb04dd39fd9ea8c74c2efb50319d9d48d78ee4f8) | 2026-11-12T20:10:12+05:00 | test: проверены гонки сеанса формы и регрессии личных действий |
| [038866d](https://github.com/shumakaro/booknest/commit/038866d45010f61d69b122eeb8b47324c7a6d1e7) | 2026-11-12T20:10:23+05:00 | docs: описаны результаты ограничения и возобновление этапа 8 |
| [3611951](https://github.com/shumakaro/booknest/commit/361195137720529f0d198b85d40c1d6aa2440772) | 2026-11-12T20:11:51+05:00 | docs: сохранены PR 23 и завершение восьмого этапа |
| [8bdaa23](https://github.com/shumakaro/booknest/commit/8bdaa23aa2a456f95b2d96505599705c48e4b4fe) | 2026-11-12T20:25:46+05:00 | feat: добавлено защищенное чтение журнала каталога с пагинацией |
| [62957c4](https://github.com/shumakaro/booknest/commit/62957c45ba3791ff65ec02980272941aab588d81) | 2026-11-12T20:25:56+05:00 | feat: создано рабочее место библиотекаря с журналом и переходами |
| [3019fbc](https://github.com/shumakaro/booknest/commit/3019fbc9c2df606ec5c129e3f814bc7780a80d62) | 2026-11-12T20:26:05+05:00 | feat: добавлены навигация библиотекаря и понятный запрет доступа |
| [1fd0e90](https://github.com/shumakaro/booknest/commit/1fd0e90a0b3f7fb3d14af537931c6121b8284cec) | 2026-11-12T20:26:14+05:00 | test: проверены права чтение журнала страницы и регрессии действий |
| [3719dc1](https://github.com/shumakaro/booknest/commit/3719dc19a70e1d960462ad69f14e2f548e3812e5) | 2026-11-12T20:26:23+05:00 | docs: описаны рабочее место журнал и результаты девятого этапа |
| [5052471](https://github.com/shumakaro/booknest/commit/50524717b6b835afe205052f832377a534d60cef) | 2026-11-12T20:27:57+05:00 | docs: сохранены PR 24 и завершение девятого этапа |
| [ecce463](https://github.com/shumakaro/booknest/commit/ecce463486fc148ee6e1f508d9c7f02f8121c698) | 2026-11-12T20:38:42+05:00 | docs: закреплен порядок Neon Render скриншоты и отчеты в последнюю очередь |
| [63b27cc](https://github.com/shumakaro/booknest/commit/63b27cce5813ac174b15e5d390b9050ec5487874) | 2026-11-12T20:38:52+05:00 | feat: добавлены названия страниц и клавиатурный фокус без потери прокрутки |
| [f1a905c](https://github.com/shumakaro/booknest/commit/f1a905cfe9effda217043fbf43196d1fb2dd337e) | 2026-11-12T20:39:00+05:00 | fix: сохранены уведомления при чтении и фокус после закрытия |
| [4855868](https://github.com/shumakaro/booknest/commit/4855868b717edefbaad79f46355c6d8c5f678ac4) | 2026-11-12T20:39:08+05:00 | test: проверены фокус уведомления контраст и регрессии интерфейса |
| [cf1fcbf](https://github.com/shumakaro/booknest/commit/cf1fcbf1f2bea7fa57e022b88899e31c8795d255) | 2026-11-12T20:39:17+05:00 | docs: описаны проверки доступности и оставшаяся ручная приемка |
| [7909922](https://github.com/shumakaro/booknest/commit/7909922855e39b0da6ca11d1e856cc21af5e806f) | 2026-11-12T20:40:34+05:00 | docs: сохранены PR 25 и завершение десятого этапа |
| [7a402fa](https://github.com/shumakaro/booknest/commit/7a402fa46bc021f868e727f29f0449ff673b67ab) | 2026-11-12T20:53:42+05:00 | fix: согласованы схемы PATCH и безопасных ошибок с поведением API |
| [c3839a8](https://github.com/shumakaro/booknest/commit/c3839a83a69ccaa33b836918f461a3bf3eee021c) | 2026-11-12T20:53:50+05:00 | fix: описан выход без обязательного access в OpenAPI |
| [41fdfe3](https://github.com/shumakaro/booknest/commit/41fdfe39a67ff52aac7638968642fb328d74b9c4) | 2026-11-12T20:54:00+05:00 | feat: добавлены актуальный контракт и проверка типов без перезаписи |
| [9e8c1cc](https://github.com/shumakaro/booknest/commit/9e8c1cc2182dddcb1922da2d5aca2dc513e6ce93) | 2026-11-12T20:54:09+05:00 | test: проверены дрейф контракта ошибки заголовки и правила PATCH |
| [5911e6d](https://github.com/shumakaro/booknest/commit/5911e6da60919ef7e868b5c11065473ed1a0469c) | 2026-11-12T20:54:17+05:00 | docs: описаны контракты API генерация и результаты этапа 11 |
| [ca4fe2c](https://github.com/shumakaro/booknest/commit/ca4fe2cc43cac83e66c9bf3cc376efbf98bca1d0) | 2026-11-12T20:55:51+05:00 | docs: сохранены PR 26 и завершение этапа контрактов API |
| [f9440f8](https://github.com/shumakaro/booknest/commit/f9440f862222ab8ffedb0d649bcca4090bca0045) | 2026-11-12T21:07:14+05:00 | fix: согласованы ограничения модели книги с существующей миграцией |
| [c43442f](https://github.com/shumakaro/booknest/commit/c43442f73ce1ce6abe1702ae41b99f8a5b88d694) | 2026-11-12T21:07:23+05:00 | feat: добавлено безопасное измерение ORM с откатом тестовых данных |
| [969fbc8](https://github.com/shumakaro/booknest/commit/969fbc8632535975039f80ad72ef0ece24791d33) | 2026-11-12T21:07:33+05:00 | feat: добавлена проверка metadata без применения миграций |
| [47db00b](https://github.com/shumakaro/booknest/commit/47db00b9285d16c51d540d9f56a55aa28fcdaf39) | 2026-11-12T21:07:42+05:00 | test: проверены N+1 бюджеты запросов ограничения и безопасность стенда |
| [4df8c6e](https://github.com/shumakaro/booknest/commit/4df8c6efbaff79ccb764b9256cdad9eaba4667d4) | 2026-11-12T21:08:48+05:00 | docs: сохранены измерения ORM и порядок начала работы с Neon |
| [d9737c5](https://github.com/shumakaro/booknest/commit/d9737c5a1d371b2abab1e584da30dff2911d1c94) | 2026-11-12T21:09:39+05:00 | docs: сохранены PR 27 и завершение локальных ORM-проверок |
| [4779749](https://github.com/shumakaro/booknest/commit/4779749172a5806967a39f118a8a3fe91d35f540) | 2026-11-12T21:20:50+05:00 | fix: выключен вывод учебного токена в обычные журналы |
| [56058e1](https://github.com/shumakaro/booknest/commit/56058e1e7efca8c2493bebea4f9f65d12b1bb00c) | 2026-11-12T21:20:58+05:00 | fix: защищены Origin входа и кэширование личных ответов |
| [69c0415](https://github.com/shumakaro/booknest/commit/69c04150f6be4817e814c5d21b6ce02e0a176b15) | 2026-11-12T21:21:06+05:00 | fix: отделен повтор желаемого от неизвестных конфликтов данных |
| [8bdac16](https://github.com/shumakaro/booknest/commit/8bdac16f4b47ad95f3450fbd4d17831c997c59f0) | 2026-11-12T21:21:17+05:00 | test: проверены cookie отзыв роли журналирование и конфликты |
| [a246f6b](https://github.com/shumakaro/booknest/commit/a246f6b75116b7ec92059839f8ee3e75d6a3528e) | 2026-11-12T21:21:25+05:00 | docs: описаны исправления безопасности и оставшиеся проверки |
| [8c005d6](https://github.com/shumakaro/booknest/commit/8c005d6ba4bc986e94782d6748c65b024bdb0fa9) | 2026-11-12T21:22:47+05:00 | docs: сохранены PR 28 и результаты этапа безопасности |
| [344d302](https://github.com/shumakaro/booknest/commit/344d3021cb4bf9b786deabb647a80c362afaf789) | 2026-11-12T21:46:10+05:00 | fix: включены контрактные зависимости в test-образ без утечки в runtime |
| [58cb2dd](https://github.com/shumakaro/booknest/commit/58cb2dd16753c2891953ecce60f483d31c30eb49) | 2026-11-12T21:46:18+05:00 | test: усилены проверки SPA статики кэша и возврата книги |
| [9315652](https://github.com/shumakaro/booknest/commit/9315652a05cfa5f02ffb7afbb751724280192e83) | 2026-11-12T21:46:26+05:00 | feat: добавлена изолированная конфигурация стенда без перезаписи |
| [dc1bb23](https://github.com/shumakaro/booknest/commit/dc1bb23195bf7f45c7b15c9362aacf2a3a9e0a9d) | 2026-11-12T21:46:35+05:00 | ci: добавлены проверка API артефакты и изоляция контейнерного прогона |
| [4c8bf1e](https://github.com/shumakaro/booknest/commit/4c8bf1e8f13e16156acf1cade96a7c556d6b276e) | 2026-11-12T21:46:44+05:00 | docs: описаны контейнерный стенд и ожидающая проверка CI |
| [c21b1da](https://github.com/shumakaro/booknest/commit/c21b1da396962fd1e39a88698b16d0e497906882) | 2026-11-12T23:38:32+05:00 | docs: сохранены успешный CI PR 29 и завершение этапа Docker |
| [18198fb](https://github.com/shumakaro/booknest/commit/18198fb3551bf5a64583a765ffd652f26d62c3d0) | 2026-11-14T11:19:49+05:00 | feat: добавлен безопасный аудит Neon и тесты защиты отчета |
| [d4f63b3](https://github.com/shumakaro/booknest/commit/d4f63b3c18fa0d9c10782e5cc3528632a2f13647) | 2026-11-14T11:19:58+05:00 | docs: сохранены реальные результаты Neon и порядок безопасных миграций |
| [07ac0d7](https://github.com/shumakaro/booknest/commit/07ac0d71c1b4fe043d9a076ec33cc177f31c1257) | 2026-11-14T11:20:10+05:00 | docs: уточнены прогресс Neon и этапы подготовки учебных материалов |
| [2841e05](https://github.com/shumakaro/booknest/commit/2841e055461fd1f06d1567e7c76e9033447093b4) | 2026-11-14T11:21:59+05:00 | docs: зафиксированы PR 30 и проверки после возобновления работы |
| [1eb0eb9](https://github.com/shumakaro/booknest/commit/1eb0eb934a82ca0671a93dfd625f8548cb8a8492) | 2026-11-14T11:44:43+05:00 | fix: включен аудитор Neon в тестовый Docker-образ |
| [7952b97](https://github.com/shumakaro/booknest/commit/7952b97c90cad9505108d626f132483df2c48718) | 2026-11-14T11:51:55+05:00 | docs: подготовлены проверка Render и безопасный план ручного обновления |
| [e904e1b](https://github.com/shumakaro/booknest/commit/e904e1b97a383af06f7532e4dde3eca1efb49fbc) | 2026-11-14T11:52:05+05:00 | docs: отражены сбой CI и результаты подготовки Render |
| [2e0502b](https://github.com/shumakaro/booknest/commit/2e0502be76541cb32c96d0fbb051197f9024c0d5) | 2026-11-14T12:09:04+05:00 | docs: подтверждены успешный CI и точный коммит для обновления Render |
| [daf6f5c](https://github.com/shumakaro/booknest/commit/daf6f5c081d08913bd516ba3bf4d47d256551ed3) | 2026-11-14T12:58:38+05:00 | test: сохранены публичные проверки после обновления Render |
| [39b1f44](https://github.com/shumakaro/booknest/commit/39b1f44b6c4900aa57eaeade5376a776dd2afafc) | 2026-11-14T12:58:52+05:00 | docs: подтвержден Live и выделены оставшиеся проверки для скриншотов |
| [860d3b6](https://github.com/shumakaro/booknest/commit/860d3b69c347650e3da685fb680ffe33cfddab32) | 2026-11-14T13:22:45+05:00 | docs: подготовлен полный список ручных проверок и скриншотов ЛР7–12 |
| [bad7831](https://github.com/shumakaro/booknest/commit/bad7831fa0cbe6e2b1a020f5217e7994fda757b2) | 2026-11-14T13:22:54+05:00 | docs: отмечено ожидание ручной приемки и пользовательского DOCX |
| [efa73a7](https://github.com/shumakaro/booknest/commit/efa73a717beb7351147d0bd5c3ff5f2c38c6e297) | 2026-11-14T13:35:26+05:00 | docs: сохранена ссылка на PR 32 ручной приемки |
| [72ac051](https://github.com/shumakaro/booknest/commit/72ac0514518199a3872aad77d55b747fe0099646) | 2026-11-14T13:46:23+05:00 | fix: добавлены кэш сборки gzip и защитные заголовки Render |
| [2c51bb7](https://github.com/shumakaro/booknest/commit/2c51bb79b52f84f14be1a36c1c545e7b927d22c8) | 2026-11-14T13:46:35+05:00 | test: расширены контейнерные проверки сжатия кэша и отказов доступа |
| [7a7370c](https://github.com/shumakaro/booknest/commit/7a7370c74bc2f5d7758208704f0bbf5979deb66c) | 2026-11-14T14:10:55+05:00 | fix: дополнены аннотации функций backend без изменения контракта API |
| [6110133](https://github.com/shumakaro/booknest/commit/6110133a97833969a91b30270db12f0655213e47) | 2026-11-14T14:11:03+05:00 | feat: добавлена защищенная копия Neon с проверкой нового локального восстановления |
| [98a1be3](https://github.com/shumakaro/booknest/commit/98a1be3a00d8327f44e62c38e9984410360a696b) | 2026-11-14T15:21:58+05:00 | fix: проверены версии PostgreSQL и восстановление приватного дампа без очистки схемы |

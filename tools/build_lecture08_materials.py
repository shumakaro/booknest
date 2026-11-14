"""Материалы лекции 8: исходные вопросы, объяснения и реальные ссылки на BookNest."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/lectures"
OUT.mkdir(parents=True, exist_ok=True)
source = json.loads((ROOT / "docs/course/odt/lectures.json").read_text(encoding="utf-8"))
questions = [r for r in source["units"]["8"] if 166 <= r["paragraph"] <= 175]

# Ответы опираются на действующий интегрированный клиент ЛР10.
# Исторические ветки ЛР1-6 не меняются и не выдаются за новый этап.
ANSWERS = [
    {
        "answer": "Обычная ссылка a выполняет стандартную навигацию браузера и может загрузить документ заново. Для внутренних экранов SPA Link передает переход клиентскому роутеру: меняется адрес и отображаемая страница. Это сохраняет оболочку приложения. Запрет в вопросе относится к внутренним переходам: обычная ссылка остается уместной для внешнего сайта, скачивания или намеренной полной загрузки. При прямом открытии URL сервер все равно должен вернуть оболочку SPA.",
        "booknest": "В NotFoundPage переход назад реализован Link to=/books. AppLayout использует NavLink и отмечает активный раздел. Раздача прямых ссылок в Compose и Render настроена отдельно от React Router.",
        "oral": "Внутренние переходы выполняются через Link. Обычный a может перезагрузить документ. Для внешних ссылок обычный a допустим.",
        "refs": [("react-app/src/pages/not-found/NotFoundPage.tsx", "export function NotFoundPage"), ("react-app/src/shared/layout/AppLayout.tsx", "export function AppLayout")],
        "demo": "Открыть неизвестный путь, нажать «Вернуться в каталог» и проверить /books. Прямую перезагрузку проверять отдельно: компонентный тест не подтверждает конфигурацию публичного сервера.",
        "sources": ["router_navigation"],
    },
    {
        "answer": "Общий макет становится родительским элементом группы маршрутов. В нем размещаются постоянные части интерфейса, а Outlet задает место дочерней страницы. При переходе между дочерними URL оболочка сохраняется, а содержимое Outlet меняется. Вложенная проверка доступа может иметь свой Outlet, пропуская только разрешенные дочерние маршруты.",
        "booknest": "AppRouter оборачивает страницы родительским Route с AppLayout. В AppLayout остаются навигация и уведомления. Внутри этой группы RequireAuth отдельно ограничивает личные страницы и действия библиотекаря.",
        "oral": "Макет является родителем маршрутов. Дочерняя страница выводится в Outlet. Шапка и навигация остаются общими.",
        "refs": [("react-app/src/app/router/AppRouter.tsx", "export function AppRouter"), ("react-app/src/shared/layout/AppLayout.tsx", "export function AppLayout")],
        "demo": "Перейти из каталога на 404 и обратно. Показать общий AppLayout и место Outlet в исходнике.",
        "sources": ["router_routing"],
    },
    {
        "answer": "В URL помещается состояние, которое должно восстановиться по ссылке: поисковый запрос и номер страницы являются двумя примерами. В компоненте можно хранить локальное временное состояние: раскрытие меню и индикатор отправки. Критерий выбора состоит в том, должна ли другая вкладка открыть тот же результат. Смена фильтра обычно сбрасывает страницу, а неверные параметры нормализуются перед запросом.",
        "booknest": "BooksPage читает q, sort, genre, available и page через useSearchParams и catalogFilters. LoansPage хранит state и page в URL. Состояния loading и pending остаются локальными и не превращаются в параметры ссылки.",
        "oral": "Поиск и страница сохраняются в URL. Открытое меню и отправка остаются внутри компонента. Тогда скопированная ссылка восстанавливает существенное состояние.",
        "refs": [("react-app/src/pages/books/BooksPage.tsx", "export function BooksPage"), ("react-app/src/pages/loans/LoansPage.tsx", "export function LoansPage")],
        "demo": "Использовать /loans?state=returned&page=2 в тестовой сессии и проверить выбранный фильтр. Другой пользователь увидит свои записи: одинаковый URL не отменяет серверную проверку владельца.",
        "sources": ["router_url"],
    },
    {
        "answer": "Для выбранного маршрута результат содержит bookId со строковым значением '42'. useParams не преобразует его в число и не подтверждает наличие книги. В BookNest строковый ID передается API-адаптеру и кодируется как сегмент URL. На стороне FastAPI числовой параметр проверяется отдельно. Неверный формат и отсутствующая запись являются разными случаями: валидация и 404.",
        "booknest": "BookFormPage получает bookId из useParams и по его наличию выбирает режим. getBookDetailsById принимает string. Новый RoutingAcceptance.test проверяет настоящий AppRouter на /books/42 и передачу строкового ID странице деталей.",
        "oral": "bookId будет строкой '42'. Роутер не проверяет существование записи. Тип и наличие ресурса проверяются следующими слоями.",
        "refs": [("react-app/src/pages/books/BookFormPage.tsx", "export function BookFormPage"), ("react-app/src/api/books.ts", "export async function getBookDetailsById")],
        "demo": "Открыть тест прямой ссылки, затем BookFormPage и API-адаптер. Не утверждать, что запись 42 существует в production.",
        "sources": ["router_url"],
    },
    {
        "answer": "HTML-ограничения дают простую браузерную проверку, схема Zod проверяет форму и межполевые правила до запроса, а сервер проверяет данные независимо от клиента. Первые два уровня улучшают обратную связь; серверный уровень обязателен, поскольку запрос можно отправить напрямую. В BookNest нативные required/type=email применяются в форме входа. У BookForm задан noValidate: всплывающая проверка браузера отключена, сообщения ведет Zod. Поэтому нельзя утверждать, что все три механизма одновременно блокируют отправку именно этой формы.",
        "booknest": "bookSchema проверяет поля и соотношение годов. saveBook отправляет значения, а Pydantic и CatalogService заново проверяют их. Серверный PATCH проверяет итоговую запись после объединения со старыми полями, а не доверяет dirtyFields клиента.",
        "oral": "HTML и Zod помогают пользователю исправить ввод. Сервер повторяет проверку независимо от браузера. У формы книги noValidate оставляет клиентские сообщения под управлением Zod.",
        "refs": [("react-app/src/features/books/bookSchema.ts", "export const bookSchema"), ("react-app/src/features/books/components/BookForm.tsx", "export function BookForm"), ("app/services/catalog.py", "    def save(")],
        "demo": "Сравнить нативные атрибуты LoginPage и noValidate BookForm. Показать тест, где невалидная форма не вызывает saveBook, и серверную схему.",
        "sources": ["mdn_validation", "zod_basics"],
    },
    {
        "answer": "Ответ 422 разбирается по пути поля в loc и сообщению msg. Последний сегмент пути сопоставляется с именем поля интерфейса, после чего setError добавляет сообщение. Неизвестная ошибка должна остаться общей ошибкой формы, а введенные данные сохраняются. Учебный пример ожидает исходный detail; текущий BookNest возвращает единый details. Эти форматы нельзя механически смешивать.",
        "booknest": "readError получает массив body.details. saveBook переводит year в publicationYear, edition_year в editionYear, author_id в author и total_copies в totalCopies. BookForm вызывает setError для известных полей и переносит фокус; 409 ISBN показывается у isbn. Тесты проверяют и неизвестную ошибку без потери введенного.",
        "oral": "Путь ошибки сервера переводится в имя поля формы. Сообщение передается через setError. Если поле неизвестно, показывается общая ошибка без потери ввода.",
        "refs": [("react-app/src/api/bookForm.ts", "export async function saveBook"), ("react-app/src/features/books/components/BookForm.tsx", "export function BookForm"), ("react-app/src/api/client.ts", "async function readError")],
        "demo": "Открыть BookFormApi.test.ts и BookForm.test.tsx. Для визуального кадра использовать тестовый ответ, не повреждая рабочие записи.",
        "sources": ["rhf_useform"],
    },
    {
        "answer": "При контролируемом вводе значение задается React-состоянием, а onChange обновляет его. При неконтролируемом вводе текущее значение хранит DOM. React Hook Form может регистрировать обычные поля через ref и подписывать компоненты на нужные части состояния формы. Поэтому не требуется отдельно менять родительский useState на каждый символ. Controller используется для компонентов, которым нужен контролируемый интерфейс. Число перерисовок зависит от подписок: без измерения нельзя обещать отсутствие всех перерисовок.",
        "booknest": "BookForm применяет register и useForm, а тип BookFormValues выводится из bookSchema. Отдельные useState используются для общей ошибки и сохранения, а не для значения каждого текстового поля. Явный mode не указан, поэтому начальная проверка идет в стандартном режиме onSubmit, а не onBlur.",
        "oral": "Контролируемое значение хранится в React-состоянии. Неконтролируемое значение хранит DOM. React Hook Form позволяет не обновлять родителя вручную на каждый символ.",
        "refs": [("react-app/src/features/books/components/BookForm.tsx", "export function BookForm"), ("react-app/src/features/books/bookSchema.ts", "export type BookFormValues")],
        "demo": "Показать register и отсутствие useState для каждого поля. Требование onBlur и полную форму выдачи оставить в перечне практики 8.",
        "sources": ["rhf_useform", "zod_basics"],
    },
    {
        "answer": "На время запроса блокируются отправка и редактирование полей, а пользователь видит состояние ожидания. Дополнительный синхронный флаг защищает от второго события до обновления React-состояния. После завершения запроса блокировка снимается в finally. На сервере остаются собственные ограничения и транзакции: выключенная кнопка не обеспечивает уникальность или однократность всех сетевых запросов.",
        "booknest": "BookForm объединяет saving и isSubmitting в busy. Fieldset disabled блокирует вложенную кнопку, а lock.current не допускает повторного saveBook. Тест незавершенного Promise проверяет отключение поля и кнопки и ровно один вызов сохранения.",
        "oral": "Во время запроса кнопка и поля блокируются. Синхронный lock закрывает окно до перерисовки. Сервер все равно проверяет свои ограничения.",
        "refs": [("react-app/src/features/books/components/BookForm.tsx", "export function BookForm"), ("react-app/src/tests/BookForm.test.tsx", "it('блокирует поля")],
        "demo": "Показать тест с незавершенным Promise и его проверку вызовов. Не отправлять повторные POST в production ради демонстрации.",
        "sources": [],
    },
    {
        "answer": "Защищенный маршрут решает, какой интерфейс показать при текущем состоянии сеанса. Гость направляется ко входу, а роль может ограничить форму библиотекаря. Однако пользователь может обойти интерфейс и отправить HTTP-запрос напрямую. Поэтому сервер проверяет токен, роль и владельца ресурса независимо от React. Ожидание восстановления сеанса также отделяется от состояния гостя.",
        "booknest": "RequireAuth показывает Spinner при loading, сохраняет location в state.from для гостя и выводит отказ при неподходящей роли. Сервер использует get_current_user, require_role и get_own_loan. Новые тесты AppRouter проверяют прямое открытие /books/new гостем и читателем.",
        "oral": "RequireAuth управляет доступными экранами. Сервер не доверяет результату этой проверки. Токен, роль и владелец проверяются на backend независимо.",
        "refs": [("react-app/src/app/router/RequireAuth.tsx", "export function RequireAuth"), ("app/core/auth.py", "def get_own_loan")],
        "demo": "Показать два теста прямого открытия формы. Серверные 401/403/404 подтверждать отдельными API-тестами, а не наличием скрытой кнопки.",
        "sources": [],
    },
    {
        "answer": "Правило курса задает направление pages → features → shared → api и запрещает обратный импорт shared → features. app собирает роутер и провайдеры; pages связывают сценарии, features содержат предметное поведение, а shared должен оставаться общим. В проекте сохранились также components и lib. Текущая структура не полностью следует строгой схеме: AppLayout в shared импортирует RouteAccessibility из features и useAuth/useTheme из app. Такой макет фактически зависит от приложения; это технический долг, а не пример чистого shared.",
        "booknest": "Разделение HTTP и интерфейса уже есть: сетевые вызовы размещены в api, правила формы в bookSchema, экран собирается в BookFormPage. Для дальнейшей очистки AppLayout следует рассматривать как композицию app, сохраняя поведение и исторические ветки. Автоматического запрета обратных импортов в ESLint сейчас нет, поэтому успешный lint не доказывает соблюдение всей архитектуры.",
        "oral": "Страницы связывают сценарии, features содержат функции, shared содержит общее. Обратные зависимости следует ограничивать. В текущем макете есть конкретный долг, который обозначен явно.",
        "refs": [("react-app/src/shared/layout/AppLayout.tsx", "export function AppLayout"), ("react-app/src/pages/books/BookFormPage.tsx", "export function BookFormPage"), ("react-app/src/api/bookForm.ts", "export async function saveBook")],
        "demo": "Открыть импорты AppLayout и показать фактическое направление. Не представлять схему каталогов как доказательство отсутствия обратных зависимостей.",
        "sources": [],
    },
]

SOURCES = {
    "router_routing": ("React Router 7.18.4 Routing", "https://reactrouter.com/7.18.4/start/declarative/routing"),
    "router_navigation": ("React Router 7.18.4 Navigating", "https://reactrouter.com/7.18.4/start/declarative/navigating"),
    "router_url": ("React Router 7.18.4 URL Values", "https://reactrouter.com/7.18.4/start/declarative/url-values"),
    "rhf_useform": ("React Hook Form useForm", "https://react-hook-form.com/docs/useform"),
    "zod_basics": ("Zod Basic usage", "https://zod.dev/basics"),
    "mdn_validation": ("MDN Client-side form validation", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation"),
}


def reference(path: str, marker: str) -> dict:
    text = (ROOT / path).read_text(encoding="utf-8-sig")
    position = text.index(marker)
    return {"path": path, "line": text[:position].count("\n") + 1, "marker": marker}


records = []
for index, (question, answer) in enumerate(zip(questions, ANSWERS, strict=True), 1):
    records.append({
        "id": f"L08-Q{index:02}", "number": index, "question": question["text"],
        "source_paragraph": question["paragraph"],
        **{key: value for key, value in answer.items() if key != "refs"},
        "refs": [reference(*item) for item in answer["refs"]],
    })
payload = {
    "lecture": 8, "title": source["units"]["8"][1]["text"], "date": "2026-11-14",
    "source": "веблекц.odt", "source_sha256": source["sha256"],
    "application_baseline": "f9b1c8c", "questions": records, "sources": SOURCES,
    "practical_limitations": [
        "Форма книги не заменяет требуемую в практике 8 форму выдачи с двумя датами.",
        "Защита несохраненных данных через confirm не закрывает все переходы history.",
        "Макет в shared имеет обратные зависимости; это отмеченный технический долг.",
        "Браузерная ручная приемка и личная демонстрация компетенций еще не выполнены.",
    ],
}
(OUT / "lecture-08.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
# Совместимость с прежним набором ответов: сохраняются все существующие ключи.
legacy_path = ROOT / "docs/course/lecture-answers.json"
legacy = json.loads(legacy_path.read_text(encoding="utf-8-sig"))
legacy["8"] = [r["answer"] + " " + r["booknest"] for r in records]
legacy_path.write_text(json.dumps(legacy, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

md = [
    "# Лекция 8 Маршрутизация формы и архитектура", "",
    "Материалы по текущему интегрированному BookNest, 14 ноября 2026.",
    "Вопросы и их номера сохранены из веблекц.odt, абзацы 166-175.",
    "Исторические ЛР1-6 не меняются; примеры относятся к состоянию после ЛР7-12.",
    "Это текстовая основа будущего отчета. Новый итоговый DOCX до получения скриншотов не формируется.",
    "", "## Цель и основные понятия", "",
    "В лекции рассматриваются вложенные маршруты, layout и Outlet, параметры пути, состояние URL, формы, схемная валидация, полевые ошибки и границы ответственности клиента.",
    "Цель состоит в том, чтобы объяснить, как путь приводит к странице, как данные проходят от формы к API и какие проверки выполняются на каждом уровне.",
    "", "## Сквозной путь запроса", "",
    "При прямом открытии /loans браузер разрешает имя сервиса, устанавливает HTTPS-соединение и получает HTML оболочки SPA. На Render оболочку возвращает app/render.py; в Compose эту роль выполняет Nginx. React Router выбирает страницу, RequireAuth проверяет состояние сеанса, LoansPage читает фильтр URL и вызывает apiFetch. Запрос /api/v1/loans получает FastAPI, который проверяет токен и владельца и обращается через репозиторий к PostgreSQL. JSON возвращается клиенту и обновляет интерфейс. Это описание архитектуры, а не новый полный production-прогон.",
    "Статическая страница отдает готовое содержимое без клиентской маршрутизации, SPA выбирает экран на клиенте, SSR формирует HTML экрана на сервере. BookNest использует SPA; наличие FastAPI за тем же адресом не превращает его в SSR.",
    "", "## Разбор практических примеров", "",
    "Ссылка на каталог сохраняет q/page и фильтры. Личная страница /loans сохраняет state/page и получает записи, разрешенные текущему пользователю. Копирование URL не дает доступ к чужим выдачам.",
    "Форма книги имеет два режима. Она сохраняет ошибочный ввод, связывает серверную ошибку с полем и блокирует повтор запроса. Полная форма выдачи из учебного примера относится к отдельной доработке практики 8.",
    "Кодовые фрагменты лекции разобраны в docs/audit/source-code-review.md. Они сокращены и не копируются как готовые самостоятельные модули.",
    "", "## Фрагменты действующего кода", "",
]
for path, marker, count in [
    ("react-app/src/pages/loans/LoansPage.tsx", "  const [params, setParams]", 5),
    ("react-app/src/features/books/components/BookForm.tsx", "  const { register, handleSubmit", 3),
]:
    lines = (ROOT / path).read_text(encoding="utf-8-sig").splitlines()
    begin = next(i for i, line in enumerate(lines) if marker in line)
    md += [f"Фрагмент {path}, строки {begin + 1}-{begin + count}. Импорты и окружение находятся в исходном файле.",
           "", "~~~tsx", *lines[begin:begin + count], "~~~", ""]
md += ["## Контрольные вопросы и ответы", ""]
for r in records:
    question = r["question"].replace("<", "&lt;").replace(">", "&gt;")
    md += [f"### Вопрос {r['number']}", "", question, "",
           "**Полный ответ.** " + r["answer"], "", "**BookNest.** " + r["booknest"], "",
           "**Код.** " + "; ".join(f"[{x['path']}:{x['line']}](../../{x['path']}#L{x['line']})" for x in r["refs"]), "",
           "**Краткий ответ.** " + r["oral"], "", "**Демонстрация.** " + r["demo"], ""]
    if r["sources"]:
        md += ["**Документация.** " + ", ".join(f"[{SOURCES[k][0]}]({SOURCES[k][1]})" for k in r["sources"]), ""]
md += [
    "## Домашнее задание", "",
    "| Пункт исходника | Реализация и подтверждение |",
    "| --- | --- |",
    "| 1 Личная страница и фильтр в URL | /loans, LoansPage, state/page; сервер проверяет владельца. Видимое название страницы сейчас «Выдачи книг», а не буквальное «Мои книги». Это личный список member и расширенный список librarian. |",
    "| 2 Одна форма в двух режимах | BookFormPage и BookForm, mode=create/edit, предзаполнение, PATCH измененных полей. |",
    "| 3 Страница 404 | NotFoundPage, маршрут *, Link назад. Новый интеграционный тест проверяет реальный переход в каталог. |",
    "| 4 Самопроверка и приложение к PR | docs/lectures/lecture-08-frontend-checklist.md, реальные новые результаты в lecture-08-validation.json. Непроведенные ручные действия не отмечаются успешными. |",
    "", "## Результаты и ограничения", "",
    "Ответы сверены с текущими исходниками. Добавлены четыре интеграционные проверки настоящего AppRouter: 404 и возврат, динамический ID, перенаправление гостя, отказ роли читателю.",
    "Результаты Vitest, ESLint и сборки записываются в отдельном протоколе после завершения команд. Старый успешный CI не заменяет новый запуск.",
    *["- " + item for item in payload["practical_limitations"]],
    "", "## Вывод", "",
    "Материалы связывают теорию с существующим проектом и разделяют клиентскую обратную связь и серверную защиту. Уже работающие маршруты и CRUD сохранены. Учебные особенности практики 8 и ручная приемка остаются явно выделенными.",
]
(OUT / "lecture-08.md").write_text("\n".join(md).rstrip() + "\n", encoding="utf-8")
print(json.dumps({"lecture": 8, "questions": len(records), "code_references": sum(len(r["refs"]) for r in records)}, ensure_ascii=False))

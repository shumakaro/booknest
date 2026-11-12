// ЛР9–10: рабочий раздел использует прежние действия; журнал изменять из клиента нельзя.
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, apiFetch, toUserMessage } from "../../api/client";
import type { AuditEventRead, Page_AuditEventRead_ } from "../../api/generated";
import { Spinner } from "../../components/Spinner";
import { ErrorBox } from "../../components/ErrorBox";
import { EmptyState } from "../../components/EmptyState";
import { useAuth } from "../../app/useAuth";
import "./Librarian.css";

const methods = [["", "Все действия"], ["POST", "Добавление (POST)"], ["PATCH", "Изменение (PATCH)"], ["DELETE", "Удаление (DELETE)"]] as const;
const formatter = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" });
export function LibrarianPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const method = methods.some(([value]) => value === params.get("method")) ? params.get("method")! : "";
  const rawPage = params.get("page") ?? "1";
  const page = /^\d+$/.test(rawPage) && Number(rawPage) >= 1 && Number(rawPage) <= 1000000 ? Number(rawPage) : 1;
  const [items, setItems] = useState<AuditEventRead[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [revision, setRevision] = useState(0);
  const pages = Math.max(1, Math.ceil(total / 20));
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setStatus("loading"); setError(""); setForbidden(false);
      const query = new URLSearchParams({ page: String(page), size: "20" });
      if (method) query.set("method", method);
      try {
        const data = await apiFetch<Page_AuditEventRead_>(`/audit-events?${query}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const last = Math.max(1, Math.ceil(data.total / 20));
        if (page > last) { setParams({ ...(method ? { method } : {}), ...(last > 1 ? { page: String(last) } : {}) }, { replace: true }); return; }
        setItems(data.items); setTotal(data.total); setStatus("success");
      } catch (reason) {
        if (!controller.signal.aborted) { setForbidden(reason instanceof ApiError && reason.status === 403); setError(toUserMessage(reason)); setStatus("error"); }
      }
    }
    void load(); return () => controller.abort();
  }, [page, method, revision, user?.id, setParams]);
  function navigatePage(next: number) { setParams({ ...(method ? { method } : {}), ...(next > 1 ? { page: String(next) } : {}) }); }
  return <section className="librarian-page"><h2>Рабочее место библиотекаря</h2>
    <p>Управление каталогом и выдачами. Изменение или удаление книги доступно на ее странице.</p>
    <nav className="librarian-links" aria-label="Действия библиотекаря">
      <Link to="/books/new"><strong>Добавить книгу</strong><span>Создание записи в моей библиотеке</span></Link>
      <Link to="/books"><strong>Управлять каталогом</strong><span>Поиск, изменение и удаление книг</span></Link>
      <Link to="/discover"><strong>Найти и импортировать</strong><span>Сначала просмотр результата Open Library</span></Link>
      <Link to="/loans?state=active"><strong>Текущие выдачи</strong><span>Активные записи всех читателей</span></Link>
      <Link to="/loans?state=overdue"><strong>Просроченные выдачи</strong><span>Проверка сроков и возврат</span></Link>
      <Link to="/loans?state=returned"><strong>История возвратов</strong><span>Завершенные выдачи</span></Link>
    </nav>
    <h3>Журнал действий каталога</h3>
    <p className="librarian-help">Журнал содержит записанные операции управления каталогом. Это не полный журнал входов и выдач. Время показано в часовом поясе браузера. Журнал доступен только для чтения.</p>
    <div className="audit-controls"><label>Действие в журнале<select value={method} disabled={status === "loading"} onChange={event => setParams(event.target.value ? { method: event.target.value } : {})}>
      {methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button type="button" disabled={status === "loading"} onClick={() => setRevision(value => value + 1)}>Обновить журнал</button></div>
    {status === "loading" && <Spinner label="Загружаем журнал…" />}
    {status === "error" && <><ErrorBox message={forbidden ? "Доступ к журналу разрешен только библиотекарю." : error} onRetry={forbidden ? undefined : () => setRevision(value => value + 1)} />
      {forbidden && <Link to="/books">Вернуться в библиотеку</Link>}</>}
    {status === "success" && <>
      <p role="status">{total ? `Записи ${((page - 1) * 20) + 1}–${Math.min(page * 20, total)} из ${total}` : "Найдено записей: 0"}</p>
      {items.length === 0 ? <EmptyState title={method ? "Таких действий пока нет" : "Журнал пока пуст"} message="Новые записи появятся после успешных операций управления каталогом." /> :
        <ol className="audit-list">{items.map(item => <li key={item.id}>
          <div className="audit-event__heading"><strong>{item.method === "POST" ? "Добавление" : item.method === "PATCH" ? "Изменение" : item.method === "DELETE" ? "Удаление" : "Операция"} · {item.method}</strong>
            <time dateTime={item.created_at}>{formatter.format(new Date(item.created_at))}</time></div>
          <p>Запись №{item.id} · {item.user_id === null ? "Пользователь больше недоступен" : `Пользователь №${item.user_id}`}</p>
          {/* Путь отображается обычным текстом: исторические строки не исполняются и не становятся внешней ссылкой. */}
          <code>{item.path}</code>
        </li>)}</ol>}
      {total > 0 && <nav className="pagination" aria-label="Страницы журнала"><button disabled={page <= 1} onClick={() => navigatePage(page - 1)}>Предыдущая</button><span>Страница {page} из {pages}</span>
        <button disabled={page >= pages} onClick={() => navigatePage(page + 1)}>Следующая</button></nav>}
    </>}
  </section>;
}

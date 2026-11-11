// Форма ЛР10 использует контракт собственного API; проверенные данные вводятся явно.
import { useEffect, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookFormApiError, saveBook } from "../../../api/bookForm";
import { notify } from "../../../lib/notifications";
import { useUnsavedChanges } from "../../../shared/hooks/useUnsavedChanges";
import { bookSchema, type BookFormValues } from "../bookSchema";
import "./BookForm.css";

interface BookFormProps {
  mode: "create" | "edit";
  bookId?: string;
  defaultValues?: Partial<BookFormValues>;
  onSuccess: (id: string) => void;
  onCancel?: () => void;
}

type Field = { name: keyof BookFormValues; label: string; hint: string; numeric?: boolean; max?: number };
const groups: { title: string; fields: Field[] }[] = [
  { title: "Книга и автор", fields: [
    { name: "title", label: "Название", max: 200, hint: "Полное название, до 200 символов." },
    { name: "author", label: "Автор", max: 120, hint: "Имя автора, до 120 символов. Существующий автор будет найден автоматически." },
    { name: "isbn", label: "ISBN", hint: "Необязательно. ISBN-10 или ISBN-13, можно с пробелами и дефисами." },
  ] },
  { title: "Конкретное издание", fields: [
    { name: "publisher", label: "Издательство", max: 100, hint: "Укажите издательство или явно напишите «Не указано»." },
    { name: "language", label: "Язык", max: 30, hint: "Язык этой книги; неизвестное значение можно обозначить «Не указано»." },
    { name: "publicationYear", label: "Год первой публикации", numeric: true, hint: "Проверенный год произведения: 1450–2100." },
    { name: "editionYear", label: "Год издания", numeric: true, hint: "Год конкретного издания, не раньше первой публикации." },
    { name: "pages", label: "Количество страниц", numeric: true, hint: "Фактическое целое число от 1 до 10000." },
    { name: "totalCopies", label: "Количество экземпляров", numeric: true, hint: "От 0 до 10000. Нельзя указать меньше количества действующих выдач." },
  ] },
];
const fields = groups.flatMap(group => group.fields);
// Годы, язык и страницы не подставляются вымышленными значениями при создании.
const CREATE_DEFAULTS: Partial<BookFormValues> = { title: "", author: "", isbn: "", publisher: "", language: "", totalCopies: 1 };

export function BookForm({ mode, bookId, defaultValues, onSuccess, onCancel }: BookFormProps) {
  const [generalError, setGeneralError] = useState("");
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const focusField = useRef<keyof BookFormValues | null>(null);
  const { register, handleSubmit, setError, setFocus, reset, formState: { errors, isSubmitting, isDirty, dirtyFields } } = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema), defaultValues: { ...CREATE_DEFAULTS, ...defaultValues },
  });
  const busy = saving || isSubmitting;
  useUnsavedChanges(isDirty);
  // Поля во время запроса выключены; фокус ошибки переносится после их включения.
  useEffect(() => {
    if (busy) return;
    if (focusField.current) { setFocus(focusField.current); focusField.current = null; }
    else if (generalError) errorRef.current?.focus();
  }, [busy, generalError, setFocus]);

  const onSubmit: SubmitHandler<BookFormValues> = async data => {
    if (lock.current) return;
    lock.current = true; setSaving(true); setGeneralError("");
    try {
      const saved = await saveBook(data, bookId, mode === "edit" ? Object.keys(dirtyFields) as (keyof BookFormValues)[] : undefined);
      reset(data);
      notify(mode === "create" ? "Книга добавлена в каталог" : "Изменения книги сохранены");
      onSuccess(saved.id);
    } catch (error) {
      if (error instanceof BookFormApiError) {
        const known = fields.filter(field => error.fieldErrors?.[field.name]);
        if (known.length) {
          for (const field of known) setError(field.name, { type: "server", message: error.fieldErrors?.[field.name] });
          focusField.current = known[0]?.name ?? null;
        } else setGeneralError(error.message);
      } else setGeneralError("Не удалось сохранить книгу. Проверьте соединение и повторите попытку.");
    } finally { lock.current = false; setSaving(false); }
  };

  return <form className="book-form" aria-label={mode === "create" ? "Новая книга" : "Редактирование книги"} aria-busy={busy} noValidate
    onSubmit={handleSubmit(onSubmit, invalid => {
      const first = fields.find(field => invalid[field.name]);
      if (first) requestAnimationFrame(() => setFocus(first.name));
    })}>
    <p className="book-form__intro">ISBN можно оставить пустым. Остальные характеристики заполняются проверенными данными; сохранение проверяется и на сервере.</p>
    <fieldset disabled={busy} className="book-form__body"><legend className="visually-hidden">Данные книги</legend>
      {groups.map(group => <fieldset className="book-form__group" key={group.title}><legend>{group.title}</legend>
        <div className="book-form__grid">{group.fields.map(field => <div className="book-form__field" key={field.name}>
          <label htmlFor={`book-${field.name}`}>{field.label}</label>
          <input id={`book-${field.name}`} type={field.numeric ? "number" : "text"} step={field.numeric ? 1 : undefined} maxLength={field.max}
            {...register(field.name, field.numeric ? { valueAsNumber: true } : {})}
            aria-invalid={Boolean(errors[field.name])}
            aria-describedby={`book-${field.name}-hint${errors[field.name] ? ` book-${field.name}-error` : ""}`} />
          <p id={`book-${field.name}-hint`} className="book-form__hint">{field.hint}</p>
          {errors[field.name] && <p id={`book-${field.name}-error`} role="alert">{errors[field.name]?.message}</p>}
        </div>)}</div>
      </fieldset>)}
      <div className="book-form__actions"><button className="btn btn--primary" type="submit" disabled={mode === "edit" && !isDirty}>
        {busy ? "Сохранение..." : mode === "create" ? "Создать книгу" : "Сохранить изменения"}</button>
        {onCancel && <button type="button" className="btn btn--ghost" onClick={() => {
          if (!isDirty || confirm("Есть несохранённые изменения. Отменить редактирование?")) onCancel();
        }}>Отмена</button>}
      </div>
    </fieldset>
    {generalError && <p ref={errorRef} tabIndex={-1} role="alert">{generalError}</p>}
    {isDirty && <p className="book-form__draft">Есть несохранённые изменения.</p>}
  </form>;
}

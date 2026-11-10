// Общие элементы деталей ЛР10: показываются только фактические сведения из API.
import { useId, useState } from "react";
import type { ReactNode } from "react";
import "./BookDetails.css";

export function BookCover({ title, coverId }: { title: string; coverId?: number | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
  return <div className="book-detail__cover">
    {url && failed !== url ? <img src={url} alt={`Обложка книги ${title}`} decoding="async" onError={() => setFailed(url)} />
      : <div className="book-detail__fallback" role="img" aria-label={`Обложка книги «${title}» отсутствует или недоступна`}>
        <span aria-hidden="true">BN</span><strong>{title}</strong><small>Обложка недоступна</small>
      </div>}
  </div>;
}

export function BookFacts({ facts }: { facts: [string, ReactNode][] }) {
  return <dl className="book-detail__facts">{facts.map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd>{value === null || value === undefined || value === "" ? "Не указано" : value}</dd></div>
  )}</dl>;
}

export function BookDescription({ text }: { text?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const description = text?.trim() ?? "";
  // Ограничиваются и символы, и переводы строк: короткие строки источника
  // иначе растянули бы даже свернутое описание на несколько экранов.
  const preview = description.split("\n").slice(0, 6).join("\n").slice(0, 650).trimEnd();
  const long = preview.length < description.length;
  // Текст источника остается текстом: HTML из внешнего API не исполняется.
  return <section className="book-detail__description" aria-label="Описание книги">
    <h3>О книге</h3>
    <p id={id}>{description ? long && !expanded ? preview + "…" : description : "Описание отсутствует."}</p>
    {long && <button type="button" className="btn btn--ghost" aria-expanded={expanded} aria-controls={id}
      onClick={() => setExpanded(value => !value)}>{expanded ? "Свернуть описание" : "Читать полностью"}</button>}
  </section>;
}

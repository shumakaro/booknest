// Дополнение ЛР10: новые результаты появляются отдельно, уже прочитанные не двигаются.
import { Children, isValidElement, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import "./LoadingTransitions.css";

function ResultItem({ children, index, animate }: { children: ReactNode; index: number; animate: boolean }) {
  // Решение принимается при первом появлении элемента. Подгрузка соседней страницы
  // и изменение желаемого не запускают заново анимацию уже существующей карточки.
  const [enter] = useState(animate);
  const style = { "--result-delay": `${Math.min(index % 20, 5) * 35}ms` } as CSSProperties;
  return <div className={`book-results__item${enter ? " book-results__item--enter" : ""}`} style={style}>
    {children}
  </div>;
}

export function AnimatedResults({ children, animate = true, label }: { children: ReactNode; animate?: boolean; label: string }) {
  return <div className="book-list book-results" aria-label={label}>
    {Children.toArray(children).map((child, index) => <ResultItem
      key={isValidElement(child) ? child.key : index} index={index} animate={animate}
    >{child}</ResultItem>)}
  </div>;
}

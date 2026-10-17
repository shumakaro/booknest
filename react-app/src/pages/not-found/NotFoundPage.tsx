import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section>
      <h2>404</h2>
      <p>Страница не найдена.</p>

      <Link to="/books">
        Вернуться в каталог
      </Link>
    </section>
  );
}
import { Component, type ErrorInfo, type ReactNode } from "react";

// Перехватываем сбой отрисовки, чтобы пользователь получил понятный путь возврата.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Сбой интерфейса BookNest", error, info.componentStack); }
  render() {
    if (this.state.failed) return <main><h1>Не удалось показать страницу</h1><p>Попробуйте вернуться в каталог.</p><button onClick={() => location.assign("/books")}>Вернуться в каталог</button></main>;
    return this.props.children;
  }
}

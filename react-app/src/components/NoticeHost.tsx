import { useEffect, useRef, useState } from "react";

// Хост находится над маршрутами: сообщение сохраняется при переходе после действия.
export function NoticeHost() {
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);
  const sequence = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    function receive(event: Event) {
      setNotice({ id: ++sequence.current, message: (event as CustomEvent<string>).detail });
    }
    globalThis.addEventListener("booknest:notice", receive);
    return () => globalThis.removeEventListener("booknest:notice", receive);
  }, []);
  useEffect(() => {
    if (!notice || hovered || focused) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice, hovered, focused]);
  function close() {
    setNotice(null); setFocused(false); setHovered(false);
    // После закрытия кнопка исчезает: клавиатура возвращается к прежнему действию или main.
    if (focused) {
      const target = returnFocus.current?.isConnected ? returnFocus.current : document.getElementById("main-content");
      target?.focus({ preventScroll: true });
    }
  }
  // Пустой live-region уже присутствует в DOM до первого уведомления.
  return <aside className="notice-host" aria-label="Уведомления"><div role="status" aria-live="polite" aria-atomic="true">
    {notice && <div className="notice"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) returnFocus.current = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null;
        setFocused(true);
      }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
      <span aria-hidden="true">✓</span><p key={notice.id}>{notice.message}</p>
      <button type="button" onClick={close} aria-label="Закрыть уведомление">×</button></div>}
  </div></aside>;
}

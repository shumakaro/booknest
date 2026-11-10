import { useEffect, useRef, useState } from "react";

// Хост находится над маршрутами: сообщение сохраняется при переходе после действия.
export function NoticeHost() {
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);
  const sequence = useRef(0);
  useEffect(() => {
    function receive(event: Event) {
      setNotice({ id: ++sequence.current, message: (event as CustomEvent<string>).detail });
    }
    globalThis.addEventListener("booknest:notice", receive);
    return () => globalThis.removeEventListener("booknest:notice", receive);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  // Пустой live-region уже присутствует в DOM до первого уведомления.
  return <aside className="notice-host" aria-label="Уведомления"><div role="status" aria-live="polite" aria-atomic="true">
    {notice && <div className="notice" key={notice.id}><span aria-hidden="true">✓</span><p>{notice.message}</p>
      <button type="button" onClick={() => setNotice(null)} aria-label="Закрыть уведомление">×</button></div>}
  </div></aside>;
}

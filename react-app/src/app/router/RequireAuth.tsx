import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../useAuth";
import { Spinner } from "../../components/Spinner";

export function RequireAuth({ role }: { role?: "librarian" }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Восстанавливаем сеанс..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  // Эта проверка управляет интерфейсом, сервер независимо проверяет те же права.
  if (role && user.role !== role) return <section><h2>Недостаточно прав</h2><p>Раздел доступен библиотекарю.</p></section>;
  return <Outlet />;
}

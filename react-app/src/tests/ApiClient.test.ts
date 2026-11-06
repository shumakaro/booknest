import { it, expect, vi } from 'vitest';
import { apiFetch, setAccessToken } from '../api/client';

it('после успешного refresh сохраняет ошибку валидации и не завершает сеанс', async () => {
  setAccessToken('old-access');
  const request = vi.fn()
    .mockResolvedValueOnce(new Response('{}', { status:401 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ access_token:'new-access' }), { status:200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ message:'Проверьте год' }), { status:422 }));
  vi.stubGlobal('fetch', request);
  const logout = vi.fn();
  globalThis.addEventListener('booknest:logout', logout);
  try {
    await expect(apiFetch('/books', { method:'POST', body:'{}' })).rejects.toMatchObject({ status:422, message:'Проверьте год' });
    expect(request).toHaveBeenCalledTimes(3);
    expect(new Headers(request.mock.calls[2]?.[1]?.headers).get('Authorization')).toBe('Bearer new-access');
    expect(logout).not.toHaveBeenCalled();
  } finally { globalThis.removeEventListener('booknest:logout', logout); vi.unstubAllGlobals(); setAccessToken(null); }
});

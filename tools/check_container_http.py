"""ЛР11: read-only smoke изолированных контейнеров, SPA и кэша собранных файлов."""
import json
import os
import urllib.error
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urlsplit

# Тот же контракт проверяет Compose и отдельный единый образ Render в CI.
def main() -> None:
    base = os.environ.get('BOOKNEST_CHECK_BASE_URL', 'http://127.0.0.1:8080').rstrip('/')
    url = urlsplit(base)
    if url.scheme not in {'http', 'https'} or url.username or url.password or url.query or url.fragment:
        raise ValueError('Нужен HTTP-адрес стенда без учетных данных и query')
    expected = int(os.environ.get('BOOKNEST_EXPECTED_BOOKS', '30'))
    with urllib.request.urlopen(base+'/health', timeout=5) as response:
        assert json.load(response)['status'] == 'ok'
        assert response.headers['X-Request-ID']
    with urllib.request.urlopen(base+'/api/v1/books', timeout=5) as response:
        assert json.load(response)['total'] == expected
    routes = ['/books/1', '/discover', '/wishlist', '/loans', '/librarian', '/login', '/register', '/books/1/edit']
    index = ''
    for route in routes:
        with urllib.request.urlopen(base+route, timeout=5) as response:
            assert 'text/html' in response.headers['Content-Type']
            assert 'no-store' in ','.join(response.headers.get_all('Cache-Control', []))
            index = response.read().decode('utf-8')
    class Assets(HTMLParser):
        def __init__(self):
            super().__init__()
            self.paths = set()
        def handle_starttag(self, tag, attrs):
            values = dict(attrs)
            path = values.get('src' if tag == 'script' else 'href', '')
            if tag in {'script', 'link'} and path and path.startswith('/assets/'):
                self.paths.add(path)
    assets = Assets()
    assets.feed(index)
    assert assets.paths, 'HTML должен ссылаться на собранные assets'
    for path in assets.paths:
        with urllib.request.urlopen(base+path, timeout=5) as response:
            assert response.status == 200
            if path.endswith('.css'):
                assert 'text/css' in response.headers['Content-Type']
            if path.endswith('.js'):
                assert 'javascript' in response.headers['Content-Type']
            if os.environ.get('BOOKNEST_CHECK_IMMUTABLE') == '1':
                assert 'immutable' in ','.join(response.headers.get_all('Cache-Control', []))
    for path in ['/api/v1/nonexistent', '/assets/nonexistent-ci.js']:
        try:
            urllib.request.urlopen(base+path, timeout=5)
        except urllib.error.HTTPError as error:
            assert error.code == 404
            if path.startswith('/api/'):
                assert json.load(error)['code'] == 'HTTP_404'
        else:
            raise AssertionError('Неизвестный API/asset не должен возвращать SPA')
    print(f'Container health, {expected} active books, {len(routes)} SPA routes, assets/cache and API 404: OK')


if __name__ == '__main__':
    main()

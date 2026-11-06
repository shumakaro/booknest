"""Smoke контейнеров: настоящий API, начальный каталог и прямая SPA-ссылка."""
import json
import urllib.error
import urllib.request

base='http://127.0.0.1:8080'
with urllib.request.urlopen(base+'/health') as response:
    assert json.load(response)['status']=='ok'
with urllib.request.urlopen(base+'/api/v1/books') as response:
    assert json.load(response)['total']==30
with urllib.request.urlopen(base+'/books/1') as response:
    assert 'text/html' in response.headers['Content-Type']
try:
    urllib.request.urlopen(base+'/api/v1/nonexistent')
except urllib.error.HTTPError as error:
    assert error.code==404
    assert json.load(error)['code']=='HTTP_404'
else:
    raise AssertionError('Неизвестный API-путь не должен возвращать SPA')
print('Container health, 30 active books, direct SPA route and API 404: OK')

"""Поддельные proxy-заголовки не должны давать шесть разных адресов для лимита."""
import json
import urllib.error
import urllib.parse
import urllib.request
codes=[]
for index in range(6):
    body=urllib.parse.urlencode({'username':'missing@example.com','password':'WrongPassword123'}).encode()
    request=urllib.request.Request('http://127.0.0.1:8080/api/v1/auth/token',data=body,
        headers={'Content-Type':'application/x-www-form-urlencoded','X-Forwarded-For':f'192.0.2.{index+1}','X-Real-IP':f'198.51.100.{index+1}'})
    try:
        with urllib.request.urlopen(request) as response:
            codes.append(response.status)
    except urllib.error.HTTPError as error:
        codes.append(error.code)
        json.load(error)
assert codes==[401,401,401,401,401,429],codes
print('Forged forwarded headers cannot bypass login limit:',codes)

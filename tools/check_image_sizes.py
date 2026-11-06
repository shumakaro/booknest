"""Размеры берутся из docker inspect; заявленные пороги проверяются фактически."""
import json
import subprocess
for image,limit in [('booknest-web:local',100_000_000),('booknest-api:local',200_000_000)]:
    raw=subprocess.check_output(['docker','image','inspect',image],text=True)
    size=json.loads(raw)[0]['Size']
    print(image,round(size/1_000_000,2),'MB')
    assert size<limit,f'{image} превышает учебный порог {limit} байт'

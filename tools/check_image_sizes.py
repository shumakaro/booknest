"""Контролируются и байты inspect, и отображаемый полный размер image ls."""
import json
import re
import subprocess
for image,limit in [('booknest-web:local',100_000_000),('booknest-api:local',200_000_000)]:
    inspected=json.loads(subprocess.check_output(['docker','image','inspect',image],text=True))[0]['Size']
    displayed=subprocess.check_output(['docker','image','ls','--format','{{.Size}}',image],text=True).strip()
    match=re.fullmatch(r'([0-9.]+)\s*(B|kB|MB|GB|KiB|MiB|GiB)',displayed)
    if not match:
        raise RuntimeError('Неизвестный формат размера Docker: '+displayed)
    unit=match[2]
    factors={'B':1,'kB':1000,'MB':1000**2,'GB':1000**3,'KiB':1024,'MiB':1024**2,'GiB':1024**3}
    total=float(match[1])*factors[unit]
    print(image,'inspect:',round(inspected/1_000_000,2),'MB; image ls:',displayed)
    # У containerd inspect может показывать compressed content; его одного недостаточно.
    assert total<limit,f'{image}: отображаемый размер {displayed} превышает порог'

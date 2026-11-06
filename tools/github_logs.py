"""Сохраняет журналы CI локально и выводит только диагностические строки без токенов."""
import argparse
import sys
sys.stdout.reconfigure(encoding="utf-8")
import io
import re
import subprocess
import urllib.request
from pathlib import Path
from zipfile import ZipFile

parser=argparse.ArgumentParser();parser.add_argument('run_id',type=int);args=parser.parse_args()
credential=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\npath=shumakaro/booknest.git\n\n',capture_output=True,text=True,check=True)
fields=dict(line.split('=',1) for line in credential.stdout.splitlines() if '=' in line)
request=urllib.request.Request(f'https://api.github.com/repos/shumakaro/booknest/actions/runs/{args.run_id}/logs',headers={'Authorization':'Bearer '+fields['password'],'Accept':'application/vnd.github+json'})
with urllib.request.urlopen(request,timeout=40) as response:
    data=response.read()
Path(f'.tools/ci-{args.run_id}.zip').write_bytes(data)
with ZipFile(io.BytesIO(data)) as archive:
    for name in archive.namelist():
        if 'Browser scenario' not in name and 'Smoke and persistence' not in name:
            continue
        source=archive.read(name).decode('utf-8',errors='replace')
        source=re.sub(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+','[TOKEN]',source)
        source=re.sub(r'postgresql[^\s]+','[DATABASE_URL]',source)
        lines=source.splitlines()
        print(name)
        if 'Browser' in name:
            print('\n'.join(lines[-95:]))
        else:
            print('\n'.join(line for line in lines if 'MB' in line or ' OK' in line))

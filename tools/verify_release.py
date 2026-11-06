"""Не разрешает deploy тега, для которого нет успешных jobs checks и containers."""
import json
import os
import subprocess
import urllib.request

sha=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
repository=os.environ['GITHUB_REPOSITORY']
request=urllib.request.Request(f'https://api.github.com/repos/{repository}/commits/{sha}/check-runs',
    headers={'Authorization':'Bearer '+os.environ['GITHUB_TOKEN'],'Accept':'application/vnd.github+json'})
with urllib.request.urlopen(request,timeout=30) as response:
    runs=json.load(response)['check_runs']
for name in ['checks','containers']:
    matching=[run for run in runs if run['name']==name]
    if not matching or max(matching,key=lambda run:run['id'])['conclusion']!='success':
        raise SystemExit('Нет последней успешной проверки '+name+' для коммита тега')
print('Оба набора CI для точного коммита тега успешны')

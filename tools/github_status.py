"""Читает состояние GitHub Actions без публикации данных и вывода токена."""
import argparse
import json
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--branch',required=True)
parser.add_argument('--output')
args=parser.parse_args()
credential=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\npath=shumakaro/booknest.git\n\n',capture_output=True,text=True,check=True)
fields=dict(line.split('=',1) for line in credential.stdout.splitlines() if '=' in line)
headers={'Authorization':'Bearer '+fields['password'],'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
base='https://api.github.com/repos/shumakaro/booknest'
def get(path: str):
    with urllib.request.urlopen(urllib.request.Request(base+path,headers=headers),timeout=30) as response:
        return json.load(response)
query=urllib.parse.urlencode({'branch':args.branch,'per_page':5})
result=[]
for run in get('/actions/runs?'+query)['workflow_runs']:
    jobs=get(f"/actions/runs/{run['id']}/jobs")['jobs']
    result.append({'id':run['id'],'name':run['name'],'status':run['status'],'conclusion':run['conclusion'],'url':run['html_url'],'sha':run['head_sha'],'jobs':[{'name':job['name'],'status':job['status'],'conclusion':job['conclusion'],'steps':[{'name':step['name'],'conclusion':step.get('conclusion')} for step in job.get('steps',[])]} for job in jobs]})
if args.output:
    Path(args.output).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{**{key:run[key] for key in ['id','status','conclusion','url','sha']}, 'jobs':[{'name':job['name'],'status':job['status'],'conclusion':job['conclusion'],'pending_or_failed':[step['name'] for step in job['steps'] if step['conclusion'] not in ['success','skipped']]} for job in run['jobs']]} for run in result[:1]],ensure_ascii=False,indent=2))

"""Создаёт Nginx-конфигурацию, заменяя только два проверенных параметра."""
import argparse
import re
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--domain',required=True)
parser.add_argument('--upstream-port',required=True,type=int)
parser.add_argument('--bootstrap',action='store_true')
parser.add_argument('--output',required=True)
args=parser.parse_args()
if not re.fullmatch(r'(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?',args.domain) or '..' in args.domain:
    raise SystemExit('Требуется обычное доменное имя без команд и пробелов')
if not 1 <= args.upstream_port <= 65535:
    raise SystemExit('Неверный порт')
name='nginx-bootstrap.conf.template' if args.bootstrap else 'nginx-https.conf.template'
source=(Path(__file__).resolve().parents[1]/'deployment'/name).read_text(encoding='utf-8-sig')
result=source.replace('${DOMAIN}',args.domain).replace('${UPSTREAM_PORT}',str(args.upstream_port))
Path(args.output).write_text(result,encoding='utf-8',newline='\n')
print('Конфигурация подготовлена; сертификат и проверка nginx -t выполняются на сервере')

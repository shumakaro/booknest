"""Создаёт зависимый PR; учётные данные берутся из штатного Git credential helper."""
import argparse
import json
import subprocess
import urllib.request
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--head', required=True)
    parser.add_argument('--base', required=True)
    parser.add_argument('--title', required=True)
    parser.add_argument('--body-file', required=True)
    args = parser.parse_args()
    # Секрет остаётся в памяти процесса и никогда не выводится в журнал.
    credential = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\npath=shumakaro/booknest.git\n\n', text=True, capture_output=True, check=True)
    fields = dict(line.split('=', 1) for line in credential.stdout.splitlines() if '=' in line)
    headers = {'Authorization': 'Bearer ' + fields['password'], 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}
    url = 'https://api.github.com/repos/shumakaro/booknest/pulls'
    query = urllib.request.Request(url + '?state=open&head=shumakaro:' + args.head, headers=headers)
    with urllib.request.urlopen(query) as response:
        existing = json.load(response)
    if existing:
        print(existing[0]['html_url'])
        return
    payload = {'title': args.title, 'head': args.head, 'base': args.base,
               'body': Path(args.body_file).read_text(encoding='utf-8-sig')}
    request = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method='POST')
    with urllib.request.urlopen(request) as response:
        print(json.load(response)['html_url'])

if __name__ == '__main__':
    main()

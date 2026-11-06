"""Подставляет оригинальные вопросы лекций и проверяет полноту ответов."""
import argparse
import json
from pathlib import Path

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument('--lab',type=int,required=True)
    parser.add_argument('--weeks',type=int,nargs='+',required=True)
    args=parser.parse_args()
    units=json.loads(Path('docs/course/source-units.json').read_text(encoding='utf-8'))
    answers=json.loads(Path('docs/course/lecture-answers.json').read_text(encoding='utf-8'))
    questions=[]
    for week in args.weeks:
        part=units[f'lec{week}'].split('Контрольные вопросы',1)[1].split('Домашнее задание',1)[0]
        original=[line.strip() for line in part.splitlines() if line.strip()]
        assert len(original)==len(answers[str(week)]),f'Неполные ответы для недели {week}'
        questions.append(f'### Лекция {week}')
        for question,answer in zip(original,answers[str(week)],strict=True):
            questions.append(f'### {question}\n{answer}\n')
    folder=Path(f'docs/lab{args.lab}')
    source=(folder/'report-body.md').read_text(encoding='utf-8-sig')
    assert '{{LECTURE_QUESTIONS}}' in source
    (folder/'report.md').write_text(source.replace('{{LECTURE_QUESTIONS}}','\n'.join(questions)),encoding='utf-8')
    print(f'ЛР {args.lab}: добавлены все вопросы лекций {args.weeks}')

if __name__=='__main__':
    main()

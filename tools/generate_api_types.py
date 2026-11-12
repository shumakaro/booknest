"""Создает или проверяет TypeScript-типы актуального API без обращения к БД."""
import json
import argparse
from pathlib import Path

def typescript(schema: dict) -> str:
    if 'const' in schema:
        return json.dumps(schema['const'], ensure_ascii=False)
    if '$ref' in schema:
        return schema['$ref'].split('/')[-1]
    if 'anyOf' in schema:
        return ' | '.join(typescript(item) for item in schema['anyOf'])
    if 'enum' in schema:
        return ' | '.join(json.dumps(item, ensure_ascii=False) for item in schema['enum'])
    kind = schema.get('type')
    if kind == 'array':
        return '(' + typescript(schema['items']) + ')[]'
    return {'integer': 'number', 'number': 'number', 'string': 'string', 'boolean': 'boolean', 'null': 'null'}.get(kind, 'unknown')

def render_types(source: dict) -> str:
    """Чистая функция позволяет сверять результат без перезаписи рабочего файла."""
    lines = ['// Файл создан tools/generate_api_types.py из OpenAPI. Правки вносятся в схемы Python.']
    for name, schema in source['components']['schemas'].items():
        lines.append(f'export interface {name} {{')
        for field, value in schema.get('properties', {}).items():
            optional = '' if field in schema.get('required', []) else '?'
            lines.append(f'  {field}{optional}: {typescript(value)};')
        lines.append('}\n')
    return '\n'.join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--schema', default='docs/api/openapi.json')
    parser.add_argument('--output', default='react-app/src/api/generated.ts')
    parser.add_argument('--check', action='store_true', help='Проверить совпадение без изменения файла')
    args = parser.parse_args()
    expected = render_types(json.loads(Path(args.schema).read_text(encoding='utf-8')))
    output = Path(args.output)
    if args.check:
        if not output.exists() or output.read_text(encoding='utf-8') != expected:
            raise SystemExit('Типы API устарели. Выполните генератор без --check.')
        print('Типы API соответствуют схеме.')
    else:
        output.write_text(expected, encoding='utf-8')

if __name__ == '__main__':
    main()

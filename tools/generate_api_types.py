"""Создаёт TypeScript-типы моделей из сохранённой OpenAPI-схемы."""
import json
import argparse
from pathlib import Path

def typescript(schema: dict) -> str:
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

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--schema', default='docs/lab7/openapi.json')
    args = parser.parse_args()
    source = json.loads(Path(args.schema).read_text(encoding='utf-8'))
    lines = ['// Файл создан tools/generate_api_types.py из OpenAPI. Правки вносятся в схемы Python.']
    for name, schema in source['components']['schemas'].items():
        lines.append(f'export interface {name} {{')
        for field, value in schema.get('properties', {}).items():
            optional = '' if field in schema.get('required', []) else '?'
            lines.append(f'  {field}{optional}: {typescript(value)};')
        lines.append('}\n')
    Path('react-app/src/api/generated.ts').write_text('\n'.join(lines), encoding='utf-8')

if __name__ == '__main__':
    main()

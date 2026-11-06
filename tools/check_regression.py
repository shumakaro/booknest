"""Повторяет реальную регрессию на копии кода прошлой ветки, не меняя рабочий файл."""
import json
import subprocess
from pathlib import Path

root=Path.cwd()
old=subprocess.run(['git','show','lab-9/jwt-auth:react-app/src/api/client.ts'],capture_output=True,text=True,encoding='utf-8',check=True).stdout
snapshot=root/'.tools/regression-api-client.ts'
snapshot.write_text(old,encoding='utf-8')
config=root/'.tools/regression-vitest.config.mjs'
config.write_text('export default { root: '+json.dumps(str(root/'react-app'))+', test: { environment: "jsdom", setupFiles: ["./src/tests/setup.ts"], include: ["src/tests/ApiClient.test.ts"] }, plugins: [{name:"snapshot-client",enforce:"pre",resolveId(id){if(id==="../api/client")return '+json.dumps(str(snapshot))+';}}] };',encoding='utf-8')
result=subprocess.run([r'C:\Users\comp\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe',str(root/'react-app/node_modules/vitest/vitest.mjs'),'run','--config',str(config)],cwd=root/'react-app',capture_output=True,text=True,encoding='utf-8',errors='replace')
Path('docs/lab10/regression-red.txt').write_text('Источник: lab-9/jwt-auth:react-app/src/api/client.ts. Проверена отдельная копия; рабочие файлы и история не менялись.\nExit code: '+str(result.returncode)+'\n'+result.stdout+'\n'+result.stderr,encoding='utf-8')
assert result.returncode==1,result.stdout+result.stderr
print('Копия предыдущей ветки: тест действительно красный, exit=1; лог сохранён')

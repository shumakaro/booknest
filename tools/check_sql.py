"""Проверяет SQL на изолированных учебных базах и сохраняет настоящий вывод."""
from pathlib import Path
import os
import argparse
import re
import subprocess
import psycopg
from dotenv import dotenv_values

parser = argparse.ArgumentParser(description='Новая SQL-практика без изменения существующих БД')
parser.add_argument('--scratch-prefix', required=True)
args = parser.parse_args()
if not re.fullmatch(r'booknest_[a-z0-9]{1,24}', args.scratch_prefix):
    raise SystemExit('Префикс должен иметь вид booknest_<новое имя>')
sql_name = args.scratch_prefix + '_sql'
restore_name = args.scratch_prefix + '_restore'

config = dotenv_values('.env')
url = config['DATABASE_URL'].replace('postgresql+psycopg://', 'postgresql://')
base = url.rsplit('/',1)[0]

def run_script(connection, path: str, log) -> None:
    source = '\n'.join(line for line in Path(path).read_text(encoding='utf-8-sig').splitlines() if not line.lstrip().startswith('--'))
    for statement in source.split(';'):
        if not statement.strip():
            continue
        cursor = connection.execute(statement)
        log.write('\nSQL: '+statement.strip()+'\n')
        if cursor.description:
            for row in cursor.fetchall():
                log.write(str(row)+'\n')
        else:
            log.write(cursor.statusmessage+'\n')

with psycopg.connect(base+'/postgres', autocommit=True) as admin:
    for name in [sql_name, restore_name]:
        if admin.execute('SELECT 1 FROM pg_database WHERE datname=%s', (name,)).fetchone():
            raise SystemExit('База уже существует. Выберите новый префикс: существующие данные не изменяются.')
    for name in [sql_name, restore_name]:
        admin.execute(psycopg.sql.SQL('CREATE DATABASE {}').format(psycopg.sql.Identifier(name)))

with Path('.tools/'+args.scratch_prefix+'-sql-results.txt').open('w',encoding='utf-8') as log:
    with psycopg.connect(base+'/'+sql_name, autocommit=True) as connection:
        log.write(connection.execute('SELECT version()').fetchone()[0]+'\n')
        run_script(connection,'db/schema.sql',log)
        run_script(connection,'db/seed.sql',log)
        run_script(connection,'db/queries.sql',log)
        for bad in ["INSERT INTO books(title,author_id,year,total_copies) VALUES ('Ошибка',1,100,1)",
                    "INSERT INTO books(title,author_id,year,total_copies) VALUES ('Ошибка',99999,2020,1)",
                    "INSERT INTO authors(name) VALUES ('Автор 1')"]:
            try:
                connection.execute(bad)
            except psycopg.Error as error:
                log.write('\nEXPECTED ERROR '+error.sqlstate+': '+str(error)+'\n')
            else:
                raise AssertionError('Ограничение не сработало')
        before=connection.execute('SELECT count(*) FROM loans').fetchone()[0]
        connection.execute('BEGIN')
        connection.execute("INSERT INTO loans(book_id,user_id,due_date) VALUES(30,10,current_date+14)")
        connection.execute('UPDATE books SET total_copies=total_copies+1 WHERE id=30')
        connection.execute('ROLLBACK')
        assert connection.execute('SELECT count(*) FROM loans').fetchone()[0]==before
        assert connection.execute('SELECT total_copies FROM books WHERE id=30').fetchone()[0]==3
        log.write('\nROLLBACK verified: both operations cancelled\n')
        run_script(connection,'db/benchmark.sql',log)
    # pg_dump и pg_restore получают пароль через окружение дочернего процесса.
    info=psycopg.conninfo.conninfo_to_dict(base+'/'+sql_name)
    env=os.environ.copy()
    env['PGPASSWORD']=info['password']
    binaries=Path('.tools/postgresql/pgsql/bin')
    dump=Path('.tools/booknest-sql.dump')
    common=['-h',info['host'],'-p',info['port'],'-U',info['user']]
    subprocess.run([str(binaries/'pg_dump.exe'),*common,'-Fc','-f',str(dump),sql_name],env=env,check=True)
    subprocess.run([str(binaries/'pg_restore.exe'),*common,'-d',restore_name,str(dump)],env=env,check=True)
    with psycopg.connect(base+'/'+restore_name) as restored:
        counts=restored.execute('SELECT (SELECT count(*) FROM books),(SELECT count(*) FROM loans)').fetchone()
        assert counts==(30,20)
        log.write('\nBackup restored into separate database: '+str(counts)+'\n')
print('SQL, constraints, 500000-row benchmark, rollback and backup: OK')

"""Создаёт только отсутствующие локальные демонстрационные учётные записи."""
import json
import os
import secrets
from pathlib import Path
from sqlalchemy import select
from app.core.security import hash_password
from app.db import get_session_factory
from app.models import User

# Для Neon используется отдельный игнорируемый файл: локальные пароли не заменяются.
output=Path(os.environ.get('BOOKNEST_DEMO_ACCOUNTS_FILE', '.tools/demo-accounts.json'))
accounts=json.loads(output.read_text(encoding='utf-8')) if output.exists() else {}
with get_session_factory()() as db:
    for role,email in [('librarian','librarian@example.com'),('member','member@example.com')]:
        existing=db.scalar(select(User).where(User.email==email))
        if existing:
            print(role+': запись уже существует, пароль и роль не менялись')
            continue
        password=secrets.token_urlsafe(18)+'A1'
        user=User(email=email,password_hash=hash_password(password),role=role,is_active=True,email_verified=True)
        db.add(user)
        db.flush()
        accounts[role]={'email':email,'password':password,'id':user.id}
        print(role+': создана локальная демонстрационная запись; пароль не выводится')
    db.commit()
output.write_text(json.dumps(accounts,indent=2),encoding='utf-8')

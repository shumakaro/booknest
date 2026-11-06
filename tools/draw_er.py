"""Рисует схему связей как самостоятельную иллюстрацию к SQL-работе."""
from PIL import Image, ImageDraw, ImageFont
image=Image.new('RGB',(1500,1040),'white')
draw=ImageDraw.Draw(image)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
title=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',27)
boxes={'authors':(50,100),'books':(570,100),'genres':(1100,100),'book_genres':(1100,440),'users':(50,700),'profiles':(50,400),'loans':(570,700)}
fields={'authors':['id PK','name UNIQUE','birth_year'], 'books':['id PK, author_id FK','title, year, isbn UNIQUE','total_copies, description','language, deleted_at'], 'genres':['id PK','code UNIQUE','name'], 'book_genres':['book_id PK, FK','genre_id PK, FK'], 'users':['id PK, email UNIQUE','password_hash, role','is_active'], 'profiles':['user_id PK, FK','first_name, last_name','faculty'], 'loans':['id PK, book_id FK','user_id FK','issued_at, due_date','returned_at']}
for start,end,label in [((390,180),(570,180),'1:N'),((910,220),(1100,490),'1:N'),((1270,300),(1270,440),'1:N'),((220,620),(220,700),'1:1'),((390,800),(570,800),'1:N'),((740,330),(740,700),'1:N')]:
    draw.line([start,end],fill='#46546b',width=3)
    center=((start[0]+end[0])//2,(start[1]+end[1])//2)
    draw.text(center,label,font=font,fill='black')
for name,(x,y) in boxes.items():
    height=80+len(fields[name])*32
    draw.rounded_rectangle((x,y,x+340,y+height),radius=12,fill='#f4f6fa',outline='#46546b',width=2)
    draw.text((x+18,y+15),name,font=title,fill='black')
    for row,value in enumerate(fields[name]):draw.text((x+18,y+62+row*32),value,font=font,fill='black')
draw.text((50,25),'BookNest — схема данных после миграции 002',font=title,fill='black')
image.save('db/er.png')

from html.parser import HTMLParser
from pathlib import Path
import json
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.units={}; self.current=None; self.depth=0
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='div' and attrs.get('class')=='unit':
            self.current=attrs.get('id'); self.depth=0; self.units[self.current]=[]
        if self.current:
            if tag=='div': self.depth+=1
            if tag in ['li','p','h3','h4','pre','br']: self.units[self.current].append('\n')
    def handle_endtag(self,tag):
        if self.current and tag=='div':
            self.depth-=1
            if self.depth==0:self.current=None
    def handle_data(self,data):
        if self.current:self.units[self.current].append(data)
p=Parser();p.feed(Path(r'C:\Users\comp\Desktop\web-technologies-syllabus.html').read_text(encoding='utf-8-sig'))
units={key:''.join(value).strip() for key,value in p.units.items()}
selected={k:v for k,v in units.items() if k and (k.startswith(('lec','pr')) and int(''.join(filter(str.isdigit,k)))>=9) or (k and k.startswith('lab') and int(k[3:])>=7)}
Path('docs/course/source-units.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding='utf-8')
for key,value in selected.items():Path('docs/course/'+key+'.txt').write_text(value,encoding='utf-8')



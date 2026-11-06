#!/usr/bin/env python3
"""Build bilingual, one-school-per-page PDF profiles from profiles.json."""
from pathlib import Path
import json, re, html, hashlib, zipfile
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, Color, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter

BASE = Path(__file__).resolve().parent
DATE = '2026-11-05'
W, H = A4
M = 34
CW = W - M * 2
INK = HexColor('#142129')
MUTED = HexColor('#4D5B63')
LINE = HexColor('#CBD1D5')
PALE = HexColor('#F1F4F5')
FONT_FILES = {
 'Body': '/Users/ijaeseung/Library/Fonts/SpoqaHanSansNeo-Regular.ttf',
 'Strong': '/Users/ijaeseung/Library/Fonts/SpoqaHanSansNeo-Bold.ttf',
 'JP': '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
}
for name, path in FONT_FILES.items():
    pdfmetrics.registerFont(TTFont(name, path))
registerFontFamily('Body', normal='Body', bold='Strong', italic='Body', boldItalic='Strong')
registerFontFamily('Strong', normal='Strong', bold='Strong')

def style(lang, size=10, bold=False, color=INK):
    return ParagraphStyle('p', fontName='Strong' if bold else 'Body',
        fontSize=size, leading=size*1.30, textColor=color,
        wordWrap='CJK' if lang=='ko' else None, spaceAfter=0,
        splitLongWords=False, allowWidows=0, allowOrphans=0)

def p(text, lang, size=10, bold=False, color=INK):
    # Evidence codes remain in the editable data and separate source register.
    text=re.sub(r'\s*\[[A-Z]\d+(?:\s*,\s*[A-Z]\d+)*\]', '', text)
    return Paragraph(text, style(lang,size,bold,color))

def para(c, text, lang, y, width=CW, size=10, bold=False, x=M, color=INK):
    item=p(text,lang,size,bold,color)
    _,h=item.wrap(width,H)
    item.drawOn(c,x,y-h)
    return y-h

def tbl(c, rows, widths, lang, y, commands=None, padd=5):
    rows=[[v if isinstance(v,Paragraph) else p(str(v),lang) for v in row] for row in rows]
    t=Table(rows,colWidths=widths,hAlign='LEFT')
    cmds=[('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),padd),
          ('RIGHTPADDING',(0,0),(-1,-1),padd),('TOPPADDING',(0,0),(-1,-1),padd),
          ('BOTTOMPADDING',(0,0),(-1,-1),padd)]
    t.setStyle(TableStyle(cmds+(commands or [])))
    _,h=t.wrap(CW,H)
    t.drawOn(c,M,y-h)
    return y-h

def heading(c, title, lang, y):
    y-=12
    return para(c,title,lang,y,size=11,bold=True)-5

def money(v):
    return '—' if v is None else f'{v:,}'

def render(c,s,lang,n):
    y=H-30
    # Keep the original header height so the body layout stays unchanged.
    header_height=43.65
    logo_width,logo_height,gap=108,43,12
    title_width=CW-logo_width-gap
    title_size=min(20,20*title_width/pdfmetrics.stringWidth(s['name'][lang],'Strong',20))
    para(c,s['name'][lang],lang,y,width=title_width,size=title_size,bold=True)
    para(c,'<font name="JP">'+html.escape(s['name']['ja'])+'</font>',lang,y-30,
         width=title_width,size=10.5,color=MUTED)
    logo=ImageReader(str(BASE/s['logo']['file']))
    iw,ih=logo.getSize()
    scale=min(logo_width/iw,logo_height/ih)
    dw,dh=iw*scale,ih*scale
    c.drawImage(logo,W-M-logo_width+(logo_width-dw)/2,
                y-header_height+(header_height-dh)/2,width=dw,height=dh,mask='auto')
    y-=header_height+12
    termheads = ['4월 입학 · 2년 과정','10월 입학 · 1년 6개월 과정'] if lang=='ko' else ['APRIL · 2-year course','OCTOBER · 1.5-year course']
    labels = ['일본어 요구 수준','고등학교 GPA','등록금 · 엔화'] if lang=='ko' else ['Japanese requirement','High school GPA','School fees · JPY']
    rows=[[p(t,lang,11,True,white) for t in termheads]]
    for key,label in zip(['japanese','gpa','tuition'],labels):
        cells=[]
        for term in ['apr','oct']:
            if key=='tuition':
                a,b=s['fee_totals'][term]
                months=12 if term=='apr' else 6
                if a is None:
                    content=s['tuition_override'][term][lang]
                else:
                    content=(f'1년 차 (12개월): <b>¥{a:,}</b><br/>2년 차 ({months}개월): <b>¥{b:,}</b>' if lang=='ko'
                    else f'Year 1 (12 months): <b>¥{a:,}</b><br/>Year 2 ({months} months): <b>¥{b:,}</b>')
                content+='<br/>'+s.get('fee_status_by_term',{}).get(term,s['fee_status'])[lang]
            else: content=s[key][term][lang]
            cells.append(p('<b>'+label+'</b><br/>'+content,lang,10))
        rows.append(cells)
    y=tbl(c,rows,[CW/2]*2,lang,y,[('BACKGROUND',(0,0),(-1,0),INK),('GRID',(0,1),(-1,-1),.5,LINE)],padd=7)
    y=heading(c,'학교 정보' if lang=='ko' else 'SCHOOL & ACCESS',lang,y)
    y=para(c,'<font name="JP">'+html.escape(s['address_ja'])+'</font>',lang,y,size=10)
    y=para(c,s['access'][lang]+' · <link href="'+s['website']+'" color="#304F62">'+s['website'].replace('https://','').rstrip('/')+'</link>',lang,y-3,size=10)
    y=para(c,s['features'][lang],lang,y-4,size=10)
    if s.get('pathway_support'):
        y=para(c,s['pathway_support'][lang],lang,y-4,size=10)
    y=heading(c,'셰어하우스·기숙사' if lang=='ko' else 'HOUSING',lang,y)
    y=para(c,s['housing'][lang],lang,y,size=10)
    y=para(c,s['housing_inquiry'][lang],lang,y-3,size=10)
    y=heading(c,s.get('fee_heading',{}).get(lang, '등록금 상세 · 엔화 (주거비 별도)' if lang=='ko' else 'FEE BREAKDOWN · JPY (housing separate)'),lang,y)
    headers = ['항목','4월 · 1년 차','4월 · 2년 차','10월 · 1년 차','10월 · 2년 차'] if lang=='ko' else ['Item','Apr / Year 1','Apr / Year 2','Oct / Year 1','Oct / Year 2']
    custom=s.get('fee_table')
    if custom: headers=custom['headers'][lang]
    def nump(value, bold=False):
        item=p(str(value),lang,10,bold)
        item.style.alignment=2
        return item
    rows=[[p(headers[0],lang,10,True)]+[nump(v,True) for v in headers[1:]]]
    for f in (custom['rows'] if custom else s['fees']):
        vals=[nump(money(v)) for v in f['values']]
        rows.append([f['label'][lang]]+vals)
    totals=s['fee_totals']['apr']+s['fee_totals']['oct']
    display_totals=custom['totals'] if custom else totals
    total_label=custom['total_label'][lang] if custom else ('연차별 합계' if lang=='ko' else 'Year total')
    rows.append([p(total_label,lang,10,True)]+[nump(money(v),True) for v in display_totals])
    widths=([CW*.50,CW*.25,CW*.25] if custom else [CW*.34]+[CW*.165]*4)
    y=tbl(c,rows,widths,lang,y,[('BACKGROUND',(0,0),(-1,0),PALE),('LINEBELOW',(0,0),(-1,0),.7,LINE),('LINEBELOW',(0,1),(-1,-2),.3,LINE),('BACKGROUND',(0,-1),(-1,-1),PALE)],padd=3.5)
    if totals[0] is not None:
        ap=sum(s['fee_totals']['apr']); oc=sum(s['fee_totals']['oct'])
        prefix=s.get('course_total_label',{}).get(lang,'과정 총액' if lang=='ko' else 'Course total')
        totaltext=f'{prefix}: 4월 <b>¥{ap:,}</b> / 10월 <b>¥{oc:,}</b>' if lang=='ko' else f'{prefix}: April <b>¥{ap:,}</b> / October <b>¥{oc:,}</b>'
        y=para(c,totaltext,lang,y-5,size=10)
    y=para(c,s['payment'][lang],lang,y-5,size=10)
    if s.get('fee_note'):
        y=para(c,s['fee_note'][lang],lang,y-4,size=10)
    y-=10
    c.setStrokeColor(LINE);c.setLineWidth(.5);c.line(M,y,W-M,y)
    y=para(c,s['caveat'][lang],lang,y-5,size=10,color=MUTED)
    if y < 48:
        raise ValueError(f'Page overflow: {s["id"]}/{lang}: bottom={y:.1f}')
    brand=ImageReader(str(BASE/'assets/jeongwoo-logo-color.png'))
    bw,bh=brand.getSize()
    c.drawImage(brand,M,14,width=96,height=96*bh/bw,mask='auto')
    c.setFillColor(MUTED);c.setFont('Body',8)
    c.drawRightString(W-M,21,f'{DATE}  |  {n:02d} / 04')
    c.showPage()
    return round(y,2)

def main():
    schools=json.loads((BASE/'profiles.json').read_text())
    report={'date':DATE,'page_bottoms':{},'files':[],'fee_checks':[]}
    for s in schools:
        sums=[sum(f['values'][i] for f in s['fees'] if f['values'][i] is not None) for i in range(4)]
        expected=s['fee_totals']['apr']+s['fee_totals']['oct']
        if all(v is not None for v in expected):
            assert sums==expected,(s['id'],sums,expected)
        report['fee_checks'].append({'school':s['id'],'calculated':sums,'shown':expected})
        if s.get('fee_table'):
            custom=s['fee_table']
            got=[sum(r['values'][i] for r in custom['rows']) for i in range(len(custom['totals']))]
            assert got==custom['totals'],(s['id'],got,custom['totals'])
            report['fee_checks'][-1]['initial_totals']=got
    for lang in ['ko','en']:
        filename=BASE/f'school-profiles-{lang}.pdf'
        c=canvas.Canvas(str(filename),pagesize=A4,pageCompression=1)
        c.setTitle('일본어학교 4개교 소개서' if lang=='ko' else 'Four Japanese Language Schools - Partner Profiles')
        c.setAuthor('Jeongwoo Human Resource Development Institute')
        for i,s in enumerate(schools,1):
            report['page_bottoms'][s['id']+'-'+lang]=render(c,s,lang,i)
        c.save()
        reader=PdfReader(filename)
        assert len(reader.pages)==len(schools)
        for i,s in enumerate(schools):
            writer=PdfWriter();writer.add_page(reader.pages[i])
            single=BASE/'individual'/f'{i+1:02d}-{s["id"]}-{lang}.pdf'
            single.parent.mkdir(exist_ok=True)
            with single.open('wb') as f:writer.write(f)
            report['files'].append(str(single.relative_to(BASE)))
        report['files'].append(filename.name)
    for name in report['files']:
        r=PdfReader(BASE/name)
        assert all(abs(float(p.mediabox.width)-W)<.1 and abs(float(p.mediabox.height)-H)<.1 for p in r.pages)
        assert all(p.extract_text().strip() for p in r.pages)
    (BASE/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':main()

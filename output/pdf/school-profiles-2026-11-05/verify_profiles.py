"""Validate layout structure, bilingual amounts and individual PDF exports."""
from pathlib import Path
from pypdf import PdfReader
from collections import Counter
import re,json
b=Path(__file__).resolve().parent
ko=PdfReader(b/'school-profiles-ko.pdf');en=PdfReader(b/'school-profiles-en.pdf')
assert len(ko.pages)==len(en.pages)==4
pattern=r'(?<![\d,])\d{1,3}(?:,\d{3})+(?!\d|,\d)'
assert re.findall(pattern,'¥35,000, rent ¥50,000.')==['35,000','50,000']
checks=[]
for i,(k,e) in enumerate(zip(ko.pages,en.pages),1):
 kt=k.extract_text();et=e.extract_text()
 amounts=lambda s:Counter(re.findall(pattern,s))
 assert amounts(kt)==amounts(et),(i,amounts(kt)-amounts(et),amounts(et)-amounts(kt))
 assert 'GPA' in kt and 'GPA' in et
 assert '544-0024' not in kt and '544-0024' not in et
 assert '1년 차' in kt and '2년 차' in kt
 assert 'Year 1' in et and 'Year 2' in et
 loc=[]
 def visit(t,cm,tm,font,size):
  if '4월 입학' in t or '10월 입학' in t:
   loc.append((t.strip(),cm[4]+tm[4]*cm[0]+tm[5]*cm[2]))
 k.extract_text(visitor_text=visit)
 left=[x for t,x in loc if '4월 입학' in t];right=[x for t,x in loc if '10월 입학' in t]
 assert len(left)==len(right)==1 and left[0]<right[0]
 for lang,reader,full in [('ko',k,kt),('en',e,et)]:
  single=PdfReader(b/'individual'/f'{i:02d}-{["naniwa","firststudy","himawari","sakura"][i-1]}-{lang}.pdf')
  assert len(single.pages)==1 and single.pages[0].extract_text()==full
  for ann in reader.get('/Annots',[]):
   a=ann.get_object().get('/A')
   if a and a.get('/URI'): assert str(a['/URI']).startswith('https://')
 checks.append({'page':i,'amounts_identical':True,'left_april_x':left[0],'right_october_x':right[0],'individual_matches_combined':True})
assert 'due date' in en.pages[1].extract_text()
assert 'Reference calculation' in en.pages[2].extract_text()
assert 'N4-level standard' in en.pages[3].extract_text()
(b/'content-checks.json').write_text(json.dumps({'passed':True,'generated_pdf_count':10,'checks':checks},indent=2))
print(json.dumps(checks,indent=2))

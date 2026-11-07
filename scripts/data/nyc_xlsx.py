from pathlib import Path
import zipfile,xml.etree.ElementTree as E,json,re
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def workbook(path):
 z=zipfile.ZipFile(path); ss=[]
 if 'xl/sharedStrings.xml' in z.namelist():
  for _,e in E.iterparse(z.open('xl/sharedStrings.xml'),events=('end',)):
   if e.tag.endswith('}si'): ss.append(''.join(e.itertext()));e.clear()
 wb=E.fromstring(z.read('xl/workbook.xml')); rel={x.attrib['Id']:x.attrib['Target'] for x in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
 sheets={s.attrib['name']:rel[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']] for s in wb.find('m:sheets',NS)}
 return z,ss,sheets
def rows(z,ss,target):
 target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
 for _,r in E.iterparse(z.open(target),events=('end',)):
  if not r.tag.endswith('}row'):continue
  d={}
  for c in r:
   v=c.find('m:v',NS); inline=c.find('m:is',NS)
   val=v.text if v is not None else ''.join(inline.itertext()) if inline is not None else ''
   if c.attrib.get('t')=='s' and val:val=ss[int(val)]
   d[re.sub(r'\d','',c.attrib.get('r',''))]=val
  yield d;r.clear()

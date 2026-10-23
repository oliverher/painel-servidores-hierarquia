import re,unicodedata,json
def norm(s):
    s=unicodedata.normalize('NFD',str(s));s=''.join(c for c in s if unicodedata.category(c)!='Mn')
    s=s.upper().replace('–',' ').replace('—',' ').replace('-',' ')
    s=re.sub(r'\([^)]*\)',' ',s)
    s=re.sub(r'[^A-Z0-9 ]',' ',s)
    return re.sub(r'\s+',' ',s).strip()

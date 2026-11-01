from pathlib import Path
import json,jsonschema
r=Path(__file__).resolve().parents[1]
count=0
for p in (r/'schemas').glob('*.schema.json'):
 s=json.loads(p.read_text(encoding='utf-8'));jsonschema.Draft202012Validator.check_schema(s)
 e=json.loads((r/'examples'/p.name.replace('.schema','')).read_text(encoding='utf-8'))
 jsonschema.validate(e,s)
 bad=dict(e);bad.pop(s['required'][0])
 try:jsonschema.validate(bad,s)
 except jsonschema.ValidationError:pass
 else:raise AssertionError('missing required field accepted')
 count+=1
print(f'{count} schemas, {count} positive and {count} negative fixtures passed')

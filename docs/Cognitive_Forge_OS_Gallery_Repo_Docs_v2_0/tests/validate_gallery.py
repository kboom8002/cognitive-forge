from pathlib import Path
import json,collections
import jsonschema
r=Path(__file__).resolve().parents[1]
def read(p):return json.loads((r/p).read_text(encoding='utf-8'))
schemas={p.stem.replace('.schema',''):json.loads(p.read_text(encoding='utf-8')) for p in (r/'gallery/schemas').glob('*.json')}
checks=[]
for name,s in schemas.items():
 jsonschema.Draft202012Validator.check_schema(s)
 jsonschema.validate(read('gallery/examples/'+name+'.json'),s)
 checks.append('schema_example:'+name)
c=read('gallery/catalog/agents36.json')
assert len(c)==36 and len({x['agent_id'] for x in c})==36
assert set(collections.Counter(x['primary_category'] for x in c).values())=={6}
for x in c:
 jsonschema.validate(x,schemas['CatalogEntry'])
 assert x['availability']=='preview_only' and x['runtime_release_id'] is None and not x['expert_verified']
checks.append('36_unique_6x6_preview_only')
packs=list((r/'gallery/pilot_packs').glob('*.json'));assert len(packs)==12
tasks=read('gallery/benchmarks/tasks.json');assert len(tasks)==36
taskids={t['task_id'] for t in tasks}
for t in tasks:jsonschema.validate(t,schemas['BenchmarkTask'])
for p in packs:
 x=json.loads(p.read_text(encoding='utf-8'));jsonschema.validate(x,schemas['PilotPack'])
 for sid in ['input_schema','output_schema']:jsonschema.Draft202012Validator.check_schema(x[sid])
 assert set(x['benchmark_ids'])<=taskids
 for t in tasks:
  if t['agent_id']==x['agent_id']:jsonschema.validate(t['input'],x['input_schema'])
checks.append('12_packs_36_benchmark_inputs')
for n in read('gallery/examples/negative_cases.json'):
 x=read('gallery/examples/'+n['base']+'.json');x.update(n['patch'])
 try:jsonschema.validate(x,schemas[n['schema']])
 except jsonschema.ValidationError:pass
 else:raise AssertionError(n['case'])
 checks.append('negative:'+n['case'])
for path in ['contracts/openapi.json','contracts/gallery-openapi.json','contracts/asyncapi.json']:
 doc=read(path)
 def walk(v):
  if isinstance(v,dict):
   if '$ref' in v and v['$ref'].startswith('#/'):
    target=doc
    for s in v['$ref'][2:].split('/'):target=target[s.replace('~1','/').replace('~0','~')]
   for x in v.values():walk(x)
  elif isinstance(v,list):
   for x in v:walk(x)
 walk(doc);checks.append('internal_refs:'+path)
assert len(list(r.glob('[0-2][0-9]_*.md')))==28
for b in read('gallery/catalog/bundles.json'):assert set(b['agent_ids'])<={x['agent_id'] for x in c}
report={'status':'PASS','checks':checks,'actual_model':'NOT_RUN','UI_E2E':'NOT_RUN','database_RLS':'NOT_RUN','live_API':'NOT_RUN','official_OpenAPI_AsyncAPI_validator':'NOT_RUN','pilot_quality':'NOT_MEASURED'}
(r/'gallery_validation_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'status':'PASS','checks':len(checks),'catalog':36,'packs':12,'benchmark_inputs':36,'documents':28}))

"""Build a UTF-8 source delivery archive, excluding credentials and runtime files."""
import argparse
import base64
import json
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path)
parser.add_argument('--database', type=Path)
args = parser.parse_args()
if args.database:
    db = json.loads(args.database.read_text())
else:
    bootstrap = json.loads((root / 'cloudflare/generated/bootstrap.json').read_text())
    db = json.loads(base64.b64decode(next(f['body'] for f in bootstrap['files'] if f['path'].endswith('/data/db.json'))))
db['sessions'] = []
db['meta']['syncing'] = False
db['meta']['ophSyncing'] = False
args.output.parent.mkdir(parents=True, exist_ok=True)
excluded_parts = {'node_modules', '.git', '.wrangler', 'private', 'generated', 'deploy-build', 'backups', 'outputs'}
top_dirs = {'src', 'server', 'functions', 'cloudflare', 'dist'}
required = ['server/oph.js', 'server/translate.js', 'cloudflare/worker.js', 'cloudflare/storage.js', 'wrangler.jsonc', 'package-lock.json', '交付文档.md', 'CLOUDFLARE.md']
with zipfile.ZipFile(args.output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in sorted(root.rglob('*')):
        if not file.is_file():
            continue
        rel = file.relative_to(root)
        if any(part in excluded_parts for part in rel.parts):
            continue
        if len(rel.parts) > 1 and rel.parts[0] not in top_dirs and rel.parts[:2] != ('data', 'reports'):
            continue
        if len(rel.parts) > 2 and rel.parts[:2] == ('cloudflare', 'cloudflare'):
            continue
        if file.name in {'.env', '.dev.vars', '.DS_Store'} or file.suffix in {'.log', '.zip', '.pem'} or file.name.startswith('.env.') and file.name != '.env.example':
            continue
        archive.write(file, 'lifesci-hub/' + str(rel))
    archive.writestr('lifesci-hub/data/db.json', json.dumps(db, ensure_ascii=False, indent=2))
with zipfile.ZipFile(args.output) as archive:
    names = archive.namelist()
    assert all('lifesci-hub/' + name in names for name in required)
    assert not any('/private/' in name or name.endswith('/.env') or name.endswith('/.dev.vars') for name in names)
    assert not json.loads(archive.read('lifesci-hub/data/db.json'))['sessions']
    assert archive.testzip() is None
print(json.dumps({'archive': str(args.output), 'files': len(names), 'articles': len(db['articles']), 'bytes': args.output.stat().st_size}, ensure_ascii=False))

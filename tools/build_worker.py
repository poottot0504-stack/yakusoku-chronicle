"""Safely stage *only* public game files for Cloudflare Workers static assets.

Cloudflare Workers supports _headers for static assets; retain these cache rules.
GitHub Actions runs this after all tests and before manual deployment.
"""
from __future__ import annotations
import shutil
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'build' / 'worker'
REQUIRED = ('index.html', 'manifest.webmanifest', 'icon.svg', 'sw.js', '_headers')
OPTIONAL = ('_redirects', '404.html', 'robots.txt', 'favicon.ico')
PUBLIC_DIRS = ('assets', 'src', 'styles')
MAX_FILE_BYTES = 25 * 1024 * 1024
MAX_FILE_COUNT = 20_000

# Stop privileged credentials from being included in published browser assets.
# Public Supabase publishable keys are expected and are deliberately not blocked.
PRIVILEGED_MARKERS = (
    b'sb_secret_',
    b'SUPABASE_SERVICE_ROLE_KEY',
    b'-----BEGIN PRIVATE KEY-----',
    b'-----BEGIN RSA PRIVATE KEY-----',
)
PUBLIC_TEXT_SUFFIXES = {'.js', '.mjs', '.ts', '.html', '.css', '.json', '.svg', '.webmanifest', '.txt'}

def reject_privileged_secrets(files):
    for file in files:
        if file.suffix.lower() not in PUBLIC_TEXT_SUFFIXES:
            continue
        contents = file.read_bytes()
        if any(marker in contents for marker in PRIVILEGED_MARKERS):
            raise ValueError('Privileged credential marker in public asset: ' + str(file))

class ReferenceFinder(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []
    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag in ('script', 'img') and attributes.get('src'):
            self.paths.append(attributes['src'])
        if tag == 'link' and attributes.get('href'):
            self.paths.append(attributes['href'])


def build(root=ROOT, output=OUTPUT):
    root = Path(root).resolve()
    output = Path(output)
    expected = root / 'build' / 'worker'
    if output.absolute() != expected or output.is_symlink() or (root/'build').is_symlink():
        raise ValueError('Refusing to build outside exact build/worker path')
    for f in REQUIRED:
        if not (root/f).is_file():
            raise FileNotFoundError('Missing runtime file: '+f)
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    for f in REQUIRED+OPTIONAL:
        src = root/f
        if src.is_file():
            if src.is_symlink():
                raise ValueError('Symlink in public file: '+f)
            shutil.copy2(src, output/f)
    for folder in PUBLIC_DIRS:
        src = root/folder
        if not src.is_dir() or src.is_symlink():
            raise ValueError('Missing or unsafe runtime folder: '+folder)
        for file in src.rglob('*'):
            if file.is_symlink():
                raise ValueError('Symlink in runtime folder: '+str(file))
            if file.is_file():
                dest = output/file.relative_to(root)
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(file, dest)
    files = [p for p in output.rglob('*') if p.is_file()]
    if len(files)>MAX_FILE_COUNT:
        raise ValueError('Cloudflare Workers static file count exceeded')
    for file in files:
        if file.stat().st_size > MAX_FILE_BYTES:
            raise ValueError('Asset exceeds Cloudflare 25 MiB per-file limit: '+str(file))
    reject_privileged_secrets(files)
    finder = ReferenceFinder()
    finder.feed((output/'index.html').read_text(encoding='utf-8'))
    for ref in finder.paths:
        parts = urlsplit(ref)
        if parts.scheme or parts.netloc or ref.startswith('//') or ref.startswith('#'):
            continue
        relative = unquote(parts.path).lstrip('./')
        if relative and ('..' in Path(relative).parts or not (output/relative).is_file()):
            raise ValueError('Missing/unsafe index.html reference: '+ref)
    if not (output/'src/main.js').is_file():
        raise FileNotFoundError('App entry script missing')
    assert (output/'_headers').is_file()
    assert not (output/'tests').exists() and not (output/'__qa_hunt.html').exists()
    print(f'WORKERS STATIC BUILD OK: {len(files)} files, '
          f'{sum(f.stat().st_size for f in files)/1048576:.2f} MiB')
    return files

if __name__ == '__main__':
    build()

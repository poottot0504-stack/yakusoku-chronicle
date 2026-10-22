"""Checks for browser security headers and privileged-key release safety."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('security_build_worker', ROOT / 'tools' / 'build_worker.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class TestChronicleDefense(unittest.TestCase):
    def test_static_headers_are_safe_and_site_wide(self):
        text = (ROOT / '_headers').read_text(encoding='utf-8')
        blocks = {}
        current = None
        for line in text.splitlines():
            if not line.strip() or line.lstrip().startswith('#'):
                continue
            if line.startswith('/') and not line.startswith(' '):
                current = line.strip()
                blocks[current] = []
            elif current:
                blocks[current].append(line.strip())
        self.assertIn('/*', blocks)
        global_headers = dict(line.split(': ', 1) for line in blocks['/*'])
        self.assertEqual(global_headers['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(global_headers['X-Frame-Options'], 'DENY')
        self.assertEqual(global_headers['Referrer-Policy'], 'no-referrer')
        self.assertIn('geolocation=()', global_headers['Permissions-Policy'])
        csp = global_headers['Content-Security-Policy']
        for directive in ("object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'"):
            self.assertIn(directive, csp)
        # The current game imports CDN JavaScript and reaches Supabase; blocking
        # script-src/connect-src without a full integration test would break it.
        self.assertNotIn('script-src', csp)
        self.assertNotIn('connect-src', csp)
        for path in ('/', '/index.html', '/src/*', '/styles/*', '/sw.js'):
            self.assertIn('Cache-Control: no-store, max-age=0', blocks[path])

    def test_publish_guard_rejects_privileged_secrets(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / 'game.js'
            file.write_text("export const key='sb_publishable_test';", encoding='utf-8')
            builder.reject_privileged_secrets([file])  # Browser key is public.
            for marker in builder.PRIVILEGED_MARKERS:
                with self.subTest(marker=marker):
                    file.write_bytes(b'const token = "' + marker + b'example";')
                    with self.assertRaisesRegex(ValueError, 'Privileged credential'):
                        builder.reject_privileged_secrets([file])

    def test_publish_guard_skips_binary_images(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / 'pixel.png'
            file.write_bytes(b'\\x89PNG' + builder.PRIVILEGED_MARKERS[0])
            builder.reject_privileged_secrets([file])


if __name__ == '__main__':
    unittest.main()

"""Offline automated tests; no Cloudflare credentials/network necessary."""
import importlib.util
import tempfile
import tomllib
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/'tools'/file)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

builder=load('build_worker','build_worker.py')
checker=load('check_worker_project','check_worker_project.py')

def valid_scripts():return {'success':True,'result':[{'id':'another-worker'},{'id':'muddy-credit-f5af'}]}
def valid_subdomain():return {'success':True,'result':{'subdomain':'starload'}}
def valid_worker_url():return {'success':True,'result':{'enabled':True}}

class TestWorkersManualApproval(unittest.TestCase):
    def test_exact_existing_worker_and_host(self):
        self.assertTrue(checker.validate_destination(valid_scripts(),valid_subdomain(),valid_worker_url()))
        self.assertEqual(checker.EXPECTED_HOST,'muddy-credit-f5af.starload.workers.dev')
    def test_refuses_nonexistent_worker(self):
        with self.assertRaises(ValueError):checker.validate_destination({'success':True,'result':[{'id':'other'}]},valid_subdomain(),valid_worker_url())
    def test_refuses_duplicate_worker_entries(self):
        with self.assertRaises(ValueError):checker.validate_destination({'success':True,'result':[{'id':'muddy-credit-f5af'}]*2},valid_subdomain(),valid_worker_url())
    def test_refuses_wrong_account(self):
        with self.assertRaises(ValueError):checker.validate_destination(valid_scripts(),{'success':True,'result':{'subdomain':'another'}},valid_worker_url())
    def test_refuses_disabled_public_worker_url(self):
        with self.assertRaises(ValueError):checker.validate_destination(valid_scripts(),valid_subdomain(),{'success':True,'result':{'enabled':False}})
    def test_refuses_malformed_cloudflare_replies(self):
        for data in ({'success':False,'result':[]},{'success':True,'result':{}}):
            with self.assertRaises(ValueError):checker.validate_destination(data,valid_subdomain(),valid_worker_url())
        with self.assertRaises(ValueError):checker.validate_destination(valid_scripts(),{},valid_worker_url())
        with self.assertRaises(ValueError):checker.validate_destination(valid_scripts(),valid_subdomain(),{})
    def test_worker_configuration_uses_only_existing_target(self):
        data=tomllib.loads((ROOT/'wrangler.toml').read_text())
        self.assertEqual(data['name'],'muddy-credit-f5af')
        self.assertTrue(data['workers_dev'])
        self.assertEqual(data['assets']['directory'],'./build/worker')
        self.assertNotIn('main',data)
        self.assertNotIn('route',data)
        self.assertNotIn('routes',data)
    def test_qa_workflow_never_deploys_or_uses_secrets(self):
        qa=(ROOT/'.github/workflows/check.yml').read_text()
        self.assertNotIn('wrangler-action',qa)
        self.assertNotIn('CLOUDFLARE_API_TOKEN',qa)
        self.assertNotIn('wrangler deploy',qa)
        self.assertNotIn('deploy --config',qa)
    def test_publish_requires_explicit_confirmation_and_main(self):
        wf=(ROOT/'.github/workflows/publish-approved.yml').read_text()
        self.assertIn('workflow_dispatch:',wf)
        self.assertNotIn('\n  push:',wf)
        self.assertIn("github.ref == 'refs/heads/main'",wf)
        self.assertIn("!= 'PUBLISH'",wf)
        self.assertIn('environment: production',wf)
        self.assertIn('needs: verify',wf)
    def test_publish_checks_existing_worker_and_uses_worker_deploy(self):
        wf=(ROOT/'.github/workflows/publish-approved.yml').read_text()
        self.assertIn('python3 tools/check_worker_project.py',wf)
        self.assertIn('cloudflare/wrangler-action@v4',wf)
        self.assertIn('command: deploy --config wrangler.toml',wf)
        self.assertIn('verified-worker-assets',wf)
        self.assertNotIn('pages deploy',wf)
    def test_builder_cannot_overwrite_arbitrary_folders(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(ValueError):builder.build(ROOT,Path(folder))
    def test_worker_build_only_ships_runtime(self):
        files=builder.build()
        names={p.relative_to(builder.OUTPUT).as_posix() for p in files}
        self.assertTrue({'index.html','manifest.webmanifest','_headers','sw.js','src/main.js','styles/main.css'}.issubset(names))
        self.assertTrue(any(x.startswith('assets/') for x in names))
        self.assertFalse(any(x.startswith(('tests/','docs/','maintenance/','.github/','deployment_tests/','tools/','build/')) for x in names))
        self.assertNotIn('__qa_hunt.html',names)
        self.assertFalse(any(x.endswith(('.txt','.md')) for x in names))
        self.assertIn('no-store',(builder.OUTPUT/'_headers').read_text())

if __name__=='__main__':unittest.main()

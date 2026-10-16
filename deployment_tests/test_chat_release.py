"""A chat release cannot be synthesized by user feedback or an ordinary push."""
import importlib.util
import json
import tempfile
import unittest
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('chat_release_guard', ROOT / 'tools' / 'chat_release_guard.py')
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)
OLD = 'a' * 40
NEW = 'b' * 40


def sample():
    return {
        'schema_version': 1,
        'confirm': 'PUBLISH',
        'approved_by': guard.OWNER,
        'source_sha': OLD,
        'target_worker': guard.WORKER,
        'request_id': str(uuid.uuid4()),
    }


def check(doc=None, **kwargs):
    values = dict(actor=guard.OWNER, repository=guard.REPOSITORY,
                  ref='refs/heads/main', event_name='push',
                  event_before=OLD, event_head=NEW, parent_sha=OLD,
                  changed_paths=[guard.REQUEST_PATH])
    values.update(kwargs)
    return guard.verify_request(sample() if doc is None else doc, **values)


class ChatReleaseGuardTests(unittest.TestCase):
    def test_explicit_owner_request_accepted(self):
        self.assertTrue(check())

    def test_feedback_and_non_owner_cannot_authorize(self):
        for actor in ('player', 'github-actions[bot]', '', 'another-user'):
            with self.subTest(actor=actor), self.assertRaises(ValueError):
                check(actor=actor)

    def test_wrong_repo_branch_or_event_rejected(self):
        for values in [dict(repository='other/repo'), dict(ref='refs/heads/feature'), dict(event_name='pull_request')]:
            with self.subTest(values=values), self.assertRaises(ValueError):
                check(**values)

    def test_missing_invalid_or_augmented_request_rejected(self):
        for changes in ({'confirm':'publish'}, {'confirm':'YES'}, {'approved_by':'anyone'},
                        {'source_sha':NEW}, {'target_worker':'other-worker'},
                        {'request_id':'not-a-uuid'}, {'schema_version':2},
                        {'extra':'unsafe'}):
            doc = sample()
            doc.update(changes)
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                check(doc)
        for doc in ({}, [], 'PUBLISH'):
            with self.subTest(doc=doc), self.assertRaises(ValueError):
                check(doc)

    def test_wrong_source_or_event_sha_rejected(self):
        for kwargs in [dict(event_before=NEW), dict(event_head=OLD),
                       dict(event_before='0'*40), dict(parent_sha=NEW),
                       dict(event_head='not-a-sha'), dict(event_before='not-a-sha')]:
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                check(**kwargs)

    def test_approval_only_pushes_request_file(self):
        for paths in [[], ['src/main.js'], [guard.REQUEST_PATH, 'src/main.js'],
                      [guard.REQUEST_PATH, '.github/workflows/publish-chat-approved.yml']]:
            with self.subTest(paths=paths), self.assertRaises(ValueError):
                check(changed_paths=paths)

    def test_new_workflow_is_independent_and_pinned(self):
        new = (ROOT / '.github/workflows/publish-chat-approved.yml').read_text()
        manual = (ROOT / '.github/workflows/publish-approved.yml').read_text()
        self.assertIn("- 'release-requests/approved.json'", new)
        self.assertIn('github.actor ==', new)
        self.assertIn('python3 tools/chat_release_guard.py', new)
        self.assertIn('current=$(curl', new)
        self.assertIn('needs: verify', new)
        self.assertIn('environment: production', new)
        self.assertIn('python3 tools/check_worker_project.py', new)
        self.assertIn('cloudflare/wrangler-action@v4', new)
        self.assertIn('group: chronicle-existing-workers-production', new)
        self.assertNotIn('workflow_dispatch:', new)
        self.assertNotIn('\n  push:', manual)
        self.assertIn("!= 'PUBLISH'", manual)

    def test_json_request_cannot_be_included_in_runtime_assets(self):
        builder = (ROOT / 'tools/build_worker.py').read_text()
        self.assertIn("PUBLIC_DIRS = ('assets', 'src', 'styles')", builder)
        self.assertNotIn("'release-requests'", builder)


if __name__ == '__main__':
    unittest.main()

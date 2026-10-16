"""Fail-closed guard for an explicitly authorized chat release request.

A release is possible only when an account-owner-authored push modifies exactly
release-requests/approved.json on main, and the requested source SHA is the
immediately preceding main commit. Nothing in player feedback is an approval.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import uuid
from pathlib import Path

REPOSITORY = 'poottot0504-stack/yakusoku-chronicle'
OWNER = 'poottot0504-stack'
WORKER = 'muddy-credit-f5af'
REQUEST_PATH = 'release-requests/approved.json'
SHA = re.compile(r'[0-9a-f]{40}\Z')
REQUIRED_KEYS = frozenset(('schema_version', 'confirm', 'approved_by', 'source_sha', 'target_worker', 'request_id'))


def verify_request(doc, *, actor, repository, ref, event_name, event_before, event_head, parent_sha, changed_paths):
    if (actor, repository, ref, event_name) != (OWNER, REPOSITORY, 'refs/heads/main', 'push'):
        raise ValueError('Only an owner-triggered push to main can authorize release')
    if not isinstance(doc, dict) or frozenset(doc) != REQUIRED_KEYS:
        raise ValueError('Unexpected release request schema')
    if doc.get('schema_version') != 1 or isinstance(doc.get('schema_version'), bool):
        raise ValueError('Unknown release request version')
    if doc['confirm'] != 'PUBLISH' or doc['approved_by'] != OWNER or doc['target_worker'] != WORKER:
        raise ValueError('Missing explicit approval or wrong production destination')
    try:
        request_id = doc['request_id']
        if not isinstance(request_id, str) or str(uuid.UUID(request_id, version=4)) != request_id:
            raise ValueError('Bad approval request ID')
    except (AttributeError, TypeError, ValueError) as exc:
        raise ValueError('Bad approval request ID') from exc
    if any(not isinstance(v, str) or not SHA.fullmatch(v)
           for v in (doc['source_sha'], event_before, event_head, parent_sha)):
        raise ValueError('Invalid commit SHA')
    if event_before == '0' * 40 or event_head == event_before:
        raise ValueError('Invalid push event commit range')
    if not (doc['source_sha'] == event_before == parent_sha):
        raise ValueError('Release must target exactly the commit preceding approval')
    if changed_paths != [REQUEST_PATH]:
        raise ValueError('Release approval push must change ONLY the request file')
    return True


def git(args: list[str]) -> str:
    return subprocess.check_output(['git', *args], text=True, stderr=subprocess.DEVNULL).strip()


def main():
    doc = json.loads(Path(REQUEST_PATH).read_text(encoding='utf-8'))
    before = os.environ.get('APPROVAL_EVENT_BEFORE', '')
    head = os.environ.get('APPROVAL_EVENT_SHA', '')
    parent = git(['rev-parse', 'HEAD^'])
    actual_head = git(['rev-parse', 'HEAD'])
    if head != actual_head:
        raise ValueError('Checked out revision does not match triggering commit')
    changes = git(['diff', '--name-only', parent, head]).splitlines()
    verify_request(
        doc,
        actor=os.environ.get('APPROVAL_ACTOR', ''),
        repository=os.environ.get('APPROVAL_REPOSITORY', ''),
        ref=os.environ.get('APPROVAL_REF', ''),
        event_name=os.environ.get('APPROVAL_EVENT_NAME', ''),
        event_before=before,
        event_head=head,
        parent_sha=parent,
        changed_paths=changes,
    )
    print('Explicit owner approval validated: commit', before, '-> worker', WORKER)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError, json.JSONDecodeError) as exc:
        print('CHAT RELEASE BLOCKED:', str(exc), file=sys.stderr)
        raise SystemExit(1) from exc

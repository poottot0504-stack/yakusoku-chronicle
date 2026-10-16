"""Fail closed unless CI would deploy to THE current existing workers.dev URL.

The production environment stores CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
This check never mutates Cloudflare. All other deployment secrets stay in GitHub.
"""
from __future__ import annotations
import json
import os
import re
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

EXPECTED_NAME = 'muddy-credit-f5af'
EXPECTED_SUBDOMAIN = 'starload'
EXPECTED_HOST = f'{EXPECTED_NAME}.{EXPECTED_SUBDOMAIN}.workers.dev'


def validate_destination(script_list, subdomain_payload, worker_subdomain_payload):
    if not script_list.get('success') or not isinstance(script_list.get('result'),list):
        raise ValueError('Unable to verify existing Worker list')
    matches = [s for s in script_list['result']
               if isinstance(s, dict) and s.get('id') == EXPECTED_NAME]
    if len(matches)!=1:
        raise ValueError('Existing target Worker not found. Aborting: will not create a new Worker')
    if not subdomain_payload.get('success') or not isinstance(subdomain_payload.get('result'),dict):
        raise ValueError('Cannot verify Cloudflare account subdomain')
    actual = subdomain_payload['result'].get('subdomain')
    if actual != EXPECTED_SUBDOMAIN:
        raise ValueError(f'Wrong account subdomain: {actual!r}. Expected {EXPECTED_SUBDOMAIN!r}')
    if not worker_subdomain_payload.get('success') or not isinstance(worker_subdomain_payload.get('result'),dict):
        raise ValueError('Cannot verify existing Workers URL')
    if worker_subdomain_payload['result'].get('enabled') is not True:
        raise ValueError('Existing Worker is not currently enabled on workers.dev')
    return True


def get_cloudflare_json(base, path, token):
    req = Request(base+path, headers={'Authorization':'Bearer '+token, 'Accept':'application/json'})
    try:
        with urlopen(req,timeout=25) as response:
            return json.load(response)
    except (HTTPError,URLError) as e:
        raise RuntimeError('Cloudflare account/Worker verification failed, publication blocked') from e


def main():
    token = os.environ.get('CLOUDFLARE_API_TOKEN', '')
    account_id = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '')
    if not token or not re.fullmatch(r'[a-fA-F0-9]{32}', account_id):
        raise ValueError('Missing or invalid Cloudflare token/account ID')
    base = 'https://api.cloudflare.com/client/v4/accounts/'+account_id
    scripts = get_cloudflare_json(base, '/workers/scripts',token)
    subdomain = get_cloudflare_json(base,'/workers/subdomain',token)
    worker_subdomain = get_cloudflare_json(base,'/workers/scripts/'+EXPECTED_NAME+'/subdomain',token)
    validate_destination(scripts,subdomain,worker_subdomain)
    print('Verified existing Worker and exact account subdomain: https://'+EXPECTED_HOST+'/')

if __name__=='__main__':
    try:main()
    except Exception as exc:
        print('PRODUCTION DEPLOY BLOCKED:',str(exc),file=sys.stderr)
        sys.exit(1)

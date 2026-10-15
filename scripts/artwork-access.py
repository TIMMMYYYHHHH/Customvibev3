#!/usr/bin/env python3
"""Temporary, destination-only deployment access. Credentials remain in memory."""
import getpass, json, os, pathlib, re, socketserver, subprocess, sys, urllib.error, urllib.request

ACCOUNT = '4f57d4e924674cb87b33d4c884745cf6'
ROOT = pathlib.Path(__file__).resolve().parents[1]
NODE = pathlib.Path('/Users/timothymorton/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')
SOCKET = pathlib.Path('/private/tmp/customvibe-artwork-access.sock')
TOKEN = ''

def api(path, method='GET', body=None):
    if path != 'accounts/' + ACCOUNT and not path.startswith('accounts/' + ACCOUNT + '/'):
        raise ValueError('Wrong account')
    if method != 'GET':
        raise ValueError('Only read-only API checks allowed')
    req = urllib.request.Request('https://api.cloudflare.com/client/v4/' + path, headers={'Authorization': 'Bearer ' + TOKEN})
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        return {'success': False, 'status': error.code}

def sanitize(value):
    if isinstance(value, list): return [sanitize(item) for item in value]
    if isinstance(value, dict):
        secret = value.get('type') in ('secret_text', 'secret_key')
        return {key: sanitize(item) for key, item in value.items() if key not in ('token', 'secret', 'secret_key', 'api_key', 'oauth_token', 'refresh_token') and not (secret and key in ('value', 'text'))}
    return value

def handle(data):
    if data.get('op') == 'status': return {'ready': True, 'account': ACCOUNT}
    if data.get('account') != ACCOUNT: raise ValueError('Wrong account')
    if data.get('op') == 'api': return sanitize(api(data['path'], data.get('method', 'GET')))
    args = data.get('args', [])
    allowed = [
        ['deploy', '--config', 'wrangler.security.jsonc'],
        ['deploy', '--config', 'wrangler.admin.jsonc'],
        ['d1', 'migrations', 'apply', 'customvibe-security', '--config', 'wrangler.security.jsonc', '--remote'],
        ['d1', 'migrations', 'list', 'customvibe-security', '--config', 'wrangler.security.jsonc', '--remote'],
    ]
    if data.get('op') != 'wrangler' or args not in allowed: raise ValueError('Operation is not allowed')
    for config in ['wrangler.security.jsonc', 'wrangler.admin.jsonc']:
        if json.loads((ROOT/config).read_text()).get('account_id') != ACCOUNT: raise ValueError('Configuration account mismatch')
    env = {**os.environ, 'PATH': str(NODE.parent)+':'+os.environ.get('PATH', ''), 'CLOUDFLARE_ACCOUNT_ID': ACCOUNT, 'CLOUDFLARE_API_TOKEN': TOKEN, 'WRANGLER_SEND_METRICS': 'false', 'CI': 'true'}
    for key in ['CLOUDFLARE_API_KEY', 'CLOUDFLARE_EMAIL', 'CLOUDFLARE_PROFILE']: env.pop(key, None)
    result = subprocess.run([str(NODE), str(ROOT/'node_modules/wrangler/bin/wrangler.js'), *args], cwd=ROOT, env=env, capture_output=True, text=True, timeout=300)
    return {'exit_code': result.returncode, 'output': (result.stdout+result.stderr).replace(TOKEN, '[REDACTED]')[-18000:]}

class Handler(socketserver.StreamRequestHandler):
    def handle(self):
        try: result = handle(json.loads(self.rfile.readline(65536)))
        except Exception: result = {'success': False, 'error': 'Operation failed; no credential details shown'}
        self.wfile.write((json.dumps(result)+'\n').encode())

if __name__ == '__main__':
    if not sys.stdin.isatty(): raise SystemExit('Run this file in your own Terminal.')
    if SOCKET.exists(): raise SystemExit('An access helper already exists. Ask Codex to check it.')
    print('CustomVibe private artwork: business Cloudflare account only.')
    print('This opens temporary local access for the approved database and Worker deployments.')
    TOKEN = getpass.getpass('Business Cloudflare API token (hidden): ').strip()
    if not re.fullmatch(r'[A-Za-z0-9_-]{20,256}', TOKEN): raise SystemExit('Token format not recognized.')
    result = api('accounts/' + ACCOUNT)
    if not result.get('success') or result.get('result', {}).get('id') != ACCOUNT: raise SystemExit('Business account verification failed. No changes made.')
    os.umask(0o077)
    with socketserver.UnixStreamServer(str(SOCKET), Handler) as server:
        SOCKET.chmod(0o600)
        print('READY. Tell Codex the helper is ready. Leave this window open; Ctrl+C ends access.')
        try: server.serve_forever()
        except KeyboardInterrupt: pass
        finally:
            TOKEN = ''
            SOCKET.unlink(missing_ok=True)

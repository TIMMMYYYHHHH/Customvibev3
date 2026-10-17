import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location('access', Path(__file__).resolve().parents[2] / 'scripts/artwork-access.py')
access = importlib.util.module_from_spec(spec)
spec.loader.exec_module(access)

class AccessTests(unittest.TestCase):
    def test_failed_request_returns_status_and_numeric_codes_without_server_message(self):
        error = HTTPError('https://api.cloudflare.com', 401, 'Unauthorized', {}, io.BytesIO(json.dumps({'errors':[{'code':10000,'message':'secret must not be printed'}]}).encode()))
        with patch.object(access.urllib.request, 'urlopen', side_effect=error):
            result = access.api('accounts/' + access.ACCOUNT)
        self.assertEqual(result, {'success':False,'status':401,'codes':[10000]})
        self.assertNotIn('secret', json.dumps(result))

    def check_results(self, account, worker):
        paths = []
        def request(path):
            paths.append(path)
            return account if path == 'accounts/' + access.ACCOUNT else worker
        result = access.check_access(request)
        self.assertEqual(paths, ['accounts/' + access.ACCOUNT, 'accounts/' + access.ACCOUNT + '/workers/scripts/customvibe-admin/settings'])
        return result

    def test_valid_business_account_and_admin_allow_connection(self):
        ok, lines = self.check_results({'success':True,'result':{'id':access.ACCOUNT}}, {'success':True,'result':{'bindings':[{'text':'private-value'}]}})
        self.assertTrue(ok)
        self.assertNotIn('private-value', str(lines))

    def test_wrong_identity_still_rejects_connection(self):
        ok, lines = self.check_results({'success':True,'result':{'id':'other'}}, {'success':True})
        self.assertFalse(ok)
        self.assertIn('Account identity did not match', str(lines))

    def test_401_has_actionable_but_not_definitive_diagnosis(self):
        ok, lines = self.check_results({'success':False,'status':401,'codes':[10000]}, {'success':False,'status':401})
        self.assertFalse(ok)
        self.assertIn('HTTP 401; Cloudflare code 10000', str(lines))
        self.assertIn('copied in full', str(lines))

    def test_account_access_does_not_hide_admin_permission_failure(self):
        ok, lines = self.check_results({'success':True,'result':{'id':access.ACCOUNT}}, {'success':False,'status':403})
        self.assertFalse(ok)
        self.assertIn('Existing admin check: HTTP 403', str(lines))

    def test_failed_account_check_is_not_bypassed(self):
        ok, lines = self.check_results({'success':False,'status':403}, {'success':True})
        self.assertFalse(ok)

    def test_network_error_is_distinct_from_token_error(self):
        ok, lines = self.check_results({'success':False,'network_error':True}, {'success':False,'network_error':True})
        self.assertFalse(ok)
        self.assertIn('Could not reach Cloudflare', str(lines))

if __name__ == '__main__': unittest.main()

"""Creates a login line for js/auth.js.
Usage: python scripts/make_user.py <username>      (it asks for the password; nothing is stored on disk)
Paste the printed line inside USERS = { ... } in js/auth.js (separate multiple users with commas)."""
import sys, getpass, hashlib, secrets

if len(sys.argv) < 2:
    sys.exit(__doc__)
user = sys.argv[1].strip().lower()
pw = getpass.getpass('Password for %s: ' % user)
if len(pw) < 8:
    sys.exit('Use at least 8 characters.')
salt = secrets.token_hex(8)
digest = hashlib.sha256(('%s:%s:%s' % (salt, user, pw)).encode('utf-8')).hexdigest()
print("    '%s': { salt: '%s', hash: '%s' }" % (user, salt, digest))

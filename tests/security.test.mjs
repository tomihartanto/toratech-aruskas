import test from 'node:test';
import assert from 'node:assert/strict';
const security = await import('../src/lib/security.ts').catch(() => ({}));
test('passwords use salted hashes and reject wrong passwords', async () => {
 assert.equal(typeof security.hashPassword, 'function');
 const a = await security.hashPassword('a secure test password');
 const b = await security.hashPassword('a secure test password');
 assert.notEqual(a,b);
 assert.equal(await security.checkPassword('a secure test password',a),true);
 assert.equal(await security.checkPassword('wrong',a),false);
});

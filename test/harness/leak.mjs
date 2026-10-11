// Used by harness.test.mjs: a test that fails and never closes its browser, like a real failing test can.
import { test } from 'node:test';
import { browser } from './cdp.mjs';

test('fails with a browser still open', async () => {
  const b = await browser();
  await b.open('webtoon.html');
  process.stdout.write(`profile:${b.profile}\n`);
  throw new Error('deliberate');
});

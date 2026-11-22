import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForPagesArtifact } from '../scripts/wait-for-pages-artifact.mjs';

const ready = { id: 14754710068, name: 'github-pages', size: 1528938 };
function scenario(sequence, expectedId = ready.id) {
  let calls = 0;
  const sleeps = [];
  const run = () => waitForPagesArtifact({
    expectedId,
    delays: [2, 4, 8],
    sleep: async ms => { sleeps.push(ms); },
    listArtifacts: async () => {
      const value = sequence[Math.min(calls++, sequence.length - 1)];
      if (value instanceof Error) throw value;
      return value;
    }
  });
  return { run, sleeps, calls: () => calls };
}

test('uploaded artifact can appear after initially empty metadata, matching the production failure', async () => {
  const s = scenario([{ artifacts: [] }, { artifacts: [] }, { artifacts: [ready] }]);
  assert.equal(await s.run(), ready);
  assert.deepEqual(s.sleeps, [2, 4]);
  assert.equal(s.calls(), 3);
});
test('visible artifact proceeds immediately without a fixed publication delay', async () => {
  const s = scenario([{ artifacts: [ready] }]);
  assert.equal(await s.run(), ready);
  assert.deepEqual(s.sleeps, []);
});
test('QA can verify its real preview artifact without making a Pages deployment', async () => {
  const preview = { ...ready, name: 'web-preview-test-sha' };
  const artifact = await waitForPagesArtifact({ expectedId: ready.id, name: preview.name, listArtifacts: async () => ({ artifacts: [preview] }), sleep: async () => { assert.fail('Visible preview must not wait'); } });
  assert.equal(artifact, preview);
});
test('missing metadata eventually blocks deployment instead of succeeding silently', async () => {
  const s = scenario([{ artifacts: [] }]);
  await assert.rejects(s.run(), /did not become visible/);
  assert.equal(s.calls(), 4);
  assert.deepEqual(s.sleeps, [2, 4, 8]);
});
test('same-name metadata from a different upload never authorizes deployment', async () => {
  const s = scenario([{ artifacts: [{ ...ready, id: 22 }] }]);
  await assert.rejects(s.run(), /did not become visible/);
});
test('unrelated artifacts do not interfere with selecting the exact uploaded file', async () => {
  const s = scenario([{ artifacts: [{ ...ready, name: 'diagnostics' }, ready] }]);
  assert.equal(await s.run(), ready);
});
test('duplicate Pages artifacts block before the official deploy action can select one', async () => {
  const s = scenario([{ artifacts: [ready, { ...ready, id: 23 }] }]);
  await assert.rejects(s.run(), /Multiple artifacts/);
  assert.equal(s.calls(), 1);
  assert.deepEqual(s.sleeps, []);
});
test('empty artifact cannot be published but can become ready on a later check', async () => {
  const s = scenario([{ artifacts: [{ ...ready, size: 0 }] }, { artifacts: [ready] }]);
  assert.equal(await s.run(), ready);
  assert.deepEqual(s.sleeps, [2]);
});
for (const status of [401, 403, 404]) {
  test(`HTTP ${status} fails immediately without hiding an access/configuration failure`, async () => {
    const s = scenario([Object.assign(new Error('request failed'), { status }), { artifacts: [ready] }]);
    await assert.rejects(s.run(), /failed permanently/);
    assert.equal(s.calls(), 1);
    assert.deepEqual(s.sleeps, []);
  });
}
for (const error of [Object.assign(new Error('request failed'), { status: 503 }), new Error('Failed request: (429)'), Object.assign(new Error('socket failed'), { code: 'ECONNRESET' })]) {
  test(`temporary service failure recovers: ${error.status ?? error.code ?? '429'}`, async () => {
    const s = scenario([error, { artifacts: [ready] }]);
    assert.equal(await s.run(), ready);
    assert.deepEqual(s.sleeps, [2]);
  });
}
test('persistent service failure has bounded retries', async () => {
  const s = scenario([Object.assign(new Error('service unavailable'), { status: 503 })]);
  await assert.rejects(s.run(), /remained unavailable/);
  assert.equal(s.calls(), 4);
});
test('missing upload ID blocks without querying the artifact service', async () => {
  const s = scenario([{ artifacts: [ready] }], '');
  await assert.rejects(s.run(), /valid artifact ID/);
  assert.equal(s.calls(), 0);
});
for (const response of [{}, undefined, null]) {
  test(`invalid metadata blocks deployment: ${String(response)}`, async () => {
    const s = scenario([response]);
    await assert.rejects(s.run(), /invalid metadata/);
    assert.equal(s.calls(), 1);
    assert.deepEqual(s.sleeps, []);
  });
}

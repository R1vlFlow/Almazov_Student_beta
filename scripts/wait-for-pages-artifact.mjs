import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const visibilityDelays = [2000, 4000, 8000, 16000, 16000, 16000, 16000];
const transientCodes = new Set(['ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET']);

function transient(error) {
  const status = Number(error?.statusCode ?? error?.status ?? error?.response?.status);
  return status === 429 || (status >= 500 && status <= 599)
    || transientCodes.has(error?.code) || transientCodes.has(error?.cause?.code)
    || /Failed request: \((429|5\d\d)\)/.test(error?.message ?? '');
}

/** Read the same run-scoped artifact service as deploy-pages before it creates a deployment. */
export async function waitForPagesArtifact({ listArtifacts, expectedId, name = 'github-pages', sleep = delay, delays = visibilityDelays, info = () => {} }) {
  const expected = String(expectedId ?? '');
  if (!/^[1-9]\d*$/.test(expected) || !Number.isSafeInteger(Number(expected))) {
    throw new Error('Pages artifact upload did not return a valid artifact ID. Deployment blocked.');
  }
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    let response;
    let received = false;
    try {
      response = await listArtifacts();
      received = true;
    } catch (error) {
      // Retry only temporary transport/service failures. Never retry authentication failures.
      if (!transient(error)) throw new Error('Pages artifact metadata request failed permanently. Check Actions access and service diagnostics.', { cause: error });
      if (attempt === delays.length) throw new Error('Pages artifact service remained unavailable. Deployment blocked; rerun this workflow later.', { cause: error });
      info(`Pages artifact service is temporarily unavailable (attempt ${attempt + 1}).`);
    }
    if (received) {
      if (!Array.isArray(response?.artifacts)) throw new Error('Pages artifact service returned invalid metadata. Deployment blocked.');
      const matches = response.artifacts.filter(artifact => artifact.name === name);
      if (matches.length > 1) throw new Error(`Multiple artifacts named "${name}" found. Deployment blocked to prevent selecting the wrong build.`);
      const artifact = matches[0];
      if (artifact && String(artifact.id) === expected && Number(artifact.size) > 0) {
        info(`Pages artifact ${expected} is visible and non-empty. Deployment may proceed.`);
        return artifact;
      }
      if (attempt === delays.length) throw new Error(`Uploaded Pages artifact ${expected} did not become visible as a unique non-empty "${name}" artifact. Deployment blocked; rerun this workflow later.`);
      info(`Waiting for uploaded Pages artifact ${expected} (attempt ${attempt + 1}).`);
    }
    await sleep(delays[attempt]);
  }
}

export async function runFromEnvironment({ env = process.env, info = message => console.log(message) } = {}) {
  // GitHub exposes the run-scoped artifact credentials to JavaScript actions, not shell steps.
  if (!env.ACTIONS_RUNTIME_TOKEN || !env.ACTIONS_RESULTS_URL) {
    throw new Error('Artifact readiness must run inside a GitHub JavaScript action with run-scoped artifact access.');
  }
  const { DefaultArtifactClient } = await import('@actions/artifact');
  const client = new DefaultArtifactClient();
  return waitForPagesArtifact({ listArtifacts: () => client.listArtifacts(), expectedId: env.PAGES_ARTIFACT_ID, name: env.PAGES_ARTIFACT_NAME ?? 'github-pages', info });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runFromEnvironment();
  } catch (error) {
    // Do not print request objects, headers or runtime credentials from SDK errors.
    console.error(error.message);
    process.exitCode = 1;
  }
}

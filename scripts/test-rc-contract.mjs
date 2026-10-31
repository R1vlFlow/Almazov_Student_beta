import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const read = path => readFile(join(root, path), 'utf8');
const json = async path => JSON.parse(await read(path));
const checks = [];
async function check(name, fn) {
  try { await fn(); checks.push([name, true]); }
  catch (error) { checks.push([name, false]); console.error(`FAIL — ${name}: ${error.message}`); }
}
const [pkg, manifest, runtime, html, boot, telemetry, capacitor, previewWorkflow, signedReleaseWorkflow, pagesWorkflow, qaWorkflow, syncWorkflow, engineVersionFile, parserDoc, installDoc, rcDoc, faq] = await Promise.all([
  json('package.json'), json('public/manifest.webmanifest'), read('public/runtime-config.js'), read('public/index.html'),
  read('public/boot.js'), read('public/telemetry.js'), json('capacitor.config.json'), read('.github/workflows/build-apk.yml'), read('.github/workflows/release-android.yml'),
  read('.github/workflows/pages.yml'), read('.github/workflows/qa.yml'), read('.github/workflows/sync-official-schedules.yml'), read('SCHEDULE_ENGINE_VERSION.txt'), read('docs/PRODUCTION_READINESS_RC.md'),
  read('docs/ANDROID_INSTALL.md'), read('docs/PRODUCTION_READINESS_RC.md'), read('src/ui/faq.ts')
]);

await check('RC version is marked pre-release', () => assert.match(pkg.version, /-rc\./));
await check('Schedule engine version is aligned with sync workflow', () => {
  assert.match(engineVersionFile, /^Almazov Student schedule engine: 4\.9\.0-rc\.1/m);
  assert.match(syncWorkflow, /SCHEDULE_ENGINE_VERSION: '4\.9\.0-rc\.1'/);
  assert.match(syncWorkflow, /verify_engine_version\.py/);
});
await check('PWA manifest uses standalone and project-relative scope', () => {
  assert.equal(manifest.display, 'standalone'); assert.equal(manifest.scope, './'); assert.match(manifest.start_url, /^\.\//);
});
await check('PWA manifest declares all three valid icons', () => {
  for (const [path, size] of [['public/assets/pwa-192.png',192],['public/assets/pwa-512.png',512],['public/assets/pwa-maskable-512.png',512]]) {
    const icon = manifest.icons.find(item => item.src === path.replace('public/','') && item.sizes === `${size}x${size}`);
    assert.ok(icon, `${path} missing from manifest`);
  }
});
await check('PWA install UI and platform instructions are present', () => {
  assert.match(html, /data-install-pwa/); assert.match(html, /id="installHelpDialog"/);
  assert.match(html, /На экран/); assert.match(html, /Safari/); assert.match(boot, /beforeinstallprompt/);
});
await check('Android install UI points to the current project and discloses release availability', () => {
  assert.match(html, /data-android-releases/);
  assert.match(html, /github\.com\/R1vlFlow\/Almazov_Student_beta\/releases/);
  assert.doesNotMatch(html, /r1vlflow\/Zalma\/releases\/download/);
  assert.match(installDoc, /подписаны постоянным ключом проекта/);
  assert.match(html, /data-download-apk href="https:\/\/github\.com\/R1vlFlow\/Almazov_Student_beta\/releases\/download\/v3\.2\.1\/Almazov-Student-3\.2\.1\.apk"/);
  assert.match(installDoc, /Предварительные сборки.*предназначены для тестирования, а не для установки вместо версии студентов/);
});
await check('Capacitor packages and config match the web build', () => {
  assert.equal(pkg.dependencies['@capacitor/core'], '8.5.3');
  assert.equal(pkg.dependencies['@capacitor/android'], '8.5.3');
  assert.equal(pkg.devDependencies['@capacitor/cli'], '8.5.3');
  assert.equal(capacitor.webDir, 'dist'); assert.equal(capacitor.server.cleartext, false);
});
await check('Android preview is QA-only and signed release is separate', () => {
  assert.match(previewWorkflow, /Assemble QA-only APK/);
  assert.match(previewWorkflow, /Almazov-Student-PREVIEW\.apk/);
  assert.match(previewWorkflow, /not-for-upgrade/);
  assert.match(previewWorkflow, /upload-artifact@v4/);
  assert.doesNotMatch(previewWorkflow, /gh release upload/);
  assert.match(signedReleaseWorkflow, /Load permanent signing key/);
  assert.match(signedReleaseWorkflow, /ANDROID_KEYSTORE_BASE64/);
  assert.match(signedReleaseWorkflow, /assembleRelease bundleRelease/);
  assert.ok(signedReleaseWorkflow.indexOf('run: npm run sync:official') < signedReleaseWorkflow.indexOf('run: npm run qa'));
  assert.match(signedReleaseWorkflow, /REQUIRE_SPECIALIST_SNAPSHOT:\s*[\"']?1/);
});
await check('Release workflows require minification', () => {
  assert.match(pagesWorkflow, /REQUIRE_MINIFICATION:\s*["']?1/);
  assert.match(qaWorkflow, /REQUIRE_MINIFICATION:\s*["']?1/);
  assert.match(syncWorkflow, /REQUIRE_MINIFICATION:\s*["']?1/);
  assert.match(signedReleaseWorkflow, /REQUIRE_MINIFICATION:\s*["']?1/);
  assert.match(pkg.scripts['build:rc'], /REQUIRE_MINIFICATION=1/);
});
await check('Client error capture is privacy-preserving and remote IDs are not fabricated', () => {
  assert.match(telemetry, /unhandledrejection/); assert.match(telemetry, /sendRemote/);
  assert.match(telemetry, /navigation_/); assert.match(telemetry, /never send names, task text, file names or form values/);
  assert.match(runtime, /googleAnalyticsId:\s*''/); assert.match(runtime, /yandexMetrikaId:\s*''/);
  assert.match(rcDoc, /disabled by default/i);
});
await check('SEO and social-share metadata are present', () => {
  assert.match(html, /name="description"/); assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/); assert.match(html, /name="viewport"/);
  assert.match(html, /rel="apple-touch-icon"/);
});
await check('Install FAQ and HTTPS Telegram support are documented', () => {
  assert.match(html, /https:\/\/t\.me\/R1vlFlow_GY/);
  assert.match(faq, /Как установить приложение на Android/);
  assert.match(faq, /Как добавить приложение на экран iPhone/);
});
await check('Production documentation discloses APK signing and API requirements', () => {
  assert.match(rcDoc, /debug-signed APK/); assert.match(rcDoc, /Node backend/);
  assert.match(parserDoc, /synthetic Stream A matrix regression fixture/i);
});
await check('Page and QA workflows install Python parser dependencies', () => {
  for (const [name, body] of [['pages',pagesWorkflow],['qa',qaWorkflow],['Android preview',previewWorkflow],['Android signed release',signedReleaseWorkflow],['sync',syncWorkflow]]) {
    assert.match(body, /setup-python@v5/, `${name}: setup-python missing`);
    assert.match(body, /requirements-official-sync\.txt/, `${name}: parser requirements missing`);
  }
});
await check('Official ingestion workflows install Russian OCR for scanned/image sources', async () => {
  const source = await read('scripts/build_official_schedule.py');
  assert.match(source, /if fmt == 'image':[\s\S]*?pytesseract\.image_to_string/);
  for (const [name, body] of [['pages', pagesWorkflow], ['sync', syncWorkflow]]) {
    assert.match(body, /tesseract-ocr-rus/, `${name}: Russian OCR language pack missing`);
    assert.match(body, /tesseract-ocr(?:\s|$)/, `${name}: Tesseract engine missing`);
  }
});
await check('Workflow caches do not require lockfiles/wrappers absent before dependency scaffolding', () => {
  for (const body of [previewWorkflow,signedReleaseWorkflow]) {
    assert.doesNotMatch(body, /cache:\s*npm/);
    assert.doesNotMatch(body, /cache:\s*gradle/);
  }
});
await check('PWA assets exist and match manifest dimensions', async () => {
  for (const [path,size] of [['public/assets/pwa-192.png',192],['public/assets/pwa-512.png',512],['public/assets/pwa-maskable-512.png',512]]) {
    const image = await readFile(join(root,path));
    assert.equal(image.readUInt32BE(16),size); assert.equal(image.readUInt32BE(20),size);
    await stat(join(root,path));
  }
});
await check('Frontend does not hardcode localhost API URLs', async () => {
  async function walk(dir) {
    const result=[];
    for (const entry of await readdir(join(root,dir),{withFileTypes:true})) {
      const path=join(dir,entry.name);
      if (entry.isDirectory()) result.push(...await walk(path));
      else if (/\.(?:ts|js|html|css)$/i.test(entry.name)) result.push(path);
    }
    return result;
  }
  for (const path of [...await walk('src'),...await walk('public')]) {
    const contents=await read(path);
    assert.doesNotMatch(contents,/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i,`${path} contains a development API origin`);
  }
});
const failures = checks.filter(([,ok])=>!ok);
for (const [name,ok] of checks) if(ok) console.log(`PASS — ${name}`);
console.log(`RC CONTRACT: ${checks.length-failures.length}/${checks.length} passed`);
if (failures.length) process.exit(1);

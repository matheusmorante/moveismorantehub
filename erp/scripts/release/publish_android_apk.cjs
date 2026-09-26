#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { File } = require('node:buffer');
const { createClient } = require('@supabase/supabase-js');
const { Upload } = require('tus-js-client');

const PROJECT_REF = 'hkoxhourxwlddgsfdgws';
const BUCKET = 'releases';
const APK_OBJECT_PATH = 'android/latest/morantehub.apk';
const APK_MIME_TYPE = 'application/vnd.android.package-archive';
const BUCKET_FILE_LIMIT = 200 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 900;
const REPO_ROOT = path.resolve(__dirname, '../../..');
const DEFAULT_APK = path.join(REPO_ROOT, 'mobile/android/app/build/outputs/apk/release/app-release.apk');
const LOCK_PATH = path.join(os.tmpdir(), `morantehub-android-release-${PROJECT_REF}.lock`);

function fail(message) {
  throw new Error(message);
}

function readAppRelease() {
  const appJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'mobile/app.json'), 'utf8')).expo;
  const versionSource = fs.readFileSync(path.join(REPO_ROOT, 'mobile/src/constants/appVersion.ts'), 'utf8');
  const gradleSource = fs.readFileSync(path.join(REPO_ROOT, 'mobile/android/app/build.gradle'), 'utf8');
  const appVersion = versionSource.match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1];
  const appBuild = Number(versionSource.match(/APP_BUILD\s*=\s*(\d+)/)?.[1]);
  const gradleVersion = gradleSource.match(/versionName\s+"([^"]+)"/)?.[1];
  const gradleBuild = Number(gradleSource.match(/versionCode\s+(\d+)/)?.[1]);
  const buildNumber = Number(appJson.android?.versionCode);

  if (!appJson.version || appJson.runtimeVersion !== appJson.version || !buildNumber) {
    fail('Expo version, runtimeVersion, or Android versionCode is missing or inconsistent.');
  }
  if (appVersion !== appJson.version || gradleVersion !== appJson.version
      || appBuild !== buildNumber || gradleBuild !== buildNumber) {
    fail('Android release versions differ between app.json, appVersion.ts, and build.gradle.');
  }

  const minimumBuild = Number(process.env.ANDROID_MIN_SUPPORTED_BUILD || buildNumber);
  if (!Number.isSafeInteger(minimumBuild) || minimumBuild <= 0 || minimumBuild > buildNumber) {
    fail('ANDROID_MIN_SUPPORTED_BUILD must be a positive build no higher than the current build.');
  }

  return {
    version: appJson.version,
    buildNumber,
    minimumBuild,
    mandatory: process.env.ANDROID_RELEASE_MANDATORY === 'true',
    notes: process.env.ANDROID_RELEASE_NOTES
      || 'Atualização com checagem de versão, download seguro e instalação assistida; inclui correções no inventário.',
  };
}

function runSdkTool(sdkTool, args, apkPath) {
  if (!fs.existsSync(sdkTool)) fail(`Android SDK tool not found: ${sdkTool}`);
  const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
  const psCommand = `& ${quote(sdkTool)} ${[...args, apkPath].map(quote).join(' ')}`;
  const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', psCommand], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    fail(`Android validation failed for ${path.basename(sdkTool)}.`);
  }
  return `${result.stdout || ''}\n${result.stderr || ''}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('Picked up JAVA_TOOL_OPTIONS:'));
}

function validateLocalApk(apkPath, release) {
  if (!fs.existsSync(apkPath)) fail(`APK not found: ${apkPath}`);
  const stats = fs.statSync(apkPath);
  if (!stats.isFile() || stats.size <= 0) fail('The selected APK is empty or is not a file.');
  const header = Buffer.alloc(4);
  const file = fs.openSync(apkPath, 'r');
  fs.readSync(file, header, 0, header.length, 0);
  fs.closeSync(file);
  if (header[0] !== 0x50 || header[1] !== 0x4b) fail('The selected file is not a valid APK/ZIP archive.');

  const sourcePaths = [
    'mobile/app.json',
    'mobile/android/app/build.gradle',
    'mobile/android/app/src/main/AndroidManifest.xml',
    'mobile/src/constants/appVersion.ts',
    'mobile/App.tsx',
    'mobile/src/hooks/useMandatoryAppUpdate.ts',
    'mobile/src/components/modals/MandatoryUpdateModal.tsx',
    'mobile/src/utils/barcodeScannerUtils.ts',
    'mobile/src/features/stock/inventory/hooks/useInventoryAuditWorkflow.ts',
    'mobile/src/features/stock/inventory/screens/InventoryScannerScreen.tsx',
  ].map((relative) => path.join(REPO_ROOT, relative));
  const newestSourceMtime = Math.max(...sourcePaths.map((source) => fs.statSync(source).mtimeMs));
  if (stats.mtimeMs < newestSourceMtime) {
    fail('The APK predates the current app sources. Build a release APK from this working tree first.');
  }

  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || 'H:\\Android\\Sdk';
  const analyzer = path.join(sdkRoot, 'cmdline-tools', 'latest', 'bin', 'apkanalyzer.bat');
  const signer = path.join(sdkRoot, 'build-tools', '36.0.0', 'apksigner.bat');
  const actualVersion = runSdkTool(analyzer, ['manifest', 'version-name'], apkPath).at(-1);
  const actualBuild = Number(runSdkTool(analyzer, ['manifest', 'version-code'], apkPath).at(-1));
  if (actualVersion !== release.version || actualBuild !== release.buildNumber) {
    fail(`APK version/build (${actualVersion}/${actualBuild}) does not match the configured release.`);
  }
  runSdkTool(signer, ['verify'], apkPath);

  return stats.size;
}

async function sha256File(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

function getAndroidApkPaths(storage, prefix) {
  return (async function walk(folder) {
    const apkPaths = [];
    let offset = 0;
    while (true) {
      const { data, error } = await storage.list(folder, { limit: 1000, offset });
      if (error) throw error;
      const entries = data || [];
      for (const entry of entries) {
        const objectPath = `${folder}/${entry.name}`;
        if (entry.id == null && entry.metadata == null) {
          apkPaths.push(...await walk(objectPath));
        } else if (entry.name.toLowerCase().endsWith('.apk')) {
          apkPaths.push(objectPath);
        }
      }
      if (entries.length < 1000) break;
      offset += entries.length;
    }
    return apkPaths;
  })(prefix);
}

function uploadResumable(file, projectRef, serviceKey, fileSize) {
  return new Promise((resolve, reject) => {
    let lastPercent = -1;
    const upload = new Upload(file, {
      endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'x-upsert': 'true',
      },
      metadata: {
        bucketName: BUCKET,
        objectName: APK_OBJECT_PATH,
        contentType: APK_MIME_TYPE,
        cacheControl: '0',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      onProgress(bytesUploaded) {
        const percent = Math.floor((bytesUploaded / fileSize) * 100);
        if (percent !== lastPercent) {
          lastPercent = percent;
          process.stdout.write(`Upload ${percent}%\r`);
        }
      },
      onError(error) {
        reject(new Error(`Resumable APK upload failed: ${error.message}`));
      },
      onSuccess() {
        process.stdout.write('Upload 100%\n');
        resolve();
      },
    });
    upload.start();
  });
}

async function verifyRemoteObject(admin, localSize, localHash, release) {
  const { data: listed, error: listError } = await admin.storage.from(BUCKET).list('android/latest', {
    limit: 100,
    search: 'morantehub.apk',
  });
  if (listError) throw listError;
  const object = (listed || []).find((item) => item.name === 'morantehub.apk');
  if (!object || Number(object.metadata?.size) !== localSize) {
    fail('The uploaded Storage object is missing or has the wrong size.');
  }

  const { data: signed, error: signedError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(APK_OBJECT_PATH, SIGNED_URL_TTL_SECONDS, { download: 'morantehub.apk' });
  if (signedError || !signed?.signedUrl) fail('Could not create the temporary verification URL.');

  const url = new URL(signed.signedUrl);
  url.searchParams.set('release', `${release.buildNumber}-${localHash.slice(0, 12)}`);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok || !response.body) fail(`Signed URL download failed with HTTP ${response.status}.`);

  const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'morante-apk-verify-'));
  const downloadPath = path.join(temporaryDirectory, 'morantehub.apk');
  const downloadedHash = createHash('sha256');
  let downloadedSize = 0;
  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      downloadedHash.update(chunk);
      downloadedSize += chunk.length;
      callback(null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(response.body), meter, fs.createWriteStream(downloadPath));
    const actualHash = downloadedHash.digest('hex');
    if (downloadedSize !== localSize || actualHash !== localHash) {
      fail('Downloaded APK failed size/SHA-256 verification.');
    }
    return { signedUrl: url.toString(), downloadedHash: actualHash, downloadedSize };
  } finally {
    await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) fail('Set SUPABASE_SERVICE_ROLE_KEY in the process environment; never put it in the app or source files.');

  const supabaseUrl = process.env.SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`;
  const parsedUrl = new URL(supabaseUrl);
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== `${PROJECT_REF}.supabase.co`) {
    fail('SUPABASE_URL does not match the project configured in the mobile app.');
  }

  const release = readAppRelease();
  const apkPath = path.resolve(process.argv[2] || DEFAULT_APK);
  const fileSize = validateLocalApk(apkPath, release);
  const localHash = await sha256File(apkPath);
  if (fileSize > BUCKET_FILE_LIMIT) fail('The APK exceeds the dedicated releases bucket limit.');

  let lockHandle;
  try {
    lockHandle = fs.openSync(LOCK_PATH, 'wx');
  } catch {
    fail('Another Android release publication is already running on this machine.');
  }

  let testUrl;
  try {
    fs.writeSync(lockHandle, `${process.pid}\n${new Date().toISOString()}`);
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: bucket, error: bucketError } = await admin.storage.getBucket(BUCKET);
    if (bucketError || !bucket) fail('Apply the current-release migration before publishing the APK.');
    if (bucket.public) fail('The releases bucket must remain private.');
    if (Number(bucket.fileSizeLimit) < fileSize) fail('The releases bucket limit is smaller than this APK.');
    if (Array.isArray(bucket.allowedMimeTypes) && !bucket.allowedMimeTypes.includes(APK_MIME_TYPE)) {
      fail('The releases bucket does not allow Android APK files.');
    }

    const storage = admin.storage.from(BUCKET);
    const staleApks = (await getAndroidApkPaths(storage, 'android'))
      .filter((objectPath) => objectPath !== APK_OBJECT_PATH);

    const content = await fs.promises.readFile(apkPath);
    await uploadResumable(new File([content], 'morantehub.apk', { type: APK_MIME_TYPE }), PROJECT_REF, serviceKey, fileSize);

    const verified = await verifyRemoteObject(admin, fileSize, localHash, release);
    testUrl = verified.signedUrl;

    if (staleApks.length) {
      const { error } = await storage.remove(staleApks);
      if (error) throw error;
    }

    const remainingApks = await getAndroidApkPaths(storage, 'android');
    if (remainingApks.length !== 1 || remainingApks[0] !== APK_OBJECT_PATH) {
      fail('Android release storage does not contain exactly the fixed APK object.');
    }

    const { error: metadataError } = await admin.rpc('set_android_current_release', {
      p_version: release.version,
      p_build_number: release.buildNumber,
      p_min_supported_build: release.minimumBuild,
      p_file_size: fileSize,
      p_sha256: localHash,
      p_is_mandatory: release.mandatory,
      p_release_notes: release.notes,
    });
    if (metadataError) throw metadataError;

    console.log(JSON.stringify({
      version: release.version,
      buildNumber: release.buildNumber,
      fileSize,
      sha256: localHash,
      bucket: BUCKET,
      path: APK_OBJECT_PATH,
      replacedApkCount: staleApks.length,
      onlyAndroidApk: true,
      downloadedSha256: verified.downloadedHash,
      integrityVerified: true,
      metadataUpdated: true,
    }, null, 2));

    if (process.argv.includes('--print-test-url')) console.log(`TEST_SIGNED_URL=${testUrl}`);
  } finally {
    if (lockHandle !== undefined) fs.closeSync(lockHandle);
    try { fs.unlinkSync(LOCK_PATH); } catch {}
  }
}

main().catch((error) => {
  console.error(`Android APK publication failed: ${error.message}`);
  process.exitCode = 1;
});

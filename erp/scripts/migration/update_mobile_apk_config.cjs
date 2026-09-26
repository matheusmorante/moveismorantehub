#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const publisher = path.resolve(__dirname, '../release/publish_android_apk.cjs');
const result = spawnSync(
  process.execPath,
  ['--use-system-ca', publisher, ...process.argv.slice(2)],
  { cwd: path.resolve(__dirname, '../../..'), stdio: 'inherit', windowsHide: true },
);

if (result.error) {
  console.error(`Could not start the Android APK publisher: ${result.error.message}`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}

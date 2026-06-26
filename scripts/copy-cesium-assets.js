#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../node_modules/cesium/Build/Cesium');
const dest = path.join(__dirname, '../public/cesium');

if (!fs.existsSync(src)) {
  console.log('[cesium-setup] Cesium Build not found, skipping...');
  process.exit(0);
}

function copyDir(from, to) {
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from)) {
    const s = path.join(from, entry);
    const d = path.join(to, entry);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const toCopy = ['Workers', 'Assets', 'Widgets'];
for (const dir of toCopy) {
  const from = path.join(src, dir);
  const to = path.join(dest, dir);
  if (!fs.existsSync(to)) {
    console.log(`[cesium-setup] Copying ${dir}...`);
    copyDir(from, to);
  }
}
console.log('[cesium-setup] Cesium assets ready at /public/cesium/');

#!/usr/bin/env node

'use strict';

const path = require('path');
const childProcess = require('child_process');

function getBinaryPath () {
  const buffer = childProcess.execSync('npm bin -g');
  const result = String.fromCharCode.apply(null, buffer);
  const globalPath = result.replace(/\n$/, '');
  let binPath = globalPath;
  let execPath;

  const platform = process.platform;
  const folderName = getOsChromiumFolderName();

  if (platform === 'linux') {
    execPath = path.join(binPath, folderName, 'chrome');
  } else if (platform === 'win32') {
    execPath = path.join(binPath, folderName, 'chrome.exe');
  } else if (platform === 'darwin') {
    execPath = path.join(binPath, folderName, 'Chromium.app/Contents/MacOS/Chromium');
  } else {
    console.error('Unsupported platform or architecture found:', process.platform, process.arch);
    throw new Error('Unsupported platform');
  }

  console.log(`checking for chromium at: ${execPath.toString()}`);

  return {binPath, execPath};
}

function getOsChromiumFolderName () {
  const platform = process.platform;

  let archivePlatformPrefix = platform;

  if (platform === 'darwin') {
    archivePlatformPrefix = 'mac';
  }

  return `chrome-${archivePlatformPrefix}`;
}

module.exports = {
  getBinaryPath,
  getOsChromiumFolderName
};

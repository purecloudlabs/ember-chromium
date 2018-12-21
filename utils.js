#!/usr/bin/env node

'use strict';

const path = require('path');
const got = require('got');
const childProcess = require('child_process');

function getCurrentOs () {
  const platform = process.platform;

  if (platform === 'linux') {
    return 'linux';
  }

  if (platform === 'win32') {
    return 'win';
  }

  if (platform === 'darwin') {
    return 'mac';
  }

  console.log('Unknown platform found:', process.platform);
  throw new Error('Unsupported platform');
}

const version = process.env.CHROMIUM_VERSION || '67.0.0';
const versionsWithUnknownBranchingPoint = [];
function getExactChromeVersionNumber () {
  return new Promise((resolve, reject) => {
    const url = 'https://omahaproxy.appspot.com/history.json?channel=' + (process.env.CHROMIUM_CHANNEL || 'dev') + '&os=' + getCurrentOs();
    const packageMajorVersion = version.split('.')[0];

    got(url)
      .then(response => {
        let versions = JSON.parse(response.body);

        for (let version of versions) {
          let versionNumber = version.version;
          let buildMajorVersion = versionNumber.split('.')[0];

          if (buildMajorVersion !== packageMajorVersion) {
            continue;
          }

          if (versionsWithUnknownBranchingPoint.includes(versionNumber)) {
            continue;
          }

          return resolve(versionNumber);
        }
      }
      )
      .catch(err => {
        console.log('An error occured while trying to retrieve latest revision number', err);
        reject(err);
      });
  });
}

function getBinaryPath () {
  // run async function synchronously because testem doesn't like async configs
  // I'm not proud of this but it works.
  const versionBuffer = childProcess.execSync(`
    node -e "
      require('ember-chromium/utils').getExactChromeVersionNumber()
      .then(v => process.stdout.write(v))
    "
  `);
  const versionNumber = String.fromCharCode.apply(null, versionBuffer);
  const buffer = childProcess.execSync('npm bin -g');
  const result = String.fromCharCode.apply(null, buffer);
  const globalPath = result.replace(/\n$/, '');
  let binPath = path.join(globalPath, 'ember-chromium', versionNumber);
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

  return {binPath, execPath, versionNumber};
}

function getChromiumBranchingPoint (versionNumber) {
  return new Promise((resolve, reject) => {
    const url = 'https://omahaproxy.appspot.com/deps.json?version=' + versionNumber;

    got(url)
      .then(response => {
        let versionDetails = JSON.parse(response.body);
        let branchingPoint = parseInt(versionDetails.chromium_base_position);

        if (!Number.isInteger(branchingPoint)) {
          console.log('Could not find branching point for Chrome ' + versionNumber + '. This can happen when the new Chrome version is just branched off. Let\'s try to find the branching point for one version earlier.');
          versionsWithUnknownBranchingPoint.push(versionNumber);

          resolve(getExactChromeVersionNumber().then(getChromiumBranchingPoint));
        }

        console.log('Found that Chrome ' + versionNumber + ' was branched off Chromium at point ' + branchingPoint);

        resolve(branchingPoint);
      })
      .catch(err => {
        console.log('Could not get build details for version ' + versionNumber);
        reject(err);
      });
  });
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
  getOsChromiumFolderName,
  getChromiumBranchingPoint,
  getExactChromeVersionNumber
};

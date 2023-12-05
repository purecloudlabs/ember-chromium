'use strict';

const path = require('path');
const got = require('got');
const childProcess = require('child_process');

// HEADS UP: min supported by chromiumdash is 94
const REQUESTED_VERSION = process.env.CHROMIUM_VERSION || '121.0.6156.3';
const REQUESTED_CHANNEL = process.env.CHROMIUM_CHANNEL || 'dev';
const versionsWithUnknownBranchingPoint = [];

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

function getReleaseWithBranchingPoint(channel, platform, version) {
  return new Promise((resolve, reject) => {
    const majorVersion = getMajorVersion(version);
    if (!majorVersion) {
      reject('Unable to determine request major chromium version');
    }

    const url = `https://chromiumdash.appspot.com/fetch_releases?channel${channel}&platform=${platform}\&num\=10\&offset\=0\&milestone\=${majorVersion}`;

    got(url)
      .then(response => {
        let versions = JSON.parse(response.body);

        for (let version of versions) {
          if (version.milestone === majorVersion &&
            version.version.indexOf(majorVersion + '.') === 0 &&
            version.chromium_main_branch_position) {
            let branchingPoint = parseInt(version.chromium_main_branch_position, 10);

            if (Number.isInteger(branchingPoint)) {
              resolve({
                version: version.version,
                branchingPoint
              });
            }
          }
        }

        reject(`No branching point found for ${channel}, ${platform}, ${majorVersion} (${version})`)
      })
      .catch(err => {
        console.log('An error occured while trying to retrieve latest revision number', err);
        reject(err);
      });
  });
}

function getMajorVersion(versionString) {
  const majorVersion = parseInt(versionString.split('.')[0], 10);
  if (Number.isInteger(majorVersion)) {
    return majorVersion;
  }

  return null;
}

function getExactChromeVersionNumber() {
  return getReleaseWithBranchingPoint(REQUESTED_CHANNEL, getCurrentOs(), REQUESTED_VERSION).then(releaseDetails => {
    if (releaseDetails) {
      return releaseDetails.version;
    }
  });
}

function getBinaryPath () {
  // run async function synchronously because testem doesn't like async configs
  // I'm not proud of this but it works.
  const versionBuffer = childProcess.execSync(`
    CHROMIUM_CHANNEL=${REQUESTED_CHANNEL} CHROMIUM_VERSION=${REQUESTED_VERSION} node -e "
      require('ember-chromium/utils').getExactChromeVersionNumber()
      .then(v => process.stdout.write(v))
    "
  `);
  const versionNumber = String.fromCharCode.apply(null, versionBuffer);
  if (!versionNumber) {
    throw new Error(`Failed to locate an official chromium release with major version matching ${REQUESTED_VERSION} in the ${REQUESTED_CHANNEL} channel`);
  }
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

function getChromiumBranchingPoint() {
  return getReleaseWithBranchingPoint(REQUESTED_CHANNEL, getCurrentOs(), REQUESTED_VERSION).then(releaseDetails => {
    return releaseDetails.branchingPoint;
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

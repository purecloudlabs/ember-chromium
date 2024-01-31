'use strict';

const path = require('path');
const got = require('got');
const childProcess = require('child_process');

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

    const url = `https://chromiumdash.appspot.com/fetch_milestones?only_branched=true&mstone=${majorVersion}`

    got(url)
      .then(response => {
        let versions = JSON.parse(response.body);

        for (let version of versions) {
          if (version.milestone === majorVersion &&
            version.chromium_main_branch_position) {
            let branchingPoint = parseInt(version.chromium_main_branch_position, 10);

            if (Number.isInteger(branchingPoint)) {
              resolve({
                milestone: version.milestone,
                branchingPoint: branchingPoint
              });
              return;
            }
          }
        }

        reject(`No branching point found for ${channel}, ${platform}, ${majorVersion} (${version})`)
      })
      .catch(err => {
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

// Note: this is invoked in getBinaryPath so nothing in the call stack can write stdout (i.e. no console.log).  Don't shoot the messenger.
function getExactChromeVersionNumber() {
  return getReleaseWithBranchingPoint(REQUESTED_CHANNEL, getCurrentOs(), REQUESTED_VERSION).then(releaseDetails => {
    if (releaseDetails) {
      // chromiumdash no loger provides the version and branchingPoint in the same endpoint (or joinable endpoints)
      // using the milestone and branchingPoint to create a unique "version" for installation purposes
      return releaseDetails.milestone + '_' + releaseDetails.branchingPoint
    }
  }).catch(err => {
    return '';
  });
}

function getBinaryPath () {
  // run async function synchronously because testem doesn't like async configs
  // I'm not proud of this but it works.
  const versionBuffer = childProcess.execSync(`
    CHROMIUM_CHANNEL="${REQUESTED_CHANNEL}" CHROMIUM_VERSION="${REQUESTED_VERSION}" node -e "
      require('ember-chromium/utils').getExactChromeVersionNumber()
      .then(v => process.stdout.write(v))
      .catch(err => {
        process.stdout.write('');
      })
    "
  `);

  const versionNumber = String.fromCharCode.apply(null, versionBuffer);
  if (!versionNumber) {
    throw new Error(`Failed to locate an official chromium release with major version matching ${REQUESTED_VERSION} in the ${REQUESTED_CHANNEL} channel`);
  }

  const platform = getCurrentOs();


  let buffer;
  let binPath;

  // This is a lazy fix for newer node versions on unix.  Was having problems testing on windows, and most of our devs are not using windows
  if (platform === 'win') {
    buffer = childProcess.execSync('npm bin -g');
    const result = String.fromCharCode.apply(null, buffer);
    const globalPath = result.replace(/\n$/, '');
    binPath = path.join(globalPath, 'ember-chromium', versionNumber);
  } else {
    buffer = childProcess.execSync('which npm');
    const result = String.fromCharCode.apply(null, buffer);
    const npmGlobalPath = result.replace(/\n$/, '').split('/');
    const globalPath = npmGlobalPath.slice(0, npmGlobalPath.length - 1).join('/');
    binPath = path.join(globalPath, 'ember-chromium', versionNumber);
  }


  let execPath;

  const folderName = getOsChromiumFolderName();

  switch(platform) {
    case 'linux':
      execPath = path.join(binPath, folderName, 'chrome');
      break;
    case 'win':
      execPath = path.join(binPath, folderName, 'chrome.exe');
      break;
    case 'mac':
      execPath = path.join(binPath, folderName, 'Chromium.app/Contents/MacOS/Chromium');
      break;
    default:
      console.error('Unsupported platform or architecture found:', process.platform, process.arch);
      throw new Error('Unsupported platform');
  }

  console.log(`checking for chromium at: ${execPath.toString()}`);

  return {binPath, execPath};
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

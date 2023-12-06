#!/usr/bin/env node

/* global require, process, Promise, module */
/* eslint no-console: 0 */

'use strict';

const fs = require('fs');
const extractZip = require('extract-zip');
const got = require('got');
const tmp = require('tmp');

const utils = require('./utils');

function getOsCdnUrl () {
  let url = 'https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/';

  const platform = process.platform;

  if (platform === 'linux') {
    url += 'Linux';
    if (process.arch === 'x64') {
      url += '_x64';
    }
  } else if (platform === 'win32') {
    url += 'Win';
    if (process.arch === 'x64') {
      url += '_x64';
    }
  } else if (platform === 'darwin') {
    url += 'Mac';
  } else {
    console.log('Unknown platform or architecture found:', process.platform, process.arch);
    throw new Error('Unsupported platform');
  }

  return url;
}

function createTempFile () {
  return new Promise((resolve, reject) => {
    tmp.file((error, path) => {
      if (error) {
        console.log('An error occured while trying to create temporary file', error);
        reject(error);
      } else {
        resolve(path);
      }
    });
  });
}

function downloadChromiumRevision (revision) {
  return new Promise((resolve, reject) => {
    createTempFile()
      .then(path => {
        console.log('Downloading Chromium build at branching point ' + revision + ' from Google CDN');
        const url = getOsCdnUrl() + `%2F${revision}%2F` + utils.getOsChromiumFolderName() + '.zip?alt=media';
        got.stream(url)
          .on('error', () => {
            console.log('Could not find a Chromium build for branching point ' + revision + '. Trying one point later.');
            let nextRevision = revision + 1;

            resolve(downloadChromiumRevision(nextRevision));
          })
          .pipe(fs.createWriteStream(path))
          .on('error', error => {
            console.log('An error occurred while trying to save Chromium archive to disk', error);
            reject(error);
          })
          .on('finish', () => {
            resolve(path);
          });
      });
  });
}

function unzipArchive (archivePath, outputFolder) {
  console.log('Started extracting archive', archivePath);
  return new Promise((resolve, reject) => {
    extractZip(archivePath, { dir: outputFolder }, error => {
      if (error) {
        console.log('An error occurred while trying to extract archive', error);
        reject(error);
      } else {
        console.log('Archive was successfully extracted');
        resolve(true);
      }
    });
  });
}

module.exports = (function () {
  const { execPath, binPath } = utils.getBinaryPath();
  const exists = fs.existsSync(execPath);

  if (exists) {
    console.log('Chrome is already installed');
  } else {
    console.log('Chrome is not installed, triggering download');
    return utils.getChromiumBranchingPoint()
      .then(downloadChromiumRevision)
      .then(path => unzipArchive(path, binPath))
      .catch(err => console.error('An error occurred while trying to setup Chromium. Resolve all issues and restart the process', err));
  }
})();

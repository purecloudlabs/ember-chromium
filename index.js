/* global require, module */
/* eslint no-console: 0 */

'use strict';

const utils = require('./utils');
const fs = require('fs');

let defaultChromiumArgs = [
  "--disable-gpu",
  "--remote-debugging-port=9222",
  "--no-sandbox"
];

function getTestemConfig (chromiumArgs) {
  if (!chromiumArgs) {
    chromiumArgs = defaultChromiumArgs;
  }

  const {execPath} = utils.getBinaryPath();
  if (!fs.existsSync(execPath)) {
    console.error('Chromium does not appear to be installed, testem cannot run.'); // eslint-disable-line
    process.exit(1); // for some reason this doesn't stop testem from continuing in server mode
    throw new Error('Chromium not installed');
  }

  return {
    test_page: 'tests/index.html?hidepassed',
    browser_start_timeout: 60,
    launchers: {
      chromium: {
        exe: execPath,
        args: chromiumArgs,
        protocol: 'browser'
      },
      chromium_headless: {
        exe: execPath,
        args: ['--headless', ...chromiumArgs],
        protocol: 'browser'
      }
    },

    launch_in_ci: ['chromium_headless'],
    launch_in_dev: ['chromium']
  };
}

module.exports = {
  getTestemConfig
};

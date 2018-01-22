/* global require */
/* eslint no-console: 0 */

const chrome = require('./scripts/index/');

if (chrome.path) {
  console.log('Chrome is already installed');
} else {
  console.log('Chrome is not installed, triggering download');
  require('./download-chrome');
}

# Ember Chromium

Ember chromium is an easy way to download chromium in your project and run your unit/integration tests through it. It will also run headless by default on CI servers.

## Getting Started
In your `package.json`, add a postinstall hook to run the download chromium script:
```
"scripts": {
  ...
  "postinstall": "npm run install-chromium",
  "install-chromium": "node node_modules/ember-chromium/download-chrome.js"
}
```
then simply run `npm install` on your project.


## Usage
You can run just the default behavior by doing the following in testem.js:
```
module.exports = require('ember-chromium').getTestemConfig();
```

That's it!

You can further customize the chromium as follows:

```
const chromium = require('ember-chromium');
const myCustomReporter = require('some-test-reporter');

// any chromium flags you want
const chromiumArgs = [
  '--disable-gpu',
  '--no-sandbox',
  '--disable-gesture-requirement-for-media-playback',
  '--allow-file-access',
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream'
];

const config = chromium.getTestemConfig(chromiumArgs);
config.reporter = myCustomReporter;

module.export = config;
```

Once you have the default config, you can manipulate as fits your needs.

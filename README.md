# Ember Chromium

Ember chromium is an easy way to download chromium in your project and run your unit/integration tests through it. It will also run headless by default on CI servers.

## Getting Started
1. Install ember-chromium as a dev dependency via npm/yarn
    ```sh
    $ npm install ember-chromium --save-dev
    # -or-
    $ yarn add ember-chromium --dev
    ```


1. In your `package.json`, add a `pretest` script to run the `install-chromium` script.

    ```json
    "scripts": {
      // ...
      "pretest": "npm run install-chromium",
      // -or-
      "pretest": "yarn run install-chromium",
    }
    ````

    [Note:] When installed, ember-chromium links the `install-chromium` script into `<project-root>/node-modules/.bin`.  This directory is on the npm/yarn script path and can be called directly.

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

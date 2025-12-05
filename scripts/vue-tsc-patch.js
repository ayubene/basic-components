#!/usr/bin/env node
/**
 * Temporary wrapper around vue-tsc/bin/vue-tsc.js that also supports
 * TypeScript builds where the real compiler lives in _tsc.js.
 * Once vue-tsc natively supports the new entry layout, this file can be removed.
 */

const fs = require('fs');
const path = require('path');
const semver = require('semver');
const tsPkg = require('typescript/package.json');

const readFileSync = fs.readFileSync;
const tscEntryPath = require.resolve('typescript/lib/tsc');
const tscHookPath = resolveActualTscPath(tscEntryPath);
const proxyApiPath = require.resolve('vue-tsc/out/index');
const { state } = require('vue-tsc/out/shared');

fs.readFileSync = (...args) => {
  if (args[0] === tscHookPath) {
    let tsc = readFileSync(...args);

    // add *.vue files to allow extensions
    tryReplace(/supportedTSExtensions = .*(?=;)/, (s) => s + '.concat([[".vue"]])');
    tryReplace(/supportedJSExtensions = .*(?=;)/, (s) => s + '.concat([[".vue"]])');
    tryReplace(/allSupportedExtensions = .*(?=;)/, (s) => s + '.concat([[".vue"]])');

    // proxy createProgram apis
    tryReplace(/function createProgram\(.+\) {/, (s) => s + ` return require(${JSON.stringify(proxyApiPath)}).createProgram(...arguments);`);

    // patches logic for checking root file extension in build program for incremental builds
    if (semver.gt(tsPkg.version, '5.0.0')) {
      tryReplace(
        `for (const existingRoot of buildInfoVersionMap.roots) {`,
        `for (const existingRoot of buildInfoVersionMap.roots
          .filter(file => !file.toLowerCase().includes('__vls_'))
          .map(file => file.replace(/\\.vue\\.(j|t)sx?$/i, '.vue'))
        ) {`,
        false
      );
      tryReplace(
        `return [toFileId(key), toFileIdListId(state.exportedModulesMap.getValues(key))];`,
        `return [toFileId(key), toFileIdListId(new Set(arrayFrom(state.exportedModulesMap.getValues(key)).filter(file => file !== void 0)))];`,
        false
      );
    }
    if (semver.gte(tsPkg.version, '5.0.4')) {
      tryReplace(
        `return createBuilderProgramUsingProgramBuildInfo(buildInfo, buildInfoPath, host);`,
        (s) => `buildInfo.program.fileNames = buildInfo.program.fileNames
          .filter(file => !file.toLowerCase().includes('__vls_'))
          .map(file => file.replace(/\\.vue\\.(j|t)sx?$/i, '.vue'));\n` + s,
        false
      );
    }

    return tsc;

    function tryReplace(search, replace, required = true) {
      const before = tsc;
      tsc = tsc.replace(search, replace);
      const after = tsc;
      if (after === before && required) {
        throw 'Search string not found: ' + JSON.stringify(search.toString());
      }
      return after !== before;
    }
  }
  return readFileSync(...args);
};

(function main() {
  try {
    require(tscEntryPath);
  } catch (err) {
    if (err === 'hook') {
      state.hook.worker.then(main);
    } else {
      throw err;
    }
  }
})();

function resolveActualTscPath(entryPath) {
  const dir = path.dirname(entryPath);
  const altPath = path.join(dir, '_tsc.js');
  if (fs.existsSync(altPath)) {
    return altPath;
  }
  return entryPath;
}


/**
 * Expo config plugin: on Windows, point the Android native build at a CMake whose ninja supports
 * long paths.
 *
 * Why: React Native libraries compile generated C++ files whose object paths exceed 260 characters
 * (e.g. react-native-gesture-handler codegen). Windows can handle that when long paths are enabled,
 * but the Android SDK's default CMake 3.22 ships ninja 1.10, which refuses such paths. Ninja 1.12+
 * supports them. This plugin writes `cmake.dir` into android/local.properties (a generated file).
 *
 * Selection: env RICINGO_ANDROID_CMAKE_DIR if set, otherwise the newest CMake under the Android SDK
 * whose bundled ninja is >= 1.12. Without one, it only prints a warning; Expo Go and the web preview
 * do not need native builds.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

const MIN_NINJA = [1, 12];
const LOG_PREFIX = '[with-android-cmake]';

/** @param {string} version e.g. "3.31.6" or "1.12.1" */
function parseVersion(version) {
  return version
    .trim()
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
}

/** @param {number[]} a @param {number[]} b */
function compareVersions(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Picks the newest CMake whose ninja supports long paths.
 * @param {{ dir: string, cmakeVersion: string, ninjaVersion: string | null }[]} candidates
 * @returns {string | null}
 */
function pickCmakeDir(candidates) {
  const usable = candidates
    .filter(
      (candidate) =>
        candidate.ninjaVersion !== null &&
        compareVersions(parseVersion(candidate.ninjaVersion), MIN_NINJA) >= 0,
    )
    .sort((a, b) => compareVersions(parseVersion(b.cmakeVersion), parseVersion(a.cmakeVersion)));
  return usable[0]?.dir ?? null;
}

/** @param {string} cmakeDir */
function readNinjaVersion(cmakeDir) {
  const ninja = path.join(cmakeDir, 'bin', 'ninja.exe');
  if (!fs.existsSync(ninja)) return null;
  try {
    return execFileSync(ninja, ['--version'], { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn(`${LOG_PREFIX} could not run ${ninja}:`, error);
    return null;
  }
}

function findSdkCmakeDir() {
  const sdk =
    process.env.ANDROID_HOME ??
    process.env.ANDROID_SDK_ROOT ??
    (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : null);
  if (sdk === null) return null;
  const cmakeRoot = path.join(sdk, 'cmake');
  if (!fs.existsSync(cmakeRoot)) return null;
  const candidates = fs
    .readdirSync(cmakeRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(cmakeRoot, entry.name);
      return { dir, cmakeVersion: entry.name, ninjaVersion: readNinjaVersion(dir) };
    });
  return pickCmakeDir(candidates);
}

/**
 * Sets (or replaces) `cmake.dir` in local.properties content.
 * @param {string} content @param {string} cmakeDir
 */
function withCmakeDirProperty(content, cmakeDir) {
  const line = `cmake.dir=${cmakeDir.replace(/\\/g, '/')}`;
  const lines = content.split(/\r?\n/).filter((existing) => !existing.startsWith('cmake.dir='));
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return [...lines, line, ''].join('\n');
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withAndroidCmake = (config) =>
  withDangerousMod(config, [
    'android',
    (modConfig) => {
      if (process.platform !== 'win32') return modConfig;

      const cmakeDir = process.env.RICINGO_ANDROID_CMAKE_DIR ?? findSdkCmakeDir();
      if (cmakeDir === null) {
        console.warn(
          `${LOG_PREFIX} No Android SDK CMake with ninja >= ${MIN_NINJA.join('.')} found. ` +
            'Native Android builds will fail on long paths. Install a newer CMake in Android Studio ' +
            '(SDK Manager → SDK Tools → CMake, "Show Package Details") and regenerate the native project.',
        );
        return modConfig;
      }

      const file = path.join(modConfig.modRequest.platformProjectRoot, 'local.properties');
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      fs.writeFileSync(file, withCmakeDirProperty(current, cmakeDir));
      console.log(`${LOG_PREFIX} using CMake at ${cmakeDir}`);
      return modConfig;
    },
  ]);

module.exports = withAndroidCmake;
module.exports.pickCmakeDir = pickCmakeDir;
module.exports.withCmakeDirProperty = withCmakeDirProperty;

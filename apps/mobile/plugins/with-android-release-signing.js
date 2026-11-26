/**
 * Expo config plugin: signs Android release builds with the RICI release key when it is
 * configured, instead of the debug key Expo's template uses.
 *
 * The key never enters the repository. Its location and passwords come from Gradle properties,
 * normally in the user's `~/.gradle/gradle.properties` (or `-P` on the command line):
 *   RICI_RELEASE_STORE_FILE      absolute path of the keystore (.jks)
 *   RICI_RELEASE_STORE_PASSWORD  keystore password
 *   RICI_RELEASE_KEY_ALIAS       key alias
 *   RICI_RELEASE_KEY_PASSWORD    key password
 * Without them a release build is still signed with the debug key (local testing only); an APK
 * for students must be built with them, and always with the same key, or installed apps cannot
 * be updated (docs/setup/ANDROID_APK.md).
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// rici-release-signing';

const SIGNING_CONFIG = `
        release { ${MARKER}
            if (project.hasProperty('RICI_RELEASE_STORE_FILE')) {
                storeFile file(RICI_RELEASE_STORE_FILE)
                storePassword RICI_RELEASE_STORE_PASSWORD
                keyAlias RICI_RELEASE_KEY_ALIAS
                keyPassword RICI_RELEASE_KEY_PASSWORD
            }
        }`;

/**
 * Adds the release signing config and uses it for the release build type when configured.
 * @param {string} gradle contents of android/app/build.gradle
 * @returns {string}
 */
function applyReleaseSigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;
  const withConfig = gradle.replace(/signingConfigs\s*\{/, (match) => `${match}${SIGNING_CONFIG}`);
  if (withConfig === gradle) {
    throw new Error(
      '[with-android-release-signing] signingConfigs block not found in build.gradle',
    );
  }
  // The template's release build type signs with the debug config; switch it when the key is set.
  const releaseType =
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/;
  if (!releaseType.test(withConfig)) {
    throw new Error('[with-android-release-signing] release build type not found in build.gradle');
  }
  return withConfig.replace(
    releaseType,
    `$1signingConfig project.hasProperty('RICI_RELEASE_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`,
  );
}

const withAndroidReleaseSigning = (config) =>
  withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('[with-android-release-signing] expects a Groovy build.gradle');
    }
    mod.modResults.contents = applyReleaseSigning(mod.modResults.contents);
    return mod;
  });

module.exports = withAndroidReleaseSigning;
module.exports.applyReleaseSigning = applyReleaseSigning;

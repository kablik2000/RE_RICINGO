import { applyReleaseSigning } from './with-android-release-signing';

// The relevant part of Expo's generated android/app/build.gradle (SDK 58 template).
const TEMPLATE = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}`;

describe('with-android-release-signing', () => {
  it('adds the release key and uses it for release builds only when configured', () => {
    const gradle = applyReleaseSigning(TEMPLATE);

    expect(gradle).toContain("if (project.hasProperty('RICI_RELEASE_STORE_FILE'))");
    expect(gradle).toContain('storeFile file(RICI_RELEASE_STORE_FILE)');
    expect(gradle).toContain(
      "signingConfig project.hasProperty('RICI_RELEASE_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
    // Debug builds keep the debug key.
    expect(gradle).toMatch(/debug \{\s+signingConfig signingConfigs\.debug\s+\}/);
    // No password or path is written into the file: the only literal one is the debug key's.
    expect(gradle.match(/storePassword '/g)).toHaveLength(1);
  });

  it('changes the file only once', () => {
    const once = applyReleaseSigning(TEMPLATE);
    expect(applyReleaseSigning(once)).toBe(once);
  });

  it('fails loudly when the template changed', () => {
    expect(() => applyReleaseSigning('android {}')).toThrow('signingConfigs block not found');
  });
});

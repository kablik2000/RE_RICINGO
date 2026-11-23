import { pickCmakeDir, withCmakeDirProperty } from './with-android-cmake';

describe('with-android-cmake', () => {
  it('picks the newest CMake whose ninja supports long paths (>= 1.12)', () => {
    expect(
      pickCmakeDir([
        { dir: 'sdk/cmake/3.22.1', cmakeVersion: '3.22.1', ninjaVersion: '1.10.2' },
        { dir: 'sdk/cmake/3.31.6', cmakeVersion: '3.31.6', ninjaVersion: '1.12.1' },
        { dir: 'sdk/cmake/3.30.5', cmakeVersion: '3.30.5', ninjaVersion: '1.12.1' },
        { dir: 'sdk/cmake/4.1.2', cmakeVersion: '4.1.2', ninjaVersion: null },
      ]),
    ).toBe('sdk/cmake/3.31.6');
  });

  it('returns null when only old ninja versions are installed', () => {
    expect(
      pickCmakeDir([{ dir: 'sdk/cmake/3.22.1', cmakeVersion: '3.22.1', ninjaVersion: '1.10.2' }]),
    ).toBeNull();
  });

  it('sets cmake.dir in local.properties, replacing an existing value', () => {
    const before = 'sdk.dir=C\\:\\\\Android\\\\Sdk\r\ncmake.dir=old\r\n';

    expect(withCmakeDirProperty(before, 'C:\\Android\\Sdk\\cmake\\3.31.6')).toBe(
      'sdk.dir=C\\:\\\\Android\\\\Sdk\ncmake.dir=C:/Android/Sdk/cmake/3.31.6\n',
    );
    expect(withCmakeDirProperty('', 'C:\\cmake')).toBe('cmake.dir=C:/cmake\n');
  });
});

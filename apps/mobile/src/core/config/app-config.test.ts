import { resolveAppEnv } from '../../../app.config';
import { parseAppConfig, resolveContentApiUrl } from './app-config';
import { APP_ENVS } from './app-env';

const ANDROID = { os: 'android' };

describe('parseAppConfig', () => {
  it('returns typed config for a valid source', () => {
    expect(parseAppConfig({ version: '1.2.3', extra: { appEnv: 'preview' } }, ANDROID)).toEqual({
      appEnv: 'preview',
      appVersion: '1.2.3',
      contentApiUrl: null,
    });
  });

  it('rejects an unknown environment', () => {
    expect(() =>
      parseAppConfig({ version: '1.0.0', extra: { appEnv: 'staging' } }, ANDROID),
    ).toThrow(/Invalid app configuration/);
  });

  it('rejects a missing version', () => {
    expect(() => parseAppConfig({ extra: { appEnv: 'production' } }, ANDROID)).toThrow(
      /missing app version/,
    );
  });

  it('rejects a missing expo config', () => {
    expect(() => parseAppConfig(null, ANDROID)).toThrow(/not available/);
  });
});

describe('resolveContentApiUrl', () => {
  it('uses the URL the build configures', () => {
    expect(resolveContentApiUrl('production', 'https://api.example.cz/', undefined, ANDROID)).toBe(
      'https://api.example.cz',
    );
  });

  it('finds the local API on the computer running the dev server', () => {
    expect(resolveContentApiUrl('development', undefined, '192.168.1.20:8081', ANDROID)).toBe(
      'http://192.168.1.20:8000',
    );
  });

  it('reaches the computer from the Android emulator through its alias', () => {
    expect(resolveContentApiUrl('development', undefined, 'localhost:8081', ANDROID)).toBe(
      'http://10.0.2.2:8000',
    );
  });

  it('downloads nothing without a configured URL outside development, or on web', () => {
    expect(resolveContentApiUrl('preview', undefined, undefined, ANDROID)).toBeNull();
    expect(
      resolveContentApiUrl('development', undefined, 'localhost:8081', {
        os: 'web',
        origin: 'http://localhost:8081',
      }),
    ).toBeNull();
  });

  it('calls the API on its own origin in a built web app', () => {
    expect(
      resolveContentApiUrl('production', undefined, undefined, {
        os: 'web',
        origin: 'https://app.rici.esprog.eu',
      }),
    ).toBe('https://app.rici.esprog.eu');
  });
});

describe('app.config.ts environment resolution', () => {
  it.each(APP_ENVS)('accepts "%s" (kept in sync with app-env.ts)', (env) => {
    expect(resolveAppEnv(env)).toBe(env);
  });

  it('defaults to development when APP_ENV is not set', () => {
    expect(resolveAppEnv(undefined)).toBe('development');
  });

  it('rejects environments unknown to the app', () => {
    expect(() => resolveAppEnv('staging')).toThrow(/Invalid APP_ENV/);
  });
});

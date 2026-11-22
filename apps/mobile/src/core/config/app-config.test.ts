import { resolveAppEnv } from '../../../app.config';
import { parseAppConfig } from './app-config';
import { APP_ENVS } from './app-env';

describe('parseAppConfig', () => {
  it('returns typed config for a valid source', () => {
    expect(parseAppConfig({ version: '1.2.3', extra: { appEnv: 'preview' } })).toEqual({
      appEnv: 'preview',
      appVersion: '1.2.3',
    });
  });

  it('rejects an unknown environment', () => {
    expect(() => parseAppConfig({ version: '1.0.0', extra: { appEnv: 'staging' } })).toThrow(
      /Invalid app configuration/,
    );
  });

  it('rejects a missing version', () => {
    expect(() => parseAppConfig({ extra: { appEnv: 'production' } })).toThrow(
      /missing app version/,
    );
  });

  it('rejects a missing expo config', () => {
    expect(() => parseAppConfig(null)).toThrow(/not available/);
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

import { APP_ERROR_KINDS, getErrorPresentation } from '../errors';
import { allTranslations, t } from './translate';

describe('t', () => {
  it('returns the Czech string for a key', () => {
    expect(t('tabs.vocabulary')).toBe('Slovník');
  });

  it('has no empty strings in the catalog', () => {
    for (const [key, value] of allTranslations()) {
      expect({ key, empty: value.trim() === '' }).toEqual({ key, empty: false });
    }
  });

  it('defines copy for every error kind', () => {
    const keys = new Set(allTranslations().keys());
    for (const kind of APP_ERROR_KINDS) {
      const { titleKey, messageKey } = getErrorPresentation(kind);
      expect(keys).toContain(titleKey);
      expect(keys).toContain(messageKey);
    }
  });
});

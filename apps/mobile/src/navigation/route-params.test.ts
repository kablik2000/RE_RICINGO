import { singleParam } from './route-params';

describe('singleParam', () => {
  it.each([
    ['al-bar', 'al-bar'],
    [['al-bar', 'other'], 'al-bar'],
    [[], undefined],
    [undefined, undefined],
  ] as const)('%j → %j', (input, expected) => {
    expect(singleParam(input)).toBe(expected);
  });
});

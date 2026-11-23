import { safeNextPath } from './next-path';

describe('safeNextPath', () => {
  it('keeps paths of the Studio', () => {
    expect(safeNextPath('/lessons/al-bar')).toBe('/lessons/al-bar');
    expect(safeNextPath('/lessons?status=draft')).toBe('/lessons?status=draft');
  });

  it.each([
    undefined,
    ['/lessons', '/'],
    '',
    'lessons',
    '//evil.example',
    '/\\evil.example',
    '/\\/evil.example',
    '/lessons\\..\\evil',
    'https://evil.example',
    'javascript:alert(1)',
    '/login',
    '/lessons\nSet-Cookie: x',
  ])('sends %j to the overview', (value) => {
    expect(safeNextPath(value)).toBe('/');
  });
});

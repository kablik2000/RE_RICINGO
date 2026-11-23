import { colorSchemes } from '../tokens/color-schemes';
import { illustration } from '../tokens/illustration';
import { spacing } from '../tokens/layout';
import { colorVariables, layoutVariables, tokenStylesheet } from './css-variables';

describe('web design tokens', () => {
  it('exposes every colour role as a kebab-case custom property', () => {
    const light = colorVariables('light');

    expect(light['--rici-color-primary']).toBe(colorSchemes.light.primary);
    expect(light['--rici-color-on-primary-container']).toBe(colorSchemes.light.onPrimaryContainer);
    expect(light['--rici-art-counter-edge']).toBe(illustration.light.counterEdge);
    expect(Object.keys(light)).toHaveLength(
      Object.keys(colorSchemes.light).length + Object.keys(illustration.light).length,
    );
  });

  it('exposes spacing, radius and the type scale in pixels', () => {
    const layout = layoutVariables();

    expect(layout['--rici-space-lg']).toBe(`${String(spacing.lg)}px`);
    expect(layout['--rici-radius-xl']).toBe('28px');
    expect(layout['--rici-type-italian-sentence-size']).toBe('26px');
  });

  it('switches colours for dark mode in the stylesheet', () => {
    const css = tokenStylesheet();

    expect(css.startsWith(':root{')).toBe(true);
    expect(css).toContain(
      `@media (prefers-color-scheme: dark){:root{--rici-color-primary:${colorSchemes.dark.primary};`,
    );
  });
});

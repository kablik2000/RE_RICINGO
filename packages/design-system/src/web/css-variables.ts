import { colorSchemes, type ColorSchemeName } from '../tokens/color-schemes';
import { illustration } from '../tokens/illustration';
import { radius, spacing } from '../tokens/layout';
import { typography } from '../tokens/typography';

/**
 * Design tokens as CSS custom properties, for web apps (Teacher Studio). The same tokens drive the
 * React Native app, so both look like one product (ADR-0010). Font families are not included:
 * web apps load the typefaces themselves (e.g. `next/font`) and map them to `--rici-font-sans`
 * and `--rici-font-serif`.
 */

const PREFIX = '--rici';

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function px(value: number): string {
  return `${String(value)}px`;
}

/**
 * Colour roles of one scheme (`--rici-color-on-primary-container`) and the illustration palette
 * (`--rici-art-espresso`).
 */
export function colorVariables(scheme: ColorSchemeName): Record<string, string> {
  return {
    ...Object.fromEntries(
      Object.entries(colorSchemes[scheme]).map(([role, value]) => [
        `${PREFIX}-color-${kebab(role)}`,
        value,
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(illustration[scheme]).map(([role, value]) => [
        `${PREFIX}-art-${kebab(role)}`,
        value,
      ]),
    ),
  };
}

/** Scheme-independent tokens: spacing, radius and the type scale (size, line height, tracking). */
export function layoutVariables(): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const [name, value] of Object.entries(spacing)) {
    variables[`${PREFIX}-space-${kebab(name)}`] = px(value);
  }
  for (const [name, value] of Object.entries(radius)) {
    variables[`${PREFIX}-radius-${kebab(name)}`] = px(value);
  }
  for (const [role, style] of Object.entries(typography)) {
    const base = `${PREFIX}-type-${kebab(role)}`;
    variables[`${base}-size`] = px(style.fontSize);
    variables[`${base}-line-height`] = px(style.lineHeight);
    variables[`${base}-tracking`] = px(style.letterSpacing ?? 0);
  }
  return variables;
}

function declarations(variables: Record<string, string>): string {
  return Object.entries(variables)
    .map(([name, value]) => `${name}:${value};`)
    .join('');
}

/** A complete stylesheet: light tokens on `:root`, dark tokens when the system prefers dark. */
export function tokenStylesheet(): string {
  return (
    `:root{${declarations({ ...layoutVariables(), ...colorVariables('light') })}}` +
    `@media (prefers-color-scheme: dark){:root{${declarations(colorVariables('dark'))}}}`
  );
}

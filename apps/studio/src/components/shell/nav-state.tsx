'use client';

import { usePathname } from 'next/navigation';
import { createContext, type ReactNode, use, useEffect, useState } from 'react';

import { Icon } from '@/components/icon';
import { t } from '@/i18n';

/**
 * On narrow screens the navigation is a modal drawer (Material 3): hidden until the menu button
 * opens it, closed by the scrim, Escape or navigating. On wide screens these parts do nothing
 * (the CSS keeps the drawer in place and hides the button and the scrim).
 */
interface NavContext {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Context = createContext<NavContext | null>(null);

export const NAV_ID = 'studio-navigation';

export function NavState({
  className,
  scrimClassName,
  children,
}: {
  className: string;
  scrimClassName: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [shownPath, setShownPath] = useState(pathname);
  if (pathname !== shownPath) {
    // A link in the drawer was followed: show the new page, not the drawer.
    setShownPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return undefined;
    // Keyboard and screen-reader users land in the drawer they just opened.
    document.getElementById(NAV_ID)?.querySelector<HTMLElement>('a[href], button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <Context value={{ open, setOpen }}>
      <div className={className} data-nav-open={open ? 'true' : undefined}>
        {children}
        <div
          className={scrimClassName}
          aria-hidden="true"
          onClick={() => {
            setOpen(false);
          }}
        />
      </div>
    </Context>
  );
}

/** The menu button of the top app bar; shown on narrow screens only (CSS). */
export function MenuButton({ className }: { className: string }) {
  const context = use(Context);
  if (context === null) return null;
  const { open, setOpen } = context;
  return (
    <button
      type="button"
      className={className}
      aria-controls={NAV_ID}
      aria-expanded={open}
      aria-label={open ? t('topBar.closeMenu') : t('topBar.openMenu')}
      onClick={() => {
        setOpen(!open);
      }}>
      <Icon name={open ? 'close' : 'menu'} />
    </button>
  );
}

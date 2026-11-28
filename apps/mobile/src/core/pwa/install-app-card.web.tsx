import { Button, Card, Icon, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';

/** Chrome's install prompt (not in the TypeScript DOM library). */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

const DISMISSED_KEY = 'rici.installHint.dismissed';

// The browser offers installing once, early; keep the event until the card is shown.
let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    listeners.forEach((listener) => {
      listener();
    });
  });
}

function isInstalled(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || window.matchMedia('(display-mode: standalone)').matches;
}

function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Invites the student to add the web app to the home screen (ADR-0019): there it opens like an
 * app, works offline and its data is kept. Hidden once installed or dismissed.
 */
export function InstallAppCard() {
  const styles = useThemedStyles(createStyles);
  const [hidden, setHidden] = useState(() => isInstalled() || wasDismissed());
  const [canPrompt, setCanPrompt] = useState(deferredPrompt !== null);

  // Subscribes to the browser's install prompt (an external event source).
  useEffect(() => {
    const update = () => {
      setCanPrompt(deferredPrompt !== null);
    };
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Private mode without storage: hide it for this visit only.
    }
    setHidden(true);
  };
  const install = () => {
    const prompt = deferredPrompt;
    deferredPrompt = null;
    setCanPrompt(false);
    void prompt?.prompt().then(() => {
      setHidden(isInstalled());
    });
  };

  return (
    <Card variant="outlined" radius="lg" padding="lg">
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon name="download" color="onPrimaryContainer" />
        </View>
        <View style={styles.text}>
          <Text variant="titleSmall">{t('pwa.install.title')}</Text>
          <Text variant="body" color="onSurfaceVariant">
            {canPrompt
              ? t('pwa.install.message')
              : isIos()
                ? t('pwa.install.ios')
                : t('pwa.install.other')}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button variant="text" label={t('pwa.install.dismiss')} onPress={dismiss} />
        {canPrompt && <Button icon="download" label={t('pwa.install.action')} onPress={install} />}
      </View>
    </Card>
  );
}

const ICON_SIZE = 40;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
    },
    icon: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
  });

import { Button, Card, Icon, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { toAppError } from '@/core/errors';
import { t } from '@/core/i18n';
import { telemetry } from '@/core/telemetry';

import { useItalianVoice } from './use-italian-voice';
import { voiceAvailability } from './voice-availability';

/**
 * Shown instead of pronunciation controls when the device has no Italian voice: a wrong
 * (English-accented) pronunciation is worse than none. Renders nothing otherwise.
 */
export function ItalianVoiceNotice() {
  const styles = useThemedStyles(createStyles);
  const voice = useItalianVoice();
  const [installerFailed, setInstallerFailed] = useState(false);

  if (voice.status !== 'missing') {
    return null;
  }

  const openInstaller = () => {
    voiceAvailability
      .openVoiceInstaller()
      .then((opened) => {
        setInstallerFailed(!opened);
      })
      .catch((error: unknown) => {
        telemetry.captureError(toAppError(error), { source: 'italian-voice-notice' });
        setInstallerFailed(true);
      });
  };

  return (
    <Card tone="surfaceContainer" radius="lg" testID="italian-voice-notice">
      <View style={styles.header}>
        <Icon name="volumeOff" color="primary" />
        <View style={styles.text}>
          <Text variant="titleSmall" accessibilityRole="header">
            {t('audio.voiceMissing.title')}
          </Text>
          <Text variant="body" color="onSurfaceVariant">
            {t('audio.voiceMissing.message')}
          </Text>
          <Text variant="bodySmall" color="onSurfaceVariant">
            {voiceAvailability.canOpenVoiceInstaller
              ? t('audio.voiceMissing.androidHint')
              : manualSteps()}
          </Text>
        </View>
      </View>
      {installerFailed && (
        <Text variant="bodySmall" color="error" accessibilityRole="alert">
          {t('audio.voiceMissing.openFailed')}
        </Text>
      )}
      <View style={styles.actions}>
        {voiceAvailability.canOpenVoiceInstaller && (
          <Button
            variant="tonal"
            icon="volume"
            label={t('audio.voiceMissing.download')}
            onPress={openInstaller}
          />
        )}
        <Button
          variant="text"
          label={
            voice.isChecking ? t('audio.voiceMissing.checking') : t('audio.voiceMissing.recheck')
          }
          disabled={voice.isChecking}
          onPress={voice.recheck}
        />
      </View>
    </Card>
  );
}

function manualSteps(): string {
  switch (Platform.OS) {
    case 'ios':
      return t('audio.voiceMissing.iosSteps');
    case 'android':
      return t('audio.voiceMissing.androidSteps');
    default:
      return t('audio.voiceMissing.webSteps');
  }
}

/** Aligns the actions with the text, past the 24 dp icon and its 12 dp gap. */
const ICON_INDENT = 36;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    text: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingLeft: ICON_INDENT,
    },
  });

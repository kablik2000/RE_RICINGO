import {
  Button,
  Card,
  Screen,
  Text,
  TextField,
  type Theme,
  useThemedStyles,
} from '@ricingo/design-system';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';
import { AccountError, useSignIn, type Device } from '@/data';

import { accountErrorMessage } from '../account-error-message';

/**
 * Sign-in with e-mail and password. With 3 devices signed in already, the student (who has just
 * given the right password) picks one to sign out (ADR-0013).
 */
export function SignInScreen() {
  const router = useRouter();
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const run = (replaceDeviceId?: string) => {
    if (email.trim() === '' || password === '') {
      setFormError(t('account.signInScreen.missing'));
      return;
    }
    setFormError(null);
    signIn.mutate(
      { email: email.trim(), password, ...(replaceDeviceId !== undefined && { replaceDeviceId }) },
      {
        onSuccess: () => {
          router.back();
        },
      },
    );
  };

  const limit =
    signIn.error instanceof AccountError && signIn.error.code === 'device_limit'
      ? signIn.error.devices
      : null;
  const error =
    formError ??
    (signIn.error === null || limit !== null ? null : accountErrorMessage(signIn.error));

  return (
    <Screen safeAreaTop={false}>
      <Text variant="body" color="onSurfaceVariant">
        {t('account.signInScreen.intro')}
      </Text>
      <TextField
        label={t('account.signInScreen.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="username"
      />
      <TextField
        label={t('account.signInScreen.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={() => {
          run();
        }}
      />
      {error !== null && (
        <Text variant="body" color="error" accessibilityRole="alert">
          {error}
        </Text>
      )}
      {limit !== null ? (
        <DeviceLimit
          devices={limit}
          pending={signIn.isPending}
          onReplace={(deviceId) => {
            run(deviceId);
          }}
        />
      ) : (
        <Button
          label={t('account.signInScreen.submit')}
          onPress={() => {
            run();
          }}
          loading={signIn.isPending}
          size="large"
          fullWidth
        />
      )}
    </Screen>
  );
}

function DeviceLimit({
  devices,
  pending,
  onReplace,
}: {
  devices: readonly Device[];
  pending: boolean;
  onReplace: (deviceId: string) => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Card tone="primaryContainer" radius="lg" testID="device-limit">
      <View style={styles.body}>
        <Text variant="titleSmall" color="onPrimaryContainer" accessibilityRole="header">
          {t('account.deviceLimit.title')}
        </Text>
        <Text variant="body" color="onPrimaryContainer">
          {t('account.deviceLimit.message')}
        </Text>
        {devices.map((device) => (
          <Button
            key={device.id}
            label={t('account.deviceLimit.replace', {
              name: device.name ?? t('account.unnamedDevice'),
            })}
            icon="close"
            variant="outlined"
            disabled={pending}
            fullWidth
            onPress={() => {
              onReplace(device.id);
            }}
          />
        ))}
      </View>
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    body: {
      gap: theme.spacing.md,
    },
  });

import { Button, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';
import { useAccount, useRemoveDevice, useSignOut, type AccountDetails, type Device } from '@/data';

import { accountErrorMessage } from '../account-error-message';

const DATE_FORMAT = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric' });

/**
 * Profile → "Účet studenta": invited students sign in here; everybody else keeps using the public
 * lessons without an account (ADR-0013). Hidden in builds without a server.
 */
export function AccountSection() {
  const styles = useThemedStyles(createStyles);
  const { enabled, query } = useAccount();
  if (!enabled) {
    return null;
  }
  return (
    <View style={styles.section}>
      <Text variant="titleSmall" accessibilityRole="header">
        {t('account.title')}
      </Text>
      {query.isPending ? (
        <Text variant="body" color="onSurfaceVariant">
          {t('account.loading')}
        </Text>
      ) : query.isError ? (
        <View style={styles.section}>
          <Text variant="body" color="error" accessibilityRole="alert">
            {accountErrorMessage(query.error)}
          </Text>
          <Button
            label={t('account.retry')}
            variant="outlined"
            onPress={() => void query.refetch()}
          />
        </View>
      ) : query.data === null ? (
        <SignedOut />
      ) : (
        <SignedIn details={query.data} />
      )}
    </View>
  );
}

function SignedOut() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  return (
    <View style={styles.section}>
      <Text variant="body" color="onSurfaceVariant">
        {t('account.signedOut')}
      </Text>
      <View style={styles.actions}>
        <Button
          label={t('account.haveInvitation')}
          icon="download"
          onPress={() => {
            router.push('/account/invitation');
          }}
        />
        <Button
          label={t('account.signIn')}
          variant="outlined"
          onPress={() => {
            router.push('/account/sign-in');
          }}
        />
      </View>
    </View>
  );
}

function SignedIn({ details }: { details: AccountDetails }) {
  const styles = useThemedStyles(createStyles);
  const signOut = useSignOut();
  const removeDevice = useRemoveDevice();
  const error = signOut.error ?? removeDevice.error;
  return (
    <View style={[styles.section, styles.stretch]}>
      <View>
        <Text variant="bodyLarge">
          {t('account.signedInAs', { name: details.student.displayName })}
        </Text>
        <Text variant="body" color="onSurfaceVariant">
          {details.student.email}
        </Text>
      </View>
      <Text variant="label" color="onSurfaceVariant">
        {t('account.devicesTitle', { count: details.devices.length, max: details.maxDevices })}
      </Text>
      {details.devices.map((device) => (
        <DeviceRow
          key={device.id}
          device={device}
          pending={removeDevice.isPending}
          onRemove={() => {
            removeDevice.mutate(device.id);
          }}
        />
      ))}
      {error !== null && (
        <Text variant="bodySmall" color="error" accessibilityRole="alert">
          {accountErrorMessage(error)}
        </Text>
      )}
      <Button
        label={t('account.signOut')}
        icon="close"
        variant="outlined"
        loading={signOut.isPending}
        onPress={() => {
          signOut.mutate();
        }}
      />
    </View>
  );
}

function DeviceRow({
  device,
  pending,
  onRemove,
}: {
  device: Device;
  pending: boolean;
  onRemove: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const name = device.name ?? t('account.unnamedDevice');
  return (
    <View style={styles.device}>
      <View style={styles.deviceText}>
        <Text variant="body">{name}</Text>
        <Text variant="bodySmall" color="onSurfaceVariant">
          {device.current
            ? t('account.thisDevice')
            : t('account.lastSeen', { date: DATE_FORMAT.format(new Date(device.lastSeenAt)) })}
        </Text>
      </View>
      {!device.current && (
        <Button
          label={t('account.removeDevice')}
          variant="text"
          disabled={pending}
          accessibilityHint={t('account.removeDeviceLabel', { name })}
          onPress={onRemove}
        />
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      gap: theme.spacing.md,
      alignItems: 'flex-start',
    },
    stretch: {
      alignSelf: 'stretch',
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    device: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    deviceText: {
      flex: 1,
    },
  });

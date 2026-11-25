import { Button, Screen, Text, TextField } from '@ricingo/design-system';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { t } from '@/core/i18n';
import { useAcceptInvitation } from '@/data';

import { accountErrorMessage } from '../account-error-message';

/** The student redeems the code from the invitation e-mail and chooses a password (ADR-0013). */
export function AcceptInvitationScreen() {
  const router = useRouter();
  const accept = useAcceptInvitation();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const submit = () => {
    if (code.trim() === '' || password === '') {
      setFormError(t('account.invitation.missing'));
      return;
    }
    if (password !== again) {
      setFormError(t('account.invitation.mismatch'));
      return;
    }
    setFormError(null);
    accept.mutate(
      { code: code.trim(), password },
      {
        onSuccess: () => {
          router.back();
        },
      },
    );
  };

  const error = formError ?? (accept.error === null ? null : accountErrorMessage(accept.error));

  return (
    <Screen safeAreaTop={false}>
      <Text variant="body" color="onSurfaceVariant">
        {t('account.invitation.intro')}
      </Text>
      <TextField
        label={t('account.invitation.code')}
        value={code}
        onChangeText={setCode}
        supportingText={t('account.invitation.codeHint')}
        autoCapitalize="characters"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        testID="invitation-code"
      />
      <TextField
        label={t('account.invitation.password')}
        value={password}
        onChangeText={setPassword}
        supportingText={t('account.invitation.passwordHint')}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label={t('account.invitation.passwordAgain')}
        value={again}
        onChangeText={setAgain}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {error !== null && (
        <Text variant="body" color="error" accessibilityRole="alert">
          {error}
        </Text>
      )}
      <Button
        label={t('account.invitation.submit')}
        onPress={submit}
        loading={accept.isPending}
        size="large"
        fullWidth
      />
    </Screen>
  );
}

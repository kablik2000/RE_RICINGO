import { EmptyState, Screen } from '@ricingo/design-system';
import { useRouter } from 'expo-router';

import { t } from '../i18n';

export function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen scrollable={false}>
      <EmptyState
        title={t('notFound.title')}
        message={t('notFound.message')}
        action={{
          label: t('common.goHome'),
          onPress: () => {
            router.replace('/');
          },
        }}
      />
    </Screen>
  );
}

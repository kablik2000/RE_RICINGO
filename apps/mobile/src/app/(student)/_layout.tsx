import { useTheme } from '@ricingo/design-system';
import { NativeTabs } from 'expo-router/native-tabs';

import { t } from '@/core/i18n';
import { studentTabs } from '@/navigation/student-tabs';

export { RouteErrorBoundary as ErrorBoundary } from '@/core/ui';

export default function StudentTabsLayout() {
  const { colors } = useTheme();
  return (
    <NativeTabs
      tintColor={colors.primary}
      backgroundColor={colors.surface}
      labelStyle={{ color: colors.onSurfaceVariant }}>
      {studentTabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{t(tab.labelKey)}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.icon.sf} md={tab.icon.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

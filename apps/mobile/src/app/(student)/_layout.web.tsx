import { Icon, useTheme } from '@ricingo/design-system';
import { Tabs } from 'expo-router/js-tabs';

import { t } from '@/core/i18n';
import { studentTabs } from '@/navigation/student-tabs';

export { RouteErrorBoundary as ErrorBoundary } from '@/core/ui';

/** The web app's tab bar (ADR-0019): native tabs are unavailable on web. */
export default function StudentTabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.outlineVariant },
      }}>
      {studentTabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.labelKey),
            tabBarIcon: ({ focused }) => (
              <Icon name={tab.webIcon} color={focused ? 'primary' : 'onSurfaceVariant'} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

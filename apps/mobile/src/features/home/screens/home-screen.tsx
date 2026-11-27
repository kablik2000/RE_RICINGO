import {
  Button,
  Card,
  Icon,
  type IconName,
  Screen,
  Text,
  type Theme,
  useThemedStyles,
} from '@ricingo/design-system';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';
import { QueryView } from '@/core/ui';
import { type LessonSummary, useLessons } from '@/data';
import {
  byLevel,
  LessonTile,
  LessonUpdatesBanner,
  levelsOf,
  themeLabel,
  themesOf,
} from '@/features/lessons';

import { HomeHero } from '../components/home-hero';
import { TeacherRecommendations } from '../components/teacher-recommendations';

const START_COUNT = 6;

/** Home (owner's sketch 2026-11-27): the lesson collection, the lecturer's tips, where to start. */
export function HomeScreen() {
  const lessons = useLessons();
  return (
    <Screen>
      <HomeHero />
      <LessonUpdatesBanner />
      <QueryView query={lessons} loadingMessage={t('lessons.loading')}>
        {(items) => <HomeContent lessons={items} />}
      </QueryView>
    </Screen>
  );
}

/** "Cestování, jídlo a pití, práce" — the first theme capitalised, the rest in lower case. */
function themeSummary(lessons: readonly LessonSummary[]): string {
  const labels = themesOf(lessons).map((theme, index) => {
    const label = themeLabel(theme);
    return index === 0 ? label : label.toLocaleLowerCase('cs');
  });
  return labels.length === 0 ? t('home.rows.themesFallback') : labels.join(', ');
}

function HomeContent({ lessons }: { lessons: readonly LessonSummary[] }) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const openLessons = () => {
    router.navigate('/lessons');
  };
  const start = byLevel(lessons).slice(0, START_COUNT);

  return (
    <>
      <Text variant="bodyLarge">{t('home.intro')}</Text>
      <Button
        fullWidth
        size="large"
        icon="book"
        trailingIcon="chevronRight"
        label={t('home.browse')}
        onPress={openLessons}
      />
      <View style={styles.rows}>
        <HomeRow
          icon="bookmark"
          title={t('home.rows.themes')}
          subtitle={themeSummary(lessons)}
          onPress={() => {
            router.push({ pathname: '/browse', params: { by: 'theme' } });
          }}
        />
        <HomeRow
          icon="book"
          title={t('home.rows.levels')}
          subtitle={levelsOf(lessons).join(' · ')}
          onPress={() => {
            router.push({ pathname: '/browse', params: { by: 'level' } });
          }}
        />
        <HomeRow
          icon="layers"
          title={t('home.rows.all')}
          subtitle={t('home.rows.allSubtitle')}
          onPress={openLessons}
        />
      </View>

      <TeacherRecommendations />

      {start.length > 0 && (
        <View style={styles.section}>
          <Text variant="title" accessibilityRole="header">
            {t('home.start.title')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.strip}
            contentContainerStyle={styles.stripContent}>
            {start.map((lesson) => (
              <LessonTile key={lesson.id} lesson={lesson} />
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}

function HomeRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Card
      variant="outlined"
      radius="lg"
      padding="md"
      onPress={onPress}
      accessibilityLabel={`${title}, ${subtitle}`}>
      <View style={styles.row}>
        <View style={styles.rowIcon}>
          <Icon name={icon} color="onPrimaryContainer" />
        </View>
        <View style={styles.rowText}>
          <Text variant="titleSmall">{title}</Text>
          <Text variant="body" color="onSurfaceVariant">
            {subtitle}
          </Text>
        </View>
        <Icon name="chevronRight" color="onSurfaceVariant" />
      </View>
    </Card>
  );
}

const ROW_ICON_SIZE = 44;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    rows: {
      gap: theme.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    rowIcon: {
      width: ROW_ICON_SIZE,
      height: ROW_ICON_SIZE,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    section: {
      gap: theme.spacing.md,
    },
    strip: {
      marginHorizontal: -theme.spacing.lg,
      flexGrow: 0,
    },
    stripContent: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
  });

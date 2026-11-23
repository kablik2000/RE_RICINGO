import {
  Button,
  Chip,
  Icon,
  type IconName,
  IconButton,
  ListItem,
  Screen,
  Text,
  type Theme,
  useThemedStyles,
} from '@ricingo/design-system';
import { countExchanges, listSentencesInOrder, type LessonBundle } from '@ricingo/domain';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type PluralKey, t, tPlural } from '@/core/i18n';
import { QueryView } from '@/core/ui';
import { useLessonBundle } from '@/data';

import { LessonArtwork } from '../artwork/lesson-artwork';

export function LessonIntroScreen({ lessonId }: { lessonId: string }) {
  const lesson = useLessonBundle(lessonId);
  return (
    <Screen hero={<IntroHero lessonId={lessonId} />}>
      <QueryView query={lesson} loadingMessage={t('lessonIntro.loading')}>
        {(bundle) => <LessonIntro bundle={bundle} />}
      </QueryView>
    </Screen>
  );
}

function IntroHero({ lessonId }: { lessonId: string }) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    // The content sheet overlaps the hero's bottom edge; the counter-coloured strip keeps the
    // whole scene visible above it.
    <View style={styles.heroFrame}>
      <LessonArtwork
        lessonId={lessonId}
        variant="hero"
        style={[styles.hero, { height: HERO_HEIGHT + insets.top }]}
      />
      <View style={[styles.back, { top: insets.top + BACK_OFFSET }]}>
        <IconButton
          variant="surface"
          icon="back"
          accessibilityLabel={t('lessonIntro.back')}
          onPress={() => {
            router.back();
          }}
        />
      </View>
    </View>
  );
}

function LessonIntro({ bundle }: { bundle: LessonBundle }) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { lesson } = bundle;
  const params = { lessonId: lesson.id };

  return (
    <>
      <View style={styles.heading}>
        <Chip label={lesson.level} />
        <Text variant="italianDisplay" accessibilityRole="header" accessibilityLanguage="it-IT">
          {lesson.titleItalian}
        </Text>
        <Text variant="translation" color="onSurfaceVariant">
          {lesson.titleCzech}
        </Text>
        <Text variant="bodyLarge" style={styles.goal}>
          {lesson.goal}
        </Text>
      </View>

      <View style={styles.stats}>
        <StatTile
          icon="conversation"
          value={countExchanges(lesson)}
          labelKey="lessonIntro.exchanges"
        />
        <StatTile
          icon="sentences"
          value={listSentencesInOrder(lesson).length}
          labelKey="lessonIntro.sentences"
        />
        <StatTile
          icon="grammar"
          value={bundle.grammarTopics.length}
          labelKey="lessonIntro.grammarTopics"
        />
      </View>

      <View style={styles.actions}>
        <Button
          fullWidth
          size="large"
          icon="play"
          label={t('lessonIntro.start')}
          onPress={() => {
            router.push({ pathname: '/lesson/[lessonId]/study', params });
          }}
        />
        <Button
          fullWidth
          size="large"
          variant="outlined"
          icon="headphones"
          label={t('lessonIntro.fullDialogue')}
          onPress={() => {
            router.push({ pathname: '/lesson/[lessonId]/dialogue', params });
          }}
        />
      </View>

      <View>
        <Text variant="titleSmall" accessibilityRole="header">
          {t('lessonIntro.grammar')}
        </Text>
        {bundle.grammarTopics.map((topic) => (
          <ListItem
            key={topic.id}
            title={topic.title}
            supporting={topic.summary}
            leading={
              <View style={styles.topicIcon}>
                <Icon name="grammar" size={20} color="onPrimaryContainer" />
              </View>
            }
          />
        ))}
      </View>

      <Text variant="bodySmall" color="onSurfaceVariant">
        {`${t('lessonIntro.demoNote')} ${t('audio.sourceNote')}`}
      </Text>
    </>
  );
}

function StatTile({
  icon,
  value,
  labelKey,
}: {
  icon: IconName;
  value: number;
  labelKey: PluralKey;
}) {
  const styles = useThemedStyles(createStyles);
  const label = tPlural(labelKey, value);
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${String(value)} ${label}`}>
      <Icon name={icon} size={20} color="primary" />
      <Text variant="numeral">{String(value)}</Text>
      <Text variant="bodySmall" color="onSurfaceVariant">
        {label}
      </Text>
    </View>
  );
}

const HERO_HEIGHT = 236;
const BACK_OFFSET = 8;
const TOPIC_ICON_SIZE = 40;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    heroFrame: {
      paddingBottom: theme.spacing.xl,
      backgroundColor: theme.illustration.counter,
    },
    hero: {
      width: '100%',
    },
    back: {
      position: 'absolute',
      left: theme.spacing.md,
    },
    heading: {
      gap: theme.spacing.xs,
    },
    goal: {
      marginTop: theme.spacing.sm,
    },
    stats: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    stat: {
      flex: 1,
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surfaceContainerLow,
    },
    actions: {
      gap: theme.spacing.sm,
    },
    topicIcon: {
      width: TOPIC_ICON_SIZE,
      height: TOPIC_ICON_SIZE,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

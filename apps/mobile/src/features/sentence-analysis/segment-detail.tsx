import { Card, Chip, Disclosure, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import type { GrammarTopic, LessonBundle, Lexeme, Segment } from '@ricingo/domain';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';

export interface SegmentDetailProps {
  segment: Segment;
  bundle: LessonBundle;
}

const ANNOTATION_SEPARATOR = ' · ';

function pick<T extends { id: string }>(items: readonly T[], ids: readonly string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return ids.flatMap((id) => {
    const item = byId.get(id);
    return item === undefined ? [] : [item];
  });
}

/**
 * Layered explanation of one part of a sentence (spec §3): meaning and grammatical features
 * always visible, grammar explained below, deeper context on demand.
 */
export function SegmentDetail({ segment, bundle }: SegmentDetailProps) {
  const styles = useThemedStyles(createStyles);
  const { explanation } = segment;
  const lexemes: Lexeme[] = pick(bundle.lexemes, segment.lexemeIds);
  const topics: GrammarTopic[] = pick(bundle.grammarTopics, segment.grammarTopicIds);
  const features = segment.annotation?.split(ANNOTATION_SEPARATOR) ?? [];

  return (
    <Card tone="surfaceContainerLow" padding="xl" testID="segment-detail">
      <View style={styles.titleRow}>
        <Text variant="italianTitle" accessibilityRole="header" accessibilityLanguage="it-IT">
          {segment.text}
        </Text>
        <Text variant="titleSmall" color="primary" style={styles.meaning}>
          {explanation.meaning}
        </Text>
      </View>

      {features.length > 0 && (
        <View style={styles.chips}>
          {features.map((feature) => (
            <Chip key={feature} variant="tag" label={feature} />
          ))}
        </View>
      )}

      {explanation.grammar !== undefined && <Text variant="bodyLarge">{explanation.grammar}</Text>}

      {lexemes.map((lexeme) => (
        <Text key={lexeme.id} variant="body" color="onSurfaceVariant">
          {`${t('study.word')}: ${lexeme.lemma} – ${lexeme.translation}`}
        </Text>
      ))}

      {explanation.depth !== undefined && (
        <View style={styles.divider}>
          <Disclosure icon="idea" title={t('study.depth')}>
            <Text variant="body">{explanation.depth}</Text>
          </Disclosure>
        </View>
      )}

      {topics.length > 0 && (
        <View style={styles.chips}>
          {topics.map((topic) => (
            <Chip key={topic.id} icon="grammar" label={topic.title} />
          ))}
        </View>
      )}
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    titleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      columnGap: theme.spacing.md,
    },
    meaning: {
      flexShrink: 1,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    divider: {
      borderTopWidth: theme.sizes.borderWidth,
      borderTopColor: theme.colors.outlineVariant,
    },
  });

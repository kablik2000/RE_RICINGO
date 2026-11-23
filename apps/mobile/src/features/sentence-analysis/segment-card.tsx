import { Card, Chip, Disclosure, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import type { GrammarTopic, Lexeme, Segment } from '@ricingo/domain';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';

export interface SegmentCardProps {
  segment: Segment;
  lexemes: readonly Lexeme[];
  grammarTopics: readonly GrammarTopic[];
}

/**
 * One analysed part of a sentence with layered explanation: meaning is always visible, grammar
 * and deeper context open on demand (spec §3).
 */
export function SegmentCard({ segment, lexemes, grammarTopics }: SegmentCardProps) {
  const styles = useThemedStyles(createStyles);
  const { explanation } = segment;

  const topicChips =
    grammarTopics.length > 0 ? (
      <View style={styles.chips}>
        {grammarTopics.map((topic) => (
          <Chip key={topic.id} label={topic.title} />
        ))}
      </View>
    ) : null;

  return (
    <Card>
      <Text variant="italianText">{segment.text}</Text>
      {segment.annotation !== undefined && (
        <Text variant="annotation" color="primary">
          {segment.annotation}
        </Text>
      )}
      <Text variant="bodyLarge">{explanation.meaning}</Text>
      {lexemes.map((lexeme) => (
        <Text key={lexeme.id} variant="bodySmall" color="onSurfaceVariant">
          {`${t('study.word')}: ${lexeme.lemma} – ${lexeme.translation}`}
        </Text>
      ))}
      {explanation.grammar !== undefined ? (
        <Disclosure title={t('study.grammar')}>
          <Text variant="body">{explanation.grammar}</Text>
          {topicChips}
        </Disclosure>
      ) : (
        topicChips
      )}
      {explanation.depth !== undefined && (
        <Disclosure title={t('study.depth')}>
          <Text variant="body">{explanation.depth}</Text>
        </Disclosure>
      )}
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
  });

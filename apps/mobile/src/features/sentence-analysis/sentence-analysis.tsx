import { type Theme, useThemedStyles } from '@ricingo/design-system';
import type { GrammarTopic, LessonBundle, Lexeme, Sentence } from '@ricingo/domain';
import { StyleSheet, View } from 'react-native';

import { SegmentCard } from './segment-card';

export interface SentenceAnalysisProps {
  sentence: Sentence;
  bundle: LessonBundle;
}

function pick<T extends { id: string }>(items: ReadonlyMap<string, T>, ids: readonly string[]) {
  return ids.flatMap((id) => {
    const item = items.get(id);
    return item === undefined ? [] : [item];
  });
}

/** Step-by-step breakdown of a sentence into its analysed segments. */
export function SentenceAnalysis({ sentence, bundle }: SentenceAnalysisProps) {
  const styles = useThemedStyles(createStyles);
  const lexemes = new Map<string, Lexeme>(bundle.lexemes.map((lexeme) => [lexeme.id, lexeme]));
  const topics = new Map<string, GrammarTopic>(
    bundle.grammarTopics.map((topic) => [topic.id, topic]),
  );

  return (
    <View style={styles.list}>
      {sentence.segments.map((segment) => (
        <SegmentCard
          key={segment.id}
          segment={segment}
          lexemes={pick(lexemes, segment.lexemeIds)}
          grammarTopics={pick(topics, segment.grammarTopicIds)}
        />
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      gap: theme.spacing.md,
    },
  });

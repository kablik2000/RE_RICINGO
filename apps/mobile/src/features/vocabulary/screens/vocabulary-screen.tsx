import {
  Card,
  Chip,
  EmptyState,
  Screen,
  Text,
  type Theme,
  useThemedStyles,
} from '@ricingo/design-system';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';
import { QueryView } from '@/core/ui';
import { useVocabulary, type VocabularyEntry } from '@/data';
import { ItalianVoiceNotice, ListenButtons } from '@/features/audio';

export function VocabularyScreen() {
  const vocabulary = useVocabulary();
  return (
    <Screen title={t('vocabulary.title')}>
      <QueryView query={vocabulary} loadingMessage={t('vocabulary.loading')}>
        {(entries) =>
          entries.length === 0 ? (
            <EmptyState
              title={t('vocabulary.empty.title')}
              message={t('vocabulary.empty.message')}
            />
          ) : (
            <>
              <ItalianVoiceNotice />
              {entries.map((entry) => (
                <VocabularyCard key={`${entry.lessonId}:${entry.lexeme.id}`} entry={entry} />
              ))}
            </>
          )
        }
      </QueryView>
    </Screen>
  );
}

/** A word with its translation and the sentence where the student met it (spec §5). */
function VocabularyCard({ entry }: { entry: VocabularyEntry }) {
  const styles = useThemedStyles(createStyles);
  const { lexeme } = entry;
  const firstSentence = entry.sentences[0];

  return (
    <Card>
      <View style={styles.titleRow}>
        <Text variant="italianText" accessibilityLanguage="it-IT">
          {lexeme.lemma}
        </Text>
        {lexeme.gender !== undefined && <Chip label={t(`vocabulary.gender.${lexeme.gender}`)} />}
      </View>
      <Text variant="bodyLarge">{lexeme.translation}</Text>
      {lexeme.note !== undefined && (
        <Text variant="bodySmall" color="onSurfaceVariant">
          {lexeme.note}
        </Text>
      )}
      {firstSentence !== undefined && (
        <Text variant="bodySmall" color="onSurfaceVariant">
          {`${t('vocabulary.fromLesson', { lesson: entry.lessonTitle })} ${firstSentence.italian}`}
        </Text>
      )}
      <ListenButtons text={lexeme.lemma} compact />
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
  });

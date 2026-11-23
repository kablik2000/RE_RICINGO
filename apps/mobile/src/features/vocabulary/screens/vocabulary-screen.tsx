import {
  Chip,
  EmptyState,
  FilterChip,
  ListItem,
  Screen,
  SearchField,
  Text,
  type Theme,
  useThemedStyles,
} from '@ricingo/design-system';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';
import { QueryView } from '@/core/ui';
import { useVocabulary, type VocabularyEntry } from '@/data';
import { ItalianVoiceNotice, ListenButtons } from '@/features/audio';

import { filterVocabulary, groupByInitial, type VocabularyFilter } from '../vocabulary-filter';

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
            <Vocabulary entries={entries} />
          )
        }
      </QueryView>
    </Screen>
  );
}

function sameFilter(a: VocabularyFilter, b: VocabularyFilter): boolean {
  return (
    a.kind === b.kind && (a.kind !== 'lesson' || (b.kind === 'lesson' && a.lessonId === b.lessonId))
  );
}

function Vocabulary({ entries }: { entries: readonly VocabularyEntry[] }) {
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<VocabularyFilter>({ kind: 'all' });
  const lessons = [...new Map(entries.map((entry) => [entry.lessonId, entry.lessonTitle]))];
  const sections = groupByInitial(filterVocabulary(entries, query, filter));

  const filters: { key: string; label: string; value: VocabularyFilter }[] = [
    {
      key: 'all',
      label: t('vocabulary.filters.all', { count: entries.length }),
      value: { kind: 'all' },
    },
    ...lessons.map(([lessonId, title]) => ({
      key: `lesson:${lessonId}`,
      label: title,
      value: { kind: 'lesson', lessonId } as const,
    })),
    { key: 'nouns', label: t('vocabulary.filters.nouns'), value: { kind: 'nouns' } },
    { key: 'verbs', label: t('vocabulary.filters.verbs'), value: { kind: 'verbs' } },
    { key: 'phrases', label: t('vocabulary.filters.phrases'), value: { kind: 'phrases' } },
  ];

  return (
    <>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={t('vocabulary.search')}
        accessibilityLabel={t('vocabulary.searchLabel')}
        clearLabel={t('vocabulary.clearSearch')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={t('vocabulary.filtersLabel')}
        contentContainerStyle={styles.filters}
        style={styles.filterStrip}>
        {filters.map((item) => (
          <FilterChip
            key={item.key}
            label={item.label}
            selected={sameFilter(filter, item.value)}
            onPress={() => {
              setFilter(item.value);
            }}
          />
        ))}
      </ScrollView>

      <ItalianVoiceNotice />

      {sections.length === 0 ? (
        <EmptyState
          title={t('vocabulary.noResults.title')}
          message={t('vocabulary.noResults.message')}
        />
      ) : (
        sections.map((section) => (
          <View key={section.initial} style={styles.section}>
            <Text variant="label" color="primary" accessibilityRole="header">
              {section.initial}
            </Text>
            {section.entries.map((entry) => (
              <VocabularyRow key={`${entry.lessonId}:${entry.lexeme.id}`} entry={entry} />
            ))}
          </View>
        ))
      )}
    </>
  );
}

/** A word with its translation and the sentence where the student met it (spec §5). */
function VocabularyRow({ entry }: { entry: VocabularyEntry }) {
  const styles = useThemedStyles(createStyles);
  const { lexeme } = entry;
  const firstSentence = entry.sentences[0];

  return (
    <ListItem
      title={lexeme.lemma}
      titleVariant="italianText"
      titleLanguage="it-IT"
      titleAccessory={
        lexeme.gender !== undefined ? (
          <Chip variant="tag" label={t(`vocabulary.gender.${lexeme.gender}`)} />
        ) : undefined
      }
      supporting={
        <View style={styles.supporting}>
          <Text variant="body" color="onSurfaceVariant">
            {lexeme.note === undefined
              ? lexeme.translation
              : `${lexeme.translation} · ${lexeme.note}`}
          </Text>
          {firstSentence !== undefined && (
            <Text variant="bodySmall" color="onSurfaceVariant">
              {t('vocabulary.fromLesson', {
                lesson: entry.lessonTitle,
                sentence: firstSentence.italian,
              })}
            </Text>
          )}
        </View>
      }
      trailing={<ListenButtons text={lexeme.lemma} compact />}
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    filterStrip: {
      marginHorizontal: -theme.spacing.lg,
      flexGrow: 0,
    },
    filters: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    section: {
      gap: theme.spacing.xxs,
    },
    supporting: {
      gap: theme.spacing.xxs,
    },
  });

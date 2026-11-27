import { Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';

export interface TileBuilderProps {
  tiles: readonly string[];
  /** Tile positions in the order placed. */
  placed: readonly number[];
  /** After checking: whether the sentence was right; `null` while answering. */
  checked: boolean | null;
  onPlace: (tile: number) => void;
  onRemove: (position: number) => void;
}

/** Builds an Italian sentence: tap tiles to add them, tap a placed tile to take it back. */
export function TileBuilder({ tiles, placed, checked, onPlace, onRemove }: TileBuilderProps) {
  const styles = useThemedStyles(createStyles);
  const locked = checked !== null;
  return (
    <View style={styles.builder}>
      <View
        style={[
          styles.answer,
          checked === true && styles.answerCorrect,
          checked === false && styles.answerWrong,
        ]}
        accessibilityLabel={t('practice.session.builtLabel')}>
        {placed.length === 0 ? (
          <Text variant="body" color="onSurfaceVariant">
            {t('practice.session.builtEmpty')}
          </Text>
        ) : (
          placed.map((tile, position) => {
            const text = tiles[tile] ?? '';
            return (
              <Tile
                key={`${String(tile)}@${String(position)}`}
                text={text}
                disabled={locked}
                accessibilityLabel={t('practice.session.removeTile', { text })}
                onPress={() => {
                  onRemove(position);
                }}
              />
            );
          })
        )}
      </View>
      <View style={styles.pool} accessibilityLabel={t('practice.session.tilesLabel')}>
        {tiles.map((text, tile) =>
          placed.includes(tile) ? (
            <View key={tile} style={[styles.tile, styles.used]}>
              <Text variant="italianText" style={styles.hidden}>
                {text}
              </Text>
            </View>
          ) : (
            <Tile
              key={tile}
              text={text}
              disabled={locked}
              onPress={() => {
                onPlace(tile);
              }}
            />
          ),
        )}
      </View>
    </View>
  );
}

function Tile({
  text,
  disabled,
  accessibilityLabel,
  onPress,
}: {
  text: string;
  disabled: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLanguage="it-IT"
      {...(accessibilityLabel !== undefined && { accessibilityLabel })}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
      <Text variant="italianText">{text}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    builder: {
      gap: theme.spacing.xl,
    },
    answer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minHeight: theme.sizes.minTouchTarget * 2,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLow,
    },
    answerCorrect: {
      borderColor: theme.colors.success,
      backgroundColor: theme.colors.successContainer,
    },
    answerWrong: {
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.errorContainer,
    },
    pool: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      justifyContent: 'center',
    },
    tile: {
      minHeight: theme.sizes.minTouchTarget,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
      boxShadow: theme.elevation[1],
    },
    tilePressed: {
      backgroundColor: theme.colors.surfaceContainer,
    },
    used: {
      backgroundColor: theme.colors.surfaceContainer,
      borderColor: theme.colors.surfaceContainer,
      boxShadow: theme.elevation[0],
    },
    hidden: {
      opacity: 0,
    },
  });

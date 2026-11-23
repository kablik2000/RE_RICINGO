import { Text, useTheme } from '@ricingo/design-system';
import { type Sentence, splitSentenceIntoPieces } from '@ricingo/domain';

import { t } from '@/core/i18n';

export interface InteractiveSentenceProps {
  sentence: Sentence;
  selectedSegmentId: string | undefined;
  onSelectSegment: (segmentId: string) => void;
}

/**
 * The Italian sentence as written, with every analysed segment tappable: segments are softly
 * tinted to show they can be opened, the selected one is highlighted. (A tint rather than an
 * underline: Android does not draw decorations on nested text reliably.)
 */
export function InteractiveSentence({
  sentence,
  selectedSegmentId,
  onSelectSegment,
}: InteractiveSentenceProps) {
  const theme = useTheme();
  const pieces = splitSentenceIntoPieces(sentence);

  return (
    <Text variant="italianSentence" accessibilityLanguage="it-IT">
      {pieces.map((piece, index) => {
        if (piece.kind === 'gap') {
          return piece.text;
        }
        const selected = piece.segment.id === selectedSegmentId;
        return (
          <Text
            key={piece.segment.id}
            variant="italianSentence"
            color={selected ? 'onPrimaryContainer' : 'onSurface'}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityHint={t('study.segmentHint')}
            onPress={() => {
              onSelectSegment(piece.segment.id);
            }}
            style={
              selected
                ? { backgroundColor: theme.colors.primaryContainer }
                : { backgroundColor: theme.colors.surfaceContainer }
            }
            testID={`segment-${String(index)}`}>
            {piece.text}
          </Text>
        );
      })}
    </Text>
  );
}

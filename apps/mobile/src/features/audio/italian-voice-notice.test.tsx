import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Speech from 'expo-speech';

import { t } from '@/core/i18n';
import { renderWithProviders } from '@/testing/render-with-providers';

import { ITALIAN_TEST_VOICE } from '../../../jest.setup';
import { ItalianVoiceNotice } from './italian-voice-notice';
import { ListenButtons } from './listen-buttons';

function PronunciationArea() {
  return (
    <>
      <ItalianVoiceNotice />
      <ListenButtons text="Un caffè, per favore." />
    </>
  );
}

describe('ItalianVoiceNotice', () => {
  it('stays hidden and keeps playback when an Italian voice is installed', async () => {
    await renderWithProviders(<PronunciationArea />);

    expect(await screen.findByRole('button', { name: t('audio.playLabel') })).toBeOnTheScreen();
    expect(screen.queryByText(t('audio.voiceMissing.title'))).not.toBeOnTheScreen();
  });

  it('replaces playback with a notice when the device has no Italian voice', async () => {
    jest
      .mocked(Speech.getAvailableVoicesAsync)
      .mockResolvedValue([{ ...ITALIAN_TEST_VOICE, identifier: 'en', language: 'en-US' }]);

    await renderWithProviders(<PronunciationArea />);

    expect(await screen.findByText(t('audio.voiceMissing.title'))).toBeOnTheScreen();
    // iOS (the test platform) has no API to download voices: the notice explains where to get one.
    expect(screen.getByText(t('audio.voiceMissing.iosSteps'))).toBeOnTheScreen();
    expect(screen.queryByText(t('audio.voiceMissing.download'))).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('audio.playLabel') })).not.toBeOnTheScreen();
    expect(screen.getByText(t('audio.voiceMissing.recheck'))).toBeOnTheScreen();
  });

  it('shows playback again after re-checking once the voice was installed', async () => {
    jest
      .mocked(Speech.getAvailableVoicesAsync)
      .mockResolvedValueOnce([{ ...ITALIAN_TEST_VOICE, identifier: 'en', language: 'en-US' }]);

    await renderWithProviders(<PronunciationArea />);
    await fireEvent.press(await screen.findByText(t('audio.voiceMissing.recheck')));

    await waitFor(() => {
      expect(screen.queryByText(t('audio.voiceMissing.title'))).not.toBeOnTheScreen();
    });
    expect(screen.getByRole('button', { name: t('audio.playLabel') })).toBeOnTheScreen();
  });
});

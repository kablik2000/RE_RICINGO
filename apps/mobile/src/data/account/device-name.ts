import { Platform } from 'react-native';

/**
 * A recognisable name for this device in the student's device list ("Pixel 7", "iPad"). Uses
 * what React Native already knows, so no extra native module is needed.
 */
export function deviceName(): string {
  if (Platform.OS === 'android') {
    const constants = Platform.constants as { Model?: string; Manufacturer?: string };
    const model = constants.Model?.trim();
    return model !== undefined && model !== '' ? model : 'Android';
  }
  if (Platform.OS === 'ios') {
    return Platform.isPad ? 'iPad' : 'iPhone';
  }
  return 'Web';
}

import { Platform } from 'react-native';
import FingerprintScanner from 'react-native-fingerprint-scanner';
import * as Keychain from 'react-native-keychain';
import { useSettingStore } from '../stores/use-setting-store';
import { MMKV } from '../common/database/mmkv';
import Storage from '../common/database/storage';
import { ShowToastEvent, ToastEvent } from './event-manager';

const KeychainConfig = Platform.select({
  ios: {
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  },
  android: {}
});

async function isBiometryAvailable() {
  try {
    return await FingerprintScanner.isSensorAvailable();
  } catch (e) {
    return false;
  }
}

async function enableFingerprintAuth() {
  if (!isBiometryAvailable()) return;
  await Storage.write('fingerprintAuthEnabled', 'enabled');
}

async function isFingerprintAuthEnabled() {
  return await MMKV.getStringAsync('fingerprintAuthEnabled');
}

async function storeCredentials(password: string) {
  await Keychain.setInternetCredentials('nn_vault', 'notesnookvault', password, KeychainConfig);
}

async function resetCredentials() {
  return await Keychain.resetInternetCredentials('nn_vault');
}

async function hasInternetCredentials() {
  return await Keychain.hasInternetCredentials('nn_vault');
}

async function getCredentials(title?: string, description?: string) {
  try {
    useSettingStore.getState().setRequestBiometrics(true);

    let options = Platform.select({
      ios: {
        fallbackEnabled: true,
        description: description
      },
      android: {
        title: title,
        description: description,
        deviceCredentialAllowed: true
      }
    });
    //@ts-ignore
    await FingerprintScanner.authenticate(options);
    setTimeout(() => {
      useSettingStore.getState().setRequestBiometrics(false);
    }, 1000);
    FingerprintScanner.release();
    return await Keychain.getInternetCredentials('nn_vault');
  } catch (e) {
    useSettingStore.getState().setRequestBiometrics(false);
    FingerprintScanner.release();
    let message: ShowToastEvent = {
      heading: 'Authentication with biometrics failed.',
      message: 'Tap "Biometric Unlock" to try again.',
      type: 'error',
      context: 'local'
    };
    //@ts-ignore
    if (e.name === 'DeviceLocked') {
      message = {
        heading: 'Biometrics authentication failed.',
        message: 'Wait 30 seconds to try again.',
        type: 'error',
        context: 'local'
      };
      //@ts-ignore
    } else if (e.name === 'UserFallback') {
      message = {
        heading: 'Authentication cancelled by user.',
        message: 'Tap "Biometric Unlock" to try again.',
        type: 'error',
        context: 'local'
      };
    }

    setTimeout(() => ToastEvent.show(message), 1000);
    return null;
  }
}

async function validateUser(title: string, description?: string) {
  try {
    await FingerprintScanner.authenticate(
      //@ts-ignore
      Platform.select({
        ios: {
          fallbackEnabled: true,
          description: title
        },
        android: {
          title: title,
          description: description,
          deviceCredentialAllowed: true
        }
      })
    );
    FingerprintScanner.release();
    return true;
  } catch (e) {
    FingerprintScanner.release();
    //@ts-ignore
    if (e.name === 'DeviceLocked') {
      ToastEvent.show({
        heading: 'Biometrics authentication failed.',
        message: 'Wait 30 seconds to try again.',
        type: 'error',
        context: 'local'
      });
    } else {
      ToastEvent.show({
        heading: 'Authentication failed.',
        message: 'Tap to try again.',
        type: 'error',
        context: 'local'
      });
    }
    return false;
  }
}

const BiometicService = {
  isBiometryAvailable,
  enableFingerprintAuth,
  isFingerprintAuthEnabled,
  resetCredentials,
  getCredentials,
  storeCredentials,
  hasInternetCredentials,
  validateUser
};

export default BiometicService;
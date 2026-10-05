// src/store/useUpdateStore.ts
import { create } from 'zustand';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  checkForAppUpdate,
  UpdateCheckResult,
  DEFAULT_GITHUB_OWNER,
  DEFAULT_GITHUB_REPO,
} from '../services/updateService';
import { ApkInstaller } from '../services/apkInstaller';

export type UpdateStatus =
  | 'IDLE'
  | 'CHECKING'
  | 'AVAILABLE'
  | 'DOWNLOADING'
  | 'READY'
  | 'ERROR';

// Minimum interval between automatic background checks (30 minutes)
const AUTO_CHECK_INTERVAL_MS = 30 * 60 * 1000;

interface UpdateState {
  status: UpdateStatus;
  updateInfo: UpdateCheckResult | null;
  progress: number;
  bytesWritten: number;
  bytesTotal: number;
  downloadedApkUri: string | null;
  errorMessage: string | null;
  isPermissionError: boolean;
  lastCheckedTime: number | null;
  currentVersion: string;

  // Actions
  checkForUpdates: (manual?: boolean) => Promise<UpdateCheckResult | null>;
  startDownloadAndInstall: () => Promise<void>;
  installDownloadedApk: () => Promise<void>;
  openAndroidSettings: () => Promise<void>;
  dismiss: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => {
  const currentVersion = Constants.expoConfig?.version || '2.0.0';

  return {
    status: 'IDLE',
    updateInfo: null,
    progress: 0,
    bytesWritten: 0,
    bytesTotal: 0,
    downloadedApkUri: null,
    errorMessage: null,
    isPermissionError: false,
    lastCheckedTime: null,
    currentVersion,

    checkForUpdates: async (manual: boolean = false) => {
      if (Platform.OS !== 'android') return null;

      const state = get();

      // Guard: If currently downloading or an update modal is already open, do not overwrite state
      if (state.status === 'DOWNLOADING') {
        return state.updateInfo;
      }

      // Rate-limiting check for automatic background checks
      if (!manual && state.lastCheckedTime) {
        const elapsed = Date.now() - state.lastCheckedTime;
        if (elapsed < AUTO_CHECK_INTERVAL_MS) {
          return state.updateInfo;
        }
      }

      try {
        set({ status: 'CHECKING', errorMessage: null, isPermissionError: false });

        const result = await checkForAppUpdate(
          DEFAULT_GITHUB_OWNER,
          DEFAULT_GITHUB_REPO,
          currentVersion
        );

        set({
          lastCheckedTime: Date.now(),
          updateInfo: result,
          status: result.isUpdateAvailable ? 'AVAILABLE' : 'IDLE',
        });

        return result;
      } catch (err: any) {
        const message = err.message || 'Unable to check for updates.';
        // On automatic check, quietly return to IDLE without disturbing the user
        if (manual) {
          set({ status: 'ERROR', errorMessage: message });
        } else {
          set({ status: 'IDLE' });
        }
        return null;
      }
    },

    startDownloadAndInstall: async () => {
      const { updateInfo, downloadedApkUri } = get();

      // If already downloaded and file exists, directly install
      if (downloadedApkUri) {
        await get().installDownloadedApk();
        return;
      }

      if (!updateInfo?.apkDownloadUrl) {
        set({
          status: 'ERROR',
          errorMessage: 'No compatible APK download found for this release.',
        });
        return;
      }

      try {
        set({
          status: 'DOWNLOADING',
          progress: 0,
          bytesWritten: 0,
          bytesTotal: updateInfo.apkSize || 0,
          errorMessage: null,
          isPermissionError: false,
        });

        const fileName = updateInfo.apkName || `Advocat-${updateInfo.latestVersion}.apk`;

        const localUri = await ApkInstaller.downloadApk(
          updateInfo.apkDownloadUrl,
          fileName,
          updateInfo.apkSize,
          (percent, written, total) => {
            set({ progress: percent, bytesWritten: written, bytesTotal: total });
          }
        );

        set({ downloadedApkUri: localUri, status: 'READY' });

        // Trigger installer immediately
        await get().installDownloadedApk();
      } catch (err: any) {
        set({
          status: 'ERROR',
          errorMessage: err.message || 'Download failed. Please check your internet connection.',
        });
      }
    },

    installDownloadedApk: async () => {
      const { downloadedApkUri } = get();
      if (!downloadedApkUri) {
        set({
          status: 'AVAILABLE',
          errorMessage: 'Package missing. Please download again.',
        });
        return;
      }

      try {
        set({ isPermissionError: false });
        await ApkInstaller.installExistingApk(downloadedApkUri);
        // Retain READY status so if user returns after granting settings toggle,
        // they can tap "Install Now" again without redownloading.
        set({ status: 'READY' });
      } catch (err: any) {
        const msg = (err.message || '').toLowerCase();
        const isPerm = msg.includes('permission') || msg.includes('security') || msg.includes('source');
        set({
          status: 'READY',
          errorMessage: isPerm
            ? 'Unknown app installation permission required. Please enable it in Settings.'
            : (err.message || 'Unable to start installer.'),
          isPermissionError: isPerm,
        });
      }
    },

    openAndroidSettings: async () => {
      await ApkInstaller.openUnknownSourcesSettings();
    },

    dismiss: () => {
      const { status } = get();
      if (status === 'DOWNLOADING') {
        ApkInstaller.cancel();
      }
      set({ status: 'IDLE', errorMessage: null });
    },
  };
});

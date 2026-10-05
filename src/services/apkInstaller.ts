// src/services/apkInstaller.ts
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { APP_PACKAGE_NAME } from './updateService';

export type DownloadProgressCallback = (
  percent: number,
  writtenBytes: number,
  totalBytes: number
) => void;

export class ApkInstaller {
  private static activeDownload: FileSystem.DownloadResumable | null = null;
  private static isDownloading: boolean = false;

  /**
   * Downloads APK to local cache with progress updates and size verification.
   * Returns the local file URI on success.
   */
  static async downloadApk(
    apkUrl: string,
    apkName: string = 'Advocat-update.apk',
    expectedSize?: number,
    onProgress?: DownloadProgressCallback
  ): Promise<string> {
    if (Platform.OS !== 'android') {
      throw new Error('APK downloads are only supported on Android.');
    }

    if (this.isDownloading) {
      throw new Error('A download is already in progress.');
    }

    const localFileUri = `${FileSystem.cacheDirectory}${apkName}`;

    // Clean up any stale/previous file before starting
    try {
      const fileInfo = await FileSystem.getInfoAsync(localFileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localFileUri, { idempotent: true });
      }
    } catch {
      // Continue if delete fails
    }

    this.isDownloading = true;

    try {
      this.activeDownload = FileSystem.createDownloadResumable(
        apkUrl,
        localFileUri,
        {},
        (progress) => {
          const { totalBytesWritten, totalBytesExpectedToWrite } = progress;
          const total = totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : (expectedSize || 0);
          if (total > 0 && onProgress) {
            const percent = Math.min(
              100,
              Math.max(0, Math.floor((totalBytesWritten / total) * 100))
            );
            onProgress(percent, totalBytesWritten, total);
          }
        }
      );

      const result = await this.activeDownload.downloadAsync();
      if (!result?.uri) {
        throw new Error('Download failed: No file URI returned by download manager.');
      }

      // Integrity Check: verify downloaded file exists and is not zero-byte
      const downloadedInfo = await FileSystem.getInfoAsync(result.uri);
      if (!downloadedInfo.exists || downloadedInfo.size === 0) {
        throw new Error('Downloaded APK is empty or corrupted. Please retry.');
      }

      // If expectedSize is known, check that at least 95% was received
      if (expectedSize && expectedSize > 0 && downloadedInfo.size < expectedSize * 0.95) {
        await this.deleteCachedApk(result.uri);
        throw new Error('Downloaded APK is incomplete. Please check your internet connection.');
      }

      return result.uri;
    } catch (err: any) {
      // Clean up partial file on failure
      await this.deleteCachedApk(localFileUri);
      throw err;
    } finally {
      this.activeDownload = null;
      this.isDownloading = false;
    }
  }

  /**
   * Installs an already-downloaded APK file URI.
   * If user leaves the app to toggle "Unknown Sources" in Android settings,
   * this can be called again immediately without re-downloading.
   */
  static async installExistingApk(localUri: string): Promise<void> {
    if (Platform.OS !== 'android') return;

    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists || fileInfo.size === 0) {
      throw new Error('The downloaded APK was removed or corrupted. Please download again.');
    }

    // Convert file:// to content:// URI via Expo's FileProvider
    const contentUri = await FileSystem.getContentUriAsync(localUri);

    // Flag 1 = Intent.FLAG_GRANT_READ_URI_PERMISSION
    // Flag 268435456 = Intent.FLAG_ACTIVITY_NEW_TASK
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1 | 268435456,
      type: 'application/vnd.android.package-archive',
    });
  }

  /**
   * Opens Android Settings -> Special App Access -> Install Unknown Apps
   * so the user can easily grant permission if the system prompt was dismissed.
   */
  static async openUnknownSourcesSettings(): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.MANAGE_UNKNOWN_APP_SOURCES',
        { data: `package:${APP_PACKAGE_NAME}` }
      );
    } catch {
      // Fallback to generic Application Details screen if specific intent is unsupported
      try {
        await IntentLauncher.startActivityAsync(
          'android.settings.APPLICATION_DETAILS_SETTINGS',
          { data: `package:${APP_PACKAGE_NAME}` }
        );
      } catch {
        // Suppress if settings cannot be opened directly
      }
    }
  }

  /**
   * Safe file cleanup
   */
  static async deleteCachedApk(uri: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch {
      // Ignore cleanup error
    }
  }

  /**
   * Cancel ongoing download
   */
  static async cancel(): Promise<void> {
    if (this.activeDownload) {
      try {
        await this.activeDownload.pauseAsync();
      } catch {
        // Ignore pause failure
      }
      this.activeDownload = null;
      this.isDownloading = false;
    }
  }
}

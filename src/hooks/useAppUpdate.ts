// src/hooks/useAppUpdate.ts
import { useEffect } from 'react';
import { useUpdateStore, UpdateStatus } from '../store/useUpdateStore';

export { UpdateStatus };

export interface UseAppUpdateOptions {
  autoCheckOnMount?: boolean;
}

export function useAppUpdate(options: UseAppUpdateOptions = {}) {
  const { autoCheckOnMount = true } = options;

  const status = useUpdateStore(state => state.status);
  const updateInfo = useUpdateStore(state => state.updateInfo);
  const progress = useUpdateStore(state => state.progress);
  const bytesWritten = useUpdateStore(state => state.bytesWritten);
  const bytesTotal = useUpdateStore(state => state.bytesTotal);
  const errorMessage = useUpdateStore(state => state.errorMessage);
  const isPermissionError = useUpdateStore(state => state.isPermissionError);
  const currentVersion = useUpdateStore(state => state.currentVersion);

  const checkForUpdates = useUpdateStore(state => state.checkForUpdates);
  const startDownloadAndInstall = useUpdateStore(state => state.startDownloadAndInstall);
  const installDownloadedApk = useUpdateStore(state => state.installDownloadedApk);
  const openAndroidSettings = useUpdateStore(state => state.openAndroidSettings);
  const dismiss = useUpdateStore(state => state.dismiss);

  useEffect(() => {
    if (autoCheckOnMount) {
      checkForUpdates(false);
    }
  }, [autoCheckOnMount, checkForUpdates]);

  return {
    status,
    updateInfo,
    progress,
    bytesWritten,
    bytesTotal,
    errorMessage,
    isPermissionError,
    currentVersion,
    check: checkForUpdates,
    startDownloadAndInstall,
    installDownloadedApk,
    openAndroidSettings,
    dismiss,
  };
}

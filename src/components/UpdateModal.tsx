// src/components/UpdateModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useUpdateStore } from '../store/useUpdateStore';

export const UpdateModal: React.FC = () => {
  const { colors, spacing, mode } = useTheme();

  const status = useUpdateStore(state => state.status);
  const updateInfo = useUpdateStore(state => state.updateInfo);
  const progress = useUpdateStore(state => state.progress);
  const bytesWritten = useUpdateStore(state => state.bytesWritten);
  const bytesTotal = useUpdateStore(state => state.bytesTotal);
  const errorMessage = useUpdateStore(state => state.errorMessage);
  const isPermissionError = useUpdateStore(state => state.isPermissionError);

  const startDownloadAndInstall = useUpdateStore(state => state.startDownloadAndInstall);
  const installDownloadedApk = useUpdateStore(state => state.installDownloadedApk);
  const openAndroidSettings = useUpdateStore(state => state.openAndroidSettings);
  const dismiss = useUpdateStore(state => state.dismiss);

  const isVisible =
    status === 'AVAILABLE' ||
    status === 'DOWNLOADING' ||
    status === 'READY' ||
    status === 'ERROR';

  if (!isVisible) return null;

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const isDark = mode === 'dark';

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.l,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.l,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.m,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accentMuted,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.m,
    },
    headerTextContainer: {
      flex: 1,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    badge: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.accent,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
    notesContainer: {
      backgroundColor: colors.surfaceHighlight,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.m,
      maxHeight: 180,
      marginBottom: spacing.m,
    },
    notesHeader: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    notesScroll: {
      maxHeight: 130,
    },
    notesText: {
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 19,
    },
    progressSection: {
      marginBottom: spacing.m,
    },
    progressBarTrack: {
      height: 8,
      backgroundColor: colors.surfaceHighlight,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 4,
    },
    progressInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    progressPercentText: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: '700',
    },
    errorBox: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
      marginBottom: spacing.m,
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    errorText: {
      flex: 1,
      color: colors.critical,
      fontSize: 12,
      lineHeight: 16,
    },
    settingsLink: {
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'flex-start',
    },
    settingsLinkText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '600',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.m,
      marginTop: spacing.xs,
    },
    button: {
      flex: 1,
      height: 46,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    primaryButton: {
      backgroundColor: colors.accent,
    },
    secondaryButton: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    disabledButton: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    secondaryButtonText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '500',
    },
  });

  return (
    <Modal
      visible={isVisible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name={status === 'ERROR' ? 'alert-circle' : 'cloud-download'}
                size={24}
                color={status === 'ERROR' ? colors.critical : colors.accent}
              />
            </View>
            <View style={styles.headerTextContainer}>
              <View style={styles.badgeRow}>
                <Text style={styles.badge}>
                  {status === 'READY'
                    ? 'PACKAGE DOWNLOADED'
                    : status === 'DOWNLOADING'
                    ? 'DOWNLOADING UPDATE'
                    : 'NEW RELEASE AVAILABLE'}
                </Text>
              </View>
              <Text style={styles.title}>Version {updateInfo?.latestVersion}</Text>
              <Text style={styles.subtitle}>
                Current: v{updateInfo?.currentVersion}
                {updateInfo?.apkSize ? ` • ${formatSize(updateInfo.apkSize)}` : ''}
              </Text>
            </View>
          </View>

          {/* Release Notes */}
          <View style={styles.notesContainer}>
            <Text style={styles.notesHeader}>What's New</Text>
            <ScrollView
              style={styles.notesScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              <Text style={styles.notesText}>{updateInfo?.releaseNotes}</Text>
            </ScrollView>
          </View>

          {/* Downloading Progress Bar */}
          {status === 'DOWNLOADING' && (
            <View style={styles.progressSection}>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
              <View style={styles.progressInfoRow}>
                <Text style={styles.progressText}>
                  {bytesTotal > 0
                    ? `${formatSize(bytesWritten)} of ${formatSize(bytesTotal)}`
                    : 'Downloading APK...'}
                </Text>
                <Text style={styles.progressPercentText}>{progress}%</Text>
              </View>
            </View>
          )}

          {/* Error Message & Permission Settings Trigger */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <View style={styles.errorRow}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={18}
                  color={colors.critical}
                />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
              {isPermissionError && (
                <TouchableOpacity
                  style={styles.settingsLink}
                  onPress={openAndroidSettings}
                  activeOpacity={0.7}
                >
                  <Text style={styles.settingsLinkText}>Open App Settings</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {status !== 'DOWNLOADING' && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={dismiss}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Later</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                status === 'DOWNLOADING' && styles.disabledButton,
              ]}
              onPress={() => {
                if (status === 'READY') {
                  installDownloadedApk();
                } else {
                  startDownloadAndInstall();
                }
              }}
              disabled={status === 'DOWNLOADING'}
              activeOpacity={0.8}
            >
              {status === 'DOWNLOADING' ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.primaryButtonText}>Downloading...</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={status === 'READY' ? 'check' : 'download'}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.primaryButtonText}>
                    {status === 'READY'
                      ? 'Install Now'
                      : status === 'ERROR'
                      ? 'Retry Download'
                      : 'Download & Install'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

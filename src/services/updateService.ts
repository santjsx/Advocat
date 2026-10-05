// src/services/updateService.ts
import * as Device from 'expo-device';

export const DEFAULT_GITHUB_OWNER = 'santjsx';
export const DEFAULT_GITHUB_REPO = 'Advocat';
export const APP_PACKAGE_NAME = 'com.advocat.app';

export interface GitHubAsset {
  id: number;
  name: string;
  size: number;
  browser_download_url: string;
  content_type: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
  assets: GitHubAsset[];
}

export interface UpdateCheckResult {
  isUpdateAvailable: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseNotes: string;
  apkDownloadUrl?: string;
  apkSize?: number;
  apkName?: string;
  publishedAt?: string;
}

/**
 * Hardened Semantic Version comparator.
 * Handles:
 * - 'v2.1.0' vs '2.1.0'
 * - '2.0.0-rc.1' vs '2.0.0'
 * - '2.0.0+build.42' vs '2.0.0'
 * - 4-segment versions e.g. '2.0.0.1'
 *
 * Returns:
 *  1 if v1 > v2 (e.g. 2.1.0 > 2.0.0 -> update available)
 * -1 if v1 < v2
 *  0 if v1 === v2
 */
export function compareSemVer(v1: string, v2: string): number {
  const sanitize = (raw: string) => {
    if (!raw) return [];
    // Strip leading v/V and prefixes like 'release-'
    const stripped = raw.trim().replace(/^(v|release-)/i, '');
    // Ignore build metadata (+...) and pre-release suffix (-...)
    const mainVersion = stripped.split('+')[0]?.split('-')[0] || '';
    return mainVersion
      .split('.')
      .map(part => {
        const parsed = parseInt(part, 10);
        return isNaN(parsed) ? 0 : parsed;
      });
  };

  const p1 = sanitize(v1);
  const p2 = sanitize(v2);

  const length = Math.max(p1.length, p2.length);
  for (let i = 0; i < length; i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Given a list of release assets and device CPU architectures, picks the best matching APK:
 * 1. Specific device ABI (e.g. arm64-v8a)
 * 2. Universal build
 * 3. Fallback to any .apk asset
 */
export function selectBestApkAsset(assets: GitHubAsset[]): GitHubAsset | null {
  const apkAssets = (assets || []).filter(a => a.name.toLowerCase().endsWith('.apk'));
  if (apkAssets.length === 0) return null;
  if (apkAssets.length === 1) return apkAssets[0];

  const deviceAbis = (Device.supportedCpuArchitectures || []).map(a => a.toLowerCase());

  // 1. Try matching device ABI specifically (e.g. arm64-v8a)
  for (const abi of deviceAbis) {
    const match = apkAssets.find(a => a.name.toLowerCase().includes(abi));
    if (match) return match;
  }

  // 2. Try universal APK
  const universal = apkAssets.find(a => a.name.toLowerCase().includes('universal'));
  if (universal) return universal;

  // 3. Fallback: First APK
  return apkAssets[0];
}

/**
 * Checks GitHub for the latest release and verifies asset availability.
 */
export async function checkForAppUpdate(
  owner: string = DEFAULT_GITHUB_OWNER,
  repo: string = DEFAULT_GITHUB_REPO,
  currentVersion: string = '2.0.0',
  authToken?: string
): Promise<UpdateCheckResult> {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Advocat-Updater',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { headers });
  } catch (netErr: any) {
    throw new Error('Network error: Unable to reach GitHub. Please check your connection.');
  }

  if (response.status === 404) {
    return {
      isUpdateAvailable: false,
      latestVersion: currentVersion,
      currentVersion,
      releaseNotes: 'No releases published yet on GitHub.',
    };
  }

  if (response.status === 403) {
    throw new Error('GitHub API rate limit exceeded. Please try again in an hour.');
  }

  if (!response.ok) {
    throw new Error(`GitHub API error (${response.status}): ${response.statusText}`);
  }

  const release: GitHubRelease = await response.json();
  const latestVersion = release.tag_name || currentVersion;
  const isHigher = compareSemVer(latestVersion, currentVersion) > 0;

  // Pick the best APK for this device
  const chosenApk = selectBestApkAsset(release.assets);

  return {
    isUpdateAvailable: isHigher && !!chosenApk,
    latestVersion,
    currentVersion,
    releaseNotes: release.body || release.name || 'Performance improvements and bug fixes.',
    apkDownloadUrl: chosenApk?.browser_download_url,
    apkSize: chosenApk?.size,
    apkName: chosenApk?.name,
    publishedAt: release.published_at,
  };
}

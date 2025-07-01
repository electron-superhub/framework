import {
  eq as isVersionsEqual,
  gt as isVersionGreaterThan,
  parse as parseVersion,
} from "semver";

export function checkVersionNeedToUpdate(
  currentVersionStr: string,
  latestVersionStr: string
) {
  const currentVersion = parseVersion(currentVersionStr);
  const latestVersion = parseVersion(latestVersionStr);

  if (latestVersion == null) return false; // 最新版本号解析失败，不需要更新

  if (currentVersion == null) return true; // 当前版本号解析失败，需要更新

  if (isVersionsEqual(latestVersion, currentVersion)) return false; // 版本号相同，不需要更新

  return isVersionGreaterThan(latestVersion, currentVersion);
}

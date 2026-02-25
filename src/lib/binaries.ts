import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join } from "node:path";
import { ExtensionPreferences, ResolvedBinaries } from "./types";

interface ResolutionResult {
  binaries?: ResolvedBinaries;
  warnings: string[];
  missingRequired: string[];
}

const COMMON_PATH_DIRS = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/opt/local/bin",
];

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function gatherSearchDirs(): string[] {
  const envPath = process.env.PATH?.split(":") ?? [];
  return Array.from(new Set([...envPath, ...COMMON_PATH_DIRS])).filter(Boolean);
}

async function resolveExecutable(
  name: string,
  overridePath?: string,
): Promise<{ path?: string; warning?: string }> {
  const trimmedOverride = overridePath?.trim();
  if (trimmedOverride) {
    if (await isExecutable(trimmedOverride)) {
      return { path: trimmedOverride };
    }

    return {
      warning: `Preference override for ${name} is not executable: ${trimmedOverride}`,
    };
  }

  for (const dir of gatherSearchDirs()) {
    const candidate = join(dir, name);
    if (await isExecutable(candidate)) {
      return { path: candidate };
    }
  }

  return {};
}

export async function resolveBinaries(
  preferences: ExtensionPreferences,
): Promise<ResolutionResult> {
  const warnings: string[] = [];
  const missingRequired: string[] = [];

  const ideviceId = await resolveExecutable(
    "idevice_id",
    preferences.ideviceIdPath,
  );
  if (ideviceId.warning) {
    warnings.push(ideviceId.warning);
  }

  const ideviceInfo = await resolveExecutable(
    "ideviceinfo",
    preferences.ideviceInfoPath,
  );
  if (ideviceInfo.warning) {
    warnings.push(ideviceInfo.warning);
  }

  const watchHelper = await resolveExecutable(
    "watch-helper",
    preferences.watchHelperPath,
  );
  if (watchHelper.warning) {
    warnings.push(watchHelper.warning);
  }

  if (!ideviceId.path) {
    missingRequired.push("idevice_id");
  }

  if (!ideviceInfo.path) {
    missingRequired.push("ideviceinfo");
  }

  if (missingRequired.length > 0) {
    return { warnings, missingRequired };
  }

  return {
    binaries: {
      ideviceId: ideviceId.path!,
      ideviceInfo: ideviceInfo.path!,
      watchHelper: watchHelper.path,
    },
    warnings,
    missingRequired,
  };
}

export function parseTimeout(preferences: ExtensionPreferences): number {
  const raw = preferences.commandTimeoutMs?.trim();
  const parsed = raw ? Number(raw) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 5000;
  }

  return Math.min(Math.max(parsed, 1000), 30000);
}

export function networkScanEnabled(preferences: ExtensionPreferences): boolean {
  return preferences.enableNetworkScan ?? true;
}

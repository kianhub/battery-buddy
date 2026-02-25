import { environment } from "@raycast/api";
import { access, chmod, copyFile, mkdir } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join } from "node:path";
import { runCommand } from "./exec";
import { parseWatchHelperOutput } from "./parsers";
import { IPhoneBattery, WatchBattery } from "./types";

const HELPER_BASENAME = "watch-helper";

function supportHelperPath(): string {
  return join(environment.supportPath, HELPER_BASENAME);
}

function uniqueNonEmpty(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function findBundledHelperSource(): Promise<string | undefined> {
  const candidates = [
    join(environment.assetsPath, "watch-helper.c"),
    join(process.cwd(), "src", "lib", "watch-helper.c"),
    join(__dirname, "watch-helper.c"),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate, fsConstants.R_OK);
      return candidate;
    } catch {
      // Continue searching.
    }
  }

  return undefined;
}

async function resolveExecutable(name: string): Promise<string | undefined> {
  const pathDirs = process.env.PATH?.split(":") ?? [];
  const commonDirs = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
  ];
  const candidates = uniqueNonEmpty(
    [...pathDirs, ...commonDirs].map((dir) => join(dir, name)),
  );

  for (const candidate of candidates) {
    if (await isExecutable(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function pkgConfigEnv(): NodeJS.ProcessEnv {
  const current = process.env.PKG_CONFIG_PATH?.split(":") ?? [];
  const candidates = [
    ...current,
    "/opt/homebrew/lib/pkgconfig",
    "/usr/local/lib/pkgconfig",
    "/opt/local/lib/pkgconfig",
    "/opt/homebrew/opt/libimobiledevice/lib/pkgconfig",
    "/opt/homebrew/opt/libplist/lib/pkgconfig",
    "/usr/local/opt/libimobiledevice/lib/pkgconfig",
    "/usr/local/opt/libplist/lib/pkgconfig",
  ];

  return {
    ...process.env,
    PKG_CONFIG_PATH: uniqueNonEmpty(candidates).join(":"),
  };
}

async function compileHelper(
  sourcePath: string,
  targetPath: string,
  timeoutMs: number,
): Promise<{ ok: boolean; warning?: string }> {
  const ccPath = await resolveExecutable("cc");
  if (!ccPath) {
    return {
      ok: false,
      warning: "Watch helper unavailable: C compiler `cc` not found.",
    };
  }

  const pkgConfigPath = await resolveExecutable("pkg-config");
  if (!pkgConfigPath) {
    return {
      ok: false,
      warning:
        "Watch helper unavailable: `pkg-config` not found. Install with `brew install pkg-config`.",
    };
  }

  const env = pkgConfigEnv();

  const cflags = await runCommand(
    pkgConfigPath,
    ["--cflags", "libimobiledevice-1.0", "libplist-2.0"],
    { timeoutMs, env },
  );
  if (!cflags.ok) {
    const reason =
      cflags.stderr.trim() || cflags.errorMessage || "unknown error";
    return {
      ok: false,
      warning: `Watch helper unavailable: pkg-config couldn't resolve libimobiledevice/libplist (${reason}).`,
    };
  }

  const libs = await runCommand(
    pkgConfigPath,
    ["--libs", "libimobiledevice-1.0", "libplist-2.0"],
    { timeoutMs, env },
  );
  if (!libs.ok) {
    const reason = libs.stderr.trim() || libs.errorMessage || "unknown error";
    return {
      ok: false,
      warning: `Watch helper unavailable: pkg-config couldn't produce linker flags (${reason}).`,
    };
  }

  const args = [
    sourcePath,
    "-o",
    targetPath,
    ...cflags.stdout.trim().split(/\s+/).filter(Boolean),
    ...libs.stdout.trim().split(/\s+/).filter(Boolean),
  ];

  const compile = await runCommand(ccPath, args, {
    timeoutMs: Math.max(timeoutMs, 15000),
  });
  if (!compile.ok) {
    const reason =
      compile.stderr.trim() || compile.errorMessage || "unknown compiler error";
    return { ok: false, warning: `Watch helper compile failed: ${reason}` };
  }

  await chmod(targetPath, 0o755);
  return { ok: true };
}

export async function ensureWatchHelper(options: {
  overridePath?: string;
  preferredPathFromBinaries?: string;
  timeoutMs: number;
}): Promise<{ helperPath?: string; warning?: string }> {
  const trimmedOverride = options.overridePath?.trim();
  if (trimmedOverride) {
    if (await isExecutable(trimmedOverride)) {
      return { helperPath: trimmedOverride };
    }

    return {
      warning: `Configured watch helper is not executable: ${trimmedOverride}`,
    };
  }

  if (
    options.preferredPathFromBinaries &&
    (await isExecutable(options.preferredPathFromBinaries))
  ) {
    return { helperPath: options.preferredPathFromBinaries };
  }

  const cachedPath = supportHelperPath();
  if (await isExecutable(cachedPath)) {
    return { helperPath: cachedPath };
  }

  const sourcePath = await findBundledHelperSource();
  if (!sourcePath) {
    return {
      warning: "Watch helper source not found; showing iPhone-only results.",
    };
  }

  await mkdir(environment.supportPath, { recursive: true });

  // Copy source into support path so repeated compile attempts are stable across working directories.
  const cachedSourcePath = join(environment.supportPath, "watch-helper.c");
  await copyFile(sourcePath, cachedSourcePath);

  const compiled = await compileHelper(
    cachedSourcePath,
    cachedPath,
    options.timeoutMs,
  );
  if (!compiled.ok) {
    return { warning: compiled.warning };
  }

  return { helperPath: cachedPath };
}

export async function collectWatchesByPhone(options: {
  helperPath: string;
  iphones: IPhoneBattery[];
  timeoutMs: number;
}): Promise<{
  watchesByPhone: Record<string, WatchBattery[]>;
  warnings: string[];
}> {
  const watchesByPhone: Record<string, WatchBattery[]> = {};
  const warnings: string[] = [];

  for (const iphone of options.iphones) {
    const result = await runCommand(options.helperPath, [iphone.udid], {
      timeoutMs: options.timeoutMs,
    });
    if (!result.ok) {
      const reason = result.timedOut
        ? `watch-helper timed out for ${iphone.name}.`
        : result.stderr.trim() ||
          result.errorMessage ||
          `watch-helper failed for ${iphone.name}.`;
      warnings.push(reason);
      watchesByPhone[iphone.udid] = [];
      continue;
    }

    watchesByPhone[iphone.udid] = parseWatchHelperOutput(
      result.stdout,
      iphone.udid,
    );
  }

  return { watchesByPhone, warnings };
}

import { WatchBattery } from "./types";
import { formatWatchModel } from "./product-types";

export function parseLineList(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function parseKeyValueOutput(output: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of output.split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) {
      result[key] = value;
    }
  }

  return result;
}

export function parseBooleanLike(
  value: string | undefined,
): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "1"].includes(normalized)) {
    return true;
  }

  if (["false", "no", "0"].includes(normalized)) {
    return false;
  }

  return undefined;
}

export function parseBatteryLevel(
  value: string | undefined,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const numeric = Number(value.trim());
  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  return Math.min(100, Math.max(0, Math.round(numeric)));
}

export function parseWatchHelperOutput(
  output: string,
  parentUdid: string,
): WatchBattery[] {
  const watches: WatchBattery[] = [];

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const parts = line.split("\t");
    if (parts.length < 6 || parts[0] !== "WATCH") {
      continue;
    }

    const level = Number(parts[4]);
    const charging = parts[5].trim().toLowerCase() === "true";

    watches.push({
      watchUdid: parts[1],
      parentUdid,
      name: parts[2] || "Apple Watch",
      model: formatWatchModel(parts[3]),
      batteryLevel: Number.isFinite(level)
        ? Math.min(100, Math.max(0, Math.round(level)))
        : 0,
      isCharging: charging,
    });
  }

  return watches;
}

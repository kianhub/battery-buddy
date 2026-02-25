import { runCommand } from "./exec";
import {
  parseBatteryLevel,
  parseBooleanLike,
  parseKeyValueOutput,
  parseLineList,
} from "./parsers";
import { formatIPhoneModel } from "./product-types";
import { DeviceTransport, IPhoneBattery } from "./types";

export interface IPhoneCollectionOptions {
  ideviceIdPath: string;
  ideviceInfoPath: string;
  enableNetworkScan: boolean;
  timeoutMs: number;
}

interface UdidDiscoveryResult {
  transportByUdid: Map<string, DeviceTransport>;
  warnings: string[];
}

async function discoverUdids(
  options: IPhoneCollectionOptions,
): Promise<UdidDiscoveryResult> {
  const warnings: string[] = [];
  const transportByUdid = new Map<string, DeviceTransport>();

  const usbResult = await runCommand(options.ideviceIdPath, ["-l"], {
    timeoutMs: options.timeoutMs,
  });
  if (usbResult.ok) {
    for (const udid of parseLineList(usbResult.stdout)) {
      transportByUdid.set(udid, "usb");
    }
  } else if (usbResult.timedOut) {
    warnings.push("`idevice_id -l` timed out.");
  } else if (usbResult.stderr.trim()) {
    warnings.push(`USB scan failed: ${usbResult.stderr.trim()}`);
  }

  if (options.enableNetworkScan) {
    const networkResult = await runCommand(options.ideviceIdPath, ["-n"], {
      timeoutMs: options.timeoutMs,
    });
    if (networkResult.ok) {
      for (const udid of parseLineList(networkResult.stdout)) {
        if (!transportByUdid.has(udid)) {
          transportByUdid.set(udid, "network");
        }
      }
    } else if (networkResult.timedOut) {
      warnings.push("`idevice_id -n` timed out.");
    } else if (networkResult.stderr.trim()) {
      warnings.push(`Network scan failed: ${networkResult.stderr.trim()}`);
    }
  }

  return { transportByUdid, warnings };
}

async function readInfoMap(
  ideviceInfoPath: string,
  udid: string,
  transport: DeviceTransport,
  timeoutMs: number,
  extraArgs: string[] = [],
): Promise<{ map?: Record<string, string>; warning?: string }> {
  const args = [
    ...(transport === "network" ? ["-n"] : []),
    "-u",
    udid,
    ...extraArgs,
  ];
  const result = await runCommand(ideviceInfoPath, args, { timeoutMs });

  if (!result.ok) {
    if (result.timedOut) {
      return { warning: `ideviceinfo timed out for ${udid}.` };
    }

    const reason =
      result.stderr.trim() || result.errorMessage || "unknown error";
    return { warning: `ideviceinfo failed for ${udid}: ${reason}` };
  }

  return { map: parseKeyValueOutput(result.stdout) };
}

async function readSingleIPhone(
  ideviceInfoPath: string,
  udid: string,
  transport: DeviceTransport,
  timeoutMs: number,
): Promise<{ phone?: IPhoneBattery; warning?: string }> {
  const info = await readInfoMap(ideviceInfoPath, udid, transport, timeoutMs);
  if (!info.map) {
    return { warning: info.warning };
  }

  if (info.map.DeviceClass !== "iPhone") {
    return {};
  }

  const battery = await readInfoMap(
    ideviceInfoPath,
    udid,
    transport,
    timeoutMs,
    ["-q", "com.apple.mobile.battery"],
  );
  if (!battery.map) {
    return { warning: battery.warning };
  }

  const batteryLevel = parseBatteryLevel(battery.map.BatteryCurrentCapacity);
  const isCharging = parseBooleanLike(battery.map.BatteryIsCharging);

  return {
    phone: {
      udid,
      name: info.map.DeviceName || "Unnamed iPhone",
      model: formatIPhoneModel(info.map.ProductType),
      batteryLevel: batteryLevel ?? 0,
      isCharging: isCharging ?? false,
      transport,
    },
  };
}

export async function collectIPhones(
  options: IPhoneCollectionOptions,
): Promise<{ iphones: IPhoneBattery[]; warnings: string[] }> {
  const discovery = await discoverUdids(options);
  const warnings = [...discovery.warnings];
  const iphones: IPhoneBattery[] = [];

  for (const [udid, transport] of discovery.transportByUdid) {
    const read = await readSingleIPhone(
      options.ideviceInfoPath,
      udid,
      transport,
      options.timeoutMs,
    );
    if (read.warning) {
      warnings.push(read.warning);
    }

    if (read.phone) {
      iphones.push(read.phone);
    }
  }

  iphones.sort((a, b) => a.name.localeCompare(b.name));
  return { iphones, warnings };
}

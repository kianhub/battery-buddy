export type DeviceTransport = "usb" | "network";

export interface IPhoneBattery {
  udid: string;
  name: string;
  model: string;
  batteryLevel: number;
  isCharging: boolean;
  transport: DeviceTransport;
}

export interface WatchBattery {
  watchUdid: string;
  parentUdid: string;
  name: string;
  model: string;
  batteryLevel: number;
  isCharging: boolean;
}

export interface BatterySnapshot {
  iphones: IPhoneBattery[];
  watchesByPhone: Record<string, WatchBattery[]>;
}

export interface ResolvedBinaries {
  ideviceId: string;
  ideviceInfo: string;
  watchHelper?: string;
}

export interface ExtensionPreferences {
  ideviceIdPath?: string;
  ideviceInfoPath?: string;
  watchHelperPath?: string;
  enableNetworkScan?: boolean;
  commandTimeoutMs?: string;
}

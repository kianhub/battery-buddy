/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** idevice_id Path - Optional absolute path override for idevice_id */
  "ideviceIdPath"?: string,
  /** ideviceinfo Path - Optional absolute path override for ideviceinfo */
  "ideviceInfoPath"?: string,
  /** Watch Helper Path - Optional absolute path override for watch-helper binary */
  "watchHelperPath"?: string,
  /** Enable Network Scan - Include Wi-Fi paired iPhones via idevice_id -n */
  "enableNetworkScan": boolean,
  /** Command Timeout (ms) - Timeout per tooling invocation in milliseconds */
  "commandTimeoutMs": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `show-apple-batteries` command */
  export type ShowAppleBatteries = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `show-apple-batteries` command */
  export type ShowAppleBatteries = {}
}


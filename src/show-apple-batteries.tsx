import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  networkScanEnabled,
  parseTimeout,
  resolveBinaries,
} from "./lib/binaries";
import { collectIPhones } from "./lib/iphone";
import {
  BatterySnapshot,
  ExtensionPreferences,
  IPhoneBattery,
  WatchBattery,
} from "./lib/types";
import { collectWatchesByPhone, ensureWatchHelper } from "./lib/watch";

interface CommandState {
  isLoading: boolean;
  snapshot: BatterySnapshot;
  warnings: string[];
  missingBinaries: string[];
}

const EMPTY_SNAPSHOT: BatterySnapshot = {
  iphones: [],
  watchesByPhone: {},
};

function batteryTagColor(level: number): Color {
  if (level <= 30) {
    return Color.Red;
  }

  if (level <= 60) {
    return Color.Orange;
  }

  return Color.Green;
}

function deviceAccessories(
  batteryLevel: number,
  isCharging: boolean,
  model: string,
  transport?: string,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [
    {
      tag: { value: `${batteryLevel}%`, color: batteryTagColor(batteryLevel) },
    },
    { tag: isCharging ? "Charging" : "Not charging" },
    { tag: model },
  ];

  if (transport) {
    accessories.push({ tag: transport === "network" ? "Wi-Fi" : "USB" });
  }

  return accessories;
}

function CommonActions(props: { refresh: () => void; warningText?: string }) {
  return (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={props.refresh}
      />
      {props.warningText ? (
        <Action.CopyToClipboard
          title="Copy Full Warning"
          content={props.warningText}
        />
      ) : null}
      <Action.CopyToClipboard
        title="Copy to Clipboard"
        content="brew install libimobiledevice pkg-config"
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.OpenInBrowser
        title="Open Libimobiledevice"
        url="https://libimobiledevice.org/"
      />
    </ActionPanel>
  );
}

export default function ShowAppleBatteriesCommand() {
  const [state, setState] = useState<CommandState>({
    isLoading: true,
    snapshot: EMPTY_SNAPSHOT,
    warnings: [],
    missingBinaries: [],
  });

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true }));

    const preferences = getPreferenceValues<ExtensionPreferences>();
    const timeoutMs = parseTimeout(preferences);
    const resolution = await resolveBinaries(preferences);

    if (!resolution.binaries) {
      const warnings = [...resolution.warnings];
      warnings.push(
        "Install prerequisites: brew install libimobiledevice pkg-config",
      );
      setState({
        isLoading: false,
        snapshot: EMPTY_SNAPSHOT,
        warnings,
        missingBinaries: resolution.missingRequired,
      });
      return;
    }

    const warnings = [...resolution.warnings];

    const iphoneResult = await collectIPhones({
      ideviceIdPath: resolution.binaries.ideviceId,
      ideviceInfoPath: resolution.binaries.ideviceInfo,
      enableNetworkScan: networkScanEnabled(preferences),
      timeoutMs,
    });

    warnings.push(...iphoneResult.warnings);

    const helper = await ensureWatchHelper({
      overridePath: preferences.watchHelperPath,
      preferredPathFromBinaries: resolution.binaries.watchHelper,
      timeoutMs,
    });

    if (helper.warning) {
      warnings.push(helper.warning);
    }

    let watchesByPhone: Record<string, WatchBattery[]> = {};
    if (helper.helperPath && iphoneResult.iphones.length > 0) {
      const watchResult = await collectWatchesByPhone({
        helperPath: helper.helperPath,
        iphones: iphoneResult.iphones,
        timeoutMs,
      });
      warnings.push(...watchResult.warnings);
      watchesByPhone = watchResult.watchesByPhone;
    }

    setState({
      isLoading: false,
      snapshot: {
        iphones: iphoneResult.iphones,
        watchesByPhone,
      },
      warnings,
      missingBinaries: [],
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const noDeviceGuidance = useMemo(() => {
    if (state.snapshot.iphones.length > 0 || state.missingBinaries.length > 0) {
      return undefined;
    }

    return "No connected/trusted iPhone found. Unlock your iPhone, trust this Mac, and retry. For Wi-Fi mode, enable Finder Wi-Fi sync pairing.";
  }, [state.missingBinaries.length, state.snapshot.iphones.length]);

  return (
    <List isLoading={state.isLoading}>
      {state.missingBinaries.length > 0 ? (
        <List.Section
          title="Missing Tooling"
          subtitle={state.missingBinaries.join(", ")}
        >
          <List.Item
            title="Required binaries not found"
            subtitle="Install libimobiledevice tooling and refresh"
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            accessories={[{ tag: "brew install libimobiledevice pkg-config" }]}
            actions={<CommonActions refresh={refresh} />}
          />
        </List.Section>
      ) : null}

      {noDeviceGuidance ? (
        <List.Section title="No iPhone Detected">
          <List.Item
            title="No connected/trusted iPhone"
            subtitle={noDeviceGuidance}
            icon={{ source: Icon.Mobile, tintColor: Color.Orange }}
            actions={<CommonActions refresh={refresh} />}
          />
        </List.Section>
      ) : null}

      {state.snapshot.iphones.map((iphone: IPhoneBattery) => {
        const watches = state.snapshot.watchesByPhone[iphone.udid] ?? [];
        return (
          <List.Section
            key={iphone.udid}
            title={iphone.name}
            subtitle={`${iphone.batteryLevel}%`}
          >
            <List.Item
              title="iPhone"
              subtitle={iphone.name}
              icon={Icon.Mobile}
              accessories={deviceAccessories(
                iphone.batteryLevel,
                iphone.isCharging,
                iphone.model,
                iphone.transport,
              )}
              actions={<CommonActions refresh={refresh} />}
            />
            {watches.map((watch) => (
              <List.Item
                key={watch.watchUdid}
                title="Apple Watch"
                subtitle={watch.name}
                icon={Icon.Clock}
                accessories={deviceAccessories(
                  watch.batteryLevel,
                  watch.isCharging,
                  watch.model,
                )}
                actions={<CommonActions refresh={refresh} />}
              />
            ))}
          </List.Section>
        );
      })}

      {state.warnings.length > 0 ? (
        <List.Section title="Warnings" subtitle={`${state.warnings.length}`}>
          {state.warnings.map((warning, index) => (
            <List.Item
              key={`warning-${index}`}
              title="Watch / Tooling Warning"
              subtitle={warning}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
              actions={
                <CommonActions refresh={refresh} warningText={warning} />
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

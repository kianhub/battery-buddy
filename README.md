# Battery Buddy (Raycast)

Battery Buddy is a Raycast command that shows:

- iPhone battery from `idevice_id` + `ideviceinfo`
- Apple Watch battery from a tiny local helper binary (`watch-helper`) that is compiled on first run

It is local-first. No background daemon is required.

## How It Works

When you run `Show Apple Batteries`:

1. The command locates `idevice_id` and `ideviceinfo`
2. It finds trusted/paired iPhones (USB and optional Wi-Fi)
3. It reads iPhone battery data
4. It checks for `watch-helper`
5. If needed, it compiles `watch-helper` locally from `assets/watch-helper.c`
6. It queries Apple Watch battery through the paired iPhone

### Screenshot
<img width="886" height="586" alt="image" src="https://github.com/user-attachments/assets/bd0adb67-4d83-4a19-9f6e-0802291f01d8" />

If watch helper setup fails, iPhone battery still works and a warning is shown.

## Requirements

- macOS
- Raycast installed
- iPhone already trusted with your Mac
- For Wi-Fi discovery: iPhone paired for Wi-Fi sync in Finder
- Homebrew dependencies:

```bash
brew install libimobiledevice pkg-config
```

This should provide:

- `idevice_id`
- `ideviceinfo`
- `pkg-config`
- `cc` (Apple Command Line Tools)

If you do not have `cc`:

```bash
xcode-select --install
```

## Setup (Local Extension)

From this repository:

1. Install Node dependencies:

```bash
npm install
```

2. Build the extension:

```bash
npm run build
```

3. Open Raycast and run the command:

- Command name: `Show Apple Batteries`

You do not need to keep `npm run dev` running for normal usage.

## Dev Mode vs Build

- `npm run dev`: development mode with live reload (for coding)
- `npm run build`: compiles the extension for normal use

`build` does not run a long-lived process. The command runs on demand when opened in Raycast.

## Preferences

Open Raycast settings for this command and configure if needed:

- `ideviceIdPath`: optional absolute path override for `idevice_id`
- `ideviceInfoPath`: optional absolute path override for `ideviceinfo`
- `watchHelperPath`: optional absolute path override for precompiled `watch-helper`
- `enableNetworkScan`: include Wi-Fi paired iPhones (`idevice_id -n`)
- `commandTimeoutMs`: timeout per command call (default `5000`)

Recommended Homebrew paths on Apple Silicon:

- `ideviceIdPath`: `/opt/homebrew/bin/idevice_id`
- `ideviceInfoPath`: `/opt/homebrew/bin/ideviceinfo`

## Troubleshooting

### iPhone not showing

- Unlock iPhone and tap Trust on device
- Reconnect USB cable
- Verify tooling:

```bash
idevice_id -l
ideviceinfo -k DeviceName
```

- If needed, set explicit binary paths in preferences

### Watch not showing

- Open command warnings and use `Copy Full Warning`
- Verify pkg-config packages are visible:

```bash
pkg-config --cflags --libs libimobiledevice-1.0 libplist-2.0
```

- If helper compile got cached in a bad state, remove cache and refresh:

```bash
rm -f "$HOME/Library/Application Support/com.raycast.macos/extensions/raycast-battery-buddy/watch-helper" "$HOME/Library/Application Support/com.raycast.macos/extensions/raycast-battery-buddy/watch-helper.c"
```

### Works in `dev` but not in normal Raycast use

This is usually a PATH/environment difference. Set absolute paths in preferences:

- `ideviceIdPath`
- `ideviceInfoPath`

Then run the command again.

## Command

- `show-apple-batteries`

## Testing

```bash
npm test
```

## Lint

```bash
npm run lint
```
## Thanks

This extension was inspired by the incredible work of [@lihaoyun6/AirBattery](https://github.com/lihaoyun6/AirBattery).

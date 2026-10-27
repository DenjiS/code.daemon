# code.daemon

A pixel pet for Windows that grows from your coding habits. It reads your commits, CI results and releases from GitHub and GitLab, then hatches, evolves and changes form based on how you actually work.

![Pet forms, profile card and widget](docs/preview.png)

## What's here

| Path | What it is |
| --- | --- |
| `CodeDaemon.ps1` | Widget host: frameless always-on-top window (PowerShell 5.1 + Edge WebView2), tray icon, DPAPI-encrypted tokens, GitHub/GitLab API proxy |
| `ui/widget.html`, `ui/widget.js` | Widget UI: pet screen, vitals, Feed / Log / Setup panel |
| `ui/pet-core.js` | Shared pet engine: XP, stages, forms, mutations, CI health, pixel renderer, SVG card |
| `github-profile/` | GitHub Action that puts the same pet, animated, on your GitHub profile |
| `lib/` | Microsoft WebView2 SDK (WinForms) and native loaders |

## Run the widget

1. Double-click `Start code.daemon.vbs`. The pet appears in the bottom-right corner, with a tray icon.
2. In **Setup**, paste a GitHub token (classic, `repo` scope) and/or a GitLab token (`read_api` + `read_user`).
3. The first scan reads 180 days. After that it rescans every 15 minutes.

If nothing appears, run `Start code.daemon (debug).cmd` to see errors. Requires Windows 10/11 with the WebView2 Runtime.

## How the pet grows

- **XP**: commits in one repo less than 2 hours apart form a session. Minutes ÷ 3 + 4 per commit + bonuses for tests, bug fixes and releases, multiplied by your streak (+5% per day, up to +50%).
- **Stages**: EGG 0 → BIT 60 → BYTE 200 → PROCESS 500 → DAEMON 1100 → KERNEL 2400 XP.
- **Crest**: the source with the most XP in 30 days: GitHub branch antenna, GitLab pipeline crest, Local `>_` mouth, Unity companion cube, Unreal material sheen. Unity and Unreal repos are detected from `ProjectSettings/` + `Assets/` and `*.uproject`.
- **Forms**: at PROCESS, DAEMON and KERNEL the pet locks a form from your last 30 days: Guardian (tests), Debugger (bug fixes), Night Owl (late nights), Shipper (releases), Streaker (7+ day streak), Polyglot (4+ sources), or Core.
- **Mutations**: Shiny (30-day streak), Cursed (coded on a Friday the 13th), Crowned (1000 commits).
- **Vitals**: Energy (recent minutes, 24 h half-life), Mood (streak, variety, tests and fixes), Rest (late nights and marathons), Build (CI health).
- **CI**: a red build in a repo you touched in the last 14 days makes the pet sick. Turning it green earns +15 XP.

## GitHub profile pet

See [`github-profile/SETUP.md`](github-profile/SETUP.md). Copy `github-profile/.github` into your `<you>/<you>` repo and add `<img src="code-daemon/pet.svg">` to its README.

## Data

- `%APPDATA%\CodeDaemon\save.json`: pet, sessions, repo list, CI state
- `%APPDATA%\CodeDaemon\settings.json`: tokens (DPAPI, current user only), window position
- `%LOCALAPPDATA%\CodeDaemon\host.log`: errors

## Third-party

Microsoft WebView2 SDK (`lib/`). Geist Mono and Martian Mono fonts under the SIL Open Font License (`ui/fonts/`).

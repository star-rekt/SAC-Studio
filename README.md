# SAC Studio

An editable, brief-driven campaign asset studio. The three Figma-linked boards
define the design templates; the brief and manual additions define the asset
types, copy, and counts. Templates are not replaced by a new design when a
brief requests another deliverable.

## Develop

Requires Node.js 24 and npm. From this directory:

```sh
npm ci
npm --prefix plugin ci
npm run dev
```

Open `http://localhost:5178/`. Development starts the Vite editor and the
local Claude connector together. Install and sign in to Claude Code separately
if you want AI brief parsing. The editor and manual planning still work without
Claude. Optional catalogue photos can be fetched with a Figma access token via
`FIGMA_TOKEN=... npm run photos`; do not commit the token.

## Install for designers

Use the internal macOS/Windows installer made by the release team. It includes
the app runtime, so designers do not need Node or npm. On first launch the app
shows a checklist for Claude sign-in, the included Figma plugin, organisation
fonts, and a local browser for screenshot features. Campaigns and uploaded
media are stored per user, outside the installed application. No Claude or
Figma credentials are included or shared.

The Figma plugin still needs a one-time import in Figma Desktop. Use **SAC
Studio → Setup and Figma Plugin → Show plugin manifest**, then choose **Plugins
→ Development → Import plugin from manifest** in Figma. See
[`plugin/README.md`](plugin/README.md).

## Build and verify

```sh
npm run typecheck
npm run check:templates
npm run check:boards
npm run build:desktop
```

Build the macOS installer on a Mac with `npm run package:mac`, and the Windows
installer on Windows with `npm run package:win`. Output is ignored under
`desktop-release/`. Release/signing details are in
[`docs/release.md`](docs/release.md); template architecture is in
[`docs/templates.md`](docs/templates.md).

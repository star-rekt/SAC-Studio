# Internal desktop release

This is an internal application, not a public redistribution of the reference
artwork or licensed fonts. The app packages its own Electron runtime and the
prebuilt offline Figma plugin. A designer does **not** install Node, npm, or
the repository.

## Build on each target OS

Use Node.js 24 and a clean checkout of this repository. In
`sac-email-studio/`:

```sh
npm ci
npm --prefix plugin ci
npm run typecheck
npm run check:templates
npm run check:boards
npm run package:mac    # on macOS
# or npm run package:win on Windows
```

Installers land in `desktop-release/` (`.pkg` on macOS, NSIS `.exe` on Windows).
The macOS build is currently **unsigned**
(`identity: null`), so it is suitable for internal QA only. Before broad
deployment, supply organisation-owned code-signing credentials, notarize the
macOS app, sign the Windows installer, and test both on clean machines. Build
Windows on Windows rather than relying on cross-compilation from macOS.

Do not run an asset-export smoke test as part of packaging. The commands above
compile the editor and plugin and check template/board contracts, but do not
export a campaign.

## First run for each designer

The installer launches a sandboxed Electron renderer and a local server bound
to `127.0.0.1` on a random port. Campaigns, uploads, and exports go to that
user's application-data directory, not to the app bundle. This is process/UI
isolation, **not** a full operating-system sandbox: the backend deliberately
needs local files and Claude Code subprocess access.

1. Install and sign in to Claude Code with the user's own account by running
   `claude` in a terminal. The setup screen checks whether it is available.
   No Claude credentials are bundled or collected by SAC Studio.
2. In Figma Desktop, sign in with the user's own account. Open the plugin
   manifest from the SAC Studio setup screen and import it as a development
   plugin. Figma does not allow this app to silently add a plugin to an account.
3. Install the licensed Quiet Sans and Sofia Pro faces through the
   organisation's approved method. Figma web may need its font helper or
   organisation font upload; Figma Desktop uses local fonts.
4. For screenshot/review/export functions, install Chrome or Edge. Editing and
   manual planning work without a browser, but these functions need one.

The first-run checklist can be reopened from the SAC Studio menu. Claude and
Figma authentication are independent; access is never inherited from whoever
built the installer. Bundled design references should be reviewed under the
organisation's internal artwork licence before distribution.

## Release gate

- Verify the three template boards against their Figma references and exercise
  selection, text edits, media replacement, and saving on both platforms.
- Verify the packaged plugin imports in Figma Desktop on both platforms with
  the licensed fonts installed.
- Verify Claude login from a fresh user account and that campaigns remain
  separate between OS users.
- Sign/notarize, scan the installer, and distribute through the organisation's
  approved software channel.
- Replace the default Electron application icon with approved SAC artwork before
  broad deployment.

# SAC Studio Figma importer

The plugin builds editable Figma frames from a `.figma.json` campaign file.
Text stays text, photographs can be replaced, and vector marks remain vectors.
It has no network permission; the campaign file is selected locally.

The desktop installer includes the built plugin. In SAC Studio choose
**Setup and Figma Plugin → Show plugin manifest**. In Figma Desktop choose
**Plugins → Development → Import plugin from manifest** and select that
`manifest.json`. Each user signs in to Figma under their own account; the
installer cannot grant Figma access or silently install a development plugin.

For source development:

```sh
npm ci
npm run build
```

Import this directory's `manifest.json`. Export a `.figma.json` from SAC
Studio, then select it in the plugin. Figma must have the organisation's
licensed Quiet Sans and Sofia Pro font faces available. If a required face is
missing, the plugin stops instead of substituting another font.

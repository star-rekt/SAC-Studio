"use strict";
(() => {
  // src/main.ts
  figma.showUI(__html__, { width: 400, height: 520, themeColors: true });
  var BUILD = "facefor-6";
  var rgb = (h) => ({
    r: parseInt(h.slice(1, 3), 16) / 255,
    g: parseInt(h.slice(3, 5), 16) / 255,
    b: parseInt(h.slice(5, 7), 16) / 255
  });
  var SAME = {
    900: ["Black", "Heavy"],
    800: ["ExtraBold", "Extra Bold", "Extrabold", "Ultra Bold", "UltraBold"],
    700: ["Bold"],
    600: ["SemiBold", "Semi Bold", "Semibold", "Demi Bold", "DemiBold"],
    500: ["Medium"],
    400: ["Regular", "Book", "Normal"],
    300: ["Light"]
  };
  function faceFor(family, weight, have) {
    var _a;
    const want = Math.round(weight / 100) * 100;
    for (const style of (_a = SAME[want]) != null ? _a : SAME[400])
      for (const f of have) if (f.family === family && f.style === style) return f;
    if (want === 800) {
      for (const style of SAME[900])
        for (const f of have) if (f.family === family && f.style === style) return f;
    }
    return null;
  }
  async function loadFaces(doc) {
    const have = await figma.listAvailableFontsAsync().then((f) => f.map((x) => x.fontName));
    const want = /* @__PURE__ */ new Map();
    for (const v of doc.variants) for (const l of v.layers) if (l.type === "text")
      want.set(l.font + "|" + l.weight, { family: l.font, weight: l.weight });
    const found = [];
    const missing = [];
    for (const w of want.values()) {
      const fn = faceFor(w.family, w.weight, have);
      if (fn) found.push(fn);
      else missing.push(`${w.family} ${w.weight}`);
    }
    if (missing.length) {
      const clue = have.filter((f) => missing.some((n) => f.family.toLowerCase().includes(n.toLowerCase().split(" ")[0])));
      throw Error(`[${BUILD}] Missing font${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.

` + (clue.length ? `Figma does list something with a similar name:
` + clue.map((f) => JSON.stringify(f)).join("\n") + `

If that's meant to be it, tell Claude these exact names.

` : "") + `In Figma web, install the licensed font files and Figma Font Installer, or upload licensed TTF/OTF faces to your Figma account or organisation. Reload Figma, then run this again. Nothing was built \u2014 substituting a face would change the design without saying so.`);
    }
    await Promise.all(found.map((fn) => figma.loadFontAsync(fn)));
    return found;
  }
  function makeNode(l, images, vectors, have) {
    var _a, _b;
    if (l.type === "text") {
      const t = figma.createText();
      const fn = faceFor(l.font, l.weight, have);
      if (!fn) throw Error(`Font vanished between checking and building: ${l.font} ${l.weight}`);
      t.fontName = fn;
      t.characters = l.text;
      t.fontSize = Math.max(1, l.size);
      t.lineHeight = { unit: "PIXELS", value: Math.max(1, l.lineHeight) };
      t.letterSpacing = { unit: "PIXELS", value: l.letterSpacing };
      t.fills = [{ type: "SOLID", color: rgb(l.colour) }];
      if (l.underline) t.textDecoration = "UNDERLINE";
      t.textAutoResize = "WIDTH_AND_HEIGHT";
      t.textAlignHorizontal = (l.align || "left").toUpperCase();
      return t;
    }
    if (l.type === "image") {
      const box = figma.createFrame();
      box.resize(l.width, l.height);
      box.fills = [];
      box.clipsContent = true;
      if (l.radius) box.cornerRadius = l.radius;
      const svg = vectors[l.src];
      if (svg) {
        const art2 = figma.createNodeFromSvg(svg);
        art2.name = l.name;
        art2.resize(l.draw.width, l.draw.height);
        art2.x = l.draw.x - l.x;
        art2.y = l.draw.y - l.y;
        box.appendChild(art2);
        return box;
      }
      const art = figma.createRectangle();
      art.name = "Replace this photograph";
      art.resize(l.draw.width, l.draw.height);
      art.x = l.draw.x - l.x;
      art.y = l.draw.y - l.y;
      const hash = images[l.src];
      art.fills = hash ? [{ type: "IMAGE", imageHash: hash, scaleMode: "FILL" }] : [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
      box.appendChild(art);
      if (l.clip) {
        const mask = cutout(l.clip, l.width, l.height, "#000000");
        mask.name = "mask";
        box.insertChild(0, mask);
        figma.group([mask, art], box).name = "window";
        mask.isMask = true;
        if (l.clip.stroke) {
          const line = cutout(
            l.clip,
            l.width,
            l.height,
            "none",
            l.clip.stroke,
            l.clip.strokeWidth
          );
          line.name = "outline";
          box.appendChild(line);
        }
      }
      return box;
    }
    if (l.clip) {
      const shape = cutout(l.clip, l.width, l.height, l.fill);
      shape.name = l.name;
      shape.opacity = (_a = l.opacity) != null ? _a : 1;
      return shape;
    }
    const r = figma.createRectangle();
    r.resize(l.width, l.height);
    r.fills = [{ type: "SOLID", color: rgb(l.fill), opacity: (_b = l.opacity) != null ? _b : 1 }];
    if (l.radius) r.cornerRadius = Math.min(l.radius, Math.min(l.width, l.height) / 2);
    return r;
  }
  function cutout(c, w, h, fill, stroke, weight) {
    const n = figma.createNodeFromSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${c.view[0]} ${c.view[1]}" preserveAspectRatio="none"><path d="${c.path}" fill="${fill}"` + (stroke ? ` stroke="${stroke}" stroke-width="${weight != null ? weight : 7}"` : "") + `/></svg>`
    );
    n.x = 0;
    n.y = 0;
    return n;
  }
  function groupRuns(frame, layers) {
    const runs = [];
    let run = [], name = "";
    for (let i = 0; i < layers.length; i++) {
      const g = layers[i].group || "";
      if (g !== name) {
        if (run.length) runs.push({ name, nodes: run });
        run = [];
        name = g;
      }
      if (g) run.push(frame.children[i]);
    }
    if (run.length) runs.push({ name, nodes: run });
    for (const r of runs) {
      if (r.nodes.length < 2) continue;
      const at = frame.children.indexOf(r.nodes[0]);
      figma.group(r.nodes, frame, at).name = r.name;
    }
  }
  async function build(doc) {
    if (!doc || doc.schema !== "sac-studio/1" || !Array.isArray(doc.variants) || !doc.variants.length)
      throw Error("That is not a SAC Email Studio export.");
    for (const v of doc.variants) {
      if (!Array.isArray(v.layers)) throw Error(`${v.name}: no layers.`);
      if (!(v.width > 0 && v.height > 0 && v.width <= 8192 && v.height <= 8192))
        throw Error(`${v.name}: ${v.width}x${v.height} is not a frame size.`);
    }
    const missingMedia = /* @__PURE__ */ new Set();
    for (const v of doc.variants) for (const l of v.layers)
      if (l.type === "image" && !(l.src in (doc.assets || {})) && !(l.src in (doc.vectors || {}))) missingMedia.add(l.src);
    if (missingMedia.size)
      throw Error(`${missingMedia.size} images are missing from this export. Re-export the campaign from SAC Studio. First missing: ${missingMedia.values().next().value}`);
    const have = await loadFaces(doc);
    const images = {};
    for (const src of Object.keys(doc.assets || {}))
      images[src] = figma.createImage(figma.base64Decode(doc.assets[src])).hash;
    const page = figma.createPage();
    page.name = `${doc.project.name} \xB7 #${doc.project.revision}`;
    await figma.setCurrentPageAsync(page);
    const made = [];
    try {
      let x = 0, y = 0, rowTall = 0;
      for (let i = 0; i < doc.variants.length; i++) {
        const v = doc.variants[i];
        const frame = figma.createFrame();
        made.push(frame);
        frame.name = v.name;
        frame.resize(v.width, v.height);
        frame.clipsContent = true;
        frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        frame.setPluginData("sac-email-studio", JSON.stringify({
          project: doc.project.id,
          variant: v.id,
          revision: doc.project.revision
        }));
        for (const l of v.layers) {
          const node = makeNode(l, images, doc.vectors || {}, have);
          frame.appendChild(node);
          node.name = l.name;
          node.x = l.x;
          node.y = l.y;
          if (l.type === "text") {
            if (l.align === "center") node.x = l.x + (l.width - node.width) / 2;
            else if (l.align === "right") node.x = l.x + l.width - node.width;
            node.y = l.y + (l.height - node.height) / 2;
          }
          if (l.rotation) {
            const rad = l.rotation * Math.PI / 180;
            const cos = Math.cos(rad), sin = Math.sin(rad);
            const cx = node.x + node.width / 2, cy = node.y + node.height / 2;
            node.relativeTransform = [
              [cos, -sin, cx - cos * (node.width / 2) + sin * (node.height / 2)],
              [sin, cos, cy - sin * (node.width / 2) - cos * (node.height / 2)]
            ];
          }
          node.setPluginData("sac-layer", String(l.n));
        }
        groupRuns(frame, v.layers);
        if (i % 4 === 0 && i) {
          x = 0;
          y += rowTall + 160;
          rowTall = 0;
        }
        frame.x = x;
        frame.y = y;
        x += v.width + 160;
        rowTall = Math.max(rowTall, v.height);
        page.appendChild(frame);
      }
    } catch (e) {
      for (const f of made) f.remove();
      page.remove();
      throw e;
    }
    figma.currentPage.selection = made;
    figma.viewport.scrollAndZoomIntoView(made);
    return { frames: made.length, page: page.name };
  }
  figma.ui.onmessage = async (msg) => {
    if (msg.type !== "build" || !msg.document) return;
    try {
      const out = await build(msg.document);
      figma.ui.postMessage({
        ok: true,
        message: `${out.frames} frames built on \u201C${out.page}\u201D. Text is text; photographs can be swapped without rebuilding the asset.`
      });
    } catch (e) {
      figma.ui.postMessage({ ok: false, message: e instanceof Error ? e.message : String(e) });
    }
  };
})();

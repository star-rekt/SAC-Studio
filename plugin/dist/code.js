"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // src/main.ts
  figma.showUI(__html__, { width: 400, height: 520, themeColors: true });
  var BUILD = "clips-2";
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
    var _a, _b, _c;
    if (l.type === "clip") {
      const f = figma.createFrame();
      f.resize(Math.max(1, l.width), Math.max(1, l.height));
      f.fills = [];
      f.clipsContent = true;
      if (l.radius) f.cornerRadius = Math.min(l.radius, Math.min(l.width, l.height) / 2);
      if (l.path) {
        const mask = cutout(l.path, l.width, l.height, "#000000");
        mask.name = "mask";
        f.appendChild(mask);
        figma.group([mask], f).name = "shape";
        mask.isMask = true;
      }
      return f;
    }
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
      for (const run of (_a = l.runs) != null ? _a : []) {
        if (run.weight) {
          const face = faceFor(l.font, run.weight, have);
          if (face) t.setRangeFontName(run.from, run.to, face);
        }
        if (run.colour) t.setRangeFills(run.from, run.to, [{ type: "SOLID", color: rgb(run.colour) }]);
      }
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
        if (l.brightness !== void 0) dim(art2, l.brightness);
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
      shape.opacity = (_b = l.opacity) != null ? _b : 1;
      return shape;
    }
    const r = figma.createRectangle();
    r.resize(l.width, l.height);
    r.fills = [{ type: "SOLID", color: rgb(l.fill), opacity: (_c = l.opacity) != null ? _c : 1 }];
    if (l.radius) r.cornerRadius = Math.min(l.radius, Math.min(l.width, l.height) / 2);
    return r;
  }
  function dim(node, k) {
    const scale = (paints) => paints.map((p) => p.type === "SOLID" ? __spreadProps(__spreadValues({}, p), { color: { r: p.color.r * k, g: p.color.g * k, b: p.color.b * k } }) : p);
    if ("fills" in node && Array.isArray(node.fills)) node.fills = scale(node.fills);
    if ("strokes" in node && Array.isArray(node.strokes)) node.strokes = scale(node.strokes);
    if ("children" in node) for (const kid of node.children) dim(kid, k);
  }
  function cutout(c, w, h, fill, stroke, weight) {
    const n = figma.createNodeFromSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${c.view[0]} ${c.view[1]}" preserveAspectRatio="none"><path d="${c.path}" fill="${fill}"` + (stroke ? ` stroke="${stroke}" stroke-width="${weight != null ? weight : 7}"` : "") + `/></svg>`
    );
    n.x = 0;
    n.y = 0;
    return n;
  }
  function groupRuns(nodes, layers) {
    const runs = [];
    let run = [], name = "";
    for (let i = 0; i < layers.length; i++) {
      const g = layers[i].group || "";
      const same = run.length && nodes[i].parent === run[0].parent;
      if (g !== name || !same) {
        if (run.length > 1) runs.push(run);
        run = [];
        name = g;
      }
      if (g) run.push(nodes[i]);
    }
    if (run.length > 1) runs.push(run);
    for (const r of runs) {
      const into = r[0].parent;
      figma.group(r, into, into.children.indexOf(r[0])).name = layers[nodes.indexOf(r[0])].group;
    }
  }
  var contentOf = (f) => {
    var _a;
    return (_a = f.children.find((c) => c.type === "GROUP" && c.name === "shape")) != null ? _a : f;
  };
  function place(node, at, w, h, holder) {
    let x = at.cx, y = at.cy, rot = at.rot;
    if (holder) {
      const a = -holder.rot * Math.PI / 180, dx = at.cx - holder.cx, dy = at.cy - holder.cy;
      x = dx * Math.cos(a) - dy * Math.sin(a) + holder.w / 2;
      y = dx * Math.sin(a) + dy * Math.cos(a) + holder.h / 2;
      rot = at.rot - holder.rot;
    }
    const r = rot * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r);
    node.relativeTransform = [[c, -sn, x - c * w / 2 + sn * h / 2], [sn, c, y - sn * w / 2 - c * h / 2]];
  }
  async function build(doc) {
    var _a, _b;
    if (!doc || doc.schema !== "sac-studio/1" || !Array.isArray(doc.variants) || !doc.variants.length)
      throw Error("That is not a SAC Email Studio export.");
    for (const v of doc.variants) {
      if (!Array.isArray(v.layers)) throw Error(`${v.name}: no layers.`);
      if (!(v.width > 0 && v.height > 0 && v.width <= 32768 && v.height <= 32768))
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
        const clips = /* @__PURE__ */ new Map();
        const nodes = [];
        for (const l of v.layers) {
          const node = makeNode(l, images, doc.vectors || {}, have);
          const holder = l.parent !== void 0 ? clips.get(l.parent) : void 0;
          ((_a = holder == null ? void 0 : holder.into) != null ? _a : frame).appendChild(node);
          node.name = l.name;
          const w = node.width, h = node.height;
          let left = l.x, top = l.y;
          if (l.type === "text") {
            if (l.align === "center") left = l.x + (l.width - w) / 2;
            else if (l.align === "right") left = l.x + l.width - w;
            top = l.y + (l.height - h) / 2;
          }
          const at = { cx: left + w / 2, cy: top + h / 2, rot: (_b = l.rotation) != null ? _b : 0 };
          place(node, at, w, h, holder);
          if (l.type === "clip" && node.type === "FRAME") {
            clips.set(l.n, __spreadProps(__spreadValues({ node, into: contentOf(node) }, at), { w, h }));
            if (l.stroke && l.path) {
              const line = cutout(l.path, w, h, "none", l.stroke, l.strokeWidth);
              line.name = "outline";
              const into = node.parent;
              into.insertChild(into.children.indexOf(node) + 1, line);
              line.relativeTransform = node.relativeTransform;
            }
          }
          node.setPluginData("sac-layer", String(l.n));
          nodes.push(node);
        }
        groupRuns(nodes, v.layers);
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

/** Pick the file the studio exported, and build it. */
type Doc = {
  schema: string; project: { name: string; revision: string };
  variants: { name: string }[]; fontsNeeded: string[];
  assets: Record<string, string>; vectors: Record<string, string>;
};

const $ = (id: string) => document.getElementById(id)!;
let doc: unknown = null;

($('file') as HTMLInputElement).onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    if (file.size > 150_000_000) throw Error('That file is too large.');
    const data = JSON.parse(await file.text()) as Doc;
    if (data.schema !== 'sac-studio/1' || !Array.isArray(data.variants))
      throw Error('Choose a SAC Email Studio .figma.json export.');
    doc = data;
    $('name').textContent = `${data.project.name} · ${data.variants.length} assets`;
    $('fonts').textContent = data.fontsNeeded?.length
      ? `Needs: ${data.fontsNeeded.join(', ')}` : '';
    ($('build') as HTMLButtonElement).disabled = false;
    $('status').textContent = '';
  } catch (err) {
    doc = null;
    ($('build') as HTMLButtonElement).disabled = true;
    $('status').innerHTML = `<span class="bad">${err instanceof Error ? err.message : String(err)}</span>`;
  }
};

$('build').onclick = () => {
  ($('build') as HTMLButtonElement).disabled = true;
  $('status').textContent = 'Building…';
  parent.postMessage({ pluginMessage: { type: 'build', document: doc } }, '*');
};

onmessage = (e: MessageEvent) => {
  const m = e.data.pluginMessage;
  if (!m) return;
  ($('build') as HTMLButtonElement).disabled = false;
  $('status').innerHTML = m.ok
    ? `<span class="good">${m.message}</span>`
    : `<span class="bad">${String(m.message).replace(/\n/g, '<br>')}</span>`;
};

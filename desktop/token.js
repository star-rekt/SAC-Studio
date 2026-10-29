const byId = id => document.getElementById(id);
const show = (text, ok) => { const el = byId('state'); el.textContent = text; el.className = ok ? 'ok' : ok === false ? 'bad' : ''; };
const refresh = () => window.figmaToken.status().then(s => {
  byId('remove').disabled = !s.saved;
  show(s.saved ? `A token is saved (ending …${s.tail}).` : 'No token saved: the Figma gallery is off.');
});
byId('save').onclick = async () => {
  const value = byId('token').value.trim();
  if (!value) return show('Paste a token first.', false);
  byId('save').disabled = true;
  show('Checking with Figma…');
  const r = await window.figmaToken.save(value);
  byId('save').disabled = false;
  if (!r.saved) return show(r.message, false);
  byId('token').value = '';
  byId('remove').disabled = false;
  show(r.message, r.valid);
};
byId('remove').onclick = async () => { await window.figmaToken.remove(); refresh(); };
byId('help').onclick = () => window.figmaToken.help();
refresh();

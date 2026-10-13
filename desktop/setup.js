const byId = id => document.getElementById(id);
window.setup.status().then(state => {
  byId('claude-status').textContent = state.claude ? `— ${state.claude}` : '— not detected';
  byId('figma-status').textContent = state.plugin ? '— ready to import' : '— plugin build missing';
  byId('browser-status').textContent = state.chrome
    ? `Browser found: ${state.chrome}` : 'Chrome or Edge not detected. Editing still works.';
});
byId('claude-guide').onclick = () => window.setup.claude();
byId('figma-guide').onclick = () => window.setup.figma();
byId('plugin-folder').onclick = () => window.setup.plugin();
byId('continue').onclick = () => window.setup.continue();

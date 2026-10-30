/** What a designer calls each template, in the app's own screens. The specs
 *  keep their working names (a dev's note of what each looks like); these are
 *  the names on the menus. */
const LABELS: Record<string, string> = {
  sc26_0021: 'Flash Sale',
  sc26_0060: 'Bump',
  sc26_bump2: 'Bump 2',
  named_sale: 'Named Sale',
};

/** A template's name on screen: its label, else its working name up to the dash. */
export const templateLabel = (id: string, name = '') => LABELS[id] ?? name.split(' — ')[0] ?? id;

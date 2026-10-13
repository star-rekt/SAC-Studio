/** Board-authored alternatives. Counts always come from the brief or manual plan;
 *  these are choices for each instance, never instructions to create instances. */
export type DesignVariant = { id: string; name: string; height: number; node: string };

export const EMAIL_VARIANTS: Record<string, DesignVariant[]> = {
  sc26_0060: [
    { id: 'four-days', name: 'Four days · stepped photo', height: 1395, node: '538:18253' },
    { id: 'ends-soon', name: 'Ends soon · photo left', height: 1369, node: '538:18387' },
    { id: 'ends-tomorrow', name: 'Ends tomorrow · centered offer', height: 1526, node: '538:18481' },
    { id: 'ends-today', name: 'Ends today · outdoor photo', height: 1689, node: '538:18703' },
    { id: 'last-chance', name: 'Last chance · outline', height: 1329, node: '538:18602' },
  ],
  sc26_0058: [
    { id: 'ticket', name: 'Autumn20 · ticket over photo', height: 826, node: '211:697439' },
  ],
  sc26_0021: [
    { id: 'launch', name: 'Flash · launch', height: 1029, node: '248:711098' },
    { id: 'tomorrow', name: 'Flash · ends tomorrow', height: 2087, node: '248:711329' },
    { id: 'today', name: 'Flash · ends today', height: 1295, node: '248:711246' },
  ],
};

/** Independent board examples inside a non-email asset type. Selecting one
 * changes the design of this instance, never the number of instances. */
export const SITE_VARIANTS: Record<string, Record<string, { id: string; name: string }[]>> = {
  sc26_0060: { cb: [
    { id: 'launch', name: 'Launch banner' },
    { id: 'ends-today', name: 'Ends-today banner' },
  ] },
  sc26_0058: { cb: [
    { id: 'launch', name: 'Launch banner' },
    { id: 'ends-today', name: 'Ends-today banner' },
  ] },
};

export const emailVariant = (templateId: string, chosen: string, sendIndex: number) => {
  const list = EMAIL_VARIANTS[templateId] ?? [];
  return list.find(v => v.id === chosen) ?? list[sendIndex % list.length] ?? undefined;
};

/** Board-authored alternatives. Counts always come from the brief or manual plan;
 *  these are choices for each instance, never instructions to create instances. */
export type DesignVariant = { id: string; name: string; height: number; node: string };

export const EMAIL_VARIANTS: Record<string, DesignVariant[]> = {
  sc26_0060: [
    { id: 'send-1', name: 'Send 1 · 3 days only', height: 826, node: '585:23' },
    { id: 'send-2', name: 'Send 2 · ends tomorrow', height: 1125, node: '583:4' },
    { id: 'send-3', name: 'Send 3 · last chance', height: 929, node: '585:25' },
  ],
  sc26_0058: [
    { id: 'ticket', name: 'Autumn20 · ticket over photo', height: 826, node: '211:697439' },
  ],
  sc26_0021: [
    // 1029 is the hero alone; the board's own email-body/1 frame carries the
    // brand strip immediately beneath it (height 126), which FlashEmailHero
    // now renders as part of this same send.
    { id: 'launch', name: 'Flash · launch', height: 1029 + 126, node: '248:711098' },
    { id: 'tomorrow', name: 'Flash · ends tomorrow', height: 2087, node: '248:711329' },
    { id: 'today', name: 'Flash · ends today', height: 1295, node: '248:711246' },
  ],
  // Each design is self-contained (its own hero, body and footer in one
  // component, not stitched from a separate email-hero asset), so `height`
  // is unused here -- it only matters for sc26_0060's hero+body split.
  sc26_bump2: [
    { id: 'variant-1', name: 'Design 1', height: 7185, node: '583:3' },
    { id: 'variant-2', name: 'Design 2 · brand-focused hero', height: 7185, node: '-' },
    { id: 'variant-3', name: 'Design 3 · framed hero', height: 7185, node: '-' },
    { id: 'variant-4', name: 'Design 4', height: 7185, node: '585:14' },
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

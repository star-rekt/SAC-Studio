/** Routes an asset to a renderer.
 *
 *  Everything that is not an email is drawn by one composer reading the
 *  template's declared outlook. The per-format replicas are gone: they were
 *  faithful to one board and could not be varied, reused or diffed.
 *
 *  email-hero and email-body keep their own renderer. An email is not a
 *  composition on a frame -- it is a stack of sections with its own shell,
 *  nav and footer -- and collapsing it into the same vocabulary would lose
 *  more than it saved.
 */
import { Compose } from './Compose';
import { outlookFor, type TemplateSpec } from '../templates/spec';
import type { FormatSpec } from '../templates/registry';
import type { SheetAsset } from '../sheet/types';
import type { Direction } from '../templates/directions';

export function AssetView({ spec, asset, template, dir }: {
  spec: FormatSpec; asset: SheetAsset; template: TemplateSpec; dir?: Direction;
}) {
  return <Compose spec={spec} outlook={outlookFor(template, asset.format)}
                  asset={asset} template={template} dir={dir} />;
}

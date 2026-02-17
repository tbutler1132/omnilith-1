# Panel State Matrix (Current)

## Registry

Source: `packages/web/src/hud/panels/core/panel-schema.ts`

### Map Context

| Panel ID | Label | Roles | Availability |
| --- | --- | --- | --- |
| `threshold` | Threshold | main, secondary, collapsed | `contextClass === 'map' && canWrite` |
| `mine` | My organisms | main, secondary, collapsed | `contextClass === 'map' && canWrite` |
| `templates` | Templates | main, secondary, collapsed | `contextClass === 'map' && canWrite` |
| `template-values` | Template values | main, secondary, collapsed | `contextClass === 'map' && templateValuesReady && canWrite` |

### Interior Context

| Panel ID | Label | Roles | Availability |
| --- | --- | --- | --- |
| `interior-actions` | Tend current | collapsed only | `contextClass === 'interior'` |

### Visor Organism Context

| Panel ID | Label | Roles | Availability |
| --- | --- | --- | --- |
| `organism` | Tend | main, collapsed | `contextClass === 'visor-organism'` |
| `organism-nav` | Panel shortcuts | secondary | `contextClass === 'visor-organism' && interiorOrigin === true` |
| `composition` | Composition | main, secondary, collapsed | `contextClass === 'visor-organism'` |
| `propose` | Open proposal | main, secondary, collapsed | `contextClass === 'visor-organism' && !openTrunk && canWrite` |
| `proposals` | Proposals | main, secondary, collapsed | `contextClass === 'visor-organism' && !openTrunk` |
| `append` | Append state | main, secondary, collapsed | `contextClass === 'visor-organism' && openTrunk && canWrite` |
| `relationships` | Relationships | main, secondary, collapsed | `contextClass === 'visor-organism'` |
| `history` | State history | main, secondary, collapsed | `contextClass === 'visor-organism'` |
| `governance` | Governance | main, secondary, collapsed | `contextClass === 'visor-organism'` |

## Body Mapping

Source: `packages/web/src/hud/panels/core/panel-body-registry.tsx`

| Panel ID | Body Renderer | File |
| --- | --- | --- |
| `threshold` | `<ThresholdForm inline ... />` | `packages/web/src/hud/panels/forms/ThresholdForm.tsx` |
| `mine` | `<HudMyOrganisms ... />` | `packages/web/src/hud/panels/map/HudMyOrganisms.tsx` |
| `templates` | `<HudTemplates ... />` | `packages/web/src/hud/panels/map/HudTemplates.tsx` |
| `template-values` | `<HudTemplateValuesPanel ... />` or empty prompt | `packages/web/src/hud/panels/map/HudTemplateValuesPanel.tsx` |
| `organism` | `renderOrganismMainPanelBody` | `packages/web/src/hud/panels/core/panel-body-registry.tsx` |
| `composition` | `<CompositionSection ... />` | `packages/web/src/hud/panels/organism/sections/CompositionSection.tsx` |
| `propose` | `<ProposeSection ... />` | `packages/web/src/hud/panels/organism/sections/ProposeSection.tsx` |
| `proposals` | `<ProposalsSection ... />` | `packages/web/src/hud/panels/organism/sections/ProposalsSection.tsx` |
| `append` | `<AppendSection ... />` | `packages/web/src/hud/panels/organism/sections/AppendSection.tsx` |
| `relationships` | `<RelationshipsSection ... />` | `packages/web/src/hud/panels/organism/sections/RelationshipsSection.tsx` |
| `history` | `<StateHistorySection ... />` | `packages/web/src/hud/panels/organism/sections/StateHistorySection.tsx` |
| `governance` | `<GovernanceSection ... />` | `packages/web/src/hud/panels/organism/sections/GovernanceSection.tsx` |
| `interior-actions` | no body (collapsed rail action opens visor) | `packages/web/src/hud/AdaptiveVisorHost.tsx` |

## State Surfaces By Panel

### Map Panels

| Panel | Default | Loading | Empty | Error | Auth Required |
| --- | --- | --- | --- | --- | --- |
| `threshold` | Full threshold form | Submit shows `Thresholding...` | Input-progress indicators + blank inputs | Form-level and JSON errors | Not directly rendered for guest (panel unavailable via `canWrite`) |
| `mine` | Search + filter + organism list | `PanelCardLoading` | `PanelCardEmpty` / no matches message | `PanelCardErrorWithAction` | Not directly rendered for guest (panel unavailable via `canWrite`) |
| `templates` | Template list + actions | `PanelCardLoading` | `PanelCardEmpty` | inline error text | Not directly rendered for guest (panel unavailable via `canWrite`) |
| `template-values` | Value customization form | Submit shows `Creating scaffold...` | N/A | inline validation + request errors | Not directly rendered for guest (panel unavailable via `canWrite`) |

### Visor Organism Panels

| Panel | Default | Loading | Empty | Error | Auth Required |
| --- | --- | --- | --- | --- | --- |
| `organism` | Renderer + action bar | renderer-dependent | renderer-dependent | renderer-dependent | Inline dim text when write actions unavailable |
| `organism-nav` | Shortcut action buttons in secondary slot | N/A | N/A | N/A | N/A |
| `composition` | parent/children + compose actions | hook-driven partial loading (`...`) | `No parent`/`No children` state | inline compose/decompose error | Inline dim text (`Log in to compose or decompose.`) |
| `propose` | inline `ProposeForm` | form submit state | `PanelInfoEmpty` when missing current state | form-level error | `PanelInfoAuthRequired` |
| `proposals` | proposal list + integrate/decline actions | loading text | `No proposals.` | loading failure + action failure | inline dim text for action restrictions |
| `append` | inline `ProposeForm` in open-trunk mode | form submit state | `PanelInfoEmpty` when missing current state | form-level error | `PanelInfoAuthRequired` |
| `relationships` | relationship rows | `PanelInfoLoading` | `No relationships visible...` | `PanelInfoError` | N/A |
| `history` | reversed state list | `PanelInfoLoading` | `PanelInfoEmpty` | `PanelInfoError` | N/A |
| `governance` | open/regulated status labels | `Checking policies...` | open mode detail (`No policy organisms`) | none explicit | N/A |

## Deck Role Resolution

Source: `packages/web/src/hud/panels/core/panel-layout-policy.ts`

- `main` role is chosen from preferred panel when valid.
- If no preferred panel and template allows empty main, main stays empty.
- `secondary` role is selected from eligible panels by contextual secondary priority.
- `collapsed` rail gets remaining eligible collapsed-capable panels.
- In `visor-organism` with empty main, intent rule can seed initial collapsed-only entry (`organism`).

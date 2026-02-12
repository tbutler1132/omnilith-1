# 007 — Zoom-Responsive Rendering and the Space/Visor Split

## Context

While walking through the exact user experience of navigating the space, the founder identified a problem: if organisms in the space are only compact previews (icons, titles) and you always view organisms through the visor, then the space is just a fancy icon grid. The visor becomes "where you actually look at things" and the space becomes decorative.

The space should feel like walking through a gallery where you see the art on the walls — not browsing a folder of thumbnails.

## Decisions

### Zoom-responsive rendering

Content-type renderers in the space are not a binary compact/full toggle. They respond to zoom level on a continuous spectrum:

- **Zoomed out** — compact. Icons, titles, visual presence. Navigation scale.
- **Zoomed in** — organisms expand. Images fill their area. Text becomes readable. Audio shows waveform.
- **Zoomed in close** — full experiential rendering. You read the text, see the full image, hit play on the track. You experience the organism right there in the space.

The renderer receives the current zoom level and adapts. This is a rendering concern, not a data concern — the same organism state powers all zoom levels.

### The space/visor split

The space and the visor have distinct roles:

- **Space** — where you **experience** organisms. Navigate the ecology, see the art, listen to the music, read the text. The space is experiential.
- **Visor** — where you **tend** organisms. The universal layer: composition, governance, proposals, state history, vitality. Threshold, compose, surface, propose. The visor is operational.

You don't open the visor to look at a song. You hear it in the space. You open the visor to see its state history, check its vitality, compose something inside it, or open a proposal.

### Renderer contract update

The `RendererProps` interface passes zoom level rather than a mode enum:

```typescript
interface RendererProps {
  state: OrganismState;
  zoom: number;       // current viewport zoom level
  focused: boolean;   // whether this organism is the focused one
}
```

Each renderer decides its own breakpoints. An image renderer might show a thumbnail at zoom < 0.5 and the full image at zoom > 1.5. An audio renderer might show just an icon at low zoom but render a playable waveform at high zoom. This keeps the decision with the content type, not the platform.

## Rationale

- **The space earns its existence.** If organisms are only icons in the space, the space adds navigation overhead without experiential value. Zoom-responsive rendering makes the space the primary way you encounter organisms.
- **The visor becomes focused.** Instead of "the place where you view things," the visor is specifically the tending interface. This gives it a clearer identity and makes it feel purposeful rather than mandatory.
- **Continuous over binary.** A compact/full toggle creates a jarring switch. Zoom-responsive rendering feels natural — things get bigger and richer as you approach them, like a physical space.
- **Renderer autonomy.** Each content type knows best how to adapt to zoom. An audio organism's zoom breakpoints are different from a text organism's. Passing zoom level rather than a mode enum preserves this freedom.

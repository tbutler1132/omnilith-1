# Content Type Rubric

This rubric helps decide when to create a new content type versus using templates, composition, or policy organisms.

Use this with:

1. `docs/FOUNDATION.md`
2. `docs/ORGANISM-MODEL.md`
3. `docs/DECISION-LOG.md`

If this document conflicts with those, those documents win.

## Core Rule

Create a new content type only when all three are true:

1. The organism state needs a distinct schema that existing content types cannot represent cleanly.
2. The organism state needs distinct validation rules that are domain-critical.
3. The organism needs distinct renderer or differ behavior, not just different defaults.

If any of these are false, prefer existing content types plus composition.

## Decision Flow

1. Is this mostly default values for something we already model?
Use a template.

2. Is this a multi-organism setup?
Use composition and, if needed, a template recipe.

3. Is this mostly governance behavior?
Use policy organisms composed into the boundary.

4. Is there a genuinely new data contract with new validation and rendering needs?
Create a new content type.

## Red Flags

Do not create a new content type when:

1. "It is basically song with a few extra optional fields."
2. "We only need a starter workflow."
3. "We need kernel special-case logic for this content type."

## Strong Reasons To Create One

Create a new content type when:

1. There are new invariants that must be enforced at the state boundary.
2. There is a new artifact class with meaningfully different state semantics.
3. There is a renderer/differ need that cannot be treated as a variation of an existing content type.

## PR Checklist

Before merging a new content type, answer:

1. Which existing content types were considered and why were they insufficient?
2. Which new invariant does the validator enforce?
3. Why can this not be solved by composition, templates, or policy organisms?
4. Which domain tests specify intended behavior?
5. Which kernel files changed?
Expected answer: none.


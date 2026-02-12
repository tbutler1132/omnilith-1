/**
 * Content type metadata — data-driven documentation for all registered types.
 *
 * This drives the Content Types section of the docs. Each entry describes
 * a content type's schema, tier, and purpose without importing the actual
 * contracts (which live in @omnilith/content-types).
 */

export interface ContentTypeField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ContentTypeMetadata {
  typeId: string;
  displayName: string;
  tier: 1 | 2 | 3;
  tierLabel: string;
  description: string;
  hasEvaluator: boolean;
  fields: ContentTypeField[];
  examplePayload: Record<string, unknown>;
}

export const contentTypeMetadata: ReadonlyArray<ContentTypeMetadata> = [
  // ── Tier 1: Creative Fundamentals ──
  {
    typeId: 'audio',
    displayName: 'Audio',
    tier: 1,
    tierLabel: 'Creative Fundamentals',
    description:
      'Sound as organism. Songs, field recordings, spoken word — anything with a waveform. References binary storage for the actual file.',
    hasEvaluator: false,
    fields: [
      { name: 'fileReference', type: 'string', required: true, description: 'Reference to binary in content storage' },
      { name: 'durationSeconds', type: 'number', required: true, description: 'Length of the audio in seconds' },
      {
        name: 'format',
        type: "'mp3' | 'wav' | 'flac' | 'aac' | 'ogg'",
        required: true,
        description: 'Audio encoding format',
      },
      { name: 'sampleRate', type: 'number', required: false, description: 'Sample rate in Hz' },
      {
        name: 'metadata',
        type: 'Record<string, unknown>',
        required: false,
        description: 'Arbitrary key-value metadata',
      },
    ],
    examplePayload: {
      fileReference: 'store://audio/abc123',
      durationSeconds: 247,
      format: 'flac',
      sampleRate: 44100,
    },
  },
  {
    typeId: 'text',
    displayName: 'Text',
    tier: 1,
    tierLabel: 'Creative Fundamentals',
    description:
      'Written work as organism. Prose, poetry, essays, notes. Supports plaintext and markdown. Content lives directly in the state payload.',
    hasEvaluator: false,
    fields: [
      { name: 'content', type: 'string', required: true, description: 'The text content itself' },
      { name: 'format', type: "'plaintext' | 'markdown'", required: true, description: 'Text format for rendering' },
      {
        name: 'metadata',
        type: 'Record<string, unknown>',
        required: false,
        description: 'Arbitrary key-value metadata',
      },
    ],
    examplePayload: {
      content: '# Reflections\n\nThe garden grows whether we watch or not.',
      format: 'markdown',
    },
  },
  {
    typeId: 'image',
    displayName: 'Image',
    tier: 1,
    tierLabel: 'Creative Fundamentals',
    description:
      'Visual work as organism. Photographs, illustrations, diagrams. References binary storage. Carries dimensions for layout.',
    hasEvaluator: false,
    fields: [
      { name: 'fileReference', type: 'string', required: true, description: 'Reference to binary in content storage' },
      { name: 'width', type: 'number', required: true, description: 'Image width in pixels' },
      { name: 'height', type: 'number', required: true, description: 'Image height in pixels' },
      {
        name: 'format',
        type: "'png' | 'jpg' | 'jpeg' | 'gif' | 'webp' | 'svg'",
        required: true,
        description: 'Image encoding format',
      },
      {
        name: 'metadata',
        type: 'Record<string, unknown>',
        required: false,
        description: 'Arbitrary key-value metadata',
      },
    ],
    examplePayload: {
      fileReference: 'store://image/def456',
      width: 2400,
      height: 1600,
      format: 'jpg',
    },
  },
  {
    typeId: 'spatial-map',
    displayName: 'Spatial Map',
    tier: 1,
    tierLabel: 'Creative Fundamentals',
    description:
      'A curated arrangement of organisms in 2D space. Maps are organisms — surfacing means editing the map. Not automatic; intentionally composed.',
    hasEvaluator: false,
    fields: [
      {
        name: 'entries',
        type: 'Array<{ organismId, x, y, size?, emphasis? }>',
        required: true,
        description: 'Positioned organism references',
      },
      { name: 'width', type: 'number', required: true, description: 'Map canvas width' },
      { name: 'height', type: 'number', required: true, description: 'Map canvas height' },
    ],
    examplePayload: {
      entries: [
        { organismId: 'org_01', x: 120, y: 340, size: 1.2 },
        { organismId: 'org_02', x: 500, y: 180 },
      ],
      width: 1920,
      height: 1080,
    },
  },
  {
    typeId: 'composition-reference',
    displayName: 'Composition Reference',
    tier: 1,
    tierLabel: 'Creative Fundamentals',
    description:
      "Describes the arrangement of composed children. Sequential (album tracks), unordered (collection), or grouped (chapters). The parent organism's structural intent.",
    hasEvaluator: false,
    fields: [
      {
        name: 'entries',
        type: 'Array<{ organismId, position, grouping? }>',
        required: true,
        description: 'Ordered references to child organisms',
      },
      {
        name: 'arrangementType',
        type: "'sequential' | 'unordered' | 'grouped'",
        required: true,
        description: 'How children are arranged',
      },
    ],
    examplePayload: {
      entries: [
        { organismId: 'org_10', position: 0 },
        { organismId: 'org_11', position: 1 },
        { organismId: 'org_12', position: 2 },
      ],
      arrangementType: 'sequential',
    },
  },
  {
    typeId: 'thread',
    displayName: 'Thread',
    tier: 1,
    tierLabel: 'Creative Fundamentals',
    description:
      'Conversation as organism. Threads are organisms with open-trunk configuration — append-only by default. Each post is a state append. Can be linked to another organism for contextual discussion.',
    hasEvaluator: false,
    fields: [
      { name: 'title', type: 'string', required: true, description: 'Thread title' },
      { name: 'linkedOrganismId', type: 'OrganismId', required: false, description: 'Organism this thread is about' },
      { name: 'appendOnly', type: 'boolean', required: true, description: 'Whether posts can only be appended' },
    ],
    examplePayload: {
      title: 'Feedback on the new arrangement',
      appendOnly: true,
    },
  },

  // ── Tier 2: Governance ──
  {
    typeId: 'integration-policy',
    displayName: 'Integration Policy',
    tier: 2,
    tierLabel: 'Governance',
    description:
      'A policy organism that governs its direct parent. When composed inside another organism, proposals to the parent are evaluated by this policy. Currently supports single-integrator mode.',
    hasEvaluator: true,
    fields: [
      { name: 'mode', type: "'single-integrator'", required: true, description: 'Policy evaluation mode' },
      {
        name: 'integratorId',
        type: 'UserId',
        required: true,
        description: 'The user authorized to integrate proposals',
      },
    ],
    examplePayload: {
      mode: 'single-integrator',
      integratorId: 'usr_01',
    },
  },

  // ── Tier 3: Awareness ──
  {
    typeId: 'sensor',
    displayName: 'Sensor',
    tier: 3,
    tierLabel: 'Awareness',
    description:
      'Observes another organism and records readings. Tracks metrics like state changes, proposals, or compositions over time. The eyes of the cybernetic loop.',
    hasEvaluator: false,
    fields: [
      { name: 'label', type: 'string', required: true, description: 'Human-readable sensor name' },
      { name: 'targetOrganismId', type: 'OrganismId', required: true, description: 'Organism being observed' },
      {
        name: 'metric',
        type: "'state-changes' | 'proposals' | 'compositions'",
        required: true,
        description: 'What is being measured',
      },
      { name: 'readings', type: 'Array<{ value, sampledAt }>', required: true, description: 'Time-series readings' },
    ],
    examplePayload: {
      label: 'Weekly state changes',
      targetOrganismId: 'org_01',
      metric: 'state-changes',
      readings: [{ value: 12, sampledAt: 1700000000 }],
    },
  },
  {
    typeId: 'variable',
    displayName: 'Variable',
    tier: 3,
    tierLabel: 'Awareness',
    description:
      'A derived value computed from sensor readings. Carries optional thresholds that response policies can react to. The nervous system — translating raw observations into actionable signals.',
    hasEvaluator: false,
    fields: [
      { name: 'label', type: 'string', required: true, description: 'Human-readable variable name' },
      { name: 'value', type: 'number', required: true, description: 'Current computed value' },
      { name: 'unit', type: 'string', required: false, description: 'Unit of measurement' },
      {
        name: 'thresholds',
        type: '{ low?, critical? }',
        required: false,
        description: 'Warning and critical thresholds',
      },
      { name: 'computedFrom', type: 'string', required: false, description: 'Formula or source description' },
      { name: 'computedAt', type: 'Timestamp', required: true, description: 'When this value was last computed' },
    ],
    examplePayload: {
      label: 'Weekly activity rate',
      value: 3.5,
      unit: 'changes/week',
      thresholds: { low: 1, critical: 0.5 },
      computedAt: 1700000000,
    },
  },
  {
    typeId: 'response-policy',
    displayName: 'Response Policy',
    tier: 3,
    tierLabel: 'Awareness',
    description:
      'A policy organism that reacts to variable values. When a variable crosses a threshold, the response policy evaluates proposals accordingly — the muscles of the cybernetic loop, translating awareness into action.',
    hasEvaluator: true,
    fields: [
      { name: 'mode', type: "'variable-threshold'", required: true, description: 'Response evaluation mode' },
      { name: 'variableLabel', type: 'string', required: true, description: 'Which variable to watch' },
      { name: 'condition', type: "'below' | 'above'", required: true, description: 'Threshold direction' },
      { name: 'threshold', type: 'number', required: true, description: 'Trigger threshold value' },
      { name: 'currentVariableValue', type: 'number', required: false, description: 'Last known variable value' },
      {
        name: 'action',
        type: "'decline-all' | 'pass'",
        required: true,
        description: 'What to do when condition is met',
      },
      { name: 'reason', type: 'string', required: true, description: 'Human-readable explanation' },
    ],
    examplePayload: {
      mode: 'variable-threshold',
      variableLabel: 'Weekly activity rate',
      condition: 'below',
      threshold: 1,
      action: 'decline-all',
      reason: 'Activity too low — declining proposals until engagement recovers',
    },
  },
];

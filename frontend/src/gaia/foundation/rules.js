export const rules = [
  {
    name: 'Technical',
    condition: (context) => context.type === 'technical',
    documents: ['soul.md', 'principles.md', 'lexicon.md', 'architecture.md']
  },
  {
    name: 'Gaia',
    condition: (context) => context.type === 'gaia',
    documents: ['soul.md', 'principles.md', 'lexicon.md', 'evolution.md']
  },
  {
    name: 'Conversation',
    condition: (context) => context.type === 'conversation',
    documents: ['soul.md', 'principles.md', 'lexicon.md']
  }
];

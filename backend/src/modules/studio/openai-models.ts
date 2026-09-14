export type StudioModelFamily = 'chat' | 'reasoning';

export type StudioAiModel = {
  id: string;
  label: string;
  description: string;
  family: StudioModelFamily;
  /** Shown in the picker group header */
  group: 'Latest' | 'GPT-4' | 'Reasoning';
};

/** Allowlist only — never accept arbitrary model strings from the client. */
export const STUDIO_AI_MODELS: readonly StudioAiModel[] = [
  {
    id: 'gpt-5.6-luna',
    label: 'GPT-5.6 Luna',
    description: 'Latest nano-tier — fastest & cheapest',
    family: 'reasoning',
    group: 'Latest',
  },
  {
    id: 'gpt-5.2',
    label: 'GPT-5.2',
    description: 'Newest flagship — best quality',
    family: 'reasoning',
    group: 'Latest',
  },
  {
    id: 'gpt-5.1',
    label: 'GPT-5.1',
    description: 'Recent flagship',
    family: 'reasoning',
    group: 'Latest',
  },
  {
    id: 'gpt-5-mini',
    label: 'GPT-5 Mini',
    description: 'Fast & affordable latest-gen',
    family: 'reasoning',
    group: 'Latest',
  },
  {
    id: 'gpt-5-nano',
    label: 'GPT-5 Nano',
    description: 'Lowest latency latest-gen',
    family: 'reasoning',
    group: 'Latest',
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    description: 'Strong GPT-4 generation',
    family: 'chat',
    group: 'GPT-4',
  },
  {
    id: 'gpt-4.1-mini',
    label: 'GPT-4.1 Mini',
    description: 'Balanced cost / quality',
    family: 'chat',
    group: 'GPT-4',
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    description: 'Multimodal flagship (classic)',
    family: 'chat',
    group: 'GPT-4',
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    description: 'Default — fast & cheap',
    family: 'chat',
    group: 'GPT-4',
  },
  {
    id: 'o4-mini',
    label: 'o4-mini',
    description: 'Compact reasoning',
    family: 'reasoning',
    group: 'Reasoning',
  },
  {
    id: 'o3-mini',
    label: 'o3-mini',
    description: 'Prior reasoning mini',
    family: 'reasoning',
    group: 'Reasoning',
  },
] as const;

export const DEFAULT_STUDIO_AI_MODEL = 'gpt-4o-mini';

const MODEL_BY_ID = new Map(
  STUDIO_AI_MODELS.map((model) => [model.id, model] as const),
);

export function resolveStudioAiModel(modelId?: string | null): StudioAiModel {
  if (modelId && MODEL_BY_ID.has(modelId)) {
    return MODEL_BY_ID.get(modelId)!;
  }
  return MODEL_BY_ID.get(DEFAULT_STUDIO_AI_MODEL)!;
}

export function isStudioAiModelId(modelId: string): boolean {
  return MODEL_BY_ID.has(modelId);
}

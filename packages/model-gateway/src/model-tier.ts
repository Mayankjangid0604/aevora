export enum ModelTier {
  LOCAL_BASIC = 'LOCAL_BASIC',
  LOCAL_COMPLEX = 'LOCAL_COMPLEX',
  SONNET = 'SONNET',
  OPUS = 'OPUS',
  FABLE = 'FABLE',
}

export interface TierConfig {
  tier: ModelTier;
  model: string;
  provider: 'ollama' | 'anthropic';
  maxTokens: number;
  useCase: string;
}

export function getTierConfig(tier: ModelTier): TierConfig {
  const configs: Record<ModelTier, TierConfig> = {
    [ModelTier.LOCAL_BASIC]: {
      tier: ModelTier.LOCAL_BASIC,
      model: process.env.CEO_MODEL || 'phi4',
      provider: 'ollama',
      maxTokens: 2000,
      useCase: 'CEO daily reviews, task assignment, basic decisions',
    },
    [ModelTier.LOCAL_COMPLEX]: {
      tier: ModelTier.LOCAL_COMPLEX,
      model: process.env.CEO_MODEL_COMPLEX || 'phi4',
      provider: 'ollama',
      maxTokens: 4000,
      useCase: 'CEO complex strategy, venture planning, major decisions',
    },
    [ModelTier.SONNET]: {
      tier: ModelTier.SONNET,
      model: process.env.MODEL_TIER_2 || 'claude-sonnet-5',
      provider: 'anthropic',
      maxTokens: 8000,
      useCase: 'Rs10000 tier client websites and demos',
    },
    [ModelTier.OPUS]: {
      tier: ModelTier.OPUS,
      model: process.env.MODEL_TIER_3 || 'claude-opus-5-5',
      provider: 'anthropic',
      maxTokens: 16000,
      useCase: 'Rs20000 tier complex projects',
    },
    [ModelTier.FABLE]: {
      tier: ModelTier.FABLE,
      model: process.env.MODEL_TIER_4 || 'claude-fable-5-1',
      provider: 'anthropic',
      maxTokens: 32000,
      useCase: 'Rs30000+ premium projects SaaS CRM',
    },
  };
  return configs[tier];
}

export function getBudgetTier(budgetPaise: number): ModelTier {
  const t1 = parseInt(process.env.BUDGET_TIER_1_MAX || '500000');
  const t2 = parseInt(process.env.BUDGET_TIER_2_MAX || '1000000');
  const t3 = parseInt(process.env.BUDGET_TIER_3_MAX || '2000000');
  if (budgetPaise <= t1) return ModelTier.LOCAL_BASIC;
  if (budgetPaise <= t2) return ModelTier.SONNET;
  if (budgetPaise <= t3) return ModelTier.OPUS;
  return ModelTier.FABLE;
}

export function shouldUseComplexModel(
  decisionTypes: string[],
  budgetPaise: number,
): boolean {
  const complexTypes = ['HIRE_AGENT', 'CREATE_VENTURE', 'ESCALATE_TO_CHAIRMAN'];
  const highBudget = budgetPaise > 5000000;
  const hasComplexDecision = decisionTypes.some(t => complexTypes.includes(t));
  return highBudget || hasComplexDecision;
}

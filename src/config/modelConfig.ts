export interface ModelInfo {
  id: string;
  shortId: string;
  label: string;
  provider: string;
  contextTokens: number;
  tier: number;
  bestFor: string;
  speed: 'fast' | 'medium' | 'slow';
  cost: 'low' | 'medium' | 'high';
  category: 'reasoning' | 'chat' | 'fast' | 'long-form' | 'open-source' | 'vision';
}

export const AIML_MODEL_CONFIG: Record<string, ModelInfo> = {
  // Reasoning Models
  'deepseek-r1': {
    id: "deepseek/deepseek-r1",
    shortId: "deepseek-r1",
    label: "DeepSeek R1",
    provider: "DeepSeek",
    contextTokens: 128_000,
    tier: 3,
    bestFor: "Complex reasoning, hackathon logic analysis, step-by-step problem solving",
    speed: 'medium',
    cost: 'medium',
    category: 'reasoning',
  },
  'gpt-4o': {
    id: "gpt-4o",
    shortId: "gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
    contextTokens: 128_000,
    tier: 3,
    bestFor: "Fast, balanced chat + vision, general purpose",
    speed: 'fast',
    cost: 'medium',
    category: 'chat',
  },
  'gpt-4o-mini': {
    id: "gpt-4o-mini",
    shortId: "gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "OpenAI",
    contextTokens: 128_000,
    tier: 2,
    bestFor: "Fast responses, cost-effective, good for simple queries",
    speed: 'fast',
    cost: 'low',
    category: 'fast',
  },
  'claude-sonnet': {
    id: "claude-3.7-sonnet-20250219",
    shortId: "claude-sonnet",
    label: "Claude 3.7 Sonnet",
    provider: "Anthropic",
    contextTokens: 200_000,
    tier: 3,
    bestFor: "Long-form reasoning, detailed content analysis, comprehensive answers",
    speed: 'medium',
    cost: 'high',
    category: 'long-form',
  },
  'claude-opus': {
    id: "claude-3-opus-20240229",
    shortId: "claude-opus",
    label: "Claude 3 Opus",
    provider: "Anthropic",
    contextTokens: 200_000,
    tier: 3,
    bestFor: "Most capable model, complex analysis, creative tasks",
    speed: 'slow',
    cost: 'high',
    category: 'reasoning',
  },
  'claude-haiku': {
    id: "claude-3-haiku-20240307",
    shortId: "claude-haiku",
    label: "Claude 3 Haiku",
    provider: "Anthropic",
    contextTokens: 200_000,
    tier: 2,
    bestFor: "Fast responses, cost-effective, quick answers",
    speed: 'fast',
    cost: 'low',
    category: 'fast',
  },
  'llama-405b': {
    id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    shortId: "llama-405b",
    label: "Llama 3.1 405B",
    provider: "Meta",
    contextTokens: 4_000,
    tier: 2,
    bestFor: "High quality open-source reasoning, privacy-focused",
    speed: 'medium',
    cost: 'low',
    category: 'open-source',
  },
  'llama-70b': {
    id: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    shortId: "llama-70b",
    label: "Llama 3.1 70B",
    provider: "Meta",
    contextTokens: 128_000,
    tier: 2,
    bestFor: "Balanced open-source model, good performance",
    speed: 'fast',
    cost: 'low',
    category: 'open-source',
  },
  'gemini-pro': {
    id: "google/gemini-pro-1.5",
    shortId: "gemini-pro",
    label: "Gemini Pro 1.5",
    provider: "Google",
    contextTokens: 1_000_000,
    tier: 3,
    bestFor: "Massive context, long documents, comprehensive analysis",
    speed: 'medium',
    cost: 'medium',
    category: 'long-form',
  },
  'mistral-large': {
    id: "mistralai/mistral-large-2407",
    shortId: "mistral-large",
    label: "Mistral Large",
    provider: "Mistral AI",
    contextTokens: 32_000,
    tier: 3,
    bestFor: "High-quality reasoning, multilingual support",
    speed: 'medium',
    cost: 'medium',
    category: 'reasoning',
  },
};

export const MODEL_CATEGORIES = {
  reasoning: ['deepseek-r1', 'claude-opus', 'mistral-large'],
  chat: ['gpt-4o', 'claude-sonnet'],
  fast: ['gpt-4o-mini', 'claude-haiku', 'llama-70b'],
  'long-form': ['claude-sonnet', 'gemini-pro'],
  'open-source': ['llama-405b', 'llama-70b'],
};

export const DEFAULT_MODEL = 'gpt-4o';

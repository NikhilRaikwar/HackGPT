export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  provider: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  inputPricePer1K?: number;
  outputPricePer1K?: number;
  capabilities?: string[];
}

export const AIML_MODEL_CONFIG: Record<string, ModelInfo> = {
  "grok-4-fast-reasoning": {
    id: "x-ai/grok-4-fast-reasoning",
    name: "Grok-4 Fast Reasoning",
    description: "Fast reasoning model with function calling capabilities",
    provider: "xAI",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: ["chat", "function-calling", "reasoning"]
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "OpenAI's flagship model with function calling capabilities",
    provider: "OpenAI",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: ["chat", "function-calling", "vision"]
  }
};

export const MODEL_CATEGORIES = {
  reasoning: ["grok-4-fast-reasoning"],
  chat: ["gpt-4o"],
  "function-calling": ["grok-4-fast-reasoning", "gpt-4o"]
};

export const DEFAULT_MODEL = "grok-4-fast-reasoning";

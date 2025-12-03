export const AIML_MODEL_CONFIG = {
  reasoning: {
    primary: {
      id: "deepseek/deepseek-r1",
      label: "DeepSeek R1",
      contextTokens: 128_000,
      tier: 3,
      bestFor: "Complex reasoning, hackathon logic analysis",
    },
    fast: {
      id: "gpt-4o",
      label: "GPT-4o",
      contextTokens: 128_000,
      tier: 3,
      bestFor: "Fast, balanced chat + vision",
    },
    longForm: {
      id: "claude-3.7-sonnet-20250219",
      label: "Claude 3.7 Sonnet",
      contextTokens: 200_000,
      tier: 3,
      bestFor: "Long-form reasoning, detailed content analysis",
    },
    openSource: {
      id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
      label: "Llama 3.1 405B Instruct Turbo",
      contextTokens: 4_000,
      tier: 2,
      bestFor: "High quality open-source reasoning",
    },
  },
  chat: {
    primary: "gpt-4o",
    altFast: "gpt-4o-mini",
  },
  embeddings: {
    primary: "text-embedding-3-large",
    secondary: "text-embedding-3-small",
    voyage: "voyage-large-2-instruct",
    retrieval: "togethercomputer/m2-bert-80M-32k-retrieval",
  },
};

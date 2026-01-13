import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { LanguageModelV3 } from '@ai-sdk/provider';

/** Supported AI provider identifiers. */
export const AIProvider = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
} as const;

export type AIProvider = (typeof AIProvider)[keyof typeof AIProvider];

/** Default model for each provider. */
const DEFAULT_MODELS: Record<AIProvider, string> = {
  [AIProvider.ANTHROPIC]: 'claude-sonnet-4-20250514',
  [AIProvider.OPENAI]: 'gpt-4o',
};

/** Options for getting a model instance. */
export interface GetModelOptions {
  /** The AI provider to use. Defaults to 'anthropic'. */
  provider?: AIProvider;
  /** Override the default model for the provider. */
  model?: string;
}

/** Gets a language model instance for the specified provider. */
export function getModel(options: GetModelOptions = {}): LanguageModelV3 {
  const provider = options.provider ?? AIProvider.ANTHROPIC;
  const model = options.model ?? DEFAULT_MODELS[provider];

  switch (provider) {
    case AIProvider.ANTHROPIC:
      return anthropic(model);
    case AIProvider.OPENAI:
      return openai(model);
  }
}

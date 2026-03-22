/**
 * Re-exports LLM status from the provider.
 * The enhancement functions are no longer needed — the LLM does
 * full matching directly. This file kept for the /demo/ai endpoint.
 */

import { getLLMStatus } from './llm-provider';

export async function isLLMAvailable(): Promise<{ available: boolean; model: string; provider: string }> {
  const status = getLLMStatus();
  return { available: true, ...status };
}

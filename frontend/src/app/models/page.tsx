import { fetchLiveModels } from "@/lib/api";
import { ModelsClient } from "./ModelsClient";

export default async function ModelsPage() {
  const { topModels, globalModels } = await fetchLiveModels();

  // Ensure we always have some data to prevent build/render errors
  const safeTopModels = topModels.length > 0 ? topModels : fallbackTopModels;
  const safeGlobalModels = globalModels.length > 0 ? globalModels : [];

  return <ModelsClient topModels={safeTopModels} globalModels={safeGlobalModels} />;
}

const fallbackTopModels = [
  { id: "fallback-gemini", name: "Gemini 3 Pro", provider: "Google", type: "Proprietary", context: 2000, mmlu: 92.5, humanEval: 97.0, math: 95.5, speed: 85, ttft: 0.8, inputCost: 2.50, outputCost: 7.50, elo: 1492, vision: true, tools: true, badge: "Arena Leader" as const },
  { id: "fallback-claude", name: "Claude 4.5 Opus", provider: "Anthropic", type: "Proprietary", context: 200, mmlu: 91.5, humanEval: 97.6, math: 94.2, speed: 75, ttft: 1.2, inputCost: 4.00, outputCost: 12.00, elo: 1466, vision: true, tools: true, badge: "Best Coding" as const },
  { id: "fallback-deepseek", name: "DeepSeek R2", provider: "DeepSeek", type: "Open Weights", context: 128, mmlu: 90.5, humanEval: 97.4, math: 96.0, speed: 65, ttft: 0.9, inputCost: 0.14, outputCost: 0.28, elo: 1450, vision: false, tools: true, badge: "Top Reasoning" as const },
  { id: "fallback-o3", name: "o3-mini", provider: "OpenAI", type: "Proprietary", context: 200, mmlu: 88.9, humanEval: 96.0, math: 93.5, speed: 150, ttft: 0.4, inputCost: 1.10, outputCost: 4.40, elo: 1440, vision: false, tools: true, badge: "Fast Reasoning" as const },
] as any;

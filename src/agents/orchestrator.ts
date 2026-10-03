import {
  AgentContext,
  ResearchAgentOutput,
  StrategistAgentOutput,
  WriterAgentOutput,
  SeoAgentOutput,
  ImageAgentOutput,
  QaAgentOutput,
} from "./types";
import { ResearchAgent } from "./research-agent";
import { StrategistAgent } from "./strategist-agent";
import { WriterAgent } from "./writer-agent";
import { SeoAgent } from "./seo-agent";
import { ImageAgent } from "./image-agent";
import { QaAgent } from "./qa-agent";
import { GenerationService } from "@/services/research-service";

export interface OrchestrationState {
  topic: string;
  category: string;
  audience: string;
  tone: string;
  targetWords: number;
  context: AgentContext;
  currentStage: "research" | "strategy" | "writing" | "seo" | "qa" | "image" | "completed" | "failed";
  stages: {
    research?: { status: "pending" | "completed" | "failed"; data?: ResearchAgentOutput; error?: string };
    strategy?: { status: "pending" | "completed" | "failed"; data?: StrategistAgentOutput; error?: string };
    writing?: { status: "pending" | "completed" | "failed"; data?: WriterAgentOutput; error?: string };
    seo?: { status: "pending" | "completed" | "failed"; data?: SeoAgentOutput; error?: string };
    qa?: { status: "pending" | "completed" | "failed"; data?: QaAgentOutput; error?: string };
    image?: { status: "pending" | "completed" | "failed"; data?: ImageAgentOutput; error?: string };
  };
}

const memoryOrchestrationStates = new Map<string, OrchestrationState>();

export class AgentOrchestrator {
  static getState(runId: string): OrchestrationState | null {
    return memoryOrchestrationStates.get(runId) || null;
  }

  static async orchestrateAll(
    runId: string,
    params: {
      topic: string;
      category: string;
      audience: string;
      tone: string;
      targetWords: number;
      context: AgentContext;
    }
  ): Promise<OrchestrationState> {
    const state: OrchestrationState = {
      ...params,
      currentStage: "research",
      stages: {
        research: { status: "pending" },
        strategy: { status: "pending" },
        writing: { status: "pending" },
        seo: { status: "pending" },
        qa: { status: "pending" },
        image: { status: "pending" },
      },
    };
    memoryOrchestrationStates.set(runId, state);

    try {
      // 1. Research Stage
      state.currentStage = "research";
      const research = await ResearchAgent.execute(params.topic, params.category, params.context);
      state.stages.research = { status: "completed", data: research };

      // 2. Strategy Stage
      state.currentStage = "strategy";
      const strategy = await StrategistAgent.execute(params.topic, research, params.audience, params.context);
      state.stages.strategy = { status: "completed", data: strategy };

      // 3. Writing Stage
      state.currentStage = "writing";
      const writer = await WriterAgent.execute(
        params.topic,
        strategy,
        research,
        params.tone,
        params.targetWords,
        params.context
      );
      state.stages.writing = { status: "completed", data: writer };

      // 4. SEO Stage
      state.currentStage = "seo";
      const seo = await SeoAgent.execute(params.topic, params.category, writer, params.context);
      state.stages.seo = { status: "completed", data: seo };

      // 5. QA Stage
      state.currentStage = "qa";
      const qa = await QaAgent.execute(params.topic, writer, seo, research, strategy, params.context);
      state.stages.qa = { status: "completed", data: qa };

      // 6. Image Stage
      state.currentStage = "image";
      const image = await ImageAgent.execute(params.topic, params.category, writer, params.context);
      state.stages.image = { status: "completed", data: image };

      state.currentStage = "completed";
      memoryOrchestrationStates.set(runId, state);

      return state;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Stage execution failed";
      state.stages[state.currentStage as keyof typeof state.stages] = {
        status: "failed",
        error: errorMsg,
      };
      state.currentStage = "failed";
      memoryOrchestrationStates.set(runId, state);
      throw err;
    }
  }

  static async retryStage(
    runId: string,
    stage: "research" | "strategy" | "writing" | "seo" | "qa" | "image"
  ): Promise<OrchestrationState> {
    const state = memoryOrchestrationStates.get(runId);
    if (!state) throw new Error("Orchestration run not found");

    if (stage === "research") {
      const research = await ResearchAgent.execute(state.topic, state.category, state.context);
      state.stages.research = { status: "completed", data: research };
    } else if (stage === "strategy" && state.stages.research?.data) {
      const strategy = await StrategistAgent.execute(state.topic, state.stages.research.data, state.audience, state.context);
      state.stages.strategy = { status: "completed", data: strategy };
    } else if (stage === "writing" && state.stages.strategy?.data && state.stages.research?.data) {
      const writer = await WriterAgent.execute(
        state.topic,
        state.stages.strategy.data,
        state.stages.research.data,
        state.tone,
        state.targetWords,
        state.context
      );
      state.stages.writing = { status: "completed", data: writer };
    } else if (stage === "seo" && state.stages.writing?.data) {
      const seo = await SeoAgent.execute(state.topic, state.category, state.stages.writing.data, state.context);
      state.stages.seo = { status: "completed", data: seo };
    } else if (
      stage === "qa" &&
      state.stages.writing?.data &&
      state.stages.seo?.data &&
      state.stages.research?.data &&
      state.stages.strategy?.data
    ) {
      const qa = await QaAgent.execute(
        state.topic,
        state.stages.writing.data,
        state.stages.seo.data,
        state.stages.research.data,
        state.stages.strategy.data,
        state.context
      );
      state.stages.qa = { status: "completed", data: qa };
    } else if (stage === "image" && state.stages.writing?.data) {
      const image = await ImageAgent.execute(state.topic, state.category, state.stages.writing.data, state.context);
      state.stages.image = { status: "completed", data: image };
    }

    memoryOrchestrationStates.set(runId, state);
    return state;
  }
}

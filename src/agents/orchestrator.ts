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
import { executeWithRetry, aiCircuitBreaker } from "@/lib/ai/resilience";

export interface StageExecution<T> {
  status: "pending" | "running" | "completed" | "failed";
  data?: T;
  error?: string;
  retries?: number;
  durationMs?: number;
}

export interface OrchestrationState {
  topic: string;
  category: string;
  audience: string;
  tone: string;
  targetWords: number;
  context: AgentContext;
  currentStage: "research" | "strategy" | "writing" | "seo" | "qa" | "image" | "completed" | "failed";
  circuitBreakerStatus?: string;
  stages: {
    research?: StageExecution<ResearchAgentOutput>;
    strategy?: StageExecution<StrategistAgentOutput>;
    writing?: StageExecution<WriterAgentOutput>;
    seo?: StageExecution<SeoAgentOutput>;
    qa?: StageExecution<QaAgentOutput>;
    image?: StageExecution<ImageAgentOutput>;
  };
}

const memoryOrchestrationStates = new Map<string, OrchestrationState>();

export class AgentOrchestrator {
  static getState(runId: string): OrchestrationState | null {
    const state = memoryOrchestrationStates.get(runId);
    if (!state) return null;
    return {
      ...state,
      circuitBreakerStatus: aiCircuitBreaker.getState(),
    };
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
        research: { status: "pending", retries: 0 },
        strategy: { status: "pending", retries: 0 },
        writing: { status: "pending", retries: 0 },
        seo: { status: "pending", retries: 0 },
        qa: { status: "pending", retries: 0 },
        image: { status: "pending", retries: 0 },
      },
    };
    memoryOrchestrationStates.set(runId, state);

    return this.runStagesFrom(runId, state);
  }

  static async resumePipeline(runId: string): Promise<OrchestrationState> {
    const state = memoryOrchestrationStates.get(runId);
    if (!state) throw new Error("Orchestration state not found for run");

    // Clear failed state
    if (state.currentStage === "failed") {
      state.currentStage = "research";
    }

    return this.runStagesFrom(runId, state);
  }

  private static async runStagesFrom(
    runId: string,
    state: OrchestrationState
  ): Promise<OrchestrationState> {
    try {
      // 1. Research Stage
      if (state.stages.research?.status !== "completed") {
        state.currentStage = "research";
        state.stages.research = { status: "running", retries: 0 };
        memoryOrchestrationStates.set(runId, state);

        const startTime = Date.now();
        let retryCount = 0;

        const research = await executeWithRetry(
          async () => {
            return await aiCircuitBreaker.execute(async () => {
              return await ResearchAgent.execute(state.topic, state.category, state.context);
            });
          },
          {
            maxRetries: 2,
            onRetry: (attempt) => {
              retryCount = attempt;
            },
          }
        );

        state.stages.research = {
          status: "completed",
          data: research,
          retries: retryCount,
          durationMs: Date.now() - startTime,
        };
        memoryOrchestrationStates.set(runId, state);
      }

      // 2. Strategy Stage
      if (state.stages.strategy?.status !== "completed") {
        state.currentStage = "strategy";
        state.stages.strategy = { status: "running", retries: 0 };
        memoryOrchestrationStates.set(runId, state);

        const startTime = Date.now();
        let retryCount = 0;

        const strategy = await executeWithRetry(
          async () => {
            return await aiCircuitBreaker.execute(async () => {
              return await StrategistAgent.execute(
                state.topic,
                state.stages.research!.data!,
                state.audience,
                state.context
              );
            });
          },
          {
            maxRetries: 2,
            onRetry: (attempt) => {
              retryCount = attempt;
            },
          }
        );

        state.stages.strategy = {
          status: "completed",
          data: strategy,
          retries: retryCount,
          durationMs: Date.now() - startTime,
        };
        memoryOrchestrationStates.set(runId, state);
      }

      // 3. Writing Stage
      if (state.stages.writing?.status !== "completed") {
        state.currentStage = "writing";
        state.stages.writing = { status: "running", retries: 0 };
        memoryOrchestrationStates.set(runId, state);

        const startTime = Date.now();
        let retryCount = 0;

        const writer = await executeWithRetry(
          async () => {
            return await aiCircuitBreaker.execute(async () => {
              return await WriterAgent.execute(
                state.topic,
                state.stages.strategy!.data!,
                state.stages.research!.data!,
                state.tone,
                state.targetWords,
                state.context
              );
            });
          },
          {
            maxRetries: 2,
            onRetry: (attempt) => {
              retryCount = attempt;
            },
          }
        );

        state.stages.writing = {
          status: "completed",
          data: writer,
          retries: retryCount,
          durationMs: Date.now() - startTime,
        };
        memoryOrchestrationStates.set(runId, state);
      }

      // 4. SEO Stage
      if (state.stages.seo?.status !== "completed") {
        state.currentStage = "seo";
        state.stages.seo = { status: "running", retries: 0 };
        memoryOrchestrationStates.set(runId, state);

        const startTime = Date.now();
        let retryCount = 0;

        const seo = await executeWithRetry(
          async () => {
            return await aiCircuitBreaker.execute(async () => {
              return await SeoAgent.execute(
                state.topic,
                state.category,
                state.stages.writing!.data!,
                state.context
              );
            });
          },
          {
            maxRetries: 2,
            onRetry: (attempt) => {
              retryCount = attempt;
            },
          }
        );

        state.stages.seo = {
          status: "completed",
          data: seo,
          retries: retryCount,
          durationMs: Date.now() - startTime,
        };
        memoryOrchestrationStates.set(runId, state);
      }

      // 5. QA Stage
      if (state.stages.qa?.status !== "completed") {
        state.currentStage = "qa";
        state.stages.qa = { status: "running", retries: 0 };
        memoryOrchestrationStates.set(runId, state);

        const startTime = Date.now();
        let retryCount = 0;

        const qa = await executeWithRetry(
          async () => {
            return await aiCircuitBreaker.execute(async () => {
              return await QaAgent.execute(
                state.topic,
                state.stages.writing!.data!,
                state.stages.seo!.data!,
                state.stages.research!.data!,
                state.stages.strategy!.data!,
                state.context
              );
            });
          },
          {
            maxRetries: 2,
            onRetry: (attempt) => {
              retryCount = attempt;
            },
          }
        );

        state.stages.qa = {
          status: "completed",
          data: qa,
          retries: retryCount,
          durationMs: Date.now() - startTime,
        };
        memoryOrchestrationStates.set(runId, state);
      }

      // 6. Image Stage
      if (state.stages.image?.status !== "completed") {
        state.currentStage = "image";
        state.stages.image = { status: "running", retries: 0 };
        memoryOrchestrationStates.set(runId, state);

        const startTime = Date.now();
        let retryCount = 0;

        const image = await executeWithRetry(
          async () => {
            return await aiCircuitBreaker.execute(async () => {
              return await ImageAgent.execute(
                state.topic,
                state.category,
                state.stages.writing!.data!,
                state.context
              );
            });
          },
          {
            maxRetries: 2,
            onRetry: (attempt) => {
              retryCount = attempt;
            },
          }
        );

        state.stages.image = {
          status: "completed",
          data: image,
          retries: retryCount,
          durationMs: Date.now() - startTime,
        };
        memoryOrchestrationStates.set(runId, state);
      }

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
      state.stages.research = { status: "completed", data: research, retries: (state.stages.research?.retries || 0) + 1 };
    } else if (stage === "strategy" && state.stages.research?.data) {
      const strategy = await StrategistAgent.execute(state.topic, state.stages.research.data, state.audience, state.context);
      state.stages.strategy = { status: "completed", data: strategy, retries: (state.stages.strategy?.retries || 0) + 1 };
    } else if (stage === "writing" && state.stages.strategy?.data && state.stages.research?.data) {
      const writer = await WriterAgent.execute(
        state.topic,
        state.stages.strategy.data,
        state.stages.research.data,
        state.tone,
        state.targetWords,
        state.context
      );
      state.stages.writing = { status: "completed", data: writer, retries: (state.stages.writing?.retries || 0) + 1 };
    } else if (stage === "seo" && state.stages.writing?.data) {
      const seo = await SeoAgent.execute(state.topic, state.category, state.stages.writing.data, state.context);
      state.stages.seo = { status: "completed", data: seo, retries: (state.stages.seo?.retries || 0) + 1 };
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
      state.stages.qa = { status: "completed", data: qa, retries: (state.stages.qa?.retries || 0) + 1 };
    } else if (stage === "image" && state.stages.writing?.data) {
      const image = await ImageAgent.execute(state.topic, state.category, state.stages.writing.data, state.context);
      state.stages.image = { status: "completed", data: image, retries: (state.stages.image?.retries || 0) + 1 };
    }

    memoryOrchestrationStates.set(runId, state);
    return state;
  }
}

import { create } from "zustand";
import type { EngineHealth, EngineInfo, EngineRuntimeUpdatedEvent } from "../types";
import { ipc } from "../lib/ipc";

interface EngineState {
  engines: EngineInfo[];
  health: Record<string, EngineHealth>;
  healthLoading: Record<string, boolean>;
  loading: boolean;
  loadedOnce: boolean;
  error?: string;
  load: () => Promise<void>;
  ensureHealth: (
    engineId: string,
    options?: { force?: boolean },
  ) => Promise<EngineHealth | null>;
  mergeHealth: (reports: EngineHealth[]) => void;
  applyRuntimeUpdate: (event: EngineRuntimeUpdatedEvent) => void;
}

const MISTRAL_ONLY_ENGINES: EngineInfo[] = [
  {
    id: "mistral",
    name: "Mistral",
    capabilities: {
      permissionModes: [],
      sandboxModes: [],
      approvalDecisions: [],
    },
    models: [
      {
        id: "mistral-large",
        displayName: "Mistral Large",
        description: "",
        hidden: false,
        isDefault: true,
        inputModalities: ["text"],
        supportsPersonality: false,
        defaultReasoningEffort: "medium",
        supportedReasoningEfforts: [],
      },
    ],
  },
];

let pendingHealthRequests: Partial<Record<string, Promise<EngineHealth | null>>> = {};

export const useEngineStore = create<EngineState>((set, get) => ({
  engines: [],
  health: {
    mistral: {
      id: "mistral",
      available: true,
      warnings: [],
      checks: [],
      fixes: [],
    },
  },
  healthLoading: {},
  loading: false,
  loadedOnce: false,
  load: async () => {
    set({ loading: true, error: undefined });

    try {
      let engines: EngineInfo[] = await ipc.listEngines();

      const isInvalid =
        !Array.isArray(engines) ||
        engines.length === 0 ||
        !engines.every(
          (engine) =>
            engine.id === "mistral" &&
            Array.isArray(engine.models) &&
            engine.models.length > 0,
        );

      if (isInvalid) {
        engines = MISTRAL_ONLY_ENGINES;
      }

      engines = engines
        .filter((engine) => engine.id === "mistral")
        .map((engine: any) => ({
          ...engine,
          name: engine.name || "Mistral",
          capabilities: engine.capabilities ?? MISTRAL_ONLY_ENGINES[0].capabilities,
          models: Array.isArray(engine.models)
            ? engine.models
                .filter((model: any) => model.id === "mistral-large")
                .map((model: any) => ({
                  id: model.id,
                  displayName: model.displayName || "Mistral Large",
                  description: model.description ?? "",
                  hidden: model.hidden ?? false,
                  isDefault: true,
                  inputModalities: model.inputModalities ?? ["text"],
                  supportsPersonality: model.supportsPersonality ?? false,
                  defaultReasoningEffort: model.defaultReasoningEffort ?? "medium",
                  supportedReasoningEfforts: model.supportedReasoningEfforts ?? [],
                }))
            : [],
        }))
        .filter((engine) => engine.models.length > 0);

      if (engines.length === 0) {
        engines = MISTRAL_ONLY_ENGINES;
      }

      set({
        engines,
        loading: false,
        loadedOnce: true,
      });
    } catch (error) {
      console.error("Engine load failed:", error);
      set({
        engines: MISTRAL_ONLY_ENGINES,
        loading: false,
        loadedOnce: true,
      });
    }
  },
  ensureHealth: async (engineId, options) => {
    if (engineId !== "mistral") {
      return null;
    }

    const existing = get().health[engineId];
    if (existing && !options?.force) {
      return existing;
    }

    if (pendingHealthRequests[engineId]) {
      return pendingHealthRequests[engineId];
    }

    set((state) => {
      if (
        state.healthLoading[engineId] ||
        (!options?.force && state.health[engineId])
      ) {
        return state;
      }

      return {
        healthLoading: {
          ...state.healthLoading,
          [engineId]: true,
        },
      };
    });

    const request = (async () => {
      try {
        const health = await ipc.engineHealth(engineId);
        set((state) => {
          const { [engineId]: _ignored, ...rest } = state.healthLoading;
          return {
            health: {
              ...state.health,
              [health.id]: health,
            },
            healthLoading: rest,
          };
        });
        return health;
      } catch (error) {
        const message = String(error);
        set((state) => {
          const { [engineId]: _ignored, ...rest } = state.healthLoading;
          return {
            healthLoading: rest,
            error: `${engineId}: ${message}`,
          };
        });
        return null;
      } finally {
        delete pendingHealthRequests[engineId];
      }
    })();

    pendingHealthRequests[engineId] = request;
    return request;
  },
  mergeHealth: (reports) =>
    set((state) => {
      if (reports.length === 0) {
        return state;
      }

      const nextHealth = { ...state.health };
      const nextHealthLoading = { ...state.healthLoading };
      for (const report of reports) {
        if (report.id !== "mistral") {
          continue;
        }
        nextHealth[report.id] = report;
        delete nextHealthLoading[report.id];
      }

      return {
        health: nextHealth,
        healthLoading: nextHealthLoading,
      };
    }),
  applyRuntimeUpdate: ({ engineId, protocolDiagnostics }) =>
    set((state) => {
      if (engineId !== "mistral") {
        return state;
      }

      const current = state.health[engineId];
      const nextHealth: EngineHealth = current
        ? {
            ...current,
            available: true,
            details: current.available ? current.details : undefined,
            protocolDiagnostics: protocolDiagnostics ?? current.protocolDiagnostics,
          }
        : {
            id: engineId,
            available: true,
            warnings: [],
            checks: [],
            fixes: [],
            protocolDiagnostics,
          };

      const { [engineId]: _ignored, ...rest } = state.healthLoading;

      return {
        health: {
          ...state.health,
          [engineId]: nextHealth,
        },
        healthLoading: rest,
      };
    }),
}));

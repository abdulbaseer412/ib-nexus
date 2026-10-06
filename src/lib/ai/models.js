import { checkRemoteQwenHealth } from "./remote_qwen.js";
export { checkRemoteQwenHealth };


/**
 * AI Model Registry — Single source of truth for all available AI models across multiple providers.
 *
 * Each model entry contains:
 *   id           — Actual API model identifier (e.g. gpt-4o, gemini-3.6-flash, mixtral-8x7b-32768)
 *   displayName  — Human-readable model name
 *   description  — Short user-facing description
 *   capabilities — Array of capability tags (text, reasoning, code, math, analysis, image, files)
 *   enabled      — Whether this model is enabled in the system
 *   provider     — 'google', 'openai', or 'groq'
 *   tier         — 'free' | 'standard' | 'premium'
 *   maxTokens    — Maximum output tokens
 *   temperature  — Default temperature
 *   fallback     — The ID of a model to fall back to if this one fails (must be valid)
 */

export const AI_MODELS = [
  // ================= GOOGLE GEMINI =================
  {
    id: "gemini-3.6-flash",
    displayName: "Gemini 3.6 Flash",
    description: "Latest fast reasoning for everyday study assistance.",
    capabilities: ["text", "reasoning", "code", "math", "image", "files"],
    enabled: true,
    provider: "google",
    tier: "free",
    maxTokens: 8192,
    temperature: 0.7,
    isDefault: true,
  },
  {
    id: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    description: "Balanced price-performance model for general study tasks.",
    capabilities: ["text", "reasoning", "code", "math", "image", "files"],
    enabled: true,
    provider: "google",
    tier: "free",
    maxTokens: 8192,
    temperature: 0.7,
    isDefault: false,
    fallback: "gemini-3.6-flash",
  },
  {
    id: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    description: "Advanced reasoning for complex academic and coding tasks.",
    capabilities: ["text", "reasoning", "code", "math", "analysis", "image", "files"],
    enabled: true,
    provider: "google",
    tier: "premium",
    maxTokens: 8192,
    temperature: 0.7,
    isDefault: false,
    fallback: "gemini-3.6-flash",
  },

  // ================= OPENAI =================
  {
    id: "gpt-4o",
    displayName: "GPT-4o",
    description: "OpenAI's flagship model for advanced multi-step reasoning.",
    capabilities: ["text", "reasoning", "code", "math", "analysis", "image", "files"],
    enabled: true,
    provider: "openai",
    tier: "premium",
    maxTokens: 4096,
    temperature: 0.7,
    isDefault: false,
    fallback: "gpt-4o-mini",
  },
  {
    id: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    description: "Fast, intelligent, and efficient model for quick answers.",
    capabilities: ["text", "reasoning", "code", "math", "image", "files"],
    enabled: true,
    provider: "openai",
    tier: "free",
    maxTokens: 4096,
    temperature: 0.7,
    isDefault: false,
    fallback: "gemini-3.6-flash",
  },

  // ================= GROQ (LPU) =================
  {
    id: "openai/gpt-oss-120b",
    displayName: "GPT-OSS 120B",
    description: "High-capability reasoning model",
    capabilities: ["text", "reasoning", "code", "math", "analysis"],
    enabled: true,
    provider: "groq",
    tier: "free",
    maxTokens: 8192,
    temperature: 0.7,
    isDefault: false,
    fallback: "gemini-3.6-flash",
  },

  // ================= TOGETHER AI =================
  {
    id: "zai-org/GLM-5.3-Flash",
    displayName: "GLM-5.3-Flash",
    description: "Fast multimodal model for long-context academic work.",
    capabilities: ["text", "image", "long-context", "tool-calling", "json"],
    enabled: true,
    provider: "together",
    tier: "free",
    maxTokens: 4096,
    temperature: 0.7,
    isDefault: false,
    fallback: null,
  },
];

/**
 * Loads model configs from DB and merges with canonical static definitions
 */
export async function getMergedModelRegistry() {
  let dbConfigs = [];
  try {
    const { createAdminClient } = await import("../supabase/admin.js");
    const admin = createAdminClient();
    const { data } = await admin.from("ai_model_configs").select("*");

    if (data && Array.isArray(data)) {
      if (data.length === 0) {
        // Seed default config rows into ai_model_configs
        const rowsToInsert = AI_MODELS.map((m, idx) => ({
          model_id: m.id,
          display_name: m.displayName,
          description: m.description,
          provider: m.provider,
          enabled: m.enabled !== false,
          is_paused: false,
          is_hidden: false,
          is_default: m.isDefault || false,
          allowed_roles: "all",
          max_tokens: m.maxTokens || 4096,
          temperature: m.temperature || 0.7,
          fallback_model_id: m.fallback || "gemini-3.6-flash",
          sort_order: idx,
        }));
        await admin.from("ai_model_configs").upsert(rowsToInsert);
        const { data: fresh } = await admin.from("ai_model_configs").select("*");
        if (fresh && fresh.length > 0) {
          dbConfigs = fresh;
        }
      } else {
        dbConfigs = data;
      }
    }
  } catch (err) {
    console.warn("[getMergedModelRegistry] DB lookup error:", err?.message);
  }

  const configMap = new Map(dbConfigs.map((cfg) => [cfg.model_id, cfg]));

  // If DB configs exist, filter out models marked as deleted
  let baseModels = AI_MODELS;
  if (dbConfigs.length > 0) {
    const activeModelIds = new Set(
      dbConfigs.filter((cfg) => !cfg.is_deleted).map((cfg) => cfg.model_id)
    );
    baseModels = AI_MODELS.filter((m) => activeModelIds.has(m.id));
  }

  let hasExplicitDefault = false;
  const merged = baseModels.map((m, idx) => {
    const cfg = configMap.get(m.id);
    const isDefault = cfg ? cfg.is_default === true : m.isDefault === true;
    const isPaused = cfg ? cfg.is_paused === true : false;
    const isHidden = cfg ? cfg.is_hidden === true : false;
    const enabled = cfg ? cfg.enabled !== false : m.enabled;
    const allowedRoles = cfg?.allowed_roles || "all";
    const maxTokens = cfg?.max_tokens ? Number(cfg.max_tokens) : (m.maxTokens || 4096);
    const temperature = cfg?.temperature !== undefined && cfg?.temperature !== null ? Number(cfg.temperature) : (m.temperature || 0.7);
    const fallbackModelId = cfg?.fallback_model_id || m.fallback || "gemini-3.6-flash";

    const displayName = cfg?.display_name || m.displayName;
    const description = cfg?.description || m.description;
    const sortOrder = cfg?.sort_order !== undefined && cfg?.sort_order !== null ? Number(cfg.sort_order) : idx;

    if (isDefault && !isPaused && !isHidden && enabled) {
      hasExplicitDefault = true;
    }

    return {
      ...m,
      id: m.id,
      model_id: m.id,
      displayName,
      display_name: displayName,
      description,
      enabled,
      isPaused,
      is_paused: isPaused,
      isHidden,
      is_hidden: isHidden,
      isDefault,
      is_default: isDefault,
      allowedRoles,
      allowed_roles: allowedRoles,
      maxTokens,
      max_tokens: maxTokens,
      temperature,
      fallbackModelId,
      fallback_model_id: fallbackModelId,
      sortOrder,
      sort_order: sortOrder,
    };
  });

  if (!hasExplicitDefault && merged.length > 0) {
    const defaultCandidate =
      merged.find((m) => m.id === "gemini-3.6-flash" && !m.isPaused && !m.isHidden && m.enabled) ||
      merged.find((m) => !m.isPaused && !m.isHidden && m.enabled);
    if (defaultCandidate) {
      merged.forEach((m) => {
        m.isDefault = m.id === defaultCandidate.id;
        m.is_default = m.id === defaultCandidate.id;
      });
    }
  }

  merged.sort((a, b) => a.sortOrder - b.sortOrder);
  return merged;
}

/** Check if user's role satisfies model RBAC policy */
export function isRoleAllowedForModel(modelAllowedRoles, userRole = "student") {
  if (!modelAllowedRoles || modelAllowedRoles === "all") return true;
  if (userRole === "admin") return true; // Admins have root access to all models
  if (modelAllowedRoles === "admin" && userRole !== "admin") return false;
  if (modelAllowedRoles === "premium" && userRole !== "premium" && userRole !== "admin") return false;
  return true;
}

/**
 * Async resolution using DB overrides & RBAC rules
 */
export async function resolveModelForUserAsync(requestedId, userRole = "student") {
  const merged = await getMergedModelRegistry();

  if (requestedId) {
    const target = merged.find((m) => m.id === requestedId || m.model_id === requestedId);
    if (
      target &&
      target.enabled !== false &&
      !target.isHidden &&
      !target.is_hidden &&
      !target.isPaused &&
      !target.is_paused &&
      isRoleAllowedForModel(target.allowedRoles || target.allowed_roles, userRole) &&
      isProviderAvailable(target.provider)
    ) {
      return target;
    }
  }

  const defaultModel = merged.find(
    (m) =>
      (m.isDefault || m.is_default) &&
      m.enabled !== false &&
      !m.isHidden &&
      !m.is_hidden &&
      !m.isPaused &&
      !m.is_paused &&
      isRoleAllowedForModel(m.allowedRoles || m.allowed_roles, userRole) &&
      isProviderAvailable(m.provider)
  );

  if (defaultModel) return defaultModel;

  const fallback = merged.find(
    (m) =>
      m.enabled !== false &&
      !m.isHidden &&
      !m.is_hidden &&
      !m.isPaused &&
      !m.is_paused &&
      isRoleAllowedForModel(m.allowedRoles || m.allowed_roles, userRole) &&
      isProviderAvailable(m.provider)
  );

  return fallback || merged[0] || AI_MODELS[0];
}


export function getTrainingModelId() {
  return "gpt-4o-mini";
}

/** Get the default model */
export function getDefaultModel() {
  return AI_MODELS.find((m) => m.isDefault) || AI_MODELS[0];
}

/** Get a model by ID. Returns null if not found. */
export function getModelById(id) {
  return AI_MODELS.find((m) => m.id === id) || null;
}

/** Get all enabled models */
export function getEnabledModels() {
  return AI_MODELS.filter((m) => m.enabled);
}

/** Validate that a model ID exists and is enabled */
export function isModelAvailable(id) {
  const model = getModelById(id);
  return model ? model.enabled : false;
}

/** Check if API keys are available */
export function isProviderAvailable(provider) {
  if (provider === "google") return !!process.env.GEMINI_API_KEY;
  if (provider === "openai") return !!process.env.OPENAI_API_KEY;
  if (provider === "groq") {
    let key = process.env.GROQ_API_KEY;
    if (!key || key.trim() === "" || key.includes("your-groq-api-key")) {
      try {
        const fs = require("fs");
        const path = require("path");
        const envPath = path.join(process.cwd(), ".env.local");
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, "utf8");
          const match = envContent.match(/^GROQ_API_KEY=(.*)$/m);
          if (match && match[1]) key = match[1].trim().replace(/^["']|["']$/g, "");
        }
      } catch {}
    }
    return !!key && key.trim() !== "";
  }

  if (provider === "together") return true;
  if (provider === "remote_qwen") {
    const url = (process.env.OLLAMA_API_URL || process.env.REMOTE_QWEN_URL || "").trim();
    return !!url;
  }
  if (provider === "ollama") {
    if (process.env.NODE_ENV === "production") {
      const url = process.env.OLLAMA_API_URL || "";
      return !!url && !url.includes("localhost") && !url.includes("127.0.0.1");
    }
    return true;
  }
  return false;
}

/** Validate that a model ID is strictly available for normal users */
export function isModelAvailableForUser(id) {
  const model = getModelById(id);
  if (!model) return false;
  if (!model.enabled) return false;
  if (!model.freeTierEligible) return false;
  if (model.billingRequired) return false;
  return isProviderAvailable(model.provider);
}

/** Resolve model for user synchronously */
export function resolveModelForUser(requestedId) {
  if (requestedId && isModelAvailableForUser(requestedId)) {
    return getModelById(requestedId);
  }
  return getDefaultModel();
}

export function getClientModels() {
  return AI_MODELS
    .filter((model) => isModelAvailableForUser(model.id))
    .map(({ id, displayName, description, capabilities, enabled, tier, isDefault, provider }) => ({
      id,
      displayName,
      description,
      capabilities,
      enabled,
      tier,
      isDefault,
      provider,
      isAvailable: true,
    }));
}

/** Get client models with live health/availability status and DB admin settings applied */
export async function getClientModelsWithHealth() {
  const merged = await getMergedModelRegistry();

  // Filter out disabled or hidden models for normal users (PAUSED models remain listed, but marked isAvailable: false so they are locked)
  const userEligible = merged.filter(
    (m) => m.enabled !== false && !m.isHidden && !m.is_hidden
  );

  for (const model of userEligible) {
    const isPaused = !!(model.isPaused || model.is_paused);
    model.isAvailable = !isPaused && isProviderAvailable(model.provider);

    if (isPaused) {
      model.status = "Paused";
    } else if (model.provider === "remote_qwen") {
      const isHealthy = await checkRemoteQwenHealth();
      model.isAvailable = isHealthy;
      if (!isHealthy) {
        model.description = (model.description || "Local/private AI") + " (Temporarily offline)";
      }
    } else if (model.provider === "together") {
      const key = (process.env.TOGETHER_API_KEY || "").trim();
      const isMock = process.env.NODE_ENV !== "production" && process.env.TOGETHER_MOCK_MODE === "true";
      if (key && !key.includes("your-together-api-key") && key !== "REAL_KEY") {
        model.isAvailable = true;
        model.status = "Available";
      } else if (isMock) {
        model.isAvailable = true;
        model.status = "Mock Mode";
        model.description = "Fast multimodal model (Dev Mock Mode)";
      } else {
        model.isAvailable = false;
        model.status = "Not configured";
        model.description = "Together AI is not configured yet.";
      }
    }
  }

  return userEligible.map(({ id, displayName, description, capabilities, enabled, tier, isDefault, provider, isAvailable, isPaused, is_paused, status }) => ({
    id,
    displayName,
    description,
    capabilities,
    enabled,
    tier,
    isDefault: isDefault && !isPaused && !is_paused,
    provider,
    isAvailable,
    isPaused: !!(isPaused || is_paused),
    is_paused: !!(isPaused || is_paused),
    status: (isPaused || is_paused) ? "Paused" : (status || "Available"),
  }));
}


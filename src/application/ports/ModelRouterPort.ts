import { AuthContext } from '../../domain/auth/AuthContext.js';

export interface ModelInfo {
  id: string;
  providerId: string;
  providerName: string;
  modelId: string;
  name: string;
  modalities: {
    input: string[];
    output: string[];
  };
  capabilities: {
    reasoning: boolean;
    toolCall: boolean;
    attachments: boolean;
  };
  cost: {
    type: 'free' | 'paid';
    input?: number;
    output?: number;
    currency?: string;
  };
  limits: {
    context: number;
    output: number;
  };
  knowledge?: string;
}

export interface ModelSelectionCriteria {
  requiredModalities?: {
    input?: string[];
    output?: string[];
  };
  requiredCapabilities?: {
    reasoning?: boolean;
    toolCall?: boolean;
    attachments?: boolean;
  };
  preferFree?: boolean;
  maxCost?: number;
  minContextSize?: number;
}

export interface ModelRouterPort {
  /**
   * Lista modelos permitidos para um contexto
   */
  listAllowedModels(ctx: AuthContext): Promise<ModelInfo[]>;

  /**
   * Seleciona o melhor modelo baseado em critérios
   */
  selectModel(ctx: AuthContext, criteria: ModelSelectionCriteria): Promise<ModelInfo | null>;

  /**
   * Verifica se um modelo é permitido para o contexto
   */
  isModelAllowed(ctx: AuthContext, modelId: string): Promise<boolean>;

  /**
   * Busca informações de um modelo
   */
  getModelInfo(modelId: string): Promise<ModelInfo | null>;

  /**
   * Lista todos os modelos disponíveis
   */
  listAllModels(): Promise<ModelInfo[]>;

  /**
   * Verifica compatibilidade de um modelo com requisitos
   */
  checkCompatibility(model: ModelInfo, criteria: ModelSelectionCriteria): boolean;

  /**
   * Retorna fallback models se o modelo preferido não estiver disponível
   */
  getFallbackModels(ctx: AuthContext, preferredModelId: string): Promise<ModelInfo[]>;
}

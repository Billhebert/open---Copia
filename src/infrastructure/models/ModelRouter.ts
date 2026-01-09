import { promises as fs } from 'fs';
import { AuthContext } from '../../domain/auth/AuthContext.js';
import { ModelRouterPort, ModelInfo, ModelSelectionCriteria } from '../../application/ports/ModelRouterPort.js';
import { PrismaClient } from '@prisma/client';

export class ModelRouter implements ModelRouterPort {
  private models: ModelInfo[] = [];

  constructor(private prisma: PrismaClient, private modelsFilePath: string) {}

  async initialize(): Promise<void> {
    // Carrega modelos do arquivo JSON
    const content = await fs.readFile(this.modelsFilePath, 'utf-8');
    const modelsData = JSON.parse(content);

    this.models = [];
    for (const [providerId, providerData] of Object.entries<any>(modelsData)) {
      const models = providerData.models || {};

      for (const [modelId, model] of Object.entries<any>(models)) {
        const modalities = model.modalities || { input: ['text'], output: ['text'] };
        const isFree = modelId.toLowerCase().includes('free') || 
                       (model.cost?.input === 0 && model.cost?.output === 0);

        this.models.push({
          id: `${providerId}/${modelId}`,
          providerId,
          providerName: providerData.name || providerId,
          modelId,
          name: model.name || modelId,
          modalities: {
            input: modalities.input || ['text'],
            output: modalities.output || ['text'],
          },
          capabilities: {
            reasoning: model.reasoning === true,
            toolCall: model.tool_call === true,
            attachments: model.attachment || false,
          },
          cost: isFree
            ? { type: 'free' }
            : {
                type: 'paid',
                input: model.cost?.input || 0,
                output: model.cost?.output || 0,
                currency: 'USD',
              },
          limits: {
            context: model.limit?.context || 32768,
            output: model.limit?.output || 4096,
          },
          knowledge: model.knowledge || 'Unknown',
        });
      }
    }
  }

  async listAllowedModels(ctx: AuthContext): Promise<ModelInfo[]> {
    // Busca políticas de modelo para o contexto
    const policies = await this.prisma.modelPolicy.findMany({
      where: {
        tenantId: ctx.tenantId,
        enabled: true,
      },
      orderBy: { priority: 'desc' },
    });

    // Se não há políticas, retorna todos os modelos
    if (policies.length === 0) {
      return this.models;
    }

    // Filtra modelos baseado nas políticas
    let hasWildcard = false;
    const allowedModelIds = new Set<string>();

    for (const policy of policies) {
      const scope = policy.scope as any;

      // Verifica se a policy se aplica ao contexto
      if (this.matchesScope(ctx, scope)) {
        for (const modelId of policy.allowedModels) {
          if (modelId === '*') {
            hasWildcard = true;
            break;
          }
          allowedModelIds.add(modelId);
        }
      }
      if (hasWildcard) break;
    }

    // Se há wildcard, retorna todos os modelos
    if (hasWildcard) {
      return this.models;
    }

    return this.models.filter(m => allowedModelIds.has(m.id));
  }

  async selectModel(ctx: AuthContext, criteria: ModelSelectionCriteria): Promise<ModelInfo | null> {
    const allowedModels = await this.listAllowedModels(ctx);

    // Filtra por critérios
    let candidates = allowedModels.filter(model => this.checkCompatibility(model, criteria));

    if (candidates.length === 0) {
      return null;
    }

    // Ordena por preferência
    candidates.sort((a, b) => {
      // Prefere free se especificado
      if (criteria.preferFree) {
        if (a.cost.type === 'free' && b.cost.type !== 'free') return -1;
        if (a.cost.type !== 'free' && b.cost.type === 'free') return 1;
      }

      // Prefere maior contexto
      return b.limits.context - a.limits.context;
    });

    return candidates[0] || null;
  }

  async isModelAllowed(ctx: AuthContext, modelId: string): Promise<boolean> {
    const allowedModels = await this.listAllowedModels(ctx);
    return allowedModels.some(m => m.id === modelId);
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    return this.models.find(m => m.id === modelId) || null;
  }

  async listAllModels(): Promise<ModelInfo[]> {
    return this.models;
  }

  checkCompatibility(model: ModelInfo, criteria: ModelSelectionCriteria): boolean {
    // Verifica modalidades
    if (criteria.requiredModalities?.input) {
      if (!criteria.requiredModalities.input.every(m => model.modalities.input.includes(m))) {
        return false;
      }
    }

    if (criteria.requiredModalities?.output) {
      if (!criteria.requiredModalities.output.every(m => model.modalities.output.includes(m))) {
        return false;
      }
    }

    // Verifica capabilities
    if (criteria.requiredCapabilities?.reasoning && !model.capabilities.reasoning) {
      return false;
    }

    if (criteria.requiredCapabilities?.toolCall && !model.capabilities.toolCall) {
      return false;
    }

    if (criteria.requiredCapabilities?.attachments && !model.capabilities.attachments) {
      return false;
    }

    // Verifica custo
    if (criteria.maxCost !== undefined && model.cost.type === 'paid') {
      const avgCost = ((model.cost.input || 0) + (model.cost.output || 0)) / 2;
      if (avgCost > criteria.maxCost) {
        return false;
      }
    }

    // Verifica tamanho de contexto
    if (criteria.minContextSize && model.limits.context < criteria.minContextSize) {
      return false;
    }

    return true;
  }

  async getFallbackModels(ctx: AuthContext, preferredModelId: string): Promise<ModelInfo[]> {
    const preferred = await this.getModelInfo(preferredModelId);
    if (!preferred) {
      return [];
    }

    // Busca modelos similares
    const allowedModels = await this.listAllowedModels(ctx);
    return allowedModels
      .filter(m => m.id !== preferredModelId)
      .filter(m => {
        // Mesmas capabilities
        return (
          m.capabilities.reasoning === preferred.capabilities.reasoning &&
          m.capabilities.toolCall === preferred.capabilities.toolCall
        );
      })
      .sort((a, b) => {
        // Ordena por similaridade
        if (a.cost.type === preferred.cost.type && b.cost.type !== preferred.cost.type) return -1;
        if (a.cost.type !== preferred.cost.type && b.cost.type === preferred.cost.type) return 1;
        return b.limits.context - a.limits.context;
      })
      .slice(0, 3);
  }

  private matchesScope(ctx: AuthContext, scope: any): boolean {
    if (scope.roles && scope.roles.length > 0) {
      if (!scope.roles.some((role: string) => ctx.roles.includes(role))) {
        return false;
      }
    }

    if (scope.tags && scope.tags.length > 0) {
      if (!scope.tags.some((tag: string) => ctx.tags.includes(tag))) {
        return false;
      }
    }

    if (scope.departments && scope.departments.length > 0) {
      if (!ctx.department || !scope.departments.includes(ctx.department)) {
        return false;
      }
    }

    return true;
  }
}

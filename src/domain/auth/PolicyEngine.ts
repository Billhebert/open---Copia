import { AuthContext } from './AuthContext.js';

export interface Policy {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: PolicyType;
  scope: PolicyScope;
  rules: PolicyRules;
  priority: number;
  enabled: boolean;
}

export type PolicyType = 'chat' | 'model' | 'tool' | 'rag' | 'plugin';

export interface PolicyScope {
  roles?: string[];
  tags?: string[];
  departments?: string[];
  subdepartments?: string[];
  userIds?: string[];
}

export interface PolicyRules {
  // Para type: 'chat'
  maxMembers?: number;
  allowPrivateMessages?: boolean;

  // Para type: 'model'
  allowedModels?: string[];
  blockedModels?: string[];
  maxTokens?: number;

  // Para type: 'tool'
  allowedTools?: string[];
  blockedTools?: string[];
  requireApproval?: boolean;
  approverRoles?: string[];

  // Para type: 'rag'
  allowedDepartments?: string[];
  allowedTags?: string[];
  maxResults?: number;

  // Para type: 'plugin'
  allowedPlugins?: string[];
  blockedPlugins?: string[];

  // Genérico
  [key: string]: any;
}

export class PolicyEngine {
  private policies: Policy[];

  constructor(policies: Policy[]) {
    this.policies = policies.filter(p => p.enabled).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Verifica se um AuthContext satisfaz o scope de uma policy
   */
  private matchesScope(ctx: AuthContext, scope: PolicyScope): boolean {
    if (scope.userIds && scope.userIds.length > 0) {
      if (!ctx.userId || !scope.userIds.includes(ctx.userId)) {
        return false;
      }
    }

    if (scope.roles && scope.roles.length > 0) {
      if (!scope.roles.some(role => ctx.roles.includes(role))) {
        return false;
      }
    }

    if (scope.tags && scope.tags.length > 0) {
      if (!scope.tags.some(tag => ctx.tags.includes(tag))) {
        return false;
      }
    }

    if (scope.departments && scope.departments.length > 0) {
      if (!ctx.department || !scope.departments.includes(ctx.department)) {
        return false;
      }
    }

    if (scope.subdepartments && scope.subdepartments.length > 0) {
      if (!ctx.subdepartment || !scope.subdepartments.includes(ctx.subdepartment)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Retorna todas as policies de um tipo que se aplicam ao contexto
   */
  getPoliciesForContext(ctx: AuthContext, type: PolicyType): Policy[] {
    return this.policies
      .filter(p => p.type === type && p.tenantId === ctx.tenantId)
      .filter(p => this.matchesScope(ctx, p.scope));
  }

  /**
   * Verifica se uma ação é permitida pelo conjunto de policies
   */
  isAllowed(ctx: AuthContext, type: PolicyType, action: string, resource?: any): boolean {
    const policies = this.getPoliciesForContext(ctx, type);

    if (policies.length === 0) {
      // Sem policies = permitido por padrão (ou você pode inverter isso)
      return true;
    }

    // Aplica a primeira policy que bater (ordem de prioridade)
    for (const policy of policies) {
      const result = this.evaluatePolicy(policy, action, resource);
      if (result !== undefined) {
        return result;
      }
    }

    // Se nenhuma policy decidiu, nega por padrão
    return false;
  }

  /**
   * Avalia uma policy específica para uma ação
   */
  private evaluatePolicy(policy: Policy, action: string, resource?: any): boolean | undefined {
    const { rules } = policy;

    switch (policy.type) {
      case 'model':
        return this.evaluateModelPolicy(rules, action, resource);
      case 'tool':
        return this.evaluateToolPolicy(rules, action, resource);
      case 'rag':
        return this.evaluateRagPolicy(rules, action, resource);
      case 'plugin':
        return this.evaluatePluginPolicy(rules, action, resource);
      case 'chat':
        return this.evaluateChatPolicy(rules, action, resource);
      default:
        return undefined;
    }
  }

  private evaluateModelPolicy(rules: PolicyRules, action: string, resource?: any): boolean | undefined {
    if (action === 'use' && resource?.modelId) {
      const modelId = resource.modelId as string;

      if (rules.blockedModels?.includes(modelId)) {
        return false;
      }

      if (rules.allowedModels && rules.allowedModels.length > 0) {
        return rules.allowedModels.includes(modelId);
      }
    }

    return undefined;
  }

  private evaluateToolPolicy(rules: PolicyRules, action: string, resource?: any): boolean | undefined {
    if (action === 'execute' && resource?.toolName) {
      const toolName = resource.toolName as string;

      if (rules.blockedTools?.includes(toolName)) {
        return false;
      }

      if (rules.allowedTools && rules.allowedTools.length > 0) {
        return rules.allowedTools.includes(toolName);
      }
    }

    return undefined;
  }

  private evaluateRagPolicy(rules: PolicyRules, action: string, resource?: any): boolean | undefined {
    if (action === 'search') {
      // Políticas de RAG são geralmente permissivas, apenas limitando escopo
      return true;
    }

    return undefined;
  }

  private evaluatePluginPolicy(rules: PolicyRules, action: string, resource?: any): boolean | undefined {
    if (action === 'use' && resource?.pluginId) {
      const pluginId = resource.pluginId as string;

      if (rules.blockedPlugins?.includes(pluginId)) {
        return false;
      }

      if (rules.allowedPlugins && rules.allowedPlugins.length > 0) {
        return rules.allowedPlugins.includes(pluginId);
      }
    }

    return undefined;
  }

  private evaluateChatPolicy(rules: PolicyRules, action: string, resource?: any): boolean | undefined {
    if (action === 'create') {
      // Sempre permite criar chat (a menos que explicitamente bloqueado)
      return true;
    }

    if (action === 'list' || action === 'get') {
      // Permite listar e ver chats
      return true;
    }

    if (action === 'addMember' && resource?.memberCount !== undefined) {
      if (rules.maxMembers && resource.memberCount >= rules.maxMembers) {
        return false;
      }
    }

    if (action === 'sendPrivateMessage') {
      return rules.allowPrivateMessages ?? true;
    }

    return undefined;
  }

  /**
   * Verifica se uma tool precisa de aprovação
   */
  requiresApproval(ctx: AuthContext, toolName: string, riskLevel: string): boolean {
    const policies = this.getPoliciesForContext(ctx, 'tool');

    // Se há uma policy que exige aprovação, retorna true
    for (const policy of policies) {
      if (policy.rules.requireApproval) {
        return true;
      }
    }

    // High-risk tools sempre precisam de aprovação
    if (riskLevel === 'high') {
      return true;
    }

    return false;
  }

  /**
   * Retorna os roles que podem aprovar uma tool
   */
  getApproverRoles(ctx: AuthContext, toolName: string): string[] {
    const policies = this.getPoliciesForContext(ctx, 'tool');

    const approverRoles = new Set<string>();
    for (const policy of policies) {
      if (policy.rules.approverRoles) {
        policy.rules.approverRoles.forEach(role => approverRoles.add(role));
      }
    }

    // Fallback: chat owner ou dept_admin
    if (approverRoles.size === 0) {
      approverRoles.add('chat_owner');
      approverRoles.add('dept_admin');
      approverRoles.add('tenant_admin');
    }

    return Array.from(approverRoles);
  }
}

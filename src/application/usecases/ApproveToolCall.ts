import { AuthContext } from '../../domain/auth/AuthContext.js';
import { ToolCall, ToolCallManager } from '../../domain/plugins/ToolCall.js';
import { PolicyEngine } from '../../domain/auth/PolicyEngine.js';
import { ChatPermissions } from '../../domain/chat/ChatPermissions.js';
import { ChatRepoPort } from '../ports/ChatRepoPort.js';
import { ToolRuntimePort } from '../ports/ToolRuntimePort.js';
import { PluginRegistryPort } from '../ports/PluginRegistryPort.js';
import { AuditPort } from '../ports/AuditPort.js';

export interface ApproveToolCallInput {
  toolCallId: string;
  decision: 'approved' | 'rejected';
  reason?: string;
}

export interface ApproveToolCallOutput {
  toolCall: ToolCall;
  executed?: boolean;
  result?: any;
}

export class ApproveToolCall {
  constructor(
    private chatRepo: ChatRepoPort,
    private pluginRegistry: PluginRegistryPort,
    private toolRuntime: ToolRuntimePort,
    private auditPort: AuditPort,
    private policyEngine: PolicyEngine,
    private toolCallRepo: any // TODO: criar ToolCallRepoPort
  ) {}

  async execute(ctx: AuthContext, input: ApproveToolCallInput): Promise<ApproveToolCallOutput> {
    if (!ctx.userId) {
      throw new Error('User must be authenticated');
    }

    // 1. Busca o tool call
    const toolCall = await this.toolCallRepo.findById(input.toolCallId);
    if (!toolCall) {
      throw new Error('ToolCall not found');
    }

    if (toolCall.status !== 'pending_approval') {
      throw new Error('ToolCall is not pending approval');
    }

    // 2. Busca o chat e verifica permissões
    const chat = await this.chatRepo.findChatById(toolCall.chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    const members = await this.chatRepo.listMembers(toolCall.chatId);
    const canApprove = ChatPermissions.canApproveTools(chat, members, ctx);
    if (!canApprove) {
      throw new Error('User does not have permission to approve tools');
    }

    // 3. Verifica se o usuário tem o role necessário para aprovar
    const approverRoles = this.policyEngine.getApproverRoles(ctx, toolCall.toolName);
    const hasRequiredRole = approverRoles.some(role => ctx.roles.includes(role));
    if (!hasRequiredRole) {
      throw new Error('User does not have required role to approve this tool');
    }

    // 4. Atualiza o tool call
    let updatedToolCall: ToolCall;
    if (input.decision === 'approved') {
      updatedToolCall = ToolCallManager.approve(toolCall, ctx.userId);
    } else {
      updatedToolCall = ToolCallManager.reject(toolCall);
    }

    await this.toolCallRepo.update(input.toolCallId, updatedToolCall);

    // 5. Registra a aprovação/rejeição
    await this.toolCallRepo.createApproval({
      toolCallId: input.toolCallId,
      approverId: ctx.userId,
      decision: input.decision,
      reason: input.reason,
    });

    // 6. Auditoria
    await this.auditPort.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: `tool.${input.decision}`,
      resource: input.toolCallId,
      resourceType: 'tool_call',
      details: {
        toolName: toolCall.toolName,
        pluginId: toolCall.pluginId,
        reason: input.reason,
      },
    });

    // 7. Se aprovado, executa
    let executed = false;
    let result: any;

    if (input.decision === 'approved') {
      try {
        const plugin = await this.pluginRegistry.findById(toolCall.pluginId);
        if (!plugin) {
          throw new Error('Plugin not found');
        }

        result = await this.toolRuntime.execute(
          plugin,
          toolCall.toolName,
          toolCall.arguments
        );

        updatedToolCall = ToolCallManager.markExecuted(updatedToolCall, result);
        await this.toolCallRepo.update(input.toolCallId, updatedToolCall);

        executed = true;

        // Auditoria da execução
        await this.auditPort.log({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'tool.executed',
          resource: input.toolCallId,
          resourceType: 'tool_call',
          details: {
            toolName: toolCall.toolName,
            success: true,
          },
        });
      } catch (error: any) {
        updatedToolCall = ToolCallManager.markFailed(updatedToolCall, error.message);
        await this.toolCallRepo.update(input.toolCallId, updatedToolCall);

        // Auditoria da falha
        await this.auditPort.log({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'tool.failed',
          resource: input.toolCallId,
          resourceType: 'tool_call',
          details: {
            toolName: toolCall.toolName,
            error: error.message,
          },
        });
      }
    }

    return {
      toolCall: updatedToolCall,
      executed,
      result,
    };
  }
}

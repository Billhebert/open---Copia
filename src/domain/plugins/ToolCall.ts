export interface ToolCall {
  id: string;
  chatId: string;
  messageId?: string;
  pluginId: string;
  toolName: string;
  arguments: Record<string, any>;
  status: ToolCallStatus;
  result?: any;
  error?: string;
  requestedBy: string;
  approvedBy?: string;
  executedAt?: Date;
  createdAt: Date;
}

export type ToolCallStatus =
  | 'pending'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed';

export interface ToolCallApproval {
  id: string;
  toolCallId: string;
  approverId: string;
  decision: 'approved' | 'rejected';
  reason?: string;
  createdAt: Date;
}

export class ToolCallBuilder {
  private toolCall: Partial<ToolCall>;

  constructor(
    chatId: string,
    pluginId: string,
    toolName: string,
    args: Record<string, any>,
    requestedBy: string
  ) {
    this.toolCall = {
      chatId,
      pluginId,
      toolName,
      arguments: args,
      requestedBy,
      status: 'pending',
    };
  }

  withMessage(messageId: string): this {
    this.toolCall.messageId = messageId;
    return this;
  }

  requireApproval(): this {
    this.toolCall.status = 'pending_approval';
    return this;
  }

  build(): Omit<ToolCall, 'id' | 'createdAt'> {
    return this.toolCall as Omit<ToolCall, 'id' | 'createdAt'>;
  }
}

export class ToolCallManager {
  /**
   * Verifica se um tool call pode ser aprovado por um usuário
   */
  static canApprove(toolCall: ToolCall, userId: string, userRoles: string[], approverRoles: string[]): boolean {
    // Não pode aprovar o próprio request
    if (toolCall.requestedBy === userId) {
      return false;
    }

    // Precisa ter um dos roles de aprovador
    return approverRoles.some(role => userRoles.includes(role));
  }

  /**
   * Aprova um tool call
   */
  static approve(toolCall: ToolCall, approverId: string): ToolCall {
    if (toolCall.status !== 'pending_approval') {
      throw new Error('ToolCall is not pending approval');
    }

    return {
      ...toolCall,
      status: 'approved',
      approvedBy: approverId,
    };
  }

  /**
   * Rejeita um tool call
   */
  static reject(toolCall: ToolCall): ToolCall {
    if (toolCall.status !== 'pending_approval') {
      throw new Error('ToolCall is not pending approval');
    }

    return {
      ...toolCall,
      status: 'rejected',
    };
  }

  /**
   * Marca um tool call como executado
   */
  static markExecuted(toolCall: ToolCall, result: any): ToolCall {
    if (toolCall.status !== 'approved' && toolCall.status !== 'pending') {
      throw new Error('ToolCall is not ready for execution');
    }

    return {
      ...toolCall,
      status: 'executed',
      result,
      executedAt: new Date(),
    };
  }

  /**
   * Marca um tool call como falho
   */
  static markFailed(toolCall: ToolCall, error: string): ToolCall {
    return {
      ...toolCall,
      status: 'failed',
      error,
      executedAt: new Date(),
    };
  }
}

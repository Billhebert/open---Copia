export interface OpencodeAdapterPort {
  generateResponse(params: {
    modelId?: string;
    prompt: string;
    systemPrompt?: string;
    sessionId?: string;
    chatId?: string;
    useRag?: boolean;
  }): Promise<{
    content: string;
    reasoning?: string;
    modelId: string;
    providerId: string;
    tokens: number;
    cost: number;
  }>;
}

import { Agent } from '../../domain/agents/Agent.js';
import { SupportAgent } from './SupportAgent.js';
import { CodeAgent } from './CodeAgent.js';
import { OpencodeAdapterPort } from '../../application/ports/OpencodeAdapterPort.js';
import { RagPort } from '../../application/ports/RagPort.js';

/**
 * AgentRegistry - Registro central de todos os agentes disponíveis
 */
export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private defaultAgentId?: string;

  constructor(
    private opencodeAdapter: OpencodeAdapterPort,
    private ragPort: RagPort
  ) {
    this.registerDefaultAgents();
  }

  private registerDefaultAgents() {
    // Registra agentes padrão
    const supportAgent = new SupportAgent(this.opencodeAdapter, this.ragPort);
    const codeAgent = new CodeAgent(this.opencodeAdapter);

    this.register(supportAgent);
    this.register(codeAgent);

    // Define Support Agent como padrão
    this.defaultAgentId = 'support_agent';
  }

  register(agent: Agent) {
    this.agents.set(agent.config.id, agent);
  }

  unregister(agentId: string) {
    this.agents.delete(agentId);
  }

  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  getDefault(): Agent | undefined {
    return this.defaultAgentId ? this.get(this.defaultAgentId) : undefined;
  }

  setDefault(agentId: string) {
    if (this.agents.has(agentId)) {
      this.defaultAgentId = agentId;
    }
  }

  getAllByType(type: string): Agent[] {
    return this.getAll().filter(agent => agent.config.type === type);
  }

  /**
   * Seleciona o melhor agente para a mensagem
   */
  selectAgentForMessage(message: string): Agent {
    // Tenta encontrar um agente que possa processar a mensagem
    for (const agent of this.getAll()) {
      if (agent.canProcess(message)) {
        return agent;
      }
    }

    // Retorna o agente padrão se nenhum específico for encontrado
    return this.getDefault() || this.getAll()[0];
  }

  /**
   * Filtra agentes baseado em permissões do tenant/user
   */
  getAvailableAgents(tenantId: string, userId?: string): Agent[] {
    // TODO: Implementar filtragem baseada em políticas/permissões
    // Por enquanto, retorna todos
    return this.getAll();
  }
}

import { Skill } from '../../domain/skills/Skill.js';
import { SummarizeSkill } from './SummarizeSkill.js';
import { TranslateSkill } from './TranslateSkill.js';
import { OpencodeAdapterPort } from '../../application/ports/OpencodeAdapterPort.js';

/**
 * SkillRegistry - Registro central de todas as skills disponíveis
 */
export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();

  constructor(private opencodeAdapter: OpencodeAdapterPort) {
    this.registerDefaultSkills();
  }

  private registerDefaultSkills() {
    // Registra skills padrão
    this.register(new SummarizeSkill(this.opencodeAdapter));
    this.register(new TranslateSkill(this.opencodeAdapter));
  }

  register(skill: Skill) {
    this.skills.set(skill.config.id, skill);
  }

  unregister(skillId: string) {
    this.skills.delete(skillId);
  }

  get(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  getAllByCategory(category: string): Skill[] {
    return this.getAll().filter(skill => skill.config.category === category);
  }

  getAllByTag(tag: string): Skill[] {
    return this.getAll().filter(skill => skill.config.tags?.includes(tag));
  }

  /**
   * Busca skills por nome ou descrição
   */
  search(query: string): Skill[] {
    const queryLower = query.toLowerCase();
    return this.getAll().filter(skill =>
      skill.config.name.toLowerCase().includes(queryLower) ||
      skill.config.description.toLowerCase().includes(queryLower) ||
      skill.config.tags?.some(tag => tag.toLowerCase().includes(queryLower))
    );
  }

  /**
   * Filtra skills baseado em permissões do tenant/user
   */
  getAvailableSkills(tenantId: string, userId?: string): Skill[] {
    // TODO: Implementar filtragem baseada em políticas/permissões
    // Por enquanto, retorna todas
    return this.getAll();
  }

  /**
   * Retorna um mapa de prompts para todas as skills
   */
  getPromptTemplates(): Record<string, string> {
    const templates: Record<string, string> = {};
    for (const skill of this.getAll()) {
      templates[skill.config.id] = skill.getPromptTemplate();
    }
    return templates;
  }
}

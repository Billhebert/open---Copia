/**
 * Skill - Habilidade reutilizável
 *
 * Baseado em: https://opencode.ai/docs/skills/
 */

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
}

export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  parameters?: SkillParameter[];
  examples?: string[];
  relatedSkills?: string[];
}

export interface SkillContext {
  tenantId: string;
  userId?: string;
  variables?: Record<string, any>;
}

export interface SkillResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export abstract class Skill {
  abstract config: SkillConfig;

  /**
   * Executa a skill
   */
  abstract execute(
    context: SkillContext,
    parameters: Record<string, any>
  ): Promise<SkillResult>;

  /**
   * Retorna o prompt template para esta skill
   */
  getPromptTemplate(): string {
    let template = this.config.description;

    if (this.config.parameters && this.config.parameters.length > 0) {
      template += '\n\nParameters:';
      for (const param of this.config.parameters) {
        template += `\n- ${param.name} (${param.type}${param.required ? ', required' : ''}): ${param.description}`;
      }
    }

    if (this.config.examples && this.config.examples.length > 0) {
      template += '\n\nExamples:';
      for (const example of this.config.examples) {
        template += `\n- ${example}`;
      }
    }

    return template;
  }

  /**
   * Valida os parâmetros
   */
  validateParameters(parameters: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.parameters) {
      return { valid: true, errors: [] };
    }

    for (const param of this.config.parameters) {
      const value = parameters[param.name];

      if (param.required && (value === undefined || value === null)) {
        errors.push(`Parameter '${param.name}' is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== param.type) {
          errors.push(`Parameter '${param.name}' must be of type ${param.type}, got ${actualType}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

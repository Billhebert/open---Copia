import { Skill, SkillConfig, SkillContext, SkillResult } from '../../domain/skills/Skill.js';
import { OpencodeAdapterPort } from '../../application/ports/OpencodeAdapterPort.js';

/**
 * TranslateSkill - Traduz textos entre idiomas
 */
export class TranslateSkill extends Skill {
  config: SkillConfig = {
    id: 'translate',
    name: 'Translate Text',
    description: 'Translates text from one language to another while preserving meaning and context.',
    category: 'text_processing',
    tags: ['nlp', 'translation', 'language'],
    parameters: [
      {
        name: 'text',
        type: 'string',
        description: 'The text to translate',
        required: true,
      },
      {
        name: 'target_language',
        type: 'string',
        description: 'Target language (e.g., English, Spanish, Portuguese, French)',
        required: true,
      },
      {
        name: 'source_language',
        type: 'string',
        description: 'Source language (optional, auto-detect if not provided)',
        required: false,
      },
      {
        name: 'formal',
        type: 'boolean',
        description: 'Use formal language',
        required: false,
        default: false,
      },
    ],
    examples: [
      'Translate this to Portuguese',
      'Convert this text to Spanish',
      'What does this mean in English?',
    ],
    relatedSkills: ['summarize', 'detect_language'],
  };

  constructor(private opencodeAdapter: OpencodeAdapterPort) {
    super();
  }

  async execute(
    context: SkillContext,
    parameters: Record<string, any>
  ): Promise<SkillResult> {
    const validation = this.validateParameters(parameters);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    try {
      const text = parameters.text as string;
      const targetLanguage = parameters.target_language as string;
      const sourceLanguage = parameters.source_language as string | undefined;
      const formal = parameters.formal as boolean || false;

      const formalityNote = formal ? ' Use formal language.' : '';
      const sourceNote = sourceLanguage ? ` from ${sourceLanguage}` : '';

      const prompt = `Translate the following text${sourceNote} to ${targetLanguage}.${formalityNote} Preserve the original meaning and context.

Text to translate:
${text}

Translation:`;

      const response = await this.opencodeAdapter.generateResponse({
        modelId: 'opencode/minimax-m2.1-free',
        prompt,
      });

      return {
        success: true,
        data: {
          translation: response.content,
          sourceLanguage: sourceLanguage || 'auto-detected',
          targetLanguage,
        },
        metadata: {
          formal,
          model: 'opencode/minimax-m2.1-free',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

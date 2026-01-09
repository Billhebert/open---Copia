import { Skill, SkillConfig, SkillContext, SkillResult } from '../../domain/skills/Skill.js';
import { OpencodeAdapterPort } from '../../application/ports/OpencodeAdapterPort.js';

/**
 * SummarizeSkill - Resume textos longos
 */
export class SummarizeSkill extends Skill {
  config: SkillConfig = {
    id: 'summarize',
    name: 'Summarize Text',
    description: 'Summarizes long texts into concise summaries while maintaining key information and context.',
    category: 'text_processing',
    tags: ['nlp', 'summary', 'text'],
    parameters: [
      {
        name: 'text',
        type: 'string',
        description: 'The text to summarize',
        required: true,
      },
      {
        name: 'length',
        type: 'string',
        description: 'Desired summary length: short, medium, or long',
        required: false,
        default: 'medium',
      },
      {
        name: 'style',
        type: 'string',
        description: 'Summary style: bullet_points, paragraph, or key_points',
        required: false,
        default: 'paragraph',
      },
    ],
    examples: [
      'Summarize this article in bullet points',
      'Give me a short summary of this document',
      'What are the key points of this text?',
    ],
    relatedSkills: ['extract_keywords', 'translate'],
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
      const length = (parameters.length as string) || 'medium';
      const style = (parameters.style as string) || 'paragraph';

      // Define o tamanho do resumo
      const lengthInstructions: Record<string, string> = {
        short: 'in 2-3 sentences',
        medium: 'in 1-2 paragraphs',
        long: 'in 3-4 paragraphs',
      };

      // Define o estilo do resumo
      const styleInstructions: Record<string, string> = {
        bullet_points: 'Format as bullet points.',
        paragraph: 'Format as a cohesive paragraph.',
        key_points: 'List only the key points.',
      };

      const prompt = `Summarize the following text ${lengthInstructions[length] || lengthInstructions.medium}. ${styleInstructions[style] || styleInstructions.paragraph}

Text to summarize:
${text}

Summary:`;

      const response = await this.opencodeAdapter.generateResponse({
        modelId: 'opencode/minimax-m2.1-free',
        prompt,
      });

      return {
        success: true,
        data: {
          summary: response.content,
          originalLength: text.length,
          summaryLength: response.content.length,
          compressionRatio: (response.content.length / text.length * 100).toFixed(2) + '%',
        },
        metadata: {
          length,
          style,
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

import Anthropic from '@anthropic-ai/sdk'
import { COACHING_SYSTEM_PROMPT } from './prompts'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type InsightContext = {
  profile: { goal: string | null; max_hr_bpm: number | null; weight_kg: number | null }
  activities: unknown[]
  sleep: unknown[]
  bodyComp: unknown | null
}

export async function generateWeeklyInsight(context: InsightContext): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: COACHING_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Datos del atleta:\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\nGenera el resumen semanal de coaching.`,
      },
    ],
  })

  const block = message.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

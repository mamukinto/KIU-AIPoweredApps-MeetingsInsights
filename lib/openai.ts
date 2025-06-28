import OpenAI from 'openai'

const key =
    process.env.OPENAI_API_KEY || (process.env.VITEST ? 'test-key' : undefined)
export const openai = new OpenAI({apiKey: key})
import { describe, it, expect, vi } from 'vitest'
import { openai } from '@/lib/openai'
import handlerUpload from '@/pages/api/upload'
import handlerSearch from '@/pages/api/search'
const mockEmb = Array(3).fill(0.1)
vi.spyOn(openai.audio.transcriptions, 'create').mockResolvedValue({ text: 'hello world' } as any)
vi.spyOn(openai.chat.completions, 'create').mockResolvedValue({
    choices: [{ message: { content: 'hi', function_call: { arguments: '{"items":["task1"]}' } } }],
} as any)
vi.spyOn(openai.embeddings, 'create').mockResolvedValue({ data: [{ embedding: mockEmb }] } as any)
vi.spyOn(openai.images, 'generate').mockResolvedValue({ data: [{ url: 'img' }] } as any)
const fakeRes = () => {
    const body: any = { status: 0, json: (v: any) => (body.data = v), end: () => {} }
    return body
}
describe('pipeline', () => {
    it('uploads then searches', async () => {
        const reqU: any = { method: 'POST', body: Buffer.from('x') }
        const resU: any = fakeRes()
        await handlerUpload(reqU, resU)
        expect(resU.data.id).toBeTruthy()
        const reqS: any = { query: { q: 'hello' } }
        const resS: any = fakeRes()
        await handlerSearch(reqS, resS)
        expect(resS.data.length).toBeGreaterThan(0)
    })
    it('search 400 if no q', async () => {
        const res: any = fakeRes()
        await handlerSearch({ query: {} } as any, res)
        expect(res.status).toBe(400)
    })
})
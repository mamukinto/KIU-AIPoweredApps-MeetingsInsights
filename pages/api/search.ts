import type {NextApiHandler} from 'next'
import {openai} from '@/lib/openai'
import {db, init} from '@/lib/db'
import {cosine} from '@/lib/similarity'

await init()

const handler: NextApiHandler = async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    if (!q) return res.status(400).end()

    const {data} = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: q,
    })
    const qVec = data[0].embedding

    const idxMap = Object.fromEntries(
        db.data!.meetings.map((m, i) => [m.id, i + 1]),
    )

    const scored = db.data!.meetings.flatMap(m =>
        m.chunks.map(c => ({
            meetingId: m.id,
            idx: idxMap[m.id],
            text: c.text,
            score: cosine(qVec, c.embedding),
        })),
    )
    const hits = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .filter(r => r.score >= 0.05)

    const relatedIds = [...new Set(hits.map(h => h.meetingId))].slice(1, 4)
    res.json({hits, relatedIds})
}
export default handler
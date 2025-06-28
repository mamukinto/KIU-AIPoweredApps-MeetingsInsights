import type {NextApiHandler} from 'next'
import {db, init} from '@/lib/db'

await init()
const handler: NextApiHandler = (_req, res) =>
    res.json(
        db.data!.meetings.map((m, i) => ({
            idx: i + 1,
            id: m.id,
            title: m.title,
            imageUrl: m.imageUrl,
        })),
    )
export default handler
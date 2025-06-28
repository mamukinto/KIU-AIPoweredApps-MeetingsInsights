// pages/api/meeting.ts
import type {NextApiHandler} from 'next'
import {db, init} from '@/lib/db'

await init()
const handler: NextApiHandler = (req, res) => {
    const id = req.query.id as string
    const m = db.data!.meetings.find(x => x.id === id)
    res.json(m ?? {})
}
export default handler

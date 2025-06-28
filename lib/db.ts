import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { join } from 'path'

// ---- types -----------------------------------------------------------
export type Meeting = {
    id: string
    title: string
    transcript: string
    summary: string
    actions: string[]
    imageUrl: string
    chunks: { text: string; embedding: number[] }[]
}
type Data = { meetings: Meeting[] }

// ---- adapter ---------------------------------------------------------
const file = join(process.cwd(), 'data', 'db.json')
const adapter = new JSONFile<Data>(file)

// 👉 pass default object right here
export const db = new Low<Data>(adapter, { meetings: [] })

// ---- helpers ---------------------------------------------------------
export const init = async () => db.read()          // call once on boot
export const save = () => db.write()
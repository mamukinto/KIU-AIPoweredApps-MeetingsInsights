import type {NextApiHandler} from 'next'
import {openai} from '@/lib/openai'
import {db, init, save} from '@/lib/db'
import {randomUUID} from 'crypto'
import {createReadStream, createWriteStream} from 'fs'
import {unlink} from 'fs/promises'
import {tmpdir} from 'os'
import {join} from 'path'
import {createEvents} from '@/lib/calendar'
import {toWav} from "@/lib/extractAudio";

await init()

const isVideoUpload = (req: NextApiRequest) =>
    typeof req.headers['content-type'] === 'string' &&
    req.headers['content-type'].startsWith('video/')

const handler: NextApiHandler = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end()

    const tmp = join(tmpdir(), `${randomUUID()}.${isVideoUpload(req) ? 'mp4' : 'mp3'}`)

    const audioPath = isVideoUpload(req) ? await toWav(tmp) : tmp

    await new Promise((ok, err) =>
        req.pipe(createWriteStream(tmp)).on('finish', ok).on('error', err),
    )

    try {
        // 1️⃣ Whisper + speaker tags
        const {text, segments} = await openai.audio.transcriptions.create({
            file: createReadStream(audioPath),
            model: 'whisper-1',
            speaker_labels: true,
        })
        const labelled = segments
            ? segments.map((s: any) => `S${s.speaker}: ${s.text}`).join('\n')
            : text

        // 2️⃣ FIRST call: get a short textual summary
        const summaryRes = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a helpful assistant that writes 2–3-sentence executive summaries of meeting transcripts.',
                },
                {role: 'user', content: labelled},
            ],
        })
        const summary =
            summaryRes.choices[0].message.content?.trim() || '(no summary)'

// 3️⃣ SECOND call: extract action items via function-calling
        const fc = [
            {
                name: 'setActionItems',
                parameters: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    title: {type: 'string'},
                                    owner: {type: 'string'},
                                    due: {type: 'string', nullable: true},
                                },
                                required: ['title', 'owner'],
                            },
                        },
                    },
                    required: ['items'],
                },
            },
        ]
        const actRes = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            function_call: {name: 'setActionItems'},
            functions: fc,
            messages: [
                {
                    role: 'user',
                    content:
                        'Extract action items with owner names and optional due dates from this transcript.',
                },
                {role: 'assistant', content: labelled},
            ],
        })
        const actions = JSON.parse(
            actRes.choices[0].message.function_call!.arguments,
        ).items as { title: string; owner: string; due?: string }[]
        const calendarLinks = createEvents(actions)

        // 3️⃣ DALL·E slide
        const bulletTxt = actions.slice(0, 4).map(a => a.title).join(' • ')
        const img = await openai.images.generate({
            model: 'dall-e-3',
            prompt: `
                Professional slide. 
                Title: "${summary.slice(0, 40)}".
                Subtitle: key actions – ${bulletTxt}.
                Style: flat illustration, soft gradients, corporate blue and teal accents.
                Include small action-item icons (checkmark, calendar, chat bubble).
              `,
            n: 1,
            size: '1024x1024',
        })

        // 4️⃣ finer-grained chunk embeddings (~60 tokens each)
        const words = labelled.split(' ')
        const CHUNK_TOKENS = 60
        const chunks = []
        for (let i = 0; i < words.length; i += CHUNK_TOKENS) {
            const snippet = words.slice(i, i + CHUNK_TOKENS).join(' ')
            const {data} = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: snippet,
            })
            chunks.push({text: snippet, embedding: data[0].embedding})
        }

        // 5️⃣ persist
        db.data!.meetings.push({
            id: randomUUID(),
            title: summary.slice(0, 60),
            transcript: labelled,
            summary,
            actions,
            calendarLinks,
            imageUrl: img.data[0].url,
            chunks,
        })
        await save()
        res.json({ok: true})
    } catch (e: any) {
        console.error(e)
        res.status(500).json({error: e.message})
    } finally {
        await unlink(tmp).catch(() => {
        })
    }
}
export default handler
export const config = {api: {bodyParser: false}}
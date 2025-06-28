// lib/extractAudio.ts
//
// Turns any uploaded video (or odd-format audio) into a
// mono 16-kHz WAV file—ready for Whisper.
//
// Works cross-platform:
// • prefers the binary shipped by `ffmpeg-static`
// • falls back to a system-wide `ffmpeg` on PATH
//
import {tmpdir} from 'os'
import {join} from 'path'
import {randomUUID} from 'crypto'
import {spawn} from 'child_process'
import {existsSync} from 'fs'
import ffmpegStatic from 'ffmpeg-static' // may be undefined on some Windows installs

/** extract audio → wav(16kHz) and return tmp path */
export async function toWav(inputPath: string): Promise<string> {
    const out = join(tmpdir(), `${randomUUID()}.wav`)
    const ffmpeg = pickFfmpeg()

    await new Promise<void>((ok, err) => {
        const p = spawn(ffmpeg, ['-i', inputPath, '-ac', '1', '-ar', '16000', out], {
            stdio: 'ignore',
        })
        p.on('error', err)
        p.on('exit', code => (code === 0 ? ok() : err(new Error('ffmpeg failed'))))
    })

    return out
}

/* choose bundled binary if present, else rely on PATH */
function pickFfmpeg(): string {
    if (ffmpegStatic && existsSync(ffmpegStatic)) return ffmpegStatic
    return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
}

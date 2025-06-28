import {useEffect, useRef, useState} from 'react'

type Hit = { meetingId: string; text: string; score: number; idx: number }
type MeetingMeta = { id: string; idx: number; title: string; imageUrl: string }

/* ------------------ helpers ------------------ */
const toast = (msg: string, ok = true) =>
    document.body.dispatchEvent(new CustomEvent('toast', {detail: {msg, ok}}))

const percent = (n: number) => (n * 100).toFixed(1) + '%'

/* ------------------ component ------------------ */
export default function Home() {
    const [meetings, setMeetings] = useState<MeetingMeta[]>([])
    const [sel, setSel] = useState<any | null>(null)
    const [hits, setHits] = useState<Hit[]>([])
    const [q, setQ] = useState('')
    const [uploading, setUploading] = useState(false)
    const [searching, setSearching] = useState(false)
    const [theme, setTheme] = useState<'light' | 'dark'>('light')
    const [view, setView] = useState<'grid' | 'list'>('grid')
    const dropRef = useRef<HTMLDivElement>(null)

    /* theme --------------------------------------- */
    useEffect(() => {
        const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
        const sysPref = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
        setTheme(stored ?? sysPref)
    }, [])
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    /* list on load -------------------------------- */
    useEffect(() => {
        fetch('/api/list').then(r => r.json()).then(setMeetings)
    }, [])

    /* toast listener ------------------------------ */
    useEffect(() => {
        const fn = (e: any) => {
            const n = document.createElement('div')
            n.textContent = e.detail.msg
            n.className = 'toast ' + (e.detail.ok ? 'ok' : 'err')
            document.body.appendChild(n)
            setTimeout(() => n.remove(), 2500)
        }
        document.body.addEventListener('toast', fn)
        return () => document.body.removeEventListener('toast', fn)
    }, [])

    /* drag-drop ----------------------------------- */
    useEffect(() => {
        const el = dropRef.current
        if (!el) return
        const over = (e: any) => (e.preventDefault(), el.classList.add('over'))
        const leave = () => el.classList.remove('over')
        const drop = (e: any) => {
            e.preventDefault()
            leave()
            if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0])
        }
        el.addEventListener('dragover', over)
        el.addEventListener('dragleave', leave)
        el.addEventListener('drop', drop)
        return () => {
            el.removeEventListener('dragover', over)
            el.removeEventListener('dragleave', leave)
            el.removeEventListener('drop', drop)
        }
    }, [])

    /* actions ------------------------------------- */
    const refresh = () =>
        fetch('/api/list').then(r => r.json()).then(setMeetings)

    const handleUpload = async (file: File) => {
        setUploading(true)
        toast(`Uploading ${file.name}…`)
        const res = await fetch('/api/upload', {method: 'POST', body: file})
        setUploading(false)
        toast(res.ok ? 'Processed 🎉' : 'Server error', res.ok)
        if (res.ok) refresh()
    }

    const search = async () => {
        if (!q.trim()) return
        setSearching(true)
        try {
            setHits([])
            const {hits} = await fetch('/api/search?q=' + encodeURIComponent(q)).then(
                r => r.json(),
            )
            // Sort hits by score in descending order (highest match first)
            const sortedHits = hits.sort((a: Hit, b: Hit) => b.score - a.score)
            setHits(sortedHits)
        } catch (error) {
            toast('Search failed', false)
        } finally {
            setSearching(false)
        }
    }

    const openMeeting = async (id: string) => {
        const full = await fetch('/api/meeting?id=' + id).then(r => r.json())
        setSel(full)
    }

    /* ------------------ render ------------------- */
    return (
        <>
            <div className="app">
                {/* Top Navigation */}
                <nav className="topNav">
                    <div className="navBrand">
                        <div className="logo">⚡</div>
                        <h1>InsightHub</h1>
                    </div>
                    <div className="navControls">
                        <div className="searchContainer">
                            <div className="searchIcon">🔍</div>
                            <input
                                className="globalSearch"
                                placeholder="Search across all meetings..."
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && search()}
                            />
                            <button className="searchBtn" onClick={search} disabled={searching}>
                                {searching ? '🔄' : 'Search'}
                            </button>
                        </div>
                        <div className="viewToggle">
                            <button
                                className={view === 'grid' ? 'active' : ''}
                                onClick={() => setView('grid')}
                            >
                                ▦
                            </button>
                            <button
                                className={view === 'list' ? 'active' : ''}
                                onClick={() => setView('list')}
                            >
                                ☰
                            </button>
                        </div>
                        <button
                            className="themeToggle"
                            onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
                        >
                            {theme === 'light' ? '🌚' : '🌞'}
                        </button>
                    </div>
                </nav>

                {/* Main Content Area */}
                <main className="mainContent">
                    {/* Upload Zone */}
                    <section className="uploadSection">
                        <div
                            ref={dropRef}
                            className="uploadZone"
                            onClick={() => document.getElementById('file')!.click()}
                        >
                            <div className="uploadIcon">
                                {uploading ? '⏳' : '📁'}
                            </div>
                            <h3>{uploading ? 'Processing your file...' : 'Add New Meeting'}</h3>
                            <p>Drag & drop audio/video files or click to browse</p>
                            <div className="supportedFormats">
                                <span>MP4</span>
                                <span>MP3</span>
                                <span>WAV</span>
                                <span>MOV</span>
                            </div>
                            <input
                                id="file"
                                type="file"
                                accept="audio/*,video/*"
                                hidden
                                onChange={e => e.target.files && handleUpload(e.target.files[0])}
                            />
                        </div>
                    </section>

                    {/* Search Status */}
                    {searching && (
                        <section className="searchStatus">
                            <div className="searchSpinner">
                                <div className="spinner"></div>
                                <span>Searching through your meetings...</span>
                            </div>
                        </section>
                    )}

                    {/* Search Results */}
                    {hits.length > 0 && (
                        <section className="resultsSection">
                            <div className="sectionHeader">
                                <h2>🎯 Search Results</h2>
                                <div className="resultsSummary">
                                    <span className="resultCount">{hits.length} matches found</span>
                                    {hits.length > 0 && (
                                        <span className="topMatch">
                                            Best match: {percent(hits[0].score)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="searchResults">
                                {hits.map((h, index) => (
                                    <div key={h.text.slice(0, 40)}
                                         className={`resultCard ${index === 0 ? 'topResult' : ''}`}>
                                        <div className="resultHeader">
                                            <div className="resultLeft">
                                                <span className="meetingTag">Meeting #{h.idx}</span>
                                                {index === 0 && <span className="bestMatch">🏆 Best Match</span>}
                                            </div>
                                            <div className="scoreIndicator">
                                                <div
                                                    className="scoreFill"
                                                    style={{width: percent(h.score)}}
                                                />
                                                <span className="scoreText">{percent(h.score)}</span>
                                            </div>
                                        </div>
                                        <p
                                            className="resultText"
                                            dangerouslySetInnerHTML={{
                                                __html: highlight(h.text, q),
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Meetings Gallery */}
                    <section className="meetingsSection">
                        <div className="sectionHeader">
                            <h2>📋 Your Meetings</h2>
                            <span className="meetingCount">{meetings.length} meetings</span>
                        </div>
                        <div className={`meetingsGrid ${view}`}>
                            {meetings.map(m => (
                                <div
                                    key={m.id}
                                    className="meetingCard"
                                    onClick={() => openMeeting(m.id)}
                                >
                                    <div className="cardImage">
                                        <img src={m.imageUrl} alt={m.title}/>
                                        <div className="cardOverlay">
                                            <button className="viewBtn">👁 View Details</button>
                                        </div>
                                    </div>
                                    <div className="cardContent">
                                        <div className="cardBadge">#{m.idx}</div>
                                        <h3 className="cardTitle">{m.title}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>

                {/* Meeting Detail Modal */}
                {sel && (
                    <div className="modalOverlay" onClick={() => setSel(null)}>
                        <div className="modalContent" onClick={e => e.stopPropagation()}>
                            <header className="modalHeader">
                                <div className="modalTitle">
                                    <span className="modalBadge">#{sel.idx}</span>
                                    <h2>{sel.title}</h2>
                                </div>
                                <button className="closeBtn" onClick={() => setSel(null)}>
                                    ✕
                                </button>
                            </header>

                            <div className="modalBody">
                                <img src={sel.imageUrl} className="modalImage" alt={sel.title}/>

                                <div className="actionsPanel">
                                    <h3>🎯 Action Items</h3>
                                    <div className="actionsList">
                                        {sel.actions.map((a: any, i: number) => (
                                            <div key={i} className="actionItem">
                                                <div className="actionContent">
                                                    <div className="actionTitle">{a.title}</div>
                                                    <div className="actionMeta">
                                                        <span className="owner">👤 {a.owner}</span>
                                                        {a.due && <span className="due">📅 {a.due}</span>}
                                                    </div>
                                                </div>
                                                {sel.calendarLinks[i] && (
                                                    <a
                                                        className="calendarLink"
                                                        target="_blank"
                                                        href={sel.calendarLinks[i]}
                                                    >
                                                        📆
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <details className="transcriptPanel">
                                    <summary>📝 Full Transcript</summary>
                                    <div className="transcriptContent">
                                        <pre
                                            dangerouslySetInnerHTML={{
                                                __html: sel.transcript.replace(
                                                    /S(\d+):/g,
                                                    (_, n) =>
                                                        `<strong style="color:${speakerColor(+n)}">Speaker ${n}:</strong>`,
                                                ),
                                            }}
                                        />
                                    </div>
                                </details>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ================== styles ================== */}
            <style jsx global>{`
                :root {
                    --primary: #2563eb;
                    --primary-dark: #1d4ed8;
                    --secondary: #10b981;
                    --accent: #f59e0b;
                    --danger: #ef4444;
                    --bg-primary: #ffffff;
                    --bg-secondary: #f8fafc;
                    --bg-tertiary: #f1f5f9;
                    --text-primary: #0f172a;
                    --text-secondary: #475569;
                    --text-muted: #94a3b8;
                    --border: #e2e8f0;
                    --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
                    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
                    --gradient: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                }

                [data-theme='dark'] {
                    --primary: #3b82f6;
                    --primary-dark: #2563eb;
                    --secondary: #10b981;
                    --accent: #fbbf24;
                    --danger: #f87171;
                    --bg-primary: #0f172a;
                    --bg-secondary: #1e293b;
                    --bg-tertiary: #334155;
                    --text-primary: #f8fafc;
                    --text-secondary: #cbd5e1;
                    --text-muted: #64748b;
                    --border: #334155;
                    --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3);
                    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3);
                }

                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }

                html, body, #__next {
                    height: 100%;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .app {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                }

                /* Navigation */
                .topNav {
                    background: var(--bg-secondary);
                    border-bottom: 1px solid var(--border);
                    padding: 1rem 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: var(--shadow);
                    position: sticky;
                    top: 0;
                    z-index: 50;
                }

                .navBrand {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .logo {
                    width: 40px;
                    height: 40px;
                    background: var(--gradient);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    color: white;
                }

                .navBrand h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .navControls {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .searchContainer {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .searchIcon {
                    position: absolute;
                    left: 12px;
                    color: var(--text-muted);
                    z-index: 1;
                }

                .globalSearch {
                    width: 300px;
                    padding: 0.75rem 0.75rem 0.75rem 2.5rem;
                    border: 1px solid var(--border);
                    border-radius: 25px;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }

                .globalSearch:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgb(37 99 235 / 0.1);
                }

                .searchBtn {
                    margin-left: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: 20px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .searchBtn:hover {
                    background: var(--primary-dark);
                    transform: translateY(-1px);
                }

                .viewToggle {
                    display: flex;
                    background: var(--bg-tertiary);
                    border-radius: 8px;
                    padding: 2px;
                }

                .viewToggle button {
                    padding: 0.5rem;
                    background: none;
                    border: none;
                    cursor: pointer;
                    border-radius: 6px;
                    color: var(--text-secondary);
                    transition: all 0.2s;
                }

                .viewToggle button.active {
                    background: var(--bg-primary);
                    color: var(--primary);
                    box-shadow: var(--shadow);
                }

                .themeToggle {
                    padding: 0.5rem;
                    background: none;
                    border: none;
                    font-size: 1.25rem;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: all 0.2s;
                }

                .themeToggle:hover {
                    background: var(--bg-tertiary);
                }

                /* Main Content */
                .mainContent {
                    flex: 1;
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 2rem;
                    width: 100%;
                }

                /* Upload Section */
                .uploadSection {
                    margin-bottom: 3rem;
                }

                .uploadZone {
                    border: 2px dashed var(--border);
                    border-radius: 16px;
                    padding: 3rem;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s;
                    background: var(--bg-secondary);
                }

                .uploadZone:hover, .uploadZone.over {
                    border-color: var(--primary);
                    background: var(--bg-tertiary);
                    transform: translateY(-2px);
                }

                .uploadIcon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }

                .uploadZone h3 {
                    font-size: 1.25rem;
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }

                .uploadZone p {
                    color: var(--text-secondary);
                    margin-bottom: 1rem;
                }

                .supportedFormats {
                    display: flex;
                    justify-content: center;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .supportedFormats span {
                    padding: 0.25rem 0.75rem;
                    background: var(--bg-tertiary);
                    border-radius: 12px;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }

                /* Section Headers */
                .sectionHeader {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }

                .sectionHeader h2 {
                    font-size: 1.5rem;
                    font-weight: 600;
                }

                .resultCount, .meetingCount {
                    color: var(--text-muted);
                    font-size: 0.875rem;
                }

                /* Search Results */
                .resultsSection {
                    margin-bottom: 3rem;
                }

                .searchResults {
                    display: grid;
                    gap: 1rem;
                }

                .resultCard {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 1.5rem;
                    transition: all 0.2s;
                }

                .resultCard:hover {
                    box-shadow: var(--shadow-lg);
                    transform: translateY(-2px);
                }

                .resultHeader {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .meetingTag {
                    background: var(--primary);
                    color: white;
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 500;
                }

                .scoreIndicator {
                    position: relative;
                    width: 80px;
                    height: 6px;
                    background: var(--bg-tertiary);
                    border-radius: 3px;
                }

                .scoreFill {
                    height: 100%;
                    background: var(--secondary);
                    border-radius: 3px;
                    transition: width 0.3s;
                }

                .scoreText {
                    position: absolute;
                    right: 0;
                    top: -20px;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }

                .resultText {
                    line-height: 1.6;
                    color: var(--text-secondary);
                }

                /* Meetings Grid */
                .meetingsGrid {
                    display: grid;
                    gap: 1.5rem;
                }

                .meetingsGrid.grid {
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                }

                .meetingsGrid.list {
                    grid-template-columns: 1fr;
                }

                .meetingCard {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .meetingCard:hover {
                    box-shadow: var(--shadow-lg);
                    transform: translateY(-4px);
                }

                .cardImage {
                    position: relative;
                    aspect-ratio: 16/9;
                    overflow: hidden;
                }

                .cardImage img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.3s;
                }

                .meetingCard:hover .cardImage img {
                    transform: scale(1.05);
                }

                .cardOverlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent 60%);
                    display: flex;
                    align-items: end;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.3s;
                    padding: 1rem;
                }

                .meetingCard:hover .cardOverlay {
                    opacity: 1;
                }

                .viewBtn {
                    background: white;
                    color: var(--text-primary);
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 20px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: transform 0.2s;
                }

                .viewBtn:hover {
                    transform: scale(1.05);
                }

                .cardContent {
                    padding: 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .cardBadge {
                    background: var(--accent);
                    color: white;
                    padding: 0.25rem 0.75rem;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    flex-shrink: 0;
                }

                .cardTitle {
                    font-size: 1rem;
                    font-weight: 500;
                    color: var(--text-primary);
                    line-height: 1.4;
                }

                .meetingsGrid.list .meetingCard {
                    display: flex;
                    align-items: center;
                }

                .meetingsGrid.list .cardImage {
                    width: 120px;
                    flex-shrink: 0;
                    aspect-ratio: 16/10;
                }

                .meetingsGrid.list .cardContent {
                    flex: 1;
                }

                /* Modal */
                .modalOverlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.75);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }

                .modalContent {
                    background: var(--bg-primary);
                    border-radius: 20px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: var(--shadow-lg);
                }

                .modalHeader {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 2rem 2rem 1rem;
                    border-bottom: 1px solid var(--border);
                }

                .modalTitle {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .modalBadge {
                    background: var(--gradient);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 16px;
                    font-weight: 600;
                    font-size: 0.875rem;
                }

                .modalTitle h2 {
                    font-size: 1.5rem;
                    font-weight: 600;
                }

                .closeBtn {
                    background: var(--bg-tertiary);
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    color: var(--text-secondary);
                    font-size: 1.125rem;
                    transition: all 0.2s;
                }

                .closeBtn:hover {
                    background: var(--danger);
                    color: white;
                }

                .modalBody {
                    padding: 2rem;
                }

                .modalImage {
                    width: 100%;
                    border-radius: 12px;
                    margin-bottom: 2rem;
                }

                .actionsPanel h3 {
                    font-size: 1.25rem;
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .actionsList {
                    display: grid;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                .actionItem {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 1.25rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .actionContent {
                    flex: 1;
                }

                .actionTitle {
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }

                .actionMeta {
                    display: flex;
                    gap: 1rem;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .calendarLink {
                    background: var(--secondary);
                    color: white;
                    padding: 0.5rem;
                    border-radius: 8px;
                    text-decoration: none;
                    font-size: 1.125rem;
                    transition: transform 0.2s;
                }

                .calendarLink:hover {
                    transform: scale(1.1);
                }

                .transcriptPanel {
                    margin-top: 2rem;
                }

                .transcriptPanel summary {
                    font-size: 1.125rem;
                    font-weight: 500;
                    cursor: pointer;
                    padding: 1rem;
                    background: var(--bg-secondary);
                    border-radius: 12px;
                    margin-bottom: 1rem;
                    transition: background 0.2s;
                }

                .transcriptPanel summary:hover {
                    background: var(--bg-tertiary);
                }

                .transcriptContent {
                    background: var(--bg-secondary);
                    border-radius: 12px;
                    padding: 1.5rem;
                    max-height: 400px;
                    overflow-y: auto;
                }

                .transcriptContent pre {
                    white-space: pre-wrap;
                    line-height: 1.6;
                    color: var(--text-secondary);
                    font-family: ui-monospace, SFMono-Regular, Monaco, monospace;
                    font-size: 0.875rem;
                }

                /* Toast notifications */
                .toast {
                    position: fixed;
                    bottom: 2rem;
                    right: 2rem;
                    background: var(--bg-primary);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    padding: 1rem 1.5rem;
                    border-radius: 12px;
                    box-shadow: var(--shadow-lg);
                    pointer-events: none;
                    opacity: 0;
                    animation: slideIn 3s ease forwards;
                    max-width: 300px;
                    z-index: 1001;
                }

                .toast.ok {
                    border-left: 4px solid var(--secondary);
                }

                .toast.err {
                    border-left: 4px solid var(--danger);
                }

                @keyframes slideIn {
                    0% {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    10%, 90% {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }

                /* Highlight styling */
                mark {
                    background: var(--accent);
                    color: var(--bg-primary);
                    padding: 0.125rem 0.25rem;
                    border-radius: 4px;
                    font-weight: 500;
                }

                /* Responsive design */
                @media (max-width: 768px) {
                    .topNav {
                        flex-direction: column;
                        gap: 1rem;
                        padding: 1rem;
                    }

                    .navControls {
                        width: 100%;
                        justify-content: space-between;
                    }

                    .globalSearch {
                        width: 200px;
                    }

                    .mainContent {
                        padding: 1rem;
                    }

                    .uploadZone {
                        padding: 2rem 1rem;
                    }

                    .meetingsGrid.grid {
                        grid-template-columns: 1fr;
                    }

                    .modalContent {
                        width: 95%;
                        margin: 1rem;
                    }

                    .modalHeader {
                        padding: 1.5rem 1rem 1rem;
                    }

                    .modalBody {
                        padding: 1rem;
                    }

                    .modalTitle {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.5rem;
                    }

                    .actionItem {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }

                    .actionMeta {
                        flex-direction: column;
                        gap: 0.5rem;
                    }
                }
            `}</style>
        </>
    )
}

/* keyword highlight helper */
function highlight(text: string, term: string) {
    if (!term) return text
    return text.replace(
        new RegExp(`(${escapeReg(term)})`, 'gi'),
        '<mark>$1</mark>',
    )
}

const escapeReg = (s: string) => s
/* colour speakers */
const palette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444']
const speakerColor = (idx: number) => palette[idx % palette.length]
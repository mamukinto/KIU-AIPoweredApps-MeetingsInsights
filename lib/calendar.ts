// lib/calendar.ts          (NEW - 18 LOC)
export type Action = { title: string; owner: string; due?: string }
export const createEvents = (items: Action[]) =>
    items.map(i =>
        `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(
            i.title + ' – ' + i.owner,
        )}`,
    )

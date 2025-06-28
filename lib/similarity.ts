export const cosine = (a: number[], b: number[]) =>
    a.reduce((s, v, i) => s + v * b[i], 0) /
    (Math.hypot(...a) * Math.hypot(...b) || 1)
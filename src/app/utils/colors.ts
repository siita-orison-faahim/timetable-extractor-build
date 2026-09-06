const COURSE_COLORS = [
  "#ffff99", // Yellow
  "#c2e0b1", // Green
  "#f9b88d", // Orange
  "#9bc2e6", // Blue
  "#00ffff", // Cyan
  "#fbc4ab", // Peach
  "#ccd5ae", // Sage
  "#e8dff5", // Lavender
  "#fce1e4", // Pink
  "#daeaf6", // Light Blue
];

// Memoization cache to avoid re-hashing course strings on every render
const colorCache = new Map<string, string>();

export function getCourseColor(courseCode: string): string {
  const cachedColor = colorCache.get(courseCode);
  if (cachedColor) return cachedColor;

  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COURSE_COLORS.length;
  const color = COURSE_COLORS[index];

  colorCache.set(courseCode, color);
  return color;
}

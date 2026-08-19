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

export function getCourseColor(courseCode: string): string {
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COURSE_COLORS.length;
  return COURSE_COLORS[index];
}

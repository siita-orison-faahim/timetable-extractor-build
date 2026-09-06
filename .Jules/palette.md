## 2026-07-16 - Course Card Title Typography Enhancement
**Learning:** Increasing the course title's visibility (increasing courseCode font size to bold/black `text-xs`) and placing the course name immediately next to it with reduced opacity (e.g., `- [Course Name]` styled as `text-[10px] font-medium text-black/80`) provides an immediate, visual association between the code and its title. This creates an extremely clean hierarchy, satisfying dense layouts while retaining perfect context.
**Action:** Group related identifiers (like IDs and full names) on the same baseline to preserve vertical layout rhythm.

## 2026-07-17 - Mobile Viewport Landscape Download | Learning: Generating PDFs on mobile/responsive layouts from the active DOM captures the stacked vertical/mobile presentation, breaking the expected desktop landscape timetable PDF download. Rendering a fixed 1200px width container off-screen strictly for pdf capture solves this viewport discrepancy. | Action: Use a dedicated, hidden off-screen landscape template container for generating perfect PDFs across all viewport sizes.

## 2026-07-18 - File Upload Box Clear Action & Disabled Button Guidance
**Learning:** Adding a secondary inline "Remove" action inside clickable file upload cards requires `e.stopPropagation()` and distinct `aria-label`s to prevent triggering the file selection dialog. Additionally, pairing disabled submit buttons with explicit helper text directly underneath reduces user friction by explaining missing required inputs before interaction.
**Action:** Always stop event propagation on nested buttons within clickable card containers, and provide immediate visual guidance text for disabled primary action buttons.

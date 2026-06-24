# Project Vision: "Academic Zen" Dashboard
**Role:** High-End UX/UI Design & Frontend Engineering
**Architecture:** TypeScript, React, Tailwind CSS, Framer Motion

## 1. Design Philosophy
- **Calm Productivity:** The UI should never feel overwhelming. Use generous whitespace (negative space) to let the user's eyes breathe between course tasks.
- **Subtle Intentionality:** Every interaction should feel physical. Elements should have weight, inertia, and "snap" when moving.
- **Information Hierarchy:** Focus on "What is due now?" versus "What is coming?" using depth and color, not just text size.

## 2. Visual Palette & Geometry
- **Surface:** Use a "Layered Glass" approach. The background is a very soft neutral (`bg-slate-50`), while cards use semi-transparent white (`bg-white/80`) with a `backdrop-blur-md`.
- **Corners:** High curvature for a welcoming feel. Use `rounded-2xl` (16px) for cards and `rounded-xl` for inner elements.
- **Borders:** Thin, subtle borders (`border-slate-200/50`) rather than heavy shadows to define shapes.
- **Categorization:** Use high-vibrancy accent dots for course codes (e.g., MATH340 = Amber-500, CS354 = Emerald-500) to create instant visual recognition.

## 3. Motion & Interactivity (The "Pop")
- **Micro-interactions:** Use `whileHover={{ y: -4 }}` and `whileTap={{ scale: 0.98 }}` for all interactive cards.
- **Spring Physics:** Avoid linear animations. Use `type: "spring", stiffness: 300, damping: 20` for a "premium" tactile feel.
- **Layout Transitions:** Use Framer Motion's `layout` prop for all list reordering so tasks "slide" into place when filtered or sorted.
- **Status Shifts:** When a task is completed, it should "fade and shrink" while the "Completed" counter at the top performs a "scale-up" pulse.

## 4. Component Constraints
- **Typography:** Use a clean Sans-Serif (Inter or Geist). Headers should be `tracking-tight` and `font-semibold`.
- **Buttons:** Primary buttons should have a subtle `shimmer` effect or a very soft `shadow-sm` that expands to `shadow-lg` on hover.
- **Empty States:** Use monochromatic, thin-line illustrations or "shimmer" skeletons to maintain the Zen aesthetic even when data is loading.
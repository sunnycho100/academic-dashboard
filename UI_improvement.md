# UI Improvement Plan — Glass Polish Pass

## 1. Inset Top Highlight on Glass Surfaces
Add a subtle 1px white-to-transparent gradient along the top inner edge of glass panels. This is the classic Apple glass detail that simulates a light source hitting the top edge.

**Files:** `app/globals.css`  
**Targets:** `.glass-thick`, `.glass-thin`  
**Method:** `::after` pseudo-element with a `linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)` at height ~1px, positioned at top.

---

## 2. Directional Rim Border
Replace uniform `border-white/10` with directional lighting — top/left edges slightly brighter, bottom/right edges dimmer. Simulates a top-left light source.

**Files:** `app/globals.css`  
**Targets:** `.glass-thick`, `.glass-thin`  
**Method:** Use `border-color` with directional values: `border-top-color` / `border-left-color` at ~white/15, `border-bottom-color` / `border-right-color` at ~white/5.

---

## 3. Badge Translucency — Overdue & Due Soon
Restyle the flat overdue (red) and due-soon (amber) badges to integrate with the glass system. Reduce saturation, add slight translucency and backdrop-blur.

**Files:** `components/task-row.tsx` (badges are rendered inline)  
**Changes:**
- Overdue badge: lower red saturation, use `bg-red-500/12` + `text-red-600/90` + `backdrop-blur-sm` + `border border-red-500/15`
- Due Soon badge: same approach with amber tones
- Remove flat opaque backgrounds
- Ensure contrast remains accessible (WCAG AA on white-ish glass)

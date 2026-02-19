# KodNest Premium Build System

Design system for a serious B2C product. One mind, one voice, no visual drift.

---

## Design philosophy

- **Calm** — No flash, no noise.
- **Intentional** — Every choice has a reason.
- **Coherent** — Same rules everywhere.
- **Confident** — Clear hierarchy, generous space.

**Out of scope:** Gradients, glassmorphism, neon colors, decorative animation, hackathon-style UI.

---

## Color system (max 4 in use)

| Role       | Token       | Value     | Use                    |
|-----------|-------------|-----------|------------------------|
| Background| `--kn-bg`   | `#F7F6F3` | Page and surfaces      |
| Primary text | `--kn-text` | `#111111` | Body and headings      |
| Accent    | `--kn-accent` | `#8B0000` | Primary actions, focus |
| Success   | `--kn-success` | `#4A5D4A` | Shipped, completed     |
| Warning   | `--kn-warning` | `#8B6914` | In progress, caution   |

Success and warning are muted; they support status only. Do not introduce additional hues.

---

## Typography

- **Headings:** Serif (`Libre Baskerville`), large, confident, generous spacing. No decorative fonts.
- **Body:** Sans-serif (`Inter`), 16–18px, line-height 1.6–1.8. Max width for text blocks: **720px**.
- **Sizes:** Use tokens only. No random sizes.

| Token                | Size     | Use           |
|----------------------|----------|---------------|
| `--kn-heading-size-1`| 2.25rem  | Context headline |
| `--kn-heading-size-2`| 1.75rem  | Section       |
| `--kn-heading-size-3`| 1.25rem  | Subsection    |
| `--kn-body-size-lg`  | 1.125rem | Body          |
| `--kn-body-size`     | 1rem     | UI, captions  |
| `--kn-caption-size`  | 0.875rem | Labels, meta  |

---

## Spacing system

**Only this scale:** `8px`, `16px`, `24px`, `40px`, `64px`

| Token         | Value |
|---------------|-------|
| `--kn-space-xs` | 8px  |
| `--kn-space-sm` | 16px |
| `--kn-space-md` | 24px |
| `--kn-space-lg` | 40px |
| `--kn-space-xl` | 64px |

Never use values outside this scale (e.g. 13px, 27px). Whitespace is part of the design.

---

## Global layout structure

Every page must follow this order:

1. **Top Bar** — Project name (left), progress (center), status badge (right).
2. **Context Header** — One large serif headline, one-line subtext. Clear purpose, no hype.
3. **Primary Workspace (70%)** — Main product interaction. Clean cards, predictable components.
4. **Secondary Panel (30%)** — Step explanation, copyable prompt box, actions (Copy, Build in Lovable, It Worked, Error, Add Screenshot).
5. **Proof Footer** — Persistent. Checklist: □ UI Built □ Logic Working □ Test Passed □ Deployed. Each requires user proof.

---

## Top bar

- **Left:** Project name (sans-serif, weight 600).
- **Center:** Progress: “Step X / Y”.
- **Right:** Status badge: “Not Started” | “In Progress” | “Shipped” (calm styling, border only; Shipped uses success color, In Progress uses warning).

---

## Context header

- One large serif headline.
- One-line subtext, max 720px width.
- No marketing hype. State the purpose only.

---

## Primary workspace (70%)

- Where the main product interaction happens.
- Use `.kn-card` for grouping. No drop shadows; subtle border only. Balanced padding from spacing scale.
- No crowding. One primary action per card when possible.

---

## Secondary panel (30%)

- Short step explanation (`.kn-step-explanation`).
- Copyable prompt box (`.kn-prompt-box`).
- Buttons: Copy, Build in Lovable, It Worked, Error, Add Screenshot. Same hover and radius as rest of system.
- Calm styling; no extra decoration.

---

## Proof footer

- Stays at bottom. Checklist style.
- Items: □ UI Built □ Logic Working □ Test Passed □ Deployed.
- Each checkbox requires user proof input. No auto-checking for show.

---

## Component rules

| Component   | Rule |
|------------|------|
| Primary button | Solid `--kn-accent`. Hover: slightly darker. Same radius everywhere. |
| Secondary button | Outlined; border from token. Same hover and radius as primary. |
| Inputs / textarea | Clean border, no heavy shadow. Focus: clear ring using accent. |
| Cards | Subtle border (`--kn-border`), no drop shadows. Padding from spacing scale. |

**Shared:** One hover duration (150–200ms), one border radius (`--kn-radius`: 6px).

---

## Interaction rules

- **Transitions:** 150–200ms, ease-in-out. No bounce, no parallax, no animation for decoration.

---

## Error states

- Explain what went wrong and how to fix it.
- Never blame the user. Use `.kn-error-box`: title, message, fix.

---

## Empty states

- Provide the next action (e.g. primary button).
- Never leave the user on a dead screen. Use `.kn-empty-state`: title, short text, one clear action.

---

## File reference

- **Tokens and components:** `kodnest-design-system.css`
- **Layout and demo:** Apply classes to your app shell; see `index.html` for structure example.

Everything must feel like one mind designed it. No visual drift.

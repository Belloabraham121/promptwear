<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Styling

- **Use Tailwind CSS for all styling** (utility classes in components). The project already has Tailwind v4 via `@import "tailwindcss"` in `src/app/globals.css`.
- Prefer `className` utilities over new CSS modules, new global CSS, or expanding `landing.css`.
- Reuse brand tokens already in the app: ink `#070807`, bone `#f3f0e8`, lime `#d6ff3c`, display font `var(--font-display)`, body font `var(--font-body)`.
- When editing an existing screen that still uses `landing.css`, match nearby patterns only as needed — do not grow that stylesheet for new UI. New sections and components should be Tailwind-first.
- Use `cn()` from `src/lib/utils.ts` (`clsx` + `tailwind-merge`) when composing conditional classes.

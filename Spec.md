# **Wisdom Studio — Project Spec**

A Canva-like design app for creating print-ready PDFs from audio scripts, writing, coloring pages, flyers, and storybooks. Free and open-source stack only. Built accessible-first for adults 50+. Outputs are given away free (not sold), so the AI image backend is AI Horde rather than a paid API.

## **Tech stack**

* Frontend: React \+ Vite  
* Canvas/design engine: Konva.js (MIT) with react-konva  
* AI image generation: AI Horde REST API (aihorde.net), using an existing registered API key stored as `AI_HORDE_API_KEY` in `.env` — never hard-code it. Build the image-gen module behind a clean interface/adapter so a self-hosted model (FLUX.1-schnell or SDXL via ComfyUI) could be swapped in later without touching the rest of the app, in case a paid tier gets added down the line.  
* AI Horde is async: requests are queued and processed by volunteer workers, so generation can take seconds to a couple of minutes. Poll the job status endpoint and show a clear, friendly "generating your image..." progress state in the UI rather than a blocking spinner with no explanation.  
* PDF export: pdf-lib  
* Backend: Node.js \+ Express, SQLite for local project storage  
* No proprietary/paid SaaS dependencies anywhere in the default setup

## **Phases**

Build in phases. Confirm each phase works before moving to the next.

### **Phase 1 — Canvas editor foundation**

* Blank canvas \+ drag/drop text boxes, shapes, image placeholders  
* Multi-page documents (for storybooks/flyers)  
* Templates for: coloring page, flyer, storybook page, lyric/script sheet  
* Layers panel, undo/redo, resize/rotate/align tools  
* Save/load projects locally

### **Phase 2 — AI image generation integration**

* A panel to type a prompt (or select from imported script text) that calls the AI Horde API to generate an image  
* Submit the generation job, poll for completion, show progress clearly  
* Let the user pick which Stable Diffusion model AI Horde should use, but default to a sensible general-purpose model  
* Generated images drop directly onto the canvas as an editable layer  
* "Coloring page" mode: prompt engineering for line-art/outline-style images suitable for printing and coloring in  
* Prompt templates for consistent style (storybook illustration, flyer graphic, coloring page line art)  
* Handle failures/timeouts gracefully (e.g. low queue priority during high load) with a clear retry option

### **Phase 3 — Content import**

* Import plain text / .docx / .txt of scripts or writing  
* Auto-flow text into storybook page templates or flyer layouts  
* Select passages to turn into AI image prompts

### **Phase 4 — PDF export**

* Export any project (single page or multi-page) to a print-ready PDF  
* Export presets: US Letter, A4, booklet/storybook page order

### **Phase 5 — Accessibility**

Hard requirements, not optional polish. Build in from the start, not as a later pass.

* Full screen reader support: ARIA labels/roles on every control, logical tab order, skip-to-content links, live-region announcements for canvas actions (e.g. "Image added to page 2")  
* Dictation: Web Speech API so text can be dictated into any text box  
* Text-to-speech: a "read this aloud" button on any text block, using speechSynthesis  
* Large, adjustable UI type: a global font-size slider affecting the whole app UI, minimum 16px base, scalable to at least 200% without breaking layout  
* High-contrast mode toggle, colorblind-safe default palette  
* Large click/tap targets (minimum 44x44px) throughout — no tiny icon buttons as the only way to trigger an action  
* Keyboard-only operability for every feature  
* Avoid time-limited interactions, auto-advancing carousels, or anything that disappears before the user can act on it  
* Plain-language labels and tooltips (avoid jargon like "z-index" — use "bring to front" etc.)  
* Test against WCAG 2.1 AA as a baseline

## **Design/UX**

* Warm, colorful, uncluttered UI — favor a small number of big, clearly labeled actions over dense toolbars  
* Onboarding: a "start from a template" home screen with large visual previews (coloring page / flyer / storybook / script sheet)  
* Autosave, with a visible "last saved" indicator

## **Deliverables for the first build session**

1. Scaffold the project (React \+ Vite frontend, Express backend)  
2. Set up a Konva.js canvas with one working template type end-to-end  
3. Wire up AI Horde image generation using the API key in `.env` (`AI_HORDE_API_KEY`) — submit request, poll job status, handle the async wait with a clear progress UI  
4. Get PDF export working for that one template  
5. Bake in the Phase 5 accessibility requirements from the start  
6. A README explaining how to run everything locally, where to put the AI Horde API key, and how AI Horde's queue/kudos system affects generation speed

Ask clarifying questions before starting if anything above is ambiguous, but default on anything reasonable (e.g., US Letter default, light theme default with a dark/high-contrast toggle).


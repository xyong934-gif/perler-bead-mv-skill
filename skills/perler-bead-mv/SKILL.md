---
name: perler-bead-mv
description: >-
  Interactive step-by-step director skill for turning a character concept or
  Perler-bead image and BGM audio into a glossy 1080p pixel Perler-bead game
  style animation MV (or 4K die-cut bead sticker sheet). Use this skill whenever
  the user asks to create a Perler-bead (拼豆) pixel art video, pixel-bead MV,
  plastic-bead sticker animation, or asks to run the Perler-bead video workflow.
  Guides the user interactively with targeted questions to gather character art,
  music, theme, and style preferences, extracts exact bead grids, analyzes BGM
  beats, previews sprite sheets and storyboards for user feedback, and renders
  the final verified 1080p MP4.
---

# Perler-Bead Pixel Game MV Director (`perler-bead-mv`)

Turn any character idea (or uploaded Perler-bead reference image) + music track into a crisp, zero-blur **1080p glossy Perler-bead pixel-game animation MV** (or 4K die-cut Perler-bead sticker sheet & bead pattern).

Instead of feeding images into AI video models (which melt beads into blurry mush), this workflow extracts/constructs crisp **2D bead grids**, renders every single bead procedurally with a **signature center pinhole + plastic specular highlight + white die-cut sticker rim**, syncs stage themes and particle bursts to **real audio beat analysis**, and encodes directly to 1080p MP4 via Headless Chromium + FFmpeg.

---

## Core Interaction Rule (MUST FOLLOW)

**ALWAYS guide the user interactively step by step.** Never guess unstated creative choices or jump straight into final 1080p rendering without user confirmation at the key checkpoints:

1. **Ask concise, friendly questions** (skip anything the user already supplied).
2. **Offer turnkey prompts** when the user doesn't have an image or BGM yet (load [references/prompts.md](./references/prompts.md)).
3. **Always show visual previews first** (sprite sticker sheet + 16-frame storyboard) and invite the user to critique/refine before running the full MP4 render.

---

## Step-by-Step Guided Workflow

### Step 1 — Interactive Creative Intake (Ask & Collect Assets)

Start by greeting the user and checking what they already have. Ask only the missing items from these 4 short questions (use plain numbered questions or multiple-choice UI):

1. **主角素材（Character Art）**：
   - 已经有想做的角色图/拼豆图了吗？如果有，请直接发给我。
   - **如果没有**：告诉我你想画什么角色（动物/人物/配色/服装/小动作），我会直接给你一套 **Codex / AI 生图提示词**（见 [references/prompts.md](./references/prompts.md)），或者直接调用可用生图工具帮你生成，等你选定最满意的一张再继续！
2. **背景音乐（BGM Audio）**：
   - 已经有想配的歌（`.mp3` / `.wav`）了吗？如果有，请直接上传或发路径。
   - **如果没有**：告诉我你想要什么曲风氛围（比如：可爱任天堂复古像素 / 元气糖果 / 燃向闯关 Boss 战），我给你写好 **Suno / Udio 曲风提示词 + 分段歌词模板**（见 [references/prompts.md](./references/prompts.md)），你生成好下载拖进来即可。
   - *(如果用户不需要视频，只想做 **4K 透明底拼豆贴纸图 / 实体拼豆色号图纸**，跳过音频与视频步骤，直接用 [scripts/perler_renderer.js](./scripts/perler_renderer.js) 导出高清贴纸与图纸！)*
3. **主题世界与剧情元素（Theme & Props）**：
   - 想把主角放进什么主题世界？（例如：巴黎甜点大冒险、樱花校园、森林寻宝、赛博霓虹、太空漫游）
   - 有没有想加的专属道具、地标、终极 Boss，或者客串小伙伴？
4. **字幕与规格（Lyrics & Output）**：
   - 画面上需要同步显示歌词/台词气泡吗？（需要的话请提供歌词，或让我按音乐段落帮你写可爱的像素游戏台词）
   - 输出偏好：默认 **`1920×1080` · `30fps`（或 `60fps`）MP4**，如需横竖屏（如 `9:16` 短视频）提前说明。

Wait for the user's reply before moving to Step 2. If they need image or music prompts first, give them ready-to-copy prompts from [references/prompts.md](./references/prompts.md) and wait until they return with the image and/or audio file.

---

### Step 2 — Extract 1:1 Bead Grid & Analyze BGM Beats

Once you have the character image and audio file, create a clean working directory for the user's project and run the bundled zero-dependency Node.js helper scripts:

1. **Extract 1:1 Perler-Bead Grid & Limited Palette from Character Image**:
   ```bash
   node "<skill_dir>/scripts/extract_beads.js" \
     --input "<user_character_image>" \
     --output "<project_dir>/hero_beads.json" \
     --cols 28 \
     --colors 10
   ```
   - Inspect the terminal ASCII grid preview (and refine `--cols` / `--colors` or clean stray edge beads if needed) so the character silhouette, eyes, outline, and signature colors match the uploaded art faithfully.
   - Design 4–5 expressive pose variations (`wave`, `run1`, `run2`, `happy`, `starry`) plus 6–8 themed Perler-bead props and a themed Boss sprite based on Step 1's theme.

2. **Analyze Audio Duration, BPM, Beat Phase & Per-Frame Energy**:
   ```bash
   node "<skill_dir>/scripts/analyze_audio.js" \
     --input "<user_audio_file>" \
     --output "<project_dir>/audio_analysis.json" \
     --fps 30
   ```
   - Read the printed energy timeline (`0s .. duration`) to map exact song sections (`Intro`, `Verse`, `Pre-Chorus`, `Fever Chorus`, `Boss Battle`, `Final Chorus`, `STAGE CLEAR`) to real musical drops and pauses.

---

### Step 3 — Build the Perler-Bead Animation Engine & Preview First

Assemble the project's rendering files in `<project_dir>/` using [scripts/perler_renderer.js](./scripts/perler_renderer.js) and stage design recipes from [references/scene-recipes.md](./references/scene-recipes.md):

- **`perler_renderer.js`**: Copy from `<skill_dir>/scripts/perler_renderer.js` — provides `drawBead` (radial plastic gradient + center pinhole + upper-left specular glint), `getStickerCanvas` (thick `#FFFFFF` die-cut sticker rim + soft purple-tinted drop shadow), and `extractBeadList` (for Boss bead-shatter particle explosions!).
- **`sprites.js`**: Stores the extracted hero bead grids (`hero_beads.json` + poses), custom palette, themed props, and Boss grids.
- **`lyrics.js`** *(optional)*: Timestamped kinetic game-style lyrics / speech bubbles.
- **`scenes.js`**: Multi-stage pixel-game director synced to `audio_analysis.json`:
  - Scrolling perspective checkerboard floor + subtle graph-paper sky grid + layered pastel hills;
  - Retro arcade HUD (stage badge, live combo counter, heart icons);
  - Beat-reactive hero squash-and-stretch bounces, afterimage trails during Fever Time, `?` question blocks popping themed props, Boss HP bar + full-screen colorful bead-shatter KO burst, and `STAGE CLEAR S++` victory celebration!
- **`render.html`**: Loads `perler_renderer.js`, `sprites.js`, `lyrics.js`, `scenes.js`, supporting `?mode=keyframes` (saves `preview_perler_sprites.png` + `storyboard_perler_16.png`) and `?mode=render` (streams 1080p raw RGBA frames to `render_mv.js`).

**MANDATORY PREVIEW GATE (DO NOT SKIP):**
Run keyframes preview first:
```bash
node "<skill_dir>/scripts/render_mv.js" \
  --workdir "<project_dir>" \
  --audio "<user_audio_file>" \
  --keyframes
```
Inspect BOTH `preview_perler_sprites.png` and `storyboard_perler_16.png` yourself first (fix any clipping, ugly outline, misaligned ground shadow, or unreadable text), then **show both preview images to the user** and ask for feedback!

---

### Step 4 — Interactive Polish Loop (Invite User Critique)

When presenting `preview_perler_sprites.png` and `storyboard_perler_16.png` to the user, briefly highlight what's included and offer quick polish options so they can steer the look effortlessly:
- 豆粒孔洞与塑料高光是否够明显？白色贴纸描边需不需要加粗？
- 主角造型/动作表情和原图还原度是否满意？
- 各段落舞台配色、道具、Boss 爆豆特效或字幕样式要不要调整？

Iterate quickly on `sprites.js` / `scenes.js` and re-run `--keyframes` until the user replies approving the preview (e.g., `"可以了，开始渲染"`).

---

### Step 5 — Render 1080p MP4 & Mandatory Decoded-Frame Verification

1. Run the full 1080p render:
   ```bash
   node "<skill_dir>/scripts/render_mv.js" \
     --workdir "<project_dir>" \
     --audio "<user_audio_file>" \
     --output "<project_dir>/perler_mv_1080p.mp4"
   ```
   - `render_mv.js` automatically detects FFmpeg (prefers `h264_nvenc` when available, smoothly falls back to `libx264`) and local Chromium/Chrome.
2. **Mandatory Verification**:
   - Check output MP4 stream metadata (resolution `1920x1080`, frame rate, duration matching audio, AAC audio track present).
   - Decode 4 representative frames directly from the encoded MP4 into `qa_encoded_4.png` via FFmpeg and visually inspect it to confirm zero black frames, zero corruption, and crisp Perler-bead detail.
3. Deliver the final MP4 path (plus preview/QA sheets and any optional 4K sticker exports) clearly to the user!

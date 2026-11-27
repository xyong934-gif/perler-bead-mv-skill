# Perler-Bead Prompt & Polish Reference

Use these turnkey templates during **Step 1 (Guided Intake)** and **Step 4 (Polish Loop)** whenever the user needs help generating a character image, creating BGM audio, or refining visual quality.

---

## 1. Character Image Generation Prompt (Codex / Imagen / Midjourney / Flux)

Give the user this clean prompt (replace `【...】` with their character description):

```text
画一张正面视角的像素拼豆（Perler beads）风角色图：【戴着明黄色渔夫帽和黄围巾的淡紫色 Q 版小企鹅，奶白肚皮，粉腮红，挥手打招呼】。
整齐的像素网格排列，每颗塑料豆子带圆角、中心小圆孔和柔和塑料高光，使用深棕色拼豆描清晰外轮廓，整体配色控制在 8-12 种以内、明快干净无杂色。
纯黑色极简背景，完整全身居中无裁切，不要任何文字和水印，高清微距手工质感。
```

**English Variant (for Midjourney / Flux / English tools):**
```text
Front-facing orthographic cute Perler beads (fuse beads) pixel-art character sprite: [a chubby pastel-lavender baby penguin wearing a sunny yellow bucket hat and cozy yellow scarf, cream-white heart belly, rosy coral cheeks, waving happily]. Strictly aligned uniform square bead grid, every plastic bead showing rounded edges, crisp center pinhole, and soft specular plastic shine. Clean dark cocoa-brown bead outline, limited bright palette of 8-12 distinct bead colors, zero muddy gradients. Solid pitch-black background, full body centered with margin, zero text, zero watermark, crisp macro studio lighting.
```

### Key Image Checklist (for clean 1:1 bead extraction)
- **Solid black or solid white background** (no noisy scenery behind the hero)
- **Orthographic front or slight 3/4 view** (avoid heavy wide-angle distortion)
- **Dark bead outline + clean color blocks** (8–12 distinct colors read best at 24–34 beads wide)

---

## 2. BGM Music Generation Prompt (Suno / Udio)

### Style of Music (Recommended — Retro Cute Pixel Game)
```text
Kawaii Future Bass, 8-bit chiptune, upbeat retro Nintendo arcade pop, bouncy synth leads, crisp punchy drums, sparkling game coin SFX, cheerful energetic female vocal, 148 BPM, catchy chorus, playful boss battle bridge, stage clear victory fanfare outro
```

### Alternative Style — High-Energy Action / Boss Rush
```text
Energetic 16-bit chiptune rock, upbeat anime arcade soundtrack, punchy synth bass, crisp snare drums, sparkling arpeggios, exciting boss phase change, 156 BPM, joyful victory fanfare outro
```

### Optional Structured Lyrics Template (or toggle `Instrumental` ON for pure BGM)
```text
[Intro - 8-bit arcade start sound]
Beep-boop! Press start!
Ready, steady, let's go!

[Verse - bouncy chiptune]
【主角特征，例如：小黄帽、暖围巾，小企鹅活力开跑】
【主题场景，例如：跳起来顶像素砖块，嘭！一路收集小星星】

[Pre-Chorus - rising synth]
Ding-ding-ding! 彩虹能量条满格！
Three, two, one — FEVER TIME!

[Chorus - super catchy, high energy]
Dash, dash! 冲上像素天空！
Combo up! Sparkles pop!
最甜的像素大冒险，一起跳到最高空！

[Bridge - dramatic retro boss battle]
等等！前方巨型 Boss 出现了！
Crack! Crack! 完美一击，星光大爆发！

[Outro - 8-bit victory fanfare]
Stage clear! Yay!
```

---

## 3. Common Polish Commands (for Step 4 Feedback Loop)

Offer these quick refinements to the user after showing the preview sheet:
- **Stronger Perler-bead tactile realism**: Increase center pinhole contrast & upper-left glossy plastic highlight; thicken the white die-cut sticker rim (`borderPad: 0.72`); exaggerate squash-and-stretch on beat landings.
- **Richer MV pacing & energy**: Add distinct stage color theme switches per song section (macaron pink → sunny sky → rainbow fever → dark-violet boss → victory pastel) + afterimage motion trails + full-screen bead-shatter explosion on Boss KO.
- **Static 4K Export Mode (No Video)**: Export transparent-background 4K die-cut PNG sticker sheets, pastel grid poster art, and a numbered Perler-bead color grid chart for real-world crafting.

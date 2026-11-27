# Perler-Bead Stage Themes, HUD & Animation Recipes

Reference visual recipes for building `scenes.js` and `sprites.js` in the Perler-Bead Pixel Game MV workflow.

---

## 1. Signature Visual Rules (Why It Looks Like Real Perler Beads, Not Blurry Mosaic)

1. **Glossy Cylindrical Plastic Beads**:
   - Render each grid cell via `PERLER.drawBead(ctx, cx, cy, size, hex)`:
     - Radial plastic body gradient (bright upper-left tint → true bead color → subtle shaded lower-right edge)
     - Crisp center pinhole (`holeR = r * 0.31`, shaded dark on bright beads, soft silver-tinted on pitch-black beads so holes stay legible!)
     - Tiny upper-left glossy specular dot (`rgba(255,255,255,0.55)`)
2. **White Die-Cut Sticker Rim**:
   - Wrap every sprite (`hero`, `props`, `boss`, `landmarks`) in a thick continuous `#FFFFFF` rounded outline (`borderPad = 0.65`) plus a soft tinted drop shadow (`rgba(75, 38, 90, 0.28)`).
   - Gives instant tabletop-craft / sticker-book depth separation over pastel grid backgrounds.
3. **Zero Blurry Scaling**:
   - Pre-render stickers on offscreen HiDPI canvases (`dpr = 1.5` for 1280×720 logical space → crisp native `1920×1080` output!).

---

## 2. Proven Stage Color Themes (`THEMES`)

Swap themes automatically on musical section transitions (`Intro` → `Verse` → `Sky` → `Fever` → `Boss` → `Night Finale` → `Victory`):

```js
const THEMES = {
  macaron_pink: {
    skyTop: '#FDB4D4', skyMid: '#FFE0EE', skyBot: '#FFF8FC',
    grid: 'rgba(255,255,255,0.48)', floorA: '#F792BC', floorB: '#FFFFFF',
    hill1: '#FFA2CA', hill2: '#FFCBE2', accent: '#FF4E98',
  },
  golden_morning: {
    skyTop: '#FFD666', skyMid: '#FFF0B4', skyBot: '#FFFDF2',
    grid: 'rgba(255,255,255,0.52)', floorA: '#FFB84C', floorB: '#FFFFFF',
    hill1: '#FFC868', hill2: '#FFE4A4', accent: '#E88212',
  },
  sky_dash: {
    skyTop: '#56BCFF', skyMid: '#B2E4FF', skyBot: '#F2FAFF',
    grid: 'rgba(255,255,255,0.50)', floorA: '#55B4FA', floorB: '#FFFFFF',
    hill1: '#8CD4FF', hill2: '#C8EAFF', accent: '#2494FF',
  },
  rainbow_fever: {
    skyTop: '#FFA4D4', skyMid: '#FFECB2', skyBot: '#C8F6FF',
    grid: 'rgba(255,255,255,0.55)', floorA: '#FF8AC4', floorB: '#FFFFFF',
    hill1: '#86E8A2', hill2: '#B8F6C8', accent: '#FF4E98',
  },
  boss_violet: {
    skyTop: '#1E0D36', skyMid: '#48227A', skyBot: '#9466D2',
    grid: 'rgba(255,215,255,0.18)', floorA: '#4E2488', floorB: '#DACAF8',
    hill1: '#150828', hill2: '#2E1352', accent: '#FF3888',
  },
  starry_night: {
    skyTop: '#14124A', skyMid: '#3C2488', skyBot: '#C87AD0',
    grid: 'rgba(255,255,255,0.22)', floorA: '#6834E4', floorB: '#F8E4FF',
    hill1: '#1C144C', hill2: '#3C2880', accent: '#FFE047',
  },
};
```

---

## 3. High-Impact Beat-Synced Mechanics

- **Perspective Scrolling Checkerboard Floor**: Classic 16-bit Mode-7 / Super Mario style horizontal striped perspective plane scrolling proportionally to song energy (and turning rainbow-striped during Fever Chorus!).
- **Beat Bounce + Squash & Stretch**: On every beat peak (`bass` / `onset`), animate `scaleX = 1 + pulse * 0.14`, `scaleY = 1 - pulse * 0.12` on landing and stretch vertically mid-jump.
- **Arcade HUD**: Top-left `{TITLE}`, `SCORE`, `COMBO xN!`; top-right `STAGE` pill + 4 glossy pixel hearts.
- **Question Block Pop (`?`)**: Hero jumps into a Perler-bead `?` block on a snare/kick hit, launching themed Perler-bead collectibles in parabolic arcs.
- **Boss Bead-Shatter Explosion**: Use `PERLER.extractBeadList(bossGrid, beadSize)` to turn every single bead of the defeated Boss into an individual physics particle (radial velocity + gravity + bounce on floor + shockwave ring + `KABOOM!! PERFECT KO!!`).
- **Outro Victory Fanfare**: Center the hero flanked by landmarks/props under a golden Perler star with a crisp `STAGE CLEAR!! · RANK S++` panel.

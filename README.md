# Petit

A small home for small things: generative art, little browser games, and a few handy tools. Everything is plain HTML, CSS and vanilla JavaScript with no dependencies, served with GitHub Pages.

**Live site:** https://grot666.github.io/Petit/

## 今日 Petit · Today

https://grot666.github.io/Petit/today/

Each day a new generative artwork (seeded from the local date) and a small challenge linked to one of the games. Download the PNG, browse previous days with `?date=YYYY-MM-DD`, and keep a streak in your browser's `localStorage`. Same day, same piece — for everyone.

## Experiments · 小实验

https://grot666.github.io/Petit/lab/

Four short interactive toys:

- [Fireworks](https://grot666.github.io/Petit/lab/fireworks/) — tap to launch particle fireworks
- [Fluid Doodle](https://grot666.github.io/Petit/lab/fluid/) — drag smoky ink across the page
- [Sound Visualizer](https://grot666.github.io/Petit/lab/sound/) — microphone (after you allow) or a tiny generative melody; nothing recorded
- [Pixel Creatures](https://grot666.github.io/Petit/lab/creatures/) — symmetric critters with names, PNG download, and `?seed=` share links

## Artworks · 小艺术品

https://grot666.github.io/Petit/art/

Five interactive generative pieces, each with a PNG download:

- [Wind Trees · 风中的树](https://grot666.github.io/Petit/art/tree/) — stochastic L-system trees that grow and sway; tap to plant
- [Turing Patterns · 图灵斑纹](https://grot666.github.io/Petit/art/turing/) — Gray-Scott reaction-diffusion with presets; drag to stir
- [Stained Glass · 彩色玻璃](https://grot666.github.io/Petit/art/glass/) — leaded, back-lit Voronoi window; tap to add a pane
- [Pocket Galaxy · 口袋星系](https://grot666.github.io/Petit/art/galaxy/) — a differentially rotating spiral of ~5,000 stars; drag to tilt
- [Kaleidoscope · 万花筒](https://grot666.github.io/Petit/art/kaleido/) — draw one stroke, get a mirrored mandala (6–16×), or let it auto-draw

## Tools · 小工具

https://grot666.github.io/Petit/tools/

- [Pomodoro · 番茄钟](https://grot666.github.io/Petit/tools/pomodoro/) — focus / short / long break with chime and daily tomato count
- [Palette · 配色生成](https://grot666.github.io/Petit/tools/palette/) — harmonious five-colour palettes; lock, copy hex, share via URL hash
- [Decision Wheel · 决定转盘](https://grot666.github.io/Petit/tools/wheel/) — type options, spin; list saved locally
- [Word Counter · 字数统计](https://grot666.github.io/Petit/tools/wordcount/) — Chinese characters and English words counted separately, plus reading time
- [Breathe · 呼吸练习](https://grot666.github.io/Petit/tools/breathe/) — box, 4-7-8 and calm breathing paced by an animated circle

Nothing leaves the page; settings live in `localStorage`.

## Gallery

https://grot666.github.io/Petit/gallery/

A minimal online gallery of eight generative works drawn live on `<canvas>`:

| | Title | Idea |
|---|---|---|
| I | *Drift* | Ink lines following a Perlin-noise flow field |
| II | *Partition* | Recursive subdivision in primary colours |
| III | *Quorum* | Circle packing inside a circle |
| IV | *Isobar* | Noise contour lines (marching squares) |
| V | *Slow Orbits* | Animated orbiting bodies with fading trails |
| VI | *Wash* | Layered, deformed polygons that read as watercolour |
| VII | *Undulation* | Op-art wave bands |
| VIII | *Morning Grid* | Hand-drawn pencil grid over pale bands |

Each piece is seeded, so it is deterministic within a day and shifts slightly from day to day.

## Games

https://grot666.github.io/Petit/games/

- [Snake](https://grot666.github.io/Petit/games/snake/): arrow keys, WASD or swipe
- [2048](https://grot666.github.io/Petit/games/2048/): arrow keys, WASD or swipe
- [Typing Test](https://grot666.github.io/Petit/games/typing/): 30-second WPM and accuracy
- [Memory](https://grot666.github.io/Petit/games/memory/): find the eight pairs
- [Dual N-Back](https://grot666.github.io/Petit/games/dual-n-back/): brain training with position and spoken-letter matching, adaptive N
- [九路围棋 9×9 Go](https://grot666.github.io/Petit/games/go9/): online rooms (peer-to-peer WebRTC via PeerJS) or local two-player; Chinese area scoring, komi 7
- [Minesweeper](https://grot666.github.io/Petit/games/minesweeper/): 9×9, right-click or long-press to flag
- [Five Letters · 猜词](https://grot666.github.io/Petit/games/wordle/): Wordle-style 5-letter word, daily or endless, on-screen keyboard
- [Sokoban · 推箱子](https://grot666.github.io/Petit/games/sokoban/): five Microban levels (by David W. Skinner), undo, swipe or D-pad
- [Breakout · 打砖块](https://grot666.github.io/Petit/games/breakout/): paddle follows mouse or finger; levels speed up
- [15 Puzzle · 数字华容道](https://grot666.github.io/Petit/games/fifteen/): 3×3, 4×4 or 5×5 sliding tiles, always solvable
- [Reaction Time · 反应测试](https://grot666.github.io/Petit/games/reaction/): wait for green, average of five taps

Best scores are kept in your browser's `localStorage`.

## Tests

```sh
node tests/go9.test.js   # Go rules: capture, ko, suicide, scoring, undo
```

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

# Petit

A small home for small things: generative art and little browser games. Everything is plain HTML, CSS and vanilla JavaScript with no dependencies, served with GitHub Pages.

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

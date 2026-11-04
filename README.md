# Petit

A small home for small things: generative art and little browser games. Everything is plain HTML, CSS and vanilla JavaScript with no dependencies, served with GitHub Pages.

**Live site:** https://grot666.github.io/Petit/

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
- [Minesweeper](https://grot666.github.io/Petit/games/minesweeper/): 9×9, right-click or long-press to flag

Best scores are kept in your browser's `localStorage`.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

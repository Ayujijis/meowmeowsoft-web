export const projects = [
  {
    slug: 'dbmaker',
    title: 'DBmaker',
    tags: ['.NET', 'WASM', 'SQL Server'],
    summary:
      'Design Microsoft SQL Server schemas in the browser: tables, keys, and relationships on a canvas, with JSON and T-SQL on your machine.',
    problem:
      'Sketching a database often means bouncing between diagrams and CREATE TABLE scripts, with no single place to validate the design.',
    how: [
      'DBmaker is a client-only Blazor WebAssembly editor. The schema lives in memory; nothing is uploaded to a backend.',
      'Open a .dbmaker.json project or a T-SQL script (CREATE TABLE). Download JSON or SQL when you are done.',
      'Drag tables, connect foreign keys, or right-drag to choose 1:1, 1:N, or N:N. Validate / improve runs legal checks and design suggestions.',
    ],
    stack: '.NET 10, Blazor WebAssembly, shared DBmaker.Core library (same model as the desktop app).',
    accent: '#d40000',
    liveUrl: 'https://dbmaker.meowmeowsoft.com',
    liveLabel: null,
    playUrl: null,
  },
  {
    slug: 'pacman',
    title: 'Pac-Man',
    tags: ['Canvas', 'JavaScript'],
    summary:
      'A browser clone of the classic maze: four ghosts, power pellets, lives, and a high score stored on your device.',
    problem:
      'A small, playable game is a clear way to show real-time loops, collision, and AI without a heavy engine.',
    how: [
      'HTML5 Canvas and ES modules. Pac-Man moves on the grid; Blinky, Pinky, Inky, and Clyde chase with distinct behaviors.',
      'Eat dots to clear the level. Power pellets turn ghosts frightened so you can eat them. High score is saved in localStorage.',
      'Play in the browser from this site — no install.',
    ],
    stack: 'HTML, CSS, JavaScript (Canvas). Runs as static files at /play/pacman/.',
    accent: '#8b0000',
    liveUrl: null,
    liveLabel: null,
    playUrl: '/play/pacman/',
  },
]

export function getProject(slug) {
  return projects.find((project) => project.slug === slug)
}

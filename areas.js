// The riverfront row, west to east. Area copy lives here; projects come from data.js,
// which scripts/build-content.mjs generates from content/*.json.
export const AREAS = [
  {id: 'websites', name: 'Websites & Client Work', short: 'Websites', theme: 'studio', accent: '#2f6f6a',
    kicker: 'THE STUDIO / CLIENT WORK', h2: 'Websites.<br><em>For real businesses.</em>',
    lead: 'Sites, storefronts and the platform behind them, built for local businesses and independent makers.'},
  {id: 'code', name: 'Code & Apps', short: 'Code & Apps', theme: 'shop', accent: '#3f7c96',
    kicker: 'THE MACHINE SHOP / SOFTWARE', h2: 'Code & Apps.<br><em>Tools that do a job.</em>',
    lead: 'Web applications, platforms and tools. Some are running, some are still on the bench.'},
  {id: 'writing', name: 'Writing', short: 'Writing', theme: 'reading', accent: '#7a4a2c',
    kicker: 'THE READING ROOM / BOOKS', h2: 'Writing.<br><em>Stories, finished and underway.</em>',
    lead: 'Novels, novellas, picture books and story worlds, from full drafts to living outlines.'},
  {id: 'games', name: 'Games', short: 'Games', theme: 'arcade', accent: '#b8862f',
    kicker: 'THE ARCADE / GAMES IN DEVELOPMENT', h2: 'Games.<br><em>Systems you can play.</em>',
    lead: 'Strategy, management and action games across Godot, Unreal, Unity and the browser, from first prototypes to playable builds.'},
  {id: 'automation', name: 'Automation & AI', short: 'Automation', theme: 'mill', accent: '#6b6f3a',
    kicker: 'THE MILL / PIPELINES', h2: 'Automation & AI.<br><em>Let the river turn the wheel.</em>',
    lead: 'Pipelines, agents and workflows that take repetitive work off the desk and keep a human in charge of the result.'},
];
export const AREA = Object.fromEntries(AREAS.map(a => [a.id, a]));

// Every building on the row and what it opens. kind: area = enter the building,
// page = open an editorial page.
export const BUILDINGS = {
  workshop: {kind: 'page', page: 'about', label: "James's workshop"},
  spinebound: {kind: 'page', page: 'venture/spinebound', label: 'Spinebound Books'},
  'hollow-harbor': {kind: 'page', page: 'venture/hollow-harbor', label: 'Hollow Harbor Press'},
  contact: {kind: 'page', page: 'contact', label: "Let's talk"},
  websites: {kind: 'area', area: 'websites', label: 'Websites & Client Work'},
  code: {kind: 'area', area: 'code', label: 'Code & Apps'},
  writing: {kind: 'area', area: 'writing', label: 'Writing'},
  games: {kind: 'area', area: 'games', label: 'Games'},
  automation: {kind: 'area', area: 'automation', label: 'Automation & AI'},
};

export const STATUS_ORDER = ['Live', 'Playable', 'In progress', 'Prototype', 'Concept'];

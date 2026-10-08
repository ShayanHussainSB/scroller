// Shared by the page script and the popup.
const DEFAULTS = {
  key: 's', fasterKey: ']', slowerKey: '[',
  pxs: 40,              // speed in pixels per second
  mode: 'smooth',       // 'smooth' = continuous glide, 'step' = jump a chunk of screen at a time
  step: 0.75,           // fraction of the screen per jump in step mode
  dir: 1,               // 1 = down, -1 = up
  atEnd: 'stop',        // 'stop' or 'wait' (wait = keep going once lazy-loaded pages appear)
  pauseOnManual: true,  // pause briefly when you scroll yourself
  badge: true,          // on-page status pill
};
const MIN = 1, MAX = 5000;
const PRESETS = [
  ['Too damn slow', 2],
  ['Slow', 12],
  ['Reading', 40],
  ['Brisk', 120],
  ['Fast', 500],
  ['Too damn fast', 3000],
];

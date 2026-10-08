// Shared by the page script and the popup.
const DEFAULTS = {
  key: 's', fasterKey: ']', slowerKey: '[',
  holdKey: 'Shift',      // hold to pause, release to carry on
  nudge: 1.25,          // faster multiplies speed by this, slower divides by it
  pxs: 40,              // speed in pixels per second (last used; the starting speed for new sites)
  sites: {},            // hostname -> px/s, remembered automatically
  mode: 'smooth',       // 'smooth' = continuous glide, 'step' = jump a chunk of screen at a time
  step: 0.75,           // fraction of the screen per jump in step mode
  dir: 1,               // 1 = down, -1 = up
  atEnd: 'stop',        // 'stop', 'wait' (for lazy-loaded pages) or 'next' (open the next chapter)
  pauseOnManual: true,  // pause briefly when you scroll yourself
  badge: true,          // on-page status pill
};
const MIN = 1, MAX = 5000;
const MODIFIERS = ['Shift', 'Control', 'Alt', 'Meta'];
const PRESETS = [
  ['Too damn slow', 2],
  ['Slow', 12],
  ['Reading', 40],
  ['Brisk', 120],
  ['Fast', 500],
  ['Too damn fast', 3000],
];

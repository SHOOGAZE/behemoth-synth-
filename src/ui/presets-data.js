/* ------------------------------------------------ presets */
function R(s, d, a) { return { s: srcIdx(s), d: dstIdx(d), a: a }; }

var SQ = shape('sq'), SNE = shape('sine'), TRI = shape('tri'), SAWL = shape('saw');
var BHM = [
  { name: 'Behemoth Growl', cat: 'BASS', p: { aLev: 1, aOct: -1, bOn: 1, bOct: -1, aUni: 3, aDet: .25, bUni: 2, bDet: .2, aPos: .35, bPos: .6, aWMode: 3, aWarp: .4, bWMode: 8, bWarp: .3, bLev: .75, subOn: 1, subLev: .6, fType: 7, fCut: .5, fRes: .4, fDrive: .45, mono: 1, glide: .04, e1A: .003, e1D: .3, e1S: 1, e1R: .15, l1Rate: 4.667, l2Rate: 2.333, fxDrive: .4, chMix: .12, vol: 1 },
    routes: [R('lfo1', 'fCut', .55), R('lfo1', 'aPos', .25), R('m1', 'bWarp', .5), R('m2', 'fDrive', .4), R('lfo2', 'aWarp', .25), R('ypos', 'fCut', .25)], tables: ['Analog Saw', 'Digital Grit'] },
  { name: 'Wobble 1/8', cat: 'BASS', p: { aOct: -1, aUni: 2, aDet: .12, aPos: .1, subOn: 1, subLev: .5, fType: 1, fCut: .36, fRes: .6, fDrive: .25, mono: 1, glide: .03, e1D: .2, e1S: 1, l1Rate: 4.667, fxDrive: .2, vol: .5 },
    routes: [R('lfo1', 'fCut', .5), R('m1', 'fRes', .3), R('m2', 'aPos', .4)], tables: ['Analog Saw', 'Basic Shapes'] },
  { name: 'Triplet Wub', cat: 'BASS', p: { aOct: -1, bOn: 1, bOct: -1, bLev: .45, bFine: 9, aUni: 3, aDet: .2, fType: 5, fCut: .34, fRes: .5, fDrive: .4, mono: 1, glide: .05, e1S: 1, e1D: .2, l1Rate: 7, l2Rate: 3.5, subOn: 1, subLev: .35, fxDrive: .3, vol: .65 },
    routes: [R('lfo1', 'fCut', .5), R('lfo2', 'bPos', .5), R('m1', 'fDrive', .4)], tables: ['Analog Saw', 'Analog Saw'] },
  { name: 'Yoi Yoi', cat: 'BASS', p: { aLev: 1, aOct: -1, aUni: 4, aDet: .2, aPos: .15, bOn: 1, bOct: -1, bLev: .7, fType: 7, fCut: .5, fRes: .45, fDrive: .3, mono: 1, glide: .06, e1S: 1, e1D: .2, l1Rate: 2.333, l2Rate: 4.667, fxDrive: .3, vol: 1 },
    routes: [R('lfo1', 'fCut', .6), R('lfo1', 'aPos', .5), R('lfo2', 'bPos', .3), R('m1', 'fRes', .3)], tables: ['Vowel Choir', 'Analog Saw'] },
  { name: 'Riddim Chug', cat: 'BASS', p: { aOct: -1, aUni: 2, aDet: .15, subOn: 1, subLev: .45, fType: 1, fCut: .3, fRes: .5, fDrive: .5, mono: 1, glide: .02, e1D: .2, e1S: 1, l1Rate: 4.667, l1Smooth: 0, fxDrive: .45, vol: .53 },
    routes: [R('lfo1', 'fCut', .7), R('lfo1', 'aLev', .35), R('m1', 'aWarp', .5)], tables: ['Digital Grit', 'Basic Shapes'], lfo: [Array.from(SQ), Array.from(TRI)] },
  { name: 'Neuro Bass', cat: 'BASS', p: { aOct: -1, bOn: 1, bOct: -1, bFine: -9, aUni: 3, aDet: .3, bUni: 2, bDet: .15, bWMode: 6, bWarp: .5, bLev: .6, fType: 5, fCut: .42, fRes: .5, fDrive: .5, mono: 1, glide: .08, e1S: 1, e1D: .3, l1Rate: 2.333, l2Rate: 3.5, subOn: 1, subLev: .3, fxDrive: .5, vol: .57 },
    routes: [R('lfo1', 'fCut', .4), R('lfo2', 'bWarp', .5), R('lfo2', 'bPos', .4), R('m1', 'fCut', .3), R('m2', 'aWarp', .4)], tables: ['Analog Saw', 'Digital Grit'] },
  { name: 'Brostep Mid', cat: 'BASS', p: { aOct: 0, bOn: 1, bLev: .35, bOct: -1, aWMode: 9, aWarp: .5, aUni: 2, aDet: .2, fType: 3, fCut: .5, fRes: .45, fDrive: .5, mono: 1, glide: .03, e1S: 1, e1D: .2, l1Rate: 9.333, l2Rate: 4.667, fxDrive: .5, vol: .84, subOn: 1, subLev: .3 },
    routes: [R('lfo1', 'fCut', .4), R('lfo2', 'aWarp', .4), R('lfo2', 'fDrive', .3), R('m1', 'aPos', .5)], tables: ['Digital Grit', 'Analog Saw'] },
  { name: 'Hoover', cat: 'BASS', p: { aOct: 0, aUni: 7, aDet: .55, aBlend: .7, aSpread: 1, aWMode: 3, aWarp: .3, bOn: 1, bUni: 5, bDet: .5, bFine: 10, bLev: .5, fType: 1, fCut: .72, fRes: .2, mono: 1, glide: .25, e1A: .01, e1S: 1, e1R: .25, e2D: .5, e2S: 0, chMix: .5, chDepth: .7, rvMix: .2, fxDrive: .2, vol: .59 },
    routes: [R('env2', 'pitch', -.15), R('m1', 'fCut', .25)], tables: ['Analog Saw', 'Analog Saw'] },
  { name: 'Sub Drop', cat: 'SUB', p: { aOct: -1, aUni: 1, aPos: 0, fType: 0, fCut: .55, fRes: .05, fDrive: .15, mono: 1, glide: 0, e1A: .002, e1D: 1, e1S: 1, e1R: .5, e2D: .45, e2S: 0, fxDrive: .1, vol: .63 },
    routes: [R('env2', 'pitch', .5)], tables: ['Basic Shapes', 'Basic Shapes'] },
  { name: '808 Boom', cat: 'SUB', p: { aOct: -1, aUni: 1, aPos: 0, fType: 0, fCut: .5, fRes: .05, fDrive: .35, mono: 1, e1A: .001, e1D: .9, e1S: 0, e1R: .3, e2D: .12, e2S: 0, fxDrive: .35, vol: 1 },
    routes: [R('env2', 'pitch', .6)], tables: ['Basic Shapes', 'Basic Shapes'] },
  { name: 'Screech Lead', cat: 'LEAD', p: { aWMode: 5, aWarp: .5, aUni: 2, aDet: .1, fType: 1, fCut: .85, fRes: .45, mono: 1, glide: .06, e1S: .9, e1D: .3, e2D: .6, e2S: .3, dlMix: .25, dlTime: 321, dlFb: .45, rvMix: .2, fxDrive: .3, vol: .55 },
    routes: [R('env2', 'aWarp', .5), R('ypos', 'aWarp', .4), R('press', 'fCut', .2), R('lfo1', 'pitch', .01)], tables: ['Digital Grit', 'Analog Saw'] },
  { name: 'Dark Arp', cat: 'ARP', p: { arpOn: 1, bpm: 140, arpRate: 2, arpMode: 0, arpOct: 2, arpGate: .5, aUni: 2, aDet: .15, fType: 1, fCut: .45, fRes: .3, fEnv: .4, e1A: .002, e1D: .3, e1S: 0, e1R: .3, e2D: .25, e2S: 0, dlMix: .3, dlTime: 321, dlFb: .5, rvMix: .35, vol: .87 },
    routes: [R('m1', 'fCut', .4), R('m2', 'dlMix', .3)], tables: ['Digital Grit', 'Basic Shapes'] },
  { name: 'Hall of Giants', cat: 'PAD', p: { aUni: 5, aDet: .3, aSpread: .9, bOn: 1, bOct: -1, bLev: .5, bUni: 3, bDet: .2, fType: 0, fCut: .5, fRes: .15, e1A: 1.5, e1D: 1, e1S: .9, e1R: 3, l1Rate: .09, rvMix: .7, rvSize: .95, rvDamp: .5, dlMix: .2, dlTime: 428, dlFb: .5, chMix: .35, vol: .78 },
    routes: [R('lfo1', 'aPos', .5), R('m1', 'fCut', .4), R('m2', 'rvMix', .25)], tables: ['Vowel Choir', 'Analog Saw'] },
  { name: 'Impact Riser', cat: 'FX', p: { aUni: 4, aDet: .5, aLev: .5, nzLev: .7, fType: 1, fCut: .12, fRes: .5, fEnv: .8, e1A: 3, e1S: 1, e1R: 3, e2A: 6, e2D: .5, e2S: 1, e2R: 3, l1Rate: .2, rvMix: .5, rvSize: 1, vol: .78 },
    routes: [R('lfo1', 'fRes', .3), R('tilt', 'fCut', .3), R('m1', 'aDet', .4)], tables: ['Digital Grit', 'Basic Shapes'] },
  { name: 'Metal Bell', cat: 'PLUCK', p: { aPos: .55, aUni: 2, aDet: .08, fType: 0, fCut: .9, e1A: .001, e1D: 1.6, e1S: 0, e1R: 1.2, e2D: 1, e2S: 0, dlMix: .3, dlTime: 321, dlFb: .45, rvMix: .45, rvSize: .8, vol: 1 },
    routes: [R('env2', 'aPos', -.5), R('velo', 'aPos', .3)], tables: ['FM Bloom', 'Basic Shapes'] },
  { name: 'Dub Chord Stab', cat: 'PLUCK', p: { aUni: 4, aDet: .2, fType: 1, fCut: .5, fRes: .3, fEnv: .35, e1D: .6, e1S: .1, e1R: .4, e2D: .35, e2S: .1, dlMix: .55, dlTime: 321, dlFb: .62, rvMix: .35, chMix: .3, vol: 1 },
    routes: [R('m1', 'fCut', .4), R('m2', 'dlMix', .3)], tables: ['Analog Saw', 'Basic Shapes'] }
];
var MOODS = [
  /* AGGRESSIVE */
  { name: 'Razor Saw', cat: 'AGGRO', p: { aUni: 5, aDet: .35, aWMode: 5, aWarp: .55, bOn: 1, bWMode: 9, bWarp: .25, bLev: .4, bOct: 0, fType: 1, fCut: .62, fRes: .35, fDrive: .6, fEnv: .4, mono: 1, glide: .04, e1A: .002, e1D: .3, e1S: .85, e1R: .2, e2D: .4, e2S: 0, fxDrive: .55, dlMix: .15, dlTime: 321, dlFb: .35, vol: .66 },
    routes: [R('env2', 'aWarp', .4), R('ypos', 'fCut', .3), R('m1', 'fDrive', .4)], tables: ['Analog Saw', 'Digital Grit'] },
  { name: 'Bone Crusher', cat: 'AGGRO', p: { aOct: -1, aUni: 3, aDet: .3, aWMode: 7, aWarp: .6, subOn: 1, subLev: .5, fType: 5, fCut: .45, fRes: .55, fDrive: .8, mono: 1, glide: .02, e1A: .001, e1D: .25, e1S: .9, e1R: .1, l1Rate: 4.667, l2Rate: 2.333, fxDrive: .75, vol: .64 },
    routes: [R('lfo1', 'fCut', .5), R('m1', 'aWarp', .5), R('lfo2', 'fDrive', .3)], tables: ['Digital Grit', 'Analog Saw'] },
  { name: 'Siren Rage', cat: 'AGGRO', p: { aWMode: 8, aWarp: .5, aUni: 3, aDet: .25, bOn: 1, bOct: 1, bLev: .3, fType: 7, fCut: .55, fRes: .5, fDrive: .4, mono: 1, glide: .1, e1A: .01, e1S: .9, e1R: .3, l1Rate: 6, fxDrive: .45, dlMix: .25, dlTime: 375, dlFb: .5, rvMix: .2, vol: .54 },
    routes: [R('lfo1', 'pitch', .06), R('ypos', 'aWarp', .5), R('press', 'fCut', .3)], tables: ['Digital Grit', 'Analog Saw'] },
  /* MELANCHOLIC */
  { name: 'Rainy Window', cat: 'MELAN', p: { aLev: 1, aPos: .2, aUni: 3, aDet: .15, aSpread: .8, fType: 0, fCut: .6, fRes: .1, fEnv: .1, e1A: .08, e1D: 1.2, e1S: .6, e1R: 1.8, e2D: .8, e2S: .2, l1Rate: .15, chMix: .35, chRate: .25, dlMix: .3, dlTime: 428, dlFb: .5, rvMix: .55, rvSize: .85, rvDamp: .55, vol: .93 },
    routes: [R('lfo1', 'fCut', .2), R('velo', 'aPos', .25), R('m1', 'rvMix', .25)], tables: ['Glass Bells', 'Basic Shapes'] },
  { name: 'Last Train', cat: 'MELAN', p: { aLev: 1, aPos: .3, aUni: 2, aDet: .12, fType: 0, fCut: .5, fRes: .15, fEnv: .2, mono: 1, glide: .12, e1A: .04, e1D: .4, e1S: .8, e1R: .9, e2D: .6, e2S: .3, l1Rate: 5, dlMix: .35, dlTime: 428, dlFb: .5, rvMix: .5, rvSize: .8, vol: 1 },
    routes: [R('lfo1', 'aPos', .15), R('ypos', 'fCut', .3), R('press', 'aPos', .2)], tables: ['Vowel Choir', 'Basic Shapes'] },
  { name: 'Faded Letter', cat: 'MELAN', p: { aUni: 4, aDet: .3, aSpread: .9, bOn: 1, bFine: 7, bLev: .5, bUni: 3, bDet: .2, fType: 0, fCut: .4, fRes: .1, e1A: 1.2, e1D: 1, e1S: .85, e1R: 3, l1Rate: .3, chMix: .5, chRate: .3, rvMix: .65, rvSize: .9, rvDamp: .6, vol: .48 },
    routes: [R('lfo1', 'fCut', .15), R('m1', 'fCut', .35), R('m2', 'rvMix', .2)], tables: ['Analog Saw', 'Glass Bells'] },
  /* METAL */
  { name: 'Chainmail', cat: 'METAL', p: { aLev: 1, aPos: .5, bOn: 1, bPos: .4, bLev: .45, nzLev: .4, aUni: 2, aDet: .08, fType: 6, fCut: .45, fKey: 1, fRes: .7, e1A: .001, e1D: .9, e1S: 0, e1R: .8, e2D: .5, e2S: 0, rvMix: .3, dlMix: .2, dlTime: 321, dlFb: .4, vol: 1 },
    routes: [R('env2', 'aPos', -.4), R('velo', 'fRes', .2)], tables: ['FM Bloom', 'Digital Grit'] },
  { name: 'Djent Chug', cat: 'METAL', p: { aLev: 1, aOct: -1, aUni: 2, aDet: .1, aWMode: 3, aWarp: .5, subOn: 1, subLev: .4, fType: 1, fCut: .5, fRes: .15, fDrive: .85, fEnv: .5, mono: 1, e1A: .001, e1D: .2, e1S: .5, e1R: .1, e2D: .15, e2S: 0, fxDrive: .85, vol: .75 },
    routes: [R('env2', 'fCut', .4), R('velo', 'fDrive', .3)], tables: ['Analog Saw', 'Basic Shapes'] },
  { name: 'Anvil Lead', cat: 'METAL', p: { aWMode: 6, aWarp: .4, aUni: 3, aDet: .2, bOn: 1, bFine: 7, bLev: .45, fType: 1, fCut: .7, fRes: .25, fDrive: .7, mono: 1, glide: .05, e1A: .003, e1S: .9, e1R: .25, fxDrive: .7, dlMix: .2, dlTime: 321, dlFb: .4, rvMix: .25, vol: .44 },
    routes: [R('ypos', 'aWarp', .4), R('press', 'fCut', .25), R('lfo1', 'aWarp', .1)], tables: ['Digital Grit', 'Analog Saw'], },
  /* VINTAGE */
  { name: 'Analog Brass', cat: 'VINTAGE', p: { aUni: 3, aDet: .15, bOn: 1, bFine: 8, bLev: .6, bUni: 2, fType: 0, fCut: .3, fRes: .2, fEnv: .55, e1A: .06, e1D: .5, e1S: .8, e1R: .3, e2A: .08, e2D: .5, e2S: .3, chMix: .2, vol: .67 },
    routes: [R('velo', 'fCut', .25), R('m1', 'fCut', .3)], tables: ['Analog Saw', 'Analog Saw'] },
  { name: 'String Machine', cat: 'VINTAGE', p: { aUni: 5, aDet: .25, aSpread: 1, fType: 0, fCut: .6, fRes: .08, e1A: .5, e1D: 1, e1S: .9, e1R: 1.2, chMix: .6, chRate: .5, chDepth: .6, rvMix: .3, rvSize: .7, vol: .65 },
    routes: [R('m1', 'fCut', .3), R('lfo1', 'aDet', .1)], tables: ['Analog Saw', 'Basic Shapes'] },
  { name: 'Ladder Bass', cat: 'VINTAGE', p: { aLev: 1, aOct: -1, bOn: 1, bOct: -1, bLev: .9, bFine: 5, fType: 5, fCut: .3, fRes: .4, fDrive: .3, fEnv: .6, mono: 1, glide: .05, e1A: .003, e1D: .4, e1S: .7, e1R: .15, e2D: .3, e2S: .1, vol: .96 },
    routes: [R('velo', 'fCut', .3), R('m1', 'fRes', .25)], tables: ['Analog Saw', 'Basic Shapes'] }
];
var MORE = [
  /* BASS */
  { name: 'Acid Squelch', cat: 'BASS', p: { aPos: 0, aWMode: 0, fType: 5, fCut: .3, fRes: .78, fDrive: .35, fEnv: .65, mono: 1, glide: .06, e1A: .002, e1D: .25, e1S: .7, e1R: .08, e2D: .22, e2S: 0, fxDrive: .3, dlMix: .18, dlTime: 321, dlFb: .35, vol: .93 },
    routes: [R('velo', 'fRes', .15), R('ypos', 'fCut', .3)], tables: ['Analog Saw', 'Basic Shapes'] },
  { name: 'Talking Bass', cat: 'BASS', p: { aUni: 2, aDet: .1, fType: 7, fCut: .5, fRes: .55, fDrive: .3, mono: 1, glide: .05, e1A: .005, e1D: .4, e1S: .8, e1R: .15, l1Rate: 1.6, fxDrive: .35, vol: 1 },
    routes: [R('lfo1', 'fCut', .5), R('ypos', 'fRes', .3), R('m1', 'fCut', .3)], tables: ['Analog Saw', 'Vowel Choir'] },
  { name: 'Rubber Bass', cat: 'BASS', p: { aOct: -1, aWMode: 2, aWarp: .4, subOn: 1, subLev: .4, fType: 1, fCut: .38, fRes: .25, fEnv: .45, mono: 1, glide: .08, e1A: .003, e1D: .35, e1S: .35, e1R: .12, e2D: .2, e2S: 0, vol: 1 },
    routes: [R('env2', 'aWarp', .4), R('velo', 'fCut', .25)], tables: ['Analog Saw', 'Basic Shapes'] },
  { name: 'Funk Slap', cat: 'BASS', p: { aOct: -1, aUni: 2, aDet: .06, fType: 1, fCut: .5, fRes: .3, fDrive: .45, fEnv: .6, mono: 1, e1A: .001, e1D: .3, e1S: .35, e1R: .08, e2D: .12, e2S: 0, dlMix: .1, dlTime: 214, dlFb: .25, vol: 1 },
    routes: [R('velo', 'fCut', .4), R('ypos', 'fRes', .2)], tables: ['Analog Saw', 'Basic Shapes'] },
  /* SUB */
  { name: 'Clean Sine Sub', cat: 'SUB', p: { aLev: .15, aOct: -1, subOn: 1, subWave: 0, subLev: 1, subOct: 0, fType: 0, fCut: .3, fRes: .05, mono: 1, glide: .03, e1A: .004, e1D: .3, e1S: 1, e1R: .12, vol: .7 },
    routes: [R('velo', 'subLev', .1)], tables: ['Basic Shapes', 'Basic Shapes'] },
  { name: 'Fifth Sub', cat: 'SUB', p: { aLev: .5, aOct: -1, bOn: 1, bOct: -1, bSemi: 7, bLev: .4, subOn: 1, subLev: .6, fType: 0, fCut: .32, fRes: .1, mono: 1, glide: .05, e1A: .01, e1D: .5, e1S: .9, e1R: .2, vol: .75 },
    routes: [R('m1', 'fCut', .3)], tables: ['Basic Shapes', 'Basic Shapes'] },
  /* LEAD */
  { name: 'Square Lead', cat: 'LEAD', p: { aPos: .5, aUni: 2, aDet: .12, fType: 0, fCut: .72, fRes: .15, fEnv: .2, mono: 1, glide: .1, e1A: .008, e1D: .3, e1S: .85, e1R: .2, l1Rate: 5.2, chMix: .25, dlMix: .22, dlTime: 321, dlFb: .38, rvMix: .2, vol: .91 },
    routes: [R('lfo1', 'pitch', .025), R('press', 'fCut', .2)], tables: ['Basic Shapes', 'Analog Saw'] },
  { name: 'Supersaw Lead', cat: 'LEAD', p: { aUni: 7, aDet: .5, aSpread: 1, fType: 0, fCut: .78, fRes: .1, e1A: .01, e1D: .4, e1S: .85, e1R: .5, chMix: .3, dlMix: .2, dlTime: 375, dlFb: .4, rvMix: .3, rvSize: .7, vol: .65 },
    routes: [R('ypos', 'fCut', .2), R('m1', 'aDet', .3)], tables: ['Analog Saw', 'Basic Shapes'] },
  { name: 'Sync Lead', cat: 'LEAD', p: { aWMode: 5, aWarp: .4, aUni: 2, aDet: .1, fType: 0, fCut: .8, fRes: .12, mono: 1, glide: .12, e1A: .005, e1S: .9, e1R: .25, l1Rate: 5.5, dlMix: .22, dlTime: 321, dlFb: .4, rvMix: .2, vol: .95 },
    routes: [R('ypos', 'aWarp', .6), R('lfo1', 'pitch', .03), R('press', 'aWarp', .2)], tables: ['Analog Saw', 'Basic Shapes'] },
  /* PAD */
  { name: 'Glass Pad', cat: 'PAD', p: { aPos: .3, aUni: 4, aDet: .2, aSpread: .9, fType: 0, fCut: .65, fRes: .1, e1A: 1.2, e1D: 1, e1S: .85, e1R: 2.5, l1Rate: .12, chMix: .4, rvMix: .6, rvSize: .85, rvDamp: .4, vol: .82 },
    routes: [R('lfo1', 'aPos', .3), R('m1', 'fCut', .3)], tables: ['Glass Bells', 'Analog Saw'] },
  { name: 'Choir Wash', cat: 'PAD', p: { aUni: 5, aDet: .2, aSpread: 1, fType: 0, fCut: .6, fRes: .05, e1A: .9, e1D: 1, e1S: .9, e1R: 2.2, l1Rate: .15, chMix: .35, rvMix: .7, rvSize: .9, vol: .7 },
    routes: [R('lfo1', 'aPos', .4), R('m1', 'rvMix', .2), R('press', 'aPos', .2)], tables: ['Vowel Choir', 'Analog Saw'] },
  /* PLUCK */
  { name: 'Kalimba', cat: 'PLUCK', p: { aPos: .3, aUni: 2, aDet: .06, fType: 0, fCut: .95, e1A: .001, e1D: 1.8, e1S: .05, e1R: 1.2, e2D: .4, e2S: 0, dlMix: .3, dlTime: 321, dlFb: .4, rvMix: .35, rvSize: .6, vol: 1 },
    routes: [R('env2', 'aPos', .4), R('velo', 'fCut', .2)], tables: ['Glass Bells', 'Basic Shapes'] },
  { name: 'Marimba Bass', cat: 'PLUCK', p: { aOct: -1, aPos: .15, aUni: 2, aDet: .05, fType: 0, fCut: .6, fRes: .15, fEnv: .5, e1A: .001, e1D: 1.1, e1S: .1, e1R: .3, e2D: .3, e2S: 0, rvMix: .2, vol: 1 },
    routes: [R('velo', 'fCut', .3)], tables: ['Basic Shapes', 'Glass Bells'] },
  /* ARP */
  { name: 'Sparkle Arp', cat: 'ARP', p: { aPos: .4, aUni: 2, aDet: .1, fType: 0, fCut: .8, e1A: .001, e1D: .3, e1S: .2, e1R: .3, arpOn: 1, arpMode: 0, arpRate: 2, arpOct: 2, arpGate: .5, bpm: 124, dlMix: .4, dlTime: 321, dlFb: .5, rvMix: .4, vol: 1 },
    routes: [R('lfo1', 'aPos', .2)], tables: ['Glass Bells', 'Basic Shapes'] },
  { name: 'Techno Stab', cat: 'ARP', p: { aUni: 3, aDet: .2, fType: 1, fCut: .45, fRes: .3, fEnv: .5, e1A: .001, e1D: .2, e1S: 0, e1R: .1, e2D: .2, e2S: 0, arpOn: 1, arpMode: 3, arpRate: 2, arpOct: 2, arpGate: .4, bpm: 132, dlMix: .35, dlTime: 321, dlFb: .45, rvMix: .25, vol: 1 },
    routes: [R('velo', 'fCut', .2), R('m1', 'fCut', .4)], tables: ['Analog Saw', 'Basic Shapes'] },
  /* FX */
  { name: 'Laser Sweep', cat: 'FX', p: { aWMode: 8, aWarp: .6, aUni: 2, aDet: .15, fType: 0, fCut: .8, mono: 1, e1A: .001, e1D: 1.5, e1S: .2, e1R: .5, e2A: .001, e2D: .7, e2S: 0, fxDrive: .3, dlMix: .35, dlTime: 321, dlFb: .5, rvMix: .3, vol: .88 },
    routes: [R('env2', 'aWarp', -.8), R('env2', 'pitch', .15)], tables: ['Digital Grit', 'Basic Shapes'] },
  { name: 'Wind Texture', cat: 'FX', p: { aLev: 0, nzLev: .8, nzType: 1, fType: 3, fCut: .5, fRes: .6, e1A: 2, e1D: 1, e1S: 1, e1R: 3, l1Rate: .1, l2Rate: .17, chMix: .4, rvMix: .6, rvSize: .9, vol: 1 },
    routes: [R('lfo1', 'fCut', .5), R('m1', 'fRes', .3)], tables: ['Basic Shapes', 'Basic Shapes'] },
  { name: 'Alien Voice', cat: 'FX', p: { aWMode: 9, aWarp: .5, aUni: 2, aDet: .2, fType: 7, fCut: .55, fRes: .4, fxDrive: .3, mono: 1, glide: .15, e1A: .02, e1S: .9, e1R: .4, l1Rate: 3.3, dlMix: .3, dlTime: 321, dlFb: .5, rvMix: .35, vol: 1 },
    routes: [R('lfo1', 'fCut', .5), R('ypos', 'aWarp', .5), R('lfo2', 'pitch', .02)], tables: ['Vowel Choir', 'Digital Grit'] },
  /* VINTAGE */
  { name: 'Poly Brass 80s', cat: 'VINTAGE', p: { aUni: 3, aDet: .2, bOn: 1, bFine: -9, bLev: .7, bUni: 2, fType: 0, fCut: .32, fRes: .15, fEnv: .6, e1A: .05, e1D: .6, e1S: .75, e1R: .25, e2A: .06, e2D: .6, e2S: .25, chMix: .5, chRate: .4, vol: .67 },
    routes: [R('velo', 'fCut', .3), R('m1', 'fCut', .3)], tables: ['Analog Saw', 'Analog Saw'] },
  { name: 'Electric Keys', cat: 'VINTAGE', p: { aPos: .25, bOn: 1, bOct: 1, bLev: .25, fType: 0, fCut: .6, fRes: .1, fEnv: .25, e1A: .002, e1D: 2.2, e1S: .35, e1R: .5, e2D: .5, e2S: 0, chMix: .55, chRate: .6, chDepth: .5, rvMix: .2, vol: 1 },
    routes: [R('velo', 'aPos', .3), R('velo', 'fCut', .2)], tables: ['Glass Bells', 'Basic Shapes'] }
];
var OLD_CAT = { 'Glass Breath': 'PAD', 'Vowel Pad': 'PAD', 'FM Pluck': 'PLUCK', 'Reese Bass': 'BASS', 'Grit Lead': 'LEAD', 'Warp Drone': 'PAD', 'Bell Arp': 'ARP', 'Comb Pluck': 'PLUCK' };
var FACTORY = [
  { name: 'Init', p: {}, routes: [], tables: ['Basic Shapes', 'Glass Bells'] },
  { name: 'Glass Breath', p: { vol: 1, aPos: .3, aUni: 4, aDet: .22, aSpread: .8, fCut: .74, fRes: .12, fEnv: .15, e1A: .35, e1D: .8, e1S: .75, e1R: 1.4, e2A: .2, e2D: 1, e2S: .4, l1Rate: .18, chMix: .4, rvMix: .35, rvSize: .75, rvDamp: .45, subOn: 1, subLev: .3 },
    routes: [R('lfo1', 'aPos', .45), R('env2', 'fCut', .2), R('m1', 'fCut', .3)], tables: ['Glass Bells', 'Glass Bells'] },
  { name: 'Vowel Pad', p: { vol: .97, aPos: .1, aUni: 5, aDet: .3, aSpread: .9, fCut: .8, e1A: .5, e1D: 1, e1S: .8, e1R: 1.8, l1Rate: .12, rvMix: .5, rvSize: .85, chMix: .5 },
    routes: [R('lfo1', 'aPos', .6), R('m1', 'aPos', .3), R('m2', 'rvMix', .3)], tables: ['Vowel Choir', 'Basic Shapes'] },
  { name: 'FM Pluck', p: { vol: 1, aPos: .25, aUni: 2, aDet: .1, fCut: .9, e1A: .002, e1D: .35, e1S: 0, e1R: .25, e2A: .002, e2D: .3, e2S: 0, dlMix: .25, dlTime: 280, dlFb: .4, rvMix: .2, fEnv: 0 },
    routes: [R('env2', 'aPos', .55), R('env2', 'fCut', .15), R('velo', 'aPos', .2)], tables: ['FM Bloom', 'Basic Shapes'] },
  { name: 'Reese Bass', p: { vol: .75, bOn: 1, aUni: 3, aDet: .35, bUni: 3, bDet: .3, aFine: 12, bFine: -12, fType: 5, fCut: .42, fRes: .3, fDrive: .35, fEnv: .3, e1A: .005, e1D: .4, e1S: .8, e1R: .2, e2D: .35, e2S: .2, mono: 1, glide: .15, subOn: 1, subLev: .5, fxDrive: .15, l1Rate: .35 },
    routes: [R('lfo1', 'fCut', .15), R('m1', 'fDrive', .4)], tables: ['Analog Saw', 'Analog Saw'] },
  { name: 'Grit Lead', p: { vol: .87, aWMode: 5, aWarp: .35, aUni: 3, aDet: .15, fType: 1, fCut: .7, fRes: .25, mono: 1, glide: .08, dlMix: .3, dlTime: 375, dlFb: .45, e1S: .8, fEnv: .1, l1Rate: 5.5 },
    routes: [R('lfo1', 'aWarp', .12), R('ypos', 'aWarp', .5), R('press', 'fCut', .3)], tables: ['Digital Grit', 'Basic Shapes'] },
  { name: 'Warp Drone', p: { vol: .56, aWMode: 8, aWarp: .3, aUni: 3, aDet: .2, bOn: 1, bLev: .5, bOct: -1, bPos: .5, fType: 7, fCut: .35, fRes: .4, fEnv: 0, e1A: 1.2, e1D: 1, e1S: 1, e1R: 2.5, l1Rate: .07, l2Rate: .11, rvMix: .55, rvSize: 1, chMix: .35 },
    routes: [R('lfo1', 'aWarp', .5), R('lfo2', 'fCut', .4), R('lfo1', 'bPos', .5)], tables: ['Basic Shapes', 'FM Bloom'] },
  { name: 'Bell Arp', p: { vol: 1, arpOn: 1, bpm: 110, arpRate: 2, arpMode: 0, arpOct: 2, aPos: .6, fCut: .85, e1A: .002, e1D: .5, e1S: 0, e1R: .6, e2D: .6, e2S: 0, dlMix: .35, dlTime: 340, dlFb: .5, rvMix: .4, fEnv: 0 },
    routes: [R('env2', 'aPos', -.4), R('m1', 'dlMix', .4)], tables: ['Glass Bells', 'Basic Shapes'] },
  { name: 'Comb Pluck', p: { vol: 1, aOn: 0, nzLev: .8, fType: 6, fCut: .372, fKey: 1, fRes: .85, fEnv: 0, e1A: .001, e1D: .25, e1S: 0, e1R: .5, rvMix: .25 },
    routes: [R('m1', 'fRes', .1)], tables: ['Basic Shapes', 'Glass Bells'] }
];
FACTORY = [FACTORY[0]].concat(BHM, FACTORY.slice(1), MOODS, MORE); FACTORY.forEach(function (f) { if (!f.cat) f.cat = OLD_CAT[f.name] || 'INIT'; });

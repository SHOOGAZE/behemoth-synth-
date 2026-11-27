# Changelog

## Unreleased

- Computer keyboard plays on any layout (keys are matched by position, so a Russian layout works too). STAGE shows two stacked keyboards on wide screens. Option rows wrap instead of being cut off on desktop; the wide FX card no longer touches the cards above it.

- Menu block with links to the other two apps of the family.
- Family skin (black and white): raised keys, recessed cards, dot-matrix glass, milky keyboard; the buttons and menus share one key language (a flatter, one-pixel edge here, because the screens are dense).
- Tap the tempo value in the arpeggiator to type a tempo.
- One backdrop behind the whole page.
- Stage: SPLIT and the MACRO tab are gone (KEYS | PAD). One big keyboard fills the height, pitch and mod wheels sit on the left and the four macros are a column of encoders on the right (mirrored for left-handed mode) and the octave strip is gone (use - / +).
- Portrait: the expandable keys/pad window is removed (it duplicated the PLAY tab and Stage); the compact dock keyboard stays on every tab for auditioning sounds.
- Unified OLED panel (caption, dot-matrix name with Cyrillic, scope) shared by GRAINS, ELEPHANT and BEHEMOTH.
- Stage is landscape-only; in portrait the PLAY tab is the play surface. Sound screen is a swipe pager (Osc A | Osc B, then Sub & Noise | Filter, then Amp) on a phone held sideways.

## 1.1.0 (2026-11-13)

- MIDI export of the sequencer pattern (4 bars).
- Interface levels: Simple (default) hides the MOD tab and the modulation strip; Full shows everything.
- Both oscillator screens have the same size; black-and-white glass look.
- Phone held sideways: one keyboard row as tall as the screen allows.
- Folded phones (280px): no sideways scroll, the preset row and the dock fit.
- Knobs work from the keyboard (arrows, Shift for fine steps, Home resets) and are announced as sliders.
- Audio wakes up again after a phone call, a locked screen or a switch to another app.
- Larger knob captions; chips answer to a taller touch area.
- Tests: UI smoke test on phone, landscape and tablet; engine fuzz test (random patches, no NaN, no runaway level). Both run in CI.
- Audio fuzz test in the browser, next to the engine fuzz test; runs in CI.

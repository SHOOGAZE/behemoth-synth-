# Changelog

## Unreleased
- Unified OLED panel (caption, dot-matrix name with Cyrillic, scope) shared by GRAINS, ELEPHANT and BEHEMOTH.
- Stage is landscape-only; in portrait the docked keys and pad panel is the play surface. Sound screen is a swipe pager (Osc A | Osc B, then Sub & Noise | Filter, then Amp) on a phone held sideways.

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

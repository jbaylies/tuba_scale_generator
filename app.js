(function () {
  "use strict";

  /* ---------- Library guard ---------- */
  if (typeof VexFlow === "undefined" || typeof Tonal === "undefined") {
    document.getElementById("vexflow-output").innerHTML =
      '<p class="notation-hint">Could not load music libraries (Tonal.js / VexFlow). Please check your internet connection and refresh.</p>';
    return;
  }

  const VF = VexFlow;
  const { Renderer, Stave, StaveNote, Accidental, Annotation, Voice, Formatter } = VF;

  /* ---------- Configuration ---------- */
  // All 12 pitch classes with both sharp and flat spellings (circle of fifths order)
  const KEYS = [
    "C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb",
    "C#", "F#", "B", "E", "A", "D", "G"
  ];
  const KEY_LABELS = {
    "C": "C", "G": "G", "D": "D", "A": "A", "E": "E", "B": "B",
    "F#": "F\u266F", "C#": "C\u266F",
    "F": "F", "Bb": "B\u266D", "Eb": "E\u266D",
    "Ab": "A\u266D", "Db": "D\u266D", "Gb": "G\u266D",
    "Cb": "C\u266D",
  };

  /* ---------- Instrument options ---------- */
  var INSTRUMENTS = [
    { value: "tuba",                  label: "Tuba" },
    { value: "trombone",              label: "Trombone" },
    { value: "trombone_f_attachment", label: "Trombone F attachment" },
  ];

  /* ---------- Trombone standard slide positions ----------
   *  Keyed by note name with octave (e.g. "Bb2").
   *  Only one spelling per MIDI needed — enharmonic lookup handles the rest.
   */
  var TROMBONE_STANDARD_POSITIONS = {
    "E1":"7", "F1":"6", "F#1":"5", "G1":"4", "G#1":"3", "A1":"2", "Bb1":"1",
    "B1":"ft", "C2":"ft", "C#2":"ft", "D2":"ft", "D#2":"ft",
    "E2":"7", "F2":"6", "F#2":"5", "G2":"4", "G#2":"3", "A2":"2", "Bb2":"1",
    "B2":"7", "C3":"6", "C#3":"5", "D3":"4", "D#3":"3",
    "E3":"2 7", "F3":"1 6", "F#3":"5", "G3":"4", "G#3":"3 7", "A3":"2 6", "Bb3":"1 5",
    "B3":"4 7", "C4":"3 6", "C#4":"2 5", "D4":"1 4 7", "D#4":"3 6",
    "E4":"2 5 7", "F4":"1 4 6", "F#4":"3 5 7", "G4":"2 4 6", "G#4":"3 5 7",
    "A4":"2 4 6", "Bb4":"1 3 5", "B4":"2 4 6",
    "C5":"1 3 5", "C#5":"2 4 5", "D5":"1 3 4", "D#5":"3 2",
    "E5":"2", "F5":"1", "F#5":"3", "G5":"2", "G#5":"3", "A5":"2", "Bb5":"1"
  };

  /* ---------- Trombone F attachment slide positions ----------
   *  Keyed by note name with octave (e.g. "Bb2").
   *  "T" prefix indicates trigger (F attachment) positions.
   *  Only one spelling per MIDI needed — enharmonic lookup handles the rest.
   */
  var TROMBONE_F_ATTACHMENT_POSITIONS = {
    "E1":"7 T2.5", "F1":"6 T1", "F#1":"5", "G1":"4", "G#1":"3", "A1":"2", "Bb1":"1",
    "B1":"ft", "C2":"T7.5", "C#2":"T6", "D2":"T5", "D#2":"T3.5",
    "E2":"7 T2.5", "F2":"6 T1", "F#2":"5", "G2":"4 T6", "G#2":"3 T5", "A2":"2 T4", "Bb2":"1 T3",
    "B2":"7 T2.5", "C3":"6 T1", "C#3":"5", "D3":"4", "D#3":"3",
    "E3":"2 7", "F3":"1 6", "F#3":"5", "G3":"4", "G#3":"3 7", "A3":"2 6", "Bb3":"1 5",
    "B3":"4 7", "C4":"3 6", "C#4":"2 5", "D4":"1 4 7", "D#4":"3 6",
    "E4":"2 5 7", "F4":"1 4 6", "F#4":"3 5 7", "G4":"2 4 6", "G#4":"3 5 7",
    "A4":"2 4 6", "Bb4":"1 3 5", "B4":"2 4 6",
    "C5":"1 3 5", "C#5":"2 4 5", "D5":"1 3 4", "D#5":"3 2",
    "E5":"2", "F5":"1", "F#5":"3", "G5":"2", "G#5":"3", "A5":"2", "Bb5":"1"
  };

  /* ---------- Tuba Fingerings ----------
   *  BBb tuba fingerings keyed by note name with octave (e.g. "Bb2").
   *  Valve numbers: 0 = open, 1 = 1st, 2 = 2nd, 3 = 3rd, 4 = 4th.
   *  Combinations: "12" = 1+2, "23" = 2+3, "234" = 2+3+4, etc.
   *  Only one spelling per MIDI needed — enharmonic lookup handles the rest.
   */
  var FINGERINGS = {
     // Octave 0 (infrasound)
     "C0": "1234",  "Db0": "134",  "D0": "34",  "Eb0": "14",  "E0": "123 (24)",  "F0": "13 (4)",
     "Gb0": "23",  "G0": "12",  "Ab0": "1",  "A0": "2",  "Bb0": "0",  "B0": "123 (24)",
     // Octave 1 (pedal range)
     "C1": "1234",  "Db1": "134",  "D1": "34",  "Eb1": "14",  "E1": "123 (24)",  "F1": "13 (4)",
     "Gb1": "23",  "G1": "12",  "Ab1": "1",  "A1": "2",  "Bb1": "0",  "B1": "123 (24)",
     // Octave 2 (low range)
     "C2": "13 (4)",  "Db2": "23",  "D2": "12",  "Eb2": "1",  "E2": "2",  "F2": "0",
     "Gb2": "23",  "G2": "12",  "Ab2": "1",  "A2": "2",  "Bb2": "0",  "B2": "12",
     // Octave 3 (middle range)
     "C3": "1",  "Db3": "2",  "D3": "0",  "Eb3": "1",  "E3": "2",  "F3": "0",
     "Gb3": "23",  "G3": "12",  "Ab3": "1",  "A3": "2",  "Bb3": "0",  "B3": "12",
     // Octave 4 (upper range)
     "C4": "1",  "Db4": "2",  "D4": "0",  "Eb4": "1",  "E4": "2",  "F4": "0",
     "Gb4": "23",  "G4": "12",  "Ab4": "1",  "A4": "2",  "Bb4": "0",  "B4": "12",
     // Octave 5 (bird farting in a silo range)
     "C5": "1",  "Db5": "2",  "D5": "0",  "Eb5": "1",  "E5": "2",  "F5": "0",
     "Gb5": "1",  "G5": "2",  "Ab5": "1",  "A5": "2",  "Bb5": "0",  "B5": "12",
  };

  /* ---------- Tuba key transposition ----------
   *  Fingerings are stored for BBb tuba. For other tuba keys the same
   *  fingering pattern is shifted by the listed number of semitones.
   *  e.g. a CC tuba playing C2 uses the BBb fingering for Bb2 (−2 st).
   *  GG tuba is a minor third (3 semitones) below BBb, so its shift is −3.
   */
  var TUBA_KEYS = [
    { value: "-3",   label: "GG",               shift: -3, clef: "bass" },
    { value: "0",    label: "BB\u266D",         shift: 0,  clef: "bass" },
    { value: "2",    label: "CC",               shift: 2,  clef: "bass" },
    { value: "5",    label: "E\u266D",          shift: 5,  clef: "bass" },
    { value: "7",    label: "F",                shift: 7,  clef: "bass" },
    { value: "12",   label: "B\u266D",          shift: 12,  clef: "bass" },   
    { value: "tcBb", label: "B\u266D Treble Clef", shift: 26, clef: "treble", playbackShift: -2 },
    { value: "tcC",  label: "C Treble Clef",      shift: 26, clef: "treble", playbackShift: 0  },
    { value: "tcEb", label: "E\u266D Treble Clef", shift: 26, clef: "treble", playbackShift: 3  },
    { value: "tcF",  label: "F Treble Clef",      shift: 26, clef: "treble", playbackShift: 5  },
  ];

  /**
   * Return the TUBA_KEYS entry matching the currently-selected tuba option.
   * Falls back to the BBb entry (shift 0, bass clef) if no match is found.
   * Applies to all instruments — trombone ignores the shift for fingering
   * lookups (slide positions are absolute) but still uses clef / playback.
   */
  function getTubaConfig() {
    var val = tubaSelect.value;
    for (var i = 0; i < TUBA_KEYS.length; i++) {
      if (TUBA_KEYS[i].value === val) return TUBA_KEYS[i];
    }
    return TUBA_KEYS[1]; // BBb fallback
  }

  /** Return the display name of the currently-selected instrument. */
  function getInstrumentName() {
    if (instrumentSelect && instrumentSelect.value !== "tuba") return "Trombone";
    return "Tuba";
  }

  var PATTERNS = [
    { value: "scale",                  label: "Scale" },
    { value: "diatonicThirds",         label: "Interval 3rds (1-3, 2-4, 3-5, …)" },
    { value: "diatonicFourths",        label: "Interval 4ths (1-4, 2-5, 3-6, …)" },
    { value: "diatonicFifths",         label: "Interval 5ths (1-5, 2-6, 3-7, …)" },
    { value: "diatonicSixths",         label: "Interval 6ths (1-6, 2-7, 3-1, …)" },
    { value: "diatonicSeventhsIntervals", label: "Interval 7ths (1-7, 2-1, 3-2, …)" },
    { value: "diatonicTriads",         label: "Diatonic Triads (1-3-5, 2-4-6, …)" },
    { value: "diatonicTriadsDesc",     label: "Diatonic Triads desc (5-3-1, 6-4-2, …)" },
    { value: "diatonicTriadsAlt",       label: "Diatonic Triads Alt. (1-3-5, 6-4-2, …)" },
    { value: "diatonicSevenths",       label: "Diatonic 7ths (1-3-5-7, 2-4-6-1, …)" },
    { value: "diatonicSeventhsDesc",   label: "Diatonic 7ths desc (7-5-3-1, 1-6-4-2, …)" },
    { value: "diatonicSeventhsAlt",     label: "Diatonic 7ths Alt. (1-3-5-7, 1-6-4-2, …)" },
    { value: "diatonicNinths",         label: "Diatonic 9ths (1-3-5-7-9, 2-4-6-1-3, …)" },
    { value: "diatonicNinthsDesc",     label: "Diatonic 9ths desc (9-7-5-3-1, …)" },
    { value: "diatonicNinthsAlt",       label: "Diatonic 9ths Alt. (1-3-5-7-9, 3-1-6-4-2, …)" },
    { value: "clarke",                 label: "Clarke (1-2-3-1, 2-3-4-2, …)" },
  ];

  /**
   * Return the fingering for any enharmonic spelling of a note.
   * Builds a MIDI-number index on first call so "Cb3" matches "B2",
   * "F#2" matches "Gb2", etc. Only one spelling per MIDI needs an entry.
   * @param {string} tonalNote - Tonal note name e.g. "C3"
   * @param {number} shift     - semitones to transpose down for tuba key (0 for BBb, −3 for GG)
   */
  var _fingeringByMidi = null;
  var _tromboneStandardByMidi = null;
  var _tromboneFAttachmentByMidi = null;

  function _buildMidiLookup(sourceObj) {
    var lookup = {};
    for (var key in sourceObj) {
      if (!sourceObj[key]) continue;
      var midi = Tonal.Note.midi(key);
      if (midi !== null && midi !== undefined) {
        lookup[midi] = sourceObj[key];
      }
    }
    return lookup;
  }

  function getFingering(tonalNote, shift) {
    var instrument = instrumentSelect ? instrumentSelect.value : "tuba";
    var midi = Tonal.Note.midi(tonalNote);
    if (midi === null || midi === undefined) return "";

    // Trombone standard: use slide positions
    if (instrument === "trombone") {
      if (_tromboneStandardByMidi === null) {
        _tromboneStandardByMidi = _buildMidiLookup(TROMBONE_STANDARD_POSITIONS);
      }
      var lookupMidi = midi - shift + 12;
      return _tromboneStandardByMidi[lookupMidi] || "";
    }

    // Trombone F attachment: use F-attachment slide positions
    if (instrument === "trombone_f_attachment") {
      if (_tromboneFAttachmentByMidi === null) {
        _tromboneFAttachmentByMidi = _buildMidiLookup(TROMBONE_F_ATTACHMENT_POSITIONS);
      }
      var lookupMidi = midi - shift + 12;
      return _tromboneFAttachmentByMidi[lookupMidi] || "";
    }

    // Tuba: use valve fingerings with tuba-key shift
    if (_fingeringByMidi === null) {
      _fingeringByMidi = _buildMidiLookup(FINGERINGS);
    }
    // Shift the MIDI number down by the tuba-key offset to find the
    // equivalent BBb note (e.g. CC tuba C2 → BBb Bb2).
    var lookupMidi = midi - shift;
    return _fingeringByMidi[lookupMidi] || "";
  }

  var DIRECTION = [
    { value: "ascending",           label: "Ascending" },
    { value: "descending",          label: "Descending" },
    { value: "ascendingDescending", label: "Asc + Desc" },
  ];

  /* ---------- Scale catalogue ----------
   * Every scale is sourced from Tonal.js's built-in scale dictionary:
   *   https://github.com/tonaljs/tonal/blob/main/packages/scale-type/data.ts
   *
   * `value`    — the Tonal.js scale-type name (used with Tonal.Scale.get)
   * `label`    — human-friendly display name
   * `tonalName — override for the Tonal.js name if `value` is an alias
   * `type`     — which TYPE category the scale belongs to (maps to SCALE_TYPES)
   * `degreeDown` — interval to descend from tonic to parent major key (for key
   *                signatures); omitted when no clean parent exists.
   *
   * The full catalogue is keyed by `value` in _scaleLookup for O(1) access.
   */
  var SCALE_CATALOG = [
    // ===== Modes =====
    { value: "major",            label: "Major (Ionian)",         type: "modes",    degreeDown: "1P" },
    { value: "dorian",          label: "Dorian",                 type: "modes",    degreeDown: "2M" },
    { value: "phrygian",        label: "Phrygian",               type: "modes",    degreeDown: "3M" },
    { value: "lydian",          label: "Lydian",                 type: "modes",    degreeDown: "4P" },
    { value: "mixolydian",      label: "Mixolydian",             type: "modes",    degreeDown: "5P" },
    { value: "minor",            label: "Natural Minor (Aeolian)", type: "modes", degreeDown: "6M" },
    { value: "locrian",         label: "Locrian",               type: "modes",    degreeDown: "7M" },
    // ===== Jazz common scales =====
    { value: "major blues",      label: "Major Blues",      type: "jazz",     degreeDown: "1P" },
    { value: "minor blues",      label: "Minor Blues",      type: "jazz",     degreeDown: "6M" },
    { value: "melodic minor",   label: "Melodic Minor",    type: "jazz", degreeDown: "6M" },
    { value: "harmonic minor",  label: "Harmonic Minor",   type: "jazz", degreeDown: "6M" },
    // Bebop (dominant) shares Mixolydian's key signature (degreeDown 5P);
    // the added major-7th passing tone appears as an accidental (sharp or
    // natural) as needed. Diminished is symmetric (no clean parent).
    { value: "bebop",           label: "Bebop",            type: "jazz", degreeDown: "5P" },
    { value: "diminished",      label: "Diminished (Whole-Half)", type: "jazz" },
    // ===== 5-note scales =====
    { value: "major pentatonic",        label: "Major Pentatonic",          type: "5-note", degreeDown: "1P" },
    { value: "ionian pentatonic",       label: "Ionian Pentatonic",       type: "5-note", degreeDown: "1P" },
    { value: "mixolydian pentatonic",   label: "Mixolydian Pentatonic",   type: "5-note", degreeDown: "5P" },
    { value: "ritusen",                label: "Ritusen",                  type: "5-note", degreeDown: "1P" },
    { value: "egyptian",               label: "Egyptian",                 type: "5-note", degreeDown: "5P" },
    { value: "neapolitan major pentatonic", label: "Neapolitan Major Pentatonic", type: "5-note" },
    { value: "vietnamese 1",           label: "Vietnamese 1",            type: "5-note", degreeDown: "3M" },
    { value: "pelog",                  label: "Pelog",                    type: "5-note", degreeDown: "3M" },
    { value: "kumoijoshi",             label: "Kumoijoshi",               type: "5-note", degreeDown: "3M" },
    { value: "hirajoshi",              label: "Hirajoshi",                type: "5-note", degreeDown: "6M" },
    { value: "iwato",                  label: "Iwato",                    type: "5-note", degreeDown: "7M" },
    { value: "in-sen",                 label: "In-Sen",                   type: "5-note", degreeDown: "3M" },
    { value: "lydian pentatonic",      label: "Lydian Pentatonic",        type: "5-note", degreeDown: "4P" },
    { value: "malkos raga",            label: "Malkos Raga",              type: "5-note", degreeDown: "6M" },
    { value: "locrian pentatonic",     label: "Locrian Pentatonic",       type: "5-note", degreeDown: "7M" },
    { value: "minor pentatonic",       label: "Minor Pentatonic",         type: "5-note", degreeDown: "6M" },
    { value: "minor six pentatonic",   label: "Minor Six Pentatonic",     type: "5-note", degreeDown: "2M" },
    { value: "flat three pentatonic",  label: "Flat Three Pentatonic",    type: "5-note", degreeDown: "2M" },
    { value: "flat six pentatonic",    label: "Flat Six Pentatonic",      type: "5-note" },
    { value: "scriabin",               label: "Scriabin",                 type: "5-note" },
    { value: "whole tone pentatonic",  label: "Whole Tone Pentatonic",    type: "5-note" },
    { value: "lydian #5p pentatonic",  label: "Lydian #5P Pentatonic",    type: "5-note" },
    { value: "lydian dominant pentatonic", label: "Lydian Dominant Pentatonic", type: "5-note" },
    { value: "minor #7m pentatonic",   label: "Minor #7m Pentatonic",     type: "5-note" },
    { value: "super locrian pentatonic", label: "Super Locrian Pentatonic", type: "5-note" },
    // ===== 6-note scales =====
    { value: "minor hexatonic",        label: "Minor Hexatonic",          type: "6-note" },
    { value: "augmented",             label: "Augmented",                type: "6-note" },
    { value: "piongio",               label: "Piongio",                  type: "6-note", degreeDown: "5P" },
    { value: "prometheus neapolitan",  label: "Prometheus Neapolitan",    type: "6-note" },
    { value: "prometheus",             label: "Prometheus",               type: "6-note" },
    { value: "mystery #1",            label: "Mystery #1",               type: "6-note" },
    { value: "six tone symmetric",     label: "Six Tone Symmetric",       type: "6-note" },
    { value: "whole tone",            label: "Whole Tone",               type: "6-note" },
    { value: "messiaen's mode #5",    label: "Messiaen's Mode #5",       type: "6-note" },
    // ===== 7-note scales =====
    { value: "locrian major",         label: "Locrian Major",            type: "7-note" },
    { value: "double harmonic lydian", label: "Double Harmonic Lydian",  type: "7-note" },
    { value: "altered",               label: "Altered (Super Locrian)",  type: "7-note" },
    { value: "locrian #2",            label: "Locrian #2 (Half-Diminished)", type: "7-note", degreeDown: "6M" },
    { value: "mixolydian b6",         label: "Mixolydian \u266D6",        type: "7-note", degreeDown: "5P" },
    { value: "lydian dominant",       label: "Lydian Dominant",          type: "7-note", degreeDown: "5P" },
    { value: "lydian augmented",      label: "Lydian Augmented",         type: "7-note", degreeDown: "4P" },
    { value: "dorian b2",            label: "Dorian \u266D2",            type: "7-note", degreeDown: "2M" },
    { value: "ultralocrian",          label: "Ultralocrian",             type: "7-note" },
    { value: "locrian 6",            label: "Locrian 6",                type: "7-note", degreeDown: "7M" },
    { value: "augmented heptatonic",  label: "Augmented Heptatonic",     type: "7-note" },
    { value: "dorian #4",            label: "Dorian #4 (Ukrainian)",    type: "7-note", degreeDown: "2M" },
    { value: "lydian diminished",     label: "Lydian Diminished",        type: "7-note", degreeDown: "4P" },
    { value: "leading whole tone",    label: "Leading Whole Tone",       type: "7-note" },
    { value: "lydian minor",          label: "Lydian Minor",             type: "7-note", degreeDown: "6M" },
    { value: "phrygian dominant",     label: "Phrygian Dominant (Spanish)", type: "7-note", degreeDown: "3M" },
    { value: "balinese",              label: "Balinese",                 type: "7-note", degreeDown: "3M" },
    { value: "neapolitan major",      label: "Neapolitan Major",         type: "7-note" },
    { value: "harmonic major",        label: "Harmonic Major",           type: "7-note", degreeDown: "1P" },
    { value: "double harmonic major", label: "Double Harmonic Major (Gypsy)", type: "7-note" },
    { value: "hungarian minor",       label: "Hungarian Minor",          type: "7-note" },
    { value: "hungarian major",       label: "Hungarian Major",          type: "7-note" },
    { value: "oriental",              label: "Oriental",                 type: "7-note" },
    { value: "flamenco",              label: "Flamenco",                 type: "7-note" },
    { value: "todi raga",             label: "Todi Raga",                type: "7-note" },
    { value: "persian",               label: "Persian",                  type: "7-note" },
    { value: "enigmatic",             label: "Enigmatic",                type: "7-note" },
    { value: "major augmented",       label: "Major Augmented",          type: "7-note", degreeDown: "1P" },
    { value: "lydian #9",            label: "Lydian #9",                type: "7-note", degreeDown: "4P" },
    // ===== 8-note scales =====
    { value: "messiaen's mode #4",    label: "Messiaen's Mode #4",       type: "8-note" },
    { value: "purvi raga",            label: "Purvi Raga",               type: "8-note" },
    { value: "spanish heptatonic",    label: "Spanish Heptatonic",       type: "8-note", degreeDown: "3M" },
    { value: "bebop minor",           label: "Bebop Minor",              type: "8-note", degreeDown: "5P" },
    { value: "bebop major",           label: "Bebop Major",              type: "8-note", degreeDown: "1P" },
    { value: "bebop locrian",         label: "Bebop Locrian",            type: "8-note", degreeDown: "7M" },
    { value: "minor bebop",           label: "Minor Bebop",              type: "8-note", degreeDown: "6M" },
    { value: "ichikosucho",           label: "Ichikosucho",              type: "8-note", degreeDown: "1P" },
    { value: "minor six diminished",  label: "Minor Six Diminished",     type: "8-note" },
    { value: "half-whole diminished", label: "Half-Whole Diminished",    type: "8-note" },
    { value: "kafi raga",             label: "Kafi Raga",                type: "8-note" },
    { value: "messiaen's mode #6",    label: "Messiaen's Mode #6",       type: "8-note" },
    // ===== 9-note scales =====
    { value: "composite blues",       label: "Composite Blues",          type: "9-note" },
    { value: "messiaen's mode #3",    label: "Messiaen's Mode #3",       type: "9-note" },
    // ===== 10-note scales =====
    { value: "messiaen's mode #7",    label: "Messiaen's Mode #7",       type: "10-note" },
    // ===== 12-note scales =====
    { value: "chromatic",             label: "Chromatic",                type: "12-note" },
  ];

  // O(1) lookup map: value → catalog entry
  var _scaleLookup = {};
  SCALE_CATALOG.forEach(function (s) { _scaleLookup[s.value] = s; });

  // TYPE dropdown options — each filters SCALE_CATALOG by `type`
  var SCALE_TYPES = [
    { value: "modes",  label: "Modes" },
    { value: "jazz",   label: "Jazz common scales" },
    { value: "5-note", label: "5-note scales" },
    { value: "6-note", label: "6-note scales" },
    { value: "7-note", label: "7-note scales" },
    { value: "8-note", label: "8-note scales" },
    { value: "9-note", label: "9-note scales" },
    { value: "10-note", label: "10-note scales" },
    { value: "12-note", label: "12-note scales" },
  ];

  /**
   * Return the scales in a given TYPE category, preserving catalogue order.
   */
  function getScalesByType(typeValue) {
    return SCALE_CATALOG.filter(function (s) { return s.type === typeValue; });
  }

  /**
   * Return the Tonal.js scale-type name for a given scale value.
   * Falls back to the value itself when no tonalName override is set.
   */
  function getTonalScaleName(modeType) {
    var entry = _scaleLookup[modeType];
    return entry ? (entry.tonalName || entry.value) : modeType;
  }

  /**
   * Return the display label for a given scale value.
   */
  function getScaleLabel(modeType) {
    var entry = _scaleLookup[modeType];
    return entry ? entry.label : modeType;
  }

  /**
   * Return the number of notes in one octave of the given scale.
   * Most modes have 7, pentatonics have 5, blues have 6, etc.
   * Uses Tonal.Scale.get() (already proven in this codebase) rather than
   * Tonal.ScaleType.get() to avoid any uncertainty about sub-module
   * exposure in the UMD browser bundle.
   */
  function getScaleSize(modeType) {
    var scaleName = getTonalScaleName(modeType);
    var s = Tonal.Scale.get("C4 " + scaleName);
    if (s && !s.empty && s.intervals && s.intervals.length > 0) {
      return s.intervals.length;
    }
    return 7; // sensible fallback
  }

  /* ---------- DOM ---------- */
  const keySelect          = document.getElementById("keySelect");
  const typeSelect         = document.getElementById("typeSelect");
  const modeSelect         = document.getElementById("modeSelect");
  const modeLabelEl        = document.getElementById("modeLabel");
  const lowestNoteSelect        = document.getElementById("lowestNoteSelect");
  const numOctavesSelect        = document.getElementById("numOctavesSelect");
  const lowestNoteSelectMobile  = document.getElementById("lowestNoteSelectMobile");
  const numOctavesSelectMobile  = document.getElementById("numOctavesSelectMobile");
  const keySigToggle       = document.getElementById("keySigToggle");
  const fingeringToggle    = document.getElementById("fingeringToggle");
  const noteNameToggle     = document.getElementById("noteNameToggle");
  const degreeToggle       = document.getElementById("degreeToggle");
  const instrumentSelect   = document.getElementById("instrumentSelect");
  const tubaSelect         = document.getElementById("tubaSelect");
  const tubaSelectLabel    = document.querySelector('label[for="tubaSelect"]');
  const fingeringToggleLabel = document.querySelector('label[for="fingeringToggle"]');
  const heroTitleEl        = document.querySelector('.hero h1');
  const heroSubtitleEl     = document.querySelector('.hero .subtitle');
  const patternSelect      = document.getElementById("patternSelect");
  const directionSelect    = document.getElementById("directionSelect");
  const shuffleKeyBtn      = document.getElementById("shuffleKeyBtn");
  const shuffleModeBtn     = document.getElementById("shuffleModeBtn");
  const shufflePatternBtn  = document.getElementById("shufflePatternBtn");
  const playBtn         = document.getElementById("playBtn");
  const playBtnDesktop  = document.getElementById("playBtnDesktop");
  const playIconEl      = playBtn.querySelector(".play-icon");
  const playLabelEl     = playBtn.querySelector(".play-label");
  const playIconDesktopEl  = playBtnDesktop ? playBtnDesktop.querySelector(".play-icon") : null;
  const playLabelDesktopEl = playBtnDesktop ? playBtnDesktop.querySelector(".play-label") : null;
  const printBtn        = document.getElementById("printBtn");
  const bpmSlider       = document.getElementById("bpmSlider");
  const bpmValueEl      = document.getElementById("bpmValue");
  const scaleNameEl     = document.getElementById("scaleName");
  const noteCountEl     = document.getElementById("noteCount");
  const keySigIndicator = document.getElementById("keySigIndicator");
  const keySigLabel     = keySigIndicator.querySelector(".keysig-label");
  const notationHintEl  = document.getElementById("notationHint");
  const output          = document.getElementById("vexflow-output");
  const outputPrint     = document.getElementById("vexflow-output-print");

  /* ---------- Shuffle bag ---------- */
  /**
   * Creates a shuffle bag that cycles through values in random order,
   * reshuffling once every value has been returned.
   */
  function createShuffleBag(values) {
    var bag = values.slice();
    var index = 0;

    function fisherYates(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
    }

    fisherYates(bag);

    return {
      next: function () {
        if (index >= bag.length) {
          fisherYates(bag);
          index = 0;
        }
        return bag[index++];
      },
      getState: function () {
        return { bag: bag.slice(), index: index };
      },
      setState: function (state) {
        if (state && state.bag && state.bag.length === values.length) {
          var valid = true;
          for (var i = 0; i < values.length; i++) {
            if (state.bag.indexOf(values[i]) === -1) { valid = false; break; }
          }
          if (valid) {
            bag = state.bag.slice();
            index = typeof state.index === "number" && state.index >= 0 && state.index <= bag.length ? state.index : 0;
            return;
          }
        }
        fisherYates(bag);
        index = 0;
      }
    };
  }

  // Key shuffle bag: 12 unique pitch classes, randomly picks one option
  // from each enharmonic pair (C#/Db, F#/Gb, B/Cb) on each reshuffle
  var KEY_BASE = ["C", "F", "Bb", "Eb", "Ab", "E", "A", "D", "G"];
  var KEY_PAIRS = [["C#","Db"], ["F#","Gb"], ["B","Cb"]];

  function createKeyShuffleBag() {
    function buildBag() {
      var bag = KEY_BASE.slice();
      KEY_PAIRS.forEach(function (p) { bag.push(Math.random() < 0.5 ? p[0] : p[1]); });
      return bag;
    }
    var bag = buildBag();
    function shuffle(arr) { for (var i = arr.length-1; i > 0; i--) { var j = Math.floor(Math.random()*(i+1)); var t=arr[i]; arr[i]=arr[j]; arr[j]=t; } }
    shuffle(bag);
    var index = 0;
    return {
      next: function () {
        if (index >= bag.length) { bag = buildBag(); shuffle(bag); index = 0; }
        return bag[index++];
      },
      getState: function () { return { bag: bag.slice(), index: index }; },
      setState: function (state) {
        if (state && state.bag && state.bag.length === 12) {
          // Validate: all 9 base keys present, exactly one from each enharmonic pair
          var valid = true;
          for (var i = 0; i < KEY_BASE.length; i++) {
            if (state.bag.indexOf(KEY_BASE[i]) === -1) { valid = false; break; }
          }
          for (var i = 0; i < KEY_PAIRS.length; i++) {
            var a = state.bag.indexOf(KEY_PAIRS[i][0]) !== -1;
            var b = state.bag.indexOf(KEY_PAIRS[i][1]) !== -1;
            if ((a && b) || (!a && !b)) { valid = false; break; }
          }
          if (valid) {
            bag = state.bag.slice();
            index = typeof state.index === "number" && state.index >= 0 && state.index <= 12 ? state.index : 0;
          } else {
            bag = buildBag(); shuffle(bag); index = 0;
          }
        } else {
          bag = buildBag(); shuffle(bag); index = 0;
        }
      }
    };
  }

  var keyShuffleBag     = createKeyShuffleBag();
  // modeShuffleBag is rebuilt whenever TYPE changes — see rebuildModeShuffleBag()
  var modeShuffleBag    = createShuffleBag(getScalesByType(typeSelect.value).map(function (s) { return s.value; }));
  var patternShuffleBag = createShuffleBag(PATTERNS.map(function (p) { return p.value; }));

  /**
   * Rebuild the mode shuffle bag from the scales in the current TYPE category.
   * Called whenever TYPE changes.
   */
  function rebuildModeShuffleBag() {
    var values = getScalesByType(typeSelect.value).map(function (s) { return s.value; });
    modeShuffleBag = createShuffleBag(values);
  }

  function randomizeKey() {
    var nextKey = keyShuffleBag.next();
    keySelect.value = nextKey;
    // Animate the dice button
    shuffleKeyBtn.classList.add("shuffling");
    setTimeout(function () { shuffleKeyBtn.classList.remove("shuffling"); }, 350);
    render();
    savePreferences();
  }

  function randomizeMode() {
    var nextMode = modeShuffleBag.next();
    modeSelect.value = nextMode;
    shuffleModeBtn.classList.add("shuffling");
    setTimeout(function () { shuffleModeBtn.classList.remove("shuffling"); }, 350);
    render();
    savePreferences();
  }

  function randomizePattern() {
    var nextPattern = patternShuffleBag.next();
    patternSelect.value = nextPattern;
    shufflePatternBtn.classList.add("shuffling");
    setTimeout(function () { shufflePatternBtn.classList.remove("shuffling"); }, 350);
    render();
    savePreferences();
  }

  /* ---------- Populate dropdowns ---------- */
  KEYS.forEach(function (k) {
    keySelect.add(new Option(KEY_LABELS[k] || k, k));
  });
  keySelect.value = "Bb";

  // Populate TYPE dropdown
  SCALE_TYPES.forEach(function (t) {
    typeSelect.add(new Option(t.label, t.value));
  });
  typeSelect.value = "modes";

  /**
   * Rebuild the MODE dropdown from the currently-selected TYPE.
   * If the previously-selected scale exists in the new category, keep it;
   * otherwise default to the first scale in the category.
   * @param {string} prevModeValue - previously selected mode value (optional)
   */
  function populateModeSelect(prevModeValue) {
    var currentType = typeSelect.value;
    var scales = getScalesByType(currentType);
    // Clear all existing options / optgroups
    modeSelect.innerHTML = "";
    scales.forEach(function (s) {
      modeSelect.add(new Option(s.label, s.value));
    });
    // Preserve selection if the scale is in this category
    if (prevModeValue && scales.some(function (s) { return s.value === prevModeValue; })) {
      modeSelect.value = prevModeValue;
    } else {
      modeSelect.value = scales.length > 0 ? scales[0].value : "";
    }
  }

  /**
   * Update the MODE label to show the currently-selected TYPE's display name.
   * e.g. when TYPE is "modes", label shows "Modes"; when "5-note", shows "5-note scales".
   */
  function updateModeLabel() {
    var typeVal = typeSelect.value;
    var typeEntry = SCALE_TYPES.filter(function (t) { return t.value === typeVal; })[0];
    modeLabelEl.textContent = typeEntry ? typeEntry.label : "Mode";
  }

  populateModeSelect("major");
  updateModeLabel();
  rebuildModeShuffleBag();

  INSTRUMENTS.forEach(function (inst) {
    instrumentSelect.add(new Option(inst.label, inst.value));
  });
  instrumentSelect.value = "tuba";

  TUBA_KEYS.forEach(function (t) {
    tubaSelect.add(new Option(t.label, t.value));
  });
  tubaSelect.value = "0";

  PATTERNS.forEach(function (p) {
    patternSelect.add(new Option(p.label, p.value));
  });
  patternSelect.value = "scale";

  DIRECTION.forEach(function (d) {
    directionSelect.add(new Option(d.label, d.value));
  });
  directionSelect.value = "ascending";

  // Populate Lowest Starting Note: chromatic from C0 through B1, plus C2
  var chromaticNotes = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  var lowestOptions = [];
  for (var o = 0; o <= 1; o++) {
    chromaticNotes.forEach(function (n) { lowestOptions.push(n + o); });
  }
  lowestOptions.push("C2");

  lowestOptions.forEach(function (n) {
    var label = n.replace("b", "\u266D");
    lowestNoteSelect.add(new Option(label, n));
    lowestNoteSelectMobile.add(new Option(label, n));
  });
  lowestNoteSelect.value = "E1";
  lowestNoteSelectMobile.value = "E1";

  // Populate Number of Octaves: 1 through 5
  [1, 2, 3, 4, 5].forEach(function (n) {
    var label = String(n);
    numOctavesSelect.add(new Option(label, String(n)));
    numOctavesSelectMobile.add(new Option(label, String(n)));
  });
  numOctavesSelect.value = "1";
  numOctavesSelectMobile.value = "1";

  /**
   * Return the notes for a chord rooted at index i.
   * Both ascending and descending chord patterns build *above* the root.
   */
  function getChordNotes(allNotes, i, steps, desc) {
    var res = [];
    if (desc) {
      for (var s = steps.length - 1; s >= 0; s--) res.push(allNotes[i + steps[s]]);
    } else {
      for (var s = 0; s < steps.length; s++) res.push(allNotes[i + steps[s]]);
    }
    return res;
  }

  /**
   * Generate ascending pattern from scale notes between startIdx and endIdx.
   * @param {string[]} allNotes - full scale notes array (includes lower octave prepend)
   * @param {string}   pattern  - pattern type
   * @param {number}   startIdx - index of tonic at startOctave
   * @param {number}   endIdx   - index of last root (may extend past tonic at endOctave)
   * @returns {string[]} transformed note sequence
   */
  function generateAscendingPattern(allNotes, pattern, startIdx, endIdx) {
    if (!allNotes || allNotes.length === 0 || startIdx > endIdx) return [];

    if (pattern === "scale") {
      return allNotes.slice(startIdx, endIdx + 1);
    }

    if (INTERVAL_OFFSETS[pattern] !== undefined) {
      var offset = INTERVAL_OFFSETS[pattern];
      var result = [];
      for (var i = startIdx; i <= endIdx && i + offset < allNotes.length; i++) {
        result.push(allNotes[i]);
        result.push(allNotes[i + offset]);
      }
      return result;
    }

    var isDescChord = CHORD_DESC_OF[pattern] !== undefined;
    var chordPattern = isDescChord ? CHORD_DESC_OF[pattern] : pattern;

    if (CHORD_STEPS[chordPattern] !== undefined) {
      var steps = CHORD_STEPS[chordPattern];
      var result = [];
      for (var i = startIdx; i <= endIdx; i++) {
        var maxIdx = i + steps[steps.length - 1];
        if (maxIdx >= allNotes.length) break;
        result = result.concat(getChordNotes(allNotes, i, steps, isDescChord));
      }
      return result;
    }

    if (CHORD_ALT_OF[pattern] !== undefined) {
      var altSteps = CHORD_STEPS[CHORD_ALT_OF[pattern]];
      var result = [];
      var lastStep = altSteps[altSteps.length - 1];
      for (var i = startIdx; i <= endIdx; i++) {
        if (i + lastStep >= allNotes.length) break;
        if ((i - startIdx) % 2 === 0) {
          for (var si = 0; si < altSteps.length; si++) result.push(allNotes[i + altSteps[si]]);
        } else {
          for (var si = altSteps.length - 1; si >= 0; si--) result.push(allNotes[i + altSteps[si]]);
        }
      }
      return result;
    }

    if (pattern === "clarke") {
      var result = [];
      for (var i = startIdx; i < endIdx && i + 2 < allNotes.length; i++) {
        result.push(allNotes[i]);
        result.push(allNotes[i + 1]);
        result.push(allNotes[i + 2]);
        result.push(allNotes[i]);
      }
      result.push(allNotes.length > endIdx ? allNotes[endIdx] : allNotes[0]);
      return result;
    }

    return allNotes.slice(startIdx, endIdx + 1);
  }

  /**
   * Generate descending pattern from scale notes, iterating downward.
   * First note of each pair/chord is the higher note (within range),
   * second note goes below (may dip below startOctave).
   */
  function generateDescendingPattern(allNotes, pattern, startIdx, endIdx) {
    if (!allNotes || allNotes.length === 0 || startIdx > endIdx) return [];

    if (pattern === "scale") {
      var res = [];
      for (var i = endIdx; i >= startIdx; i--) res.push(allNotes[i]);
      return res;
    }

    if (INTERVAL_OFFSETS[pattern] !== undefined) {
      var offset = INTERVAL_OFFSETS[pattern];
      var result = [];
      for (var i = endIdx; i >= startIdx; i--) {
        if (i - offset < 0) break;
        result.push(allNotes[i]);
        result.push(allNotes[i - offset]);
      }
      return result;
    }

    var isDescChord = CHORD_DESC_OF[pattern] !== undefined;
    var chordPattern = isDescChord ? CHORD_DESC_OF[pattern] : pattern;

    if (CHORD_STEPS[chordPattern] !== undefined) {
      var steps = CHORD_STEPS[chordPattern];
      var result = [];
      for (var i = endIdx; i >= startIdx; i--) {
        if (i + steps[steps.length - 1] >= allNotes.length) continue;
        result = result.concat(getChordNotes(allNotes, i, steps, isDescChord));
      }
      return result;
    }

    if (CHORD_ALT_OF[pattern] !== undefined) {
      var altSteps = CHORD_STEPS[CHORD_ALT_OF[pattern]];
      var result = [];
      var lastStep = altSteps[altSteps.length - 1];
      for (var i = endIdx; i >= startIdx; i--) {
        if (i + lastStep >= allNotes.length) continue;
        if ((i - startIdx) % 2 === 0) {
          for (var si = 0; si < altSteps.length; si++) result.push(allNotes[i + altSteps[si]]);
        } else {
          for (var si = altSteps.length - 1; si >= 0; si--) result.push(allNotes[i + altSteps[si]]);
        }
      }
      return result;
    }

    if (pattern === "clarke") {
      var result = [];
      for (var i = endIdx; i > startIdx && i - 2 >= 0; i--) {
        result.push(allNotes[i]);
        result.push(allNotes[i - 1]);
        result.push(allNotes[i - 2]);
        result.push(allNotes[i]);
      }
      result.push(allNotes[startIdx]);
      return result;
    }

    return [];
  }

  /**
   * Compute scale-degree labels (1-based) for an array of tonal notes.
   * Returns an array of strings parallel to `notes`, e.g. ["1","2","3",…].
   * Notes whose pitch class isn't found in the scale get "?".
   * @param {string[]} notes    - Tonal note names
   * @param {string}   tonic    - key root e.g. "Bb"
   * @param {string}   modeType - scale type e.g. "major"
   * @returns {string[]}
   */
  function getDegreeLabels(notes, tonic, modeType) {
    var labels = [];
    if (!notes || notes.length === 0) return labels;
    var scaleRef = Tonal.Scale.get(tonic + "4 " + getTonalScaleName(modeType));
    if (!scaleRef || scaleRef.empty || !scaleRef.notes) return labels;
    var scalePcs = scaleRef.notes.map(function (n) { return Tonal.Note.pitchClass(n); });
    var scaleSize = getScaleSize(modeType);
    for (var i = 0; i < notes.length; i++) {
      var pc = Tonal.Note.pitchClass(notes[i]);
      var idx = scalePcs.indexOf(pc);
      if (idx >= 0) {
        var deg = (idx % scaleSize) + 1;
        labels.push(String(deg));
      } else {
        labels.push("?");
      }
    }
    return labels;
  }

  /* ---------- Music theory via Tonal.js ---------- */

  function getScaleNotes(tonic, modeType, startOctave, endOctave) {
    if (startOctave > endOctave) return [];
    var tonicWithOct = tonic + startOctave;

    // Look up the scale directly from Tonal.js's built-in scale dictionary.
    // All scale types (including mixolydian b6 and the jazz scales) are
    // shipped by Tonal.js — no manual note alteration is needed.
    var scaleName = getTonalScaleName(modeType);
    var scale = Tonal.Scale.get(tonicWithOct + " " + scaleName);
    if (!scale || scale.empty || !scale.notes || scale.notes.length === 0) return [];
    var base = scale.notes.slice();

    var octaves = endOctave - startOctave;
    var out = [];
    for (var o = 0; o < octaves; o++) {
      for (var i = 0; i < base.length; i++) {
        var m = base[i];
        for (var k = 0; k < o; k++) m = Tonal.Note.transpose(m, "8P");
        out.push(m);
      }
    }
    var top = base[0];
    for (var k2 = 0; k2 < octaves; k2++) top = Tonal.Note.transpose(top, "8P");
    out.push(top);
    return out;
  }

  function toVexKey(tonalNote) {
    var pc = Tonal.Note.pitchClass(tonalNote).toLowerCase();
    var oct = Tonal.Note.octave(tonalNote);
    return pc + "/" + oct;
  }

  function accidentalType(pitchClass) {
    if (pitchClass.indexOf("##") !== -1) return "##";
    if (pitchClass.indexOf("bb") !== -1) return "bb";
    if (pitchClass.indexOf("#")  !== -1) return "#";
    if (pitchClass.indexOf("b")  !== -1) return "b";
    return null;
  }

  var STANDARD_KEY_SIGS = new Set([
    "C", "G", "D", "A", "E", "B", "F#", "C#",
    "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb",
  ]);

  var INTERVAL_OFFSETS = {
    diatonicThirds: 2,
    diatonicFourths: 3,
    diatonicFifths: 4,
    diatonicSixths: 5,
    diatonicSeventhsIntervals: 6
  };

  var CHORD_STEPS = {
    diatonicTriads:   [0, 2, 4],
    diatonicSevenths: [0, 2, 4, 6],
    diatonicNinths:   [0, 2, 4, 6, 8]
  };

  var CHORD_DESC_OF = {
    diatonicTriadsDesc: "diatonicTriads",
    diatonicSeventhsDesc: "diatonicSevenths",
    diatonicNinthsDesc: "diatonicNinths"
  };

  var CHORD_ALT_OF = {
    diatonicTriadsAlt:    "diatonicTriads",
    diatonicSeventhsAlt:  "diatonicSevenths",
    diatonicNinthsAlt:    "diatonicNinths"
  };

  var KEY_FIFTHS = {
    "C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F#": 6, "C#": 7,
    "F": -1, "Bb": -2, "Eb": -3, "Ab": -4, "Db": -5, "Gb": -6, "Cb": -7
  };

  // Key signatures: each scale entry's `degreeDown` field (set in
  // SCALE_CATALOG) gives the interval to descend from the tonic to the
  // parent major key. Scales without a clean major-key parent omit it
  // and getKeySignature returns null (all accidentals shown inline).
  function getKeySignature(tonic, modeType) {
    var entry = _scaleLookup[modeType];
    if (!entry || !entry.degreeDown) return null;
    var parent = Tonal.Note.transpose(tonic, "-" + entry.degreeDown);
    if (STANDARD_KEY_SIGS.has(parent)) return parent;
    return null;
  }

  function alteredPitchClasses(keySigName) {
    if (!keySigName || keySigName === "C") return new Set();
    var scale = Tonal.Key.majorKey(keySigName);
    if (!scale || !scale.scale) return new Set();
    var altered = new Set();
    var naturalSet = new Set(["C", "D", "E", "F", "G", "A", "B"]);
    scale.scale.forEach(function (n) {
      var pc = Tonal.Note.pitchClass(n);
      if (!naturalSet.has(pc)) altered.add(pc);
    });
    return altered;
  }

  /* ---------- Shared stave rendering helper ---------- */
  function renderSystem(ctx, systemNotes, sysDurs, sysDegrees, y, haveKeySig, keySigName, alteredPcs, showNoteNames, showDegrees, showFingerings, tubaShift, clef, availWidth, SYSTEM_WIDTH) {
    var stave = new Stave(10, y, SYSTEM_WIDTH - 20);
    stave.addClef(clef);
    if (haveKeySig) stave.addKeySignature(keySigName);
    stave.setContext(ctx).draw();

    var staveNotes = systemNotes.map(function (tonalNote, ni) {
      var key = toVexKey(tonalNote);
      var dur = sysDurs[ni] || "q";
      var sn  = new StaveNote({ keys: [key], duration: dur, clef: clef, autoStem: true });
      var pc  = Tonal.Note.pitchClass(tonalNote);
      var acc = accidentalType(pc);
      if (acc && (!haveKeySig || !alteredPcs.has(pc))) {
        sn.addModifier(new Accidental(acc), 0);
      }
      // Show natural sign when the key signature has a sharp/flat
      // version of this natural note (e.g., F♮ in D major where F# is in the key sig)
      if (haveKeySig && !acc) {
        var letter = pc.charAt(0);
        if (alteredPcs.has(letter + "#") || alteredPcs.has(letter + "b")) {
          sn.addModifier(new Accidental("n"), 0);
        }
      }
      if (showNoteNames) {
        var nameAnnotation = new Annotation(tonalNote);
        nameAnnotation.setVerticalJustification(Annotation.VerticalJustify.TOP);
        nameAnnotation.setFont({ family: "Inter, system-ui, sans-serif", size: 9, weight: "400" });
        sn.addModifier(nameAnnotation, 0);
      }
      if (showDegrees && sysDegrees.length > ni) {
        var degAnnotation = new Annotation(sysDegrees[ni]);
        degAnnotation.setVerticalJustification(Annotation.VerticalJustify.TOP);
        degAnnotation.setFont({ family: "Inter, system-ui, sans-serif", size: 10, weight: "700" });
        sn.addModifier(degAnnotation, 0);
      }
      if (showFingerings) {
        var fingering = getFingering(tonalNote, tubaShift);
        if (fingering) {
          var annotation = new Annotation(fingering);
          annotation.setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
          annotation.setFont({ family: "Inter, system-ui, sans-serif", size: 11, weight: "600" });
          sn.addModifier(annotation, 0);
        }
      }
      return sn;
    });

    var totalBeats = 0;
    for (var d = 0; d < sysDurs.length; d++) {
      totalBeats += sysDurs[d] === "h" ? 2 : 1;
    }
    var voice = new Voice({ num_beats: totalBeats, beat_value: 4 });
    if (Voice.Mode) voice.setMode(Voice.Mode.SOFT);
    voice.addTickables(staveNotes);

    new Formatter().joinVoices([voice]).format([voice], availWidth);
    voice.draw(ctx, stave);
  }

  /* ---------- MusicXML export ---------- */
  var musicXmlBtn = document.getElementById("musicXmlBtn");

  /**
   * Build a valid MusicXML 4.1 partwise score string from the current notes.
   * @param {string[]} notes      - Tonal note names e.g. ["Bb2", "C3", ...]
   * @param {string[]} durations  - "q" (quarter) or "h" (half)
   * @param {string}   tonic      - key root e.g. "Bb"
   * @param {string}   modeType   - mode e.g. "ionian"
   * @param {string}   title      - score title
   * @param {boolean}  useKeySig      - whether key signatures are enabled
   * @param {boolean}  showFingerings - include fingering annotations
   * @param {boolean}  showNoteNames  - include note-name annotations
   * @param {number}   tubaShift      - semitone shift for tuba transposition
   * @returns {string} MusicXML document
   */
  function generateMusicXML(notes, durations, tonic, modeType, title, useKeySig, showFingerings, showNoteNames, showDegrees, tubaShift, clef) {
    var parts = [];

    // XML declaration + doctype
    parts.push('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');
    parts.push('<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">');
    parts.push('<score-partwise version="4.1">');

    // Part list
    parts.push('<part-list>');
    parts.push('<score-part id="P1">');
    parts.push('<part-name>' + getInstrumentName() + '</part-name>');
    parts.push('</score-part>');
    parts.push('</part-list>');

    // Work title
    if (title) {
      parts.push('<work><work-title>' + title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</work-title></work>');
    }

    // Part
    parts.push('<part id="P1">');

    // Key signature fifths
    var fifths = 0;
    if (useKeySig) {
      var ks = getKeySignature(tonic, modeType);
      if (ks && KEY_FIFTHS[ks] !== undefined) fifths = KEY_FIFTHS[ks];
    }

    // Compute degree labels for MusicXML when DEGREES toggle is on
    var degreeLabels = showDegrees ? getDegreeLabels(notes, tonic, modeType) : [];

    // Build notes with parsed pitch components
    var parsedNotes = [];
    for (var i = 0; i < notes.length; i++) {
      var step = Tonal.Note.pitchClass(notes[i]);
      var octave = Tonal.Note.octave(notes[i]);
      var alter = 0;
      if (step.indexOf("#") !== -1) { alter = 1; step = step.replace("#", ""); }
      else if (step.indexOf("b") !== -1) { alter = -1; step = step.replace("b", ""); }
      var dur = durations[i] || "q";
      var durVal = dur === "h" ? 2 : 1;
      var durType = dur === "h" ? "half" : "quarter";
      var fingering = showFingerings ? getFingering(notes[i], tubaShift) : "";
      var noteName  = showNoteNames ? notes[i] : "";
      var degree    = showDegrees && degreeLabels.length > i ? degreeLabels[i] : "";
      parsedNotes.push({ step: step, alter: alter, octave: octave, duration: durVal, type: durType, fingering: fingering, noteName: noteName, degree: degree });
    }

    // Group into measures (4/4 time, 4 beats per measure)
    var beatsPerMeasure = 4;
    var measureIdx = 0;
    var noteIdx = 0;

    while (noteIdx < parsedNotes.length) {
      measureIdx++;
      parts.push('<measure number="' + measureIdx + '">');

      // First measure: attributes
      if (measureIdx === 1) {
        parts.push('<attributes>');
        parts.push('<divisions>1</divisions>');
        parts.push('<key><fifths>' + fifths + '</fifths></key>');
        parts.push('<time><beats>4</beats><beat-type>4</beat-type></time>');
        if (clef === "treble") {
          parts.push('<clef><sign>G</sign><line>2</line></clef>');
        } else {
          parts.push('<clef><sign>F</sign><line>4</line></clef>');
        }
        parts.push('</attributes>');
      }

      // Fill measure with notes up to 4 beats
      var beatsUsed = 0;
      while (noteIdx < parsedNotes.length && beatsUsed < beatsPerMeasure) {
        var pn = parsedNotes[noteIdx];
        if (beatsUsed + pn.duration > beatsPerMeasure) break; // don't split notes
        parts.push('<note>');
        parts.push('<pitch>');
        parts.push('<step>' + pn.step + '</step>');
        if (pn.alter !== 0) parts.push('<alter>' + pn.alter + '</alter>');
        parts.push('<octave>' + pn.octave + '</octave>');
        parts.push('</pitch>');
        parts.push('<duration>' + pn.duration + '</duration>');
        parts.push('<type>' + pn.type + '</type>');
        if (pn.fingering) {
          parts.push('<notations><technical><fingering>' + pn.fingering.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</fingering></technical></notations>');
        }
        if (pn.noteName) {
          parts.push('<lyric number="1"><text>' + pn.noteName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</text></lyric>');
        }
        if (pn.degree) {
          parts.push('<lyric number="2"><text>' + pn.degree.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</text></lyric>');
        }
        parts.push('</note>');
        beatsUsed += pn.duration;
        noteIdx++;
      }

      parts.push('</measure>');
    }

    parts.push('</part>');
    parts.push('</score-partwise>');

    return parts.join('\n');
  }

  function exportMusicXML() {
    if (currentNotes.length === 0) return;

    var title = scaleNameEl.textContent;
    if (title === "\u2014") title = getInstrumentName() + " Scale";

    var tonic         = keySelect.value;
    var modeType      = modeSelect.value;
    var useKeySig     = keySigToggle.checked;
    var showFingerings = fingeringToggle.checked;
    var showNoteNames  = noteNameToggle.checked;
    var showDegrees    = degreeToggle.checked;
    var tubaCfg        = getTubaConfig();
    var tubaShift      = tubaCfg.shift;
    var clef           = tubaCfg.clef || "bass";

    var xml = generateMusicXML(currentNotes, currentDurations, tonic, modeType, title, useKeySig, showFingerings, showNoteNames, showDegrees, tubaShift, clef);

    var blob = new Blob([xml], { type: "application/vnd.recordare.musicxml+xml" });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement("a");
    a.href     = url;
    a.download = title.replace(/[^a-zA-Z0-9 \-_\.]/g, "") + ".musicxml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  musicXmlBtn.addEventListener("click", exportMusicXML);

  /* ---------- VexFlow rendering ---------- */
  var currentNotes = [];
  var currentDurations = [];

  function render() {
    var tonic       = keySelect.value;
    var modeType    = modeSelect.value;
    var lowestNote  = lowestNoteSelect.value;
    var numOctaves  = parseInt(numOctavesSelect.value, 10);
    var tubaCfg     = getTubaConfig();

    var lowestMidi    = Tonal.Note.midi(lowestNote);
    var tonicBaseMidi = Tonal.Note.midi(tonic + "0");
    if (lowestMidi === null || lowestMidi === undefined) lowestMidi = 24; // fallback to C1
    if (tonicBaseMidi === null || tonicBaseMidi === undefined) tonicBaseMidi = 12; // fallback to C0
    // When Treble Clef is selected, shift the lowest note up two octaves
    // (24 semitones) internally so the notation sits on the treble staff.
    // The LOWEST NOTE menu value itself is not changed.
    if (tubaCfg.clef === "treble") lowestMidi += 24;
    // When B♭ tuba is selected, shift the lowest note up one octave
    // (12 semitones) internally to sit higher on the bass staff.
    if (tubaCfg.value === "12") lowestMidi += 12;
    var startOctave   = Math.max(0, Math.ceil((lowestMidi - tonicBaseMidi) / 12));
    var endOctave     = startOctave + numOctaves;

    var useKeySig   = keySigToggle.checked;
    var showFingerings = fingeringToggle.checked;
    var showNoteNames  = noteNameToggle.checked;
    var showDegrees    = degreeToggle.checked;
    var tubaShift   = tubaCfg.shift;
    var clef        = tubaCfg.clef || "bass";
    var patternType = patternSelect.value;
    var direction   = directionSelect.value;

    var octaves = Math.max(1, endOctave - startOctave);

    // Build a wide-enough notes array that covers both ascending
    // (needs extra octave above for upper notes of dyads/chords) and
    // descending (needs extra octave below for lower notes).
    var lowOctave = Math.max(0, startOctave - 1);
    var allScaleNotes = getScaleNotes(tonic, modeType, lowOctave, endOctave + 1);
    // Append one more octave above for the highest ascending pairs
    {
      var extraOct = getScaleNotes(tonic, modeType, endOctave + 1, endOctave + 2);
      allScaleNotes = allScaleNotes.concat(extraOct.slice(1));
    }

    // Number of notes per octave for this scale type (7 for diatonic modes,
    // 6 for blues, 8 for bebop/diminished).
    var scaleSize = getScaleSize(modeType);

    // Tonic at startOctave lives at this index in allScaleNotes
    var startIdx = scaleSize * (startOctave - lowOctave);
    // Tonic at endOctave lives at this index
    var endIdx   = scaleSize * (endOctave - lowOctave);

    var notes = [];
    if (startOctave <= endOctave) {
      if (direction === "ascending") {
        // Scale pattern uses endIdx (no "extra root" past range); other patterns need ascEndIdx
        var ascEndIdx = patternType === "scale" ? endIdx : startIdx + (scaleSize + 1) * octaves - 1;
        notes = generateAscendingPattern(allScaleNotes, patternType, startIdx, ascEndIdx);
      } else if (direction === "descending") {
        notes = generateDescendingPattern(allScaleNotes, patternType, startIdx, endIdx);
      } else if (direction === "ascendingDescending") {
        // For interval / chord patterns, stop ascending one root
        // before the tonic so the turn-around pair is naturally the first
        // descending pair (root goes down by the interval instead of up).
        // Clarke ascends the full range (including the top-root group)
        // so the turn-around mirrors a real Clarke study; the duplicate
        // top tonic at the start of the descending half is trimmed.
        var isScale  = patternType === "scale";
        var isClarke = patternType === "clarke";
        var ascEndIdx = isScale ? endIdx : (isClarke ? endIdx : endIdx - 1);
        var up   = generateAscendingPattern(allScaleNotes, patternType, startIdx, ascEndIdx);
        var down = generateDescendingPattern(allScaleNotes, patternType, startIdx, endIdx);
        // Scale and Clarke both need the top tonic trimmed from descending.
        var trimCount = isScale ? 1 : (isClarke ? 1 : 0);
        notes = up.concat(down.slice(trimCount));
      }
    }

    // Drop the last note from interval patterns in descending / asc+desc direction
    if ((direction === "descending" || direction === "ascendingDescending") && notes.length > 0 && INTERVAL_OFFSETS[patternType] !== undefined) {
      notes.pop();
    }

    // For Asc+Desc interval patterns, insert a duplicate of the turn-around
    // root note so it appears as a half note + quarter note in the score.
    var durations = [];
    if (direction === "ascendingDescending" && INTERVAL_OFFSETS[patternType] !== undefined && notes.length > 0) {
      // Turn-around root is at the start of the descending half
      var peakIdx = 2 * (endIdx - startIdx);
      if (peakIdx >= 0 && peakIdx < notes.length) {
        var peakNote = notes[peakIdx];
        notes.splice(peakIdx + 1, 0, peakNote);
        durations = notes.map(function () { return "q"; });
        durations[peakIdx] = "h";
      } else {
        durations = notes.map(function () { return "q"; });
      }
    } else {
      durations = notes.map(function () { return "q"; });
    }

    // Last note is a half note for interval, scale, and Clarke patterns in Asc+Desc direction
    if (durations.length > 0 && direction === "ascendingDescending" && (INTERVAL_OFFSETS[patternType] !== undefined || patternType === "scale" || patternType === "clarke")) {
      durations[durations.length - 1] = "h";
    }

    currentNotes     = notes;
    currentDurations = durations;

    // Compute scale-degree labels when the DEGREES toggle is on.
    var degreeLabels = showDegrees ? getDegreeLabels(notes, tonic, modeType) : [];

    var keySigName    = useKeySig ? getKeySignature(tonic, modeType) : null;
    var alteredPcs    = keySigName ? alteredPitchClasses(keySigName) : new Set();
    var haveKeySig    = !!keySigName;

    /* Info bar */
    var keyLabel  = KEY_LABELS[tonic] || tonic;
    var modeLabel = getScaleLabel(modeType);
    var rangeText = startOctave <= endOctave
      ? numOctaves + " octave" + (numOctaves > 1 ? "s" : "")
      : "(invalid range)";
    scaleNameEl.textContent  = notes.length ? keyLabel + " " + modeLabel + " " + rangeText : "\u2014";
    noteCountEl.textContent  = notes.length ? notes.length + " notes" : "\u2014";

    /* Key signature indicator chip */
    keySigIndicator.classList.remove("keysig-clean", "keysig-inline", "keysig-off");
    if (!notes.length) {
      keySigLabel.textContent = "\u2014";
      keySigIndicator.classList.add("keysig-off");
      keySigIndicator.title = "";
    } else if (!useKeySig) {
      keySigIndicator.classList.add("keysig-off");
      keySigLabel.textContent = "Key sig off";
      keySigIndicator.title = "Key signatures are disabled \u2014 enable in Settings";
    } else if (haveKeySig) {
      keySigIndicator.classList.add("keysig-clean");
      keySigLabel.textContent = keySigName + " major";
      keySigIndicator.title = "Clean key signature: " + keySigName + " major";
    } else {
      keySigIndicator.classList.add("keysig-inline");
      keySigLabel.textContent = "Accidentals inline";
      keySigIndicator.title = "No clean key signature for this scale \u2014 all accidentals shown inline";
    }

    /* Note-names strip */
    if (notes.length) {
      notationHintEl.innerHTML = notes.map(function (n) {
        return '<span class="note-name">' + n + "</span>";
      }).join('<span class="note-sep"> \u00B7 </span>');
      // Re-append toggle button (wiped by innerHTML)
      notationHintEl.appendChild(noteToggle);
      notationHintEl.classList.remove("hidden");

      // Check for overflow and add collapse toggle if >3 lines
      setTimeout(function () {
        notationHintEl.classList.remove("has-overflow", "expanded");
        noteToggle.textContent = "Show all notes ▾";
        if (notationHintEl.scrollHeight > notationHintEl.clientHeight) {
          notationHintEl.classList.add("has-overflow");
        }
      }, 0);
    } else {
      notationHintEl.classList.add("hidden");
    }

    /* Clear & render */
    output.innerHTML = "";
    if (startOctave > endOctave) {
      output.innerHTML =
        '<p class="notation-hint">Starting octave must be less than or equal to the ending octave.</p>';
      notationHintEl.classList.add("hidden");
      return;
    }
    if (notes.length === 0) {
      output.innerHTML = '<p class="notation-hint">No scale available for this combination.</p>';
      return;
    }

    var n = notes.length;

    // Layout constants (in SVG pixels)
    var SYSTEM_WIDTH  = 880;
    var STAVE_TOP     = 16;
    var NOTE_PX       = 45;
    var CLEF_PX       = 60;
    var PAD_PX        = 30;
    var MAX_PER_LINE  = 10;
    var STAFF_HEIGHT  = 40;   // 5-line staff in px
    var MIN_PAD       = 24;   // min padding above/below staff
    var SEMITONE_PX   = 3;    // px per semitone above/below staff
    var STAFF_TOP_MIDI = clef === "treble" ? 77 : 57;  // F5 = top line of treble clef, A3 = top line of bass clef
    var STAFF_BOT_MIDI = clef === "treble" ? 64 : 41;  // E4 = bottom line of treble clef, F2 = bottom line of bass clef

    var keySigPad   = haveKeySig ? 70 : 0;
    var availWidth  = SYSTEM_WIDTH - CLEF_PX - keySigPad - PAD_PX;
    var perSystem   = Math.min(MAX_PER_LINE, n, Math.floor(availWidth / NOTE_PX));
    if (perSystem < 1) perSystem = 1;

    var numSystems = Math.ceil(n / perSystem);
    var systems = [];
    var systemDurations = [];
    var systemDegrees = [];
    var idx = 0;
    for (var s = 0; s < numSystems; s++) {
      var remaining        = n - idx;
      var remainingSystems = numSystems - s;
      var count            = Math.ceil(remaining / remainingSystems);
      systems.push(notes.slice(idx, idx + count));
      systemDurations.push(currentDurations.slice(idx, idx + count));
      if (degreeLabels.length > 0) systemDegrees.push(degreeLabels.slice(idx, idx + count));
      idx += count;
    }

    // Compute dynamic heights per system based on note range
    var systemHeights = [];
    for (var si = 0; si < numSystems; si++) {
      var sysNotes = systems[si];
      var loMidi = 127, hiMidi = 0;
      for (var ni = 0; ni < sysNotes.length; ni++) {
        var midi = Tonal.Note.midi(sysNotes[ni]);
        if (midi !== null && midi !== undefined) {
          if (midi < loMidi) loMidi = midi;
          if (midi > hiMidi) hiMidi = midi;
        }
      }
      var abovePx = hiMidi > STAFF_TOP_MIDI ? (hiMidi - STAFF_TOP_MIDI) * SEMITONE_PX + MIN_PAD : MIN_PAD;
      var belowPx = loMidi < STAFF_BOT_MIDI ? (STAFF_BOT_MIDI - loMidi) * SEMITONE_PX + MIN_PAD : MIN_PAD;
      systemHeights.push(STAFF_HEIGHT + abovePx + belowPx);
    }

    var fingeringPad  = showFingerings ? 24 : 0;
    var noteNamePad    = showNoteNames ? 20 : 0;
    var degreePad      = showDegrees ? 20 : 0;
    var topAnnotationPad = noteNamePad + degreePad;
    var extraPadPerSys = fingeringPad + noteNamePad + degreePad;

    // --- Render for screen (single SVG, tight spacing) ---
    {
      var totalHeight = STAVE_TOP + topAnnotationPad;
      for (var si2 = 0; si2 < numSystems; si2++) {
        totalHeight += systemHeights[si2] + extraPadPerSys;
      }
      totalHeight += 16; // bottom padding

      var renderer = new Renderer(output, Renderer.Backends.SVG);
      renderer.resize(SYSTEM_WIDTH, totalHeight);
      var ctx = renderer.getContext();

      var cumulativeY = STAVE_TOP + topAnnotationPad;
      systems.forEach(function (systemNotes, si) {
        var sysDegs = systemDegrees.length > 0 ? systemDegrees[si] : [];
        renderSystem(ctx, systemNotes, systemDurations[si], sysDegs, cumulativeY, haveKeySig, keySigName, alteredPcs, showNoteNames, showDegrees, showFingerings, tubaShift, clef, availWidth, SYSTEM_WIDTH);
        cumulativeY += systemHeights[si] + extraPadPerSys;
      });
    }

    // --- Render for print (per-system SVGs, page breaks) ---
    // ~880 px ≈ one US Letter page at 96 dpi with ¾″ margins.
    {
      outputPrint.innerHTML = "";
      var PAGE_HEIGHT_PX = 880;
      var currentPageHeight = 0;
      var pageWrapper = null;

      systems.forEach(function (systemNotes, si) {
        var sysH = systemHeights[si];
        var sysTotalH = STAVE_TOP + topAnnotationPad + sysH + extraPadPerSys + 8;

        // Start a new page if this system would overflow
        if (currentPageHeight > 0 && currentPageHeight + sysTotalH > PAGE_HEIGHT_PX) {
          currentPageHeight = 0;
          pageWrapper = null;
        }

        if (!pageWrapper) {
          pageWrapper = document.createElement("div");
          pageWrapper.className = "print-page";
          outputPrint.appendChild(pageWrapper);
        }

        currentPageHeight += sysTotalH;

        var wrapper = document.createElement("div");
        wrapper.className = "staff-system";
        pageWrapper.appendChild(wrapper);

        var renderer = new Renderer(wrapper, Renderer.Backends.SVG);
        renderer.resize(SYSTEM_WIDTH, sysTotalH);
        var ctx = renderer.getContext();

        var sysDegs2 = systemDegrees.length > 0 ? systemDegrees[si] : [];
        renderSystem(ctx, systemNotes, systemDurations[si], sysDegs2, STAVE_TOP + topAnnotationPad, haveKeySig, keySigName, alteredPcs, showNoteNames, showDegrees, showFingerings, tubaShift, clef, availWidth, SYSTEM_WIDTH);
      });
    }
  }

  /* ---------- Audio playback (Web Audio API) ---------- */
  var audioCtx = null;
  var playing  = false;
  var activeNodes = []; // { osc, gain, filter } for stop cleanup
  var playbackTimeouts = [];

  function stopPlayback() {
    // Stop and disconnect all active oscillator chains
    activeNodes.forEach(function (node) {
      try { node.osc.stop(); } catch (e) {}
      try { node.osc.disconnect(); } catch (e) {}
      try { node.gain.disconnect(); } catch (e) {}
      try { node.filter.disconnect(); } catch (e) {}
    });
    activeNodes = [];

    // Clear all pending timeouts
    playbackTimeouts.forEach(function (id) { clearTimeout(id); });
    playbackTimeouts = [];

    // Reset UI state (both play buttons)
    playing = false;
    var buttons = [playBtn, playBtnDesktop];
    var icons = [playIconEl, playIconDesktopEl];
    var labels = [playLabelEl, playLabelDesktopEl];
    buttons.forEach(function (b) { if (b) b.classList.remove("playing"); });
    icons.forEach(function (el) { if (el) el.textContent = "▶"; });
    labels.forEach(function (el) { if (el) el.textContent = "Play"; });
    var noteSpans = notationHintEl.querySelectorAll(".note-name");
    noteSpans.forEach(function (s) { s.classList.remove("active"); });
  }

  function togglePlayback() {
    if (playing) {
      stopPlayback();
      return;
    }
    if (currentNotes.length === 0) return;

    playing = true;
    var buttons = [playBtn, playBtnDesktop];
    var icons = [playIconEl, playIconDesktopEl];
    var labels = [playLabelEl, playLabelDesktopEl];
    buttons.forEach(function (b) { if (b) b.classList.add("playing"); });
    icons.forEach(function (el) { if (el) el.textContent = "■"; });
    labels.forEach(function (el) { if (el) el.textContent = "Stop"; });

    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    var noteSpans = notationHintEl.querySelectorAll(".note-name");
    var currentIdx = 0;

    function scheduleNext() {
      if (!playing) {
        stopPlayback();
        return;
      }
      if (currentIdx >= currentNotes.length) {
        currentIdx = 0;
      }

      var playbackShift = (getTubaConfig().playbackShift) || 0;
      var note = currentNotes[currentIdx];
      var freq = Tonal.Note.freq(note);
      if (freq && playbackShift !== 0) {
        freq = freq * Math.pow(2, playbackShift / 12);
      }

      // Skip notes without a valid frequency
      if (!freq || freq < 16) {
        noteSpans.forEach(function (s) { s.classList.remove("active"); });
        currentIdx++;
        scheduleNext();
        return;
      }

      // Read BPM fresh each note so slider changes take effect immediately
      var rate  = 60 / parseInt(bpmSlider.value, 10);
      var dur   = rate * 0.92;
      var noteDuration = currentDurations[currentIdx] === "h" ? 2 * rate : rate;

      var now = audioCtx.currentTime;
      var t   = now + 0.02;

      var osc    = audioCtx.createOscillator();
      var gain   = audioCtx.createGain();
      var filter = audioCtx.createBiquadFilter();

      activeNodes.push({ osc: osc, gain: gain, filter: filter });

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1400, t);
      filter.Q.value = 1;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.03);
      gain.gain.setTargetAtTime(0.001, t + 0.03, dur / 2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(t);
      osc.stop(t + dur + 0.05);

      // Highlight the current note name
      noteSpans.forEach(function (s, idx) {
        s.classList.toggle("active", idx === currentIdx);
      });

      currentIdx++;
      var timeoutId = setTimeout(scheduleNext, noteDuration * 1000);
      playbackTimeouts.push(timeoutId);
    }

    // Ensure the audio context is fully resumed before scheduling.
    // A newly-created AudioContext starts suspended and resume() is async;
    // if we schedule before resume completes, currentTime is frozen and
    // the first two notes end up nearly simultaneous.
    if (audioCtx.state === "suspended") {
      audioCtx.resume().then(scheduleNext);
    } else {
      scheduleNext();
    }
  }

  /* ---------- Wire up & initial render ---------- */
  var PREFS_KEY = "tuba-scale-prefs";

  function savePreferences() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        key: keySelect.value,
        type: typeSelect.value,
        mode: modeSelect.value,
        lowestNote: lowestNoteSelect.value,
        numOctaves: numOctavesSelect.value,
        instrument: instrumentSelect.value,
        tuba: tubaSelect.value,
        pattern: patternSelect.value,
        direction: directionSelect.value,
        bpm: bpmSlider.value,
        keySig: keySigToggle.checked,
        fingerings: fingeringToggle.checked,
        noteNames: noteNameToggle.checked,
        degrees: degreeToggle.checked,
        keyShuffleBag: keyShuffleBag.getState(),
        modeShuffleBag: modeShuffleBag.getState(),
        patternShuffleBag: patternShuffleBag.getState()
      }));
    } catch (e) {}
  }

  function loadPreferences() {
    try {
      var saved = JSON.parse(localStorage.getItem(PREFS_KEY));
      if (!saved) return;
      if (saved.key) { keySelect.value = saved.key; }
      // Migrate old preference keys from the pre-catalogue version:
      //   mixolydianFlat6 → "mixolydian b6", ionian → "major", aeolian → "minor"
      if (saved.mode === "mixolydianFlat6") saved.mode = "mixolydian b6";
      if (saved.mode === "ionian")         saved.mode = "major";
      if (saved.mode === "aeolian")        saved.mode = "minor";
      // Migrate old "basic" type: major pentatonic → 5-note, major/minor → modes
      if (saved.type === "basic") {
        saved.type = saved.mode === "major pentatonic" ? "5-note" : "modes";
      }
      if (saved.type) {
        typeSelect.value = saved.type;
      } else if (saved.mode && _scaleLookup[saved.mode]) {
        // Migrating from pre-catalogue version: infer TYPE from the saved mode
        typeSelect.value = _scaleLookup[saved.mode].type;
      }
      populateModeSelect(saved.mode || null);
      // Rebuild shuffle bag to match the restored TYPE's scale list
      rebuildModeShuffleBag();
      // Update MODE label to reflect the restored TYPE
      updateModeLabel();
      if (saved.lowestNote) { lowestNoteSelect.value = saved.lowestNote; lowestNoteSelectMobile.value = saved.lowestNote; }
      if (saved.numOctaves) { numOctavesSelect.value = saved.numOctaves; numOctavesSelectMobile.value = saved.numOctaves; }
      if (saved.instrument) { instrumentSelect.value = saved.instrument; }
      if (saved.tuba) { tubaSelect.value = saved.tuba; }
      if (saved.pattern) { patternSelect.value = saved.pattern; }
      if (saved.direction) { directionSelect.value = saved.direction; }
      if (saved.bpm) { bpmSlider.value = saved.bpm; bpmValueEl.textContent = saved.bpm; }
      if (typeof saved.keySig === "boolean") { keySigToggle.checked = saved.keySig; }
      if (typeof saved.fingerings === "boolean") { fingeringToggle.checked = saved.fingerings; }
      if (typeof saved.noteNames === "boolean") { noteNameToggle.checked = saved.noteNames; }
      if (typeof saved.degrees === "boolean") { degreeToggle.checked = saved.degrees; }
      if (saved.keyShuffleBag) { keyShuffleBag.setState(saved.keyShuffleBag); }
      if (saved.modeShuffleBag) { modeShuffleBag.setState(saved.modeShuffleBag); }
      if (saved.patternShuffleBag) { patternShuffleBag.setState(saved.patternShuffleBag); }
    } catch (e) {}
  }

  keySelect.addEventListener("change", function () { render(); savePreferences(); });
  typeSelect.addEventListener("change", function () {
    var prevMode = modeSelect.value;
    populateModeSelect(prevMode);
    rebuildModeShuffleBag();
    updateModeLabel();
    render();
    savePreferences();
  });
  modeSelect.addEventListener("change", function () { render(); savePreferences(); });
  lowestNoteSelect.addEventListener("change", function () { lowestNoteSelectMobile.value = lowestNoteSelect.value; render(); savePreferences(); });
  numOctavesSelect.addEventListener("change", function () { numOctavesSelectMobile.value = numOctavesSelect.value; render(); savePreferences(); });
  lowestNoteSelectMobile.addEventListener("change", function () {
    lowestNoteSelect.value = lowestNoteSelectMobile.value;
    render();
    savePreferences();
  });
  numOctavesSelectMobile.addEventListener("change", function () {
    numOctavesSelect.value = numOctavesSelectMobile.value;
    render();
    savePreferences();
  });
  keySigToggle.addEventListener("change", function () { render(); savePreferences(); });
  fingeringToggle.addEventListener("change", function () { render(); savePreferences(); });
  noteNameToggle.addEventListener("change", function () { render(); savePreferences(); });
  degreeToggle.addEventListener("change", function () { render(); savePreferences(); });
  var ogTitleEl = document.querySelector('meta[property="og:title"]');
  var twitterTitleEl = document.querySelector('meta[name="twitter:title"]');

  function updateInstrumentLabels() {
    if (instrumentSelect.value === "tuba") {
      tubaSelectLabel.textContent = "Tuba";
      fingeringToggleLabel.textContent = "Fingerings";
      heroTitleEl.textContent = "Tuba Scale Generator";
      heroSubtitleEl.textContent = "Pick a key and mode, choose your range, and see the scale notated for tuba!";
      document.title = "Tuba Scale Generator \u2014 Free Scales, Fingerings & Patterns for Tuba, Euphonium, Trombone & Sousaphone";
      if (ogTitleEl) ogTitleEl.content = "Tuba Scale Generator \u2014 Free Scales, Fingerings &amp; Practice Patterns";
      if (twitterTitleEl) twitterTitleEl.content = "Tuba Scale Generator \u2014 Free Scales, Fingerings &amp; Practice Patterns";
    } else {
      if (!localStorage.getItem("tuba-scale-trombone-key-set")) {
        tubaSelect.value = "12";
        localStorage.setItem("tuba-scale-trombone-key-set", "1");
      }
      tubaSelectLabel.textContent = "Trombone";
      fingeringToggleLabel.textContent = "Positions";
      heroTitleEl.textContent = "Trombone Scale Generator";
      heroSubtitleEl.textContent = "Pick a key and mode, choose your range, and see the scale notated for trombone!";
      document.title = "Trombone Scale Generator \u2014 Free Scales, Slide Positions & Patterns for Trombone";
      if (ogTitleEl) ogTitleEl.content = "Trombone Scale Generator \u2014 Free Scales, Slide Positions &amp; Practice Patterns";
      if (twitterTitleEl) twitterTitleEl.content = "Trombone Scale Generator \u2014 Free Scales, Slide Positions &amp; Practice Patterns";
    }
  }

  instrumentSelect.addEventListener("change", function () { updateInstrumentLabels(); render(); savePreferences(); });
  tubaSelect.addEventListener("change", function () { render(); savePreferences(); });
  patternSelect.addEventListener("change", function () { render(); savePreferences(); });
  directionSelect.addEventListener("change", function () { render(); savePreferences(); });
  shuffleKeyBtn.addEventListener("click", randomizeKey);
  shuffleModeBtn.addEventListener("click", randomizeMode);
  shufflePatternBtn.addEventListener("click", randomizePattern);
  playBtn.addEventListener("click", togglePlayback);
  playBtnDesktop.addEventListener("click", togglePlayback);

  /* ---------- BPM slider ---------- */
  bpmSlider.addEventListener("input", function () {
    bpmValueEl.textContent = bpmSlider.value;
  });
  bpmSlider.addEventListener("change", function () {
    savePreferences();
  });

  /* ---------- Print sheet music ---------- */
  printBtn.addEventListener("click", function () {
    var title = scaleNameEl.textContent;
    if (title === "\u2014") title = getInstrumentName() + " Scale";

    // Include pattern in title when it's not a plain scale
    if (patternSelect.value !== "scale") {
      var patternLabel = patternSelect.options[patternSelect.selectedIndex].text;
      // Use a short form: strip everything after the first paren
      var shortPattern = patternLabel.split(/\(/)[0].trim();
      title = title + " — " + shortPattern;
    }

    // Clean up old print title if printing multiple times
    var existingTitle = outputPrint.querySelector(".print-title");
    if (existingTitle) existingTitle.remove();

    // Inject title header natively into the print container so it
    // appears in the printed output without relying on printJS.
    var titleEl = document.createElement("h2");
    titleEl.className = "print-title";
    titleEl.style.cssText = "font-family:serif;text-align:center;margin:0 0 12px;color:#111;";
    titleEl.textContent = title;

    outputPrint.insertBefore(titleEl, outputPrint.firstChild);

    var originalTitle = document.title;
    document.title = title; // Temporarily change document title for PDF export filename
    window.print();
    document.title = originalTitle;
  });

  /* ---------- Settings toggle ---------- */
  var settingsToggle = document.getElementById("settingsToggle");
  var advancedControls = document.getElementById("advancedControls");
  var SETTINGS_KEY = "tuba-scale-settings-open";

  // Restore saved state on load
  if (localStorage.getItem(SETTINGS_KEY) === "true") {
    advancedControls.classList.remove("collapsed");
    settingsToggle.setAttribute("aria-expanded", "true");
  }

  settingsToggle.addEventListener("click", function () {
    var isCollapsed = advancedControls.classList.toggle("collapsed");
    settingsToggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    localStorage.setItem(SETTINGS_KEY, isCollapsed ? "false" : "true");
    // Re-render after expand to size notation correctly
    if (!isCollapsed) render();
  });

  /* ---------- Note-names collapse toggle ---------- */
  var noteToggle = document.createElement("button");
  noteToggle.className = "note-toggle";
  noteToggle.textContent = "Show all notes ▾";
  noteToggle.addEventListener("click", function () {
    var expanded = notationHintEl.classList.toggle("expanded");
    noteToggle.textContent = expanded ? "Show less ▴" : "Show all notes ▾";
  });
  notationHintEl.appendChild(noteToggle);

  loadPreferences();
  updateInstrumentLabels();

  // Wait for music fonts to load before initial render.
  // VexFlow 5 loads Bravura asynchronously via @font-face.
  // Chromium browsers may paint before font metrics are calculated,
  // causing incorrect note heads and stems on first load.
  // Firefox blocks rendering until fonts are ready, masking the issue there.
  if (document.fonts && document.fonts.ready) {
    output.innerHTML = '<p class="notation-hint">Loading notation\u2026</p>';
    document.fonts.ready.then(function () {
      render();
    });
  } else {
    // Fallback for environments without the Font Loading API
    render();
  }
})();

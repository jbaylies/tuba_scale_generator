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
    "C", "G", "D", "A", "E", "B", "F#", "C#",
    "F", "Bb", "Eb", "Ab", "Db", "Gb",
  ];
  const KEY_LABELS = {
    "C": "C", "G": "G", "D": "D", "A": "A", "E": "E", "B": "B",
    "F#": "F\u266F", "C#": "C\u266F",
    "F": "F", "Bb": "B\u266D", "Eb": "E\u266D",
    "Ab": "A\u266D", "Db": "D\u266D", "Gb": "G\u266D",
  };

  /* ---------- Tuba Fingerings ----------
   *  BBb tuba fingerings keyed by note name with octave (e.g. "Bb2").
   *  Valve numbers: 0 = open, 1 = 1st, 2 = 2nd, 3 = 3rd, 4 = 4th.
   *  Combinations: "12" = 1+2, "23" = 2+3, "234" = 2+3+4, etc.
   *  Only one spelling per MIDI needed — enharmonic lookup handles the rest.
   */
  var FINGERINGS = {
     // Octave 0 (infrasound)
     "C1": "1234",  "Db1": "134",  "D1": "34",  "Eb1": "14",  "E1": "123 (24)",  "F1": "13 (4)",
     "Gb1": "23",  "G1": "12",  "Ab1": "1",  "A1": "2",  "Bb1": "0",  "B1": "51234",
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
   */
  var TUBA_KEYS = [
    { value: "0",  label: "BB\u266D", shift: 0 },
    { value: "2",  label: "CC",       shift: 2 },
    { value: "5",  label: "E\u266D",  shift: 5 },
    { value: "7",  label: "F",        shift: 7 },
  ];

  var PATTERNS = [
    { value: "scale",                  label: "Scale" },
    { value: "diatonicThirds",         label: "Intervals: 3rds (1-3, 2-4, 3-5, …)" },
    { value: "diatonicFourths",        label: "Intervals: 4ths (1-4, 2-5, 3-6, …)" },
    { value: "diatonicFifths",         label: "Intervals: 5ths (1-5, 2-6, 3-7, …)" },
    { value: "diatonicSixths",         label: "Intervals: 6ths (1-6, 2-7, 3-1, …)" },
    { value: "diatonicSeventhsIntervals", label: "Intervals: 7ths (1-7, 2-1, 3-2, …)" },
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
   * @param {number} shift     - semitones to transpose down for tuba key (0 for BBb)
   */
  var _fingeringByMidi = null;
  function getFingering(tonalNote, shift) {
    if (_fingeringByMidi === null) {
      _fingeringByMidi = {};
      for (var key in FINGERINGS) {
        if (!FINGERINGS[key]) continue;
        var midi = Tonal.Note.midi(key);
        if (midi !== null && midi !== undefined) {
          _fingeringByMidi[midi] = FINGERINGS[key];
        }
      }
    }
    var midi = Tonal.Note.midi(tonalNote);
    if (midi === null || midi === undefined) return "";
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

  const MODES = [
    { value: "ionian",          label: "Major (Ionian)" },
    { value: "dorian",          label: "Dorian" },
    { value: "phrygian",        label: "Phrygian" },
    { value: "lydian",          label: "Lydian" },
    { value: "mixolydian",      label: "Mixolydian" },
    { value: "mixolydianFlat6", label: "Mixolydian \u266D6" },
    { value: "aeolian",         label: "Natural Minor (Aeolian)" },
    { value: "locrian",         label: "Locrian" },
  ];

  /* ---------- DOM ---------- */
  const keySelect          = document.getElementById("keySelect");
  const modeSelect         = document.getElementById("modeSelect");
  const startOctaveSelect  = document.getElementById("startOctaveSelect");
  const endOctaveSelect    = document.getElementById("endOctaveSelect");
  const startOctaveSelectMobile = document.getElementById("startOctaveSelectMobile");
  const endOctaveSelectMobile   = document.getElementById("endOctaveSelectMobile");
  const keySigToggle       = document.getElementById("keySigToggle");
  const fingeringToggle    = document.getElementById("fingeringToggle");
  const noteNameToggle     = document.getElementById("noteNameToggle");
  const tubaSelect         = document.getElementById("tubaSelect");
  const patternSelect      = document.getElementById("patternSelect");
  const directionSelect    = document.getElementById("directionSelect");
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
  const notationHintEl  = document.getElementById("notationHint");
  const output          = document.getElementById("vexflow-output");
  const outputPrint     = document.getElementById("vexflow-output-print");

  /* ---------- Populate dropdowns ---------- */
  KEYS.forEach(function (k) {
    keySelect.add(new Option(KEY_LABELS[k] || k, k));
  });
  keySelect.value = "Bb";

  MODES.forEach(function (m) {
    modeSelect.add(new Option(m.label, m.value));
  });
  modeSelect.value = "ionian";

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

  [0, 1, 2, 3, 4, 5].forEach(function (o) {
    startOctaveSelect.add(new Option("Octave " + o, String(o)));
    endOctaveSelect.add(new Option("Octave " + o, String(o)));
    startOctaveSelectMobile.add(new Option("Octave " + o, String(o)));
    endOctaveSelectMobile.add(new Option("Octave " + o, String(o)));
  });
  startOctaveSelect.value = "1";
  endOctaveSelect.value   = "2";
  startOctaveSelectMobile.value = "1";
  endOctaveSelectMobile.value   = "2";

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

  /* ---------- Music theory via Tonal.js ---------- */

  function getScaleNotes(tonic, modeType, startOctave, endOctave) {
    if (startOctave > endOctave) return [];
    var tonicWithOct = tonic + startOctave;

    // Construct custom scales that Tonal.js doesn't ship with
    var lookupMode = modeType;
    if (modeType === "mixolydianFlat6") lookupMode = "mixolydian";

    var scale = Tonal.Scale.get(tonicWithOct + " " + lookupMode);
    if (!scale || scale.empty || !scale.notes || scale.notes.length === 0) return [];
    var base = scale.notes.slice();

    // Flatten the 6th degree (index 5) for Mixolydian ♭6
    if (modeType === "mixolydianFlat6") {
      var flattened = Tonal.Note.transpose(base[5], "-2m");
      var pc = Tonal.Note.pitchClass(flattened);
      if (SHARP_PCS[pc]) {
        flattened = SHARP_PCS[pc] + Tonal.Note.octave(flattened);
      }
      base[5] = flattened;
    }

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

  var SHARP_PCS = { "C#": "Db", "D#": "Eb", "E#": "F", "F#": "Gb", "G#": "Ab", "A#": "Bb", "B#": "C" };

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

  var MODE_DEGREE_DOWN = {
    ionian:          "1P",
    dorian:          "2M",
    phrygian:        "3M",
    lydian:          "4P",
    mixolydian:      "5P",
    mixolydianFlat6: "5P",
    aeolian:         "6M",
    locrian:         "7M",
  };

  function getKeySignature(tonic, modeType) {
    var descend = MODE_DEGREE_DOWN[modeType];
    if (!descend) return null;
    var parent = Tonal.Note.transpose(tonic, "-" + descend);
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
  function renderSystem(ctx, systemNotes, sysDurs, y, haveKeySig, keySigName, alteredPcs, showNoteNames, showFingerings, tubaShift, availWidth, SYSTEM_WIDTH) {
    var stave = new Stave(10, y, SYSTEM_WIDTH - 20);
    stave.addClef("bass");
    if (haveKeySig) stave.addKeySignature(keySigName);
    stave.setContext(ctx).draw();

    var staveNotes = systemNotes.map(function (tonalNote, ni) {
      var key = toVexKey(tonalNote);
      var dur = sysDurs[ni] || "q";
      var sn  = new StaveNote({ keys: [key], duration: dur, clef: "bass", autoStem: true });
      var pc  = Tonal.Note.pitchClass(tonalNote);
      var acc = accidentalType(pc);
      if (acc && (!haveKeySig || !alteredPcs.has(pc))) {
        sn.addModifier(new Accidental(acc), 0);
      }
      if (showNoteNames) {
        var nameAnnotation = new Annotation(tonalNote);
        nameAnnotation.setVerticalJustification(Annotation.VerticalJustify.TOP);
        nameAnnotation.setFont({ family: "Inter, system-ui, sans-serif", size: 9, weight: "400" });
        sn.addModifier(nameAnnotation, 0);
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

  /* ---------- VexFlow rendering ---------- */
  var currentNotes = [];
  var currentDurations = [];

  function render() {
    var tonic       = keySelect.value;
    var modeType    = modeSelect.value;
    var startOctave = parseInt(startOctaveSelect.value, 10);
    var endOctave   = parseInt(endOctaveSelect.value, 10);
    var useKeySig   = keySigToggle.checked;
    var showFingerings = fingeringToggle.checked;
    var showNoteNames  = noteNameToggle.checked;
    var tubaShift   = parseInt(tubaSelect.value, 10);
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

    // Tonic at startOctave lives at this index in allScaleNotes
    var startIdx = 7 * (startOctave - lowOctave);
    // Tonic at endOctave lives at this index
    var endIdx   = 7 * (endOctave - lowOctave);

    var notes = [];
    if (startOctave <= endOctave) {
      if (direction === "ascending") {
        // Scale pattern uses endIdx (no "extra root" past range); other patterns need ascEndIdx
        var ascEndIdx = patternType === "scale" ? endIdx : startIdx + 8 * octaves - 1;
        notes = generateAscendingPattern(allScaleNotes, patternType, startIdx, ascEndIdx);
      } else if (direction === "descending") {
        notes = generateDescendingPattern(allScaleNotes, patternType, startIdx, endIdx);
      } else if (direction === "ascendingDescending") {
        // For interval / chord / clarke patterns, stop ascending one root
        // before the tonic so the turn-around pair is naturally the first
        // descending pair (root goes down by the interval instead of up).
        var isScale = patternType === "scale";
        var ascEndIdx = isScale ? endIdx : endIdx - 1;
        var up   = generateAscendingPattern(allScaleNotes, patternType, startIdx, ascEndIdx);
        var down = generateDescendingPattern(allScaleNotes, patternType, startIdx, endIdx);
        // Scale still needs the top tonic trimmed from descending.
        var trimCount = isScale ? 1 : 0;
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

    currentNotes     = notes;
    currentDurations = durations;

    var keySigName    = useKeySig ? getKeySignature(tonic, modeType) : null;
    var alteredPcs    = keySigName ? alteredPitchClasses(keySigName) : new Set();
    var haveKeySig    = !!keySigName;

    /* Info bar */
    var keyLabel  = KEY_LABELS[tonic] || tonic;
    var modeLabel = "";
    for (var mi = 0; mi < MODES.length; mi++) {
      if (MODES[mi].value === modeType) { modeLabel = MODES[mi].label; break; }
    }
    var rangeText = startOctave <= endOctave
      ? "(oct " + startOctave + "\u2013" + endOctave + ")"
      : "(invalid range)";
    scaleNameEl.textContent  = notes.length ? keyLabel + " " + modeLabel + " " + rangeText : "\u2014";
    noteCountEl.textContent  = notes.length ? notes.length + " notes" : "\u2014";

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
    var STAFF_TOP_MIDI = 57;  // A3 = top line of bass clef
    var STAFF_BOT_MIDI = 41;  // F2 = bottom line of bass clef

    var keySigPad   = haveKeySig ? 70 : 0;
    var availWidth  = SYSTEM_WIDTH - CLEF_PX - keySigPad - PAD_PX;
    var perSystem   = Math.min(MAX_PER_LINE, n, Math.floor(availWidth / NOTE_PX));
    if (perSystem < 1) perSystem = 1;

    var numSystems = Math.ceil(n / perSystem);
    var systems = [];
    var systemDurations = [];
    var idx = 0;
    for (var s = 0; s < numSystems; s++) {
      var remaining        = n - idx;
      var remainingSystems = numSystems - s;
      var count            = Math.ceil(remaining / remainingSystems);
      systems.push(notes.slice(idx, idx + count));
      systemDurations.push(currentDurations.slice(idx, idx + count));
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
    var extraPadPerSys = fingeringPad + noteNamePad;

    // --- Render for screen (single SVG, tight spacing) ---
    {
      var totalHeight = STAVE_TOP + noteNamePad;
      for (var si2 = 0; si2 < numSystems; si2++) {
        totalHeight += systemHeights[si2] + extraPadPerSys;
      }
      totalHeight += 16; // bottom padding

      var renderer = new Renderer(output, Renderer.Backends.SVG);
      renderer.resize(SYSTEM_WIDTH, totalHeight);
      var ctx = renderer.getContext();

      var cumulativeY = STAVE_TOP + noteNamePad;
      systems.forEach(function (systemNotes, si) {
        renderSystem(ctx, systemNotes, systemDurations[si], cumulativeY, haveKeySig, keySigName, alteredPcs, showNoteNames, showFingerings, tubaShift, availWidth, SYSTEM_WIDTH);
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
        var sysTotalH = STAVE_TOP + noteNamePad + sysH + extraPadPerSys + 8;

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

        renderSystem(ctx, systemNotes, systemDurations[si], STAVE_TOP + noteNamePad, haveKeySig, keySigName, alteredPcs, showNoteNames, showFingerings, tubaShift, availWidth, SYSTEM_WIDTH);
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
      if (!playing || currentIdx >= currentNotes.length) {
        if (playing) stopPlayback();
        return;
      }

      var note = currentNotes[currentIdx];
      var freq = Tonal.Note.freq(note);

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
        mode: modeSelect.value,
        startOctave: startOctaveSelect.value,
        endOctave: endOctaveSelect.value,
        tuba: tubaSelect.value,
        pattern: patternSelect.value,
        direction: directionSelect.value,
        bpm: bpmSlider.value,
        keySig: keySigToggle.checked,
        fingerings: fingeringToggle.checked,
        noteNames: noteNameToggle.checked
      }));
    } catch (e) {}
  }

  function loadPreferences() {
    try {
      var saved = JSON.parse(localStorage.getItem(PREFS_KEY));
      if (!saved) return;
      if (saved.key) { keySelect.value = saved.key; }
      if (saved.mode) { modeSelect.value = saved.mode; }
      if (saved.startOctave) { startOctaveSelect.value = saved.startOctave; startOctaveSelectMobile.value = saved.startOctave; }
      if (saved.endOctave) { endOctaveSelect.value = saved.endOctave; endOctaveSelectMobile.value = saved.endOctave; }
      if (saved.tuba) { tubaSelect.value = saved.tuba; }
      if (saved.pattern) { patternSelect.value = saved.pattern; }
      if (saved.direction) { directionSelect.value = saved.direction; }
      if (saved.bpm) { bpmSlider.value = saved.bpm; bpmValueEl.textContent = saved.bpm; }
      if (typeof saved.keySig === "boolean") { keySigToggle.checked = saved.keySig; }
      if (typeof saved.fingerings === "boolean") { fingeringToggle.checked = saved.fingerings; }
      if (typeof saved.noteNames === "boolean") { noteNameToggle.checked = saved.noteNames; }
    } catch (e) {}
  }

  keySelect.addEventListener("change", function () { render(); savePreferences(); });
  modeSelect.addEventListener("change", function () { render(); savePreferences(); });
  startOctaveSelect.addEventListener("change", function () { startOctaveSelectMobile.value = startOctaveSelect.value; render(); savePreferences(); });
  endOctaveSelect.addEventListener("change", function () { endOctaveSelectMobile.value = endOctaveSelect.value; render(); savePreferences(); });
  startOctaveSelectMobile.addEventListener("change", function () {
    startOctaveSelect.value = startOctaveSelectMobile.value;
    // render + savePreferences fire via the main select's change listener
  });
  endOctaveSelectMobile.addEventListener("change", function () {
    endOctaveSelect.value = endOctaveSelectMobile.value;
    // render + savePreferences fire via the main select's change listener
  });
  keySigToggle.addEventListener("change", function () { render(); savePreferences(); });
  fingeringToggle.addEventListener("change", function () { render(); savePreferences(); });
  noteNameToggle.addEventListener("change", function () { render(); savePreferences(); });
  tubaSelect.addEventListener("change", function () { render(); savePreferences(); });
  patternSelect.addEventListener("change", function () { render(); savePreferences(); });
  directionSelect.addEventListener("change", function () { render(); savePreferences(); });
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
    if (title === "\u2014") title = "Tuba Scale";

    // Include pattern in title when it's not a plain scale
    if (patternSelect.value !== "scale") {
      var patternLabel = patternSelect.options[patternSelect.selectedIndex].text;
      // Use a short form: strip everything after the first colon or paren
      var shortPattern = patternLabel.split(/[:\\(]/)[0].trim();
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

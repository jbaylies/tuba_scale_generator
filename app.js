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
     // Octave 0
     "C0": "1234",  "Db0": "234",  "D0": "34",  "Eb0": "14",  "E0": "24",  "F0": "4",
     "Gb0": "23",  "G0": "12",  "Ab0": "1",  "A0": "2",  "Bb0": "0",  "B0": "51234",
     // Octave 1
     "C1": "1234",  "Db1": "234",  "D1": "34",  "Eb1": "14",  "E1": "123",  "F1": "13",
     "Gb1": "23",  "G1": "12",  "Ab1": "1",  "A1": "2",  "Bb1": "0",  "B1": "123",
     // Octave 2 (pedal / low range)
     "C2": "13",  "Db2": "23",  "D2": "12",  "Eb2": "1",  "E2": "2",  "F2": "0",
     "Gb2": "23",  "G2": "12",  "Ab2": "1",  "A2": "2",  "Bb2": "0",  "B2": "12",
     // Octave 3 (middle range)
     "C3": "1",  "Db3": "2",  "D3": "0",  "Eb3": "1",  "E3": "2",  "F3": "0",
     "Gb3": "23",  "G3": "12",  "Ab3": "1",  "A3": "2",  "Bb3": "0",  "B3": "12",
     // Octave 4 (upper range)
     "C4": "1",  "Db4": "2",  "D4": "0",  "Eb4": "1",  "E4": "2",  "F4": "0",
     "Gb4": "23",  "G4": "12",  "Ab4": "1",  "A4": "2",  "Bb4": "0",  "B4": "12",
     // Octave 5
     "C5": "1",  "Db5": "2",  "D5": "0",  "Eb5": "1",  "E5": "2",  "F5": "0",
     "Gb5": "23",  "G5": "12",  "Ab5": "1",  "A5": "2",  "Bb5": "0",  "B5": "12",
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
    { value: "diatonicSevenths",       label: "Diatonic 7ths (1-3-5-7, 2-4-6-1, …)" },
    { value: "diatonicNinths",         label: "Diatonic 9ths (1-3-5-7-9, 2-4-6-1-3, …)" },
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
  const keySigToggle       = document.getElementById("keySigToggle");
  const fingeringToggle    = document.getElementById("fingeringToggle");
  const noteNameToggle     = document.getElementById("noteNameToggle");
  const tubaSelect         = document.getElementById("tubaSelect");
  const patternSelect      = document.getElementById("patternSelect");
  const directionSelect    = document.getElementById("directionSelect");
  const playBtn         = document.getElementById("playBtn");
  const scaleNameEl     = document.getElementById("scaleName");
  const noteCountEl     = document.getElementById("noteCount");
  const notationHintEl  = document.getElementById("notationHint");
  const output          = document.getElementById("vexflow-output");

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
  });
  startOctaveSelect.value = "1";
  endOctaveSelect.value   = "2";

  /**
   * Transform an ascending scale note list into the requested pattern.
   * @param {string[]} notes   - ascending scale notes (tonic … top tonic)
   * @param {string}   pattern - pattern type from PATTERNS
   * @returns {string[]} transformed note sequence
   */
  function applyPattern(notes, pattern) {
    if (!notes || notes.length === 0) return notes;

    if (pattern === "scale") return notes;

    if (INTERVAL_OFFSETS[pattern] !== undefined) {
      var offset = INTERVAL_OFFSETS[pattern];
      var result = [];
      for (var i = 0; i < 8 && i + offset < notes.length; i++) {
        result.push(notes[i]);
        result.push(notes[i + offset]);
      }
      return result;
    }

    if (CHORD_STEPS[pattern] !== undefined) {
      var steps = CHORD_STEPS[pattern];
      var result = [];
      for (var i = 0; i < 8; i++) {
        var maxIdx = i + steps[steps.length - 1];
        if (maxIdx >= notes.length) break;
        for (var s = 0; s < steps.length; s++) {
          result.push(notes[i + steps[s]]);
        }
      }
      return result;
    }

    if (pattern === "clarke") {
      var result = [];
      for (var i = 0; i < 7 && i + 2 < notes.length; i++) {
        result.push(notes[i]);
        result.push(notes[i + 1]);
        result.push(notes[i + 2]);
        result.push(notes[i]);
      }
      result.push(notes.length > 7 ? notes[7] : notes[0]);
      return result;
    }

    return notes;
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

  /* ---------- VexFlow rendering ---------- */
  var currentNotes = [];

  function render() {
    var tonic       = keySelect.value;
    var modeType    = modeSelect.value;
    var startOctave = parseInt(startOctaveSelect.value, 10);
    var endOctave   = parseInt(endOctaveSelect.value, 10);
    var useKeySig   = keySigToggle.checked;
    var showFingerings = fingeringToggle.checked;
    var showNoteNames  = noteNameToggle.checked;
    var tubaShift   = parseInt(tubaSelect.value, 10);
    var notes       = getScaleNotes(tonic, modeType, startOctave, endOctave);
    var patternType = patternSelect.value;

    // For interval and chord patterns, extend range by one octave so
    // the upper notes of each dyad / chord can exceed endOctave while
    // roots stay within one octave (8 roots).
    var needsExtraOctave = INTERVAL_OFFSETS[patternType] !== undefined
      || CHORD_STEPS[patternType] !== undefined
      || patternType === "clarke";
    if (needsExtraOctave) {
      var extra = getScaleNotes(tonic, modeType, endOctave, endOctave + 1);
      notes = notes.concat(extra.slice(1));
    }

    notes = applyPattern(notes, patternType);

    // Apply direction (ascending, descending, or up+down)
    var direction = directionSelect.value;
    if (direction === "descending") {
      notes = notes.slice().reverse();
    } else if (direction === "ascendingDescending") {
      var down = notes.slice(0, -1).reverse();
      notes = notes.concat(down);
    }

    currentNotes    = notes;

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
      notationHintEl.classList.remove("hidden");
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
    var SYSTEM_HEIGHT = 165;
    var STAVE_TOP     = 20;
    var NOTE_PX       = 45;
    var CLEF_PX       = 60;
    var PAD_PX        = 30;
    var MAX_PER_LINE  = 10;

    var keySigPad   = haveKeySig ? 70 : 0;
    var availWidth  = SYSTEM_WIDTH - CLEF_PX - keySigPad - PAD_PX;
    var perSystem   = Math.min(MAX_PER_LINE, n, Math.floor(availWidth / NOTE_PX));
    if (perSystem < 1) perSystem = 1;

    var numSystems = Math.ceil(n / perSystem);
    var systems = [];
    var idx = 0;
    for (var s = 0; s < numSystems; s++) {
      var remaining        = n - idx;
      var remainingSystems = numSystems - s;
      var count            = Math.ceil(remaining / remainingSystems);
      systems.push(notes.slice(idx, idx + count));
      idx += count;
    }

    var fingeringPad  = showFingerings ? 24 : 0;
    var noteNamePad    = showNoteNames ? 20 : 0;
    var extraPadPerSys = fingeringPad + noteNamePad;
    var totalHeight = STAVE_TOP + noteNamePad + numSystems * (SYSTEM_HEIGHT + extraPadPerSys) + 20;

    var renderer = new Renderer(output, Renderer.Backends.SVG);
    renderer.resize(SYSTEM_WIDTH, totalHeight);
    var ctx = renderer.getContext();

    systems.forEach(function (systemNotes, si) {
      var y = STAVE_TOP + noteNamePad + si * (SYSTEM_HEIGHT + extraPadPerSys);
      var stave = new Stave(10, y, SYSTEM_WIDTH - 20);
      stave.addClef("bass");
      if (haveKeySig) stave.addKeySignature(keySigName);
      stave.setContext(ctx).draw();

      var staveNotes = systemNotes.map(function (tonalNote) {
        var key = toVexKey(tonalNote);
        var sn  = new StaveNote({ keys: [key], duration: "q", clef: "bass", autoStem: true });
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

      var voice = new Voice({ num_beats: systemNotes.length, beat_value: 4 });
      if (Voice.Mode) voice.setMode(Voice.Mode.SOFT);
      voice.addTickables(staveNotes);

      new Formatter().joinVoices([voice]).format([voice], availWidth);
      voice.draw(ctx, stave);
    });
  }

  /* ---------- Audio playback (Web Audio API) ---------- */
  var audioCtx = null;
  var playing  = false;

  function play() {
    if (playing || currentNotes.length === 0) return;
    playing = true;
    playBtn.classList.add("playing");
    playBtn.disabled = true;

    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();

    var now       = audioCtx.currentTime;
    var rate      = 0.21;
    var noteSpans = notationHintEl.querySelectorAll(".note-name");

    currentNotes.forEach(function (note, i) {
      var freq = Tonal.Note.freq(note);
      if (!freq || freq < 16) return;

      var t   = now + i * rate;
      var dur = rate * 0.92;

      var osc   = audioCtx.createOscillator();
      var gain  = audioCtx.createGain();
      var filter = audioCtx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1400, t);
      filter.Q.value = 1;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(t);
      osc.stop(t + dur + 0.05);

      setTimeout(function () {
        noteSpans.forEach(function (s, idx) {
          s.classList.toggle("active", idx === i);
        });
      }, i * rate * 1000);
    });

    var totalMs = currentNotes.length * rate * 1000 + 250;
    setTimeout(function () {
      playing = false;
      playBtn.classList.remove("playing");
      playBtn.disabled = false;
      noteSpans.forEach(function (s) { s.classList.remove("active"); });
    }, totalMs);
  }

  /* ---------- Wire up & initial render ---------- */
  keySelect.addEventListener("change", render);
  modeSelect.addEventListener("change", render);
  startOctaveSelect.addEventListener("change", render);
  endOctaveSelect.addEventListener("change", render);
  keySigToggle.addEventListener("change", render);
  fingeringToggle.addEventListener("change", render);
  noteNameToggle.addEventListener("change", render);
  tubaSelect.addEventListener("change", render);
  patternSelect.addEventListener("change", render);
  directionSelect.addEventListener("change", render);
  playBtn.addEventListener("click", play);

  render();
})();

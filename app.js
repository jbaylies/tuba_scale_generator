(function () {
  "use strict";

  /* ---------- Library guard ---------- */
  if (typeof VexFlow === "undefined" || typeof Tonal === "undefined") {
    document.getElementById("vexflow-output").innerHTML =
      '<p class="notation-hint">Could not load music libraries (Tonal.js / VexFlow). Please check your internet connection and refresh.</p>';
    return;
  }

  const VF = VexFlow;
  const { Renderer, Stave, StaveNote, Accidental, Voice, Formatter } = VF;

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

  const MODES = [
    { value: "ionian",     label: "Major (Ionian)" },
    { value: "dorian",     label: "Dorian" },
    { value: "phrygian",   label: "Phrygian" },
    { value: "lydian",     label: "Lydian" },
    { value: "mixolydian", label: "Mixolydian" },
    { value: "aeolian",    label: "Natural Minor (Aeolian)" },
    { value: "locrian",    label: "Locrian" },
  ];

  /* ---------- DOM ---------- */
  const keySelect          = document.getElementById("keySelect");
  const modeSelect         = document.getElementById("modeSelect");
  const startOctaveSelect  = document.getElementById("startOctaveSelect");
  const endOctaveSelect    = document.getElementById("endOctaveSelect");
  const keySigToggle       = document.getElementById("keySigToggle");
  const playBtn         = document.getElementById("playBtn");
  const scaleNameEl     = document.getElementById("scaleName");
  const noteCountEl     = document.getElementById("noteCount");
  const notationHintEl  = document.getElementById("notationHint");
  const output          = document.getElementById("vexflow-output");

  /* ---------- Populate dropdowns ---------- */
  KEYS.forEach(function (k) {
    keySelect.add(new Option(KEY_LABELS[k] || k, k));
  });
  keySelect.value = "Bb"; // Most common key for tuba

  MODES.forEach(function (m) {
    modeSelect.add(new Option(m.label, m.value));
  });
  modeSelect.value = "ionian";

  [0, 1, 2, 3, 4, 5].forEach(function (o) {
    startOctaveSelect.add(new Option("Octave " + o, String(o)));
    endOctaveSelect.add(new Option("Octave " + o, String(o)));
  });
  startOctaveSelect.value = "2";
  endOctaveSelect.value   = "3";

  /* ---------- Music theory via Tonal.js ---------- */

  /**
   * Build an ascending scale spanning from the tonic at startOctave up to and
   * including the tonic at endOctave. Uses Tonal.Scale.get for the first octave
   * (handles within-octave crossings and correct spelling) then transposes by
   * 8P for subsequent octaves, preserving enharmonic spelling throughout.
   */
  function getScaleNotes(tonic, modeType, startOctave, endOctave) {
    if (startOctave > endOctave) return [];
    var tonicWithOct = tonic + startOctave;
    var scale = Tonal.Scale.get(tonicWithOct + " " + modeType);
    if (!scale || scale.empty || !scale.notes || scale.notes.length === 0) return [];
    var base = scale.notes; // 7 notes, e.g. ["C2","D2",...,"B2"]

    var octaves = endOctave - startOctave; // number of 8P leaps to cover
    var out = [];
    for (var o = 0; o < octaves; o++) {
      for (var i = 0; i < base.length; i++) {
        var m = base[i];
        for (var k = 0; k < o; k++) m = Tonal.Note.transpose(m, "8P");
        out.push(m);
      }
    }
    // Final tonic at the top (the endOctave tonic)
    var top = base[0];
    for (var k2 = 0; k2 < octaves; k2++) top = Tonal.Note.transpose(top, "8P");
    out.push(top);
    return out;
  }

  /** Convert a Tonal note name (e.g. "Eb3") to a VexFlow key string (e.g. "eb/3"). */
  function toVexKey(tonalNote) {
    var pc = Tonal.Note.pitchClass(tonalNote).toLowerCase();
    var oct = Tonal.Note.octave(tonalNote);
    return pc + "/" + oct;
  }

  /** Extract the VexFlow accidental type from a pitch-class string. */
  function accidentalType(pitchClass) {
    if (pitchClass.indexOf("##") !== -1) return "##";
    if (pitchClass.indexOf("bb") !== -1) return "bb";
    if (pitchClass.indexOf("#")  !== -1) return "#";
    if (pitchClass.indexOf("b")  !== -1) return "b";
    return null;
  }

  /**
   * The 15 standard major-key signatures VexFlow can render on a stave.
   * (Circle of fifths: C → 7 sharps / C → 7 flats.) Any parent key outside
   * this set (e.g. G#, Fb, Bbb) is non-standard and falls back to no key sig.
   */
  var STANDARD_KEY_SIGS = new Set([
    "C", "G", "D", "A", "E", "B", "F#", "C#",
    "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb",
  ]);

  // Each mode is a rotation of the major scale; this maps each mode to the
  // interval from the mode's tonic UP to the parent major (Ionian) tonic.
  // e.g. Dorian's tonic is the 2nd degree of its parent major, so the parent
  // tonic is a 2M below the dorian tonic. We store the descent interval.
  var MODE_DEGREE_DOWN = {
    ionian:     "1P",
    dorian:     "2M",
    phrygian:   "3M",
    lydian:     "4P",
    mixolydian: "5P",
    aeolian:    "6M",
    locrian:    "7M",
  };

  /**
   * Compute the key-signature spec for VexFlow's addKeySignature() given a
   * scale tonic and mode. Returns the parent major key name (e.g. "Bb") when
   * it is a standard, renderable key signature, or null otherwise.
   */
  function getKeySignature(tonic, modeType) {
    var descend = MODE_DEGREE_DOWN[modeType];
    if (!descend) return null;
    var parent = Tonal.Note.transpose(tonic, "-" + descend);
    if (STANDARD_KEY_SIGS.has(parent)) return parent;
    return null;
  }

  /**
   * Set of pitch classes that are altered in a given major key signature.
   * Used to suppress redundant per-note accidentals when a key sig is shown.
   */
  function alteredPitchClasses(keySigName) {
    if (!keySigName || keySigName === "C") return new Set();
    var scale = Tonal.Key.majorKey(keySigName);
    if (!scale || !scale.scale) return new Set();
    // A pitch class is altered if it differs from the natural (C-major) letter.
    // The major key's notes contain the altered letters; compare against naturals.
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
    var notes       = getScaleNotes(tonic, modeType, startOctave, endOctave);
    currentNotes    = notes;

    // Key-signature spec + the set of altered pitch classes (for suppressing
    // redundant per-note accidentals when the key sig is displayed).
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

    /* ---- Multi-system layout ----
     * Split the notes into wrapped "systems" (staff lines) so long scales
     * stack vertically instead of producing one very wide, scroll-only line.
     * Each system gets its own clef + key signature, just like printed music.
     */
    var n = notes.length;

    // Layout constants (in SVG pixels)
    var SYSTEM_WIDTH  = 880;  // width of each staff line
    var SYSTEM_HEIGHT = 190;  // vertical space per system (room for octave-0 ledger lines)
    var STAVE_TOP     = 40;   // y-offset of the first stave
    var NOTE_PX       = 45;   // approx pixels per quarter note
    var CLEF_PX       = 60;   // clef width
    var PAD_PX        = 30;   // right-side padding
    var MAX_PER_LINE  = 10;   // visual cap so lines stay readable

    var keySigPad   = haveKeySig ? 70 : 0;
    var availWidth  = SYSTEM_WIDTH - CLEF_PX - keySigPad - PAD_PX;
    var perSystem   = Math.min(MAX_PER_LINE, n, Math.floor(availWidth / NOTE_PX));
    if (perSystem < 1) perSystem = 1;

    // Distribute notes as evenly as possible across systems.
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

    // Total canvas height: top margin + systems + bottom margin.
    var totalHeight = STAVE_TOP + numSystems * SYSTEM_HEIGHT + 20;

    var renderer = new Renderer(output, Renderer.Backends.SVG);
    renderer.resize(SYSTEM_WIDTH, totalHeight);
    var ctx = renderer.getContext();

    // Render each system: stave (with clef + key sig) → voice → format → draw.
    systems.forEach(function (systemNotes, si) {
      var y = STAVE_TOP + si * SYSTEM_HEIGHT;
      var stave = new Stave(10, y, SYSTEM_WIDTH - 20);
      stave.addClef("bass");
      if (haveKeySig) stave.addKeySignature(keySigName);
      stave.setContext(ctx).draw();

      var staveNotes = systemNotes.map(function (tonalNote) {
        var key = toVexKey(tonalNote);
        var sn  = new StaveNote({ keys: [key], duration: "q", clef: "bass", autoStem: true });
        var pc  = Tonal.Note.pitchClass(tonalNote);
        var acc = accidentalType(pc);
        // When a key signature is shown, only draw an accidental on a note whose
        // pitch class is NOT already altered by the key signature — i.e. notes
        // that need a natural or a different accidental than the key sig implies.
        // (Notes already covered by the key sig are left unmarked, as is standard.)
        if (acc && (!haveKeySig || !alteredPcs.has(pc))) {
          sn.addModifier(new Accidental(acc), 0);
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
    var rate      = 0.42; // seconds per note
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

      /* Highlight the current note name */
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
  playBtn.addEventListener("click", play);

  render();
})();

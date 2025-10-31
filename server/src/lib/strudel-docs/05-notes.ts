export const SECTION_NOTES = `
## Playing Notes and Melodies

### Note Notation

**Using letters (Western music notation):**
note("[g bb] ~ d4@2 [f# <g a>] ~ bb <g4 f#4 a4>").s("piano")
note("a3 [c#4 e4] ~ g3 ~ [f3 e3]")  // With octave numbers (1-8)

**Using numbers (MIDI note numbers):**
note("60 [63 65] ~ 67 ~ [65 63 60]").s("piano")  // MIDI note numbers with rhythm
note("57 ~ 61 64 ~ 69")              // A dorian with rests

**Flats and sharps:**
note("[ab bb db4] ~ eb4 [db4 bb ab] ~").s("piano")  // Flats (b) with rhythm in Ab
note("f# [g# b] ~ c#4 ~ [b g# f#]").s("piano")  // Sharps (#) with contour in F#

**Microtonal (decimal):**
note("60 60.5 61").s("piano")    // Quarter tones
note("74.5 75 75.5 76")          // Microtonal pitches

**Frequency notation:**
freq("220 275 330 440")  // Direct frequency control in Hz

### Scales

**IMPORTANT:** Scales work with scale degrees (0, 1, 2, 3...), NOT with the \`note()\` function.

**Two ways to use scales:**

**Option 1: Use \`n()\` for scale degrees**
n("[0 2 4] ~ 6@2 [5 6 4 2 1 0]").scale("D:dorian").s("piano") // with a piano roll at the end

**Option 2: Use string pattern + \`.scale()\` + \`.note()\`**
"0 [2 4] ~ 7 ~ ~ 4 6".scale("A:minor:pentatonic").note().s("piano")

The numbers refer to scale degrees (0 = root, 1 = 2nd note, 2 = 3rd note, etc), not MIDI notes.

**Note:** When using \`n()\` with signals, add \`.segment()\` to create events: \`n(irand(8)).segment(16).scale("C:minor")\`

**❌ WRONG - Can't use \`note()\` with \`.scale()\`:**
\`\`\`javascript
// Using note() with numbers - treats as MIDI notes, not scale degrees!
note("[0 2] ~ 4 7").scale("E:phrygian")

// Using note() with letter names - already specific notes, scale does nothing!
note("d [f a] ~ c4").scale("E:phrygian") // Wrong!
note("<d [f a] ~ d4> <[g bb d4] g4>").scale("E:phrygian")  // Wrong!
\`\`\`

**✅ CORRECT:**
\`\`\`javascript
// Use n() for scale degrees
n("<[0 2 4] 7> <7 4 [2 0]> <0 [4 7] 9 12> <12 [9 7 4] 0>").scale("E:phrygian").s("piano")

// Or string + .scale() + .note()
"[0 2] ~ [4 5 4] 7 9 ~ 2 1".scale("A:minor").note().s("piano")

// Or use note() WITHOUT scale for specific notes
note("d [f a] ~ d4 ~ [c4 a d4]").s("piano")
note("<[d f] eb d4 a> <[g bb d4] g4>").s("sawtooth")
\`\`\`

**Scale notation:**
scale("ROOT:TYPE")

**Common scales:**
- \`C:major\`, \`A:minor\`
- \`D:dorian\`, \`G:mixolydian\`, \`E:phrygian\`
- \`C:pentatonic\`, \`G:major:pentatonic\`, \`C:minor:pentatonic\`
- \`C:bebop\`, \`D:blues\`
- \`C:whole\`, \`C:chromatic\`
- \`C:harmonicMinor\`, \`C:melodicMinor\`

**Pattern scales:**
n("[0 2] ~ 4 [7 4 2] ~").scale("<C:major D:dorian>/4").s("piano")

^ this allows you to change the scale as a progression

### Chord Symbols

**IMPORTANT:** The \`chord()\` function works with chord SYMBOLS (like "Cm7", "G7"), NOT with manual note lists. For manual notes, use \`note()\` instead.

\`\`\`js
// ✅ CORRECT - chord() with symbols
chord("C^7 Dm7 G7").voicing().s("piano")  // Chord symbols
chord("<Em7 D^7 C^7 C^7>").voicing()      // Chord progression with symbols

// ❌ WRONG - Don't use manual note lists with chord()
chord("[c,eb,g,bb]").voicing()  // Wrong! chord() expects symbols, not note lists
chord("<[c,eb,g,bb] [f,ab,c4,eb4]>").voicing()  // Wrong!

// ✅ CORRECT - Use note() for manual note lists instead
note("[c,eb,g,bb]").s("piano")  // Manual notes (no .voicing() needed)
note("<[c,eb,g,bb] [f,ab,c4,eb4]>").s("piano")  // Manual chord progression
\`\`\`

**IMPORTANT: Chord Notation Format**

Use \`^7\` for major 7th chords (NOT "maj7"):

chord("C^7 Dm7 G7").voicing().s("piano")  // Jazz ii-V-I progression
chord("<Em7 D^7 C^7 C^7>").voicing()   // Chord progression

IMPORTANT: All chords must start with a *capitalized* note name (F, not f).

**Correct Chord Notation Reference:**

**Major chords:**
chord("C")      // Major triad
chord("C^7")    // Major 7th (use ^7 or M7, NOT "maj7")
chord("CM7")    // Alternative major 7th notation  
chord("C6")     // Major 6th
chord("C69")    // Major 6/9

**Minor chords:**
chord("Cm")     // Minor triad
chord("Cm7")    // Minor 7th
chord("Cm^7")   // Minor major 7th
chord("Cm6")    // Minor 6th

**Dominant chords:**
chord("C7")     // Dominant 7th
chord("C7b9")   // Dominant 7 flat 9
chord("C7#9")   // Dominant 7 sharp 9
chord("C7#11")  // Dominant 7 sharp 11
chord("A7b13")  // Dominant 7 flat 13
chord("C7alt")  // Altered dominant

**Diminished/Augmented:**
chord("Co")     // Diminished (also Cdim)
chord("Co7")    // Diminished 7th
chord("Cm7b5")  // Half-diminished (also Cø)
chord("C+")     // Augmented
chord("C+7")    // Augmented 7th

**Suspended chords:**
chord("Csus2")  // Suspended 2nd
chord("Csus4")  // Suspended 4th
chord("C7sus4") // Dominant 7 suspended 4th

**All Valid Chord Shapes:**

The following suffixes can be added to any root note (e.g., C, Dm, F#, etc.):

2 5 6 7 9 11 13 69 add9
o h sus ^ - ^7 -7 7sus
h7 o7 ^9 ^13 ^7#11 ^9#11
^7#5 -6 -69 -^7 -^9 -9
-add9 -11 -7b5 h9 -b6 -#5
7b9 7#9 7#11 7b5 7#5 9#11
9b5 9#5 7b13 7#9#5 7#9b5
7#9#11 7b9#11 7b9b5 7b9#5
7b9#9 7b9b13 7alt 13#11
13b9 13#9 7b9sus 7susadd3
9sus 13sus 7b13sus
aug M m M7 m7 M9 M13
M7#11 M9#11 M7#5 m6 m69
m^7 -M7 m^9 -M9 m9 madd9
m11 m7b5 mb6 m#5 mM7 mM9

**Common aliases:**
- \`o\` = diminished
- \`h\` = half-diminished
- \`+\` = augmented

INVALID CHORD SHAPES:
maj7 min7
---

### Chord Dictionaries

Different chord voicing systems:

// Default (tonaljs) dictionary
chord("C^7").voicing()

// iReal Pro dictionary (jazz-oriented voicings)
chord("C^7").dict('ireal').voicing()

### Root Notes & Bass Lines

Extract root notes from chord symbols for basslines:

// Get root notes in octave 2 for bass
chord("<C^7 A7b13 Dm7 G7>*2").rootNotes(2).s("sawtooth").lpf(800)

// Layer chords with bass
chord("<C^7 A7b13 Dm7 G7>*2").dict('ireal').layer(
  x => x.struct("[~ x]*2").voicing().s("piano"),
  x => x.rootNotes(2).s('sawtooth').lpf(800).struct("x*4")
)

### Transposition

**Transpose by semitones:**
note("d [f a] ~ c4").transpose("<0 2 4>")  // Transpose by semitones
"[d2 ~ f2 a2] [d3 a2]".transpose("<0 -2 5 3>").note()

**Scale transposition:**
n("[0 2] ~ 4 7 [4 2]").scale("E:minor").scaleTranspose("<0 1 2>")  // Transpose within scale

**Mode (set root note):**
n("[0 2 4] ~ 7 [4 2]").scale("E:minor").mode("root:g2")  // Root at G2

### Arpeggiation

**Note:** \`.arp()\` selects indices from stacked notes - it's for advanced use. For melodic patterns, use sequential notes or voicings:

// For melodies, skip arp entirely:
n("[0 2] 4 ~ 7 [9 7 4 2]").scale("D:dorian").s("gm_electric_guitar_clean")
n("[0 2 4] ~ [7 4 2 0]").chord("Dm7").mode("above:d3").voicing().s("piano")

// arp() selects indices from stacked notes (only use for advanced use cases that have such stacked chords)
note("[a,c#,e,g]").arp("0 1 2 3")  // Am7 chord - select indices from chord
note("<[d,f#,a,c4]!2 [g,bb,d4,f4] [a,c#4,e4,g4]>").arp("0 [0,2] 1 3")  // Advanced

### Note Functions Reference

| Function | Description | Example |
|----------|-------------|---------|
| \`note()\` | Play note | \`note("d [f a] ~ d4")\` |
| \`n()\` | Scale degree | \`n("[0 2] ~ 4 7")\` |
| \`freq()\` | Direct frequency | \`freq("220 440")\` |
| \`chord()\` | Chord from symbol | \`chord("C^7")\` |
| \`scale()\` | Apply scale | \`.scale("C:minor")\` |
| \`transpose()\` | Transpose semitones | \`.transpose(2)\` |
| \`scaleTranspose()\` | Transpose in scale | \`.scaleTranspose(1)\` |
| \`voicing()\` | Voice chords | \`.voicing()\` |
| \`dict()\` | Set chord dictionary | \`.dict('ireal')\` |
| \`rootNotes()\` | Extract chord roots | \`.rootNotes(2)\` |
| \`mode()\` | Set scale root/range | \`.mode("root:g2")\` |
| \`anchor()\` | Adaptive voicing | \`.anchor(pattern)\` |
| \`arp()\` | Arpeggiate indices | \`.arp("0 1 2 3")\` |
`;


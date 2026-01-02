export const SECTION_BASIC_CONCEPTS = `
## Basic Concepts

### Cycles

The fundamental unit of time in Strudel is the **cycle**. By default:
- One cycle = 2 seconds
- All patterns fit into cycles
- Events are evenly distributed within a cycle

### Patterns

Everything in Strudel is a pattern - flows of time that generate events. Patterns can contain:
- Sounds
- Notes
- Numbers
- Effects
- Transformations

**Key concept:** All events in a pattern are distributed evenly within one cycle. When you write more events, they don't extend the time - they get squished into the same cycle duration.

Compare:
note("d f ~ d4")           // 4 notes fit into 1 cycle
note("d f ~ d4 e5")           // 5 notes fit into the same 1 cycle (slightly faster rhythm in 5/4 basically)
note("e ~ [g a] b ~ [d4 e4]")     // 6 notes fit into the same 1 cycle
note("e ~ [g a] b ~ [d4 e4] g@2") // There are 8 beats here because g@2 is 2 beats. [g a] and [d4 e4] each take only 1 beat.
^ all 4 of these patterns fit into the same 1 cycle and play in the same amount of time..

This is fundamental to how Strudel works: adding more notes speeds them up, removing notes slows them down.

### Notes vs Sounds: A Critical Distinction

Understanding the difference between notes and sounds is fundamental to avoiding errors:

**Sounds (\`s()\` or \`sound()\`):**
- Trigger samples or synths by name
- Don't have pitch information
- Examples: \`s("bd")\`, \`s("hh*8")\`, \`s("sawtooth")\`

**Notes (\`note()\`):**
- Create pitched musical events (control patterns)
- Use letter notation (c, d, e) or MIDI numbers (60, 67, 70)
- Examples: \`note("g3 [bb3 d4] ~ f4")\`, \`note("60 67 70")\`
- ⚠️ **Important:** \`note()\` immediately creates control patterns - arithmetic transformations like \`.add()\` won't work after \`note()\`
- ⚠️ **NEVER use scale degrees (0-7) with note()** - use letter names or MIDI numbers (60+) instead

**Scale Degrees (\`n()\`):**
- Numbers that map to scale positions (0=root, 1=second, 2=third, etc.)
- **MUST use numbers only (0-7), NEVER letter names like "c2" or "eb4"**
- MUST be converted to actual notes using \`.scale()\` combined with \`.s()\`
- Examples: \`n("[0 2] ~ 4 7 ~ [4 2]").scale("A:minor").s("piano")\`

**CRITICAL - Three ways to create note patterns:**

1. **Letter names with note():** \`note("c3 [eb3 f3] ~ g3")\` → Creates control patterns immediately
2. **MIDI numbers with note():** \`note("60 [63 65] ~ 67")\` → Creates control patterns immediately  
3. **Scale degrees with n():** \`n("0 [2 4] ~ 7").scale("C:minor").s("piano")\` → Creates control patterns after .scale()

**❌ NEVER DO THIS:**
- \`note("0 2 4 7")\` → Ambiguous! Are these MIDI notes or scale degrees?
- \`n("c2 eb2 f2")\` → n() expects numbers, not letter names!
- \`note("0 2 4").scale("C:minor")\` → note() with low numbers + scale is wrong!

**Critical Rules:**

1. **Raw string patterns with scales need \`.note()\`:**
   \`\`\`js
   "[0 2 7] ~ 4 7 ~ [5 4 2]"
     .scale("E:minor")
     .note()  // ✅ REQUIRED - converts scale degrees to notes
     .s("sawtooth")
   \`\`\`

2. **\`n()\` with scales NEVER needs \`.note()\` after:**
   \`\`\`js
   n("0 [2 4] ~ 7 [9 7]")
     .scale("G:mixolydian")  // ✅ CORRECT - n().scale() creates control patterns
     .s("sawtooth")
   
   n("0 [2 4] ~ 7 [9 7]")
     .scale("G:mixolydian")
     .note()  // ❌ ERROR - n().scale() already created control patterns!
     .s("sawtooth")
   \`\`\`

3. **\`note()\` with letter names doesn't use \`.scale()\`:**
   \`\`\`js
   note("a3 [c4 e4] ~ g3 ~ [f3 e3]")  // ✅ Absolute pitches, creates control patterns
     .s("sawtooth")
   
   note("f [ab c4] ~ eb")
     .scale("F:minor")  // ❌ Doesn't work - note() already created control patterns with absolute pitches
   
   note("c e g")
     .juxBy(0.5, x => x.add(7))  // ❌ ERROR - Can't do arithmetic on control patterns from note()!
   
   // ✅ Use .trans() instead for control patterns:
   note("c e g")
     .superimpose(x => x.trans(7))  // ✅ .trans() works on control patterns!
   \`\`\`

**When to use each:**

- Use \`s("samplename")\` for drums and triggering specific samples
- Use \`note("d [f a] ~ c4")\` for absolute pitches that don't change with scales
- Use \`n("[0 2] ~ 4 7").scale("E:phrygian")\` for melodies/harmonies that work with scales
- Use raw string \`"[0 2 4] ~ 7".scale("A:minor").note()\` when you need to transform before conversion

**Common workflow:**
\`\`\`js
// Drums (sounds, no pitch)
s("bd ~ sd ~, hh*8")

// Melody with scale degrees (flexible, can change scale easily)
n("0 [2 4] 7 4 2 ~ 0 ~")
  .scale("C:minor")
  .s("sawtooth")

// Absolute pitches (specific notes)
note("g3 [bb3 d4] ~ f4 ~ [eb4 d4]")
  .s("piano")

// Raw pattern with transformations (for superimpose, etc.)
"[0 2] ~ 4 7 ~ [5 4]"
  .superimpose(x => x.add(2))  // Add harmony
  .scale("D:minor")
  .note()  // Convert to notes AFTER transformations
  .s("sawtooth")
\`\`\`

### Brackets: Chords vs Sequences

**CRITICAL:** Brackets \`[]\` have TWO different meanings depending on what separates the values:

**Chords (simultaneous notes) - Use COMMAS:**
\`\`\`js
note("[d,f#,a,c4,e4]")     // Dmaj9 chord - all 5 notes play TOGETHER
note("[e,g#,b,f#4]")       // Eadd9 - all 4 notes SIMULTANEOUSLY
note("[g,bb,d4,f4,a4]")    // Gm11 chord - 5 notes at once
\`\`\`

**Sequences (subdivisions) - Use SPACES:**
\`\`\`js
note("[d g a d4]")     // Four notes ONE-BY-ONE as a subdivision (D major arpeggio)
note("[e g# b c#4 e4]") // Five notes in sequence, subdividing one step (E major with passing tone)
note("a [c# e] a4")     // a, then c# and e quickly, then a4
\`\`\`

**Why this matters:**
\`\`\`js
// ❌ WRONG - Confusing chord with sequence
note("[d f# a c4]")  // This is NOT a chord! It's 4 sequential notes fast

// ✅ CORRECT - Chord notation (commas)
note("[d,f#,a,c4,e4]")  // This IS a chord - commas = simultaneous (Dmaj9)

// ✅ CORRECT - Chord progression with extensions
note("<[d,f#,a,c4,e4] [g,b,d4,f#4,a4] [a,c#4,e4,g4,b4] [b,d4,f#4,a4,c#5]>/2")  // Four 9th chords in sequence (Dmaj9 → Gmaj9 → A13 → Bm9) lasting 2 cycles each

// ✅ CORRECT - Melody with subdivisions
note("d [f# a] ~ b ~ [c#4 d4] ~ a")  // Melody with quick note pairs
\`\`\`

**Key rule:** 
- **Commas = Polyphony** (notes play together)
- **Spaces = Subdivision** (notes play one after another, fast)

### Long Melodies and Multiple Cycles

For longer melodies that need more time to breathe, you have several options:

**Use division \`/\` to spread across cycles:**
note("[g [bb d4] ~ c4 ~ [a f] ~ eb ~ [d c4] ~ bb a]/4")  // This melody plays slowly over 4 cycles
note("[e ~ [g a] b ~ [d4 e4] ~ c4]/2")  // This melody plays over 2 cycles

**Use angle brackets \`<>\` for cycling and variations over time:**
note("<[d f a] ~ d4> <[g bb d4] g4> <[a c4 e4] a4>")  // Different notes each cycle (3 cycles total)
// first phrase on cycle 1, second phrase on cycle 2, third phrase on cycle 3

**Use \`slow()\` for pattern transformation:**
note("e ~ [g a] b ~ [d4 e4] ~ c4").slow(2)  // Pattern plays over 2 cycles

### Tempo Control
setcpm(120/4)  // Sets cycles per minute (120bpm in 4/4)

---
Default: 30 cycles per minute (120 bpm / 4).
For global tempo changes, use \`setcpm()\`. Functions like \`.fast()\` and \`.slow()\` are useful for creative effects on individual patterns, NOT as primary tempo controls.

**Important about \`.fast()\` and \`.slow()\`:**
- These functions speed up or slow down a pattern by fitting more/fewer repetitions into one cycle
- They are pattern transformations, not tempo changes
- Use them for creative effects (like doubling a hi-hat pattern), not to change song tempo
- For song tempo, always use \`setcpm()\`

Example:
setcpm(140/4)      // Changes tempo to 140 BPM (tempo control)
s("hh*8").fast(2)  // Plays 16 hi-hats per cycle (creative effect)

### Understanding Timing and Steps

How steps map to musical time:
s("bd ~ ~ ~")        // 4 steps = quarter notes (4/4 time)
s("bd ~ sd ~ hh ~ oh ~")  // 8 steps = eighth notes
s("hh*16")           // 16 steps = sixteenth notes

---
**Key insight:** In one cycle:
- **4 steps** = 4 quarter notes (one bar in 4/4)
- **8 steps** = 8 eighth notes
- **16 steps** = 16 sixteenth notes

**Example - Building a beat:**
// Quarter note kicks:
s("bd ~ ~ ~")  // Kick on beat 1 only

// Add snare on beats 2 and 4:
s("bd ~ sd ~")  // Classic backbeat (4 steps = 4 quarter notes)

// Add eighth note hi-hats:
s("bd ~ sd ~, hh*8")  // Kick/snare + 8 hi-hats per cycle (importantly, note the comma)
`;
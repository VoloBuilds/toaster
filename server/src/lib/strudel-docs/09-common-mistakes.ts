export const SECTION_COMMON_MISTAKES = `
## Common Mistakes & Corrections

This section highlights frequent errors and their solutions.

### 🚨 CRITICAL: Using note() with Scale Degrees (0-11)

**This is the #1 most common error!**

**❌ WRONG - Using note() with scale degrees:**
\`\`\`js
note("0 2 4 7")  // These are scale degrees, not MIDI notes!
note("<0 [2 4] 7>")  // Scale degrees wrapped in note()!
note("<[0 ~ 2 4] ~ 7 [9 7] ~ 4 2>")  // Wrong - numbers 0-11 are scale degrees!
\`\`\`

**✅ CORRECT - Use n() or raw strings for scale degrees:**
\`\`\`js
n("0 2 4 7").scale("C:minor").s("piano")  // Use n() for scale degrees
"0 2 4 7".scale("C:minor").note().s("piano")  // Raw string with .scale()
note("c3 eb3 g3 bb3").s("piano")  // Letter names are fine with note()
note("60 63 67 70").s("piano")  // High MIDI numbers (60+) are fine
\`\`\`

**Rule:** If you see numbers 0-11 in a pattern → Use \`n()\` or raw strings, NOT \`note()\`

### 🚨 CRITICAL: Can't Do Arithmetic on Control Patterns

**This is the #2 most common error!**

**❌ WRONG - Arithmetic after note() or n().scale():**
\`\`\`js
note("c e g").add(7)  // Can't do arithmetic after note()!
note("<0 [2 4] 7>").superimpose(x => x.add(2))  // Wrong - note() with scale degrees AND arithmetic!
n("0 2 4").scale("C:minor").add(7)  // Can't do arithmetic after n().scale()!
n("0 2 4").scale("C:minor").superimpose(x => x.add(7))  // Same error!
\`\`\`

**✅ CORRECT - Arithmetic BEFORE .note() or .scale():**
\`\`\`js
"0 2 4".add(7).scale("C:minor").note().s("piano")  // Arithmetic BEFORE conversion
"0 2 4".superimpose(x=>x.add(7)).scale("C:minor").note().s("piano")  // Transform BEFORE
"c e g".superimpose(x=>x.add(7)).note().s("piano")  // Works with letter names too
\`\`\`

**Rule:** Arithmetic (.add, .superimpose, .mul, .div) must come BEFORE .note() or .scale()

**Why:** \`note()\` and \`n().scale()\` create **control patterns**. Once you have a control pattern, arithmetic operations fail with "Can't do arithmetic on control pattern".

### Chord Notation Errors

**❌ WRONG:**
chord("Cmaj7")   // This format doesn't exist!
chord("Dmaj7")   // Wrong - use DM7 instead
chord("Gmaj7")   // Wrong - use GM7 instead
chord("c^7")     // Wrong - chord root must be capitalized!
chord("d7")      // Wrong - chord root must be capitalized!

**✅ CORRECT:**
chord("C^7")     // Use ^7 for major 7th
chord("CM7")     // Or CM7 (both work)
chord("Dm7")     // Minor 7th (this one was already correct)
chord("G7")      // Dominant 7th (this one was already correct)

**Remember:** Use \`^7\` or \`M7\` for major 7th chords, NOT "maj7"!

**⚠️ IMPORTANT:** Chord root notes MUST be capitalized! \`C^7\` works, but \`c^7\` does NOT. Always use uppercase for the root note (C, D, E, F, G, A, B), whether major or minor.

### Chord Function vs Manual Note Lists

**This is a common confusion!**

**❌ WRONG - Using manual note lists with chord():**
\`\`\`js
chord("[c,eb,g,bb]").voicing()  // ❌ chord() expects symbols, not note lists!
chord("<[c,eb,g,bb] [f,ab,c4,eb4]>").voicing()  // ❌ Wrong!
chord("<[c,eb,g,bb]!2 [f,ab,c4,eb4] [g,bb,d4,f4]>").dict('ireal').voicing()  // ❌ Wrong!
\`\`\`

**✅ CORRECT - Two different approaches:**
\`\`\`js
// Approach 1: chord() with SYMBOLS → .voicing() generates notes
chord("Cm7").voicing().s("piano")  // ✅ Chord symbol
chord("<Cm7 Fm7>").voicing().s("piano")  // ✅ Chord progression with symbols
chord("<Cm7!2 Fm7 Gm7 Eb7>*2").dict('ireal').voicing().s("piano")  // ✅ Symbols with alternation

// Approach 2: note() with MANUAL NOTE LISTS → Already specified notes
note("[c,eb,g,bb]").s("piano")  // ✅ Manual notes (no .voicing() needed)
note("<[c,eb,g,bb] [f,ab,c4,eb4]>").s("piano")  // ✅ Chord progression with manual notes
note("<[c,eb,g,bb]!2 [f,ab,c4,eb4] [g,bb,d4,f4]>").s("piano")  // ✅ Manual notes with alternation
\`\`\`

**Key distinction:**
- **\`chord("Cm7")\`** = chord symbol → needs \`.voicing()\` to generate notes
- **\`note("[c,eb,g,bb]")\`** = manual notes → already specified, no \`.voicing()\`

**When to use each:**
- Use \`chord()\` when you want automatic voicing, inversions, and jazz-style voicings with \`.dict('ireal')\`
- Use \`note()\` when you want exact control over which notes and octaves play

### Non-Existent Sounds

**❌ WRONG:**
s("guitar")      // This sound doesn't exist in default library!
s("bass")        // No default "bass" sample
s("strings")     // No default "strings" sample
s("organ")       // No default "organ" sample

**✅ CORRECT:**
// For bass and pads, use synthesis:
note("d2 ~ [d2 f2] ~ [a2 d2] ~ f2 ~").s("sawtooth").lpf(400)  // Synth bass
note("<g!3 c> ~ [bb d4] [f eb]").s("triangle").attack(0.3).release(2)   // Soft pad


// For strings and instruments, use the proper sound name:
note("<g!3 c> ~ [bb d4] [f eb]").s("gm_violin")
note("<bb <c g>> <~!3 [g f eb]>").s("gm_cello")
note("<c2*4!3 [c2 eb2 g2 bb2]>").s("gm_tuba")


// Piano DOES work (built-in):
s("piano")  // ✅ This is correct!
s("gm_epiano1") // ✅ This works!
s("gm_electric_piano_1") //  ❌ WRONG - nonexisting sound

**For other sounds:**
- Use synthesis with built-in waveforms (sawtooth, square, sine, triangle)
- Query Freesound with Shabda: \`samples('shabda:maracas:2')\`  and then later  \`s("maracas:0 maracas:1")\` - Generic terms work best

### Orbit Conflicts

**❌ WRONG:**
// Both patterns share orbit 1 - their reverb settings fight!
$: note("[b3@2 d4] [a3@2 [g3 a3]]").room(1).roomsize(10)
$: s("bd*4").room(0).roomsize(0)

**✅ CORRECT:**
// Use different orbits for different effect chains
$: note("[b3@2 d4] [a3@2 [g3 a3]]").room(1).roomsize(10).orbit(2)
$: s("bd*4").room(0).roomsize(0).orbit(1)

**Why:** Each orbit has ONE delay and ONE reverb. If multiple patterns use the same orbit with different settings, the last pattern's settings win, causing unexpected results.
Also, you should use orbit in a way where one instrument occupies an orbit and other duck that orbit (see duck instructions).

### Commenting Out Tracks (Silencing & muting)

\`\`\`js
$: //note("[c5@2 f5] [f5@2 c6]").s("piano")  // ❌ WRONG
//$: note("[c5@2 f5] [f5@2 c6]").s("piano")  // ✅ CORRECT
\`\`\`

### Signals Without Events

**❌ WRONG:**
// This creates NO events - nothing will play!
n(irand(8)).scale("C:major").s("triangle")

**✅ CORRECT:**
// Use .segment() to create events
n(irand(8)).segment(16).scale("E:minor").s("triangle")

// Or use a string pattern
n("[0 2 4 6 9 2 0 -2]*3").scale("F:lydian").s("triangle")

**Why:** Signals like \`irand()\` don't create events by themselves - they only provide values when events occur. Use \`.segment()\` to create events that sample the signal.

### Continuous Modulation Errors

**❌ WRONG:**
// This won't smoothly modulate - only changes when note triggers
s("sawtooth").lpf(sine.range(100, 2000))
note("<g4 c5 a4 [ab4 <eb5 f5>]>").lpf(saw.range(500, 5000).slow(2))

**✅ CORRECT:**
// Use .segment() to create more events for smooth modulation
s("sawtooth").segment(16).lpf(sine.range(100, 2000))
note("<g4 c5 a4 [ab4 <eb5 f5>]>").segment(16).lpf(saw.range(500, 5000).slow(2))

**Why:** Signals are only sampled when events occur. Without \`.segment()\`, modulation only changes at note boundaries.

**Exceptions (these ARE continuous):**
- ADSR envelopes
- Filter envelopes (lpenv, hpenv, bpenv)
- Pitch envelopes (penv)
- Tremolo, Phaser, Vibrato, Ducking

### Using Signals Where Discrete Values Are Required

**❌ WRONG:**
s("jazz:4").slice(8, rand)  // Error - slice needs discrete values!
s("bd sd hh oh").n(rand)  // Won't work

**✅ CORRECT:**
s("jazz:4").slice(8, rand.segment(8))  // Use .segment() to create discrete values
s("bd sd hh oh").n(irand(4).segment(8))  // Or use pattern strings: n("[0 2] ~ [1 3]")

**Rule:** Functions like \`slice()\` and \`n()\` need discrete values - use \`.segment()\`. Effects like \`pan()\`, \`gain()\`, \`lpf()\` work with signals directly.

### String Syntax Errors

**❌ WRONG:**
note('c e g')    // Single quotes create a literal string, not a pattern
s('bd sd')       // Won't parse as mini-notation

**✅ CORRECT:**
note("[f#5 d5] [b4 g4] bb4 [b4 a4]")    // Double quotes for mini-notation
s(\`bd sd\`)      // Or backticks for multi-line patterns

**When to use single quotes:**
.dict('ireal')   // For regular string parameters (not patterns)
samples('shabda:clap:1')  // For sample loading (non-pattern strings)
samples('github:user/repo')  // For URLs


### Effect Chain Order

**❌ WRONG:**
// Trying to use the same effect twice (second lpf overrides first)
s("bd").lpf(100).distort(2).lpf(800)

**✅ CORRECT:**
// Effects are applied in a fixed order regardless of chain order
// Each effect can only be used once per event
s("bd").lpf(800).distort(2)  // Just use lpf once

// For complex filtering, use filter envelopes instead:
s("bd").lpf(100).lpenv(8).lpa(0.001).lpd(0.1)

**Signal Flow Order:**
Sound → Gain/ADSR → LPF → HPF → BPF → Vowel → Coarse → Crush → Shape → Distort → Tremolo → Compressor → Pan → Phaser → Postgain → [Dry, Delay, Reverb] → Orbit → Output

### Sample Loop Errors

**❌ WRONG:**
// Looping without clip causes overlapping sounds
s("space:2").loop(1)

**✅ CORRECT:**
// Use .clip() to prevent overlap
s("space:2").loop(1).clip(1)

### Scale Degree vs MIDI Note

**❌ WRONG:**
// Using MIDI note numbers with .scale()
note("60 62 64").scale("C:minor")  // Wrong!

**✅ CORRECT:**
// Use n() for scale degrees (numbers 0-7) with .scale()
n("<6 5 4 3>*2").scale("C:minor")  // Correct - numbers are scale degrees
n("[0 2 4 7]").scale("D:minor").s("piano")  // Correct

// Or use note() without scale:
note("60 62 64")  // MIDI notes (no scale needed)
note("[d5@2 [c5 b4]] [[c5 b4] g4@2]")     // Letter notation (no scale needed)
note("eb4 d4 c4 b3")  // Letter names (no scale needed)

### Bank Usage Errors

**❌ WRONG:**
// Using banks with sounds that don't have that bank
s("piano").bank("RolandTR808")  // piano is not in TR808 bank!

**✅ CORRECT:**
// Banks work with drum abbreviations only
s("bd sd hh").bank("RolandTR808")  // Correct

// Piano is standalone
s("piano")  // Correct (no bank needed)

### Shabda Async Loading Errors

**⚠️ CRITICAL RULE:** The \`samples()\` function must ALWAYS be at the TOP of your code. NEVER inline it with patterns, stack calls, or any other code.

**❌ WRONG - Separate code blocks:**
// Don't do this - samples won't be ready!
samples('shabda:bass:4')
// Later/different execution - ERROR: 'bass' undefined!
$: s("bass:0 bass:1")

**❌ WRONG - Inline with patterns:**
// Don't inline samples() with patterns!
stack(
  samples('shabda:bass:4'),  // ❌ NEVER DO THIS
  s("bass:0 bass:1")
)

**❌ WRONG - Inline anywhere:**
// Don't put samples() anywhere except the top!
s("bd*4").stack(samples('shabda:bass:4'), s("bass:0"))  // ❌ NEVER

**✅ CORRECT - samples() at the top:**
// 1. ALWAYS load samples at the TOP (first lines of code)
samples('shabda:bass:4')
samples('bubo:waveforms')
samples('github:tidalcycles/dirt-samples')

// 2. Then use in patterns (below)
s("bass:0 bass:1 bass:2 bass:3")

// 3. Or in stack
stack(
  s("bass:0 bass:1"),
  s("bass:2 bass:3")
)

**Why:** The \`samples()\` function loads samples asynchronously. If you try to use them before they're loaded, you'll get "Cannot read properties of undefined" errors.

**Rule:** Always put ALL \`samples()\` calls at the very TOP of your code, on their own line(s), before any patterns, stack calls, or other code. This applies to:
- \`samples('shabda:...')\` - Freesound samples
- \`samples('bubo:waveforms')\` - Wavetables
- \`samples('github:...')\` - GitHub samples
- Any other \`samples()\` call

### Drum Pattern Mistakes

**❌ Overly dense with no variation:**
s("bd*4, sd*4, hh*16")  // Mechanical - every step filled

**✅ Use space, euclidean rhythms, and variation:**
s("bd(5,8), ~ sd ~ sd, [hh oh]*4")  // Natural groove
s("bd ~ <bd [bd bd]> sd, hh*8")     // Alternating patterns

**❌ Misunderstanding brackets:**
s("bd [sd cp]")  // Subdivides - plays sd then cp quickly

**✅ Use comma to layer sounds:**
s("bd [sd,cp]")  // Layers - plays sd and cp together

**Note on tempo:** Use \`setcpm()\` for global tempo control. \`.fast()\`/\`.slow()\` can be useful for creative effects (like doubling a hi-hat part), but shouldn't be your primary tempo control

Don't put a $: before the setcpm() call. It should be at the top of the code on its own, just \`setcpm(120/4)\` or similar.

**❌ WRONG: \`$: setcpm(120/4)\`**
**✅ CORRECT: \`setcpm(120/4)\`**

### Arp Usage

**❌ WRONG - Using arp for arpeggiation:**
n("0 2 4 7 9").scale("E:minor").arp("up")  // arp() doesn't work this way!

**✅ CORRECT - For melodic patterns, skip arp entirely:**
note("[a5 f5@2 c5] [d5@2 f5] ~ f5").s("gm_electric_guitar_clean")  // Sequential notes
n("0 1 2 3").chord("Em").mode("above:e3").voicing().s("piano")  // Chord voicings

**Why:** \`.arp()\` selects indices from stacked notes (e.g., \`note("[c,eb,g]").arp("0 1 2")\`). It's for advanced cases, not general arpeggiation.

### Boring, Uninteresting Patterns

For comprehensive pattern design guidance, see **Section 15: Style Guide**.

**Key principles to avoid boring patterns:**
- Add rhythmic variation with \`[]\`, \`~\`, \`@\`, \`!\`,
- Use euclidean rhythms \`(3,8)\`, \`(5,8)\` for natural grooves (inside the quotes)
- Include rests and breathing room
- Add passing tones and melodic contour
- Use alternation \`<>\` for variation over time
- Avoid plain triads, scale walks, and mechanical repetition

### Incorrect Use of Arithmetic Transformations

**❌ WRONG - arithmetic transformations after note() or n().scale():**
note("[f#5 d5] [b4 g4]").superimpose(x=>x.add(7))  // ❌ Can't do arithmetic - note() creates control patterns!
note("[c5@2 f5] [f5@2 c6]").juxBy(0.5, x => x.add(7))  // ❌ Same issue - note() already made control patterns!
n("<6 5 4 3>").scale("C:minor").superimpose(x=>x.add(2))  // ❌ Can't do arithmetic after n().scale()!

**❌ WRONG - using .note() after n().scale():**
n("[0 2 4 6 9]").scale("F:lydian").note()  // n() already creates notes!
n("[0 2] 4 ~")
  .superimpose(x=>x.add(2))
  .scale("E:minor").note()  // Error: Can't do arithmetic on control pattern

**❌ WRONG - using transformations with n() before .scale():**
n("[0 2 4 6]").add("<0 2 4>").scale("C:major")  // Error: Can't do arithmetic on control pattern

**✅ CORRECT - superimpose and transformations on raw string patterns:**
"[f#5 d5] [b4 g4] bb4 [b4 a4]"
  .superimpose(x=>x.add(7))  // First superimpose
  .note().s("sawtooth")  // Then apply sound

"<c*2 a(3,8) f(3,8,2) e*2>"
  .off(1/8, add(7))  // First add offset transformation
  .note().s("piano")  // Then convert to notes

"[0 2 4 6 9 2 0 -2]*3"
  .add("<0 2>/4")  // Add transformation on raw string
  .scale("C:major").note()  // Then scale and convert
  .s("triangle")

n("[0 2 4 6]")
  .superimpose(x=>x.add(2))
  .scale("F:lydian")  // NO .note() - n() already creates notes!
  .s("piano")

**Why:** 
- **\`note()\` with letter names creates control patterns immediately** - arithmetic stops working
- **\`n().scale()\` creates control patterns** - arithmetic stops working after \`.scale()\`
- Arithmetic transformations like \`.add()\`, \`.superimpose()\`, \`.mul()\` need raw string patterns or \`n()\` patterns **before** conversion
- Raw string patterns need \`.note()\` to convert to notes
- Apply transformations in this order: pattern → add/superimpose/transform → scale → note (only if raw string) → sound

**Key insight:** Both \`note("[f#5 d5] [b4 g4]")\` and \`n("[0 2 4 6]").scale()\` create **control patterns**. Once you have a control pattern, arithmetic operations fail with "Can't do arithmetic on control pattern".

### Quick Checklist

Before generating patterns, check:

- [ ] Using \`C^7\` or \`CM7\` (not "Cmaj7") for major 7th chords?
- [ ] Using \`chord()\` with SYMBOLS like "Cm7", NOT manual note lists like "[c,eb,g,bb]"?
- [ ] Using \`note()\` for manual note lists, \`chord()\` for chord symbols?
- [ ] Only using sounds that exist in default library or loaded via Shabda?
- [ ] If using Shabda/wavetables: putting \`samples()\` at the TOP, before patterns?
- [ ] Using different orbits for patterns with different reverb/delay settings?
- [ ] Using \`.segment(16)\` when using LFOs for smooth LFO modulation?
- [ ] Using double quotes \`""\` or backticks for mini-notation?
- [ ] Using \`n()\` for scale degrees, \`note()\` for MIDI/letters?
- [ ] Using \`.clip(1)\` with \`.loop(1)\` to prevent overlap?
- [ ] Avoiding \`.arp()\` unless specifically selecting indices from stacked notes?
- [ ] For drums: using \`setcpm()\` for tempo, Euclidean rhythms for groove, and \`<>\` for variation?
- [ ] Creating interesting melodies with rhythmic variation, rests, passing tones, and contour (not just "0 2 4 7")?
- [ ] Using \`.superimpose()\` BEFORE \`.note()\` or \`.s()\`, not after?
- [ ] NOT using \`.note()\` after \`n().scale()\` (n() already creates notes)?
- [ ] Leveraging euclidean rhythms \`(3,8)\`, \`(5,8)\` etc. for natural, musical grooves?
- [ ] When commenting out tracks: using \`//$:\` (not \`$: //\`) to silence a track?
`;


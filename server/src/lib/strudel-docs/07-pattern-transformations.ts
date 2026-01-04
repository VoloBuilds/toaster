export const SECTION_PATTERN_TRANSFORMATIONS = `
## Pattern Effects and Transformations

These functions are unique to Tidal/Strudel and transform patterns in powerful ways.

### Alternation with Angle Brackets \`<>\`

Angle brackets create alternation - cycling through values over multiple cycles. This is one of the most powerful tools for creating variation.

**Basic alternation:**
s("<bd sd>")  // Alternates bd and sd each cycle
s("<bd sd cp hh>")  // Cycles through 4 sounds over 4 cycles

**Alternation with patterns:**
s("<bd*4 [bd sd]*2>")  // Alternates between two different rhythm patterns
note("<[f ab c4] ~ [eb g bb c4] [ab@2 c4 eb4]>*4")  // Melodic pattern with rhythmic variation

**Creating song sections:**
// Build and release
note("<c2*4!3 [c2 eb2 g2 bb2]>").s("sawtooth").lpf(400)  // 3 bars steady, 1 bar melodic

**Combining with multiplication:**
note("<d [f a] bb d4>*4")  // Each segment plays for the full cycle, making a full rotation after 4 cycles
s("<bd ~ sd ~>*2")  // Repeat the alternating pattern twice per cycle

**Musical uses of alternation:**
// Variation in drum patterns
s("bd*4, <hh*8 [hh oh]*4 hh(7,16)>")  // Different hi-hat patterns each cycle

// Chord progressions
chord("<C^7 Dm7 G7 C^7>").voicing()  // Jazz progression over 4 cycles

// Melodic development
n("<[0 2 4] 7> <7 4 [2 0]> <0 [4 7] 9 12> <12 [9 7 4] 0>")
  .scale("E:phrygian")  // Melodic development: ascending, descending, jumping, returning

// Build complexity over time
s("<bd*4!3 bd(5,8) bd*4!2 bd(7,16)>")  // Gradually complexify kick pattern

**Pro tip:** Use euclidean rhythms with alternation for natural groove evolution:
s("<bd(3,8) bd(5,8) bd(7,16)>")  // Pattern complexity increases over cycles

### Temporal Effects

**Fast and slow:**
sound("bd sd").fast(2)        // Double speed
sound("bd sd").slow(2)        // Half speed
sound("bd sd").fast("<1 2>")  // Pattern the speed

**Reverse (rev):**
n("[0 2] [3 ~] [4 5 4] ~ 7 9").scale("A:minor").rev() // Play backwards with rhythm

**Palindrome:**
note("[g bb d4]@2 g4 [f d4 bb]").palindrome()  // Forward then backward

**Iterate (rotate pattern):**
note("e ~ [g a b] [d4 e4]").iter(4)       // Rotate starting position
note("e ~ [g a b] [d4 e4]").iterBack(4)    // Rotate backwards

^ works quite well with .rev() for cool solo patterns

**Early/Late (shift timing):**
s("bd sd").early(0.125)  // Shift earlier by 1/8 cycle
s("bd sd").late(0.125)   // Shift later by 1/8 cycle
s("hh*8").late(rand.range(0, 0.02))  // Human feel

**Swing:**
note("d f a d4 c4 a").swing(0.5)     // 50% swing
note("[bb d4] f4 ~ [g f4 d4]").swingBy(0.3, 0.6)  // 30% probability, 60% amount

**Temporal zooming:**
note("a c# ~ e a4 ~ g!2").inside(2, rev)  // Apply rev at 2x speed
note("[c d e g] b ~ [d4 e4] c4 ~").outside(2, rev) // Apply rev at 1/2x speed

**Time compression:**
note("f [ab c4 f4] ~ eb ~ c4 ~@2").compress(0, 0.5)   // Squeeze into first half
note("f [ab c4 f4] ~ eb ~ c4").zoom(0.25, 0.75)   // Focus on middle section
note("[bb d4] f4 ~ bb4 [ab f4 d4]").linger(0.25)       // Stay on first quarter

**Add gaps:**
note("g bb ~ d4 ~ [f eb d4] g ~").fastGap(2)  // 2x speed with gaps

### Stepwise Functions

Stepwise patterning works with steps (events) rather than cycles, enabling more musical control.

**Concatenate patterns by steps (not cycles):**
stepcat(
  note("[d f] a ~ d4"),
  note("g [bb d4] ~ f")
).s("piano")

**Alternate patterns by steps:**
stepalt(
  note("e ~ [g b]"),  
  note("[a c#4] ~ e4")
).s("piano")

**Control step density:**
note("d [f a] ~ c4").expand(2)      // Expand to 2x steps
note("a ~ [c# e] a4 g").contract(2)    // Contract to 1/2 steps
note("g ~ bb d4 [f eb]").pace(8)        // Set to 8 steps per cycle

**Take/drop steps:**
note("e g [a b] ~ d4 e4").take(3)    // First 3 steps
note("d ~ f [a c4] d4").drop(2)    // Skip first 2 steps

**Polymetric patterns:**
polymeter([note("d f a"), note("g bb")], [note("d4 f4")])  // Multiple patterns with different lengths cycling together

**Extend/shrink/grow:**
note("[g bb] d4 ~ f").extend(0.5)  // Extend pattern
note("e ~ [g b] e4").shrink(4)    // Shrink pattern
note("d [f a] ~ c4").grow(4)      // Grow pattern

### Value Modifiers

**🚨 CRITICAL: Control Patterns vs Raw Strings**

Understanding when arithmetic works is essential:

**Control patterns** (arithmetic FAILS on these):
- \`n("0 2 4")\` - n() creates control patterns immediately
- \`note("c e g")\` - note() creates control patterns immediately
- \`n("0 2 4").scale("C:minor")\` - already a control pattern

**Raw strings** (arithmetic WORKS on these):
- \`"0 2 4"\` - just a string, not yet a pattern
- \`"c e g"\` - just a string

**✅ Raw string patterns - arithmetic works, then convert:**
\`\`\`js
"[0 2 4 7]".scale("C:minor").note().s("piano")  // ✅ Raw string needs .note()
"0 2 4".add(7).scale("D:minor").note().s("piano")  // ✅ Arithmetic → scale → note
\`\`\`

**✅ n() patterns - NO arithmetic, NO .note() after .scale():**
\`\`\`js
n("[0 2 4 7]").scale("C:minor").s("piano")  // ✅ n() creates control patterns
\`\`\`

**❌ WRONG - Arithmetic on n() or note():**
\`\`\`js
n("0 2 4").add(7).scale("D:minor")  // ❌ ERROR - can't do arithmetic on n()!
n("[0 2 4 7]").scale("C:minor").note()  // ❌ ERROR - n().scale() already made notes!
note("c e g").add(7)  // ❌ ERROR - can't do arithmetic on note()!
\`\`\`

**✅ Use .trans() for transposing control patterns:**
\`\`\`js
n("0 2 4").scale("C:minor").trans(12).s("piano")  // ✅ .trans() works on control patterns!
note("c e g").trans(7).s("piano")  // ✅ .trans() works!
\`\`\`

**⚠️ .trans() does NOT work inside superimpose callbacks!** Use \`layer()\` instead:
\`\`\`js
// ❌ WRONG - superimpose with trans throws errors
n("0 2 4").scale("C:minor").superimpose(x=>x.trans(12))  // ERROR!

// ✅ CORRECT - use layer() for octave/harmony layering
n("0 2 4").scale("C:minor").layer(
  x => x.s("piano"),
  x => x.trans(12).s("piano").gain(0.5)
)
\`\`\`

**Why:** \`n()\` and \`note()\` create **control patterns**. Arithmetic (.add, .mul, .sub, .div) only works on raw strings. Use \`.trans()\` on the main pattern chain, but use \`layer()\` for harmony/layering.

---

**Add (raw strings only):**
"d f a d4".add("<0 2 4>").note()  // Transpose by pattern (raw string)
"[0 2] ~ 4 7 ~ [4 2 0]".add("<0 3 7 5>").scale("G:mixolydian").note()  // Raw string → add → scale → note
// ⚠️ n().add() does NOT work - use raw strings or .trans() instead!

**Trans (transpose semitones) - WORKS ON CONTROL PATTERNS:**
This is the way to transpose n() and note() patterns!
⚠️ **Note:** \`trans()\` only accepts **integers** (whole semitones). For fractional detuning, use \`.add(note("0,0.05"))\` instead.

note("c3 e3 g3 c4").trans(12)   // Shift up one octave
note("c4 e4 g4").trans(-12)    // Drop down one octave
note("c3 d3 e3").trans(7)      // Shift up a perfect fifth
note("a4 b4 c5").trans("<0 -2 -4>")  // Pattern the transposition
n("0 2 4").scale("C:minor").trans(12)  // ✅ .trans() works on n().scale()!

// ✅ Use layer() for octave/harmony layering
note("c3 e3 g3").layer(
  x => x.s("piano"),
  x => x.trans(12).s("piano").gain(0.5)  // Octave up
)

// ✅ Fifth harmony with layer()
n("0 2 4").scale("C:minor").layer(
  x => x.s("piano"),
  x => x.trans(7).s("piano").gain(0.6)  // Fifth up
)

**Multiply, subtract, divide (raw strings only):**
"1 2 3".mul(2).scale("D:minor").note()      // Raw string - multiply scale degrees, then .note()
// ⚠️ n().mul() does NOT work - use raw strings instead!
"1000 2000 3000".div(5).freq()   // divide frequencies by 5
"100 200 300".mul(2).freq()   // multiply frequencies by 2
"10 20 30".div(2).scale("E:minor").note()   // Divide scale degrees (confusing and very rare)

### Layering and Accumulation

**Layer (recommended for harmony/layering):**
Use \`layer()\` to play multiple transformed versions of a pattern. This is the reliable way to create harmonies and octave layers.

// ✅ Layer with transposition for harmonies
n("0 2 4 7").scale("C:minor").layer(
  x => x.s("piano"),
  x => x.trans(12).s("piano").gain(0.5)  // Octave up
)

// ✅ Multiple harmony layers
n("[0 2] ~ 4 7 ~ [4 2]").scale("E:minor").layer(
  x => x.s("square"),
  x => x.trans(3).s("square").gain(0.6),  // Third up
  x => x.trans(7).s("square").gain(0.4)   // Fifth up
).lpf(1500)

// ✅ Detuning for chorus/width effect (use .add() - trans() only takes integers!)
note("c3 e3 g3").add(note("0,0.05")).s("sawtooth").lpf(800)  // Slight detune with add

// ✅ Power chords using add (adds the fifth - 7 semitones up)
note("c3 e3 g3").add(note("0,7")).s("sawtooth").lpf(800)

**Superimpose with raw strings (works):**
\`\`\`js
// ✅ superimpose(x=>x.add()) works on RAW STRINGS (before .note() or .n())
"<0 2 4 6 ~ 4 ~ 2 0!3 ~!5>*8"
  .superimpose(x=>x.add(2))  // Add harmony (thirds)
  .scale('C:minor').note()

"c2 eb2 g2 bb2"
  .superimpose(x=>x.add(0.05))  // Detune for chorus
  .s("sawtooth")
\`\`\`

**⚠️ superimpose with .trans() does NOT work on control patterns:**
\`\`\`js
// ❌ These throw errors - control patterns (n() or note()) can't use superimpose with trans()
n("0 2 4").scale("C:minor").superimpose(x=>x.trans(12))   // ERROR!
note("c e g").superimpose(x=>x.trans(7))  // ERROR!
\`\`\`

**Superimpose works for non-pitch transformations:**
// ✅ Time/effect transformations work
s("bd sd hh oh").superimpose(x => x.fast(2).gain(0.3))
s("cp").superimpose(x => x.delay(0.5))

**Echo (delay with feedback):**
Creates echoes of the pattern at a given time interval.

note("d [f a] ~ d4 c4").echo(4, 1/8, 0.50)  // 4 echoes, 1/8 cycle apart, 50% gain each

**EchoWith (delay with custom transformation):**
Like echo, but applies a transformation to each echo.

note("b [f a] ~ [d4 c4]").echo(4, 1/8, 0.50)  // Each echo goes up 3 semitones

**Practical examples:**
s("cp").echo(4, 1/16, 0.6)  // Clap with trailing echoes
"e4 ~ [g4 b4] e5".echoWith(2, 1/4, x=>x.add(7).gain(0.5)).note()  // Melodic delay up a fifth (raw string allows arithmetic)

### Copy and Offset

**Off (copy and transform):**
"[0 2] 4 ~ 7".off(1/16, x=>x.add(7)).scale("D:minor").note()  // Raw string: needs .note()
// ⚠️ n() with .off(x=>x.add()) does NOT work - use raw strings instead

Can nest for complex patterns:
s("bd sd").off(2/16, x=>x.speed(1.5)
  .off(3/16, y=>y.vowel("a e i o")))

**Ply (repeat each event):**
sound("bd sd").ply(2)         // Each sound plays twice
sound("bd sd").ply("<1 2 3>") // Pattern the repetition

### Conditional Transformations

Conditional transformations are powerful for adding variation and building arrangements.

**Every (apply transformation periodically):**
sound("bd sd").every(4, rev)         // Reverse every 4th cycle
sound("bd sd").every(4, fast(2))     // Speed up every 4th cycle
sound("bd sd").every(3, x => x.stut(4, 0.5, 0.125))  // Stutter every 3rd

**Musical uses of every:**
// Add fill every 4 bars (typical drum pattern)
s("bd ~ sd ~, hh*8").every(4, x => x.fast(2))

// Variation every 8 cycles
n("[0 2] ~ [4 7] 9 ~ [7 4]").scale("E:minor").every(8, rev)

// Build intensity
note("c2*4").s("sawtooth").lpf(400)
  .every(2, x => x.lpf(800))  // Open filter every other cycle

**First/Last of:**
sound("bd sd").firstOf(4, rev)    // Only on first of every 4 cycles
sound("bd sd").lastOf(4, fast(2))  // Only on last of every 4 cycles

**When (custom condition):**
sound("bd sd").when(x => x % 2 == 0, rev)  // Reverse on even cycles

**Sometimes family (probabilistic variation):**
sound("bd sd").sometimes(rev)      // 50% chance of reversing
sound("bd sd").often(rev)          // 75% chance
sound("bd sd").rarely(rev)         // 25% chance
sound("bd sd").almostAlways(rev)   // 90% chance
sound("bd sd").almostNever(rev)    // 10% chance
sound("bd sd").always(rev)         // 100% chance (same as just rev)
sound("bd sd").never(rev)          // 0% chance (no effect)

**Musical uses of sometimes:**
// Add occasional fills - works with sound patterns
s("bd*4").sometimes(x => x.ply(2))  // Sometimes double-hit kicks

// Add interest to hi-hats (REALLY GOOD EFFECT!)
s("hh*8").often(x => x.gain(0.3))  // Often play quieter
  .rarely(x => x.speed(2))  // Rarely play double-speed

// Complex variation with sound
s("bd ~ sd ~, hh*8")
  .sometimes(x => x.fast(2))  // Sometimes double-time
  .rarely(rev)  // Rarely reverse

**SometimesBy (custom probability):**
sound("bd sd").sometimesBy(0.3, rev)  // 30% chance
s("hh*8").sometimesBy(0.2, x => x.speed(2))  // 20% chance of double-speed

**Per cycle variations:**
s("bd sd").someCyclesBy(0.3, rev)  // 30% of cycles (whole cycle affected)
s("bd sd").someCycles(rev)         // 50% of cycles

### Structural Transformations

**Chunk:**
"[0 2 4] ~ 7 [9 7 4]".chunk(4, x=>x.add(7)).scale("D:minor").note()  // Raw string needs .note()
// ⚠️ n() with .chunk(x=>x.add()) does NOT work - use raw strings instead
"0 [2 4] ~ 6 [7 6]".chunkBack(4, x=>x.add(7)).scale("A:minor").note()  // Raw string needs .note()

**Degradation:** (RARELY used)
sound("bd sd hh cp").degrade()          // Randomly remove events (50%)
sound("bd sd hh cp").degradeBy(0.3)     // 30% chance to remove each

**Undegradation (add events):**
note("f# a d g").undegradeBy(0.3)  // 30% chance to ADD event
note("f# a d g [a g d] f#@2 ~").undegrade()    // 50% chance to ADD

**Stutter:**
sound("bd cp").stut(4, .5, .125)  // 4 repeats, 50% gain decay, 1/8 time apart

**Struct (apply rhythm structure):**
note("[g bb] c4 ~ d4 [f4 g4] ~").struct("x ~ x ~")  // Apply structure from pattern
chord("C^7").struct("[~ x]*2").voicing()  // Chords on offbeats

**Mask:**
note("e g [a b] ~ d4 e4").mask("t f t t")  // Boolean mask (t=true, f=false)

**Euclid (as function):** (super useful to add rhythm!)
s("bd").euclid(3, 8)      // 3 beats over 8 steps
s("bd").euclidRot(3, 8, 2) // With rotation/offset

### Pattern Structure

**Cat (concatenate):**
cat(
  note("d ~ [f a] d4"),
  note("[g bb] d4 ~ f")
).sound("piano")  // Play first, then second

**Stack (parallel):**
stack(
  sound("bd*4"),
  sound("hh*8"),
  note("a ~ [c# e] a4 g").sound("piano")
)  // Play all at once

**Layer:**
note("a [c# e a4] ~ [g e c#]").layer(
  x => x.s("sawtooth"),
  x => x.transpose(12).s("square")
)  // Layer multiple transformations

### Random Selectors

**Best approach - use irand for random notes:**
n(irand(10)).segment(8).scale("D:dorian")  // Random scale notes (0-9)
n(irand(12)).segment(16)  // Random chromatic notes (0-11)

**chooseCycles - pick one pattern per cycle:**
chooseCycles("bd", "hh", "sd").s().fast(8)  // Random drum each cycle
s("bd | hh | sd").fast(8)  // Same using | syntax

**choose - rarely needed (modulates parameters):**
note("c2 g2 d2 f1").s(choose("sine", "triangle", "square"))  // Random synth per note

**Weighted variants:**
wchooseCycles(["bd", 10], ["hh", 1], ["sd", 1]).s().fast(8)  // Weighted selection per cycle

### Advanced Pattern Selection

These functions are advanced and rarely needed. Most patterns can be created more simply with mini-notation.

**pick - select from patterns by index/name:**
s("<0 1 [0,1] 1>".pick(["bd(3,8)", "sd sd"]))  // Pick patterns by index
s("<a b [a,b]>".pick({a: "bd(3,8)", b: "sd sd"}))  // Pick by name

**inhabit - similar to pick but squeezes cycles:**
s("a@2 [a b] a".inhabit({a: "bd(3,8)", b: "sd sd"})).slow(4)

### Arpeggiation

**Note:** \`.arp()\` selects indices from stacked notes - it's for advanced cases. For melodic patterns, use sequential notes or voicings instead:

// For melodies, skip arp:
n("[0 2] ~ [4 7] 9 ~ [7 4]").scale("E:minor")  // Sequential notes
n("0 1 2 3").chord("Cm").mode("above:c3").voicing()  // Chord voicings

// arp() selects indices from stacked notes:
note("[a,c#,e,g]").arp("0 1 2 3")  // Am7 chord - selects index 0, 1, 2, then 3 from chord
note("[d,f#,a,c4]").arp("0 [0,2] 1")  // Advanced index selection

### Binary Pattern Inversion

**.invert() / .inv() - swaps 1s and 0s (true/false) in binary patterns:**
s("bd").struct("1 0 0 1 0 0 1 0".lastOf(4, invert))  // Inverts rhythm on 4th cycle

**Note:** This is for structural/rhythmic patterns, NOT for melodic inversion

### Control Functions

**Reset/Restart:**
s("bd sd").reset()    // Reset pattern
s("bd sd").restart()  // Restart pattern

**Hush:**
s("bd sd").hush()  // Mute this pattern
hush()             // Mute everything

### Pattern Complexity Techniques

**Layer Multiple Patterns:**
Use \`$:\` for multiple simultaneous patterns:

$: s("bd*4").bank("RolandTR909")     // Drums
$: note("d2 ~ [d2 f2] ~ [a2 d2] ~ f2 ~").s("sawtooth").lpf(400)  // Bass
$: n("0 2 4 6 ~ 7 9 7").scale("D:minor").s("piano")  // Melody
$: s("white*8").hpf(8000).gain(0.3).decay(0.02)  // Hi-hats

**Add Variation Over Time:**
s("bd sd")
  .bank("<RolandTR808 RolandTR909>")  // Alternation
  .every(4, rev)                       // Every 4th cycle
  .sometimes(fast(2))                  // Sometimes faster
  .off(1/8, x=>x.gain(0.5))           // Echo effect

**Create Polyrhythms:**
stack(
  note("[d ~ [f a] ~ d4 c4]/2"),        // Over 2 cycles
  note("[[g bb] d4 f]/3"),          // Over 3 cycles
  s("bd(3,8)"),           // Euclidean 3 in 8
  s("hh(5,8)")            // Euclidean 5 in 8
)

**Add Human Feel:**
note("a!2 ~ [c# e] a4 ~ g e")
  .velocity(rand.range(0.6, 1))      // Random velocity
  .pan(rand.range(0.3, 0.7))         // Random panning
  .late(rand.range(0, 0.02))         // Slight timing variations
  .degradeBy(0.1)                    // Occasional missed notes

### Pattern Transformation Reference

#### Temporal Modifiers

| Function | Description | Example |
|----------|-------------|---------|
| \`fast()\` | Speed up | \`.fast(2)\` |
| \`slow()\` | Slow down | \`.slow(2)\` |
| \`rev()\` | Reverse | \`.rev()\` |
| \`palindrome()\` | Forward then backward | \`.palindrome()\` |
| \`iter()\` | Rotate pattern | \`.iter(4)\` |
| \`early()\` | Shift earlier | \`.early(0.125)\` |
| \`late()\` | Shift later | \`.late(0.125)\` |
| \`swing()\` | Add swing | \`.swing(0.5)\` |
| \`inside()\` | Apply function faster | \`.inside(2, rev)\` |
| \`outside()\` | Apply function slower | \`.outside(2, rev)\` |
| \`compress()\` | Squeeze into time | \`.compress(0, 0.5)\` |
| \`zoom()\` | Focus on section | \`.zoom(0.25, 0.75)\` |
| \`linger()\` | Stay on portion | \`.linger(0.25)\` |

#### Structural Modifiers

| Function | Description | Example |
|----------|-------------|---------|
| \`struct()\` | Apply structure | \`.struct("x ~ x ~")\` |
| \`mask()\` | Boolean mask | \`.mask("t f t t")\` |
| \`euclid()\` | Euclidean rhythm | \`.euclid(3, 8)\` |
| \`off()\` | Copy and offset | \`.off(1/8, x=>x.add(7))\` |
| \`ply()\` | Repeat each event | \`.ply(2)\` |
| \`chunk()\` | Apply to chunks | \`.chunk(4, fn)\` |
| \`degrade()\` | Remove events (50%) | \`.degrade()\` |
| \`degradeBy()\` | Remove events (n%) | \`.degradeBy(0.3)\` |
| \`undegrade()\` | Add events (50%) | \`.undegrade()\` |
| \`undegradeBy()\` | Add events (n%) | \`.undegradeBy(0.3)\` |
| \`layer()\` | Layer transformations | \`.layer(fn1, fn2)\` |
| \`pick()\` | Pick from patterns | \`"<a b>".pick({a:"bd", b:"sd"})\` |
| \`invert()/inv()\` | Swap 1s/0s | \`"1 0 1 0".invert()\` |

#### Value Modifiers

| Function | Description | Example |
|----------|-------------|---------|
| \`add()\` | Add value (RAW STRINGS ONLY) | \`"0 2 4".add(2)\` |
| \`sub()\` | Subtract (RAW STRINGS ONLY) | \`"3 5 7".sub(1)\` |
| \`mul()\` | Multiply (RAW STRINGS ONLY) | \`"1 2 3".mul(2)\` |
| \`div()\` | Divide (RAW STRINGS ONLY) | \`"4 8 12".div(2)\` |
| \`trans()\` | Transpose semitones (WORKS ON ALL) | \`.trans(-12)\` (down octave) |
| \`layer()\` | Layer with transformation | \`.layer(x=>x.s("a"), x=>x.trans(7).s("a"))\` |
| \`echo()\` | Delay with feedback | \`.echo(4, 1/8, 0.5)\` |
| \`echoWith()\` | Delay with transform | \`.echoWith(3, 1/8, x=>x.trans(3))\` |

#### Conditional Modifiers

| Function | Description | Example |
|----------|-------------|---------|
| \`every()\` | Apply every N cycles | \`.every(4, rev)\` |
| \`firstOf()\` | First of N cycles | \`.firstOf(4, rev)\` |
| \`lastOf()\` | Last of N cycles | \`.lastOf(4, rev)\` |
| \`when()\` | Custom condition | \`.when(x => x % 2 == 0, rev)\` |
| \`sometimes()\` | Apply randomly (50%) | \`.sometimes(fast(2))\` |
| \`often()\` | Apply often (75%) | \`.often(rev)\` |
| \`rarely()\` | Apply rarely (25%) | \`.rarely(rev)\` |
| \`almostAlways()\` | 90% chance | \`.almostAlways(rev)\` |
| \`almostNever()\` | 10% chance | \`.almostNever(rev)\` |
| \`sometimesBy()\` | Custom probability | \`.sometimesBy(0.3, rev)\` |

#### Pattern Constructors

| Function | Description | Example |
|----------|-------------|---------|
| \`stack()\` | Play patterns in parallel | \`stack(a, b)\` |
| \`cat()\` | Concatenate patterns | \`cat(a, b)\` |
| \`seq()\` | Create sequence | \`seq("d", ["f", "a"])\` |
| \`polymeter()\` | Polymetric pattern | \`polymeter([a,b], [x])\` |
`;


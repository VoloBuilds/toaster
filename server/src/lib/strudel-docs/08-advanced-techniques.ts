export const SECTION_ADVANCED_TECHNIQUES = `
## Advanced Techniques

### Multiple Patterns with \`$:\`

Play multiple patterns simultaneously:

$: sound("bd*4, ~ sd*2").bank("RolandTR909")
$: note("<[d f a] ~ [g bb d4] [a c4 e4]>").sound("piano")
$: n("[0 2] ~ 4 7 ~ [9 7]").scale("E:minor").sound("sawtooth").lpf(800)

**Mute patterns:**
_$: sound("bd*4")  // Underscore mutes the pattern ONLY when used with \$ (NOT n or s)

### Variables

Store patterns in variables for reuse:

const drums = sound("bd sd, hh*8").bank("RolandTR909")
const bass = note("d2 ~ [d2 f2] ~ [a2 d2] ~ f2 ~").sound("sawtooth").lpf(600)
const melody = n("[0 2] ~ [4 7] <6 9> ~ [7 4]").scale("D:minor").sound("piano")

stack(drums, bass, melody)

### Slicing Samples

**Chop:**
s("jazz:4").chop(8)  // Chop into 8 equal pieces and play in sequence
s("jazz:4").chop(16).rev()  // Chop and reverse

**Slice:**
s("jazz:4").slice(8, "0 1 2 3 4 5 6 7")  // Slice and trigger specific pieces
s("jazz:4").slice(8, "0 1 <2 2*2> 3")    // Pattern the slices
s("jazz:4").slice(8, "<0 [1 4] <2 6> 3 5 [7 0] 6 <5 1>>")  // Complex patterns

**Striate (granular):**
s("numbers:0 numbers:1").striate(6)  // Granular effect

**Looping:**
s("space:2").loopAt(2)  // Loop sample to fit 2 cycles

### Sampling Controls

**Begin/End:**
s("space:2").begin("<0 .25 .5 .75>")  // Start position (0-1)
s("space:2").end(.5)                   // End position (0-1)
s("space:2").begin(0.25).end(0.75)    // Play middle section

**Loop:**
s("space:2").loop(1)  // Loop the sample
s("space:2").loop(1).clip(1)  // Loop and clip to event duration

**Speed:**
sound("bd").speed("<1 2 -1>")  // Normal, 2x speed, backwards
s("jazz:2").speed(sine.range(0.5, 2).slow(4)).segment(16)  // Modulated speed

### Euclidean Rhythm Tips (SUPER GOOD!)

s("bd(3,8)")       // Basic 3 hits in 8 steps (Pop Clave)
s("bd(5,8)")       // 5 hits in 8 (common house pattern)
s("bd(3,8,2)")     // Offset by 2 positions

**Combine with other patterns:**
stack(
  s("bd(5,8)"),           // Kick pattern
  s("hh(7,8)"),           // Hi-hat pattern
  s("~ cp ~ cp")          // Backbeat
).bank("RolandTR909")

**Use with chords:** (note the *struct()* method for applying euclidean rhythms to chords)
chord("<C^7 Dm7 G7 C^7>")
  .dict('ireal').voicing().struct("x(3,8)").s("piano")

### Ribbon (Glitch Time)

note("d [f a] g# [g d4 c4]").ribbon(1, 2)  // Loop starting at cycle 1 for 2 cycles
s("bd!16?").ribbon(29, 0.5)  // Rhythm generator (glitchy feel)

### Tour (Advanced)

"[d f]".tour("a", "a c4", "c4 a f d").note().s("piano").pace(8)  // Builds up patterns stepwise

### Zip (Advanced)

zip("d f", "a c4", "[d f a] c4").note().s("piano").pace(8)  // Zips patterns together

### Cut Groups

Stop previous sounds in the same cut group:

s("hh*16").cut(1)  // All hh sounds share cut group 1
s("oh(3,8)").cut(1)  // Open hi-hat cuts closed hi-hat

### Fit & Scrub (Advanced Sample Playback)

s("jazz:4").fit().scrub(irand(16).div(16).segment(8))  // Random sample scrubbing

### Splice

s("jazz:4").splice(8, "0 1 2 3")  // Splice and trigger specific slices

### Utility Functions

| Function | Description | Example |
|----------|-------------|---------|
| \`setcpm()\` | Set cycles per minute | \`setcpm(120)\` |
| \`hush()\` | Stop all sounds | \`hush()\` |
| \`choose()\` | Random choice (modulate params) | \`note("c e").s(choose("sine", "square"))\` |
| \`wchoose()\` | Weighted choice | \`wchoose(["a", "b"], [3, 1])\` |
| \`chooseCycles()\` | Pick pattern per cycle | \`chooseCycles("bd", "hh").s()\` |
| \`setVoicingRange()\` | Set chord voice range | \`setVoicingRange('lefthand', ['c3','a4'])\` |
| \`piano()\` | Shorthand for piano | \`.piano()\` |
`;


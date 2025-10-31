export const SECTION_MINI_NOTATION = `
## Mini-Notation Syntax

The Mini-Notation is Strudel's rhythm language - a compact way to express patterns using special symbols.

### Sequences (Space Separated)

sound("bd hh sd hh")  // Four sounds evenly spaced in one cycle

Adding more sounds speeds them up (they're squished into the same cycle):

sound("bd bd hh bd rim bd hh bd")  // Eight sounds in one cycle

### Rests

Use \`~\` (tilde) to create silence:

s("bd hh ~ rim")  // Rest on the third step
s("bd ~ sd ~")    // Rests on beats 2 and 4


### Sub-Sequences \`[brackets]\`

Brackets create subdivisions within a step:

sound("bd [hh hh] sd [hh bd]")  // The bracketed sounds share one step

You can nest as deep as you want:

sound("bd [[rim rim] hh] bd cp")

### Angle Brackets \`<alternation>\`

Play one element per cycle (like a sequencer):

s("<bd hh rim oh>")  // One sound per cycle, alternating

This alternates through the values over multiple cycles. The above is the same as:

s("[bd hh rim oh]/4")

You can speed them up with multiplication:

s("<bd hh rim oh>*8")  // 8 notes per cycle, cycling through the sounds

### Multiplication \`*\`

Speed up patterns:

s("bd hh*2 rim hh*3")  // Different speeds for different sounds

The multiplication by 2 means the pattern will play twice as fast:

note("[e5 b4 d5 c5]*2")  // Plays twice per cycle

Multiplications can also be decimal:

note("[e5 b4 d5 c5]*2.75")

### Division \`/\`

Slow down patterns:

note("[g [a bb] ~ c4 [d c4] ~ eb d ~ c4 bb a]/2")  // Play over 2 cycles with passing tones

The division by 2 means the sequence will be played over the course of 2 cycles. You can also use decimal numbers:

note("[e5 b4 d5 c5]/2.75")

### Elongation \`@\`

Give an element more time weight:

note("d@3 [f a] ~ c4")  // d is 3 units long, [f a] is 1 unit (D minor)
note("<[d,f#,a,c4]@2 [g,bb,d4,f4] [a,c#4,e4,g4]>*2")  // Extended chords with elongation

The default weight is 1.

### Replication \`!\`

Repeat without speeding up:

note("a!3 [c# e] ~ g")  // Same as "a a a [c# e] ~ g" (A dorian)
note("<[e,g#,b,d4]!2 [a,c#4,e4,g4] [b,d#4,f#4,a4]>*2")  // Extended chords with replication

### Parallel/Polyphony \`,\`

Play multiple patterns simultaneously:

s("bd sd, hh hh hh")  // Kick/snare and hi-hats together
note("[d,f#,a,c4]")     // Dm7 chord - notes play simultaneously (notice commas)
note("[g,bb,d4,f4]")    // Gm7 chord - all notes together
note("[d f# a d4]")     // NOT a chord - notes play one-by-one (notice spaces)

To play multiple chords in a sequence, wrap them in brackets:

note("<[d,f#,a,c4,e4] [g,bb,d4,f4,a4] [a,c#4,e4,g4] [e,g#,b,d4,f#4]>*2")  // Extended chord progression

### Euclidean Rhythms \`(beats, segments, offset)\`

Distribute beats evenly over segments:

s("bd(3,8)")      // 3 beats distributed over 8 steps
s("bd(3,8,2)")    // Same, but starting from position 2

Common patterns:
s("bd(3,8)")      // Pop Clave rhythm
s("bd(5,8)")      // Classic house kick pattern

### Sample Selection \`:\`

Select specific samples from a sound set:

s("casio:1")         // Select sample 1
s("hh:0 hh:1 hh:2")  // Cycle through different samples

Numbers start from 0. Numbers that are too high will wrap around.

### Randomness in Mini-Notation

**Random removal \`?\`:**
Events with a "?" have a 50% chance of being removed:

s("bd*8?")  // Each bd has 50% chance to play

With a number (0-1), control the probability:

s("bd*8?0.3")  // Each bd has 30% chance to be removed (70% to play)

**Random choice \`|\`:**
Choose randomly between options:

s("bd | sd | rim")  // Randomly pick one each cycle

### Mini-Notation Summary Table

| Concept | Syntax | Example |
|---------|--------|---------|
| Sequence | space | \`s("bd sd hh")\` |
| Rest | \`~\` or \`_\` | \`s("bd ~ sd ~")\` |
| Sub-sequence | \`[]\` | \`s("bd [hh hh]")\` |
| Alternate | \`<>\` | \`s("<bd sd>")\` |
| Speed up | \`*\` | \`s("bd*2")\` |
| Slow down | \`/\` | \`note("[d f a]/2")\` |
| Elongate | \`@\` | \`note("d@3 f")\` |
| Replicate | \`!\` | \`note("a!2 c#")\` |
| Parallel | \`,\` | \`s("bd, hh*4")\` |
| Euclidean | \`()\` | \`s("bd(3,8)")\` |
| Sample | \`:\` | \`s("jazz:2")\` |
| Random remove | \`?\` | \`s("bd*8?")\` |
| Random choice | \`|\` | \`s("bd | sd")\` |

### Drum Programming Tips

Key principles for creating groovy patterns:

**Euclidean Rhythms for Natural Groove:**
s("bd(3,8)")     // 3 kicks over 8 steps - automatic syncopation
s("bd(5,8)")     // 5 kicks over 8 steps - classic house groove
s("hh(7,16)")    // 7 hats over 16 steps - non-mechanical feel

**Pattern Variation with \`<>\` and \`!\`:**
s("bd ~ <bd [bd bd]> sd")              // Alternate every cycle
s("<[bd ~ bd ~]!3 [bd [bd bd] bd ~]>")     // 3 bars steady, 1 bar fill

**Humanization:**
s("hh*16?0.7")    // Random removal for organic feel
s("hh(7,16)")     // Euclidean instead of perfect 16ths

**Layering:**
- \`[a b]\` = subdivide one step (two sounds squeezed into one beat)
- \`[a,b]\` = layer sounds together (play simultaneously)
- \`a, b\` = separate parallel patterns

**Space = Groove:**
Sparse patterns groove better than dense ones. \`bd ~ ~ sd ~ bd ~ sd\` beats \`bd*4\` every time

### Advanced Mini-Notation Patterns

**Euclidean Rhythms (Highly Recommended):**
s("bd(3,8)")  // 3 kicks over 8 steps - creates natural syncopation
s("bd(5,8), hh(7,16)")  // Layered euclidean patterns - instant groove
s("bd(3,8), ~ sd ~ sd, hh(11,16)")  // Complex polyrhythmic pattern

**Rhythmic Variation with Brackets:**
s("bd [~ bd] sd ~")  // Subdivision creates off-beat kick
s("bd ~ [sd sd] ~")  // Double snare hit in third position
s("bd*2 [~ sd] hh [bd sd]")  // Mixed subdivisions for interest

**Alternation for Variation:**
s("<[bd ~ sd ~] [bd [bd bd] sd ~]>")  // Alternates between two different beat patterns
s("hh*8, <~ cp ~ ~>")  // Hi-hats constant, clap appears every 4 cycles
note("<[d ~ f [a4 d5]] [g d4@2 g4] [a e b a4]>*2")  // Arpeggios with rhythmic variation

**Weighted and Replicated Patterns:**
note("a@2 [c# e] ~ g")  // a note is 2x longer (A dorian)
s("<[bd ~ sd ~]!3 [[bd bd] ~ sd ~]>")  // Pattern holds for 3 cycles before changing

**Polyrhythmic Patterns:**
s("bd*3, sd*5, hh*7")  // 3 against 5 against 7
note("[e g# b e4]*3, [a e4]*5")  // Melodic polyrhythm (E minor arpeggios, wider intervals)

**Call and Response:**
s("<bd*4 ~ ~ ~>")  // Kick for one cycle, silence for three
note("<[bb d f bb4] ~!3 [eb g bb4 <d5 f5>] ~!3>")  // Sparse arpeggios alternate with long rests
`;


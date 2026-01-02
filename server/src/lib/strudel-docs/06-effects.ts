export const SECTION_EFFECTS = `
## Effects

### Signal Chain & Continuous Effects

**Important:** Effects in Strudel are **event-triggered**, not continuous by default. This means:

// This WON'T smoothly modulate (only changes when event occurs)
s("sawtooth").lpf(sine.range(100, 2000).slow(2))

// This WILL smoothly modulate (creates more events to sample the LFO)
s("sawtooth").segment(16).lpf(sine.range(100, 2000).slow(2))

**Effects that ARE continuous:**
- ADSR envelopes (attack, decay, sustain, release)
- Filter envelopes (lpenv, hpenv, bpenv)
- Pitch envelopes (penv)
- FM envelopes (fmenv)
- Tremolo
- Phaser
- Vibrato
- Ducking

**Use \`.segment(n)\` for smooth modulation on non-continuous effects!**

### Filters

Filters are essential for shaping sound. Strudel has three main filter types:

**Low-pass filter (lpf):**
Cuts off high frequencies above the cutoff frequency.

note("<f c b2 a#2> [ab c4] ~ f4 ~ [eb c4]").s("sawtooth").lpf(800)   // Muffled (door closed) - F minor
note("e [g b] ~ e4 ~ [d4 b] a g").s("sawtooth").lpf(5000)  // Bright (door open) - E minor

**High-pass filter (hpf):**
Cuts off low frequencies below the cutoff frequency.

note("d ~ f a ~ d4@2 c4").s("sawtooth").hpf(1000)  // D minor
s("white*8").hpf(8000).decay(.04).sustain(0)  // Crispy hi-hat

**Band-pass filter (bpf):**
Only allows a frequency band to pass.

note("a ~ c# ~ e a4 ~ g").s("sawtooth").bpf(1000)  // A dorian
s("white*4").bpf(sine.range(400, 4000).slow(4)).segment(16)

**Filter resonance (q-value):**
note("~ g ~ g4 ~ [f d4] ~ bb").s("sawtooth").lpf(800).lpq(10)  // High resonance - G minor
note("e!2 c g a").s("sawtooth").hpf(2000).hpq(5)  // High-pass with resonance - E minor
note("a c# [e a4]@2 g e ~ c#").s("sawtooth").bpf(1000).bpq(20) // Band-pass with resonance - A dorian

**Filter type:**
note("d!3 f a d4 [c4 bb] a").s("sawtooth").lpf(800).ftype('24db')  // Steeper slope - D minor

**Pattern filters:**
note("f ab ~ c4 eb ~ eb c4").s("sawtooth").lpf("200 1000 200 1000")  // F minor
note("e g b ~ e4 <d4 c4 b> a g").s("sawtooth").lpf(saw.range(200, 2000)).segment(16)  // E minor

**Vowel filter:**
note("a ~ c# e a4 [g e] c# ~").s("sawtooth").vowel("<a e i o u>")  // A dorian
s("bd sd").vowel("<a e i o>")

### Filter Envelopes

Add movement to filters with dedicated envelopes:

note("<g f bb c> ~ d4 [eb d4 c4]").s("sawtooth") 
  .lpf(1000)
  .lpenv(4)        // Envelope depth for filter (adds to lpf value)
  .lpattack(0.01)  // Filter attack
  .lpdecay(.1)     // Filter decay
  .lpsustain(.3)   // Filter sustain level
  .lprelease(.2)   // Filter release

**Short forms (easier to type):**
note("[d g] ~ ~ [f a d4] c4 ~ bb a").s("sawtooth")  // D minor
  .lpf(800)
  .lpa(0.01)  // lpattack
  .lpd(0.1)   // lpdecay  
  .lps(0.3)   // lpsustain
  .lpr(0.2)   // lprelease
  .lpe(4)     // lpenv (envelope depth)

**Available for all filter types:**
- Low-pass: \`lpa\`, \`lpd\`, \`lps\`, \`lpr\`, \`lpe\` (or \`lpattack\`, \`lpdecay\`, \`lpsustain\`, \`lprelease\`, \`lpenv\`)
- High-pass: \`hpa\`, \`hpd\`, \`hps\`, \`hpr\`, \`hpe\`
- Band-pass: \`bpa\`, \`bpd\`, \`bps\`, \`bpr\`, \`bpe\`

**Example:**
note("[c eb g <f bb>](3,8,<0 1>)".sub(12))
  .s("sawtooth")
  .lpf(sine.range(300,2000).slow(16))
  .lpa(0.005)
  .lpd(perlin.range(.02,.2))
  .lps(perlin.range(0,.5).slow(3))
  .lpq(sine.range(2,10).slow(32))
  .lpenv(perlin.range(1,8).slow(2))
  .ftype('24db')
  .segment(16)

### ADSR Envelope

Shape the volume envelope over time:

note("e g b e4@2 ~ [d4 c4 b] a").s("sawtooth")  // E minor
  .attack(.1)    // Fade in time
  .decay(.1)     // Decay to sustain time
  .sustain(.5)   // Sustain level (0-1)
  .release(.2)   // Fade out time

Short form:
note("a c# ~ e g@2 f e").s("sawtooth").adsr(".1:.1:.5:.2")  // A dorian

Or even shorter (quick staccato):
note("f ab c4 eb ~ ~ db c4 bb f# a b").decay(.15).sustain(0)  // Staccato notes
s("bd*4").decay(0.05).sustain(0)     // Tight kick

### Pitch Envelope

Control pitch with envelopes - great for drum sounds and swoops:

// Drum pitch drop
s("bd*4").penv(-4).pattack(0.001).pdecay(0.1)

// Synth swoops  
note("g bb d4 g4 f@2 eb d4").s("sine").penv(7).pattack(0.2)  // G minor

// Chiptune-style (SUPER COOL EFFECT)
n(run("<4 8>/16")).jux(rev)
  .chord("<Em7 D^7 C^7 C^7>>")
  .dict('ireal').voicing()
  .dec(.1).room(.2)
  .penv("<0 <2 -2>>").patt(.02)

**Pitch envelope parameters:**
.penv(2)        // Depth in semitones
.pattack(0.02)  // Pitch attack (also: patt)
.pdecay(0.1)    // Pitch decay
.prelease(0.1)  // Pitch release
.pcurve(-4)     // Envelope curve shape
.panchor(1)     // Anchor point for pitch bend

### Dynamics & Gain

**Gain (volume):**
s("hh*16").gain("[.25 1]*4")  // Dynamics!
s("bd sd").gain(.5)            // Quieter
s("bd*4").gain(sine.range(0.5, 1).slow(4)).segment(16)  // Pulsing

**Velocity:**
note("~ d ~ d4 ~ d5 ~ d").velocity(.5)  // Similar to gain - D octaves
note("e g b e4 ~ [d4 c4] b a").velocity(rand.range(0.6, 1))  // Human feel - E minor

**Compressor:**
s("bd sd hh oh").compressor(0.5)  // Compress dynamics

**Postgain:**
s("bd*4").postgain(1.5)  // Gain after effects chain

### Panning

**Pan (stereo position):**
s("bd rim sd cp").pan("0 .3 .6 1")  // 0=left, .5=center, 1=right
note("a c# e@2 a4 g e ~ d c#").pan(sine.range(0.2, 0.8).slow(4)).segment(16)  // Auto-pan - A dorian
note("d f ~ ~ a d4 c4 bb").pan(rand)  // Random panning - D minor

**Jux (split left/right):**
n("0 2 4 [2 0]").s("jazz").jux(rev)  // Left=normal, Right=reversed
note("e g b@2 d4 [b g] e4").s("sawtooth").juxBy(0.5, fast(2))  // Right channel plays twice as fast

### Waveshaping & Distortion

**Note:** These effects require AudioWorklet support and may not work in all browser implementations. If you encounter errors, these effects may not be available in your environment.

**Distortion:**
s("bd").distort(.8)  // Waveshaping distortion
note("<c#!4 ab!2 f!2> ab c4@2 ~ f4 eb c4 bb").s("sawtooth").distort(0.5).lpf(2000)

**Shape (alternative distortion):**
s("bd").shape(.5)  // Softer distortion

**Bit crusher:**
s("bd sd").crush("<16 8 4 2>")  // Reduce bit depth (lower = more crushed)
n(irand(7)).segment(16).scale("D:Dorian").crush(4).s("sawtooth")  // Lo-fi effect

**Sample rate reduction:**
s("bd sd").coarse("<48 24 12 6>")  // Reduce sample rate
note("e@2 d4 c4 b a").coarse(8).s("triangle")  // Digital lo-fi - E minor

### Speed & Pitch Shift

**Speed (affects both pitch and duration):**
s("bd rim").speed("<1 2 -1 -2>")  // 2x faster, or backwards (negative)
s("jazz:2").speed(rand.range(0.8, 1.2))  // Slight variation

### FM Synthesis

Add frequency modulation to any sound:

note("d <~ f4> <c c4> [bb a]").s("triangle")  // D minor
  .fm(2)          // FM harmonic ratio
  .fmi(10)        // FM intensity/index
  .fmh(1)         // FM harmonic multiplier
  .fmattack(0.01) // FM envelope attack
  .fmdecay(0.2)   // FM envelope decay
  .fmsustain(0.5) // FM envelope sustain
  .fmenv(10)      // FM envelope depth

### Vibrato

Add vibrato (pitch modulation) using \`.vib()\` and \`.vibmod()\`:

note("c3 e3 g3").s("sine")
  .vib(0.1)       // Vibrato depth
  .vibmod(4)      // Vibrato frequency (speed)

**Note:** The function is \`.vib()\`, NOT \`.vibrato()\`

### Global Effects (Orbit-Based)

These effects use the same chain for all events of the same orbit.

**IMPORTANT: Orbit Routing**

Orbits are independent audio channels, each with its own delay and reverb:

// Bad - both patterns fight over orbit 1's reverb
$: note("a c# ~ e a4 [g f#] e d").room(1).roomsize(10)  // A dorian
$: s("bd*4").room(0).roomsize(0)

// Good - separate orbits
$: note("a c# ~ e a4 [g f#] e d").room(1).roomsize(10).orbit(2)  // A dorian
$: s("bd*4").room(0).roomsize(0).orbit(1)

Default orbit is 1. Use different orbits to prevent effect conflicts!

**Delay/Echo:**
s("bd rim").delay(.5)                // Amount (0-1)
s("bd rim").delaytime(.125)          // Delay time in cycles
s("bd rim").delayfeedback(.8)        // Feedback amount (repeats)

**Reverb (room):**
s("bd sd").room(.5)      // Amount (0-1)
s("bd sd").roomsize(5)   // Room size (0-10)
s("bd sd").roomfade(10)  // Reverb decay time
s("bd sd").roomlp(5000)  // Reverb low-pass filter
s("bd sd").roomdim(0.5)  // Room dimension/character

**Phaser:**
**Note:** Phaser effects require AudioWorklet support and may not work in all browser implementations. If you encounter errors, phaser may not be available in your environment.

note("f [ab c4] ~ f4 [eb c4]").phaser(2)          // Phaser speed - F minor
note("e [g b] ~ e4 ~ [d4 b]").phaserdepth(0.5)   // Phaser depth - E minor
note("g [bb d4] ~ g4 [f d4]").phasercenter(1000) // Center frequency - G minor
note("a [c# e] ~ a4 ~ [g e]").phasersweep(2000)  // Sweep range - A dorian

**Tremolo:**
note("c3").s("sine")
  .tremolo(8)         // Tremolo frequency
  .tremolodepth(0.5)  // Tremolo depth
  .tremolosync(1)     // Sync to pattern tempo
  .tremoloskew(0)     // Waveform skew
  .tremolophase(0)    // Phase offset
  .tremoloshape(0)    // Waveform shape (0=sine, 1=saw, 2=square)

**Ducking (sidechain compression):**
THIS IS A REALLY COOL EFFECT! Creates that classic pumping/breathing effect heard in electronic music.
The idea: one sound (like a kick) controls the volume of another sound (like a bass or pad).

**How it works:**
1. Put your "trigger" sound (e.g. kick) on an orbit
2. Other sounds use \`duckorbit\` to listen to that orbit and duck when it plays

**Ducking parameters:**
- \`duckorbit(n)\` - Which orbit to duck FROM (listen to)
- \`duckdepth(d)\` - How much to duck (0-1, where 1 = full silence)
- \`duckattack(t)\` - Time to reach minimum volume (default 0.003s to avoid clicks)

**Basic example - bass ducks to kick:**
$: s("bd*4").orbit(1)  // Kick on orbit 1 (the trigger)
$: note("c2*8").s("sawtooth").lpf(400)
   .duckorbit(1)        // Listen to orbit 1
   .duckdepth(0.8)      // Duck to 20% volume
   .duckattack(0.003)   // Quick attack (avoid clicks)
   .orbit(2)            // This sound is on orbit 2

**Pumping pad effect:**
$: s("bd*4").orbit(1)
$: note("<c3 eb3 g3 bb3>").s("supersaw").lpf(2000).room(0.3)
   .duckorbit(1).duckdepth(1).duckattack(0.01)
   .orbit(2)

**Multi-orbit ducking with colon notation:**
You can duck multiple orbits with different settings using colons!
$: s("bd:4!4").beat("0,4,8,11,14",16).lpf(800).orbit(1)
$: note("c2*8").s("sawtooth").lpf(400).gain(1.3).orbit(2)  // Bass
$: s("hh*16").delay(0.25).orbit(3)                          // Hi-hats
$: s("~").duckorbit("2:3")           // Duck orbits 2 AND 3
   .duckattack("0.003:0.1")          // Bass: fast attack, Hats: slow attack
   .duckdepth("1:0.3")               // Bass: full duck, Hats: gentle duck

### Clip/Legato

Control note duration to prevent overlap:

note("d [f a] ~ d4 ~ [c4 a d4]").clip(1)      // Full event length - D minor
note("e [g b] ~ e4 ~ [d4 b]").clip(0.5)    // Half event length - E minor
note("a [c# e a4] ~ [g e c#]").legato(0.8)  // 80% of event length - A dorian

// Essential for preventing sample overlap
s("space:2").loop(1).clip(1)

### Modulation with Signals
This is a really great effect that adds a lot of great dynamics and variety to your music.
Use with .slow() at the end of .range() for best results!

Use continuous waveforms to modulate parameters:

s("hh*16").gain(sine)                    // Sine wave modulation
s("hh*16").lpf(saw.range(500, 2000)).segment(16)     // Range: 500-2000Hz
note("g ~ [bb d4] f4@2 eb d4 ~").s("sawtooth")  // G minor
  .lpf(sine.range(100, 2000).slow(4)).segment(16)    // Slow modulation
note("e g b ~ e4 <d4 c4 b> a g").s("sawtooth").lpf(saw.range(200, 2000)).segment(16)

**Available signals:**
- \`sine\`, \`saw\`, \`square\`, \`tri\` (waveforms from 0 to 1)
- \`sine2\`, \`saw2\`, \`square2\`, \`tri2\` (waveforms from -1 to 1)
- \`cosine\`, \`cosine2\` (phase-shifted sine waves)
- \`rand\` (random from 0 to 1)
- \`rand2\` (random from -1 to 1)
- \`perlin\` (smooth random noise - Perlin noise)
- \`irand(n)\` (random integer from 0 to n-1)
- \`brand\` (bipolar random: -1 or 1)
- \`brandBy(p)\` (probability p of 1, else 0)

**Interactive signals:**
.pan(mouseX)                 // Mouse X position
.lpf(mouseY.range(200, 5000).slow(2)).segment(16)  // Mouse Y mapped to filter

**When signals need .segment():**
Most effects accept continuous signals directly, but functions that select/trigger discrete items need \`.segment()\`:

// Works directly:
note("d ~ f a d4@2 c4 bb").pan(rand)  // ✓ - D minor
s("hh*8").gain(sine).lpf(rand.range(200, 2000))  // ✓

// Needs .segment():
s("jazz:4").slice(8, rand.segment(8))  // ✓ slice needs discrete values
s("bd sd hh oh").n(irand(4).segment(8))  // ✓ n needs discrete values

### Effects Reference

| Effect | Description | Example |
|--------|-------------|---------|
| \`lpf()/cutoff()\` | Low-pass filter | \`.lpf(800)\` |
| \`lpq()\` | LPF resonance | \`.lpq(5)\` |
| \`hpf()\` | High-pass filter | \`.hpf(2000)\` |
| \`hpq()\` | HPF resonance | \`.hpq(5)\` |
| \`bpf()\` | Band-pass filter | \`.bpf(1000)\` |
| \`bpq()\` | BPF resonance | \`.bpq(5)\` |
| \`vowel()\` | Vowel filter | \`.vowel("a")\` |
| \`gain()\` | Volume | \`.gain(.5)\` |
| \`velocity()\` | Note velocity | \`.velocity(.8)\` |
| \`pan()\` | Stereo pan | \`.pan(.5)\` |
| \`jux()\` | Split L/R | \`.jux(rev)\` |
| \`juxBy()\` | Split L/R (amount) | \`.juxBy(0.5, rev)\` |
| \`distort()\` | Distortion | \`.distort(.5)\` |
| \`shape()\` | Alt distortion | \`.shape(.5)\` |
| \`crush()\` | Bit crusher | \`.crush(4)\` |
| \`coarse()\` | Sample rate reduction | \`.coarse(12)\` |
| \`attack()\` | Attack time | \`.attack(.1)\` |
| \`decay()\` | Decay time | \`.decay(.1)\` |
| \`sustain()\` | Sustain level | \`.sustain(.5)\` |
| \`release()\` | Release time | \`.release(.2)\` |
| \`lpenv()/lpe()\` | LPF envelope depth | \`.lpenv(4)\` |
| \`lpattack()/lpa()\` | LPF attack | \`.lpa(0.01)\` |
| \`lpdecay()/lpd()\` | LPF decay | \`.lpd(0.1)\` |
| \`penv()\` | Pitch envelope depth | \`.penv(2)\` |
| \`fm()\` | FM ratio | \`.fm(2)\` |
| \`fmi()\` | FM intensity | \`.fmi(10)\` |
| \`vib()\` | Vibrato depth | \`.vib(0.1)\` |
| \`vibmod()\` | Vibrato frequency | \`.vibmod(4)\` |
| \`orbit()\` | Set orbit | \`.orbit(2)\` |
| \`delay()\` | Delay amount | \`.delay(.5)\` |
| \`delaytime()\` | Delay time | \`.delaytime(.125)\` |
| \`delayfeedback()\` | Delay feedback | \`.delayfeedback(.8)\` |
| \`room()\` | Reverb amount | \`.room(.5)\` |
| \`roomsize()\` | Reverb size | \`.roomsize(5)\` |
| \`phaser()\` | Phaser speed | \`.phaser(2)\` |
| \`tremolo()\` | Tremolo freq | \`.tremolo(8)\` |
| \`duckorbit()\` | Duck from orbit | \`.duckorbit(1)\` |
| \`duckdepth()\` | Duck amount (0-1) | \`.duckdepth(0.8)\` |
| \`duckattack()\` | Duck attack time | \`.duckattack(0.003)\` |
| \`clip()/legato()\` | Note duration | \`.clip(0.8)\` |

### Signal Functions Reference

**Continuous signals** (use with \`.range()\`, \`.slow()\`, \`.fast()\`):
Note: these are NOT sounds, they are signals that are used to modulate parameters.

| Signal | Range | Description |
|--------|-------|-------------|
| \`sine\` | 0 to 1 | Sine wave |
| \`sine2\` | -1 to 1 | Bipolar sine |
| \`saw\` | 0 to 1 | Sawtooth |
| \`saw2\` | -1 to 1 | Bipolar sawtooth |
| \`square\` | 0 to 1 | Square wave |
| \`tri\` | 0 to 1 | Triangle |
| \`rand\` | 0 to 1 | Random |
| \`perlin\` | 0 to 1 | Smooth noise |
| \`irand(n)\` | 0 to n-1 | Random integer |
| \`mouseX\` | 0 to 1 | Mouse X |
| \`mouseY\` | 0 to 1 | Mouse Y |

**Signal methods**: \`.range(min, max)\`, \`.slow(n)\`, \`.fast(n)\`, \`.segment(n)\`

**Usage**: 
- Most effects accept continuous signals directly
- Use \`.segment(n)\` for discrete selection (slice, n, etc.)
`;


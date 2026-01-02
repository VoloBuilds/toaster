export const SECTION_RECIPES = `
# Recipes

This page shows practical techniques for achieving specific musical goals.
For pattern design principles and style guidance, see Section 15: Style Guide.

There are often many ways to do a thing and there is no right or wrong.
The fun part is that each representation will give you different impulses when improvising.

## Arpeggios

An arpeggio is when the notes of a chord are played in sequence.
We can either write the notes by hand:

\`\`\`js
note("[f ab] c4 ~ <f4 g4 g#4 g4> [eb c4 ab f]")
.clip(2).s("gm_electric_guitar_clean")
\`\`\`

...or use scales:

\`\`\`js
n("[0 2] 4 ~ 7 [9 7 4 2]").scale("D:dorian")
.clip(2).s("gm_electric_guitar_clean")
\`\`\`

...or chord symbols:

\`\`\`js
n("[0 2] ~ 1 3").chord("Cm").mode("above:c3").voicing()
.clip(2).s("gm_electric_guitar_clean")
\`\`\`

...using off:

\`\`\`js
"0"
  .off(1/3, add(2))
  .off(1/2, add(4))
  .n()
  .scale("C:minor")
  .s("gm_electric_guitar_clean")
\`\`\`

## Chopping Breaks

A sample can be looped and chopped like this:

\`\`\`js
samples('github:yaxu/clean-breaks')
s("amen/4").fit().chop(32)
\`\`\`

This fits the break into 8 cycles + chops it in 16 pieces.
The chops are not audible yet, because we're not doing any manipulation.
Let's add randmized doubling + reversing:

\`\`\`js
samples('github:yaxu/clean-breaks')
s("amen/4").fit().chop(16).cut(1)
.sometimesBy(.5, ply("2"))
.sometimesBy(.25, mul(speed("-1")))
\`\`\`

If we want to specify the order of samples, we can replace \`chop\` with \`slice\`:

\`\`\`js
samples('github:yaxu/clean-breaks')
s("amen/4").fit()
  .slice(8, "<0 1 2 3 4*2 5 6 [6 7]>*2")
  .cut(1).rarely(ply("2"))
\`\`\`

If we use \`splice\` instead of \`slice\`, the speed adjusts to the duration of the event:

\`\`\`js
samples('github:yaxu/clean-breaks')
s("amen")
  .splice(8, "<0 1 2 3 4*2 5 6 [6 7]>*2")
  .cut(1).rarely(ply("2"))
\`\`\`

Note that we don't need \`fit\`, because \`splice\` will do that by itself.

## Filter Envelopes

Using \`lpenv\`, we can make the filter move:

\`\`\`js
note("g1 bb1 <c2 eb2> d2")
  .s("sawtooth")
  .lpf(400).lpenv(4)
  .scope()
\`\`\`

The type of envelope depends on the methods you're setting. Let's set \`lpa\`:

\`\`\`js
note("g1 bb1 <c2 eb2> d2")
  .s("sawtooth").lpq(8)
  .lpf(400).lpa(.2).lpenv(4)
  .scope()
\`\`\`

Now the filter is attacking, rather than decaying as before (decay is the default). We can also do both

\`\`\`js
note("g1 bb1 <c2 eb2> d2")
  .s("sawtooth").lpq(8)
  .lpf(400).lpa(.1).lpd(.1).lpenv(4)
  .scope()
\`\`\`

You can play around with \`lpa\` | \`lpd\` | \`lps\` | \`lpd\` to see what the filter envelope will do.

## Layering Sounds

We can layer sounds by separating them with ",":

\`\`\`js
note("<g1 bb1 d2 f1>")
.s("sawtooth, square") // <------
.scope()
\`\`\`

We can control the gain of individual sounds like this:

\`\`\`js
note("<g1 bb1 d2 f1>")
.s("sawtooth, square:0:.5") // <--- "name:number:gain"
.scope()
\`\`\`

For more control over each voice, we can use \`layer\`:

\`\`\`js
note("<g1 bb1 d2 f1>").layer(
  x=>x.s("sawtooth").vib(4),
  x=>x.transpose(12).s("square")
).scope()
\`\`\`

Here, we give the sawtooth a vibrato and the square is moved an octave up.
With \`layer\`, you can use any pattern method available on each voice, so sky is the limit..

## Oscillator Detune

IMPORTANT: We can fatten a sound by adding a detuned version to itself:

\`\`\`js
note("<g1 bb1 d2 f1>")
.add(note("0,.1")) // <------ chorus
.s("sawtooth").scope()
\`\`\`

Try out different values, or add another voice!

## Polyrhythms

Here is a simple example of a polyrhythm:

\`\`\`js
s("bd*2,hh*3")
\`\`\`

A polyrhythm is when 2 different tempos happen at the same time.

## Polymeter

This is a polymeter:

\`\`\`js
s("<bd rim, hh hh oh>*4")
\`\`\`

A polymeter is when 2 different bar lengths play at the same tempo.

## Phasing

This is a phasing:

\`\`\`js
note("<C D G A Bb D C A G D Bb A>*[6,6.1]").piano()
\`\`\`

Phasing happens when the same sequence plays at slightly different tempos.

## Running through samples

Using \`run\` with \`n\`, we can rush through a sample bank:

\`\`\`js
samples('bubo:fox')
n(run(8)).s("ftabla")
\`\`\`

This works great with sample banks that contain similar sounds, like in this case different recordings of a tabla.
Often times, you'll hear the beginning of the phrase not where the pattern begins.
In this case, I hear the beginning at the third sample, which can be accounted for with \`early\`.

\`\`\`js
samples('bubo:fox')
n(run(8)).s("ftabla").early(2/8)
\`\`\`

Let's add some randomness:

\`\`\`js
samples('bubo:fox')
n(run(8)).s("ftabla").early(2/8)
.sometimes(mul(speed("1.5")))
\`\`\`

## Tape Warble

We can emulate a pitch warbling effect like this:

\`\`\`js
note("<[d f a] d4@2 [c4 a f] ~>*8")
.add(note(perlin.range(0,.5))) // <------ warble
.clip(2).s("gm_electric_guitar_clean")
\`\`\`

## Sound Duration

There are a number of ways to change the sound duration. Using clip:

\`\`\`js
note("[g bb] d4 ~ f4 [eb d4] ~")
.clip("<2 1 .5 .25>")
\`\`\`

The value of clip is relative to the duration of each event.
We can also create overlaps using release:

\`\`\`js
note("[g bb] d4 ~ f4 [eb d4] ~")
.release("<2 1 .5 .25>")
\`\`\`

This will smoothly fade out each sound for the given number of seconds.
We could also make the notes shorter by using a decay envelope:

\`\`\`js
note("[g bb] d4 ~ f4 [eb d4] ~")
.decay("<2 1 .5 .25>")
\`\`\`

When using samples, we also have \`.end\` to cut relative to the sample length:

\`\`\`js
s("oh*4").end("<1 .5 .25 .1>")
\`\`\`

Compare that to clip:

\`\`\`js
s("oh*4").clip("<1 .5 .25 .1>")
\`\`\`

or decay:

\`\`\`js
s("oh*4").decay("<1 .5 .25 .1>")
\`\`\`

## Wavetable Synthesis

You can loop a sample with \`loop\` / \`loopEnd\`:

\`\`\`js
note("<[a c# e] g ~ d4 [f d4 a]>").s("bd").loop(1).loopEnd(.05).gain(.2)
\`\`\`

This allows us to play the first 5% of the bass drum as a synth!
To simplify loading wavetables, any sample that starts with \`wt_\` will be looped automatically:

\`\`\`js
samples('github:bubobubobubobubo/dough-waveforms')
note("[d f a] ~ d4 [c4 a f]").s("wt_dbass").clip(2)
\`\`\`

Running through different wavetables can also give interesting variations:

\`\`\`js
samples('github:bubobubobubobubo/dough-waveforms')
note("d2 [f2 a2] ~ d3 [c3 a2] ~").s("wt_dbass").n(run(8)).fast(2)
\`\`\`

...adding a filter envelope + reverb:

\`\`\`js
samples('github:bubobubobubobubo/dough-waveforms')
note("d2 [f2 a2] ~ d3 [c3 a2] ~").s("wt_dbass").n(run(8))
.lpf(perlin.range(100,1000).slow(8))
.lpenv(-3).lpa(.1).room(.5).fast(2)
\`\`\`

## Detuning and Layering for Thickness

Use \`layer()\` to create rich, wide sounds with harmonies and octaves on control patterns. For raw strings, you can also use \`superimpose(x=>x.add())\`.

**IMPORTANT:** When detuning with \`.add(note(...))\`, you're adding **note patterns**, not doing arithmetic. This is different from \`.add(7)\` which would fail on control patterns.

**Note:** \`superimpose(x=>x.add())\` works on raw strings, but \`superimpose(x=>x.trans())\` throws errors on control patterns (\`n()\` or \`note()\`). Use \`layer()\` for harmony layering on control patterns.

**Chorus effect (slight detune with notes):**
\`\`\`js
note("<g2 bb2 d3 f2>")
  .add(note("0,.05"))  // Detune by 5 cents - adds note pattern (special case); make sure to keep the '0,'
  .s("sawtooth")
  .lpf(600)
\`\`\`

**Unison voices (multiple octaves with notes):**
\`\`\`js
note("<c3 eb3 g3 c4>")
  .add(note("0,12,-7"))  // Original, octave up, 7 semitones down (adds note pattern)
  .s("square")
  .lpf(1500)
\`\`\`

**Layered harmonies with scale degrees (PREFERRED METHOD - use layer()):**
\`\`\`js
n("[0 2] [~ 5] 4 7 ~ [4 2] 5 1").scale("E:minor").layer(
  x => x.s("sawtooth"),
  x => x.trans(7).s("sawtooth").gain(0.5)  // Power chord (fifth up)
).lpf(800).gain(0.4)
\`\`\`

**Multiple harmony layers:**
\`\`\`js
n("[0 2 4] [9 7]").scale("D:dorian").layer(
  x => x.s("sawtooth"),
  x => x.trans(3).s("sawtooth").gain(0.5),  // Third up
  x => x.trans(7).s("sawtooth").gain(0.4)   // Fifth up
).lpf(800).gain(0.4)
\`\`\`
`
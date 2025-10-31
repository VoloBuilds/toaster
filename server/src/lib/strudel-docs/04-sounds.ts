export const SECTION_SOUNDS = `
## Working with Sounds

### Basic Sound Playback

sound("bd sd hh cp")  // Basic drum pattern
s("bd sd hh cp")      // 's' is shorthand for 'sound'

### Sound Palette Quick Reference

#### Drums
- Classic: bd, sd, hh, oh, cp, rim, cr, rd, ht, mt, lt
- Banks: .bank("RolandTR808|RolandTR909|mc303|OberheimDMX") - see Section 14 for all 100+ drum machines
- Select variations: .n("0 1 2 3")

#### Bass Sounds
- Synth: note("c2").s("sawtooth").lpf(400)
- Samples: Use Shabda (see below) or check Section 14 for bass samples

**Creating Bass Lines:**

Bass lines are crucial for establishing groove and harmony. Here are practical approaches:

**Simple Root Note Bass:**
note("c2*4").s("sawtooth").lpf(400)  // Steady four-on-the-floor

**Walking Bass (Jazz/Swing):**
note("c2 eb2 f2 g2 ab2 g2 f2 eb2").s("sawtooth").lpf(600)  // Chromatic walk
note("c2 [eb2 d2] f2 [g2 ab2] bb2 [g2 f2] eb2 c2").s("sawtooth").lpf(500)  // With passing tones

**Syncopated Bass (Funk/Disco):**
note("c2 ~ [eb2 ~] ~ [g2 ~] c2 [~ bb1] ~").s("sawtooth").lpf(600) //Very good!
note("c2*2 [~ eb2] ~ g2 [~ c2] [bb1 c2] ~ bb1").s("sawtooth").lpf(500)

**Driving Bass (Techno/House):**
note("c2(5,8)").s("sawtooth").lpf(400)  // Euclidean kick pattern bass
note("<c2*4 [c2*3 eb2] c2*4 [c2 bb1 c2 ~]>").s("sawtooth").lpf(400)  // With variation

**Melodic Bass (DnB/Dubstep):**
note("c2 eb2 g2 [bb2 g2] c2 [d2 eb2] f2 ~").s("sawtooth").lpf(800)
note("[c2 c3] ~ [eb2 eb3] [g2 [bb2 g2]]").s("sawtooth").lpf(600)  // Octave jumps

**Bass with Rhythm:**
note("c2(3,8)").s("sawtooth").lpf(400)  // Euclidean groove
note("c2 ~ c2 [~ c2] ~ c2 ~ [eb2 f2]").s("sawtooth").lpf(500)  // Ghost notes with rests

#### Melodic Synths
- Basic: sawtooth, square, triangle, sine
- ZZFX: z_sawtooth, z_sine, z_square, z_tan, z_noise
- Wavetables: wt_digital, wt_vgame (see Section 14 for all wavetables)
- Soundfonts: gm_piano, gm_violin, gm_guitar, etc. (see Section 14 for all 125 GM instruments)

#### Atmospheric
- Noise: white, pink, brown, crackle
- Samples: space, wind, crow, metal, insect, jazz, casio (see Section 14 for complete list)

### Available Drum Sounds

Default drum samples use the [tidal-drum-machines](https://github.com/ritchse/tidal-drum-machines) library:

- \`bd\` - bass drum (kick drum)
- \`sd\` - snare drum
- \`rim\` - rimshot
- \`cp\` - clap
- \`hh\` - closed hi-hat
- \`oh\` - open hi-hat
- \`cr\` - crash cymbal
- \`rd\` - ride cymbal
- \`ht\` - high tom
- \`mt\` - medium tom
- \`lt\` - low tom
- \`sh\` - shakers (maracas, cabasas, etc)
- \`cb\` - cowbell
- \`tb\` - tambourine
- \`perc\` - other percussions
- \`misc\` - miscellaneous samples
- \`fx\` - effects

### Genre-Specific Drum Patterns

Here are realistic drum patterns for different genres. These serve as excellent starting points for building complete tracks.

**Note on Tempo:** For drums, use \`setcpm()\` to control tempo (at the top of the code) rather than \`.fast()\` or \`.slow()\`. For example: \`setcpm(140/4)\` for techno, \`setcpm(85/4)\` for hip-hop, \`setcpm(170/4)\` for drum & bass.

**Hip-Hop (Boom Bap):**
s("bd ~ sd ~, hh [~ hh] hh [~ hh]")
Traditional boom-bap with offbeat hi-hats creating that classic head-nod groove. Perfect at 85-95 BPM.

**Trap:**
s("bd [~ bd] ~ bd, ~ sd ~ <sd [sd sd]>, [hh hh]*8, ~ ~ <oh ~> ~")
or alternatively with more hat variations:
s("bd [~ bd] ~ bd, ~ sd ~ <sd [sd sd]>, <[hh hh]*8 [hh hh hh]*8 [hh hh]*8 [hh hh]*4>, ~ ~ <oh ~> ~").bank("RolandTR808")
Trap pattern with characteristic double kick rolls, snare variations, and rapid 32nd note hi-hats. The alternating open hat adds texture.

**Trap (Minimal):**
s("bd ~ bd ~, ~ sd ~ sd, hh*16?0.8")
Stripped-back trap - simple kicks on 1 and 3, snares on 2 and 4, fast hats with randomization for human feel.

**House (8-Step Classic):**
s("bd hh cp bd hh bd cp hh")
Simple 8-step pattern with syncopated kicks, claps, and hats. Minimal but incredibly groovy. Perfect foundation for building tracks.

**House (Deep/Euclidean):**
s("bd(5,8), ~ sd ~ sd, [hh oh]*4").bank("RolandTR909")
Euclidean kick (5 hits over 8 steps) creates natural groove variations. The alternating hh/oh gives it bounce. Perfect for deep house.

**House (Jackin'):**
s("bd*4, ~ [sd,cp] ~ [sd,cp], hh*8, ~ ~ <~ oh> ~").bank("RolandTR909")
Four-on-the-floor with layered snare/clap on 2 and 4. Alternating open hat pattern adds movement. That Chicago sound.

**Techno (Hypnotic):**
s("bd(3,4), ~ ~ sd ~, hh(7,16), <~ oh>@3 ~")
Euclidean kick (3 over 4) creates subtle polyrhythm. Dense hi-hat pattern (7 over 16). Sparse snare. Hypnotic and minimal.

**Techno (Driving):**
s("bd(5,8), [~ sd]*2, hh(9,16), <~ ~ oh ~>").bank("RolandTR909")
Euclidean kick with more drive. Euclidean hi-hats (9 over 16) add texture. Alternating open hat every 4 beats creates breathing room.

**Techno (Berlin Style):**
s("bd(7,16), ~ ~ sd ~, [hh oh](11,16,<0 2>), ~ ~ cp ~").bank("mc303")
Off-kilter euclidean kick (7/16), rotating hi-hat pattern with offset. Sparse snare and rim. Pure Berlin techno.

**Disco:**
s("bd [~ bd] [bd ~] [~ bd], ~ sd ~ sd, [hh oh]*4")
Syncopated kicks with that classic four-on-the-floor feel. Alternating hats on every 8th note keep energy high.

**Funk:**
s("<bd ~ bd ~!3 bd [bd bd] bd ~>, [~ sd]*2, hh*16?0.7, <~ ~ ~ cb>")
Kick pattern alternates every 4 cycles - the \`!3\` repeats "bd ~ bd ~" three times. Randomized hi-hats and occasional cowbell.

**Funk (Breakbeat):**
s("bd ~ bd(3,4,1), [~ sd]*2, <hh*8 hh(5,8)>").bank('mc303')
Syncopated kick with euclidean fill, alternating hi-hat patterns create movement. Weird but interesting pocket.

**Rock (Alternative):**
s("bd ~ sd ~ ~ bd ~ sd, [hh ~]*4, ~ ~ ~ <oh cr>").bank("alesishr16")
Back beat with syncopated kicks. Sparse hi-hats leave space. Occasional open hat or crash for dynamics.

**Breakbeat (Amen-Style):**
s("bd ~ <bd [bd bd]> sd ~ bd sd <~ bd>, hh*8").bank("RolandTR909")
Amen-inspired: syncopated kicks and snares with alternating kick variations. Simple hi-hats let the breaks shine.

**Drum & Bass:**
s("bd ~ ~ ~ ~ bd ~ ~, ~ sd ~ <sd [sd ~]>, hh(9,16)").bank("RolandTR909")
Classic DnB: kicks on 1 and 6, snare on 3 with variation. Euclidean hats for texture. Works at 160-180 BPM.

**Reggae/Dancehall (One Drop):**
s("~ ~ bd ~, ~ sd ~ ~, [~ hh]*2, ~ ~ ~ <rim cb>").bank("RolandTR808")
Classic one-drop: kick on 3, snare on 2. Offbeat hi-hats. Rim/cowbell alternates for percussion flavor.

**Afrobeat (Polyrhythmic):**
s("bd(3,8), sd(5,16), hh*8, ~ cb ~ cb").bank("RolandTR707")
Euclidean rhythms create polyrhythmic patterns typical of Afrobeat. Kick (3/8) against snare (5/16) against steady hats and cowbell.

**Footwork/Juke:**
s("bd(7,16,<0 2 4>), ~ sd ~ <sd [sd sd]>, hh*16?0.6, ~ ~ ~ cb")
Rotating euclidean kicks (7 over 16) with offset creates rolling pattern. Sparse snare variations. Randomized hats. Fast and frenetic.

**Halftime/Trip-Hop:**
s("bd ~ ~ ~ <~ bd> ~ ~ ~, ~ ~ ~ ~ sd ~ ~ ~, hh(5,8), ~ ~ oh ~")
Slow, heavy groove. Kick on 1, occasional kick on 5. Snare way back on beat 5. Euclidean hats create space. Moody and atmospheric.

**Tips for Using These Patterns:**

1. **Euclidean magic (USE THIS OFTEN!)**: Patterns like \`bd(5,8)\`, \`bd(3,8)\`, and \`hh(7,16)\` create natural groove automatically. This is one of the most powerful tools for making music that doesn't sound mechanical.
2. **Variation with \`<>\`**: Alternate patterns like \`<bd*4 bd(5,8)>\` to evolve over multiple cycles.
3. **Humanize with \`?\`**: Add \`?0.7\` or \`?0.9\` to hi-hats for subtle randomization that feels organic.
4. **Replication with \`!\`**: Use \`bd ~ bd ~!3\` to repeat a pattern multiple times before moving to the next.
5. **Combine with functions**: Add \`.every(4, x=>x.fast(2))\` for fills every 4 bars.

### Additional Sample Libraries

Strudel also loads several additional sample libraries by default. See full list at the bottom of the page.

### Drum Machines (Banks)

Change the character of drums using \`.bank()\`:

s("bd sd,hh*16").bank("RolandTR808")
s("bd sd,hh*16").bank("RolandTR909")

Behind the scenes, \`bank\` prepends the drum machine name to the sample name with \`_\` to get the full name (e.g., \`RolandTR808_bd\`).

You can even pattern the bank to switch between different drum machines:

s("bd sd,hh*16").bank("<RolandTR808 RolandTR909>")

**Popular banks:**
- \`RolandTR909\` - House/techno classic
- \`RolandTR808\` - Hip-hop classic
- \`RolandTR707\` - 1980s drum machine
- \`RolandTR606\` - Classic analog rhythm composer
- \`mc303\` - traditional groovebox sound
- \`alesishr16\` - Used for more rock-oriented sounds
- \`EmuDrumulator\` - Early sampling drum machine

**All available banks (70+ total):**
\`AJKPercusyn\`, \`AkaiLinn\`, \`AkaiMPC60\`, \`AkaiXR10\`, \`AlesisHR16\`, \`AlesisSR16\`, \`BossDR110\`, \`BossDR220\`, \`BossDR55\`, \`BossDR550\`, \`CasioRZ1\`, \`CasioSK1\`, \`CasioVL1\`, \`DoepferMS404\`, \`EmuDrumulator\`, \`EmuModular\`, \`EmuSP12\`, \`KorgDDM110\`, \`KorgKPR77\`, \`KorgKR55\`, \`KorgKRZ\`, \`KorgM1\`, \`KorgMinipops\`, \`KorgPoly800\`, \`KorgT3\`, \`Linn9000\`, \`LinnDrum\`, \`LinnLM1\`, \`LinnLM2\`, \`MFB512\`, \`MoogConcertMateMG1\`, \`MPC1000\`, \`OberheimDMX\`, \`RhodesPolaris\`, \`RhythmAce\`, \`RolandCompurhythm1000\`, \`RolandCompurhythm78\`, \`RolandCompurhythm8000\`, \`RolandD110\`, \`RolandD70\`, \`RolandDDR30\`, \`RolandJD990\`, \`RolandMC202\`, \`RolandMC303\`, \`RolandMT32\`, \`RolandR8\`, \`RolandS50\`, \`RolandSH09\`, \`RolandSystem100\`, \`RolandTR505\`, \`RolandTR606\`, \`RolandTR626\`, \`RolandTR707\`, \`RolandTR727\`, \`RolandTR808\`, \`RolandTR909\`, \`SakataDPM48\`, \`SequentialCircuitsDrumtracks\`, \`SequentialCircuitsTom\`, \`SergeModular\`, \`SimmonsSDS400\`, \`SimmonsSDS5\`, \`SoundmastersR88\`, \`UnivoxMicroRhythmer12\`, \`ViscoSpaceDrum\`, \`XdrumLM8953\`, \`YamahaRM50\`, \`YamahaRX21\`, \`YamahaRX5\`, \`YamahaRY30\`, \`YamahaTG33\`

**Note:** Not all banks have samples for all drum types (bd, sd, hh, etc.).

### Selecting Samples with \`n\`

Use the \`n\` function to select different sample variations:

s("hh*8").bank("RolandTR909").n("0 1 2 3")
n("0 1 4 2").s("jazz")  // Select samples by number

This is cleaner than using \`:\` notation:
s("jazz:0 jazz:1 jazz:4 jazz:2")  // Works, but more verbose

Numbers start from 0 and wrap around if too high.

### Basic Synth Waveforms

note("f [ab c4] ~ f4@2 [eb c4] ~ b").s("sawtooth")   // Bright, buzzy sound (F minor)
note("e [g b] ~ e4 ~ [d4 b] ~ <d f4>").s("square")     // Hollow, clarinet-like (E minor)
note("d ~ f a ~ d4@2 c4").s("triangle")   // Soft, flute-like (D minor)
note("a ~ c# ~ e a4 ~ g").s("sine")       // Pure tone (A dorian)

If you don't set a \`sound\` but set a \`note\`, the default value for \`sound\` is \`triangle\`.

**Additive Synthesis:**
Use \`n\` to limit overtones for a softer sound:

(GREAT WAY TO GET A SOFTER SOUND)
note("c2").s("sawtooth").n("<32 16 8 4>")  // Fewer harmonics = softer
note("c2").s("sawtooth:<32 16 8 4>")       // Same, using mini-notation

### ZZFX Synth (Game-Style Sounds)

ZZFX is a compact synth perfect for retro game sounds and unique timbres:

note("c2 eb2 f2 g2").s("z_sawtooth")  // F minor bass line
note("g3 [bb3 d4] ~ f4 [eb4 d4]").s("z_sine")  // G minor melody
note("a4 ~ [c#5 e5] ~ d5").s("z_square")  // A dorian lead

**Available ZZFX waveforms:**
- \`z_sawtooth\`, \`z_sine\`, \`z_square\`, \`z_tan\`, \`z_noise\`

**ZZFX-specific parameters:**
note("c2 eb2 f2 g2")
  .s("z_sawtooth")
  .zrand(0)       // Randomization
  .curve(1)       // Waveshape 1-3
  .slide(0)       // Pitch slide
  .zmod(0)        // FM speed
  .zcrush(0.5)    // Bit crush 0-1
  .zdelay(0.2)    // Simple delay
  .pitchJump(0)   // Pitch change
  .lfo(0)         // Tremolo/LFO

### Wavetable Synthesis (1000+ Waveforms)
// 1. Load wavetables at the top
samples('bubo:waveforms')

// 2. Then use wavetable sounds in patterns
note("<[d,f#,a,c4]!2 [g,bb,d4,f4] [a,c#4,e4,g4]>")  // Extended chords (Dm7 x2, Gm7, A7)
  .s('wt_02')
  .n("<1 2 3 4 5 6 7 8 9 10>/2")
  .room(0.5)

Any sample with \`wt_\` prefix loads as a wavetable. You can scan through wavetables:

// 1. Load at the top
samples('bubo:waveforms')

// 2. Scan through wavetable positions in patterns
note("e [g b] ~ d4 ~ [c4 b a] ~").s('wt_sinharm')  // E minor melody
  .loopBegin(sine.range(0, 0.5).slow(4))
  .loopEnd(sine.range(0.5, 1).slow(3))
  .segment(16)

### Noise

s("<white pink brown>")  // Different noise colors
s("white*8").decay(.04).sustain(0)  // Hi-hat from noise

**Crackle** - Noise crackles with density control:
s("crackle*4").density("<0.01 0.04 0.2 0.5>")
s("crackle*2").density(0.02).delay(0.8).room(0.9).gain(0.2)

### Shabda - Dynamic Sample Loading

[Shabda](https://shabda.ndre.gr/) is a powerful tool that queries [Freesound.org](https://freesound.org/) to load samples on-demand. Unlike the default sample library, Shabda doesn't have a fixed list - it searches Freesound's massive database dynamically.

ONLY USE SHABDA IF YOU ARE NOT FINDING THE SAMPLES YOU WANT IN THE DEFAULT SAMPLE LIBRARY.

**⚠️ CRITICAL RULE:** The \`samples()\` function must ALWAYS be at the very TOP of your code (first lines). NEVER inline it with patterns, stack calls, or any other code. This applies to ALL sample loading: Shabda, wavetables, GitHub, custom URLs, etc.

**How it works:**
samples('shabda:searchterm:count')
- \`searchterm\`: What to search for on Freesound
- \`count\`: How many variations to load (e.g., 4 = loads 4 different samples)

**✅ CORRECT - samples() at the top:**
// 1. Load samples FIRST (at the top)
samples('shabda:bang:4,boom:3,vinyl:2')

// 2. Then use them in your patterns (below)
$: s("bang:0 bang:1 ~ bang:2").gain(0.8)
$: s("boom:0 ~ boom:1*2 ~ boom:2").slow(2)
$: s("vinyl:0 vinyl:1").slow(4)

**❌ WRONG - Don't inline with patterns:**
// NEVER inline samples() anywhere!
stack(
  samples('shabda:glass:4'),  // ❌ NEVER DO THIS
  s("glass:0 glass:1")
)

// Also wrong:
s("bd*4").stack(samples('shabda:glass:4'), s("glass:0"))  // ❌ NEVER

// Also wrong:
$: samples('shabda:glass:4')  // ❌ NEVER in pattern context
$: s("glass:0")

**Suggested search terms for unique/esoteric samples:**

*Found Sound & Field Recordings:*
- \`glass\`, \`bottle\`, \`ceramic\` - Glass/ceramic impacts and resonances
- \`metal\`, \`chain\`, \`spring\` - Metallic textures and rattles
- \`water\`, \`rain\`, \`splash\` - Water sounds and drips
- \`wood\`, \`creak\`, \`click\` - Wooden percussion and creaks
- \`paper\`, \`rustle\`, \`crumple\` - Paper textures
- \`door\`, \`squeak\`, \`slam\` - Door sounds
- \`machinery\`, \`motor\`, \`engine\` - Mechanical sounds

*Atmospheric & Textural:*
- \`wind\`, \`storm\`, \`thunder\` - Weather and nature
- \`vinyl\`, \`tape\`, \`crackle\` - Analog noise and artifacts
- \`drone\`, \`hum\`, \`rumble\` - Deep sustained textures
- \`breath\`, \`sigh\`, \`whisper\` - Breath and air sounds
- \`radio\`, \`static\`, \`interference\` - Electronic noise

*Voice & Human Sounds:*
- \`vocal\`, \`voice\`, \`choir\` - Vocal samples
- \`laugh\`, \`scream\`, \`shout\` - Vocal expressions
- \`whistle\`, \`hum\`, \`beatbox\` - Mouth sounds
- Use \`shabda/speech\` for text-to-speech (see below)

*Transitions & Effects:*
- \`riser\`, \`sweep\`, \`whoosh\` - Upward sweeps
- \`reverse\`, \`rewind\` - Reversed sounds
- \`glitch\`, \`distortion\`, \`bitcrush\` - Digital artifacts

**Note:** Shabda is for finding unique, unusual, and vocal samples - use the built-in drum machines for standard drums! Results depend on Freesound's database. Generic terms like "water" or "metal" are more likely to succeed than overly specific terms. Experiment to find what works!

**Text-to-speech (default: English, female):**
// 1. Load speech samples at the top
samples('shabda/speech:the_drum,forever,strudel')

// 2. Then use them in patterns
s("the_drum*2").chop(16)
s("forever strudel").slow(2)

**Multi-language speech:**
// 1. Load at the top
samples('shabda/speech/fr-FR/m:magnifique,bonjour')

// 2. Use in patterns
s("magnifique bonjour").slow(2)

**Speech format:** \`shabda/speech/<language-code>/<gender>:word1,word2\`
- Language: 'en-GB' (default), 'en-US', 'fr-FR', 'es-ES', 'de-DE', 'it-IT', 'ja-JP', etc.
- Gender: 'f' (female, default) or 'm' (male)
- Words: Comma-separated, use underscores for spaces (e.g., 'the_drum')

### Loading Custom Samples

**⚠️ CRITICAL:** ALL \`samples()\` calls must be at the TOP of your code, before any patterns.

**Load from URLs:**
// 1. Load samples at the TOP
samples({
  bassdrum: 'bd/BT0AADA.wav',
  hihat: 'hh27/000_hh27closedhh.wav',
  snaredrum: ['sd/rytm-01-classic.wav', 'sd/rytm-00-hard.wav'],
}, 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/')

// 2. Then use in patterns (below)
s("bassdrum snaredrum:0 bassdrum snaredrum:1, hihat*16")

**Load from GitHub:**
// 1. Load samples at the TOP
samples('github:tidalcycles/dirt-samples')

// 2. Then use in patterns (below)
s("bd sd bd sd,hh*16")

**Load from JSON file:**
// 1. Load samples at the TOP
samples('https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/strudel.json')

// 2. Then use in patterns (below)

**Load pitched samples:**
// 1. Load samples at the TOP
samples({
  'moog': {
    'g2': 'moog/004_Mighty%20Moog%20G2.wav',
    'g3': 'moog/005_Mighty%20Moog%20G3.wav',
    'g4': 'moog/006_Mighty%20Moog%20G4.wav',
  }
}, 'github:tidalcycles/dirt-samples')

// 2. Then use in patterns (below)
note("g2 [bb2 c3] ~ g3 ~ [f3 eb3 d3]").s('moog').clip(1)

The sampler automatically picks the closest matching sample for each note!

### Sound Functions Reference

| Function | Description | Example |
|----------|-------------|---------|
| \`sound()/s()\` | Play sound | \`s("bd sd")\` |
| \`bank()\` | Set drum bank | \`.bank("RolandTR909")\` |
| \`n()\` | Select sample variation | \`.n("0 1 2 3")\` |
| \`begin()\` | Start position | \`.begin(.25)\` |
| \`end()\` | End position | \`.end(.75)\` |
| \`speed()\` | Playback speed | \`.speed(2)\` |
| \`loop()\` | Loop sample | \`.loop(1)\` |
| \`loopAt()\` | Loop to fit cycles | \`.loopAt(2)\` |
| \`chop()\` | Chop into pieces | \`.chop(8)\` |
| \`slice()\` | Slice and trigger | \`.slice(8, "0 2 4")\` |
| \`splice()\` | Slice with speed adjust | \`.splice(8, "0 2 4")\` |
| \`striate()\` | Granular effect | \`.striate(6)\` |
| \`cut()\` | Cut group | \`.cut(1)\` |
| \`samples()\` | Load samples | \`samples('github:user/repo')\` |
`;


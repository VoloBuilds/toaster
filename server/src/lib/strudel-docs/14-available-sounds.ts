export const SECTION_AVAILABLE_SOUNDS = `
## Complete List of Available Sounds

This is a comprehensive list of all sounds available in your Strudel environment. Use these with \`s("soundname")\` or \`sound("soundname")\`.

### How to Use This List

- Use any sound name with \`s("name")\` or \`sound("name")\`
- Many sounds have multiple variations - access with \`.n(0)\`, \`.n(1)\`, \`.n(2)\`, etc.
- Types: samples, synths, soundfonts (General MIDI instruments), drum-machines

### Drum Machine Sounds

These are vintage drum machines with authentic samples. Use with \`.bank("MachineName")\` or directly by full name:
Often, you won't need to use the drum machine sounds, you can just use the basic drums without the .bank option.

**Basic Drums (common abbreviations):**
bd (bass drum/kick), sd (snare), hh (closed hi-hat), oh (open hi-hat), cp (clap), rim (rimshot), cr (crash), rd (ride), ht (high tom), mt (mid tom), lt (low tom), cb (cowbell), tb (tambourine), sh (shakers), perc (percussion), misc (miscellaneous)

**Drum Machine Banks:**
ajkpercusyn, akailinn, akaimpc60, akaixr10, alesishr16, alesissr16, bossdr110, bossdr220, bossdr55, bossdr550, casiorz1, casiosk1, casiovl1, doepferms404, emudrumulator, emumodular, emusp12, korgddm110, korgkpr77, korgkr55, korgkrz, korgm1, korgminipops, korgpoly800, korgt3, linn9000, linndrum, linnlm1, linnlm2, mfb512, moogconcertmatemg1, mpc1000, oberheimob8, oberheimobxa, oberheimxpander, pearlyg2v, plogue5, pss170, pss460, pss470, pss480, r70, quantumsymbioticsymbals, rc20, rolandcompumusiccm32l, rolandcompumusiccm64, rolandcompumusiccmu800, rolandcompumusicmt200, rolandj8, rolandjp8000, rolandjp8080, rolandjuno106, rolandjv1080, rolandjv2080, rolandmt32, rolandpg1000, rolandpg200, rolandph830, rolandpro5, rolandrs9, rolandsh2, rolandsh2000, rolandsh3, rolandsh32, rolandsh101, rolandsh201, rolandsynthe, rolandsynergy, rolandtr505, rolandtr606, rolandtr626, rolandtr707, rolandtr727, rolandtr808, rolandtr909, rx11, rx5, sc55, sequentialcircuitssixtrax, sequentialcircuitstom, simmonssds1000, simmonssds5, simmonssds6, simmonssds7, simmonssds8, simmonssds9, simmonssdsv, sp1200, sy77, tx81z, vermona, wasatchdigitalx, yamahacs80, yamahadd5, yamahadx100, yamahadx11, yamahadx21, yamahadx27, yamahadx7, yamahafs1r, yamahapsr, yamaharx17, yamaharx21l, yamaharx7, yamahasy35, yamahasy77, yamahasy85, yamahasy99, yamahatg500, yamahavopm, ym2151

**Indian Percussion:**
ardha, chaapu, dhi, dhin, dhum, gumki, ka, ki

**Drum Machines Tagged Sounds:**
ajkpercusyn_bd, ajkpercusyn_cb, ajkpercusyn_ht, ajkpercusyn_sd, akailinn_bd, akailinn_cb, akailinn_cp, akailinn_cr, akailinn_hh, akailinn_ht, akailinn_lt, akailinn_mt, akailinn_oh, akailinn_rd, akailinn_sd, akailinn_sh, akailinn_tb, akaimpc60_bd, akaimpc60_cp, akaimpc60_cr, akaimpc60_hh, akaimpc60_ht, akaimpc60_lt, akaimpc60_misc, akaimpc60_mt, akaimpc60_oh, akaimpc60_perc, akaimpc60_rd, akaimpc60_rim, akaimpc60_sd, brk

### Regular Samples

**808 Family:**
808, 808bd, 808cy, 808hc, 808ht, 808lc, 808lt, 808mc, 808mt, 808oh, 808sd

**909 and Other Vintage:**
909

**General Samples:**
ab, action, ade, ades2, ades3, ades4, agogo, alphabet, amencutup, arpy, armora, arp, auto, baa, baa2, bass, bass0, bass1, bass2, bass3, bassdm, bassfoo, battles, bd, bend, bev, bin, birds, birds3, bleep, blip, blue, bottle, breaks125, breaks152, breaks157, breaks165, breath, bubble, can, casio, cassette, cb, cc, chin, circus, clak, click, clubkick, co, coins, control, cosmicg, cp, cr, crow, crow4, d, db, diphone, diphone2, dist, dork2, dorkbot, dr, dr2, dr55, dr_few, drum, drumtraks, e, east, electro1, em2, erk, f, feel, feelfx, fest, fire, flick, fm, foo, fork, fs, future, gab, gabba, gabbaloud, gabbalouder, glasstap, glitch, glitch2, gretsch, gtr, h, hand, hardcore, hardkick, haw, hc, hh, hh27, hit, hmm, ho, hoover, house, ht, hw, i, if, ifdrums, incoming, industrial, insect, invaders, jazz, jungbass, jungle, juno, jvbass, koy, kurt, latibro, led, less, lighter, linnhats, lt, made, made2, mash, mash2, metal, miniyeah, monsterb, moog, mouth, mp3, msg, mt, mute, newnotes, noise, noise2, notes, numbers, oc, odx, off, outdoor, pad, padlong, pebbles, peri, perc, percsmpl, phasor, piano, pluck, popkick, pops, print, proc, procshort, psr, rave, rave2, ravemono, realclaps, reverbkick, rm, rs, sax, sd, seawolf, sequential, sf, sheffield, short, sid, sine, sitar, sn, space, speech, speechless, speakspell, spectrum, speed, speedupdown, stab, stomp, subroc3d, sugar, sundance, tabla, tabla2, tablex, tacscan, tech, techno, tink, tok, toys, trump, ul, ulgab, uxay, uxo, v, voodoo, wind, wobble, world, xmas, yeah

**Wavetables (use with oscillator functions):**
wt_digital, wt_digital_bad_day, wt_digital_basique, wt_digital_crickets, wt_digital_curses, wt_digital_echoes, wt_vgame

### Synthesizers

**Basic Waveforms:**
sawtooth, saw, square, sqr, triangle, tri, sine, sin

**Noise Generators:**
white, pink, brown, crackle

**ZZFX Synths (chiptune-style):**
z_sawtooth, z_sine, z_square, z_tan, z_triangle, z_noise, zzfx

**Special:**
pulse, supersaw, sbd, bytebeat

### Soundfonts - General MIDI Instruments

Use these for realistic instrument sounds. All start with \`gm_\` prefix:

**IMPORTANT: INCLUDE THE gm_ prefix in the sound name.** - it's "gm_flute" NOT "flute".

**Pianos & Keyboards:**
gm_piano, gm_epiano1, gm_epiano2, gm_harpsichord, gm_clavinet, gm_celesta, gm_glockenspiel, gm_music_box, gm_vibraphone, gm_marimba, gm_xylophone, gm_tubular_bells, gm_dulcimer, gm_drawbar_organ, gm_percussive_organ, gm_rock_organ, gm_church_organ, gm_reed_organ, gm_accordion, gm_harmonica, gm_bandoneon

**Guitars:**
gm_acoustic_guitar_nylon, gm_acoustic_guitar_steel, gm_electric_guitar_jazz, gm_electric_guitar_clean, gm_electric_guitar_muted, gm_overdriven_guitar, gm_distortion_guitar, gm_guitar_harmonics, gm_guitar_fret_noise

**Basses:**
gm_acoustic_bass, gm_electric_bass_finger, gm_electric_bass_pick, gm_fretless_bass, gm_slap_bass_1, gm_slap_bass_2, gm_synth_bass_1, gm_synth_bass_2

**Strings:**
gm_violin, gm_viola, gm_cello, gm_contrabass, gm_tremolo_strings, gm_pizzicato_strings, gm_orchestral_harp, gm_string_ensemble_1, gm_string_ensemble_2

**Brass:**
gm_trumpet, gm_trombone, gm_tuba, gm_muted_trumpet, gm_french_horn, gm_brass_section, gm_synth_brass_1, gm_synth_brass_2

**Woodwinds:**
gm_soprano_sax, gm_alto_sax, gm_tenor_sax, gm_baritone_sax, gm_oboe, gm_english_horn, gm_bassoon, gm_clarinet, gm_piccolo, gm_flute, gm_recorder, gm_pan_flute, gm_blown_bottle, gm_shakuhachi, gm_whistle, gm_ocarina

**Ethnic:**
gm_sitar, gm_banjo, gm_shamisen, gm_koto, gm_kalimba, gm_bagpipe, gm_fiddle, gm_shanai

**Synth Leads:**
gm_lead_1_square, gm_lead_2_sawtooth, gm_lead_3_calliope, gm_lead_4_chiff, gm_lead_5_charang, gm_lead_6_voice, gm_lead_7_fifths, gm_lead_8_bass_lead

**Synth Pads:**
gm_pad_new_age, gm_pad_warm, gm_pad_poly, gm_pad_choir, gm_pad_bowed, gm_pad_metallic, gm_pad_halo, gm_pad_sweep

**Synth FX:**
gm_fx_rain, gm_fx_soundtrack, gm_fx_crystal, gm_fx_atmosphere, gm_fx_brightness, gm_fx_goblins, gm_fx_echoes, gm_fx_sci_fi

**Percussion:**
gm_tinkle_bell, gm_agogo, gm_steel_drums, gm_woodblock, gm_taiko_drum, gm_melodic_tom, gm_synth_drum, gm_reverse_cymbal

**Vocal & Choir:**
gm_choir_aahs, gm_voice_oohs, gm_synth_choir, gm_breath_noise

**Sound Effects:**
gm_orchestra_hit, gm_telephone, gm_helicopter, gm_applause, gm_gunshot, gm_bird_tweet, gm_seashore

**Synth Strings:**
gm_synth_strings_1, gm_synth_strings_2

### Custom Samples via Shabda

Shabda lets you query sounds from freesound.org OR generate speech in any language:

**Sound Query (from freesound.org):**
\`\`\`javascript
samples('shabda:bass:4,hihat:4,rimshot:2')
s("bass hihat rimshot").n("0 1 2 3")
\`\`\`

**Text-to-Speech, Vocal Samples:**
\`\`\`javascript
samples('shabda/speech:hello,world,strudel')
s("hello world strudel")

// With language (default: en-GB) and gender (default: f)
samples('shabda/speech/fr-FR/m:bonjour,magnifique')
s("bonjour magnifique")

samples('shabda/speech/es-ES/f:hola,mundo')
s("hola mundo")
\`\`\`

**Languages available:** en-US, en-GB, fr-FR, es-ES, de-DE, it-IT, pt-BR, ru-RU, ja-JP, zh-CN, ko-KR, and many more!

### Usage Examples

**Basic drums:**
\`\`\`javascript
s("bd sd hh oh")  // Simple beat
\`\`\`

**Selecting variations:**
\`\`\`javascript
s("bd:0 bd:1 sd:0 sd:2")  // Mini-notation style
s("bd sd").n("0 1 2 3")   // Function style
\`\`\`

**Using drum machine banks:**
\`\`\`javascript
s("bd sd hh oh").bank("RolandTR808")
s("bd sd hh oh").bank("<RolandTR808 RolandTR909>")  // Alternate banks
\`\`\`

**Melodic sounds:**
\`\`\`javascript
note("c3 e3 g3").s("gm_piano")
note("a2 c3 e3").s("sawtooth").lpf(800)
note("c4 e4 g4").s("gm_violin")
\`\`\`


### Important Notes

1. **Exact names matter:** Use \`gm_violin\` not \`violin\`, \`gm_piano\` not \`piano\` (exception: \`s("piano")\` works as a shortcut)
2. **Case sensitive:** All sound names are lowercase
3. **Multiple variations:** Many sounds have multiple samples - use \`.n(0)\`, \`.n(1)\`, \`.n(2)\` etc. to access different variations
4. Only use shabda if you need to generate a unique sound or voice (rare, you should try to just use the sounds already available)

`;


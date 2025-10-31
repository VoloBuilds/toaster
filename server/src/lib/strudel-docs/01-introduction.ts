export const SECTION_INTRODUCTION = `
# Strudel Pattern Generation Reference

## Introduction$: s("bd*4").decay(0.05).sustain(0)

$: n("0 2 4 [2 0]").s("jazz").jux(rev)

.color("red")._spectrum()



$: note("<c2*4!3 [c2 eb2 g2 bb2]>").s("sawtooth").lpf(400)



.color("green")._scope()



$: stack(



  note("d ~ [f a] ~ d4 c4")/2,        // Over 2 cycles



  note("[g bb] d4 f")/3,          // Over 3 cycles



  s("bd(3,8)"),           // Euclidean 3 in 8



  s("hh(5,8)")            // Euclidean 5 in 8



).color("yellow")._scope()



$: note("<c3*4!3 [c3 eb3 g3 bb3]>").struct("x(5,16)").s("sawtooth")

  .lpf(sine.range(100, 700).slow(2)).lpq(10).distort(0.8).gain(1)

  .pan(sine.range(0, 1).slow(4)).orbit(1).color("cyan")._spectrum()



$: note("<g3*4!3 [g3 bb3 d3 f3]>").struct("x(9,16)").s("sawtooth")

  .lpf(sine.range(100, 700).slow(2)).lpq(10).distort(0.8).gain(1)

  .pan(sine.range(1, 0).slow(4)).orbit(2).color("magenta")._spectrum()



$: n("0 ~ [2 4] ~ 7 [<[9 7]!3 [5 9]>] ~ <4!3 5>").scale("C:minor").color("violet")._pianoroll()

Strudel implements the TidalCycles algorithmic pattern language in JavaScript. It allows you to create music through code using patterns, mini-notation syntax, and function chaining.

### Basic Syntax Examples
s("bd sd")
s("bd sd cp hh")

### Playing Multiple Patterns Simultaneously

There are two main ways to play multiple patterns at the same time:

**Using \`$:\` (separate pattern lines):**
$: sound("bd*4")
$: sound("hh*8")
$: note("f@2 [ab c4] f4@2 [e g]").s("piano")

**Using \`stack()\` (combine patterns):**
stack(
  sound("bd*4"),
  sound("hh*8"),
  note("f@2 [ab c4] f4@2 [e g]").s("piano")
)

Both methods achieve the same result - all patterns play simultaneously.

### Code Structure

Strudel uses function chaining:

function("pattern").chainedFunction("value")

**Example:**
note("[d f#] a <~ d4> [c# b]").s("piano")

- \`note\` and \`s\` are functions
- \`"[d f#] a <~ d4> [c# b]"\` and \`"piano"\` are arguments (parameters)
- The \`.\` creates a chain where functions execute left to right

**Important: String syntax**
- Use double quotes \`"pattern"\` or backticks \`\`pattern\`\` for mini-notation (parsed as patterns)
- Use single quotes \`'text'\` for regular strings (not parsed as patterns)
`;


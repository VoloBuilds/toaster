export const SECTION_INTRODUCTION = `
# Strudel Pattern Generation Reference

## Introduction
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

IMPORTANT: when you add new tracks, use \`$:\` to play them together at the same time (we want this!)

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


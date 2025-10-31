import { STRUDEL_SAMPLES } from '../strudel-samples/index';
// Didn't end up using this
// Generate the full song examples section by concatenating all sample songs
const generateFullSongExamples = () => {
  const header = `## Full Song Examples

These are complete, sophisticated compositions from the Strudel REPL demonstrating how to build full tracks with arrangement, variation, and musicality.

`;

  const examples = STRUDEL_SAMPLES.map(({ name, code }) => {
    return `### ${name}

\`\`\`javascript
${code.trim()}
`;
  }).join('\n');

  return header + examples;
};

export const SECTION_FULL_SONG_EXAMPLES = generateFullSongExamples();

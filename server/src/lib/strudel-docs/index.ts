// ============================================================================
// STRUDEL DOCUMENTATION - MODULAR STRUCTURE
// ============================================================================
// 
// This file combines all documentation sections into a single export.
// Each section is maintained in its own file for easier editing and updates.
//
// To modify documentation:
// 1. Edit the relevant section file (01-introduction.ts, 02-basic-concepts.ts, etc.)
// 2. The changes will automatically be included in the combined export
//
// ============================================================================

import { SECTION_INTRODUCTION } from './01-introduction.js';
import { SECTION_BASIC_CONCEPTS } from './02-basic-concepts.js';
import { SECTION_MINI_NOTATION } from './03-mini-notation.js';
import { SECTION_SOUNDS } from './04-sounds.js';
import { SECTION_NOTES } from './05-notes.js';
import { SECTION_EFFECTS } from './06-effects.js';
import { SECTION_PATTERN_TRANSFORMATIONS } from './07-pattern-transformations.js';
import { SECTION_ADVANCED_TECHNIQUES } from './08-advanced-techniques.js';
import { SECTION_COMMON_MISTAKES } from './09-common-mistakes.js';
// import { SECTION_FULL_SONG_EXAMPLES } from './10-full-song-examples.js';
import { SECTION_RECIPES } from './12-recipes.js';
import { SECTION_INSTRUCTIONS } from './13-instructions.js';
import { SECTION_AVAILABLE_SOUNDS } from './14-available-sounds.js';

// ============================================================================
// COMBINED DOCUMENTATION EXPORT (FULL)
// ============================================================================
// This is the complete documentation - use when you need comprehensive details

export const STRUDEL_DOCS = `${SECTION_INTRODUCTION}

---

${SECTION_BASIC_CONCEPTS}

---

${SECTION_MINI_NOTATION}

---

${SECTION_SOUNDS}

---

${SECTION_NOTES}

---

${SECTION_EFFECTS}

---

${SECTION_PATTERN_TRANSFORMATIONS}

---

${SECTION_ADVANCED_TECHNIQUES}

---

${SECTION_COMMON_MISTAKES}

---

${SECTION_RECIPES}


---

${SECTION_AVAILABLE_SOUNDS}

---

${SECTION_INSTRUCTIONS}

`;

// ${SECTION_FULL_SONG_EXAMPLES} // Currently left out.
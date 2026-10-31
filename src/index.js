// Public entry point for simple-suffix-array.
//
// Keeping the re-exports in a single module means consumers can import from
// 'simple-suffix-array' without knowing how the core is split internally.

export {
  buildSuffixArray,
  search,
  findAll,
  longestRepeatedSubstring,
} from './core.js';

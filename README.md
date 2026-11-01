# simple-suffix-array

Builds a sorted array of suffix start indices for a string, then uses it to find
substrings and repeated runs quickly.

```js
import {
  buildSuffixArray,
  search,
  findAll,
  longestRepeatedSubstring,
} from 'simple-suffix-array';

const text = 'banana';
const sa = buildSuffixArray(text);

// sa is [5, 3, 1, 0, 4, 2]
search(text, sa, 'ana'); // 1  (position in sa, not in text)
findAll(text, sa, 'ana'); // [1, 3]  (positions in text)
longestRepeatedSubstring(text, sa); // 'ana'
```

## Why this exists

Suffix arrays give you substring search and repetition detection without
building a trie or a suffix tree. The trade-off is that construction is O(n log n)
rather than the linear time of SA-IS, but the code stays small enough to read and
verify. For the text sizes this library targets, that is the right trade.

## The awkward edge

JavaScript strings are sequences of UTF-16 code units, and this library indexes
them that way. A character outside the Basic Multilingual Plane (an emoji, for
example) is two code units, so it counts as two positions in the suffix array and
can be split by a search. If you need code-point semantics, convert to an array
of code points first and join with a separator that does not occur in the text.

## API

- `buildSuffixArray(text)` returns a `number[]` of start indices, sorted so the
  suffix at each index is lexicographically less than the next. Throws `TypeError`
  for non-string input.
- `search(text, sa, pattern)` returns the index into `sa` of the first suffix
  starting with `pattern`, or `-1` if none does. The empty pattern returns `0`
  when `sa` is non-empty, matching the fact that the empty string is a prefix of
  every suffix.
- `findAll(text, sa, pattern)` returns every start index in `text` where `pattern`
  occurs, in ascending order. The empty pattern returns `[]`.
- `longestRepeatedSubstring(text, sa)` returns the longest substring that occurs
  at least twice, or `''` if nothing repeats. Ties are broken by the earliest
  start index, then by the shortest length, so the result is deterministic.

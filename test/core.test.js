import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSuffixArray,
  search,
  findAll,
  longestRepeatedSubstring,
} from '../src/index.js';

// Helper: the suffix array is only meaningful through its ordering, so we
// assert on the sorted suffixes rather than on raw index arrays. This keeps the
// tests robust to any valid ordering of equal suffixes (there are none in a
// suffix array of a single string, but the helper documents the invariant).
function suffixes(text, sa) {
  return sa.map((i) => text.slice(i));
}

function assertSorted(text, sa) {
  const s = suffixes(text, sa);
  for (let i = 1; i < s.length; i++) {
    assert.ok(s[i - 1] <= s[i], `suffix ${i - 1} should sort before suffix ${i}`);
  }
}

test('empty string yields an empty suffix array', () => {
  assert.deepEqual(buildSuffixArray(''), []);
});

test('single character yields a single index', () => {
  assert.deepEqual(buildSuffixArray('a'), [0]);
});

test('repeated characters produce every start index', () => {
  const sa = buildSuffixArray('aaaa');
  assert.deepEqual(sa, [3, 2, 1, 0]);
  assertSorted('aaaa', sa);
});

test('classic banana suffix array is sorted', () => {
  const text = 'banana';
  const sa = buildSuffixArray(text);
  assertSorted(text, sa);
  // The lexicographically smallest suffix is 'a' at index 5.
  assert.equal(sa[0], 5);
  assert.equal(text.slice(sa[0]), 'a');
});

test('suffix array of a string with a unique smallest suffix', () => {
  const text = 'mississippi';
  const sa = buildSuffixArray(text);
  assertSorted(text, sa);
  assert.equal(sa[0], 10); // trailing 'i'
  assert.equal(sa[1], 7); // 'ippi'
  assert.equal(sa[2], 4); // 'issippi'
});

test('search finds an existing pattern at the correct suffix-array position', () => {
  const text = 'banana';
  const sa = buildSuffixArray(text);
  const pos = search(text, sa, 'ana');
  assert.notEqual(pos, -1);
  assert.equal(text.slice(sa[pos], sa[pos] + 3), 'ana');
});

test('search returns -1 for a missing pattern', () => {
  const text = 'banana';
  const sa = buildSuffixArray(text);
  assert.equal(search(text, sa, 'xyz'), -1);
  assert.equal(search(text, sa, 'bananas'), -1);
});

test('search handles the empty pattern as the first suffix-array slot', () => {
  const text = 'banana';
  const sa = buildSuffixArray(text);
  assert.equal(search(text, sa, ''), 0);
});

test('findAll returns every occurrence in ascending index order', () => {
  const text = 'banana';
  const sa = buildSuffixArray(text);
  assert.deepEqual(findAll(text, sa, 'ana'), [1, 3]);
});

test('findAll returns an empty array when there are no matches', () => {
  const text = 'banana';
  const sa = buildSuffixArray(text);
  assert.deepEqual(findAll(text, sa, 'zzz'), []);
});

test('findAll treats the empty pattern as no match', () => {
  const text = 'banana';
  const sa = buildSuffixArray(text);
  assert.deepEqual(findAll(text, sa, ''), []);
});

test('longest repeated substring finds an overlapping repeat', () => {
  const text = 'banana';
  const sa = buildSuffixArray(text);
  assert.equal(longestRepeatedSubstring(text, sa), 'ana');
});

test('longest repeated substring returns empty when nothing repeats', () => {
  const text = 'abcde';
  const sa = buildSuffixArray(text);
  assert.equal(longestRepeatedSubstring(text, sa), '');
});

test('longest repeated substring handles a string of one character', () => {
  const text = 'x';
  const sa = buildSuffixArray(text);
  assert.equal(longestRepeatedSubstring(text, sa), '');
});

test('longest repeated substring breaks ties by earliest start index', () => {
  // 'ab' repeats at 0 and 2, 'ba' repeats at 1 and 3; both length 2.
  // The earliest start index among the ties is 0, so the answer is 'ab'.
  const text = 'abab';
  const sa = buildSuffixArray(text);
  assert.equal(longestRepeatedSubstring(text, sa), 'ab');
});

test('search and findAll agree on a pattern that spans the whole string', () => {
  const text = 'abcabcabc';
  const sa = buildSuffixArray(text);
  const pattern = 'abcabcabc';
  assert.notEqual(search(text, sa, pattern), -1);
  assert.deepEqual(findAll(text, sa, pattern), [0]);
});

test('suffix array construction rejects non-string input', () => {
  assert.throws(() => buildSuffixArray(42), TypeError);
});

test('search rejects a non-array suffix array', () => {
  assert.throws(() => search('abc', 'not an array', 'a'), TypeError);
});

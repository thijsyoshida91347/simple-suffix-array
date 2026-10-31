// Core suffix array construction and search utilities.
//
// We build the suffix array with a prefix-doubling algorithm that runs in
// O(n log n) time and uses O(n) extra space. A naive sort of all suffixes is
// O(n^2 log n) in the worst case because comparing two suffixes can take O(n)
// time; prefix doubling avoids that by ranking suffixes by their first 2^k
// characters, doubling k each round until all ranks are distinct.
//
// The array is constructed for a string given as a JavaScript string. We treat
// the string as a sequence of UTF-16 code units, which matches how `slice` and
// `charCodeAt` index it. That means astral characters (emoji, some CJK) are
// seen as two units; this is documented in the README and is the single
// interpretation this library commits to.

/**
 * Build the suffix array of `text`.
 *
 * The returned array contains every start index from 0 to `text.length - 1`
 * sorted so that the suffix starting at `result[i]` is lexicographically less
 * than the suffix starting at `result[i + 1]`.
 *
 * Why prefix doubling: it is simple enough to verify by hand, has no hidden
 * constants, and is fast enough for the text sizes this library targets. A
 * linear-time SA-IS implementation would be faster but much harder to audit.
 *
 * @param {string} text
 * @returns {number[]}
 */
export function buildSuffixArray(text) {
  if (typeof text !== 'string') {
    throw new TypeError('buildSuffixArray expects a string');
  }
  const n = text.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  // Initial ranks: one rank per distinct code unit.
  const rank = new Int32Array(n);
  const tmp = new Int32Array(n);
  const sa = new Int32Array(n);

  for (let i = 0; i < n; i++) {
    rank[i] = text.charCodeAt(i);
    sa[i] = i;
  }

  // k is the length of the prefix already compared. Start with 1 and double.
  for (let k = 1; ; k <<= 1) {
    // Sort indices by (rank[i], rank[i + k]) using a comparator. The comparator
    // is stable, but stability is not required here because the pair is a total
    // order once ranks are distinct. We still use the plain sort for clarity.
    const half = k;
    sa.sort((a, b) => {
      if (rank[a] !== rank[b]) return rank[a] - rank[b];
      const ra = a + half < n ? rank[a + half] : -1;
      const rb = b + half < n ? rank[b + half] : -1;
      return ra - rb;
    });

    // Re-rank: assign new ranks based on adjacent pairs in the sorted order.
    tmp[sa[0]] = 0;
    let classes = 1;
    for (let i = 1; i < n; i++) {
      const prev = sa[i - 1];
      const cur = sa[i];
      const prevFirst = rank[prev];
      const curFirst = rank[cur];
      const prevSecond = prev + half < n ? rank[prev + half] : -1;
      const curSecond = cur + half < n ? rank[cur + half] : -1;
      if (prevFirst !== curFirst || prevSecond !== curSecond) {
        classes++;
      }
      tmp[cur] = classes - 1;
    }
    rank.set(tmp);

    if (classes === n) break;
    // Guard against overflow on absurdly long strings; k doubles each round.
    if (k > n) break;
  }

  const result = new Array(n);
  for (let i = 0; i < n; i++) result[i] = sa[i];
  return result;
}

/**
 * Binary-search the suffix array for `pattern`.
 *
 * Returns the first index in `sa` whose suffix starts with `pattern`, or -1 if
 * no suffix does. The search is O(|pattern| log n) because each comparison is a
 * prefix test that can stop early.
 *
 * @param {string} text
 * @param {number[]} sa
 * @param {string} pattern
 * @returns {number}
 */
export function search(text, sa, pattern) {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  if (!Array.isArray(sa)) throw new TypeError('sa must be an array');
  if (typeof pattern !== 'string') throw new TypeError('pattern must be a string');
  if (pattern.length === 0) return sa.length > 0 ? 0 : -1;

  let lo = 0;
  let hi = sa.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const start = sa[mid];
    // Compare text[start..] with pattern, stopping at the pattern length.
    let cmp = 0;
    const max = pattern.length;
    for (let i = 0; i < max; i++) {
      const t = start + i < text.length ? text.charCodeAt(start + i) : -1;
      const p = pattern.charCodeAt(i);
      if (t !== p) {
        cmp = t - p;
        break;
      }
    }
    if (cmp < 0) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  if (lo >= sa.length) return -1;
  const start = sa[lo];
  if (start + pattern.length > text.length) return -1;
  for (let i = 0; i < pattern.length; i++) {
    if (text.charCodeAt(start + i) !== pattern.charCodeAt(i)) return -1;
  }
  return lo;
}

/**
 * Collect every start index where `pattern` occurs in `text`.
 *
 * The suffix array gives a contiguous run of suffixes that start with the
 * pattern, so we find the run with a lower-bound binary search and then walk
 * forward while the prefix still matches. The walk is bounded by the number of
 * matches, so the cost is O(|pattern| log n + matches * |pattern|).
 *
 * @param {string} text
 * @param {number[]} sa
 * @param {string} pattern
 * @returns {number[]}
 */
export function findAll(text, sa, pattern) {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  if (!Array.isArray(sa)) throw new TypeError('sa must be an array');
  if (typeof pattern !== 'string') throw new TypeError('pattern must be a string');
  if (pattern.length === 0) return [];

  const first = search(text, sa, pattern);
  if (first === -1) return [];

  const out = [];
  for (let i = first; i < sa.length; i++) {
    const start = sa[i];
    if (start + pattern.length > text.length) break;
    let ok = true;
    for (let j = 0; j < pattern.length; j++) {
      if (text.charCodeAt(start + j) !== pattern.charCodeAt(j)) {
        ok = false;
        break;
      }
    }
    if (!ok) break;
    out.push(start);
  }
  out.sort((a, b) => a - b);
  return out;
}

/**
 * Return the longest repeated substring of `text`, or the empty string when no
 * substring occurs twice.
 *
 * Two suffixes that are adjacent in the suffix array share the longest common
 * prefix among any pair of suffixes, so the longest repeated substring is the
 * longest common prefix of some adjacent pair. We scan adjacent pairs once,
 * which is O(n) prefix comparisons in the worst case but usually much less.
 *
 * Ties are broken by the earliest start index, then by the shortest length, so
 * the result is deterministic. The README documents this tie-break rule.
 *
 * @param {string} text
 * @param {number[]} sa
 * @returns {string}
 */
export function longestRepeatedSubstring(text, sa) {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  if (!Array.isArray(sa)) throw new TypeError('sa must be an array');
  if (text.length < 2 || sa.length < 2) return '';

  let bestLen = 0;
  let bestStart = -1;
  for (let i = 1; i < sa.length; i++) {
    const a = sa[i - 1];
    const b = sa[i];
    const max = Math.min(text.length - a, text.length - b);
    let len = 0;
    while (len < max && text.charCodeAt(a + len) === text.charCodeAt(b + len)) {
      len++;
    }
    if (len > bestLen) {
      bestLen = len;
      bestStart = a < b ? a : b;
    } else if (len === bestLen && len > 0) {
      const candidateStart = a < b ? a : b;
      if (bestStart === -1 || candidateStart < bestStart) {
        bestStart = candidateStart;
      }
    }
  }
  if (bestLen === 0 || bestStart === -1) return '';
  return text.slice(bestStart, bestStart + bestLen);
}

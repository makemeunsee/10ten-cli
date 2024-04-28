import {
  BITS_PER_GLOSS_TYPE,
  Gloss,
  GlossType,
  GlossTypes,
  RawKanjiMeta,
  RawReadingMeta,
  RawWordSense,
  WordResult,
} from '@birchill/jpdict-idb';
import { kanaToHiragana } from '@birchill/normal-jp';
import { LRUMap } from 'lru_map';

import { stripFields } from './strip-fields';
import { Overwrite } from './type-helpers';

import { DictionaryWordResult, Sense } from './search-result';
import { sortWordResults } from './word-match-sorting';

import fs from 'fs';

export class FlatFileDatabase {
  lookupCache = new LRUMap<string, Array<number>>(500);
  wordDict: string;
  wordIndex: string;

  constructor() {
    let homedir = require('os').homedir();
    this.wordDict = fs.readFileSync(homedir + '/.local/share/10ten-cli/data/words.ljson', 'utf8');
    this.wordIndex = fs.readFileSync(homedir + '/.local/share/10ten-cli/data/words.idx', 'utf8');
  }

  //
  // Searching
  //

  async getWords({
    input,
    maxResults,
  }: {
    input: string;
    maxResults: number;
  }): Promise<Array<DictionaryWordResult>> {
    let offsets = this.lookupCache.get(input);
    if (!offsets) {
      const lookupResult = findLineStartingWith({
        source: this.wordIndex,
        text: input + ',',
      });
      if (!lookupResult) {
        this.lookupCache.set(input, []);
        return [];
      }
      offsets = lookupResult.split(',').slice(1).map(Number);
      this.lookupCache.set(input, offsets);
    }

    const result: Array<DictionaryWordResult> = [];

    for (const offset of offsets) {
      const entry = JSON.parse(
        this.wordDict.substring(offset, this.wordDict.indexOf('\n', offset))
      ) as RawWordRecord;

      result.push(
        toDictionaryWordResult({ entry, matchingText: input, offset })
      );
    }

    // Sort before capping the number of results
    sortWordResults(result);
    result.splice(maxResults);

    return result;
  }

}

// Performs a binary search of a linefeed delimited string, |data|, for |text|.
function findLineStartingWith({
  source,
  text,
}: {
  source: string;
  text: string;
}): string | null {
  const tlen = text.length;
  let start = 0;
  let end: number = source.length - 1;

  while (start < end) {
    const midpoint: number = (start + end) >> 1;
    const i: number = source.lastIndexOf('\n', midpoint) + 1;

    const candidate: string = source.substring(i, i + tlen);
    if (text < candidate) {
      end = i - 1;
    } else if (text > candidate) {
      start = source.indexOf('\n', midpoint + 1) + 1;
    } else {
      return source.substring(i, source.indexOf('\n', midpoint + 1));
    }
  }

  return null;
}

// This type matches the structure of the records in the flat file database
// (which, incidentally, differ slightly from the data format used by jpdict-idb
// since, for example, they don't include the ID field).
//
// As a result it is only used as part of the fallback mechanism.

interface RawWordRecord {
  k?: Array<string>;
  km?: Array<0 | RawKanjiMeta>;
  r: Array<string>;
  rm?: Array<0 | RawReadingMeta>;
  s: Array<RawWordSense>;
}

function toDictionaryWordResult({
  entry,
  matchingText,
  offset,
}: {
  entry: RawWordRecord;
  matchingText: string;
  offset: number;
}): DictionaryWordResult {
  const kanjiMatch =
    !!entry.k && entry.k.some((k) => kanaToHiragana(k) === matchingText);
  const kanaMatch =
    !kanjiMatch && entry.r.some((r) => kanaToHiragana(r) === matchingText);

  return {
    id: offset,
    k: mergeMeta(entry.k, entry.km, (key, meta) => ({
      ent: key,
      ...meta,
      match:
        (kanjiMatch && kanaToHiragana(key) === matchingText) || !kanjiMatch,
      matchRange:
        kanaToHiragana(key) === matchingText ? [0, key.length] : undefined,
    })),
    r: mergeMeta(entry.r, entry.rm, (key, meta) => ({
      ent: key,
      ...meta,
      match: (kanaMatch && kanaToHiragana(key) === matchingText) || !kanaMatch,
      matchRange:
        kanaToHiragana(key) === matchingText ? [0, key.length] : undefined,
    })),
    s: expandSenses(entry.s),
  };
}

type WithExtraMetadata<T> = Overwrite<
  T,
  {
    wk: WordResult['k'][0]['wk'];
    bv: WordResult['k'][0]['bv'];
    bg: WordResult['k'][0]['bv'];
  }
>;

function mergeMeta<MetaType extends RawKanjiMeta | RawReadingMeta, MergedType>(
  keys: Array<string> | undefined,
  metaArray: Array<0 | MetaType> | undefined,
  merge: (key: string, meta?: WithExtraMetadata<MetaType>) => MergedType
): Array<MergedType> {
  const result: Array<MergedType> = [];

  for (const [i, key] of (keys || []).entries()) {
    const meta: MetaType | undefined =
      metaArray && metaArray.length >= i + 1 && metaArray[i] !== 0
        ? (metaArray[i] as MetaType)
        : undefined;

    // The following is taken from jpdict-idb's `makeWordResult` function.
    //
    // WaniKani levels are stored in the `p` (priority) field for simplicity
    // in the form `wk{N}` where N is the level number.
    // We need to extract any such levels and store them in the `wk` field
    // instead.
    //
    // Likewise for Bunpro levels which need to be combined with an `bv` /
    // `bg` fields since these contain the original source text for a fuzzy
    // match.
    let wk: number | undefined;
    let bv: number | undefined;
    let bg: number | undefined;

    const p = meta?.p?.filter((p) => {
      if (/^wk\d+$/.test(p)) {
        const wkLevel = parseInt(p.slice(2), 10);
        if (typeof wk === 'undefined' || wkLevel < wk) {
          wk = wkLevel;
        }
        return false;
      }

      if (/^bv\d+$/.test(p)) {
        const bvLevel = parseInt(p.slice(2), 10);
        if (typeof bv === 'undefined' || bvLevel < bv) {
          bv = bvLevel;
        }
        return false;
      }

      if (/^bg\d+$/.test(p)) {
        const bgLevel = parseInt(p.slice(2), 10);
        if (typeof bg === 'undefined' || bgLevel < bg) {
          bg = bgLevel;
        }
        return false;
      }

      return true;
    });

    if (p?.length) {
      meta!.p = p;
    } else {
      delete meta?.p;
    }

    const extendedMeta = meta as WithExtraMetadata<MetaType> | undefined;

    if (wk) {
      extendedMeta!.wk = wk;
    }

    if (typeof bv === 'number') {
      extendedMeta!.bv = Object.assign(
        { l: bv },
        meta?.bv ? { src: meta?.bv } : undefined
      );
    }

    if (typeof bg === 'number') {
      extendedMeta!.bg = Object.assign(
        { l: bg },
        meta?.bg ? { src: meta?.bg } : undefined
      );
    }

    result.push(merge(key, extendedMeta));
  }

  return result;
}

function expandSenses(senses: Array<RawWordSense>): Array<Sense> {
  return senses.map((sense) => ({
    g: expandGlosses(sense),
    ...stripFields(sense, ['g', 'gt']),
    match: true,
  }));
}

function expandGlosses(sense: RawWordSense): Array<Gloss> {
  // Helpers to work out the gloss type
  const gt = sense.gt || 0;
  const typeMask = (1 << BITS_PER_GLOSS_TYPE) - 1;
  const glossTypeAtIndex = (i: number): GlossType => {
    return GlossTypes[(gt >> (i * BITS_PER_GLOSS_TYPE)) & typeMask];
  };

  return sense.g.map((gloss, i) => {
    // This rather convoluted mess is because our test harness differentiates
    // between properties that are not set and those that are set to
    // undefined.
    const result: Gloss = { str: gloss };

    const type = glossTypeAtIndex(i);
    if (type !== 'none') {
      result.type = type;
    }

    return result;
  });
}

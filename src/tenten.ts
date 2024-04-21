import {
  // getKanji,
  getWords as idbGetWords,
  JpdictIdb,
} from '@birchill/jpdict-idb';

import {
  // KanjiSearchResult,
  // NameSearchResult,
  TranslateResult,
  WordSearchResult,
} from './search-result';

import { normalizeInput } from './normalize-input';

import { GetWordsFunction, wordSearch } from './word-search';

import fs from 'fs';

import "fake-indexeddb/auto";

type FetchResponse = {
  status: number,
  ok: boolean,
  json: () => any,
  body: any,
}

declare global {
  function fetch(resource: any): any;
}

global.fetch = function(resource: any): any {
  let resource_str = resource.toString();
  console.log("my fetch for " + resource);
  if (resource_str.endsWith("version-en.json")) {
    let version = fs.readFileSync('./data/jpdict/reader/version-en.json', 'utf8');
    const resp: FetchResponse = {
      status: 200,
      ok: true,
      json: () => JSON.parse(version),
      body: undefined,
    };
    return resp;
  } else {
    const BASE_URL_OFFSET = "https://data.10ten.life/jpdict/reader/".length;
    let buffer = fs.readFileSync('./data/' + resource_str.substring(BASE_URL_OFFSET), 'utf8');
    const resp: FetchResponse = {
      status: 200,
      ok: true,
      json: () => undefined,
      body: new Response(buffer).body,
    };
    return resp;
  }
}

export async function initDb(): Promise<void> {
    var db = new JpdictIdb({ verbose: true });

    console.log("waiting DB ready");
    await db.ready;

    console.log("DB ready")
    console.log("loading words");
    await db.update({series: 'words', lang: 'en'});
    console.log("words loaded")
    console.log("loading kanji");
    await db.update({series: 'kanji', lang: 'en'});
    console.log("kanji loaded")
    // console.log("loading names");
    // await db.update({series: 'names', lang: 'en'});
    // console.log("names loaded");
}

const WORDS_MAX_ENTRIES = 7;

export async function searchWords({
  input,
  abortSignal,
  includeRomaji = false,
  max = 0,
}: {
  input: string;
  abortSignal?: AbortSignal;
  includeRomaji?: boolean;
  max?: number;
}): Promise<WordSearchResult | null> {
  let [word, inputLengths] = normalizeInput(input);

  const maxResults =
    max > 0 ? Math.min(WORDS_MAX_ENTRIES, max) : WORDS_MAX_ENTRIES;

  // Determine which dictionary to use: The IndexedDB one or the flat-file
  // fallback dictionary.
  let getWords: GetWordsFunction;
  // const dbStatus = getDataSeriesStatus('words');
  getWords = ({ input, maxResults }: { input: string; maxResults: number }) =>
    idbGetWords(input, { matchType: 'exact', limit: maxResults });

  return await wordSearch({
    abortSignal,
    getWords,
    input: word,
    inputLengths,
    maxResults,
    includeRomaji,
  });
}

// ---------------------------------------------------------------------------
//
// Translate
//
// ---------------------------------------------------------------------------

export async function translate({
  text,
  includeRomaji = false,
}: {
  text: string;
  includeRomaji?: boolean;
}): Promise<TranslateResult | null> {
  const result: TranslateResult = {
    type: 'translate',
    data: [],
    textLen: text.length,
    more: false,
  };

  let skip: number;
  while (text.length > 0) {
    const searchResult = await searchWords({
      input: text,
      max: 1,
      includeRomaji,
    });

    if (searchResult && searchResult.data) {
      if (result.data.length >= WORDS_MAX_ENTRIES) {
        result.more = true;
        break;
      }

      // Just take first match
      result.data.push(searchResult.data[0]);
      skip = searchResult.matchLen;
    } else {
      skip = 1;
    }

    text = text.substring(skip);
  }

  if (result.data.length === 0) {
    return null;
  }

  result.textLen -= text.length;
  return result;
}

// ---------------------------------------------------------------------------
//
// Kanji
//
// ---------------------------------------------------------------------------

// export async function searchKanji(
//   input: string
// ): Promise<KanjiSearchResult | null | 'unavailable' | 'updating'> {
//   const kanjiStatus = getDataSeriesStatus('kanji');
//   const radicalStatus = getDataSeriesStatus('radicals');
//   if (kanjiStatus === 'unavailable' || radicalStatus === 'unavailable') {
//     return 'unavailable';
//   }

//   if (kanjiStatus === 'updating' || radicalStatus === 'updating') {
//     return 'updating';
//   }

//   // Do some very elementary filtering on kanji
//   //
//   // We know that the input should be mostly Japanese so we just do some very
//   // basic filtering to drop any hiragana / katakana.
//   //
//   // We _could_ do a more thoroughgoing check based on all the different Unicode
//   // ranges but they're constantly being expanded and if some obscure character
//   // ends up in the kanji database we want to show it even if it doesn't match
//   // our expectations of what characters are kanji.
//   const kanjiLastIndex = new Map<string, number>();
//   const kanji = [
//     ...new Set(
//       [...input].filter((c, i) => {
//         const cp = c.codePointAt(0)!;
//         const isKanji =
//           // Don't bother looking up Latin text
//           cp >= 0x3000 &&
//           // Or hiragana (yeah, 0x1b0001 is also hiragana but this is good enough)
//           !(cp >= 0x3040 && cp <= 0x309f) &&
//           // Or katakana
//           !(cp >= 0x30a0 && cp <= 0x30ff) &&
//           !(cp >= 0x31f0 && cp <= 0x31ff) &&
//           // Or half-width katakana
//           !(cp >= 0xff65 && cp <= 0xff9f);
//         if (isKanji) {
//           kanjiLastIndex.set(c, i);
//         }

//         return isKanji;
//       })
//     ),
//   ];

//   const logWarningMessage = (message: string) => {
//     // Ignore certain warnings that are not currently meaningful
//     if (message.startsWith("Couldn't find a radical or kanji entry for")) {
//       return;
//     }

//     void Bugsnag.notify(message, { severity: 'warning' });
//   };

//   let result;
//   try {
//     result = await getKanji({
//       kanji,
//       lang: dbState.kanji.version?.lang ?? 'en',
//       logWarningMessage,
//     });
//   } catch (e) {
//     console.error('Error looking up kanji', e);
//     void Bugsnag.notify(e || '(Error looking up kanji)');
//     return null;
//   }

//   if (!result.length) {
//     return null;
//   }

//   // Work out what the last matched character was
//   const matchLen =
//     Math.max(...result.map((r) => kanjiLastIndex.get(r.c) || 0)) + 1;

//   return { type: 'kanji', data: result, matchLen };
// }

// ---------------------------------------------------------------------------
//
// Names
//
// ---------------------------------------------------------------------------

// const NAMES_MAX_ENTRIES = 20;

// export async function searchNames({
//   abortSignal,
//   input,
//   minLength,
// }: {
//   abortSignal?: AbortSignal;
//   input: string;
//   minLength?: number;
// }): Promise<NameSearchResult | null | 'unavailable' | 'updating'> {
//   const dbStatus = getDataSeriesStatus('names');
//   if (dbStatus !== 'ok') {
//     return dbStatus;
//   }

//   const [normalized, inputLengths] = normalizeInput(input);

//   return nameSearch({
//     abortSignal,
//     input: normalized,
//     inputLengths,
//     minInputLength: minLength,
//     maxResults: NAMES_MAX_ENTRIES,
//   });
// }

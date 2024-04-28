#! /usr/bin/env node

import { Command } from "commander";
import figlet from 'figlet';
import { translate } from "./tenten";
import { filterRelevantKanaHeadwords, filterRelevantKanjiHeadwords, serializeDefinition } from "./copy-text";

const program = new Command();

program
  .version("1.0.0")
  .description("An example CLI for managing a directory")
  .option("-t, --translate <text>", "translate text from Japanese")
  .option("-a, --all", "include all senses")
  .parse(process.argv);

const options = program.opts();

if (options.translate) {
  const includeAllSenses = options.all ? true : false;
  const text = options.translate;
  console.log(text);
  translate({text: text}).then(translation_result => {
    if (!translation_result) {
      console.log("no translation found");
      return;
    }
    let result: string = '';
    for (const word_result of translation_result.data) {
      if (result) {
        result += '\n';
      }
      const kanjiHeadwords = word_result.k
        ? filterRelevantKanjiHeadwords(word_result.k, {
            includeLessCommonHeadwords: true,
          }).map((k) => k.ent)
        : [];
      const kanaHeadwords = filterRelevantKanaHeadwords(word_result.r, {
        includeLessCommonHeadwords: true,
      }).map((r) => r.ent);

      result += kanjiHeadwords.length
        ? `${kanjiHeadwords.join(', ')} [${kanaHeadwords.join(', ')}]`
        : kanaHeadwords.join(', ');
      if (word_result.romaji?.length) {
        result += ` (${word_result.romaji.join(', ')})`;
      }

      result +=
        (includeAllSenses ? '\n' : ' ') +
        serializeDefinition(word_result, {
          includeAllSenses: includeAllSenses,
          includePartOfSpeech: true,
          oneSensePerLine: true,
        });
      if (word_result.reason) {
        result += ' - ';
        result += word_result.reason;
      }
    }
    // console.log(inspect(result, {depth: null}));
    console.log(result);
   });
} else {
  console.log(figlet.textSync("10ten CLI", "Ogre"));
  program.help();
}


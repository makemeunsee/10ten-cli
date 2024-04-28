#! /usr/bin/env node

import { Command } from "commander";
import figlet from 'figlet';
import { translate } from "./tenten";
import util from 'util';

const program = new Command();

program
  .version("1.0.0")
  .description("An example CLI for managing a directory")
  .option("-t, --translate <text>", "translate text from Japanese")
  .parse(process.argv);

const options = program.opts();

if (options.translate) {
  const text = options.translate;
  console.log(text);
  translate({text: text}).then(r =>
    console.log(util.inspect(r, {depth: null}))
  );
} else {
  console.log(figlet.textSync("10ten CLI", "Ogre"));
  program.help();
}


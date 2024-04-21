#! /usr/bin/env node

// import path from "path";

import "fake-indexeddb/auto";

// const IndexedDB = require('indexeddb');
// const Destructible = require('destructible');

// const destructible = new Destructible('indexeddb.readme.t');

// const indexedDB = IndexedDB.create(destructible, path.join(__dirname, 'tmp', 'readme'));

import { Command } from "commander";
import figlet from 'figlet';
import { initDb, translate } from "./tenten";

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
  initDb().then(r => {
    console.log("translating");
    translate({text: text}).then(r =>
      console.log("translated: " + r)
    );
  });
} else {
  console.log(figlet.textSync("10ten CLI", "Ogre"));
  program.help();
}


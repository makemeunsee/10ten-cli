#! /usr/bin/env node

// import fs from "fs";
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

// async function listDirContents(filepath: string) {
//   try {
//     const files = await fs.promises.readdir(filepath);
//     const detailedFilesPromises = files.map(async (file: string) => {
//       let fileDetails = await fs.promises.lstat(path.resolve(filepath, file));
//       const { size, birthtime } = fileDetails;
//       return { filename: file, "size": size, created_at: birthtime };
//     });
//     const detailedFiles = await Promise.all(detailedFilesPromises);
//     console.table(detailedFiles);
//   } catch (error) {
//     console.error("Error occurred while reading the directory!", error);
//   }
// }

if (options.translate) {
  initDb();
  const text = options.translate;
  console.log(text);
  translate({text: text});
} else {
  console.log(figlet.textSync("10ten CLI", "Ogre"));
  program.help();
}


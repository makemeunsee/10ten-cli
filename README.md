# CLI port 10ten, heavy WIP

## Pre-requisites

A snapshot of 10ten's words database, available under `~/.local/share/10ten-cli/data/`.  
See https://github.com/birchill/10ten-ja-reader/tree/main/data.

## Building

```sh
npm run build
```

## Installing

```sh
npm install . -g
```

## Running

```sh
# after installing
ten10-cli -t 行きましょう

# or after just building
node dist/index.js -t 優勝
```

## Limitations

* Only word translation works so far, no kanji details lookup.
* Output is not groomed

## License

So far, most of the code is re-used from [`10ten-ja-reader`](https://github.com/birchill/10ten-ja-reader), under GPL3 licensing.  
GPL3 applies to all code within this code.

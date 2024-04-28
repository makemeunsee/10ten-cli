# 10ten-cli

## Description

`10ten-cli` is a modification of the [10ten browser extension](https://github.com/birchill/10ten-ja-reader/), to turn it into Command Line Interface (CLI) tool.

Its intended purpose is on the fly translation of screen space Japanese text (e.g. in an image or in a video game), through its composition with other CLI tools (most notably [`tesseract`](https://github.com/tesseract-ocr/tesseract)).

## Demo

https://github.com/makemeunsee/10ten-cli/assets/180648/cca971ab-6ac4-4861-8570-3e131ab2f5bb

## Pre-requisites

* `node`, version 18+
* A snapshot of `10ten`'s words database, stored in the `~/.local/share/10ten-cli/data/` directory.  
The required files are packaged with the original `10ten`: https://github.com/birchill/10ten-ja-reader/tree/main/data.

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
ten10-cli -h
ten10-cli -t 行きましょう
ten10-cli -t 行きましょう -a

# or after just building
node dist/index.js -t 優勝 -a
```

## Screen space translation

Combining `10ten-cli` with [screen capture](https://github.com/naelstrof/maim), [image processing](https://imagemagick.org/) and [OCR](https://github.com/tesseract-ocr/tesseract), a crude yet effective screen space translation can be assembled:

```bash
#!/bin/bash

maim -s |
mogrify -modulate 100,0 -resize 200% png:- |
tesseract -l jpn - - |
tr -d " " |
xclip -selection clipboard -i

TEXT=$(xclip -selection clipboard -o)
notify-send -a "10ten-cli" " " "$(ten10-cli -a -t $TEXT)"

exit
```

[`dunst`](https://dunst-project.org/) is used as notification daemon in the demo above.

## Limitations

* Only word translation are supported yet, not the kanji details lookup or other more advanced features of 10ten.

## License

So far, most of the code is re-used from [`10ten-ja-reader`](https://github.com/birchill/10ten-ja-reader), under GPL3 licensing.  
GPL3 applies to all code within this repo.

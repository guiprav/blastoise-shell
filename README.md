# Blastoise Shell

Blastoise Shell is an easy way to setup child process
pipelines, execute them, and easily interact with their
standard streams. A lot like Bash, but using Node.

Installation:

```
$ npm install --save blastoise-shell
```

Quick example:

```js
let { cat, echo, rm, vim } = require('blastoise-shell');

async function main() {
    let fileName = 'hello.txt';

    await echo(`Hello, world!`)
        .map(x => x.replace('Hello', 'Hi'))
        .sed('s/world/folks/')
        .writeTo(fileName);

    await vim(fileName);

    await echo(`File contents after editing:`);
    await cat(fileName);

    await rm(fileName);
}

main().catch(console.error);
```

For a more complete example, check out [example.js](example.js).

For the complete API reference, check out the
[documentation](https://github.com/n2liquid/blastoise-shell/wiki/Where-is-the-documentation%3F).

## License

Blastoise Shell is free software: you can redistribute it and/or modify it under the terms of the [MIT license](COPYING).

## Exclusion of warranty

Blastoise Shell is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [COPYING](COPYING) for more details.

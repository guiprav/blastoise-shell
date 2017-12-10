# blastoise-shell

Blastoise Shell is an easy way to setup child process
pipelines, execute them, and easily interact with their
standard streams. A lot like Bash, but using Node.

Check out the [documentation](https://github.com/n2liquid/blastoise-shell/wiki/Where-is-the-documentation%3F).

Example:
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

## License

blastoise-shell is free software: you can redistribute it and/or modify it under the terms of the [MIT license](COPYING).

## Exclusion of warranty

blastoise-shell is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [COPYING](COPYING) for more details.

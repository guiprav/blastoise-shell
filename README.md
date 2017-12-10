# blastoise-shell

Blastoise Shell is an easy way to setup child process
pipelines, execute them, and easily interact with their
standard streams, kind of like Bash, but using Node.

[Documentation](https://github.com/n2liquid/blastoise-shell/wiki/Where-is-the-documentation%3F).

[example.js](example.js) output:

```
$ echo "Hello, world." | sed "s/world/my friend/"
Hello, my friend.

$ echo "Hello, world." >> hellos

$ vim hellos

$ cat hellos # With console.log(await cat(...).toString())
Hello, world.
This line was manually added using vim.

$ cat example.js | grep example
  await echo(`$ cat example.js | grep example`);
  await cat('example.js').grep('example');

$ notify-send "i hackz ur computerz"

$ git show HEAD | head -n 1
commit 8d0fff98ba15b792225dfe8f0484f74db6a64a0d

$ git diff --cached | head -n 1

$ git diff | head -n 1
diff --git a/example.js b/example.js
```

## License

blastoise-shell is free software: you can redistribute it and/or modify it under the terms of the [MIT license](COPYING).

## Exclusion of warranty

blastoise-shell is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [COPYING](COPYING) for more details.

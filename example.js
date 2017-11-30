let sh = require('./lib');

async function main() {
  // This is never run due to lazy promise behavior:
  /* await */ sh.invalidCommand().toString();

  await sh.echo(`$ echo "Hello, world." | sed "s/world/my friend/"`);
  await sh.echo('Hello, world.').sed('s/world/my friend/');
  await sh.echo();

  await sh.setGlobals();

  await echo(`$ echo "Hello, world." >> hellos`);
  await echo('Hello, world.').appendTo('hellos');
  await echo();

  await echo(`$ vim hellos`);
  await vim('hellos');
  await echo();

  await echo(`$ cat hellos # With console.log(await cat(...).toString())`);
  console.log(await cat('hellos').toString());

  await echo(`$ cat example.js | grep example`);
  await cat('example.js').grep('example');
  await echo();

  await echo(`$ notify-send "i hackz ur computerz"`);
  await sh('notify-send', `i hackz ur computerz`);
  await echo();

  await echo(`$ git show HEAD | head -n 1`);
  await git('show', 'HEAD').head({ n: 1 });
  await echo();

  await echo(`$ git diff --cached | head -n 1`);
  await git('diff', { cached: true }).head({ n: 1 });
  await echo();

  await echo(`$ git diff | head -n 1`);
  await git('diff', { cached: false }).head({ n: 1 });
  await echo();
}

main().catch(console.error);

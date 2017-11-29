let sh = require('./lib');

async function main() {
  await sh.setGlobals();

  await echo(`$ echo "Hello, world." | sed "s/world/my friend/"`);
  await echo('Hello, world.').sed('s/world/my friend/');
  await echo();

  await echo(`$ echo "Hello, world." >> hellos`);
  await echo('Hello, world.').appendTo('hellos');
  await echo();

  await echo(`$ cat hellos`);
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

  await echo(`$ git diff --cached`);
  await git('diff', { cached: true });
  await echo();

  await echo(`$ git diff`);
  await git('diff', { cached: false });
  await echo();

  process.exit();
}

main().catch(console.error);

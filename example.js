let sh = require('./lib');

let log = console.log;

async function main() {
  log(`$ echo "Hello, world." | sed "s/world/my friend/"`);
  await sh.echo('Hello, world.').sed('s/world/my friend/');
  log();

  log(`$ echo "Hello, world." >> hellos`);
  await sh.echo('Hello, world.').appendTo('hellos');
  log();

  log(`$ cat hellos`);
  log(await sh.cat('hellos').toString());

  log(`$ cat example.js | grep example`);
  await sh.cat('example.js').grep('example');
  log();

  log(`$ notify-send "i hackz ur computerz"`);
  await sh('notify-send', `i hackz ur computerz`);
  log();

  log(`$ git show HEAD | head -n 1`);
  await sh.git('show', 'HEAD').head({ n: 1 });
  log();

  log(`$ git diff --cached`);
  await sh.git('diff', { cached: true });
  log();

  log(`$ git diff`);
  await sh.git('diff', { cached: false });
  log();

  process.exit();
}

main().catch(console.error);

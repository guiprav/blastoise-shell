let sh = require('./lib');

async function main() {
  // echo "Hello, world." | sed "s/world/my friend/"
  await sh.echo('Hello, world.').sed('s/world/my friend/');

  // echo "Hello, world." >> hellos
  await sh.echo('Hello, world.').appendTo('hellos');

  // cat hellos
  console.log(await sh.cat('hellos').toString());

  // cat example.js | grep example
  await sh.cat('example.js').grep('example');

  // notify-send "i hackz ur computerz"
  await sh('notify-send', `i hackz ur computerz`);

  // git show HEAD | head -n 1
  await sh.git('show', 'HEAD').head('-n', 1);

  process.exit();
}

main().catch(console.error);

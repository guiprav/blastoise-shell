let sh = require('blastoise-shell');

async function main() {
  await sh.echo('Hello, world.').sed('s/world/my friend/');
  await sh.cat('example.js').grep('example');
  await sh('notify-send', `i hackz ur computerz`);
}

main().catch(console.error);

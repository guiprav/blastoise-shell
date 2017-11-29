let sh = require('blastoise-shell');

async function main() {
  await sh.cat('example.js').grep('example');
}

main().catch(console.error);

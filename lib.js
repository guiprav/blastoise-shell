let cp = require('child_process');

let knownCmds = [
  'cat', 'cd', 'chmod', 'cp', 'echo', 'find', 'grep',
  'head', 'ln', 'ls', 'mkdir', 'mv', 'pwd', 'rm', 'sed',
  'sort', 'tail', 'touch', 'uniq', 'which',
];

exports = module.exports = (cmd, ...args) => {
  let proc = cp.spawn(cmd, args);

  let p = new Promise((resolve, reject) => {
    proc.on('error', reject);

    proc.on('exit', (code, sig) => {
      if (code === 0) {
        return resolve(code);
      }

      if (code === null) {
        return reject(new Error(`Terminated by signal ${sig}`));
      }

      reject(new Error(`Exitted with code ${code}`));
    });
  });

  p.proc = proc;

  p.pipe = (...args) => {
    let pNext = exports(...args);

    proc.stdout.pipe(pNext.proc.stdin);

    proc.stdout.isPiped = true;
    pNext.proc.stdin.isPiped = true;

    return pNext;
  };

  knownCmds.forEach(x => {
    p[x] = (...args) => p.pipe(x, ...args);
  });

  setTimeout(() => {
    ['stdin', 'stdout', 'stderr'].forEach(
      x => !proc[x].isPiped && proc[x].pipe(process[x])
    );
  }, 0);

  return p;
};

knownCmds.forEach(x => {
  exports[x] = (...args) => exports(x, ...args);
});

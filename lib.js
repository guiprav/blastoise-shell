let cp = require('child_process');

let exec = (cmd, ...args) => {
  let proc = cp.spawn(cmd, args);

  let p = new Promise((resolve, reject) => {
    proc.on('error', reject);

    proc.on('exit', (code, sig) => {
      if (code === 0) {
        return resolve(code);
      }

      if (code === null) {
        return reject(new Error(`${cmd} terminated by signal ${sig}`));
      }

      reject(new Error(`${cmd} exitted with code ${code}`));
    });
  });

  p.proc = proc;

  p.pipe = (...args) => {
    let pNext = exec(...args);

    proc.stdout.pipe(pNext.proc.stdin);

    proc.stdout.isPiped = true;
    pNext.proc.stdin.isPiped = true;

    return pNext;
  };

  setTimeout(() => {
    ['stdin', 'stdout', 'stderr'].forEach(
      x => !proc[x].isPiped && proc[x].pipe(process[x])
    );
  }, 0);

  return new Proxy(p, {
    get: (_, k) => {
      if (k === 'then') {
        return p.then.bind(p);
      }

      return p[k] || ((...args) => p.pipe(k, ...args));
    },
  });
};

module.exports = new Proxy(exec, {
  get: (_, k) => {
    if (k === 'then') {
      return p.then.bind(p);
    }

    return exec[k] || ((...args) => exec(k, ...args));
  },
});

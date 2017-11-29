let cp = require('child_process');
let fs = require('fs');

let streamToString = require('stream-to-string');

let exec = (cmd, ...args) => {
  args = args.map(x => {
    if (typeof x === 'string') {
      return x;
    }

    return Object.entries(x).map(([k, v]) => {
      if (v === false) {
        return [];
      }

      k = `-${k}`;

      if (k.length !== 2) {
        k = `-${k}`;
      }

      if (v === true) {
        return k;
      }

      return [k, v];
    });
  })
  .reduce((a, b) => a.concat(b), [])
  .reduce((a, b) => a.concat(b), []);

  let proc = cp.spawn(cmd, args);

  let p = new Promise((resolve, reject) => {
    proc.on('error', reject);

    proc.on('exit', (code, sig) => {
      if (!exec.errExit) {
        return resolve(code !== null ? code : sig);
      }

      if (code === 0) {
        return resolve(code);
      }

      if (code === null) {
        return reject(new Error(`${cmd} terminated by signal ${sig}`));
      }

      reject(new Error(`${cmd} exitted with code ${code}`));
    });
  });

  p = Promise.all([
    p, new Promise((resolve, reject) => {
      proc.stdout.on('error', reject);
      proc.stdout.on('finish', resolve);
    }),
  ])
  .then(xs => xs[0]);

  p.proc = proc;

  p.pipe = (...args) => {
    let pNext = exec(...args);

    proc.stdout.pipe(pNext.proc.stdin);

    proc.stdout.isPiped = true;
    pNext.proc.stdin.isPiped = true;

    return pNext;
  };

  p.appendTo = path => new Promise((resolve, reject) => {
    let fileStream = fs.createWriteStream(path, {
      flags: 'a',
    });

    proc.stdout.pipe(fileStream);
    proc.stdout.isPiped = true;

    fileStream.on('error', reject);
    fileStream.on('finish', resolve);
  });

  p.writeTo = path => new Promise((resolve, reject) => {
    let fileStream = fs.createWriteStream(path);

    proc.stdout.pipe(fileStream);
    proc.stdout.isPiped = true;

    fileStream.on('error', reject);
    fileStream.on('finish', resolve);
  });

  p.toString = () => {
    let ret = streamToString(proc.stdout);
    proc.stdout.isPiped = true;

    return ret;
  };

  p.errToString = () => {
    let ret = streamToString(proc.stderr);
    proc.stderr.isPiped = true;

    return ret;
  };

  process.nextTick(() => {
    if (!proc.stdin.isPiped) {
      process.stdin.pipe(proc.stdin);
      proc.stdin.isPiped = true;
    }

    ['stdout', 'stderr'].forEach(x => {
      if (proc[x].isPiped) {
        return;
      }

      proc[x].pipe(process[x]);
      proc[x].isPiped = true;
    });
  });

  return new Proxy(p, {
    get: (_, k) => {
      if (k === 'then') {
        return p.then.bind(p);
      }

      return p[k] || ((...args) => p.pipe(k, ...args));
    },
  });
};

exec.errExit = true;

let lastCmdSet = [];

exec.setGlobals = async () => {
  let compgen = exec('bash', '-c', 'compgen -c');
  let cmdSet = (await compgen.toString()).split('\n');

  let newCmds = cmdSet.filter(x => !lastCmdSet.includes(x));
  let lostCmds = cmdSet.filter(x => lastCmdSet.includes(x));

  newCmds.forEach(x => {
    global[x] = (...args) => exec(x, ...args);
  });

  lostCmds.forEach(x => delete global[x]);

  lastCmdSet = cmdSet;
};

module.exports = new Proxy(exec, {
  get: (_, k) => {
    if (k === 'then') {
      return p.then.bind(p);
    }

    return exec[k] || ((...args) => exec(k, ...args));
  },
});

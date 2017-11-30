let cp = require('child_process');
let fs = require('fs');

let streamToString = require('stream-to-string');

let expandArgs = require('./expandArgs');

let instanceProxyHandlers = {
  get: (exec, k) => {
    let v = exec[k];

    if (typeof v === 'function') {
      return v.bind(exec);
    }

    return exec[k] || ((...args) => exec.pipe(k, ...args));
  },
};

class BlastoiseProcExec extends Promise {
  constructor(cmd, args) {
    super(resolve => resolve());

    this.cmd = cmd;
    this.args = expandArgs(args);

    this.spawnConf = {
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    };

    this.proc = null;
  }

  pipe(target, ...rest) {
    if (typeof target === 'string') {
      return this.pipeExec(target, ...rest);
    }

    throw new Error(`Not implemented`);
  }

  pipeExec(cmd, ...args) {
    let eNext = exec(cmd, ...args);

    this.spawnConf.stdout = eNext;
    eNext.spawnConf.stdin = this;

    return eNext;
  }

  start() {
    if (this.promise) {
      return this.promise;
    }

    let { stdin, stdout, stderr } = this.spawnConf;

    let pOthers = [];

    if (typeof stdin === 'object') {
      stdin.spawnConf.stdout = 'pipe';
      pOthers.push(stdin.start());
    }

    let proc = this.proc = cp.spawn(this.cmd, this.args, {
      stdio: [stdin, stdout, stderr].map(x => {
        if (typeof x !== 'object') {
          return x;
        }

        return 'pipe';
      }),
    });

    if (typeof stdin === 'object') {
      stdin.proc.stdout.pipe(proc.stdin);
    }

    let pProcDone = new Promise((resolve, reject) => {
      proc.on('error', reject);

      proc.on('exit', (code, sig) => {
        if (!exec.throwOnError) {
          return resolve(code !== null ? code : sig);
        }

        if (code === 0) {
          return resolve(code);
        }

        if (code === null) {
          return reject(new Error(
            `${this.cmd} terminated by signal ${sig}`
          ));
        }

        reject(new Error(
          `${this.cmd} exitted with code ${code}`
        ));
      });
    });

    let pPipesFinished = ['stdout', 'stderr'].map(
      x => new Promise((resolve, reject) => {
        if (!proc[x]) {
          return resolve();
        }

        proc[x].on('error', reject);
        proc[x].on('finish', resolve);
      })
    );

    let pAllDone = Promise.all([
      pProcDone, ...pPipesFinished, ...pOthers,
    ])
    .then(xs => xs[0]);

    return this.promise = new Proxy(
      pAllDone, instanceProxyHandlers
    );
  }

  appendTo(path) {
    this.spawnConf.stdout = 'pipe';

    return Promise.all([
      this.start(), new Promise((resolve, reject) => {
        let fileStream = fs.createWriteStream(path, {
          flags: 'a',
        });

        this.proc.stdout.pipe(fileStream);

        fileStream.on('error', reject);
        fileStream.on('finish', resolve);
      }),
    ]);
  }

  toString() {
    this.spawnConf.stdout = 'pipe';

    return Promise.all([
      this.start(),
      streamToString(this.proc.stdout),
    ])
    .then(xs => xs[1]);
  }

  then(...args) {
    return this.start().then(...args);
  }

  catch(...args) {
    return this.start().catch(...args);
  }
}

let exec = (cmd, ...args) =>
  new Proxy(new BlastoiseProcExec(cmd, args), instanceProxyHandlers);

exec.throwOnError = true;

{
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
}

{
  let rootProxyHandlers = {
    get: (exec, k) => {
      let v = exec[k];

      if (typeof v === 'function') {
        return v.bind(exec);
      }

      return exec[k] || ((...args) => exec(k, ...args));
    },
  };

  module.exports = new Proxy(exec, rootProxyHandlers);
}

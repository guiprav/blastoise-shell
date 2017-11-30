let cp = require('child_process');
let fs = require('fs');
let { Readable } = require('stream');

let PLazy = require('p-lazy');
let streamToString = require('stream-to-string');

let expandArgs = require('./expandArgs');
let proxyWrap = require('./proxyWrap');

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

    let pPrevExec;

    if (stdin instanceof BlastoiseProcExec) {
      stdin.spawnConf.stdout = 'pipe';
      pPrevExec = stdin.start();
    }

    let proc = this.proc = cp.spawn(this.cmd, this.args, {
      stdio: [stdin, stdout, stderr].map(x => {
        if (typeof x !== 'object') {
          return x;
        }

        return 'pipe';
      }),
    });

    if (stdin instanceof BlastoiseProcExec) {
      stdin.proc.stdout.pipe(proc.stdin);
    }
    else if (stdin instanceof Readable) {
      stdin.pipe(proc.stdin);
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
      pProcDone, ...pPipesFinished, pPrevExec,
    ])
    .then(xs => xs[0]);

    return this.promise = pAllDone;
  }

  appendTo(path) {
    return new PLazy(resolve => {
      this.spawnConf.stdout = 'pipe';

      resolve(Promise.all([
        this.start(), new Promise((resolve, reject) => {
          let fileStream = fs.createWriteStream(path, {
            flags: 'a',
          });

          this.proc.stdout.pipe(fileStream);

          fileStream.on('error', reject);
          fileStream.on('finish', resolve);
        }),
      ]));
    });
  }

  writeTo(path) {
    return new PLazy(resolve => {
      this.spawnConf.stdout = 'pipe';

      resolve(Promise.all([
        this.start(), new Promise((resolve, reject) => {
          let fileStream = fs.createWriteStream(path);

          this.proc.stdout.pipe(fileStream);

          fileStream.on('error', reject);
          fileStream.on('finish', resolve);
        }),
      ]));
    });
  }

  toString() {
    return new PLazy(resolve => {
      this.spawnConf.stdout = 'pipe';

      resolve(Promise.all([
        this.start(),
        streamToString(this.proc.stdout),
      ])
      .then(xs => xs[1]));
    });
  }

  errToString() {
    return new PLazy(resolve => {
      this.spawnConf.stderr = 'pipe';

      resolve(Promise.all([
        this.start(),
        streamToString(this.proc.stderr),
      ])
      .then(xs => xs[1]));
    });
  }

  then(...args) {
    return this.start().then(...args);
  }

  catch(...args) {
    return this.start().catch(...args);
  }
}

class BlastoiseReadStream {
  constructor(stream) {
    this.stream = stream;
  }

  pipe(target, ...rest) {
    if (typeof target === 'string') {
      return this.pipeExec(target, ...rest);
    }

    throw new Error(`Not implemented`);
  }

  pipeExec(cmd, ...args) {
    let eNext = exec(cmd, ...args);
    eNext.spawnConf.stdin = this.stream;

    return eNext;
  }

  appendTo(path) {
    return new PLazy((resolve, reject) => {
      let fileStream = fs.createWriteStream(path, {
        flags: 'a',
      });

      this.stream.pipe(fileStream);

      fileStream.on('error', reject);
      fileStream.on('finish', resolve);
    });
  }

  writeTo(path) {
    return new PLazy((resolve, reject) => {
      let fileStream = fs.createWriteStream(path);

      this.stream.pipe(fileStream);

      fileStream.on('error', reject);
      fileStream.on('finish', resolve);
    });
  }

  toString() {
    return new PLazy(
      resolve => resolve(streamToString(this.stream))
    );
  }

  errToString() {
    return new PLazy(resolve => resolve(''));
  }
}

let exec = (cmd, ...args) => proxyWrap.instance(
  new BlastoiseProcExec(cmd, args)
);

exec.fromString = str => {
  let stream = new Readable();

  stream.push(str);
  stream.push(null);

  return proxyWrap.instance(
    new BlastoiseReadStream(stream)
  );
};

exec.throwOnError = true;

module.exports = proxyWrap.root(exec);

let enumCmds = require('./enumCmds');

{
  let lastCmdSet = [];
  let globalsBlacklist = new Set();

  exec.setGlobals = async () => {
    let cmdSet = await enumCmds();

    let newCmds = cmdSet.filter(x => !lastCmdSet.includes(x));
    let lostCmds = cmdSet.filter(x => lastCmdSet.includes(x));

    newCmds.forEach(x => {
      if (global[x]) {
        globalsBlacklist.add(x);
        return;
      }

      global[x] = (...args) => exec(x, ...args);
    });

    lostCmds.forEach(x => {
      if (globalsBlacklist.has(x)) {
        return;
      }

      delete global[x];
    });

    lastCmdSet = cmdSet;
  };
}

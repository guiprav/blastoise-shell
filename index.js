let cp = require('child_process');
let es = require('event-stream');
let fs = require('fs');
let isRunning = require('is-running');
let split = require('split');
let { Readable } = require('stream');

let PLazy = require('p-lazy');
let streamToString = require('stream-to-string');

let expandArgs = require('./expandArgs');
let proxyWrap = require('./proxyWrap');

class BlastoiseError extends Error {
}

let msg = {
  invalidDest: `Invalid pipe destination`,
  invalidShell: `Invalid shell`,
  //invalidSrc: `Invalid pipe source`,
  procAlreadyDead: `Process already dead`,
  procAlreadyStarted: `Process already started`,
};

function cantPipeFrom(src, why) {
  if (src instanceof BlastoiseShell) {
    src = src.cmd || 'null shell';
  }

  throw new BlastoiseError(
    `Can't pipe from ${src}: ${why}`
  );
}

function cantPipeTo(dest, why) {
  if (dest instanceof BlastoiseShell) {
    dest = dest.cmd || 'null shell';
  }

  throw new BlastoiseError(
    `Can't pipe to ${dest}: ${why}`
  );
}

function cantStart(sh, why) {
  sh = sh.cmd || 'null shell';

  throw new BlastoiseError(
    `Can't start ${sh}: ${why}`
  );
}

let inheritedProps = ['_throwOnError'];

class BlastoiseShell extends Promise {
  constructor(cmd, ...args) {
    super(resolve => resolve());

    this.cmd = cmd || null;
    this.args = expandArgs(args);

    this._throwOnError = true;

    if (this.cmd) {
      this.spawnConf = {
        stdin: 'inherit',
        stdout: 'inherit',
        stderr: 'inherit',
      };
    }

    this.proc = null;
  }

  throwOnError(val) {
    let next = new BlastoiseShell();

    this.pipeTo(next);

    if (val === undefined) {
      val = true;
    }

    next._throwOnError = !!val;

    return proxyWrap(next);
  }

  exec(cmd, ...args) {
    if (this.proc) {
      cantPipeFrom(this, msg.procAlreadyStarted);
    }

    let next = new BlastoiseShell(cmd, ...args);
    this.pipeTo(next);

    return proxyWrap(next);
  }

  pipeTo(dest, ...args) {
    if (this.proc) {
      cantPipeFrom(this, msg.procAlreadyStarted);
    }

    if (typeof dest === 'string') {
      return this.exec(dest, ...args);
    }

    if (typeof dest === 'function') {
      return dest(this, ...args);
    }

    if (dest instanceof BlastoiseShell) {
      return this.pipeToShell(dest);
    }

    cantPipeTo(dest, msg.invalidDest);
  }

  pipeToShell(next) {
    if (this.proc) {
      cantPipeFrom(this, msg.procAlreadyStarted);
    }

    if (next.proc) {
      cantPipeTo(next, msg.procAlreadyStarted);
    }

    for (let k of inheritedProps) {
      next[k] = this[k];
    }

    if (this.cmd) {
      this.spawnConf.stdout = next;
      next.spawnConf.stdin = this;
    }

    return next;
  }

  start() {
    if (this.promise) {
      return this.promise;
    }

    if (!this.cmd) {
      cantStart(this, msg.invalidShell);
    }

    let { stdin, stdout, stderr } = this.spawnConf;
    delete this.spawnConf;

    let pStdinShell = null;

    if (stdin instanceof BlastoiseShell) {
      pStdinShell = stdin.start();

      if (!isRunning(stdin.proc.pid)) {
        cantPipeFrom(stdin, msg.procAlreadyDead);
      }
    }

    if (this.mapFn) {
      this.promise = pStdinShell;

      let mappedStdout = stdin.proc.stdout
        .pipe(split(null, null, { trailing: false }))
        .pipe(es.map((x, cb) => {
          Promise.resolve(this.mapFn(x))
            .then(y => cb(null, y && `${y}\n`))
            .catch(cb);
        }));

      if (stdout === 'inherit') {
        mappedStdout.pipe(process.stdout);
      }
      else {
        this.proc = {
          pid: stdin.proc.pid,
          stdout: mappedStdout,
        };
      }

      return this.promise;
    }

    if (this.redirect) {
      this.proc = {
        pid: stdin.proc.pid,

        stdout: es.merge(this.redirect.map(
          x => stdin.proc[x]
        )),
      };

      return this.promise = pStdinShell;
    }

    let proc = this.proc = cp.spawn(this.cmd, this.args, {
      stdio: [stdin, stdout, stderr].map(x => {
        if (typeof x === 'object') {
          return 'pipe';
        }

        return x;
      }),
    });

    if (pStdinShell) {
      stdin.proc.stdout.pipe(proc.stdin);
    }
    else if (stdin instanceof Readable) {
      stdin.pipe(proc.stdin);
    }

    let pProcDone = new Promise((resolve, reject) => {
      proc.on('error', err => {
        if (!this._throwOnError) {
          return resolve(err.code);
        }

        reject(err);
      });

      proc.on('exit', (code, sig) => {
        if (!this._throwOnError) {
          return resolve(code !== null ? code : sig);
        }

        if (code === 0) {
          return resolve(code);
        }

        if (code === null) {
          return reject(new BlastoiseError(
            `${this.cmd} terminated by signal ${sig}`
          ));
        }

        reject(new BlastoiseError(
          `${this.cmd} exitted with code ${code}`
        ));
      });
    });

    let pPipesFinished = Promise.all(
      ['stdout', 'stderr'].map(x => new Promise(
        (resolve, reject) => {
          if (!proc[x]) {
            return resolve();
          }

          proc[x].on('error', reject);
          proc[x].on('finish', resolve);
        }
      ))
    );

    this.promise = Promise.all([
      pProcDone, pPipesFinished, pStdinShell,
    ])
    .then(xs => xs[0]);

    return this.promise;
  }

  appendTo(path) {
    return new PLazy(resolve => {
      if (this.proc) {
        cantPipeFrom(this, msg.procAlreadyStarted);
      }

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
      ]).then(xs => xs[1]));
    });
  }

  writeTo(path) {
    return new PLazy(resolve => {
      if (this.proc) {
        cantPipeFrom(this, msg.procAlreadyStarted);
      }

      this.spawnConf.stdout = 'pipe';

      resolve(Promise.all([
        this.start(), new Promise((resolve, reject) => {
          let fileStream = fs.createWriteStream(path);

          this.proc.stdout.pipe(fileStream);

          fileStream.on('error', reject);
          fileStream.on('finish', resolve);
        }),
      ]).then(xs => xs[1]));
    });
  }

  toString() {
    return new PLazy(resolve => {
      if (this.proc) {
        cantPipeFrom(this, msg.procAlreadyStarted);
      }

      this.spawnConf.stdout = 'pipe';

      resolve(Promise.all([
        this.start(),
        streamToString(this.proc.stdout),
      ])
      .then(xs => xs[1]));
    });
  }

  map(fn) {
    let next = new BlastoiseShell(this.cmd, ...this.args);

    this.spawnConf.stdout = next;

    next.spawnConf.stdin = this;
    next.mapFn = fn;

    return proxyWrap(next);
  }

  forEach(fn) {
    return new PLazy(async resolve => {
      if (this.proc) {
        cantPipeFrom(this, msg.procAlreadyStarted);
      }

      this.spawnConf.stdout = 'pipe';

      let pProc = this.start();

      let pFnRetsAcc = [];

      let mapStream = this.proc.stdout
        .pipe(split(null, null, { trailing: false }))
        .pipe(es.map((ln, cb) => {
          let fnRet = fn(ln);

          if (fnRet && fnRet.then) {
            pFnRetsAcc.push(fnRet);
          }

          Promise.resolve(fnRet)
            .then(() => cb())
            .catch(cb);
        }));

      let pFnRets = new Promise((resolve, reject) => {
        mapStream.on('error', reject);
        mapStream.on('end', resolve);
      })
      .then(() => Promise.all(pFnRetsAcc));

      resolve(Promise.all([
        pProc, pFnRets,
      ]).then(xs => xs[1]));
    });
  }

  get lines() {
    return this.forEach(x => Promise.resolve(x));
  }

  get err() {
    let next = new BlastoiseShell(this.cmd, ...this.args);

    this.spawnConf.stderr = next;

    next.spawnConf.stdin = this;
    next.redirect = ['stderr'];

    return proxyWrap(next);
  }

  errToOut() {
    let next = new BlastoiseShell(this.cmd, ...this.args);

    this.spawnConf.stdout = next;
    this.spawnConf.stderr = next;

    next.spawnConf.stdin = this;
    next.redirect = ['stdout', 'stderr'];

    return proxyWrap(next);
  }

  then(...args) {
    return this.start().then(...args);
  }

  catch(...args) {
    return this.start().catch(...args);
  }
}

module.exports = proxyWrap(new BlastoiseShell());

exports.instance = exec => new Proxy(exec, {
  get: (_, k) => {
    let v = exec[k];

    if (typeof v === 'function') {
      return v.bind(exec);
    }

    return exec[k] || ((...args) => exec.pipe(k, ...args));
  },
});

exports.root = exec => new Proxy(exec, {
  get: (_, k) => {
    let v = exec[k];

    if (typeof v === 'function') {
      return v.bind(exec);
    }

    return exec[k] || ((...args) => exec(k, ...args));
  },
});

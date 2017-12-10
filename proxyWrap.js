module.exports = sh => new Proxy(sh, {
  get: (_, k) => {
    let v = sh[k];

    if (typeof v === 'function') {
      return v.bind(sh);
    }

    if (v !== undefined) {
      return v;
    }

    return ((...args) => sh.pipeTo(k, ...args));
  },
});

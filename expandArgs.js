let flatten = require('./flatten');

module.exports = args => args.map(x => {
  if (typeof x !== 'object') {
    return x;
  }

  return Object.entries(x).map(([opt, val]) => {
    if (val === false) {
      return [];
    }

    let prefix = opt.length === 1 ? '-' : '--';
    opt = prefix + opt;

    if (val === true) {
      return opt;
    }

    if (Array.isArray(val)) {
      let ret = [];

      for (let v of val) {
        ret.push(opt, v);
      }

      return ret;
    }

    return [opt, val];
  });
})
.reduce(flatten, [])
.reduce(flatten, []);

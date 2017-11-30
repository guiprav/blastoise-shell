let flatten = (a, b) => a.concat(b);

module.exports = args => args.map(x => {
  if (typeof x === 'string') {
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

    return [opt, val];
  });
})
.reduce(flatten, [])
.reduce(flatten, []);

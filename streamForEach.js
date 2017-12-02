let LineInputStream = require('line-input-stream'); 

module.exports = (stream, fn) => {
  let lis = LineInputStream(stream);

  lis.setEncoding('utf8');

  let p = new Promise((resolve, reject) => {
    lis.on('error', reject);
    lis.on('end', resolve);
  });

  let fnThenableRets = [];

  lis.on('line', ln => {
    let fnRet = fn(ln);

    if (fnRet && fnRet.then) {
      fnThenableRets.push(fnRet);
    }
  });

  return p.then(() => Promise.all(fnThenableRets));
};

let sh = require('.');

class Server {
  constructor(port) {
    this.stage = 'methodLn';
    this.headers = {};
    this.reqBody = '';

    let nc = this.nc = sh.netcat('-l', '-p', port);

    let firstLineReceived;

    this.firstLineReceived = new Promise(resolve => {
      firstLineReceived = resolve;
    });

    this.promise = nc.map((ln, i) => {
      if (i === 0) {
        this.res = nc.proc.stdin;
        firstLineReceived();
      }

      this[this.stage](ln);
    });

    nc.spawnConf.stdin = 'pipe';
  }

  get contentLength() {
    return Number(this.headers['content-length'] || 0);
  }

  respond() {
    let resBody;

    if (this.reqBody) {
      resBody = 'Echo: ' + this.reqBody;
    }
    else {
      resBody = `
        <input name="input">
        <button onclick="send()">Send</button>
        <script>
          function send() {
            fetch('/', {
              method: 'post',
              headers: {
                'content-type': 'text/plain',
              },
              body: document.querySelector('input').value + '\\n',
            })
            .then(res => res.text())
            .then(body => {
              document.querySelector('pre').appendChild(
                document.createTextNode(body)
              );
            })
            .catch(console.error.bind(console));
          }
        </script>
        <pre></pre>
      `;
    }

    let { res } = this;

    res.write(`HTTP/1.0 200 OK\n`);
    res.write(`Content-Type: text/html\n`);
    res.write(`Content-Length: ${resBody.length}\n`);
    res.write(`\n`);
    res.write(resBody);
    res.end();
  }

  methodLn(ln) {
    [this.method, this.path] = ln.split(' ');
    this.stage = 'headerLn';
  }

  headerLn(ln) {
    ln = ln.trim();

    if (ln) {
      let [name, val] = ln.split(':')
        .map(x => x.trim());

      this.headers[name.toLowerCase()] = val;
    }
    else if (this.headers['content-length']) {
      this.stage = 'contentLn';
    }
    else {
      this.stage = 'shutUp';
      this.respond();
    }
  }

  contentLn(ln) {
    this.reqBody += `${ln}\n`;

    if (this.reqBody.length >= this.contentLength) {
      this.stage = 'shutUp';
      this.respond();
    }
  }

  then(...args) {
    return this.promise.then(...args);
  }

  catch(...args) {
    return this.promise.catch(...args);
  }
}

async function main() {
  while(true) {
    let server = new Server(process.env.PORT || 3000);

    server.catch(console.error);
    await server.firstLineReceived;
  }
}

main().catch(console.error);

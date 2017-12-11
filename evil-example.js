let { netcat } = require('.');

class Server {
  constructor(port) {
    this.stage = 'methodLn';

    this.reqHeaders = {};
    this.reqBody = '';

    let nc = netcat('-l', '-p', port);

    // Prevent inheritting Node's stdin.
    // We need to write to netcat's stdin to respond
    // to requests.
    nc.spawnConf.stdin = 'pipe';

    let firstLineReceived;

    this.firstLineReceived = new Promise(resolve => {
      firstLineReceived = resolve;
    });

    this.promise = nc.forEach((ln, i) => {
      if (i === 0) {
        firstLineReceived();
        this.res = nc.proc.stdin;
      }

      return this[this.stage](ln);
    });
  }

  get contentLength() {
    return Number(this.reqHeaders['content-length'] || 0);
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
    console.log(ln);

    [this.method, this.path] = ln.split(' ');
    this.stage = 'headerLn';
  }

  headerLn(ln) {
    ln = ln.trim();

    if (ln) {
      let [name, val] = ln.split(':')
        .map(x => x.trim());

      this.reqHeaders[name.toLowerCase()] = val;
    }
    else if (this.reqHeaders['content-length']) {
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

    // Log errors.
    server.catch(console.error);

    // As soon as a connection is established, netcat
    // stops listening for new connections. Wait until
    // first line of request is received, then loop
    // (start a new server).
    await server.firstLineReceived;
  }
}

main().catch(console.error);

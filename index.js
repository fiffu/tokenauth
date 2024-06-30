const bodyParser = require('body-parser');
const express = require('express');

const { View } = require('./view');
const AuthServer = require('./servers/auth-server')
const ProtectedServer = require('./servers/protected-server')


function main() {
    const app = express();
    
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use((req, res, next) => {
        next();
        console.log(`${res.statusCode} | ${req.method.padEnd(5, ' ')} ${req.path.padEnd(15, ' ')} | params: ${JSON.stringify(req.body)}`);
    })

    setupRoutes(app);
    AuthServer.setupRoutes(app);
    ProtectedServer.setupRoutes(app);

    const port = 3000;
    console.log(`Listening on http://localhost:${port}`)
    app.listen(port);
}

function setupRoutes(app) {
    app.get('/', (req, res) => (res, View.HTML(req, res, 'index', req.query.message)));
}

main();

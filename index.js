const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const url = require('url');

const { View } = require('./view');


// Let's pretend this is a real DB
class Database {
    constructor() {
        this.users = [];
        this.protectedDocs = [];
    }
}
const DB = new Database();


class AuthService {
    ROLE_ADMIN = 'urn:authsvc:role:admin'
    ROLE_DEFAULT = 'urn:authsvc:role:user'

    _findByUsername(username) {
        return DB.users
            .filter(row => row.username === username)
            .pop();
    }

    _findByCreds(username, password) {
        return DB.users
            .filter(row => row.username === username && row.password === password)
            .pop();
    }

    register(username, password, passwordConfirm, role) {
        if (!username) return 'Missing username';
        if (!password) return 'Missing password';

        const existing = this._findByUsername(username);
        if (existing) return 'Username already exists';

        if (password !== passwordConfirm) return 'Password confirmation does not match';

        const user = {
            userID: crypto.randomUUID(),
            username,
            password,
            role
        };
        DB.users.push(user);
    }

    login(username, password) {
        const user = this._findByCreds(username, password);
        if (!user) return null;
        return this._generateToken(user);
    }

    _generateToken(user) {
        const tokenDuration = 5 * 60;
        const payload = {
            exp: Date.now() + tokenDuration,
            claims: user,
        }
        const json = JSON.stringify(payload);
        return Buffer.from(json).toString('base64');  // TODO: use real algo here.
    }

    decodeToken(token) {
        const json = Buffer.from(token, 'base64').toString('utf-8');
        const payload = JSON.parse(json);

        if (!payload.exp) return null;
        if (Date.now() > payload.exp) return null;

        return payload.claims;
    }
}
const AUTHSVC = new AuthService();


class ProtectedService {
    saveDocument(userID, doc) {
        const id = crypto.randomUUID();
        DB.tables.protectedDocs[id] = {userID, doc};
        return id;
    }

    findDocument(userID, docID) {
        const doc = DB.tables.protectedDocs[docID];
        if (!doc) return null;
        if (doc.userID !== userID) return null;
        return doc;
    }
}
const PROTECTEDSVC = new ProtectedService();


function main() {
    const app = express();
    
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use((req, res, next) => {
        next();
        console.log(`${res.statusCode} | ${req.method.padStart(5, ' ')} ${req.path.padEnd(15, ' ')} | params: ${JSON.stringify(req.body)}`);
    })

    // Session middleware
    // app.use(session({
    //     secret: crypto.randomUUID(),
    //     cookie: { maxAge: 24 * 60 * 60 * 7 },  // 7 days
    //     resave: false,
    //     saveUninitialized: false,
    // }));

    setupRoutes(app);

    const port = 3000;
    console.log(`Listening on http://localhost:${port}`)
    app.listen(port);
}

function setupRoutes(app) {
    app.get('/', (req, res) => (res, View.HTML(req, res, 'index', req.query.message)));

    app.post('/auth/register', (req, res) => {
        const err = AUTHSVC.register(
            req.body.username,
            req.body.password,
            req.body.passwordConfirm,
            req.body.isAdmin ? AUTHSVC.ROLE_ADMIN : AUTHSVC.ROLE_DEFAULT,
        );
        const message = err ? `Error: ${err}` : 'Account registered!';
        res.redirect(url.format({
            pathname: '/',
            query: { message }
        }));
    });

    app.post('/auth/login', (req, res) => {
        const token = AUTHSVC.login(
            req.body.username,
            req.body.password,
        );
        if (!token) {
            return res.redirect(url.format({
                pathname: '/',
                query: {message: 'Error: Login failed'}
            }));
        }
        // In the real world, we'd return the token as a HTTP headers like X-Token,
        // then use some client-side JS to forward that header when redirecting.
        // However, normal res.redirect() causes the browser to strip headers, so
        // we're forwarding it as a query param instead.
        // Ref: https://stackoverflow.com/a/39998152
        res.redirect(url.format({
            pathname: '/protected',
            query: {'X_Token': token}
        }));
    });

    app.get('/protected', (req, res) => {
        const token = req.query.X_Token;
        if (!token) {
            return res.redirect(url.format({
                pathname: '/',
                query: {message: 'Error: You need to login first.'}
            }));
        }

        const user = AUTHSVC.decodeToken(token);
        if (!user || user.role !== AUTHSVC.ROLE_ADMIN) {
            return res.redirect(url.format({
                pathname: '/',
                query: {message: 'Error: Only admins are allowed to access this resource.'}
            }));
        }

        View.HTML(req, res, 'protected');
    })
}

main();

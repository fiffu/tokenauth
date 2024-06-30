const { randomUUID } = require('crypto');
const url = require('url');

const { sign } = require('../lib/token');

class AuthServer {
    ROLE = {
        ADMIN: 'urn:authsvc:role:admin',
        USER: 'urn:authsvc:role:user'
    };
    SCOPES_BY_ROLE = {
        [this.ROLE.USER]:  ['documents:view', 'documents:create'],
        [this.ROLE.ADMIN]: ['documents:view', 'documents:create', 'documents:delete'],
    };

    constructor() {
        this.db = {
            users: []
        };
    }

    _findByUsername(username) {
        return this.db.users
            .filter(row => row.username === username)
            .pop();
    }

    _findByCreds(username, password) {
        return this.db.users
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
            userID: randomUUID(),
            username,
            password,
            role
        };
        this.db.users.push(user);
    }

    login(username, password) {
        const user = this._findByCreds(username, password);
        if (!user) return null;
        console.log('User logged in:', user);

        const claims = {
            ...user,
            scopes: this.SCOPES_BY_ROLE[user.role],
        }
        
        const tokenLifespan = 5 * 60; // 5 minutes
        return sign(claims, Date.now() + tokenLifespan);
    }
}

const service = new AuthServer();


module.exports = {
    setupRoutes: function(app) {
        app.post('/auth/register', (req, res) => {
            const err = service.register(
                req.body.username,
                req.body.password,
                req.body.passwordConfirm,
                req.body.isAdmin ? service.ROLE.ADMIN : service.ROLE.USER,
            );
            const message = err ? `Error: ${err}` : 'Account registered!';
            res.redirect(url.format({
                pathname: '/',
                query: { message }
            }));
        });
    
        app.post('/auth/login', (req, res) => {
            const token = service.login(
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
                pathname: req.body.redirect,
                query: {'X_Token': token}
            }));
        });
    }
}

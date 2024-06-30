const url = require('url');

const { verify } = require('../lib/token');
const { View } = require('../view');

class ProtectedServer {
    constructor() {
        this.db = {
            docs: [],
        };
    }

    get requiredPermissions() {
        return Set(['documents:view']);
    }

    saveDocument(userID, doc) {
        const id = crypto.randomUUID();
        this.db.docs.push({id, userID, doc});
        return id;
    }

    findDocument(userID, docID) {
        const doc = this.db.docs.filter(doc => doc.id === docID).pop();
        if (!doc) return null;
        if (doc.userID !== userID) return null;
        return doc;
    }
}
const service = new ProtectedServer();

function scoped(neededScope) {
    return function(req, res, next) {
        const token = req.query.X_Token;
        const claims = token ? verify(token) : null; // No direct call to AuthServer needed
        if (!token || !claims) {
            return res.redirect(url.format({
                pathname: '/',
                query: {message: 'Error: You need to login first.'}
            }));
        }

        const tokenScopes = new Set(claims.scopes);
        if (!tokenScopes.has(neededScope)) {
            return res.redirect(url.format({
                pathname: '/',
                query: {message: `Error: unauthorized (need=${neededScope}, got=${claims.scopes})`},
            }));
        }

        next();
    }
}

module.exports = {
    setupRoutes: function(app) {
        app.get('/protected', scoped('documents:view'), (req, res) => {
            View.HTML(req, res, 'protected');
        });
    },
};

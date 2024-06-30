module.exports = {
    sign: function(claims, expiresAt) {
        
        const payload = {
            exp: expiresAt,
            claims,
        }

        const json = JSON.stringify(payload);
        return Buffer.from(json).toString('base64');  // TODO: use real algo here.
    },

    verify: function(token) {
        const json = Buffer.from(token, 'base64').toString('utf-8');
        const payload = JSON.parse(json);

        if (!payload.exp) return null;
        if (Date.now() > payload.exp) return null;

        return payload.claims;
    },
}

class Viewer {
    PAGES = {
        index: (req, message) => `
            ${message ? '<p>'+message+'</p>' : ''}
            <h1>Login</h1>
            <form method="POST" action="/auth/login">
                <label for="username">Username:</label><input type="text" name="username">
                <label for="password">Password:</label><input type="password" name="password">
                <input type="submit" value="Login">
            </form>

            <hr/>

            <h1>Register</h1>
            <form method="POST" action="/auth/register">
                <label for="username"> Username:</label>         <input type="text" name="username">
                <label for="password"> Password:</label>         <input type="password" name="password">
                <label for="password"> Confirm password:</label> <input type="password" name="passwordConfirm">
                <label for="isAdmin">  Admin account?</label>    <input type="checkbox" name="isAdmin">
                <input type="submit" value="Create account">
            </form>
        `,
        protected: (req, message) => `Hello admin!!`,
        default: (req, message) => `Not Found`,
    }

    HTML(req, res, pageName, message='') {
        const styles = `
            <style>
                label, input {
                    padding: 2px;
                    margin: 2px;
                    margin-right: 6px;
                }
            </style>
        `;
        const page = this.PAGES[pageName] || this.PAGES.default;
        const html = page(req, message);

        res.set('Content-Type', 'text/html');
        res.send(styles + html);
    }

    getPage(page, req) {
        return this.PAGES[page](req);
    }
}

module.exports = {
    View: new Viewer(),
};

(function (window) {
    window.__env = window.__env || {};

    // API URI
    window.__env.apiUri = "${API_URI}";

    // Auth0
    window.__env.auth0 = {
        domain: "${AUTH0_DOMAIN}",
        clientId: "${AUTH0_CLIENT_ID}",
        audience: "${AUTH0_API_IDENTIFIER}"
    };
})(this);

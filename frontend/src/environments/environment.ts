export const environment = {
  production: false,
  auth0: {
    domain: (window as any).__env?.auth0?.domain,
    clientId: (window as any).__env?.auth0?.clientId,
    audience: (window as any).__env?.auth0?.audience
  },
  apiUri: (window as any).__env?.apiUri
};

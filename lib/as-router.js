export default class AsRouteConfig {
  constructor() {
    this.routes = {};
  }

  get(path, handler, options = { bypassAuth: false }) {
    this.routes[path] = {
      get: {
        path,
        handler,
        bypassAuth: options.bypassAuth,
      },
    };
    return this;
  }

  post(path, handler, options = { bypassAuth: false }) {
    this.routes[path] = {
      post: {
        path,
        handler,
        bypassAuth: options.bypassAuth,
      },
    };
    return this;
  }

  put(path, handler, options = { bypassAuth: false }) {
    this.routes[path] = {
      put: {
        path,
        handler,
        bypassAuth: options.bypassAuth,
      },
    };
    return this;
  }

  delete(path, handler, options = { bypassAuth: false }) {
    this.routes[path] = {
      delete: {
        path,
        handler,
        bypassAuth: options.bypassAuth,
      },
    };
    return this;
  }
}

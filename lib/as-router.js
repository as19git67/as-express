export default class AsRouteConfig {
  constructor() {
    this.routes = {};
    this.bypassAuthByMethod = {};
  }

  // todo: key in routes muss method + path sein, damit mehrere Pfade bei gleicher Methode möglich sind
  // todo: bypassAuthByMethod muss in jeder route spezifizierbar sein

  get(path, handler, options = {
    bypassAuth: false,
  }) {
    this.bypassAuthByMethod.get = options.bypassAuth;
    this.routes.get = {
      path,
      handler,
    };
    return this;
  }

  post(path, handler, options = {
    bypassAuth: false,
  }) {
    this.bypassAuthByMethod.post = options.bypassAuth;
    this.routes.post = {
      path,
      handler,
    };
    return this;
  }

  put(path, handler, options = {
    bypassAuth: false,
  }) {
    this.bypassAuthByMethod.post = options.bypassAuth;
    this.routes.put = {
      path,
      handler,
    };
    return this;
  }

  delete(path, handler, options = {
    bypassAuth: false,
  }) {
    this.bypassAuthByMethod.post = options.bypassAuth;
    this.routes.delete = {
      path,
      handler,
    };
    return this;
  }
}

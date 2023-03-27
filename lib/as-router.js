class AsRouteConfig {
  constructor() {
    this.routes = {};
    this.bypassAuth = false;
  }

  get(path, handler) {
    this.routes.get = {
      path: path,
      handler: handler
    }
    return this;
  }
  post(path, handler) {
    this.routes.post = {
      path: path,
      handler: handler
    }
    return this;
  }
  put(path, handler) {
    this.routes.put = {
      path: path,
      handler: handler
    }
    return this;
  }
  delete(path, handler) {
    this.routes.delete = {
      path: path,
      handler: handler
    }
    return this;
  }
}

module.exports = AsRouteConfig;

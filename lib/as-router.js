export default class AsRouteConfig {
  constructor() {
    this.routes = {};
  }

  #prepare(path) {
    if (!this.routes[path]) {
      this.routes[path] = {};
    }
  }

  #setup(path, handler, options, verb) {
    this.#prepare(path);
    this.routes[path][verb] = {
      path,
      handler,
      bypassAuth: options.bypassAuth,
    };
  }

  get(path, handler, options = { bypassAuth: false }) {
    this.#setup(path, handler, options, 'get');
    return this;
  }

  post(path, handler, options = { bypassAuth: false }) {
    this.#setup(path, handler, options, 'post');
    return this;
  }

  put(path, handler, options = { bypassAuth: false }) {
    this.#setup(path, handler, options, 'put');
    return this;
  }

  delete(path, handler, options = { bypassAuth: false }) {
    this.#setup(path, handler, options, 'delete');
    return this;
  }
}

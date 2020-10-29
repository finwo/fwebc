;(factory => {
  if (('object' === typeof module) && ('exports' in module)) {
    module.exports = factory({
      fetch: require('node-fetch'),
    });
  } else if ('object' === typeof window) {
    window.fwebc = factory({
      fetch: window.fetch,
    });
  }
})(({fetch}) => {
  const fwebc   = {};
  const plugins = [];
  const config  = {
    ext: 'tag',
    base: '/partial',
  };

  const util = fwebc.util = {
    isObject(obj) {
      if (null === obj) return false;
      if ('object' !== typeof obj) return false;
      if (Array.isArray(obj)) return false;
      return true;
    },
    observable(obj, callback, prefix = '') {
      if (Object(obj) !== obj) throw new Error(`Object is not an object, got: ${obj}`);
      if ('function' !== typeof callback) throw new Error(`Callback is not a function, got: ${callback}`);
      for(const key of Object.keys(obj)) {
        if (Object(obj[key]) !== obj[key]) continue;
        obj[key] = util.observable(obj[key], callback, `${prefix}${key}.`);
      }
      return new Proxy(obj, {
        set(target, name, value, receiver) {
          var oldVal = target[name];
          if (oldVal === value) return;
          let type = name in target ? 'update' : 'add';
          const record = { name, type, object: target };
          if (type == 'update') record.oldValue = target[name];
          target[name] = Object(value) === value ? util.observable(value,callback,`${prefix}${name}.`) : value;
          callback([record]);
          return true;
        },
        deleteProperty(target, name, value) {
          if (!(name in target)) return;
          const record = { name, type: 'delete', object: target, oldValue: target[name] };
          delete target[name];
          callback([record]);
          return true;
        },
      });
    },
  };

  // Override configs
  fwebc.cfg = cfg => {
    Object.assign(config, cfg);
  };

  // Install a plugin
  fwebc.install = callback => {
    if ('function' !== typeof callback) return;
    plugins.push(callback);
  };

  // Remove a plugin
  fwebc.uninstall = callback => {
    const idx = plugins.indexOf(callback);
    if (!~idx) return;
    plugins.splice(idx, 1);
  };

  // Register a component
  fwebc.register = (name, source) => {
    if (window.customElements.get(name)) return;

    // Remove nested template tags
    let template = document.createElement('template');
    template.innerHTML = source;
    if (template.content.firstChild instanceof HTMLTemplateElement) {
      template = template.content.firstChild;
    }

    // Extract scripts
    let code = '';
    for(const child of [...template.content.children]) {
      if (!(child instanceof HTMLScriptElement)) continue;
      code += child.innerHTML;
      template.content.removeChild(child);
    }

    // Template should be a string
    template = template.innerHTML;

    // Register the actual element
    window.customElements.define(name, class extends HTMLElement {
      constructor() {
        super();

        // Initial state
        this.state = {};

        // Initialize shadow root
        this.root = this.attachShadow({ mode: 'open' });

        // Run plugins
        for (const plugin of plugins) {
          plugin(this);
        }

        // Run component code
        (new Function(code)).call(this);

        // Load dependencies
        if (this.dependencies) {
          dependencies.forEach(fwebc.load);
        }

        // Start observing state & initial rendering
        this.state = util.observable(this.state, this.render.bind(this));
        this.render();
      }

      render() {
        const fn = new Function(...Object.keys(this.state), "return `"+ template.replace(/`/g,'\\`') + "`;");
        try { this.root.innerHTML = fn(...Object.values(this.state)); } catch(e) { console.error(e); }
      };

    });
  };

  // Load a component
  fwebc.load = name => {
    fetch(`${config.base}/${name}.${config.ext}`)
      .then(res => res.text())
      .then(source => {
        fwebc.register(name, source);
      });
  };

  return fwebc;
});
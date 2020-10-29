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
    }
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

        this.state = {};

        // Initialize shadow root
        this.root = this.attachShadow({ mode: 'open' });

        // Run plugins
        for (const plugin of plugins) {
          plugin(this);
        }

        // Run component code
        (new Function(code)).call(this);
        this.root.innerHTML = this.render();

        // Load dependencies
        if (this.dependencies) {
          dependencies.forEach(fwebc.load);
        }


      }

      render() {
        const fn = new Function(...Object.keys(this.state), "return `"+ template.replace(/`/g,'\\`') + "`;");
        return fn(...Object.values(this.state));
      }

      update(data) {
        Object.entries(data)
          .forEach(([key, value]) => {
            this.state[key] = util.isObject(this.state[key]) &&   
            util.isObject(value) ? {...this.state[key], ...value} : value;
          });
        this.root.innerHTML = this.render();
      }

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

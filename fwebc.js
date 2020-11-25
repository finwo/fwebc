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
    unescape(input) {
      const el = document.createElement('textarea');
      el.innerHTML = input;
      return el.childNodes.length === 0 ? "" : el.childNodes[0].nodeValue;
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

    // Parse remplate
    let template = document.createElement('template');
    template.innerHTML = source;

    // Remove template wrapper
    while(
      (template.content.children.length == 1) &&
      (template.content.firstChild instanceof HTMLTemplateElement)
    ) {
      template = template.content.firstChild;
    }

    // Remove template wrapper around html section
    if (template.content.firstChild instanceof HTMLTemplateElement) {
      const wrapper = template.content.firstChild;
      template.content.prepend(...wrapper.content.children);
      template.content.removeChild(wrapper);
    }

    // Extract scripts
    let code = '';
    for(const child of [...template.content.children]) {
      if (!(child instanceof HTMLScriptElement)) continue;
      if (child.getAttribute('src')) continue;
      code += child.innerHTML;
      template.content.removeChild(child);
    }

    // Template should be a string
    template = util.unescape(template.innerHTML);

    // Register the actual element
    window.customElements.define(name, class extends HTMLElement {
      constructor() {
        super();

        // Initialize shadow root
        this.root = this.attachShadow({ mode: 'open' });

        // Initial state
        this.state = {};

        // Run plugins
        for (const plugin of plugins) {
          plugin(this);
        }

        // Run component code
        (new Function(code)).call(this);

        // Load dependencies
        if (this.dependencies) {
          this.dependencies.forEach(fwebc.load);
        }

        // Start observing state & initial rendering
        this.state = util.observable(this.state, () => this.emit('update'));
        this.on('update', this.render.bind(this));
        this.render();
      }

      render() {
        const fn = new Function(...Object.keys(this.state), 'return `'+template+'`;');
        const styles = Array.from(this.root.ownerDocument.styleSheets).map(stylesheet => stylesheet.ownerNode.outerHTML);
        try {
          this.root.innerHTML = styles.join('') + fn(...Object.values(this.state));
        } catch(e) {
          console.error(e);
        }
      }

      emit(event, data = {}) {
        const ev = new CustomEvent(event, data);
        this.dispatchEvent(ev);
      }

      on(event, handler) {
        this.addEventListener(event, handler);
      }

    });
  };

  // Load a component
  fwebc.load = name => {
    fetch(`${config.base}/${name.replace(/-/g,'/')}.${config.ext}`)
      .then(res => res.text())
      .then(source => {
        fwebc.register(name, source);
      });
  };

  return fwebc;
});

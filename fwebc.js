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
    const wrapper = document.createElement('template');
    wrapper.innerHTML = source;

    // Separate style, script & template
    let template = null;
    let scripts  = [];
    let styles   = [];
    for(const node of [...wrapper.content.children]) {
      if (node instanceof HTMLTemplateElement) template = node;
      if (node instanceof HTMLScriptElement  ) {scripts.push(node);wrapper.content.removeChild(node);}
      if (node instanceof HTMLStyleElement   ) {styles.push(node);wrapper.content.removeChild(node);}
    }
    if (!template) {
      template = wrapper;
    }

    // Convert template and code into a string
    template = util.unescape(template.innerHTML);
    let code = '';
    for(const script of scripts) {
      if (script.getAttribute('src')) continue;
      code += script.innerHTML;
    }

    // Register the actual element
    window.customElements.define(name, class extends HTMLElement {
      constructor() {
        super();
        this.root  = this.attachShadow({ mode: 'open' });
        this.state = {};
        for(const plugin of plugins) plugin(this);
        (new Function(code)).call(this);
        if (this.dependencies) this.dependencies.forEach(fwebc.load);
        this.state = util.observable(this.state, () => this.emit('update'));
        this.on('update', this.render.bind(this));
        this.render();
      }
      render() {
        const fn = new Function(...Object.keys(this.state), 'return `'+template+'`;');
        const stylez = Array
          .from(this.root.ownerDocument.styleSheets)
          .map(stylesheet => stylesheet.ownerNode.outerHTML)
          .concat(styles.map(stylesheet => stylesheet.outerHTML));
        try {
          this.root.innerHTML = stylez.join('') + fn.call(this, ...Object.values(this.state));
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

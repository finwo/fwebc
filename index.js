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
    window.customElements.define(name, class extends HTMLElement {
      constructor() {
        super();

        // Build shadowroot
        let template = document.createElement('template');
        template.innerHTML = source;
        if (template.content.firstChild instanceof HTMLTemplateElement) {
          template = template.content.firstChild;
        }
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.appendChild(template.content);

        // Run plugins
        for (const plugin of plugins) {
          plugin(shadow);
        }

        // Run component code
        (new Function([...shadow.children]
          .filter(el => el instanceof HTMLScriptElement)
          .map(el => el.innerHTML)
          .join('')
        )).call(shadow);

        // Load dependencies
        if (shadow.dependencies) {
          dependencies.forEach(fwebc.load);
        }
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

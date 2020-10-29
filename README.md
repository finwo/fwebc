# fwebc

Simple web component framework to teach myself about web components

## Install

This package is intended for direct use in the browser, although wrappers like
browserify and/or webpack *should* work.

```js
npm install --save fwebc
```

```html
<script src="https://unpkg.com/fwebc"></script>
```

Upon load, fwebc returns within `module.exports` if support for that is
detected, else it attaches itself to `window.fwebc`.

## Usage

fwebc makes use of `window.customElements`, so initialization is not needed,
only configuration.

### fwebc.cfg( configuration? )

For now, only the default file extension and the base uri (location to your
templates) are configurable.

```js
fwebc.cfg({
  ext : 'tag',
  base: '/partial',
});
```

### fwebc.install( callback:fn &lt;component&gt; )

Adds a callback to the creation process of an element. The shadow root (a.k.a.
component) is given as the first -and only- argument to the callback.

This functionality allows you to add mixins or other features to components.

### fwebc.uninstall( callback )

When given the exact same callback as you installed, removes it from the calls
to perform upon component creation.

### fwebc.register(name, source)

Registers a new component, based on the source string you give. The name must
include a hyphen `-` because fwebc is built directly on top of
`window.customElements`.

**CAUTION**: this method will **NOT** throw an error if a name has already been
registered.

### fwebc.load(name)

Loads the template identified by the given name, surrounded by the configured
`base` and `ext`, and registers it.

### component.render()

Re-renders the component the function is called on as a template literal, using
`component.state` as it's data input.

## Templates

Loaded templates are attached to elements as shadow roots after being rendered
as template literals using your template's `.state` property as data input.
Top-level script tags are all merged together and are used as the initialization
code for your custom element (`this` = the element, `.root` = shadow root).

Basic data-binding is supported. In your template, during initialization (so in
the root of your scripts), you're allowed to overwrite the `this.state`
property. Do **NOT** overwrite this property after initialization or the binding
will cease to work. The template will be re-rendered whenever your state
updates.

More advanced data-binding can be added by including a package like
[rivets](https://www.npmjs.com/package/rivets) and installing it like a plugin
as follows:

```js
fwebc.install(component => {
  rivets.bind(component.root, component.state);
});
```

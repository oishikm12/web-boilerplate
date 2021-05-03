# Web Boilerplate

Sample webpack configuration for use with my own projects

## Caveats

* For every HTML file in `src` folder, there must be a JS file with same name in `src/scripts` folder
* CSS if any, must be imported inside the JS file, not directly inside HTML, similarly JS must not be placed inside HTML, it will be automatically done
* Whatever addons / feature being used must be enabled in `buildConfig.json`
* Typescript if enabled via config, a global installation of Typescript is recommended, also ```tsc --init``` must be run before starting webpack
* If Handlebars templating is enabled, the config will no longer parse HTML files

## Usage

```js
  npm run start : Starts the server on localhost:3000
  npm run build : Builds a production ready bundle
```

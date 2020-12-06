# Web Boilerplate

Sample webpack configuration for use with my own projects

## Caveats

* For every HTML file in `src` folder, there must be a JS file with same name in `src/scripts` folder
* CSS if any, must be imported inside the JS file, not directly inside HTML, similarly JS must not be placed inside HTML, it will be automatically done
* Whatever addons / feature being used must be enabled in `buildConfig.json`

## Usage

```
  npm run start : Starts the server on localhost:3000
  npm run build : Builds a production ready bundle
```
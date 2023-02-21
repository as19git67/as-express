# as-express
### Role based authentication and more extension for websites built with node.js + express

## Installation/usage:
Create a new express website (in this example the directory of the website is mywebsite):
```
npx express-generator mywebsite 
```
Add the as-express package to mywebsite:
```bash
cd mywebsite
npm install as-express
```
Add the import to app.js:
````javascript
const {AsExpress} = require('as-express');
````
At the end of app.js - right before `module.exports` - create a new instance of `AsExpress` and call `ìnit`:
````javascript
const asExpress = new AsExpress('mywebsite', app);
asExpress.init().catch((error) => {
  console.error(error);
});

module.exports = app;
````

# modellr

[![Greenkeeper badge](https://badges.greenkeeper.io/aichholzer/modellr.svg)](https://greenkeeper.io/)
[![npm version](https://badge.fury.io/js/modellr.svg)](https://badge.fury.io/js/modellr)
[![Build Status](https://travis-ci.org/aichholzer/modellr.svg?branch=master)](https://travis-ci.org/aichholzer/modellr)
[![Downloads](https://img.shields.io/npm/dt/modellr.svg)](https://www.npmjs.com/package/modellr)<br />
[![Test Coverage](https://api.codeclimate.com/v1/badges/479ec171f96fd4e9c860/test_coverage)](https://codeclimate.com/github/aichholzer/modellr/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/479ec171f96fd4e9c860/maintainability)](https://codeclimate.com/github/aichholzer/modellr/maintainability)


Database connection manager for Sequelize.<br />
`modellr` will also load your models and map them to the DB instance, making them available throughout your application.

#### Install

```
$> npm i modellr
```

#### Basic example

```
const m = require('modellr');
const config = {
  database: 'database',
  username: 'username',
  password: 'password',
  dialect: 'postgres',
  logging: false
}

m.load(config, './models/').then(() => {
  // Start your application.
  // You have a persisted DB connection.
});
```

Have a look at the models in `test/models` to see how they should be defined.

#### Usage

You models are available throughout your application, simply require `modellr` and access whatever model you need.

If, for example, you have a model named `User`, you may use it like so:

```
const m = require('modellr');

m.User.findById(123).then((user) => {
  // "user" is your record.
});
```

All models export the basic Sequelize usage/functionality as documented [here](http://docs.sequelizejs.com/manual/tutorial/models-usage.html).

#### API

`.load(config, models)` : Prepare the DB connections (as Sequelize instance) and load all model definitions. Note that this method will read all model definitions files, thus it should only be called once, at application launch.

`.instance(alias || null)` : Use a particular instance. If the argument is `null` then the first valid instance will be used.

`.close(alias || null)` : Close DB connections and terminate the corresponding Sequelize instance. If the argument is `null` then all open connections will be terminated.

#### Test

```
$> npm test
```


#### Contribute

```
fork https://github.com/aichholzer/modellr
```


#### License

[MIT](https://github.com/aichholzer/modellr/blob/master/LICENSE)

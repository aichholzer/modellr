// Modules
const fs = require('fs');
const Sequelize = require('sequelize');

Sequelize.Promise = global.Promise;
class Modellr {
  constructor() {
    this.models = [];
    this.instance = {
      models: []
    };
  }

  async loadModels(pathToModels) {
    if (!this.models.length) {
      this.models = fs
        .readdirSync(pathToModels)
        .filter((model) => model.match(/(.+)\.js$/))
        .filter((model) => !model.includes('index'));
    }

    this.models.forEach((model) => {
      try {
        const schema = require.call(null, `${pathToModels}${model}`);
        schema(this.instance, Sequelize);
      } catch (error) {
        throw new Error(`The "${model}" model could not be loaded: ${error.message}`);
      }
    });

    /**
     * Setup the model data relations.
     * @see .relate() in each model definition (/path/to/models)
     */
    Object.keys(this.instance.models).forEach((key) => {
      if (typeof this.instance.models[key].relate === 'function') {
        this.instance.models[key].relate();
      }
    });
  }

  async load(connection, pathToModels = null) {
    this.instance = new Proxy(new Sequelize(connection), {
      get: (target, name) => (target.models[name] ? target.models[name] : target[name])
    });

    try {
      await this.instance.authenticate();
      await this.loadModels(pathToModels);
    } catch (error) {
      throw error;
    }
  }

  close() {
    this.models = [];
    this.instance.close();
  }
}

module.exports = new Proxy(new Modellr(), {
  get: (target, name) => {
    if (name === 'hasOwnProperty') {
      return null;
    }

    const { models } = target.instance || {};
    return models[name] || target[name];
  }
});

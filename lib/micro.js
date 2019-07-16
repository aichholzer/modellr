// Modules
const fs = require('fs');
const Sequelize = require('sequelize');

Sequelize.Promise = global.Promise;
class Modellr {
  constructor() {
    this.models = [];
    this.instance = { models: [] };
  }

  async loadModels(path) {
    this.models = fs.readdirSync(path).filter((model) => model.match(/(.+)\.js$/));
    this.models.forEach((model) => {
      try {
        const schema = require.call(null, `${path}${model}`);
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

  async load(options = {}, path) {
    if (!path) {
      throw new Error('A path to models must be provided.');
    }

    try {
      this.instance = new Proxy(new Sequelize(options), {
        get: (target, name) => target.models[name] || target[name]
      });

      await this.instance.authenticate();
      await this.loadModels(path);
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

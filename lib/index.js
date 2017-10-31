// Modules
const fs = require('fs');
const Sequelize = require('sequelize');

Sequelize.Promise = global.Promise;
class Modellr {
  constructor() {
    this.models = null;
    this.sequelizeInstances = {
      default: {
        unloaded: true,
        models: []
      }
    };
  }

  /**
   * Load all existing models.
   * Should be called only at boot time.
   *
   * @param connections -Array of database connection options.
   * @param pathToModels -Path to the model definitions.
   * @return Promise.
   */
  load(connections = [], pathToModels = null) {
    return new Promise((yes, no) => {
      let connectionOptions = [];
      if (!Array.isArray(connections)) {
        connectionOptions.push(connections);
      } else {
        connectionOptions = connections;
      }

      if (!connectionOptions.length) {
        return no(new Error('No valid database connections options have been provided.'));
      }

      if (!this.models) {
        this.models = fs.readdirSync(pathToModels).filter(model => model.match(/(.+)\.js$/));
      }

      let [promises, alias] = [[], 'default'];
      connectionOptions.forEach((option) => {
        alias = option.alias || alias;
        option.operatorsAliases = option.operatorsAliases || Sequelize.Op;
        this.sequelizeInstances[alias] = new Sequelize(option);
        promises.push({ alias, resolver: this.sequelizeInstances[alias].authenticate() });
      });

      promises = promises.map(promise => promise.resolver.catch(error => ({ error, alias: promise.alias })));
      Promise.all(promises).then((cons) => {
        cons.forEach((auth) => {
          if (auth && auth.error) {
            console.error(`A connection to "${auth.alias}" could not be established; ${auth.error.message}`);
            delete this.sequelizeInstances[auth.alias];
          }
        });

        if (this.instance('default').unloaded) {
          return no(new Error('No valid database connections could be established.'));
        }

        this.models.forEach((model) => {
          try {
            Object.keys(this.sequelizeInstances).forEach((instance) => {
              if (!this.sequelizeInstances[instance].unloaded) {
                const schema = require.call(null, `${pathToModels}${model}`);
                schema(this.sequelizeInstances[instance], Sequelize);
              }
            });
          } catch (error) {
            return no(new Error(`The ${model} model could not be loaded: ${error.stack}`));
          }
        });

        /**
         * Setup the model data relations.
         * @see .relate() in each model definition (/path/to/models)
         */
        Object.keys(this.sequelizeInstances).forEach((instance) => {
          if (!this.sequelizeInstances[instance].unloaded) {
            Object.keys(this.sequelizeInstances[instance].models).forEach((key) => {
              if (typeof this.sequelizeInstances[instance].models[key].relate === 'function') {
                this.sequelizeInstances[instance].models[key].relate();
              }
            });
          }
        });

        return yes({
          instances: Object.keys(this.sequelizeInstances).length,
          models: this.models.length
        });
      });
    });
  }

  /**
   * Get any model (Available after the application is booted)
   * Does the same as the proxy, here for legacy reasons.
   *
   * @param model -The model being loaded.
   * @see Modellr.load()
   * @return Sequelize model
   */
  get(model) {
    return new Promise((yes, no) => {
      const requestedModel = this.sequelizeInstance.models[model];
      if (!requestedModel) {
        return no(new Error(`The "${model}" model does not exist.`));
      }

      return yes(requestedModel);
    });
  }

  /**
   * Switch database connections by alias.
   *
   * @param alias -The connection/instance being selected, by alias.
   * @return Sequelize instance.
   */
  instance(alias = null) {
    if (alias && alias in this.sequelizeInstances && !this.sequelizeInstances[alias].unloaded) {
      return this.sequelizeInstances[alias];
    }

    const instances = Object.keys(this.sequelizeInstances);
    for (let ins = 0; ins < instances.length; ins += 1) {
      const instanceAlias = instances[ins];
      if (!this.sequelizeInstances[instanceAlias].unloaded) {
        return this.sequelizeInstances[instanceAlias];
      }
    }

    return this.sequelizeInstances.default;
  }
}

const modellr = new Modellr();
module.exports = new Proxy(modellr, {
  get: (target, name) => {
    if (name === 'sequelizeInstances') {
      const instance = target.instance(name);
      if (name in instance.models) {
        return instance.models[name];
      }
    }

    return target[name];
  },
  has: (target, key) => key in target || target.hasItem(key)
});

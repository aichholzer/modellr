// Modules
const fs = require('fs');
const Sequelize = require('sequelize');

class Models {
  constructor() {
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
   * @param options (object property) -Array of database connection options.
   * @param models (object property) -Path the the model definitions.
   * @return Promise.
   */
  load({ options, models }) {
    const promises = [];
    let connectionOptions = [];
    if (!Array.isArray(options)) {
      connectionOptions.push(options);
    } else {
      connectionOptions = options;
    }

    return new Promise((yes, no) => {
      let alias = 'default';
      try {
        connectionOptions.forEach((option) => {
          alias = option.alias || alias;
          option.operatorsAliases = option.operatorsAliases || Sequelize.Op;
          this.sequelizeInstances[alias] = new Sequelize(option);
          promises.push(this.sequelizeInstances[alias].authenticate());
        });

        Promise.all(promises).then(() => {
          fs.readdirSync(models).forEach((file) => {
            if (file.match(/(.+)\.js$/)) {
              try {
                Object.keys(this.sequelizeInstances).forEach((instance) => {
                  if (!this.sequelizeInstances[instance].unloaded) {
                    const schema = require.call(null, `${models}${file}`);
                    schema(this.sequelizeInstances[instance], Sequelize);
                  }
                });
              } catch (error) {
                return no(new Error(`I can't load model: ${error.stack}`));
              }
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

          return yes();
        });
      } catch (error) {
        return no(new Error(`I can't connect to the "${alias}" database server; ${error.message}`));
      }
    });
  }

  /**
   * Get any model (Available after the application is booted)
   * Does the same as the proxy, here for legacy reasons.
   *
   * @param model -The model being loaded.
   * @see Models.load()
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
    if (alias && this.sequelizeInstances[alias] && !this.sequelizeInstances[alias].unloaded) {
      return this.sequelizeInstances[alias].models;
    }

    let currentInstance = this.sequelizeInstances.default;
    Object.keys(this.sequelizeInstances).forEach((instanceAlias) => {
      if (!this.sequelizeInstances[instanceAlias].unloaded) {
        currentInstance = this.sequelizeInstances[instanceAlias];
      }
    });

    return currentInstance;
  }
}

module.exports = new Proxy(new Models(), {
  get: (target, name) => {
    const instance = target.instance(name);
    if (instance.models[name]) {
      return instance.models[name];
    }

    return target[name];
  }
});

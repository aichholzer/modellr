// Modules
const EventEmitter = require('events');
const fs = require('fs');
const Sequelize = require('sequelize');

Sequelize.Promise = global.Promise;
class Modellr extends EventEmitter {
  constructor() {
    super();
    this.models = [];
    this.modellrSequelizeInstances = {
      default: {
        unloaded: true,
        models: []
      }
    };
  }

  /**
   * Builds an array of connections, this array will be
   * used to build one Sequelize instance per connection.
   *
   * @param connections - An object or array of options.
   * @param no - Parent promise rejector.
   * @return {*}
   */
  modellrPrepareConnections(connections, no) {
    this.modellrConnectionOptions = [];
    if (!Array.isArray(connections)) {
      this.modellrConnectionOptions.push(connections);
    } else {
      this.modellrConnectionOptions = connections;
    }

    if (!this.modellrConnectionOptions.length) {
      return no(new Error('No valid database connections options have been provided.'));
    }

    return true;
  }

  /**
   * Set up a Sequelize instance per connection.
   * This method does not reject on error, but rather collects them in an array
   * for further action.
   *
   * @return {Array}
   */
  modellrBuildInstances() {
    const connections = [];
    let alias = 'default';

    this.modellrConnectionOptions.forEach((option) => {
      alias = option.alias || alias;
      option.operatorsAliases = option.operatorsAliases || Sequelize.Op;
      this.modellrSequelizeInstances[alias] = new Proxy(new Sequelize(option), {
        get: (target, name) => {
          if (target.models[name]) {
            return target.models[name];
          }

          return target[name];
        }
      });

      connections.push({ alias, solve: this.modellrSequelizeInstances[alias].authenticate() });
    });

    return connections.map((conn) => conn.solve.catch((error) => ({ error, alias: conn.alias })));
  }

  /**
   * After all Sequelize instances have been build, this will take care of
   * pruning/removing the ones that failed on authentication.
   *
   * @param connections - The Sequelize connections/instances.
   * @return void
   */
  modellrPruneConnections(connections) {
    connections.forEach((conn) => {
      if (conn && conn.error) {
        this.emit(
          'warning',
          `A connection to "${conn.alias}" could not be established; ${conn.error.message}`
        );
        delete this.modellrSequelizeInstances[conn.alias];
      }
    });
  }

  /**
   * Load all existing models.
   * Creates a Sequelize model for each loaded model definition.
   *
   * @param pathToModels -Path to the model definitions.
   * @return {*}
   */
  modellrLoadModels(pathToModels, no) {
    if (!this.models.length) {
      this.models = fs.readdirSync(pathToModels).filter((model) => model.match(/(.+)\.js$/));
    }

    this.models.forEach((model) => {
      try {
        Object.keys(this.modellrSequelizeInstances).forEach((instance) => {
          if (!this.modellrSequelizeInstances[instance].unloaded) {
            const schema = require.call(null, `${pathToModels}${model}`);
            schema(this.modellrSequelizeInstances[instance], Sequelize);
          }
        });
      } catch (error) {
        return no(new Error(`The "${model}" model could not be loaded: ${error.stack}`));
      }

      return true;
    });

    /**
     * Setup the model data relations.
     * @see .relate() in each model definition (/path/to/models)
     */
    Object.keys(this.modellrSequelizeInstances).forEach((instance) => {
      if (!this.modellrSequelizeInstances[instance].unloaded) {
        Object.keys(this.modellrSequelizeInstances[instance].models).forEach((key) => {
          if (typeof this.modellrSequelizeInstances[instance].models[key].relate === 'function') {
            this.modellrSequelizeInstances[instance].models[key].relate();
          }
        });
      }
    });
  }

  /**
   * This should be called only at boot time.
   * It will setup the DB connections, load the model schemas and associate them
   * to each Sequelize instance.
   *
   * @param connections -Array of database connection options.
   * @param pathToModels -Path to the model/schema definitions.
   * @return Promise.
   */
  load(connections = [], pathToModels = null) {
    return new Promise((yes, no) => {
      this.modellrPrepareConnections(connections, no);
      Promise.all(this.modellrBuildInstances()).then((cons) => {
        this.modellrPruneConnections(cons);
        if (this.instance('default').unloaded) {
          return no(new Error('No valid database connections could be established.'));
        }

        this.modellrLoadModels(pathToModels, no);
        return yes({
          instances: Object.keys(this.modellrSequelizeInstances).length,
          models: this.models.length
        });
      });
    });
  }

  /**
   * Once a connection has been closed it becomes useless.
   * This should only be invoked once the program is done running.
   *
   * @param connection - The connection to be closed. 'null' will close all connections.
   * @return void
   */
  close(connection = null) {
    if (!connection) {
      Object.keys(this.modellrSequelizeInstances).forEach((instance) => {
        if (!this.modellrSequelizeInstances[instance].unloaded) {
          this.modellrSequelizeInstances[instance].close();
        }
      });

      this.models = [];
    } else if (
      this.modellrSequelizeInstances[connection] &&
      !this.modellrSequelizeInstances[connection].unloaded
    ) {
      this.modellrSequelizeInstances[connection].close();
    }
  }

  /**
   * Switch database connections by alias.
   *
   * @param alias -The connection/instance being selected, by alias.
   * @return Sequelize instance.
   */
  instance(alias = null) {
    let instance = this.modellrSequelizeInstances.default;
    if (
      alias &&
      alias in this.modellrSequelizeInstances &&
      !this.modellrSequelizeInstances[alias].unloaded
    ) {
      instance = this.modellrSequelizeInstances[alias];
    } else {
      const instances = Object.keys(this.modellrSequelizeInstances);
      for (let ins = 0; ins < instances.length; ins += 1) {
        const instanceAlias = instances[ins];
        if (!this.modellrSequelizeInstances[instanceAlias].unloaded) {
          instance = this.modellrSequelizeInstances[instanceAlias];
          break;
        }
      }
    }

    instance.get = function modelGetter(model) {
      return this.models[model] || null;
    };

    return instance;
  }
}

const modellr = new Modellr();
module.exports = new Proxy(modellr, {
  get: (target, name) => {
    if (
      [
        'on',
        'emit',
        'load',
        'close',
        'models',
        'instance',
        'domain',
        '_events',
        '_eventsCount',
        '_maxListeners'
      ].includes(name) ||
      name.toString().startsWith('modellr')
    ) {
      return target[name];
    }

    const instance = target.instance(name);
    if (name === 'hasOwnProperty') {
      return null;
    }
    return instance && instance.models[name] ? instance.models[name] : target[name];
  }
});

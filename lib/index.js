// Modules
const EventEmitter = require('events');
const fs = require('fs');
const Sequelize = require('sequelize');

Sequelize.Promise = global.Promise;
class Modellr extends EventEmitter {
  constructor() {
    super();
    this.models = [];
    this.sequelizeInstances = {
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
  prepareConnections(connections, no) {
    this.connectionOptions = [];
    if (!Array.isArray(connections)) {
      this.connectionOptions.push(connections);
    } else {
      this.connectionOptions = connections;
    }

    if (!this.connectionOptions.length) {
      return no(new Error('No valid database connections options have been provided.'));
    }
  }

  /**
   * Set up a Sequelize instance per connection.
   * This method does not reject on error, but rather collects them in an array
   * for further action.
   *
   * @return {Array}
   */
  buildInstances() {
    const connections = [];
    let alias = 'default';

    this.connectionOptions.forEach((option) => {
      alias = option.alias || alias;
      option.operatorsAliases = option.operatorsAliases || Sequelize.Op;
      this.sequelizeInstances[alias] = new Sequelize(option);
      connections.push({ alias, solve: this.sequelizeInstances[alias].authenticate() });
    });

    return connections.map(conn => conn.solve.catch(error => ({ error, alias: conn.alias })));
  }

  /**
   * After all Sequelize instances have been build, this will take care of
   * pruning/removing the ones that failed on authentication.
   *
   * @param connections - The Sequelize connections/instances.
   * @return void
   */
  pruneConnections(connections) {
    connections.forEach((conn) => {
      if (conn && conn.error) {
        this.emit('warning', `A connection to "${conn.alias}" could not be established; ${conn.error.message}`);
        delete this.sequelizeInstances[conn.alias];
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
  loadModels(pathToModels, no) {
    if (!this.models.length) {
      this.models = fs.readdirSync(pathToModels).filter(model => model.match(/(.+)\.js$/));
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
        return no(new Error(`The "${model}" model could not be loaded: ${error.stack}`));
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
      this.prepareConnections(connections, no);
      Promise.all(this.buildInstances()).then((cons) => {
        this.pruneConnections(cons);
        if (this.instance('default').unloaded) {
          return no(new Error('No valid database connections could be established.'));
        }

        this.loadModels(pathToModels, no);
        return yes({
          instances: Object.keys(this.sequelizeInstances).length,
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
      Object.keys(this.sequelizeInstances).forEach((instance) => {
        if (!this.sequelizeInstances[instance].unloaded) {
          this.sequelizeInstances[instance].close();
        }
      });

      this.models = [];
    } else if (this.sequelizeInstances[connection] && !this.sequelizeInstances[connection].unloaded) {
      this.sequelizeInstances[connection].close();
    }
  }

  /**
   * Switch database connections by alias.
   *
   * @param alias -The connection/instance being selected, by alias.
   * @return Sequelize instance.
   */
  instance(alias = null) {
    let instance = this.sequelizeInstances.default;
    if (alias && alias in this.sequelizeInstances && !this.sequelizeInstances[alias].unloaded) {
      instance = this.sequelizeInstances[alias];
    } else {
      const instances = Object.keys(this.sequelizeInstances);
      for (let ins = 0; ins < instances.length; ins += 1) {
        const instanceAlias = instances[ins];
        if (!this.sequelizeInstances[instanceAlias].unloaded) {
          instance = this.sequelizeInstances[instanceAlias];
          break;
        }
      }
    }

    instance.get = function modelGetter(model) {
      return this.models[model] || null;
    };

    return new Proxy(instance, {
      get: (target, name) => {
        if (target.models[name]) {
          return target.models[name];
        }

        return target[name];
      }
    });
  }
}

const modellr = new Modellr();
module.exports = new Proxy(modellr, {
  get: (target, name) => {
    const instance = target.instance(name);
    if (instance.models[name]) {
      return instance.models[name];
    }

    return target[name];
  }
});

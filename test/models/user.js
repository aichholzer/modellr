module.exports = (sequelize, type) => {
  // Table options
  const options = {
    tableName: 'users'
  };

  // Data schema
  const schema = {
    id: {
      type: type.INTEGER,
      primaryKey: true
    },
    email: {
      type: type.STRING
    },
    name: {
      type: type.STRING
    }
  };

  // Model instance
  const model = sequelize.define('User', schema, options);

  // Class methods (available on the model).
  // Setup model/data relations.
  model.relate = function relate() {
    this.belongsToMany(sequelize.models.Organization, {
      as: 'organizations',
      through: sequelize.models.OrganizationUser,
      foreignKey: 'user',
      otherKey: 'organization'
    });
  };

  model.findById = userId => Promise.resolve({
    id: userId,
    email: 'test@test.com',
    name: 'James Taylor'
  });

  // Instance methods (available on the result set).
  model.prototype.getName = function getName() {};

  return model;
};

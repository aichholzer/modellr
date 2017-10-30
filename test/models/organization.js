module.exports = (sequelize, type) => {
  // Table options
  const options = {
    tableName: 'organizations'
  };

  // Data schema
  const schema = {
    id: {
      type: type.INTEGER,
      primaryKey: true
    },
    name: {
      type: type.STRING,
      required: true
    }
  };

  // Model instance
  const model = sequelize.define('Organization', schema, options);

  // Class methods (available on the model).
  // Setup model/data relations.
  model.relate = function relate() {
    this.belongsToMany(sequelize.models.User, {
      as: 'users',
      through: sequelize.models.OrganizationUser,
      foreignKey: 'organization',
      otherKey: 'user'
    });
  };

  return model;
};

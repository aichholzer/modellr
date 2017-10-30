module.exports = (sequelize, type) => {
  // Table options
  const options = {
    tableName: 'organization_users'
  };

  // Data schema
  const schema = {
    organisation: {
      type: type.INTEGER
    },
    user: {
      type: type.INTEGER
    }
  };

  // Model instance
  const model = sequelize.define('OrganizationUser', schema, options);

  // Class methods (available on the model).
  // Setup model/data relations.
  model.relate = function relate() {
    this.belongsTo(sequelize.models.Organization, {
      foreignKey: 'organization'
    });

    this.belongsTo(sequelize.models.User, {
      foreignKey: 'user'
    });
  };

  return model;
};

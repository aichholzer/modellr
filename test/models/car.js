module.exports = (sequelize, type) => {
  // Table options
  const options = {
    tableName: 'cars'
  };

  // Data schema
  const schema = {
    id: {
      type: type.INTEGER,
      primaryKey: true
    }
  };

  // Model instance
  const model = sequelize.define('Car', schema, options);

  return model;
};

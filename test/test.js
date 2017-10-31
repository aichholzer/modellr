
describe('Single example', () => {
  it.skip('Single DB connection (with error)', (done) => {
    const Sequelize = require('sequelize');
    const instance = new Sequelize({
      database: 'doshii',
      username: 'local',
      password: 'master',
      dialect: 'postgres',
      logging: false,
      operatorsAliases: Sequelize.Op
    });

    Promise.all([instance.authenticate()]).then(() => {
      console.log('YES');
    }).catch(() => {
      console.log('NO');
    });
  });
});

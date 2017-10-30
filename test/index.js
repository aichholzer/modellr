const chai = require('chai');
const Sequelize = require('sequelize');
const sinon = require('sinon');
const { expect } = chai;

Sequelize.prototype.authenticate = sinon.stub().returns(Promise.resolve);
const defaultOptions = {
  host: 'localhost',
  port: 5432,
  database: 'test',
  username: 'test',
  password: 'test',
  dialect: 'postgres'
};
const models = `${__dirname}/models/`;
const deleteCache = () => {
  delete require.cache[require.resolve('../lib/index.js')];
};

describe('Modellr', () => {
  it('Check the (empty) object', (done) => {
    const m = require.call(null, '../lib/index.js');

    expect(m).to.be.an('object');
    expect(m.sequelizeInstances).to.be.an('object');
    expect(m.sequelizeInstances.default).to.be.an('object');
    expect(m.sequelizeInstances.default.unloaded).to.equal(true);
    expect(m.sequelizeInstances.default.models).to.be.an('array').with.lengthOf(0);

    deleteCache();
    done();
  });

  it('Single DB connection', (done) => {
    const m = require.call(null, '../lib/index.js');

    const connection = {
      options: Object.assign({}, defaultOptions, { alias: 'alias' }),
      models
    };

    m.load(connection).then(() => {
      expect(m.sequelizeInstances).to.be.an('object');
      expect(Object.keys(m.sequelizeInstances)).to.have.lengthOf(2);
      expect(m.instance('alias')).to.be.an('object');
      deleteCache();
      done();
    }).catch((error) => {
      done(error);
    });
  });

  it('Multiple DB connections', (done) => {
    const m = require.call(null, '../lib/index.js');

    const connection = {
      options: new Array(3).fill({}).map((conn, index) => Object.assign({}, defaultOptions, {
        alias: `alias_${index}`,
        host: `localhost_${index}`
      })),
      models
    };

    m.load(connection).then(() => {
      expect(m.sequelizeInstances).to.be.an('object');
      expect(Object.keys(m.sequelizeInstances)).to.have.lengthOf(4);
      new Array(3).fill('').forEach((key, index) => {
        expect(m.instance(`alias_${index}`)).to.be.an('object');
      });
      deleteCache();
      done();
    }).catch((error) => {
      done(error);
    });
  });
});


const chai = require('chai');
const Sequelize = require('sequelize');
const { stub } = require('sinon');
const { expect } = chai;

const models = `${__dirname}/models/`;
const { authenticate } = Sequelize.prototype;
const { error } = console;
const defaultOptions = {
  host: 'localhost',
  port: 5432,
  database: 'local',
  username: 'local',
  password: 'local',
  dialect: 'postgres',
  logging: false
};
const testInstance = (instance) => {
  expect(instance).to.be.an('object');
  expect(instance).to.have.property('options');
  expect(instance).to.have.property('models');
  expect(instance.models).to.be.an('object');
  expect(Object.keys(instance.models)).to.have.lengthOf(3);
};

let m = null;
describe('Modellr', () => {
  beforeEach(() => {
    m = require.call(null, '../lib/index.js');
  });

  afterEach(() => {
    m = null;
    delete require.cache[require.resolve('../lib/index.js')];
    Sequelize.prototype.authenticate = authenticate;
    console.error = error;
  });

  describe('➔ Pass', () => {
    it('Check the (empty) object', (done) => {
      expect(m).to.be.an('object');
      expect(m.sequelizeInstances).to.be.an('object');
      expect(m.sequelizeInstances.default).to.be.an('object');
      expect(m.sequelizeInstances.default.unloaded).to.equal(true);
      expect(m.sequelizeInstances.default.models).to.be.an('array').with.lengthOf(0);

      done();
    });

    it('Single DB connection', (done) => {
      const connection = Object.assign({}, defaultOptions, { alias: 'alias' });

      Sequelize.prototype.authenticate = stub().returns(Promise.resolve(undefined));
      m.load(connection, models).then(() => {
        expect(m.sequelizeInstances).to.be.an('object');
        expect(Object.keys(m.sequelizeInstances)).to.have.lengthOf(2);
        testInstance(m.instance('alias'));
        testInstance(m.instance('default'));

        done();
      });
    });

    it('Multiple DB connections', (done) => {
      const connection = new Array(3).fill({}).map((conn, index) => Object.assign({}, defaultOptions, {
        alias: `alias_${index}`
      }));

      Sequelize.prototype.authenticate = stub().returns(Promise.resolve(undefined));
      m.load(connection, models).then(() => {
        expect(m.sequelizeInstances).to.be.an('object');
        testInstance(m.instance('default'));
        expect(Object.keys(m.sequelizeInstances)).to.have.lengthOf(4);
        new Array(3).fill('').forEach((key, index) => {
          testInstance(m.instance(`alias_${index}`));
        });

        done();
      });
    });
  });

  describe('➔ Fail', () => {
    it('Single DB connection (with error)', (done) => {
      console.error = stub().returns(() => '');
      const connection = Object.assign({}, defaultOptions, { alias: 'alias', host: 'localhost_error' });

      m.load(connection, models).catch((err) => {
        expect(err.message).to.be.a('string');
        expect(err.message).to.equal('No valid database connections could be established.');
        done();
      });
    });

    it('Multiple DB connections (with error)', (done) => {
      console.error = stub().returns(() => '');
      const connection = new Array(3).fill({}).map((conn, index) => Object.assign({}, defaultOptions, {
        alias: `alias_${index}`,
        host: index === 1 ? `localhost_${index}` : 'localhost'
      }));

      // Sequelize.prototype.authenticate = stub().returns(Promise.resolve(undefined));
      m.load(connection, models).then(() => {
        // expect(m.sequelizeInstances).to.be.an('object');
        // testInstance(m.instance('default'));
        /*
        expect(Object.keys(m.sequelizeInstances)).to.have.lengthOf(4);
        new Array(3).fill('').forEach((key, index) => {
          testInstance(m.instance(`alias_${index}`));
        });
        */

        console.log('XXXX');
        done() ;
      }).catch(err => {
        console.log(err);
        done();
      });
    });
  });
});

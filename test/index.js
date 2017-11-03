const chai = require('chai');
const Sequelize = require('sequelize');
const sinon = require('sinon');
const { expect } = chai;

const models = `${__dirname}/models/`;
const defaultOptions = {
  database: 'database',
  username: 'username',
  password: 'password',
  dialect: 'postgres',
  logging: false
};
const testInstance = (instance) => {
  expect(instance).to.be.an('object');
  expect(instance).to.have.property('options');
  expect(instance).to.have.property('models');
  expect(instance.models).to.be.an('object');
  expect(Object.keys(instance.models)).to.have.lengthOf(4);
};
const prepareConnections = number => new Array(number).fill({}).map((conn, index) => Object.assign({}, defaultOptions, {
  alias: `alias_${index}`
}));

let [m, sandbox] = [];
describe('➔ Modellr', () => {
  beforeEach(() => {
    m = require.call(null, '../lib/index.js');
    sandbox = sinon.sandbox.create();
    sandbox.stub(console, 'error').returns(() => '');
    sandbox.stub(Sequelize.prototype, 'authenticate').returns(Promise.resolve(undefined));
  });

  afterEach(() => {
    delete require.cache[require.resolve('../lib/index.js')];
    m.close();
    sandbox.restore();
  });

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
    m.load(connection, models).then(() => {
      expect(m.sequelizeInstances).to.be.an('object');
      expect(Object.keys(m.sequelizeInstances)).to.have.lengthOf(2);
      testInstance(m.instance('alias'));
      testInstance(m.instance('default'));

      done();
    }).catch(done);
  });

  it('Multiple DB connections', (done) => {
    m.load(prepareConnections(3), models).then(() => {
      expect(m.sequelizeInstances).to.be.an('object');
      testInstance(m.instance('default'));
      expect(Object.keys(m.sequelizeInstances)).to.have.lengthOf(4);
      new Array(3).fill('').forEach((key, index) => {
        testInstance(m.instance(`alias_${index}`));
      });

      done();
    }).catch(done);
  });

  it('Use default alias', (done) => {
    const connection = Object.assign({}, defaultOptions);
    m.load(connection, models).then(() => {
      expect(m.sequelizeInstances).to.be.an('object');
      expect(Object.keys(m.sequelizeInstances)).to.have.lengthOf(1);
      testInstance(m.instance('default'));

      done();
    }).catch(done);
  });

  it('Close connections by alias', (done) => {
    m.load(prepareConnections(3), models).then(() => {
      expect(m.sequelizeInstances).to.be.an('object');
      testInstance(m.instance('default'));
      expect(Object.keys(m.sequelizeInstances)).to.have.lengthOf(4);
      new Array(3).fill('').forEach((key, index) => {
        testInstance(m.instance(`alias_${index}`));
        m.close(`alias_${index}`);
      });

      done();
    }).catch(done);
  });

  it('Check if instance has models', (done) => {
    m.load(prepareConnections(3), models).then(() => {
      expect(m.sequelizeInstances).to.be.an('object');
      testInstance(m.instance('default'));
      expect(Object.keys(m.sequelizeInstances)).to.have.lengthOf(4);
      new Array(3).fill('').forEach((key, index) => {
        const instance = m.instance(`alias_${index}`);
        testInstance(instance);
        expect('User' in instance.models).to.equal(true);
        expect('House' in instance.models).to.equal(false);
      });

      done();
    }).catch(done);
  });

  it('Get a model from an instance', (done) => {
    const connection = Object.assign({}, defaultOptions, { alias: 'alias' });
    m.load(connection, models).then(() => {
      expect(m.sequelizeInstances).to.be.an('object');
      expect(Object.keys(m.sequelizeInstances)).to.have.lengthOf(2);
      testInstance(m.instance('alias'));
      expect(m.instance('alias').get('User')).to.be.a('function');
      expect(m.instance('alias').get('User').findById).to.be.a('function');

      return m.instance('alias').get('User').findById(100);
    }).then((user) => {
      expect(user).to.be.an('object');
      expect(user).to.have.property('id').and.to.be.a('number').and.to.equal(100);
      expect(user).to.have.property('email').and.to.be.a('string').and.to.equal('test@test.com');
      expect(user).to.have.property('name').and.to.be.a('string').and.to.equal('James Taylor');

      done();
    }).catch(done);
  });

  it('Get a model from an instance (no instance alias)', (done) => {
    const connection = Object.assign({}, defaultOptions, { alias: 'alias' });
    m.load(connection, models).then(() => {
      expect(m.sequelizeInstances).to.be.an('object');
      expect(Object.keys(m.sequelizeInstances)).to.have.lengthOf(2);
      testInstance(m.instance('alias'));
      expect(m.User).to.be.a('function');
      expect(m.User.findById).to.be.a('function');

      return m.User.findById(100);
    }).then((user) => {
      expect(user).to.be.an('object');
      expect(user).to.have.property('id').and.to.be.a('number').and.to.equal(100);
      expect(user).to.have.property('email').and.to.be.a('string').and.to.equal('test@test.com');
      expect(user).to.have.property('name').and.to.be.a('string').and.to.equal('James Taylor');

      done();
    }).catch(done);
  });

  it('Get a null instead of model from an instance', (done) => {
    const connection = Object.assign({}, defaultOptions, { alias: 'alias' });
    m.load(connection, models).then(() => {
      expect(m.sequelizeInstances).to.be.an('object');
      expect(Object.keys(m.sequelizeInstances)).to.have.lengthOf(2);
      testInstance(m.instance('alias'));
      expect(m.instance('alias').get('House')).to.equal(null);

      done();
    }).catch(done);
  });

  it('No valid DB connection', (done) => {
    m.load([], models).catch((err) => {
      expect(err.message).to.be.a('string');
      expect(err.message).to.equal('No valid database connections options have been provided.');

      done();
    }).catch(done);
  });

  it('Single DB connection (with error)', (done) => {
    sandbox.restore();
    sandbox.stub(console, 'error').returns(() => '');
    sandbox.stub(Sequelize.prototype, 'authenticate').returns(Promise.reject(new Error('Invalid credentials')));
    const connection = Object.assign({}, defaultOptions, { alias: 'alias', host: 'localhost_error' });
    m.load(connection, models).catch((err) => {
      expect(err.message).to.be.a('string');
      expect(err.message).to.equal('No valid database connections could be established.');

      done();
    }).catch(done);
  });

  it('Multiple DB connections (with one error)', (done) => {
    m.sequelizeInstances = new Proxy(m.sequelizeInstances, {
      set: (target, property, value) => {
        if (property === 'alias_1') {
          value.authenticate = sinon.stub().returns(Promise.reject(new Error('Invalid credentials.')));
        }
        target[property] = value;
        return true;
      }
    });

    m.load(prepareConnections(3), models).then(() => {
      expect(m.sequelizeInstances).to.be.an('object');
      testInstance(m.instance('default'));

      expect(Object.keys(m.sequelizeInstances)).to.have.lengthOf(3);
      expect(m.sequelizeInstances.alias_1).to.equal(undefined);
      testInstance(m.instance('alias_0'));
      testInstance(m.instance('alias_2'));

      done();
    }).catch(done);
  });

  it('Fail to load a model', (done) => {
    const connection = Object.assign({}, defaultOptions, { alias: 'alias' });
    m.models.push('house.error');
    m.load(connection, models).catch((error) => {
      expect(error.message).to.be.a('string');
      expect(error.message).to.have.string('The "house.error" model could not be loaded');
      done();
    }).catch(done);
  });
});

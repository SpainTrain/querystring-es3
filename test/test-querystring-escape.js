// https://github.com/nodejs/node/blob/v6.10.2/test/parallel/test-querystring-escape.js

'use strict';

const assert = require('assert');

const qs = require('..');

describe('test-querystring-escape', function() {
  it('does basic escaping', function() {
    assert.deepEqual(qs.escape(5), '5');
    assert.deepEqual(qs.escape('test'), 'test');
    assert.deepEqual(qs.escape({}), '%5Bobject%20Object%5D');
    assert.deepEqual(qs.escape([5, 10]), '5%2C10');
    assert.deepEqual(qs.escape('Ŋōđĕ'), '%C5%8A%C5%8D%C4%91%C4%95');
  });

  it('using toString for objects', function() {
    assert.strictEqual(
      qs.escape({test: 5, toString: () => 'test', valueOf: () => 10 }),
      'test'
    );
  });

  it('toString is not callable, must throw an error', function() {
    assert.throws(() => qs.escape({toString: 5}));
  });

  it('should use valueOf instead of non-callable toString', function() {
    assert.strictEqual(qs.escape({toString: 5, valueOf: () => 'test'}), 'test');
  });

  it('throws when given Symbol', function() {
    assert.throws(() => qs.escape(Symbol('test')));
  });
});

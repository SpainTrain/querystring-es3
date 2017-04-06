// https://github.com/nodejs/node/blob/v6.10.2/test/parallel/test-querystring-multichar-separator.js

'use strict';

const assert = require('assert');
const objectKeys = require('../src/object-keys');
const qs = require('..');

function check(actual, expected) {
  Object.create && assert(!(actual instanceof Object));
  assert.deepEqual(
    objectKeys(actual).sort(),
    objectKeys(expected).sort(),
  );
  objectKeys(expected).forEach(function(key) {
    assert.deepEqual(actual[key], expected[key]);
  });
}

describe('test-querystring-multichar-separator', function() {
  it('passes', function() {
    check(
      qs.parse('foo=>bar&&bar=>baz', '&&', '=>'),
      {foo: 'bar', bar: 'baz'},
    );

    assert.equal(
      qs.stringify({foo: 'bar', bar: 'baz'}, '&&', '=>'),
      'foo=>bar&&bar=>baz',
    );

    check(
      qs.parse('foo==>bar, bar==>baz', ', ', '==>'),
      {foo: 'bar', bar: 'baz'},
    );

    assert.equal(
      qs.stringify({foo: 'bar', bar: 'baz'}, ', ', '==>'),
      'foo==>bar, bar==>baz',
    );
  });
});

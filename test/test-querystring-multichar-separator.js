// https://github.com/nodejs/node/blob/v6.10.2/test/parallel/test-querystring-multichar-separator.js

'use strict';

const assert = require('assert');
const qs = require('..');

function check(actual, expected) {
  assert(!(actual instanceof Object));
  assert.deepStrictEqual(Object.keys(actual).sort(),
                         Object.keys(expected).sort());
  Object.keys(expected).forEach(function(key) {
    assert.deepStrictEqual(actual[key], expected[key]);
  });
}

describe('test-querystring-multichar-separator', function() {
  it('passes', function() {
    check(
      qs.parse('foo=>bar&&bar=>baz', '&&', '=>'),
      {foo: 'bar', bar: 'baz'},
    );

    check(
      qs.stringify({foo: 'bar', bar: 'baz'}, '&&', '=>'),
      'foo=>bar&&bar=>baz',
    );

    check(
      qs.parse('foo==>bar, bar==>baz', ', ', '==>'),
      {foo: 'bar', bar: 'baz'},
    );

    check(qs.stringify({foo: 'bar', bar: 'baz'}, ', ', '==>'),
          'foo==>bar, bar==>baz');
  });
});

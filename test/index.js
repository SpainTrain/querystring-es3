// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// test using assert
var assert = require('assert');
var JSON = require('json3');
const inspect = require('object-inspect');
var qs = require('../');

// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.io/#x15.4.4.18
if (!Array.prototype.forEach) {

  Array.prototype.forEach = function(callback/*, thisArg*/) {

    var T, k;

    if (this == null) {
      throw new TypeError('this is null or not defined');
    }

    // 1. Let O be the result of calling toObject() passing the
    // |this| value as the argument.
    var O = Object(this);

    // 2. Let lenValue be the result of calling the Get() internal
    // method of O with the argument "length".
    // 3. Let len be toUint32(lenValue).
    var len = O.length >>> 0;

    // 4. If isCallable(callback) is false, throw a TypeError exception.
    // See: http://es5.github.com/#x9.11
    if (typeof callback !== 'function') {
      throw new TypeError(callback + ' is not a function');
    }

    // 5. If thisArg was supplied, let T be thisArg; else let
    // T be undefined.
    if (arguments.length > 1) {
      T = arguments[1];
    }

    // 6. Let k be 0
    k = 0;

    // 7. Repeat, while k < len
    while (k < len) {

      var kValue;

      // a. Let Pk be ToString(k).
      //    This is implicit for LHS operands of the in operator
      // b. Let kPresent be the result of calling the HasProperty
      //    internal method of O with argument Pk.
      //    This step can be combined with c
      // c. If kPresent is true, then
      if (k in O) {

        // i. Let kValue be the result of calling the Get internal
        // method of O with argument Pk.
        kValue = O[k];

        // ii. Call the Call internal method of callback with T as
        // the this value and argument list containing kValue, k, and O.
        callback.call(T, kValue, k, O);
      }
      // d. Increase k by 1.
      k++;
    }
    // 8. return undefined
  };
}


function createWithNoPrototype(properties) {
  const noProto = Object.create ? Object.create(null) : {}; // IE8
  properties.forEach((property) => {
    noProto[property.key] = property.value;
  });
  return noProto;
}

const qsTestCases = [
  ['__proto__=1',
   '__proto__=1',
   createWithNoPrototype([{key: '__proto__', value: '1'}])],
  ['__defineGetter__=asdf',
   '__defineGetter__=asdf',
   JSON.parse('{"__defineGetter__":"asdf"}')],
  ['foo=918854443121279438895193',
   'foo=918854443121279438895193',
   {'foo': '918854443121279438895193'}],
  ['foo=bar', 'foo=bar', {'foo': 'bar'}],
  ['foo=bar&foo=quux', 'foo=bar&foo=quux', {'foo': ['bar', 'quux']}],
  ['foo=1&bar=2', 'foo=1&bar=2', {'foo': '1', 'bar': '2'}],
  ['my+weird+field=q1%212%22%27w%245%267%2Fz8%29%3F',
   'my%20weird%20field=q1!2%22\'w%245%267%2Fz8)%3F',
   {'my weird field': 'q1!2"\'w$5&7/z8)?' }],
  ['foo%3Dbaz=bar', 'foo%3Dbaz=bar', {'foo=baz': 'bar'}],
  ['foo=baz=bar', 'foo=baz%3Dbar', {'foo': 'baz=bar'}],
  ['str=foo&arr=1&arr=2&arr=3&somenull=&undef=',
   'str=foo&arr=1&arr=2&arr=3&somenull=&undef=',
   { 'str': 'foo',
     'arr': ['1', '2', '3'],
     'somenull': '',
     'undef': ''}],
  [' foo = bar ', '%20foo%20=%20bar%20', {' foo ': ' bar '}],
  ['foo=%zx', 'foo=%25zx', {'foo': '%zx'}],
  ['foo=%EF%BF%BD', 'foo=%EF%BF%BD', {'foo': '\ufffd' }],
  // See: https://github.com/joyent/node/issues/1707
  ['hasOwnProperty=x&toString=foo&valueOf=bar&__defineGetter__=baz',
   'hasOwnProperty=x&toString=foo&valueOf=bar&__defineGetter__=baz',
   { hasOwnProperty: 'x',
     toString: 'foo',
     valueOf: 'bar',
     __defineGetter__: 'baz' }],
  // See: https://github.com/joyent/node/issues/3058
  ['foo&bar=baz', 'foo=&bar=baz', { foo: '', bar: 'baz' }],
  ['a=b&c&d=e', 'a=b&c=&d=e', { a: 'b', c: '', d: 'e' }],
  ['a=b&c=&d=e', 'a=b&c=&d=e', { a: 'b', c: '', d: 'e' }],
  ['a=b&=c&d=e', 'a=b&=c&d=e', { a: 'b', '': 'c', d: 'e' }],
  ['a=b&=&c=d', 'a=b&=&c=d', { a: 'b', '': '', c: 'd' }],
  ['&&foo=bar&&', 'foo=bar', { foo: 'bar' }],
  ['&&&&', '', {}],
  ['&=&', '=', { '': '' }],
  ['&=&=', '=&=', { '': [ '', '' ]}],
  ['a&&b', 'a=&b=', { 'a': '', 'b': '' }],
  ['a=a&&b=b', 'a=a&b=b', { 'a': 'a', 'b': 'b' }],
  ['&a', 'a=', { 'a': '' }],
  ['&=', '=', { '': '' }],
  ['a&a&', 'a=&a=', { a: [ '', '' ] }],
  ['a&a&a&', 'a=&a=&a=', { a: [ '', '', '' ] }],
  ['a&a&a&a&', 'a=&a=&a=&a=', { a: [ '', '', '', '' ] }],
  ['a=&a=value&a=', 'a=&a=value&a=', { a: [ '', 'value', '' ] }],
  ['foo+bar=baz+quux', 'foo%20bar=baz%20quux', { 'foo bar': 'baz quux' }],
  ['+foo=+bar', '%20foo=%20bar', { ' foo': ' bar' }],
  [null, '', {}],
  [undefined, '', {}]
];

// [ wonkyQS, canonicalQS, obj ]
var qsColonTestCases = [
  ['foo:bar', 'foo:bar', {'foo': 'bar'}],
  ['foo:bar;foo:quux', 'foo:bar;foo:quux', {'foo': ['bar', 'quux']}],
  ['foo:1&bar:2;baz:quux',
   'foo:1%26bar%3A2;baz:quux',
   {'foo': '1&bar:2', 'baz': 'quux'}],
  ['foo%3Abaz:bar', 'foo%3Abaz:bar', {'foo:baz': 'bar'}],
  ['foo:baz:bar', 'foo:baz%3Abar', {'foo': 'baz:bar'}]
];

// [wonkyObj, qs, canonicalObj]
var extendedFunction = function() {};
extendedFunction.prototype = {a: 'b'};
var qsWeirdObjects = [
  [{regexp: /./g}, 'regexp=', {'regexp': ''}],
  [{regexp: new RegExp('.', 'g')}, 'regexp=', {'regexp': ''}],
  [{fn: function() {}}, 'fn=', {'fn': ''}],
  [{fn: new Function('')}, 'fn=', {'fn': ''}],
  [{math: Math}, 'math=', {'math': ''}],
  [{e: extendedFunction}, 'e=', {'e': ''}],
  [{d: new Date()}, 'd=', {'d': ''}],
  [{d: Date}, 'd=', {'d': ''}],
  [{f: new Boolean(false), t: new Boolean(true)}, 'f=&t=', {'f': '', 't': ''}],
  [{f: false, t: true}, 'f=false&t=true', {'f': 'false', 't': 'true'}],
  [{n: null}, 'n=', {'n': ''}],
  [{nan: NaN}, 'nan=', {'nan': ''}],
  [{inf: Infinity}, 'inf=', {'inf': ''}]
];
// }}}

var qsNoMungeTestCases = [
  ['', {}],
  ['foo=bar&foo=baz', {'foo': ['bar', 'baz']}],
  ['blah=burp', {'blah': 'burp'}],
  ['gragh=1&gragh=3&goo=2', {'gragh': ['1', '3'], 'goo': '2'}],
  ['frappucino=muffin&goat%5B%5D=scone&pond=moose',
   {'frappucino': 'muffin', 'goat[]': 'scone', 'pond': 'moose'}],
  ['trololol=yes&lololo=no', {'trololol': 'yes', 'lololo': 'no'}]
];

function check(actual, expected, input) {
  if (Object.create) {
    assert(!(actual instanceof Object));
  }
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  let msg;
  if (typeof input === 'string') {
    msg = `Input: ${inspect(input)}\n` +
          `Actual keys: ${inspect(actualKeys)}\n` +
          `Expected keys: ${inspect(expectedKeys)}`;
  }
  assert.deepEqual(actualKeys, expectedKeys, msg);
  expectedKeys.forEach(function(key) {
    if (typeof input === 'string') {
      msg = `Input: ${inspect(input)}\n` +
            `Key: ${inspect(key)}\n` +
            `Actual value: ${inspect(actual[key])}\n` +
            `Expected value: ${inspect(expected[key])}`;
    } else {
      msg = undefined;
    }
    assert.deepEqual(actual[key], expected[key], msg);
  });
}

describe('querystring-es3', function() {
  describe('parsing', function() {
    it('performs basic parsing', function() {
        assert.strictEqual('918854443121279438895193',
            qs.parse('id=918854443121279438895193').id,
            'parse id=918854443121279438895193');
    });

    it('test that the canonical qs is parsed properly', function() {
      qsTestCases.forEach(function(testCase) {
        check(qs.parse(testCase[0]), testCase[2], testCase[0]);
      });
    });

    it('test that the colon test cases can do the same', function() {
      qsColonTestCases.forEach(function(testCase) {
        assert.deepEqual(testCase[2], qs.parse(testCase[0], ';', ':'),
                         'parse ' + testCase[0] + ' -> ; :');
      });
    });

    it('test the weird objects, that they get parsed properly', function() {
      qsWeirdObjects.forEach(function(testCase) {
        assert.deepEqual(testCase[2], qs.parse(testCase[1]),
                         'parse ' + testCase[1]);
      });
    })
  })

  it('test non munge test cases', function() {
    qsNoMungeTestCases.forEach(function(testCase) {
      assert.deepEqual(testCase[0], qs.stringify(testCase[1], '&', '=', false),
                       'stringify ' + JSON.stringify(testCase[1]) + ' -> & =');
    });
  })

  it('test the nested qs-in-qs case', function() {
    var f = qs.parse('a=b&q=x%3Dy%26y%3Dz');
    f.q = qs.parse(f.q);
    assert.deepEqual(f, { a: 'b', q: { x: 'y', y: 'z' } },
                     'parse a=b&q=x%3Dy%26y%3Dz');
  })

  it('test nested in colon', function() {
    var f = qs.parse('a:b;q:x%3Ay%3By%3Az', ';', ':');
    f.q = qs.parse(f.q, ';', ':');
    assert.deepEqual(f, { a: 'b', q: { x: 'y', y: 'z' } },
                     'parse a:b;q:x%3Ay%3By%3Az -> ; :');
  })

  it('test stringifying', function() {
    qsTestCases.forEach(function(testCase) {
      assert.equal(testCase[1], qs.stringify(testCase[2]),
                   'stringify ' + JSON.stringify(testCase[2]) +
                   '\nexpected ' + testCase[1] +
                   '\ngot ' + qs.stringify(testCase[2]));
    });

    qsColonTestCases.forEach(function(testCase) {
      assert.equal(testCase[1], qs.stringify(testCase[2], ';', ':'),
                   'stringify ' + JSON.stringify(testCase[2]) + ' -> ; :');
    });

    qsWeirdObjects.forEach(function(testCase) {
      assert.equal(testCase[1], qs.stringify(testCase[0]),
                   'stringify ' + JSON.stringify(testCase[0]));
    });
  })

  it('test stringifying nested', function() {
    var f = qs.stringify({
      a: 'b',
      q: qs.stringify({
        x: 'y',
        y: 'z'
      })
    });
    assert.equal(f, 'a=b&q=x%3Dy%26y%3Dz',
                 JSON.stringify({
                    a: 'b',
                    'qs.stringify -> q': {
                      x: 'y',
                      y: 'z'
                    }
                  }));

    var threw = false;
    try { qs.parse(undefined); } catch(error) { threw = true; }
    assert.ok(!threw, "does not throws on undefined");
  })

  it('test nested in colon again?', function() {
    var f = qs.stringify({
      a: 'b',
      q: qs.stringify({
        x: 'y',
        y: 'z'
      }, ';', ':')
    }, ';', ':');
    assert.equal(f, 'a:b;q:x%3Ay%3By%3Az',
                 'stringify ' + JSON.stringify({
                    a: 'b',
                    'qs.stringify -> q': {
                      x: 'y',
                      y: 'z'
                    }
                  }) + ' -> ; : ');


    assert.deepEqual({}, qs.parse(), 'parse undefined');
  })
})

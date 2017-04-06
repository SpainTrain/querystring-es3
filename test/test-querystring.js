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


// https://github.com/nodejs/node/blob/v6.10.2/test/parallel/test-querystring.js
'use strict';

// test using assert
const assert = require('assert');
const JSON = require('json3');
const inspect = require('object-inspect');
const objectKeys = require('../src/object-keys');
const qs = require('../');

const hasObjectCreate = !Object.create;

function createWithNoPrototype(properties) {
  const noProto = !hasObjectCreate ? Object.create(null) : {};
  properties.forEach((property) => {
    noProto[property.key] = property.value;
  });
  return noProto;
}

const qsTestCases = [
  !hasObjectCreate ? ['', '', {}] : [
      '__proto__=1',
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
   hasObjectCreate ?
      '__defineGetter__=baz&toString=foo&valueOf=bar&hasOwnProperty=x' :
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
  [{inf: Infinity}, 'inf=', {'inf': ''}],
  [{a: [], b: []}, '', {}]
];
// }}}

var qsNoMungeTestCases = [
  ['', {}],
  ['foo=bar&foo=baz', {'foo': ['bar', 'baz']}],
  ['blah=burp', {'blah': 'burp'}],
  ['a=!-._~\'()*', {'a': '!-._~\'()*'}],
  ['a=abcdefghijklmnopqrstuvwxyz', {'a': 'abcdefghijklmnopqrstuvwxyz'}],
  ['a=ABCDEFGHIJKLMNOPQRSTUVWXYZ', {'a': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'}],
  ['a=0123456789', {'a': '0123456789'}],
  ['gragh=1&gragh=3&goo=2', {'gragh': ['1', '3'], 'goo': '2'}],
  ['frappucino=muffin&goat%5B%5D=scone&pond=moose',
   {'frappucino': 'muffin', 'goat[]': 'scone', 'pond': 'moose'}],
  ['trololol=yes&lololo=no', {'trololol': 'yes', 'lololo': 'no'}]
];

const qsUnescapeTestCases = [
  ['there is nothing to unescape here',
   'there is nothing to unescape here'],
  ['there%20are%20several%20spaces%20that%20need%20to%20be%20unescaped',
   'there are several spaces that need to be unescaped'],
  ['there%2Qare%0-fake%escaped values in%%%%this%9Hstring',
   'there%2Qare%0-fake%escaped values in%%%%this%9Hstring'],
  ['%20%21%22%23%24%25%26%27%28%29%2A%2B%2C%2D%2E%2F%30%31%32%33%34%35%36%37',
   ' !"#$%&\'()*+,-./01234567']
];

function check(actual, expected, input) {
  if (Object.create) {
    assert(!(actual instanceof Object));
  }
  const actualKeys = objectKeys(actual).sort();
  const expectedKeys = objectKeys(expected).sort();
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

describe('test-querystring', function() {
  it('performs basic parsing', function() {
    assert.strictEqual(
      '918854443121279438895193',
      qs.parse('id=918854443121279438895193').id,
      'parse id=918854443121279438895193',
    );
  });

  it('test that the canonical qs is parsed properly', function() {
    qsTestCases.forEach(function(testCase) {
      check(qs.parse(testCase[0]), testCase[2], testCase[0]);
    });
  });

  it('test that the colon test cases can do the same', function() {
    qsColonTestCases.forEach(function(testCase) {
      check(qs.parse(testCase[0], ';', ':'), testCase[2]);
    });
  });

  it('test the weird objects, that they get parsed properly', function() {
    qsWeirdObjects.forEach(function(testCase) {
      check(qs.parse(testCase[1]), testCase[2]);
    });
  });

  it('test non munge test cases', function() {
    qsNoMungeTestCases.forEach(function(testCase) {
      assert.deepEqual(testCase[0], qs.stringify(testCase[1], '&', '='));
    });
  });

  it('test the nested qs-in-qs case', function() {
    const f = qs.parse('a=b&q=x%3Dy%26y%3Dz');
    check(f, createWithNoPrototype([
      { key: 'a', value: 'b'},
      {key: 'q', value: 'x=y&y=z'}
    ]));

    f.q = qs.parse(f.q);
    const expectedInternal = createWithNoPrototype([
      { key: 'x', value: 'y'},
      {key: 'y', value: 'z' }
    ]);
    check(f.q, expectedInternal);
  });

  it('test nested in colon', function() {
    const f = qs.parse('a:b;q:x%3Ay%3By%3Az', ';', ':');
    check(f, createWithNoPrototype([
      {key: 'a', value: 'b'},
      {key: 'q', value: 'x:y;y:z'}
    ]));
    f.q = qs.parse(f.q, ';', ':');
    const expectedInternal = createWithNoPrototype([
      { key: 'x', value: 'y'},
      {key: 'y', value: 'z' }
    ]);
    check(f.q, expectedInternal);
  });

  it('test stringifying basic', function() {
    qsTestCases.forEach(function(testCase) {
      assert.equal(testCase[1], qs.stringify(testCase[2]));
    });

    qsColonTestCases.forEach(function(testCase) {
      assert.equal(testCase[1], qs.stringify(testCase[2], ';', ':'));
    });

    qsWeirdObjects.forEach(function(testCase) {
      assert.equal(testCase[1], qs.stringify(testCase[0]));
    });
  });

  it('test stringifying invalid surrogate pair throws URIError', function() {
    assert.throws(function() {
      qs.stringify({ foo: '\udc00' });
    }, URIError);
  });


  it('test stringifying coerce numbers to string', function() {
    assert.strictEqual('foo=0', qs.stringify({ foo: 0 }));
    assert.strictEqual('foo=0', qs.stringify({ foo: -0 }));
    assert.strictEqual('foo=3', qs.stringify({ foo: 3 }));
    assert.strictEqual('foo=-72.42', qs.stringify({ foo: -72.42 }));
    assert.strictEqual('foo=', qs.stringify({ foo: NaN }));
    assert.strictEqual('foo=', qs.stringify({ foo: Infinity }));
  });

  it('test stringifying nested', function() {
    const f = qs.stringify({
      a: 'b',
      q: qs.stringify({
        x: 'y',
        y: 'z'
      })
    });
    assert.equal(f, 'a=b&q=x%3Dy%26y%3Dz');
  });

  it('test stringifying nested in colon', function() {
    const f = qs.stringify({
      a: 'b',
      q: qs.stringify({
        x: 'y',
        y: 'z'
      }, ';', ':')
    }, ';', ':');
    assert.equal(f, 'a:b;q:x%3Ay%3By%3Az');
  });

  it('test stringifying empty string', function() {
    assert.strictEqual(qs.stringify(), '');
    assert.strictEqual(qs.stringify(0), '');
    assert.strictEqual(qs.stringify([]), '');
    assert.strictEqual(qs.stringify(null), '');
    assert.strictEqual(qs.stringify(true), '');

    check(qs.parse(), {});
  });

  it('empty sep', function() {
    check(qs.parse('a', []), { a: '' });
  });

  it('empty eq', function() {
    check(qs.parse('a', null, []), { '': 'a' });
  });

  it('Test limiting', function() {
    assert.equal(
      objectKeys(qs.parse('a=1&b=1&c=1', null, null, { maxKeys: 1 })).length,
      1,
    );
  });

  it('Test removing limit', function() {
    if (Object.create) { // Crashed IE8, skip on IE8
      function testUnlimitedKeys() {
        const query = {};
        for (var i = 0; i < 2000; i++) query[i] = i;
        const url = qs.stringify(query);
        assert.equal(
            objectKeys(qs.parse(url, null, null, { maxKeys: 0 })).length,
            2000);
      }
      testUnlimitedKeys();
    }
  });

  it('buffer', function() {
    var b = qs.unescapeBuffer('%d3%f2Ug%1f6v%24%5e%98%cb' +
                              '%0d%ac%a2%2f%9d%eb%d8%a2%e6');
    // <Buffer d3 f2 55 67 1f 36 76 24 5e 98 cb 0d ac a2 2f 9d eb d8 a2 e6>
    assert.equal(0xd3, b[0]);
    assert.equal(0xf2, b[1]);
    assert.equal(0x55, b[2]);
    assert.equal(0x67, b[3]);
    assert.equal(0x1f, b[4]);
    assert.equal(0x36, b[5]);
    assert.equal(0x76, b[6]);
    assert.equal(0x24, b[7]);
    assert.equal(0x5e, b[8]);
    assert.equal(0x98, b[9]);
    assert.equal(0xcb, b[10]);
    assert.equal(0x0d, b[11]);
    assert.equal(0xac, b[12]);
    assert.equal(0xa2, b[13]);
    assert.equal(0x2f, b[14]);
    assert.equal(0x9d, b[15]);
    assert.equal(0xeb, b[16]);
    assert.equal(0xd8, b[17]);
    assert.equal(0xa2, b[18]);
    assert.equal(0xe6, b[19]);

    assert.strictEqual(qs.unescapeBuffer('a+b', true).toString(), 'a b');
    assert.strictEqual(qs.unescapeBuffer('a%').toString(), 'a%');
    assert.strictEqual(qs.unescapeBuffer('a%2').toString(), 'a%2');
    assert.strictEqual(qs.unescapeBuffer('a%20').toString(), 'a ');
    assert.strictEqual(qs.unescapeBuffer('a%2g').toString(), 'a%2g');
    assert.strictEqual(qs.unescapeBuffer('a%%').toString(), 'a%%');
  });


  it('Test custom decode', function() {
    function demoDecode(str) {
      return str + str;
    }
    check(
      qs.parse('a=a&b=b&c=c', null, null, { decodeURIComponent: demoDecode }),
      { aa: 'aa', bb: 'bb', cc: 'cc' },
    );
  });

  it('Test QueryString.unescape', function() {
    function errDecode(str) {
      throw new Error('To jump to the catch scope');
    }
    check(qs.parse('a=a', null, null, { decodeURIComponent: errDecode }),
          { a: 'a' });
  });

  it('Test custom encode', function() {
    function demoEncode(str) {
      return str[0];
    }
    var obj = { aa: 'aa', bb: 'bb', cc: 'cc' };
    assert.equal(
      qs.stringify(obj, null, null, { encodeURIComponent: demoEncode }),
      'a=a&b=b&c=c');
  });

  it('Test QueryString.unescapeBuffer', function() {
    qsUnescapeTestCases.forEach(function(testCase) {
      assert.strictEqual(qs.unescape(testCase[0]), testCase[1]);
      assert.strictEqual(
        qs.unescapeBuffer(testCase[0]).toString(), testCase[1],
      );
    });
  });

  it('test overriding .unescape', function() {
    var prevUnescape = qs.unescape;
    qs.unescape = function(str) {
      return str.replace(/o/g, '_');
    };
    check(
      qs.parse('foo=bor'),
      createWithNoPrototype([{key: 'f__', value: 'b_r'}]),
    );
    qs.unescape = prevUnescape;
  });

  it('test separator and "equals" parsing order', function() {
    check(qs.parse('foo&bar', '&', '&'), { foo: '', bar: '' });
  });
});

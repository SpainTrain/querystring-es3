// https://github.com/nodejs/node/blob/v6.10.2/lib/querystring.js

'use strict';

const QueryString = module.exports = {
  unescapeBuffer,
  // `unescape()` is a JS global, so we need to use a different local name
  unescape: qsUnescape,

  // `escape()` is a JS global, so we need to use a different local name
  escape: qsEscape,

  stringify,
  encode: stringify,

  parse,
  decode: parse
};

const Buffer = require('buffer').Buffer;
const objectKeys = require('./object-keys');

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
const isArray = (arg) =>
    Object.prototype.toString.call(arg) === '[object Array]';

// Production steps of ECMA-262, Edition 5, 15.4.4.14
// Reference: http://es5.github.io/#x15.4.4.14
const indexOf = (arr, searchElement, fromIndex) => {
  var k;

  if (arr == null) {
    throw new TypeError('"arr" is null or not defined');
  }

  var o = Object(arr);
  var len = o.length >>> 0;

  if (len === 0) {
    return -1;
  }

  var n = fromIndex | 0;

  if (n >= len) {
    return -1;
  }

  k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

  while (k < len) {
    if (k in o && o[k] === searchElement) {
      return k;
    }
    k++;
  }
  return -1;
};

// This constructor is used to store parsed query string values. Instantiating
// this is faster than explicitly calling `Object.create(null)` to get a
// "clean" empty object (tested with v8 v4.9).
function ParsedQueryString() {}
ParsedQueryString.prototype = Object.create ? Object.create(null) : {}; // IE8

const unhexTable = [
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, // 0 - 15
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, // 16 - 31
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, // 32 - 47
  +0, +1, +2, +3, +4, +5, +6, +7, +8, +9, -1, -1, -1, -1, -1, -1, // 48 - 63
  -1, 10, 11, 12, 13, 14, 15, -1, -1, -1, -1, -1, -1, -1, -1, -1, // 64 - 79
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, // 80 - 95
  -1, 10, 11, 12, 13, 14, 15, -1, -1, -1, -1, -1, -1, -1, -1, -1, // 96 - 111
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, // 112 - 127
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, // 128 ...
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1  // ... 255
];
// a safe fast alternative to decodeURIComponent
function unescapeBuffer(s, decodeSpaces) {
  var out = Buffer.allocUnsafe(s.length);
  var state = 0;
  var n, m, hexchar, c;

  for (var inIndex = 0, outIndex = 0; ; inIndex++) {
    if (inIndex < s.length) {
      c = s.charCodeAt(inIndex);
    } else {
      if (state > 0) {
        out[outIndex++] = 37/*%*/;
        if (state === 2)
          out[outIndex++] = hexchar;
      }
      break;
    }
    switch (state) {
      case 0: // Any character
        switch (c) {
          case 37: // '%'
            n = 0;
            m = 0;
            state = 1;
            break;
          case 43: // '+'
            if (decodeSpaces)
              c = 32; // ' '
            // falls through
          default:
            out[outIndex++] = c;
            break;
        }
        break;

      case 1: // First hex digit
        hexchar = c;
        n = unhexTable[c];
        if (!(n >= 0)) {
          out[outIndex++] = 37/*%*/;
          out[outIndex++] = c;
          state = 0;
          break;
        }
        state = 2;
        break;

      case 2: // Second hex digit
        state = 0;
        m = unhexTable[c];
        if (!(m >= 0)) {
          out[outIndex++] = 37/*%*/;
          out[outIndex++] = hexchar;
          out[outIndex++] = c;
          break;
        }
        out[outIndex++] = 16 * n + m;
        break;
    }
  }

  // TODO support returning arbitrary buffers.

  return out.slice(0, outIndex);
}


function qsUnescape(s, decodeSpaces) {
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return QueryString.unescapeBuffer(s, decodeSpaces).toString();
  }
}


const hexTable = [];
for (var i = 0; i < 256; ++i)
  hexTable[i] = '%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase();

// These characters do not need escaping when generating query strings:
// ! - . _ ~
// ' ( ) *
// digits
// alpha (uppercase)
// alpha (lowercase)
const noEscape = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0 - 15
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 16 - 31
  0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, // 32 - 47
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, // 48 - 63
  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 64 - 79
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, // 80 - 95
  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 96 - 111
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0  // 112 - 127
];
// QueryString.escape() replaces encodeURIComponent()
// http://www.ecma-international.org/ecma-262/5.1/#sec-15.1.3.4
function qsEscape(str) {
  if (typeof str !== 'string') {
    if (typeof str === 'object')
      str = String(str);
    else
      str += '';
  }
  var out = '';
  var lastPos = 0;

  for (var i = 0; i < str.length; ++i) {
    var c = str.charCodeAt(i);

    // ASCII
    if (c < 0x80) {
      if (noEscape[c] === 1)
        continue;
      if (lastPos < i)
        out += str.slice(lastPos, i);
      lastPos = i + 1;
      out += hexTable[c];
      continue;
    }

    if (lastPos < i)
      out += str.slice(lastPos, i);

    // Multi-byte characters ...
    if (c < 0x800) {
      lastPos = i + 1;
      out += hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)];
      continue;
    }
    if (c < 0xD800 || c >= 0xE000) {
      lastPos = i + 1;
      out += hexTable[0xE0 | (c >> 12)] +
             hexTable[0x80 | ((c >> 6) & 0x3F)] +
             hexTable[0x80 | (c & 0x3F)];
      continue;
    }
    // Surrogate pair
    ++i;
    var c2;
    if (i < str.length)
      c2 = str.charCodeAt(i) & 0x3FF;
    else
      throw new URIError('URI malformed');
    lastPos = i + 1;
    c = 0x10000 + (((c & 0x3FF) << 10) | c2);
    out += hexTable[0xF0 | (c >> 18)] +
           hexTable[0x80 | ((c >> 12) & 0x3F)] +
           hexTable[0x80 | ((c >> 6) & 0x3F)] +
           hexTable[0x80 | (c & 0x3F)];
  }
  if (lastPos === 0)
    return str;
  if (lastPos < str.length)
    return out + str.slice(lastPos);
  return out;
}

function stringifyPrimitive(v) {
  if (typeof v === 'string')
    return v;
  if (typeof v === 'number' && isFinite(v))
    return '' + v;
  if (typeof v === 'boolean')
    return v ? 'true' : 'false';
  return '';
}


function stringify(obj, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';

  var encode = QueryString.escape;
  if (options && typeof options.encodeURIComponent === 'function') {
    encode = options.encodeURIComponent;
  }

  if (obj !== null && typeof obj === 'object') {
    var keys = objectKeys(obj);
    var len = keys.length;
    var flast = len - 1;
    var fields = '';
    for (var i = 0; i < len; ++i) {
      var k = keys[i];
      var v = obj[k];
      var ks = encode(stringifyPrimitive(k)) + eq;

      if (isArray(v)) {
        var vlen = v.length;
        var vlast = vlen - 1;
        for (var j = 0; j < vlen; ++j) {
          fields += ks + encode(stringifyPrimitive(v[j]));
          if (j < vlast)
            fields += sep;
        }
        if (vlen && i < flast)
          fields += sep;
      } else {
        fields += ks + encode(stringifyPrimitive(v));
        if (i < flast)
          fields += sep;
      }
    }
    return fields;
  }
  return '';
}

function charCodes(str) {
  if (str.length === 0) return [];
  if (str.length === 1) return [str.charCodeAt(0)];
  const ret = [];
  for (var i = 0; i < str.length; ++i)
    ret[ret.length] = str.charCodeAt(i);
  return ret;
}
const defSepCodes = [38]; // &
const defEqCodes = [61]; // =

// Parse a key/val string.
function parse(qs, sep, eq, options) {
  const obj = new ParsedQueryString();

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var sepCodes = (!sep ? defSepCodes : charCodes(sep + ''));
  var eqCodes = (!eq ? defEqCodes : charCodes(eq + ''));
  const sepLen = sepCodes.length;
  const eqLen = eqCodes.length;

  var pairs = 1000;
  if (options && typeof options.maxKeys === 'number') {
    // -1 is used in place of a value like Infinity for meaning
    // "unlimited pairs" because of additional checks V8 (at least as of v5.4)
    // has to do when using variables that contain values like Infinity. Since
    // `pairs` is always decremented and checked explicitly for 0, -1 works
    // effectively the same as Infinity, while providing a significant
    // performance boost.
    pairs = (options.maxKeys > 0 ? options.maxKeys : -1);
  }

  var decode = QueryString.unescape;
  if (options && typeof options.decodeURIComponent === 'function') {
    decode = options.decodeURIComponent;
  }
  const customDecode = (decode !== qsUnescape);

  const keys = [];
  var posIdx = 0;
  var lastPos = 0;
  var sepIdx = 0;
  var eqIdx = 0;
  var key = '';
  var value = '';
  var keyEncoded = customDecode;
  var valEncoded = customDecode;
  var encodeCheck = 0;
  for (var i = 0; i < qs.length; ++i) {
    const code = qs.charCodeAt(i);

    // Try matching key/value pair separator (e.g. '&')
    if (code === sepCodes[sepIdx]) {
      if (++sepIdx === sepLen) {
        // Key/value pair separator match!
        const end = i - sepIdx + 1;
        if (eqIdx < eqLen) {
          // If we didn't find the key/value separator, treat the substring as
          // part of the key instead of the value
          if (lastPos < end)
            key += qs.slice(lastPos, end);
        } else if (lastPos < end)
          value += qs.slice(lastPos, end);
        if (keyEncoded)
          key = decodeStr(key, decode);
        if (valEncoded)
          value = decodeStr(value, decode);

        if (key || value || lastPos - posIdx > sepLen || i === 0) {
          // Use a key array lookup instead of using hasOwnProperty(), which is
          // slower
          if (indexOf(keys, key) === -1) {
            obj[key] = value;
            keys[keys.length] = key;
          } else {
            const curValue = obj[key] || '';
            // A simple Array-specific property check is enough here to
            // distinguish from a string value and is faster and still safe
            // since we are generating all of the values being assigned.
            if (curValue.pop)
              curValue[curValue.length] = value;
            else if (curValue)
              obj[key] = [curValue, value];
          }
        } else if (i === 1) {
          // A pair with repeated sep could be added into obj in the first loop
          // and it should be deleted
          delete obj[key];
        }
        if (--pairs === 0)
          break;
        keyEncoded = valEncoded = customDecode;
        encodeCheck = 0;
        key = value = '';
        posIdx = lastPos;
        lastPos = i + 1;
        sepIdx = eqIdx = 0;
      }
      continue;
    } else {
      sepIdx = 0;
      if (!valEncoded) {
        // Try to match an (valid) encoded byte (once) to minimize unnecessary
        // calls to string decoding functions
        if (code === 37/*%*/) {
          encodeCheck = 1;
        } else if (encodeCheck > 0 &&
                   ((code >= 48/*0*/ && code <= 57/*9*/) ||
                    (code >= 65/*A*/ && code <= 70/*F*/) ||
                    (code >= 97/*a*/ && code <= 102/*f*/))) {
          if (++encodeCheck === 3)
            valEncoded = true;
        } else {
          encodeCheck = 0;
        }
      }
    }

    // Try matching key/value separator (e.g. '=') if we haven't already
    if (eqIdx < eqLen) {
      if (code === eqCodes[eqIdx]) {
        if (++eqIdx === eqLen) {
          // Key/value separator match!
          const end = i - eqIdx + 1;
          if (lastPos < end)
            key += qs.slice(lastPos, end);
          encodeCheck = 0;
          lastPos = i + 1;
        }
        continue;
      } else {
        eqIdx = 0;
        if (!keyEncoded) {
          // Try to match an (valid) encoded byte once to minimize unnecessary
          // calls to string decoding functions
          if (code === 37/*%*/) {
            encodeCheck = 1;
          } else if (encodeCheck > 0 &&
                     ((code >= 48/*0*/ && code <= 57/*9*/) ||
                      (code >= 65/*A*/ && code <= 70/*F*/) ||
                      (code >= 97/*a*/ && code <= 102/*f*/))) {
            if (++encodeCheck === 3)
              keyEncoded = true;
          } else {
            encodeCheck = 0;
          }
        }
      }
    }

    if (code === 43/*+*/) {
      if (eqIdx < eqLen) {
        if (lastPos < i)
          key += qs.slice(lastPos, i);
        key += '%20';
        keyEncoded = true;
      } else {
        if (lastPos < i)
          value += qs.slice(lastPos, i);
        value += '%20';
        valEncoded = true;
      }
      lastPos = i + 1;
    }
  }

  // Check if we have leftover key or value data
  if (pairs !== 0 && (lastPos < qs.length || eqIdx > 0)) {
    if (lastPos < qs.length) {
      if (eqIdx < eqLen)
        key += qs.slice(lastPos);
      else if (sepIdx < sepLen)
        value += qs.slice(lastPos);
    }
    if (keyEncoded)
      key = decodeStr(key, decode);
    if (valEncoded)
      value = decodeStr(value, decode);
    // Use a key array lookup instead of using hasOwnProperty(), which is
    // slower
    if (indexOf(keys, key) === -1) {
      obj[key] = value;
      keys[keys.length] = key;
    } else {
      const curValue = obj[key];
      // A simple Array-specific property check is enough here to
      // distinguish from a string value and is faster and still safe since
      // we are generating all of the values being assigned.
      if (curValue.pop)
        curValue[curValue.length] = value;
      else
        obj[key] = [curValue, value];
    }
  }

  return obj;
}


// v8 does not optimize functions with try-catch blocks, so we isolate them here
// to minimize the damage (Note: no longer true as of V8 5.4 -- but still will
// not be inlined).
function decodeStr(s, decoder) {
  try {
    return decoder(s);
  } catch (e) {
    return QueryString.unescape(s, true);
  }
}

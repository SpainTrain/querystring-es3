// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys

'use strict';

const objectKeys = Object.keys || (function() {
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString');
  var dontEnums = [
    'toString',
    'toLocaleString',
    'valueOf',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'constructor'
  ];
  var dontEnumsLength = dontEnums.length;

  return function(obj) {
    if (
      typeof obj !== 'function' && (typeof obj !== 'object' || obj === null)
    ) {
      throw new TypeError('Object.keys called on non-object');
    }

    var result = [];
    var prop;
    var i;

    for (prop in obj) {
      if (hasOwnProperty.call(obj, prop)) {
        result.push(prop);
      }
    }

    if (hasDontEnumBug) {
      for (i = 0; i < dontEnumsLength; i++) {
        if (hasOwnProperty.call(obj, dontEnums[i])) {
          result.push(dontEnums[i]);
        }
      }
    }
    return result;
  };
}());

module.exports = objectKeys;

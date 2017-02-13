(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.mapboxGlDraw = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

require('./src/lib/polyfills');
var Setup = require('./src/setup');
var Options = require('./src/options');
var API = require('./src/api');
var types = require('./src/lib/types');

var Draw = function Draw(options) {
  options = Options(options);

  var ctx = {
    options: options
  };

  var api = API(ctx);
  ctx.api = api;

  var setup = Setup(ctx);
  api.addTo = setup.addTo;
  api.remove = setup.remove;
  api.types = types;
  api.options = options;

  return api;
};

module.exports = Draw;

window.mapboxgl = window.mapboxgl || {};
window.mapboxgl.Draw = Draw;

},{"./src/api":13,"./src/lib/polyfills":27,"./src/lib/types":31,"./src/options":38,"./src/setup":40}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
var wgs84 = require('wgs84');

module.exports.geometry = geometry;
module.exports.ring = ringArea;

function geometry(_) {
    var area = 0, i;
    switch (_.type) {
        case 'Polygon':
            return polygonArea(_.coordinates);
        case 'MultiPolygon':
            for (i = 0; i < _.coordinates.length; i++) {
                area += polygonArea(_.coordinates[i]);
            }
            return area;
        case 'Point':
        case 'MultiPoint':
        case 'LineString':
        case 'MultiLineString':
            return 0;
        case 'GeometryCollection':
            for (i = 0; i < _.geometries.length; i++) {
                area += geometry(_.geometries[i]);
            }
            return area;
    }
}

function polygonArea(coords) {
    var area = 0;
    if (coords && coords.length > 0) {
        area += Math.abs(ringArea(coords[0]));
        for (var i = 1; i < coords.length; i++) {
            area -= Math.abs(ringArea(coords[i]));
        }
    }
    return area;
}

/**
 * Calculate the approximate area of the polygon were it projected onto
 *     the earth.  Note that this area will be positive if ring is oriented
 *     clockwise, otherwise it will be negative.
 *
 * Reference:
 * Robert. G. Chamberlain and William H. Duquette, "Some Algorithms for
 *     Polygons on a Sphere", JPL Publication 07-03, Jet Propulsion
 *     Laboratory, Pasadena, CA, June 2007 http://trs-new.jpl.nasa.gov/dspace/handle/2014/40409
 *
 * Returns:
 * {float} The approximate signed geodesic area of the polygon in square
 *     meters.
 */

function ringArea(coords) {
    var p1, p2, p3, lowerIndex, middleIndex, upperIndex,
    area = 0,
    coordsLength = coords.length;

    if (coordsLength > 2) {
        for (i = 0; i < coordsLength; i++) {
            if (i === coordsLength - 2) {// i = N-2
                lowerIndex = coordsLength - 2;
                middleIndex = coordsLength -1;
                upperIndex = 0;
            } else if (i === coordsLength - 1) {// i = N-1
                lowerIndex = coordsLength - 1;
                middleIndex = 0;
                upperIndex = 1;
            } else { // i = 0 to N-3
                lowerIndex = i;
                middleIndex = i+1;
                upperIndex = i+2;
            }
            p1 = coords[lowerIndex];
            p2 = coords[middleIndex];
            p3 = coords[upperIndex];
            area += ( rad(p3[0]) - rad(p1[0]) ) * Math.sin( rad(p2[1]));
        }

        area = area * wgs84.RADIUS * wgs84.RADIUS / 2;
    }

    return area;
}

function rad(_) {
    return _ * Math.PI / 180;
}
},{"wgs84":12}],4:[function(require,module,exports){
var jsonlint = require('jsonlint-lines'),
  geojsonHintObject = require('./object');

/**
 * @alias geojsonhint
 * @param {(string|object)} GeoJSON given as a string or as an object
 * @param {Object} options
 * @param {boolean} [options.noDuplicateMembers=true] forbid repeated
 * properties. This is only available for string input, becaused parsed
 * Objects cannot have duplicate properties.
 * @returns {Array<Object>} an array of errors
 */
function hint(str, options) {

    var gj, errors = [];

    if (typeof str === 'object') {
        gj = str;
    } else if (typeof str === 'string') {
        try {
            gj = jsonlint.parse(str);
        } catch(e) {
            var match = e.message.match(/line (\d+)/);
            var lineNumber = parseInt(match[1], 10);
            return [{
                line: lineNumber - 1,
                message: e.message,
                error: e
            }];
        }
    } else {
        return [{
            message: 'Expected string or object as input',
            line: 0
        }];
    }

    errors = errors.concat(geojsonHintObject.hint(gj, options));

    return errors;
}

module.exports.hint = hint;

},{"./object":5,"jsonlint-lines":7}],5:[function(require,module,exports){
/**
 * @alias geojsonhint
 * @param {(string|object)} GeoJSON given as a string or as an object
 * @param {Object} options
 * @param {boolean} [options.noDuplicateMembers=true] forbid repeated
 * properties. This is only available for string input, becaused parsed
 * Objects cannot have duplicate properties.
 * @returns {Array<Object>} an array of errors
 */
function hint(gj, options) {

    var errors = [];

    function root(_) {

        if ((!options || options.noDuplicateMembers !== false) &&
           _.__duplicateProperties__) {
            errors.push({
                message: 'An object contained duplicate members, making parsing ambigous: ' + _.__duplicateProperties__.join(', '),
                line: _.__line__
            });
        }

        if (!_.type) {
            errors.push({
                message: 'The type property is required and was not found',
                line: _.__line__
            });
        } else if (!types[_.type]) {
            errors.push({
                message: 'The type ' + _.type + ' is unknown',
                line: _.__line__
            });
        } else {
            types[_.type](_);
        }
    }

    function everyIs(_, type) {
        // make a single exception because typeof null === 'object'
        return _.every(function(x) { return (x !== null) && (typeof x === type); });
    }

    function requiredProperty(_, name, type) {
        if (typeof _[name] === 'undefined') {
            return errors.push({
                message: '"' + name + '" property required',
                line: _.__line__
            });
        } else if (type === 'array') {
            if (!Array.isArray(_[name])) {
                return errors.push({
                    message: '"' + name +
                        '" property should be an array, but is an ' +
                        (typeof _[name]) + ' instead',
                    line: _.__line__
                });
            }
        } else if (type && typeof _[name] !== type) {
            return errors.push({
                message: '"' + name +
                    '" property should be ' + (type) +
                    ', but is an ' + (typeof _[name]) + ' instead',
                line: _.__line__
            });
        }
    }

    // http://geojson.org/geojson-spec.html#feature-collection-objects
    function FeatureCollection(featureCollection) {
        crs(featureCollection);
        bbox(featureCollection);
        if (!requiredProperty(featureCollection, 'features', 'array')) {
            if (!everyIs(featureCollection.features, 'object')) {
                return errors.push({
                    message: 'Every feature must be an object',
                    line: featureCollection.__line__
                });
            }
            featureCollection.features.forEach(Feature);
        }
    }

    // http://geojson.org/geojson-spec.html#positions
    function position(_, line) {
        if (!Array.isArray(_)) {
            return errors.push({
                message: 'position should be an array, is a ' + (typeof _) +
                    ' instead',
                line: _.__line__ || line
            });
        } else {
            if (_.length < 2) {
                return errors.push({
                    message: 'position must have 2 or more elements',
                    line: _.__line__ || line
                });
            }
            if (!everyIs(_, 'number')) {
                return errors.push({
                    message: 'each element in a position must be a number',
                    line: _.__line__ || line
                });
            }
        }
    }

    function positionArray(coords, type, depth, line) {
        if (line === undefined && coords.__line__ !== undefined) {
            line = coords.__line__;
        }
        if (depth === 0) {
            return position(coords, line);
        } else {
            if (depth === 1 && type) {
                if (type === 'LinearRing') {
                    if (!Array.isArray(coords[coords.length - 1])) {
                        return errors.push({
                            message: 'a number was found where a coordinate array should have been found: this needs to be nested more deeply',
                            line: line
                        });
                    }
                    if (coords.length < 4) {
                        errors.push({
                            message: 'a LinearRing of coordinates needs to have four or more positions',
                            line: line
                        });
                    }
                    if (coords.length &&
                        (coords[coords.length - 1].length !== coords[0].length ||
                        !coords[coords.length - 1].every(function(position, index) {
                        return coords[0][index] === position;
                    }))) {
                        errors.push({
                            message: 'the first and last positions in a LinearRing of coordinates must be the same',
                            line: line
                        });
                    }
                } else if (type === 'Line' && coords.length < 2) {
                    errors.push({
                        message: 'a line needs to have two or more coordinates to be valid',
                        line: line
                    });
                }
            } else if (!Array.isArray(coords)) {
                errors.push({
                    message: 'a number was found where a coordinate array should have been found: this needs to be nested more deeply',
                    line: line
                });
            } else {
                coords.forEach(function(c) {
                    positionArray(c, type, depth - 1, c.__line__ || line);
                });
            }
        }
    }

    function crs(_) {
        if (!_.crs) return;
        if (typeof _.crs === 'object') {
            var strErr = requiredProperty(_.crs, 'type', 'string'),
                propErr = requiredProperty(_.crs, 'properties', 'object');
            if (!strErr && !propErr) {
                // http://geojson.org/geojson-spec.html#named-crs
                if (_.crs.type === 'name') {
                    requiredProperty(_.crs.properties, 'name', 'string');
                } else if (_.crs.type === 'link') {
                    requiredProperty(_.crs.properties, 'href', 'string');
                } else {
                    errors.push({
                        message: 'The type of a crs must be either "name" or "link"',
                        line: _.__line__
                    });
                }
            }
        } else {
            errors.push({
                message: 'the value of the crs property must be an object, not a ' + (typeof _.crs),
                line: _.__line__
            });
        }
    }

    function bbox(_) {
        if (!_.bbox) { return; }
        if (Array.isArray(_.bbox)) {
            if (!everyIs(_.bbox, 'number')) {
                return errors.push({
                    message: 'each element in a bbox property must be a number',
                    line: _.bbox.__line__
                });
            }
        } else {
            errors.push({
                message: 'bbox property must be an array of numbers, but is a ' + (typeof _.bbox),
                line: _.__line__
            });
        }
    }

    // http://geojson.org/geojson-spec.html#point
    function Point(point) {
        crs(point);
        bbox(point);
        if (!requiredProperty(point, 'coordinates', 'array')) {
            position(point.coordinates);
        }
    }

    // http://geojson.org/geojson-spec.html#polygon
    function Polygon(polygon) {
        crs(polygon);
        bbox(polygon);
        if (!requiredProperty(polygon, 'coordinates', 'array')) {
            positionArray(polygon.coordinates, 'LinearRing', 2);
        }
    }

    // http://geojson.org/geojson-spec.html#multipolygon
    function MultiPolygon(multiPolygon) {
        crs(multiPolygon);
        bbox(multiPolygon);
        if (!requiredProperty(multiPolygon, 'coordinates', 'array')) {
            positionArray(multiPolygon.coordinates, 'LinearRing', 3);
        }
    }

    // http://geojson.org/geojson-spec.html#linestring
    function LineString(lineString) {
        crs(lineString);
        bbox(lineString);
        if (!requiredProperty(lineString, 'coordinates', 'array')) {
            positionArray(lineString.coordinates, 'Line', 1);
        }
    }

    // http://geojson.org/geojson-spec.html#multilinestring
    function MultiLineString(multiLineString) {
        crs(multiLineString);
        bbox(multiLineString);
        if (!requiredProperty(multiLineString, 'coordinates', 'array')) {
            positionArray(multiLineString.coordinates, 'Line', 2);
        }
    }

    // http://geojson.org/geojson-spec.html#multipoint
    function MultiPoint(multiPoint) {
        crs(multiPoint);
        bbox(multiPoint);
        if (!requiredProperty(multiPoint, 'coordinates', 'array')) {
            positionArray(multiPoint.coordinates, '', 1);
        }
    }

    function GeometryCollection(geometryCollection) {
        crs(geometryCollection);
        bbox(geometryCollection);
        if (!requiredProperty(geometryCollection, 'geometries', 'array')) {
            if (!everyIs(geometryCollection.geometries, 'object')) {
                errors.push({
                    message: 'The geometries array in a GeometryCollection must contain only geometry objects',
                    line: geometryCollection.__line__
                });
            }
            geometryCollection.geometries.forEach(function(geometry) {
                if (geometry) root(geometry);
            });
        }
    }

    function Feature(feature) {
        crs(feature);
        bbox(feature);
        // https://github.com/geojson/draft-geojson/blob/master/middle.mkd#feature-object
        if (feature.id !== undefined &&
            typeof feature.id !== 'string' &&
            typeof feature.id !== 'number') {
            errors.push({
                message: 'Feature "id" property must have a string or number value',
                line: feature.__line__
            });
        }
        if (feature.type !== 'Feature') {
            errors.push({
                message: 'GeoJSON features must have a type=feature property',
                line: feature.__line__
            });
        }
        requiredProperty(feature, 'properties', 'object');
        if (!requiredProperty(feature, 'geometry', 'object')) {
            // http://geojson.org/geojson-spec.html#feature-objects
            // tolerate null geometry
            if (feature.geometry) root(feature.geometry);
        }
    }

    var types = {
        Point: Point,
        Feature: Feature,
        MultiPoint: MultiPoint,
        LineString: LineString,
        MultiLineString: MultiLineString,
        FeatureCollection: FeatureCollection,
        GeometryCollection: GeometryCollection,
        Polygon: Polygon,
        MultiPolygon: MultiPolygon
    };

    if (typeof gj !== 'object' ||
        gj === null ||
        gj === undefined) {
        errors.push({
            message: 'The root of a GeoJSON object must be an object.',
            line: 0
        });
        return errors;
    }

    root(gj);

    errors.forEach(function(err) {
        if (err.hasOwnProperty('line') && err.line === undefined) {
            delete err.line;
        }
    });

    return errors;
}

module.exports.hint = hint;

},{}],6:[function(require,module,exports){
var hat = module.exports = function (bits, base) {
    if (!base) base = 16;
    if (bits === undefined) bits = 128;
    if (bits <= 0) return '0';
    
    var digits = Math.log(Math.pow(2, bits)) / Math.log(base);
    for (var i = 2; digits === Infinity; i *= 2) {
        digits = Math.log(Math.pow(2, bits / i)) / Math.log(base) * i;
    }
    
    var rem = digits - Math.floor(digits);
    
    var res = '';
    
    for (var i = 0; i < Math.floor(digits); i++) {
        var x = Math.floor(Math.random() * base).toString(base);
        res = x + res;
    }
    
    if (rem) {
        var b = Math.pow(base, rem);
        var x = Math.floor(Math.random() * b).toString(base);
        res = x + res;
    }
    
    var parsed = parseInt(res, base);
    if (parsed !== Infinity && parsed >= Math.pow(2, bits)) {
        return hat(bits, base)
    }
    else return res;
};

hat.rack = function (bits, base, expandBy) {
    var fn = function (data) {
        var iters = 0;
        do {
            if (iters ++ > 10) {
                if (expandBy) bits += expandBy;
                else throw new Error('too many ID collisions, use more bits')
            }
            
            var id = hat(bits, base);
        } while (Object.hasOwnProperty.call(hats, id));
        
        hats[id] = data;
        return id;
    };
    var hats = fn.hats = {};
    
    fn.get = function (id) {
        return fn.hats[id];
    };
    
    fn.set = function (id, value) {
        fn.hats[id] = value;
        return fn;
    };
    
    fn.bits = bits || 128;
    fn.base = base || 16;
    return fn;
};

},{}],7:[function(require,module,exports){
(function (process){
/* parser generated by jison 0.4.17 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var jsonlint = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,12],$V1=[1,13],$V2=[1,9],$V3=[1,10],$V4=[1,11],$V5=[1,14],$V6=[1,15],$V7=[14,18,22,24],$V8=[18,22],$V9=[22,24];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"JSONString":3,"STRING":4,"JSONNumber":5,"NUMBER":6,"JSONNullLiteral":7,"NULL":8,"JSONBooleanLiteral":9,"TRUE":10,"FALSE":11,"JSONText":12,"JSONValue":13,"EOF":14,"JSONObject":15,"JSONArray":16,"{":17,"}":18,"JSONMemberList":19,"JSONMember":20,":":21,",":22,"[":23,"]":24,"JSONElementList":25,"$accept":0,"$end":1},
terminals_: {2:"error",4:"STRING",6:"NUMBER",8:"NULL",10:"TRUE",11:"FALSE",14:"EOF",17:"{",18:"}",21:":",22:",",23:"[",24:"]"},
productions_: [0,[3,1],[5,1],[7,1],[9,1],[9,1],[12,2],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[15,2],[15,3],[20,3],[19,1],[19,3],[16,2],[16,3],[25,1],[25,3]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
 // replace escaped characters with actual character
          this.$ = yytext.replace(/\\(\\|")/g, "$"+"1")
                     .replace(/\\n/g,'\n')
                     .replace(/\\r/g,'\r')
                     .replace(/\\t/g,'\t')
                     .replace(/\\v/g,'\v')
                     .replace(/\\f/g,'\f')
                     .replace(/\\b/g,'\b');
        
break;
case 2:
this.$ = Number(yytext);
break;
case 3:
this.$ = null;
break;
case 4:
this.$ = true;
break;
case 5:
this.$ = false;
break;
case 6:
return this.$ = $$[$0-1];
break;
case 13:
this.$ = {}; Object.defineProperty(this.$, '__line__', {
            value: this._$.first_line,
            enumerable: false
        })
break;
case 14: case 19:
this.$ = $$[$0-1]; Object.defineProperty(this.$, '__line__', {
            value: this._$.first_line,
            enumerable: false
        })
break;
case 15:
this.$ = [$$[$0-2], $$[$0]];
break;
case 16:
this.$ = {}; this.$[$$[$0][0]] = $$[$0][1];
break;
case 17:

            this.$ = $$[$0-2];
            if ($$[$0-2][$$[$0][0]] !== undefined) {
                if (!this.$.__duplicateProperties__) {
                    Object.defineProperty(this.$, '__duplicateProperties__', {
                        value: [],
                        enumerable: false
                    });
                }
                this.$.__duplicateProperties__.push($$[$0][0]);
            }
            $$[$0-2][$$[$0][0]] = $$[$0][1];
        
break;
case 18:
this.$ = []; Object.defineProperty(this.$, '__line__', {
            value: this._$.first_line,
            enumerable: false
        })
break;
case 20:
this.$ = [$$[$0]];
break;
case 21:
this.$ = $$[$0-2]; $$[$0-2].push($$[$0]);
break;
}
},
table: [{3:5,4:$V0,5:6,6:$V1,7:3,8:$V2,9:4,10:$V3,11:$V4,12:1,13:2,15:7,16:8,17:$V5,23:$V6},{1:[3]},{14:[1,16]},o($V7,[2,7]),o($V7,[2,8]),o($V7,[2,9]),o($V7,[2,10]),o($V7,[2,11]),o($V7,[2,12]),o($V7,[2,3]),o($V7,[2,4]),o($V7,[2,5]),o([14,18,21,22,24],[2,1]),o($V7,[2,2]),{3:20,4:$V0,18:[1,17],19:18,20:19},{3:5,4:$V0,5:6,6:$V1,7:3,8:$V2,9:4,10:$V3,11:$V4,13:23,15:7,16:8,17:$V5,23:$V6,24:[1,21],25:22},{1:[2,6]},o($V7,[2,13]),{18:[1,24],22:[1,25]},o($V8,[2,16]),{21:[1,26]},o($V7,[2,18]),{22:[1,28],24:[1,27]},o($V9,[2,20]),o($V7,[2,14]),{3:20,4:$V0,20:29},{3:5,4:$V0,5:6,6:$V1,7:3,8:$V2,9:4,10:$V3,11:$V4,13:30,15:7,16:8,17:$V5,23:$V6},o($V7,[2,19]),{3:5,4:$V0,5:6,6:$V1,7:3,8:$V2,9:4,10:$V3,11:$V4,13:31,15:7,16:8,17:$V5,23:$V6},o($V8,[2,17]),o($V8,[2,15]),o($V9,[2,21])],
defaultActions: {16:[2,6]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        function _parseError (msg, hash) {
            this.message = msg;
            this.hash = hash;
        }
        _parseError.prototype = Error;

        throw new _parseError(str, hash);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        var lex = function () {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        };
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};
/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:/* skip whitespace */
break;
case 1:return 6
break;
case 2:yy_.yytext = yy_.yytext.substr(1,yy_.yyleng-2); return 4
break;
case 3:return 17
break;
case 4:return 18
break;
case 5:return 23
break;
case 6:return 24
break;
case 7:return 22
break;
case 8:return 21
break;
case 9:return 10
break;
case 10:return 11
break;
case 11:return 8
break;
case 12:return 14
break;
case 13:return 'INVALID'
break;
}
},
rules: [/^(?:\s+)/,/^(?:(-?([0-9]|[1-9][0-9]+))(\.[0-9]+)?([eE][-+]?[0-9]+)?\b)/,/^(?:"(?:\\[\\"bfnrt\/]|\\u[a-fA-F0-9]{4}|[^\\\0-\x09\x0a-\x1f"])*")/,/^(?:\{)/,/^(?:\})/,/^(?:\[)/,/^(?:\])/,/^(?:,)/,/^(?::)/,/^(?:true\b)/,/^(?:false\b)/,/^(?:null\b)/,/^(?:$)/,/^(?:.)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13],"inclusive":true}}
});
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = jsonlint;
exports.Parser = jsonlint.Parser;
exports.parse = function () { return jsonlint.parse.apply(jsonlint, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
}).call(this,require('_process'))

},{"_process":10,"fs":2,"path":8}],8:[function(require,module,exports){
(function (process){
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

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))

},{"_process":10}],9:[function(require,module,exports){
'use strict';

module.exports = Point;

function Point(x, y) {
    this.x = x;
    this.y = y;
}

Point.prototype = {
    clone: function() { return new Point(this.x, this.y); },

    add:     function(p) { return this.clone()._add(p);     },
    sub:     function(p) { return this.clone()._sub(p);     },
    mult:    function(k) { return this.clone()._mult(k);    },
    div:     function(k) { return this.clone()._div(k);     },
    rotate:  function(a) { return this.clone()._rotate(a);  },
    matMult: function(m) { return this.clone()._matMult(m); },
    unit:    function() { return this.clone()._unit(); },
    perp:    function() { return this.clone()._perp(); },
    round:   function() { return this.clone()._round(); },

    mag: function() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },

    equals: function(p) {
        return this.x === p.x &&
               this.y === p.y;
    },

    dist: function(p) {
        return Math.sqrt(this.distSqr(p));
    },

    distSqr: function(p) {
        var dx = p.x - this.x,
            dy = p.y - this.y;
        return dx * dx + dy * dy;
    },

    angle: function() {
        return Math.atan2(this.y, this.x);
    },

    angleTo: function(b) {
        return Math.atan2(this.y - b.y, this.x - b.x);
    },

    angleWith: function(b) {
        return this.angleWithSep(b.x, b.y);
    },

    // Find the angle of the two vectors, solving the formula for the cross product a x b = |a||b|sin(Î¸) for Î¸.
    angleWithSep: function(x, y) {
        return Math.atan2(
            this.x * y - this.y * x,
            this.x * x + this.y * y);
    },

    _matMult: function(m) {
        var x = m[0] * this.x + m[1] * this.y,
            y = m[2] * this.x + m[3] * this.y;
        this.x = x;
        this.y = y;
        return this;
    },

    _add: function(p) {
        this.x += p.x;
        this.y += p.y;
        return this;
    },

    _sub: function(p) {
        this.x -= p.x;
        this.y -= p.y;
        return this;
    },

    _mult: function(k) {
        this.x *= k;
        this.y *= k;
        return this;
    },

    _div: function(k) {
        this.x /= k;
        this.y /= k;
        return this;
    },

    _unit: function() {
        this._div(this.mag());
        return this;
    },

    _perp: function() {
        var y = this.y;
        this.y = this.x;
        this.x = -y;
        return this;
    },

    _rotate: function(angle) {
        var cos = Math.cos(angle),
            sin = Math.sin(angle),
            x = cos * this.x - sin * this.y,
            y = sin * this.x + cos * this.y;
        this.x = x;
        this.y = y;
        return this;
    },

    _round: function() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    }
};

// constructs Point from an array if necessary
Point.convert = function (a) {
    if (a instanceof Point) {
        return a;
    }
    if (Array.isArray(a)) {
        return new Point(a[0], a[1]);
    }
    return a;
};

},{}],10:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],11:[function(require,module,exports){
var geometryArea = require('geojson-area').geometry;

/**
 * Takes a {@link GeoJSON} feature or {@link FeatureCollection} of any type and returns the area of that feature
 * in square meters.
 *
 * @module turf/area
 * @category measurement
 * @param {GeoJSON} input a {@link Feature} or {@link FeatureCollection} of any type
 * @return {Number} area in square meters
 * @example
 * var polygons = {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "properties": {},
 *       "geometry": {
 *         "type": "Polygon",
 *         "coordinates": [[
 *           [-67.031021, 10.458102],
 *           [-67.031021, 10.53372],
 *           [-66.929397, 10.53372],
 *           [-66.929397, 10.458102],
 *           [-67.031021, 10.458102]
 *         ]]
 *       }
 *     }, {
 *       "type": "Feature",
 *       "properties": {},
 *       "geometry": {
 *         "type": "Polygon",
 *         "coordinates": [[
 *           [-66.919784, 10.397325],
 *           [-66.919784, 10.513467],
 *           [-66.805114, 10.513467],
 *           [-66.805114, 10.397325],
 *           [-66.919784, 10.397325]
 *         ]]
 *       }
 *     }
 *   ]
 * };
 *
 * var area = turf.area(polygons);
 *
 * //=area
 */
module.exports = function(_) {
    if (_.type === 'FeatureCollection') {
        for (var i = 0, sum = 0; i < _.features.length; i++) {
            if (_.features[i].geometry) {
                sum += geometryArea(_.features[i].geometry);
            }
        }
        return sum;
    } else if (_.type === 'Feature') {
        return geometryArea(_.geometry);
    } else {
        return geometryArea(_);
    }
};

},{"geojson-area":3}],12:[function(require,module,exports){
module.exports.RADIUS = 6378137;
module.exports.FLATTENING = 1/298.257223563;
module.exports.POLAR_RADIUS = 6356752.3142;

},{}],13:[function(require,module,exports){
'use strict';

var hat = require('hat');
var featuresAt = require('./lib/features_at');
var geojsonhint = require('geojsonhint');

var featureTypes = {
  'Polygon': require('./feature_types/polygon'),
  'LineString': require('./feature_types/line_string'),
  'Point': require('./feature_types/point'),
  'MultiPolygon': require('./feature_types/multi_feature'),
  'MultiLineString': require('./feature_types/multi_feature'),
  'MultiPoint': require('./feature_types/multi_feature')
};

var featureTypeStr = Object.keys(featureTypes).join(', ');

module.exports = function (ctx) {

  return {
    getFeatureIdsAt: function getFeatureIdsAt(x, y) {
      var features = featuresAt({ point: { x: x, y: y } }, ctx);
      return features.map(function (feature) {
        return feature.properties.id;
      });
    },
    add: function add(geojson) {
      var _this = this;

      var validateGeoJSON = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];


      if (geojson.type !== 'FeatureCollection' && !geojson.geometry) {
        geojson = {
          type: 'Feature',
          id: geojson.id,
          properties: geojson.properties || {},
          geometry: geojson
        };
      }

      if (validateGeoJSON) {
        var errors = geojsonhint.hint(geojson);
        if (errors.length) {
          throw new Error(errors[0].message);
        }

        (geojson.type === 'FeatureCollection' ? geojson.features : [geojson]).forEach(function (feature) {
          if (featureTypes[feature.geometry.type] === undefined) {
            throw new Error('Invalid feature type. Must be ' + featureTypeStr);
          }
        });
      }

      if (geojson.type === 'FeatureCollection') {
        return geojson.features.map(function (feature) {
          return _this.add(feature, false);
        });
      }

      geojson = JSON.parse(JSON.stringify(geojson));

      geojson.id = geojson.id || hat();

      if (ctx.store.get(geojson.id) === undefined) {
        var model = featureTypes[geojson.geometry.type];

        var internalFeature = new model(ctx, geojson);
        ctx.store.add(internalFeature);
      } else {
        var _internalFeature = ctx.store.get(geojson.id);
        _internalFeature.properties = geojson.properties;
      }

      ctx.store.render();
      return geojson.id;
    },
    get: function get(id) {
      var feature = ctx.store.get(id);
      if (feature) {
        return feature.toGeoJSON();
      }
    },
    getAll: function getAll() {
      return {
        type: 'FeatureCollection',
        features: ctx.store.getAll().map(function (feature) {
          return feature.toGeoJSON();
        })
      };
    },
    delete: function _delete(id) {
      ctx.store.delete([id]);
      ctx.store.render();
    },
    deleteAll: function deleteAll() {
      ctx.store.delete(ctx.store.getAll().map(function (feature) {
        return feature.id;
      }));
      ctx.store.render();
    },
    changeMode: function changeMode(mode, opts) {
      ctx.events.changeMode(mode, opts);
    },
    trash: function trash() {
      ctx.events.fire('trash');
    }
  };
};

},{"./feature_types/line_string":16,"./feature_types/multi_feature":17,"./feature_types/point":18,"./feature_types/polygon":19,"./lib/features_at":23,"geojsonhint":4,"hat":6}],14:[function(require,module,exports){
'use strict';

var ModeHandler = require('./lib/mode_handler');
var getFeatureAtAndSetCursors = require('./lib/get_features_and_set_cursor');
var isClick = require('./lib/is_click');

var modes = {
  'simple_select': require('./modes/simple_select'),
  'direct_select': require('./modes/direct_select'),
  'draw_point': require('./modes/draw_point'),
  'draw_line_string': require('./modes/draw_line_string'),
  'draw_polygon': require('./modes/draw_polygon')
};

module.exports = function (ctx) {

  var mouseDownInfo = {
    isDown: false
  };

  var events = {};
  var _currentModeName = 'simple_select';
  var currentMode = ModeHandler(modes.simple_select(ctx), ctx);

  events.drag = function (event) {
    if (isClick(mouseDownInfo, {
      point: event.point,
      time: new Date().getTime()
    })) {
      event.originalEvent.stopPropagation();
    } else {
      ctx.ui.setClass({ mouse: 'drag' });
      currentMode.drag(event);
    }
  };

  events.mousemove = function (event) {
    if (mouseDownInfo.isDown) {
      events.drag(event);
    } else {
      var target = getFeatureAtAndSetCursors(event, ctx);
      event.featureTarget = target;
      currentMode.mousemove(event);
    }
  };

  events.mousedown = function (event) {
    mouseDownInfo = {
      isDown: true,
      time: new Date().getTime(),
      point: event.point
    };

    var target = getFeatureAtAndSetCursors(event, ctx);
    event.featureTarget = target;
    currentMode.mousedown(event);
  };

  events.mouseup = function (event) {
    mouseDownInfo.isDown = false;
    var target = getFeatureAtAndSetCursors(event, ctx);
    event.featureTarget = target;

    if (isClick(mouseDownInfo, {
      point: event.point,
      time: new Date().getTime()
    })) {
      currentMode.click(event);
    } else {
      currentMode.mouseup(event);
    }
  };

  events.trash = function () {
    currentMode.trash();
  };

  var isKeyModeValid = function isKeyModeValid(code) {
    return !(code === 8 || code >= 48 && code <= 57);
  };

  events.keydown = function (event) {
    if (event.keyCode === 8) {
      event.preventDefault();
      api.fire('trash');
    } else if (isKeyModeValid(event.keyCode)) {
      currentMode.keydown(event);
    } else if (event.keyCode === 49) {
      ctx.api.changeMode('draw_point');
    } else if (event.keyCode === 50) {
      ctx.api.changeMode('draw_line_string');
    } else if (event.keyCode === 51) {
      ctx.api.changeMode('draw_polygon');
    }
  };

  events.keyup = function (event) {
    if (isKeyModeValid(event.keyCode)) {
      currentMode.keyup(event);
    }
  };

  events.zoomend = function () {
    ctx.store.changeZoom();
  };

  var api = {
    currentModeName: function currentModeName() {
      return _currentModeName;
    },
    currentModeRender: function currentModeRender(geojson, push) {
      return currentMode.render(geojson, push);
    },
    changeMode: function changeMode(modename, opts) {
      currentMode.stop();
      var modebuilder = modes[modename];
      if (modebuilder === undefined) {
        throw new Error(modename + ' is not valid');
      }
      _currentModeName = modename;
      var mode = modebuilder(ctx, opts);
      currentMode = ModeHandler(mode, ctx);

      ctx.map.fire('draw.modechange', {
        mode: modename,
        opts: opts
      });

      ctx.store.setDirty();
      ctx.store.render();
    },
    fire: function fire(name, event) {
      if (events[name]) {
        events[name](event);
      }
    },
    addEventListeners: function addEventListeners() {
      ctx.map.on('mousemove', events.mousemove);

      ctx.map.on('mousedown', events.mousedown);
      ctx.map.on('mouseup', events.mouseup);

      if (ctx.options.keybindings) {
        ctx.container.addEventListener('keydown', events.keydown);
        ctx.container.addEventListener('keyup', events.keyup);
      }
    },
    removeEventListeners: function removeEventListeners() {
      ctx.map.off('mousemove', events.mousemove);

      ctx.map.off('mousedown', events.mousedown);
      ctx.map.off('mouseup', events.mouseup);

      if (ctx.options.keybindings) {
        ctx.container.removeEventListener('keydown', events.keydown);
        ctx.container.removeEventListener('keyup', events.keyup);
      }
    }
  };

  return api;
};

},{"./lib/get_features_and_set_cursor":24,"./lib/is_click":25,"./lib/mode_handler":26,"./modes/direct_select":33,"./modes/draw_line_string":34,"./modes/draw_point":35,"./modes/draw_polygon":36,"./modes/simple_select":37}],15:[function(require,module,exports){
'use strict';

var hat = require('hat');

var Feature = function Feature(ctx, geojson) {
  this.ctx = ctx;
  this.properties = geojson.properties || {};
  this.coordinates = geojson.geometry.coordinates;
  this.atLastRender = null;
  this.id = geojson.id || hat();
  this.type = geojson.geometry.type;
};

Feature.prototype.changed = function () {
  this.ctx.store.featureChanged(this.id);
};

Feature.prototype.setCoordinates = function (coords) {
  this.coordinates = coords;
  this.changed();
};

Feature.prototype.getCoordinates = function () {
  return JSON.parse(JSON.stringify(this.coordinates));
};

Feature.prototype.toGeoJSON = function () {
  return JSON.parse(JSON.stringify({
    'id': this.id,
    'type': 'Feature',
    'properties': this.properties,
    'geometry': {
      'coordinates': this.getCoordinates(),
      'type': this.type
    }
  }));
};

Feature.prototype.internal = function (mode) {
  return {
    'type': 'Feature',
    'properties': {
      'id': this.id,
      'meta': 'feature',
      'meta:type': this.type,
      'active': 'false',
      mode: mode
    },
    'geometry': {
      'coordinates': this.getCoordinates(),
      'type': this.type
    }
  };
};

module.exports = Feature;

},{"hat":6}],16:[function(require,module,exports){
'use strict';

var Feature = require('./feature');

var LineString = function LineString(ctx, geojson) {
  Feature.call(this, ctx, geojson);
};

LineString.prototype = Object.create(Feature.prototype);

LineString.prototype.isValid = function () {
  return this.coordinates.length > 1;
};

LineString.prototype.addCoordinate = function (path, lng, lat) {
  this.changed();
  this.selectedCoords = {};
  var id = parseInt(path, 10);
  this.coordinates.splice(id, 0, [lng, lat]);
};

LineString.prototype.getCoordinate = function (path) {
  var id = parseInt(path, 10);
  return JSON.parse(JSON.stringify(this.coordinates[id]));
};

LineString.prototype.removeCoordinate = function (path) {
  this.changed();
  this.coordinates.splice(parseInt(path, 10), 1);
};

LineString.prototype.updateCoordinate = function (path, lng, lat) {
  var id = parseInt(path, 10);
  this.coordinates[id] = [lng, lat];
  this.changed();
};

module.exports = LineString;

},{"./feature":15}],17:[function(require,module,exports){
'use strict';

var Feature = require('./feature');

var models = {
  'MultiPoint': require('./point'),
  'MultiLineString': require('./line_string'),
  'MultiPolygon': require('./polygon')
};

var takeAction = function takeAction(features, action, path, lng, lat) {
  var parts = path.split('.');
  var idx = parseInt(parts[0], 10);
  var tail = parts.slice(1).join('.');
  return features[idx][action](tail, lng, lat);
};

var MultiFeature = function MultiFeature(ctx, geojson) {
  Feature.call(this, ctx, geojson);

  delete this.coordinates;
  this.model = models[geojson.geometry.type];
  if (this.model === undefined) throw new TypeError(geojson.geometry.type + ' is not a valid type');
  this.features = this.coordinatesToFeatures(geojson.geometry.coordinates);
};

MultiFeature.prototype = Object.create(Feature.prototype);

MultiFeature.prototype.coordinatesToFeatures = function (coordinates) {
  var _this = this;

  return coordinates.map(function (coords) {
    return new _this.model(_this.ctx, {
      id: _this.id,
      type: 'Feature',
      properties: {},
      geometry: {
        coordinates: coords,
        type: _this.type.replace('Multi', '')
      }
    });
  });
};

MultiFeature.prototype.isValid = function () {
  return this.features.every(function (f) {
    return f.isValid();
  });
};

MultiFeature.prototype.setCoordinates = function (coords) {
  this.features = this.coordinatesToFeatures(coords);
  this.changed();
};

MultiFeature.prototype.getCoordinate = function (path) {
  return takeAction(this.features, 'getCoordinate', path);
};

MultiFeature.prototype.getCoordinates = function () {
  return JSON.parse(JSON.stringify(this.features.map(function (f) {
    return f.type === 'Polygon' ? f.getCoordinates() : f.coordinates;
  })));
};

MultiFeature.prototype.updateCoordinate = function (path, lng, lat) {
  takeAction(this.features, 'updateCoordinate', path, lng, lat);
};

MultiFeature.prototype.addCoordinate = function (path, lng, lat) {
  takeAction(this.features, 'addCoordinate', path, lng, lat);
};

MultiFeature.prototype.removeCoordinate = function (path) {
  takeAction(this.features, 'removeCoordinate', path);
};

module.exports = MultiFeature;

},{"./feature":15,"./line_string":16,"./point":18,"./polygon":19}],18:[function(require,module,exports){
'use strict';

var Feature = require('./feature');

var Point = function Point(ctx, geojson) {
  Feature.call(this, ctx, geojson);
};

Point.prototype = Object.create(Feature.prototype);

Point.prototype.isValid = function () {
  return typeof this.coordinates[0] === 'number';
};

Point.prototype.updateCoordinate = function (path, lng, lat) {
  this.coordinates = [lng, lat];
  this.changed();
};

Point.prototype.getCoordinate = function () {
  return this.getCoordinates();
};

module.exports = Point;

},{"./feature":15}],19:[function(require,module,exports){
'use strict';

var Feature = require('./feature');

var Polygon = function Polygon(ctx, geojson) {
  Feature.call(this, ctx, geojson);
  this.coordinates = this.coordinates.map(function (coords) {
    return coords.slice(0, -1);
  });
};

Polygon.prototype = Object.create(Feature.prototype);

Polygon.prototype.isValid = function () {
  return this.coordinates.every(function (ring) {
    return ring.length > 2;
  });
};

Polygon.prototype.addCoordinate = function (path, lng, lat) {
  this.changed();
  var ids = path.split('.').map(function (x) {
    return parseInt(x, 10);
  });

  var ring = this.coordinates[ids[0]];

  ring.splice(ids[1], 0, [lng, lat]);
};

Polygon.prototype.removeCoordinate = function (path) {
  this.changed();
  var ids = path.split('.').map(function (x) {
    return parseInt(x, 10);
  });
  var ring = this.coordinates[ids[0]];
  if (ring) {
    ring.splice(ids[1], 1);
    if (ring.length < 3) {
      this.coordinates.splice(ids[0], 1);
    }
  }
};

Polygon.prototype.getCoordinate = function (path) {
  var ids = path.split('.').map(function (x) {
    return parseInt(x, 10);
  });
  var ring = this.coordinates[ids[0]];
  return JSON.parse(JSON.stringify(ring[ids[1]]));
};

Polygon.prototype.getCoordinates = function () {
  return this.coordinates.map(function (coords) {
    return coords.concat([coords[0]]);
  });
};

Polygon.prototype.updateCoordinate = function (path, lng, lat) {
  this.changed();
  var parts = path.split('.');
  var ringId = parseInt(parts[0], 10);
  var coordId = parseInt(parts[1], 10);

  if (this.coordinates[ringId] === undefined) {
    this.coordinates[ringId] = [];
  }

  this.coordinates[ringId][coordId] = [lng, lat];
};

module.exports = Polygon;

},{"./feature":15}],20:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/**
 * This file could do with a nice refactor...
 */

var toMidpoint = require('./to_midpoint');
var toVertex = require('./to_vertex');

var addCoords = module.exports = function (geojson, doMidpoints, push, map, selectedCoordPaths) {
  var basePath = arguments.length <= 5 || arguments[5] === undefined ? null : arguments[5];


  if (geojson.geometry.type.startsWith('Multi')) {
    var _ret = function () {
      var type = geojson.geometry.type.replace('Multi', '');
      return {
        v: geojson.geometry.coordinates.forEach(function (coords, i) {
          var f = {
            type: 'Feature',
            properties: geojson.properties,
            geometry: {
              type: type,
              coordinates: coords
            }
          };
          addCoords(f, doMidpoints, push, map, selectedCoordPaths, '' + i);
        })
      };
    }();

    if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
  } else if (geojson.geometry.type === 'Point') {
    return push(toVertex(geojson.properties.id, geojson.geometry.coordinates, basePath, selectedCoordPaths.indexOf(basePath) > -1));
  }

  var oneVertex = null;
  var twoVertex = null;
  var startVertex = null;
  for (var i = 0; i < geojson.geometry.coordinates.length; i++) {
    if (geojson.geometry.type === 'Polygon') {
      var ring = geojson.geometry.coordinates[i];
      for (var j = 0; j < ring.length - 1; j++) {
        var coord = ring[j];
        var coord_path = basePath ? basePath + '.' + i + '.' + j : i + '.' + j;

        oneVertex = toVertex(geojson.properties.id, coord, coord_path, selectedCoordPaths.indexOf(coord_path) > -1);
        startVertex = startVertex ? startVertex : oneVertex;
        push(oneVertex);

        if (j > 0 && doMidpoints) {
          push(toMidpoint(geojson.properties.id, twoVertex, oneVertex, map));
        }

        twoVertex = oneVertex;
      }
      if (doMidpoints) {
        push(toMidpoint(geojson.properties.id, oneVertex, startVertex, map));
      }
    } else {
      var _coord = geojson.geometry.coordinates[i];
      var _coord_path = basePath ? basePath + '.' + i : '' + i;
      oneVertex = toVertex(geojson.properties.id, _coord, _coord_path, selectedCoordPaths.indexOf(_coord_path) > -1);
      push(oneVertex);
      if (i > 0 && doMidpoints) {
        push(toMidpoint(geojson.properties.id, twoVertex, oneVertex, map));
      }
      twoVertex = oneVertex;
    }
  }
};

},{"./to_midpoint":29,"./to_vertex":30}],21:[function(require,module,exports){
'use strict';

module.exports = {
  isOfMetaType: function isOfMetaType(type) {
    return function (e) {
      var featureTarget = e.featureTarget;
      if (featureTarget) {
        return featureTarget.properties.meta === type;
      } else {
        return false;
      }
    };
  },
  noFeature: function noFeature(e) {
    return e.featureTarget === undefined;
  },
  isFeature: function isFeature(e) {
    return e.featureTarget !== undefined && e.featureTarget.properties.meta === 'feature';
  },
  isShiftDown: function isShiftDown(e) {
    return e.originalEvent.shiftKey === true;
  },
  isEscapeKey: function isEscapeKey(e) {
    return e.keyCode === 27;
  },
  isEnterKey: function isEnterKey(e) {
    return e.keyCode === 13;
  }
};

},{}],22:[function(require,module,exports){
"use strict";

module.exports = function (a, b) {
    var x = a.x - b.x,
        y = a.y - b.y;
    return Math.sqrt(x * x + y * y);
};

},{}],23:[function(require,module,exports){
'use strict';

var area = require('turf-area');

var metas = ['feature', 'midpoint', 'vertex'];

var geometryTypeValues = {
  'Polygon': 2,
  'Point': 0,
  'LineString': 1
};

var sort = function sort(a, b) {
  var score = geometryTypeValues[a.geometry.type] - geometryTypeValues[b.geometry.type];

  if (score === 0 && a.geometry.type === 'Polygon') {
    return a.area - b.area;
  } else {
    return score;
  }
};

module.exports = function (event, ctx) {

  var grabSize = .5;
  var features = ctx.map.queryRenderedFeatures([[event.point.x - grabSize, event.point.y - grabSize], [event.point.x + grabSize, event.point.y + grabSize]], {});

  features = features.filter(function (feature) {
    var meta = feature.properties.meta;
    return metas.indexOf(meta) !== -1;
  }).map(function (feature) {
    if (feature.geometry.type === 'Polygon') {
      feature.area = area({
        type: 'Feature',
        property: {},
        geometry: feature.geometry
      });
    }
    return feature;
  });

  features.sort(sort);

  return features;
};

},{"turf-area":11}],24:[function(require,module,exports){
'use strict';

var featuresAt = require('./features_at');

module.exports = function getFeatureAtAndSetCursors(event, ctx) {
  var features = featuresAt(event, ctx);

  if (features[0]) {
    ctx.ui.setClass({
      feature: features[0].properties.meta,
      mouse: 'hover'
    });
  } else {
    ctx.ui.setClass({
      mouse: 'none'
    });
  }

  return features[0];
};

},{"./features_at":23}],25:[function(require,module,exports){
'use strict';

var euclideanDistance = require('./euclidean_distance');

var closeTolerance = 4;
var tolerance = 12;

module.exports = function isClick(start, end) {
  start.point = start.point || end.point;
  start.time = start.time || end.time;
  var moveDistance = euclideanDistance(start.point, end.point);
  return moveDistance < closeTolerance || moveDistance < tolerance && end.time - start.time < 500;
};

},{"./euclidean_distance":22}],26:[function(require,module,exports){
'use strict';

var ModeHandler = function ModeHandler(mode, DrawContext) {

  var handlers = {
    drag: [],
    click: [],
    doubleclick: [],
    mousemove: [],
    mousedown: [],
    mouseup: [],
    keydown: [],
    keyup: [],
    trash: []
  };

  var ctx = {
    on: function on(event, selector, fn) {
      if (handlers[event] === undefined) {
        throw new Error('Invalid event type: ' + event);
      }
      handlers[event].push({
        selector: selector,
        fn: fn
      });
    },
    off: function off(event, selector, fn) {
      handlers[event] = handlers[event].filter(function (handler) {
        return handler.selector !== selector || handler.fn !== fn;
      });
    },
    fire: function fire(event, payload) {
      var modename = DrawContext.events.currentModeName();
      DrawContext.map.fire('draw.' + modename + '.' + event, payload);
    },
    render: function render(id) {
      DrawContext.store.featureChanged(id);
    }
  };

  var delegate = function delegate(eventName, event) {
    var handles = handlers[eventName];
    var iHandle = handles.length;
    while (iHandle--) {
      var handle = handles[iHandle];
      if (handle.selector(event)) {
        handle.fn.call(ctx, event);
        DrawContext.store.render();
        break;
      }
    }
  };

  mode.start.call(ctx);

  return {
    render: mode.render || function (geojson) {
      return geojson;
    },
    stop: mode.stop || function () {},
    drag: function drag(event) {
      delegate('drag', event);
    },
    click: function click(event) {
      delegate('click', event);
    },
    mousemove: function mousemove(event) {
      delegate('mousemove', event);
    },
    mousedown: function mousedown(event) {
      delegate('mousedown', event);
    },
    mouseup: function mouseup(event) {
      delegate('mouseup', event);
    },
    keydown: function keydown(event) {
      delegate('keydown', event);
    },
    keyup: function keyup(event) {
      delegate('keyup', event);
    },
    trash: function trash(event) {
      delegate('trash', event);
    }
  };
};

module.exports = ModeHandler;

},{}],27:[function(require,module,exports){
'use strict';

module.exports = function () {
  if (typeof Object.assign !== 'function') {
    (function () {
      Object.assign = function (target) {
        if (target === undefined || target === null) {
          throw new TypeError('Cannot convert undefined or null to object');
        }

        var output = Object(target);
        for (var index = 1; index < arguments.length; index++) {
          var source = arguments[index];
          if (source !== undefined && source !== null) {
            for (var nextKey in source) {
              if (source.hasOwnProperty(nextKey)) {
                output[nextKey] = source[nextKey];
              }
            }
          }
        }
        return output;
      };
    })();
  }
};

},{}],28:[function(require,module,exports){
'use strict';

module.exports = [{
  'id': 'gl-draw-active-line',
  'type': 'line',
  'filter': ['all', ['==', '$type', 'LineString'], ['==', 'active', 'true']],
  'layout': {
    'line-cap': 'round',
    'line-join': 'round'
  },
  'paint': {
    'line-color': '#FF9800',
    'line-dasharray': [0.2, 2],
    'line-width': 4
  },
  'interactive': true
}, {
  'id': 'gl-draw-active-polygon',
  'type': 'fill',
  'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
  'paint': {
    'fill-color': '#FF9800',
    'fill-opacity': 0.25
  },
  'interactive': true
}, {
  'id': 'gl-draw-active-polygon-stroke',
  'type': 'line',
  'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
  'layout': {
    'line-cap': 'round',
    'line-join': 'round'
  },
  'paint': {
    'line-color': '#FF9800',
    'line-dasharray': [0.2, 2],
    'line-width': 4
  },
  'interactive': true
}, {
  'id': 'gl-draw-point-mid-outline',
  'type': 'circle',
  'filter': ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
  'paint': {
    'circle-radius': 7,
    'circle-opacity': 0.65,
    'circle-color': '#fff'
  },
  'interactive': true
}, {
  'id': 'gl-draw-point-mid',
  'type': 'circle',
  'filter': ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
  'paint': {
    'circle-radius': 6,
    'circle-opacity': 0.65,
    'circle-color': '#FF9800'
  },
  'interactive': true
}, {
  'id': 'gl-draw-polygon',
  'type': 'fill',
  'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
  'paint': {
    'fill-color': '#03A9F4',
    'fill-outline-color': '#03A9F4',
    'fill-opacity': 0.25
  },
  'interactive': true
}, {
  'id': 'gl-draw-polygon-stroke',
  'type': 'line',
  'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
  'layout': {
    'line-cap': 'round',
    'line-join': 'round'
  },
  'paint': {
    'line-color': '#03A9F4',
    'line-width': 3
  },
  'interactive': true
}, {
  'id': 'gl-draw-line',
  'type': 'line',
  'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString']],
  'layout': {
    'line-cap': 'round',
    'line-join': 'round'
  },
  'paint': {
    'line-color': '#03A9F4',
    'line-width': 3
  },
  'interactive': true
}, {
  'id': 'gl-draw-active-point',
  'type': 'circle',
  'filter': ['all', ['==', '$type', 'Point'], ['==', 'active', 'true'], ['!=', 'meta', 'midpoint']],
  'paint': {
    'circle-radius': 9,
    'circle-color': '#fff'
  },
  'interactive': true
}, {
  'id': 'gl-draw-active-point-highlight',
  'type': 'circle',
  'filter': ['all', ['==', '$type', 'Point'], ['!=', 'meta', 'midpoint'], ['==', 'active', 'true']],
  'paint': {
    'circle-radius': 7,
    'circle-color': '#EF6C00'
  },
  'interactive': true
}, {
  'id': 'gl-draw-polygon-point-outline',
  'type': 'circle',
  'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
  'paint': {
    'circle-radius': 9,
    'circle-color': '#fff'
  },
  'interactive': true
}, {
  'id': 'gl-draw-polygon-point',
  'type': 'circle',
  'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
  'paint': {
    'circle-radius': 7,
    'circle-color': '#FF9800'
  },
  'interactive': true
}, {
  'id': 'gl-draw-point-point-outline',
  'type': 'circle',
  'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Point'], ['==', 'meta', 'feature']],
  'paint': {
    'circle-radius': 9,
    'circle-color': '#fff'
  },
  'interactive': true
}, {
  'id': 'gl-draw-point',
  'type': 'circle',
  'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Point'], ['==', 'meta', 'feature']],
  'paint': {
    'circle-radius': 7,
    'circle-color': '#03A9F4'
  },
  'interactive': true
}];

},{}],29:[function(require,module,exports){
'use strict';

module.exports = function (parent, startVertex, endVertex, map) {
  var startCoord = startVertex.geometry.coordinates;
  var endCoord = endVertex.geometry.coordinates;

  var ptA = map.project([startCoord[0], startCoord[1]]);
  var ptB = map.project([endCoord[0], endCoord[1]]);
  var mid = map.unproject([(ptA.x + ptB.x) / 2, (ptA.y + ptB.y) / 2]);

  return {
    type: 'Feature',
    properties: {
      meta: 'midpoint',
      parent: parent,
      lng: mid.lng,
      lat: mid.lat,
      coord_path: endVertex.properties.coord_path
    },
    geometry: {
      type: 'Point',
      coordinates: [mid.lng, mid.lat]
    }
  };
};

},{}],30:[function(require,module,exports){
'use strict';

module.exports = function (parent, coord, path, selected) {
  return {
    type: 'Feature',
    properties: {
      meta: 'vertex',
      parent: parent,
      coord_path: path,
      active: '' + selected
    },
    geometry: {
      type: 'Point',
      coordinates: coord
    }
  };
};

},{}],31:[function(require,module,exports){
'use strict';

var types = {
  POLYGON: 'polygon',
  LINE: 'line_string',
  POINT: 'point'
};

module.exports = types;

},{}],32:[function(require,module,exports){
'use strict';

var Point = require('point-geometry');

var DOM = {};

/**
 * Captures mouse position
 *
 * @param {Object} e Mouse event
 * @param {Object} el Container element.
 * @returns {Point}
 */
DOM.mousePos = function (e, el) {
  var rect = el.getBoundingClientRect();
  return new Point(e.clientX - rect.left - el.clientLeft, e.clientY - rect.top - el.clientTop);
};

/**
 * Builds DOM elements
 *
 * @param {String} tag Element name
 * @param {String} [className]
 * @param {Object} [container] DOM element to append to
 * @param {Object} [attrbutes] Object containing attributes to apply to an
 * element. Attribute name corresponds to the key.
 * @returns {el} The dom element
 */
DOM.create = function (tag, className, container, attributes) {
  var el = document.createElement(tag);
  if (className) el.className = className;
  if (attributes) {
    for (var key in attributes) {
      el.setAttribute(key, attributes[key]);
    }
  }
  if (container) container.appendChild(el);
  return el;
};

/**
 * Removes classes from an array of DOM elements
 *
 * @param {HTMLElement} elements
 * @param {String} klass
 */
DOM.removeClass = function (elements, klass) {
  Array.prototype.forEach.call(elements, function (el) {
    el.classList.remove(klass);
  });
};

var docStyle = document.documentElement.style;

function testProp(props) {
  for (var i = 0; i < props.length; i++) {
    if (props[i] in docStyle) {
      return props[i];
    }
  }
}

var transformProp = testProp(['transform', 'WebkitTransform']);

DOM.setTransform = function (el, value) {
  el.style[transformProp] = value;
};

var selectProp = testProp(['userSelect', 'MozUserSelect', 'WebkitUserSelect', 'msUserSelect']),
    userSelect;

DOM.disableSelection = function () {
  if (selectProp) {
    userSelect = docStyle[selectProp];
    docStyle[selectProp] = 'none';
  }
};

DOM.enableSelection = function () {
  if (selectProp) {
    docStyle[selectProp] = userSelect;
  }
};

module.exports.createButton = function (container, opts, controlClass) {
  var attr = { title: opts.title };
  if (opts.id) {
    attr.id = opts.id;
  }
  var a = DOM.create('button', opts.className, container, attr);

  a.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();

    var el = e.target;

    if (el.classList.contains('active')) {
      el.classList.remove('active');
    } else {
      DOM.removeClass(document.querySelectorAll('.' + controlClass), 'active');
      el.classList.add('active');
      opts.fn();
    }
  }, true);

  return a;
};

/**
 * Translates features based on mouse location
 *
 * @param {Object} feature - A GeoJSON feature
 * @param {Array<Number>} init - Initial position of the mouse
 * @param {Array<Number>} curr - Current position of the mouse
 * @param {Map} map - Instance of mapboxhl.Map
 * @returns {Object} GeoJSON feature
 */
module.exports.translate = function (feature, init, curr, map) {
  feature = JSON.parse(JSON.stringify(feature));
  var dx = curr.x - init.x;
  var dy = curr.y - init.y;
  var geom = feature.geometry;

  // iterate differently due to GeoJSON nesting
  var l, i;
  if (geom.type === 'Polygon') {
    l = geom.coordinates[0].length;
    for (i = 0; i < l; i++) {
      geom.coordinates[0][i] = translatePoint(geom.coordinates[0][i], dx, dy, map);
    }
  } else if (geom.type === 'LineString') {
    l = geom.coordinates.length;
    for (i = 0; i < l; i++) {
      geom.coordinates[i] = translatePoint(geom.coordinates[i], dx, dy, map);
    }
  } else {
    geom.coordinates = translatePoint(geom.coordinates, dx, dy, map);
  }

  return feature;
};

/**
 * Translate a point based on mouse location
 *
 * @param {Array<Number>} point - [ longitude, latitude ]
 * @param {Number} dx - Difference between the initial x mouse position and current x position
 * @param {Number} dy - Difference between the initial y mouse position and current y position
 * @param {Map} map - Instance of mapboxgl.Map
 * @returns {Array<Number>} new translated point
 */
var translatePoint = function translatePoint(point, dx, dy, map) {
  var c = map.project([point[0], point[1]]);
  c = map.unproject([c.x + dx, c.y + dy]);
  return [c.lng, c.lat];
};

/**
 * Create a version of `fn` that only fires once every `time` millseconds.
 *
 * @param {Function} fn the function to be throttled
 * @param {number} time millseconds required between function calls
 * @param {*} context the value of `this` with which the function is called
 * @returns {Function} debounced function
 * @private
 */

function throttle(fn, time, context) {
  var lock, args, wrapperFn, later;

  later = function later() {
    // reset lock and call if queued
    lock = false;
    if (args) {
      wrapperFn.apply(context, args);
      args = false;
    }
  };

  wrapperFn = function wrapperFn() {
    if (lock) {
      // called too soon, queue to call later
      args = arguments;
    } else {
      // call and lock until later
      fn.apply(context, arguments);
      setTimeout(later, time);
      lock = true;
    }
  };

  return wrapperFn;
}

module.exports.throttle = throttle;
module.exports.DOM = DOM;
module.exports.translatePoint = translatePoint;

},{"point-geometry":9}],33:[function(require,module,exports){
'use strict';

var _require = require('../lib/common_selectors');

var noFeature = _require.noFeature;
var isOfMetaType = _require.isOfMetaType;
var isShiftDown = _require.isShiftDown;

var addCoords = require('../lib/add_coords');

module.exports = function (ctx, opts) {
  var featureId = opts.featureId;
  var feature = ctx.store.get(featureId);

  if (feature.type === 'Point') {
    throw new TypeError('direct_select mode doesn\'t handle point features');
  }

  var dragging = opts.isDragging || false;
  var startPos = opts.startPos || null;
  var coordPos = null;
  var numCoords = null;

  var selectedCoordPaths = opts.coordPath ? [opts.coordPath] : [];

  var onVertex = function onVertex(e) {
    dragging = true;
    startPos = e.lngLat;
    var about = e.featureTarget.properties;
    var selectedIndex = selectedCoordPaths.indexOf(about.coord_path);
    if (!isShiftDown(e) && selectedIndex === -1) {
      selectedCoordPaths = [about.coord_path];
    } else if (isShiftDown(e) && selectedIndex === -1) {
      selectedCoordPaths.push(about.coord_path);
    }
    feature.changed();
  };

  var onMidpoint = function onMidpoint(e) {
    dragging = true;
    startPos = e.lngLat;
    var about = e.featureTarget.properties;
    feature.addCoordinate(about.coord_path, about.lng, about.lat);
    selectedCoordPaths = [about.coord_path];
  };

  var setupCoordPos = function setupCoordPos() {
    coordPos = selectedCoordPaths.map(function (coord_path) {
      return feature.getCoordinate(coord_path);
    });
    numCoords = coordPos.length;
  };

  return {
    start: function start() {
      this.on('mousedown', isOfMetaType('vertex'), onVertex);
      this.on('mousedown', isOfMetaType('midpoint'), onMidpoint);
      this.on('drag', function () {
        return dragging;
      }, function (e) {
        e.originalEvent.stopPropagation();
        if (coordPos === null) {
          setupCoordPos();
        }
        var lngChange = e.lngLat.lng - startPos.lng;
        var latChange = e.lngLat.lat - startPos.lat;

        for (var i = 0; i < numCoords; i++) {
          var coord_path = selectedCoordPaths[i];
          var pos = coordPos[i];

          var lng = pos[0] + lngChange;
          var lat = pos[1] + latChange;
          feature.updateCoordinate(coord_path, lng, lat);
        }
      });
      this.on('mouseup', function () {
        return true;
      }, function () {
        dragging = false;
        coordPos = null;
        numCoords = null;
        startPos = null;
      });
      this.on('click', noFeature, function () {
        ctx.events.changeMode('simple_select');
      });
      this.on('trash', function () {
        return selectedCoordPaths.length > 0;
      }, function () {
        selectedCoordPaths.sort().reverse().forEach(function (id) {
          return feature.removeCoordinate(id);
        });
        selectedCoordPaths = [];
        if (feature.isValid() === false) {
          ctx.store.delete([featureId]);
          ctx.events.changeMode('simple_select');
        }
      });
      this.on('trash', function () {
        return selectedCoordPaths.length === 0;
      }, function () {
        ctx.events.changeMode('simple_select', [featureId]);
      });
    },
    stop: function stop() {},
    render: function render(geojson, push) {
      if (featureId === geojson.properties.id) {
        geojson.properties.active = 'true';
        push(geojson);
        addCoords(geojson, true, push, ctx.map, selectedCoordPaths);
      } else {
        geojson.properties.active = 'false';
        push(geojson);
      }
    }
  };
};

},{"../lib/add_coords":20,"../lib/common_selectors":21}],34:[function(require,module,exports){
'use strict';

var _require = require('../lib/common_selectors');

var isEnterKey = _require.isEnterKey;
var isEscapeKey = _require.isEscapeKey;

var LineString = require('../feature_types/line_string');
var types = require('../lib/types');

module.exports = function (ctx) {

  var feature = new LineString(ctx, {
    'type': 'Feature',
    'properties': {},
    'geometry': {
      'type': 'LineString',
      'coordinates': []
    }
  });

  ctx.store.add(feature);

  var stopDrawingAndRemove = function stopDrawingAndRemove() {
    ctx.events.changeMode('simple_select');
    ctx.store.delete([feature.id]);
  };

  var pos = 0;

  var onMouseMove = function onMouseMove(e) {
    ctx.ui.setClass({ mouse: 'add' });
    feature.updateCoordinate(pos, e.lngLat.lng, e.lngLat.lat);
  };

  var onClick = function onClick(e) {
    ctx.ui.setClass({ mouse: 'add' });
    if (pos > 0 && feature.coordinates[0][0] === e.lngLat.lng && feature.coordinates[0][1] === e.lngLat.lat) {
      // did we click on the first point
      onFinish();
    } else if (pos > 0 && feature.coordinates[pos - 1][0] === e.lngLat.lng && feature.coordinates[pos - 1][1] === e.lngLat.lat) {
      // click on the last point
      onFinish();
    } else {
      feature.updateCoordinate(pos, e.lngLat.lng, e.lngLat.lat);
      pos++;
    }
  };

  var onFinish = function onFinish() {
    feature.removeCoordinate('' + pos);
    pos--;
    ctx.events.changeMode('simple_select', [feature.id]);
  };

  return {
    start: function start() {
      ctx.ui.setClass({ mouse: 'add' });
      ctx.ui.setButtonActive(types.LINE);
      this.on('mousemove', function () {
        return true;
      }, onMouseMove);
      this.on('click', function () {
        return true;
      }, onClick);
      this.on('keyup', isEscapeKey, stopDrawingAndRemove);
      this.on('keyup', isEnterKey, onFinish);
      this.on('trash', function () {
        return true;
      }, stopDrawingAndRemove);
    },
    stop: function stop() {
      ctx.ui.setButtonInactive(types.LINE);
      if (!feature.isValid()) {
        ctx.store.delete([feature.id]);
      }
    },
    render: function render(geojson, push) {
      if (geojson.geometry.coordinates[0] !== undefined) {
        geojson.properties.active = geojson.properties.id === feature.id ? 'true' : 'false';
        geojson.properties.meta = geojson.properties.active === 'true' ? 'feature' : geojson.properties.meta;
        push(geojson);
      }
    }
  };
};

},{"../feature_types/line_string":16,"../lib/common_selectors":21,"../lib/types":31}],35:[function(require,module,exports){
'use strict';

var _require = require('../lib/common_selectors');

var isEnterKey = _require.isEnterKey;
var isEscapeKey = _require.isEscapeKey;

var Point = require('../feature_types/point');
var types = require('../lib/types');

module.exports = function (ctx) {

  var feature = new Point(ctx, {
    'type': 'Feature',
    'properties': {},
    'geometry': {
      'type': 'Point',
      'coordinates': []
    }
  });

  ctx.store.add(feature);

  var stopDrawingAndRemove = function stopDrawingAndRemove() {
    ctx.events.changeMode('simple_select');
    ctx.store.delete([feature.id]);
  };

  var onMouseMove = function onMouseMove() {
    ctx.ui.setClass({ mouse: 'add' });
  };

  var done = false;
  var onClick = function onClick(e) {
    ctx.ui.setClass({ mouse: 'add' });
    done = true;
    feature.updateCoordinate('', e.lngLat.lng, e.lngLat.lat);
    ctx.events.changeMode('simple_select', [feature.id]);
  };

  return {
    start: function start() {
      ctx.ui.setClass({ mouse: 'add' });
      ctx.ui.setButtonActive(types.POINT);
      this.on('mousemove', function () {
        return true;
      }, onMouseMove);
      this.on('click', function () {
        return true;
      }, onClick);
      this.on('keyup', isEscapeKey, stopDrawingAndRemove);
      this.on('keyup', isEnterKey, stopDrawingAndRemove);
      this.on('trash', function () {
        return true;
      }, stopDrawingAndRemove);
    },
    stop: function stop() {
      ctx.ui.setButtonInactive(types.POINT);
      if (done === false) {
        ctx.store.delete([feature.id]);
      }
    },
    render: function render(geojson, push) {
      geojson.properties.active = geojson.properties.id === feature.id ? 'true' : 'false';
      if (geojson.properties.active === 'false') {
        push(geojson);
      }
    }
  };
};

},{"../feature_types/point":18,"../lib/common_selectors":21,"../lib/types":31}],36:[function(require,module,exports){
'use strict';

var _require = require('../lib/common_selectors');

var isEnterKey = _require.isEnterKey;
var isEscapeKey = _require.isEscapeKey;

var Polygon = require('../feature_types/polygon');
var types = require('../lib/types');

module.exports = function (ctx) {

  var feature = new Polygon(ctx, {
    'type': 'Feature',
    'properties': {},
    'geometry': {
      'type': 'Polygon',
      'coordinates': [[]]
    }
  });

  ctx.store.add(feature);

  var stopDrawingAndRemove = function stopDrawingAndRemove() {
    ctx.events.changeMode('simple_select');
    ctx.store.delete([feature.id]);
  };

  var pos = 0;

  var onMouseMove = function onMouseMove(e) {
    ctx.ui.setClass({ mouse: 'add' });
    feature.updateCoordinate('0.' + pos, e.lngLat.lng, e.lngLat.lat);
  };

  var onClick = function onClick(e) {
    ctx.ui.setClass({ mouse: 'add' });
    if (pos > 0 && feature.coordinates[0][0][0] === e.lngLat.lng && feature.coordinates[0][0][1] === e.lngLat.lat) {
      // did we click on the first point
      onFinish();
    } else if (pos > 0 && feature.coordinates[0][pos - 1][0] === e.lngLat.lng && feature.coordinates[0][pos - 1][1] === e.lngLat.lat) {
      // click on the last point
      onFinish();
    } else {
      feature.updateCoordinate('0.' + pos, e.lngLat.lng, e.lngLat.lat);
      pos++;
    }
  };

  var onFinish = function onFinish() {
    feature.removeCoordinate('0.' + pos);
    pos--;
    ctx.events.changeMode('simple_select', [feature.id]);
  };

  return {
    start: function start() {
      ctx.ui.setClass({ mouse: 'add' });
      ctx.ui.setButtonActive(types.POLYGON);
      this.on('mousemove', function () {
        return true;
      }, onMouseMove);
      this.on('click', function () {
        return true;
      }, onClick);
      this.on('keyup', isEscapeKey, stopDrawingAndRemove);
      this.on('keyup', isEnterKey, onFinish);
      this.on('trash', function () {
        return true;
      }, stopDrawingAndRemove);
    },
    stop: function stop() {
      ctx.ui.setButtonInactive(types.POLYGON);
      if (!feature.isValid()) {
        ctx.store.delete([feature.id]);
      }
    },
    render: function render(geojson, push) {
      geojson.properties.active = geojson.properties.id === feature.id ? 'true' : 'false';
      geojson.properties.meta = geojson.properties.active === 'true' ? 'feature' : geojson.properties.meta;

      if (geojson.properties.active === 'true' && pos === 1) {
        var coords = [[geojson.geometry.coordinates[0][0][0], geojson.geometry.coordinates[0][0][1]], [geojson.geometry.coordinates[0][1][0], geojson.geometry.coordinates[0][1][1]]];
        push({
          'type': 'Feature',
          'properties': geojson.properties,
          'geometry': {
            'coordinates': coords,
            'type': 'LineString'
          }
        });
      } else if (geojson.properties.active === 'false' || pos > 1) {
        push(geojson);
      }
    }
  };
};

},{"../feature_types/polygon":19,"../lib/common_selectors":21,"../lib/types":31}],37:[function(require,module,exports){
'use strict';

var _require = require('../lib/common_selectors');

var noFeature = _require.noFeature;
var isShiftDown = _require.isShiftDown;
var isFeature = _require.isFeature;
var isOfMetaType = _require.isOfMetaType;

var addCoords = require('../lib/add_coords');

module.exports = function (ctx, startingSelectedFeatureIds) {

  var selectedFeaturesById = {};
  (startingSelectedFeatureIds || []).forEach(function (id) {
    selectedFeaturesById[id] = ctx.store.get(id);
  });

  var startPos = null;
  var dragging = false;
  var featureCoords = null;
  var features = null;
  var numFeatures = null;

  var readyForDirectSelect = function readyForDirectSelect(e) {
    if (isFeature(e)) {
      var about = e.featureTarget.properties;
      return selectedFeaturesById[about.id] !== undefined && selectedFeaturesById[about.id].type !== 'Point';
    }
    return false;
  };

  var buildFeatureCoords = function buildFeatureCoords() {
    var featureIds = Object.keys(selectedFeaturesById);
    featureCoords = featureIds.map(function (id) {
      return selectedFeaturesById[id].getCoordinates();
    });
    features = featureIds.map(function (id) {
      return selectedFeaturesById[id];
    });
    numFeatures = featureIds.length;
  };

  var directSelect = function directSelect(e) {
    ctx.api.changeMode('direct_select', {
      featureId: e.featureTarget.properties.id
    });
  };

  return {
    start: function start() {
      this.on('click', noFeature, function () {
        var _this = this;

        var wasSelected = Object.keys(selectedFeaturesById);
        selectedFeaturesById = {};
        wasSelected.forEach(function (id) {
          return _this.render(id);
        });
        this.fire('selected.end', { featureIds: wasSelected });
      });

      this.on('mousedown', isOfMetaType('vertex'), function (e) {
        ctx.api.changeMode('direct_select', {
          featureId: e.featureTarget.properties.parent,
          coordPath: e.featureTarget.properties.coord_path,
          isDragging: true,
          startPos: e.lngLat
        });
      });

      this.on('mousedown', isFeature, function (e) {
        var _this2 = this;

        dragging = true;
        startPos = e.lngLat;
        var id = e.featureTarget.properties.id;

        var isSelected = selectedFeaturesById[id] !== undefined;

        if (isSelected && !isShiftDown(e)) {
          this.on('click', readyForDirectSelect, directSelect);
        } else if (isSelected && isShiftDown(e)) {
          delete selectedFeaturesById[id];
          this.fire('selected.end', { featureIds: [id] });
          this.render(id);
        } else if (!isSelected && isShiftDown(e)) {
          // add to selected
          selectedFeaturesById[id] = ctx.store.get(id);
          this.fire('selected.start', { featureIds: [id] });
          this.render(id);
        } else {
          //make selected
          var wasSelected = Object.keys(selectedFeaturesById);
          wasSelected.forEach(function (wereId) {
            return _this2.render(wereId);
          });
          selectedFeaturesById = {};
          selectedFeaturesById[id] = ctx.store.get(id);
          this.fire('selected.end', { featureIds: wasSelected });
          this.fire('selected.start', { featureIds: [id] });
          this.render(id);
        }
      });

      this.on('mouseup', function () {
        return true;
      }, function () {
        dragging = false;
        featureCoords = null;
        features = null;
        numFeatures = null;
      });

      this.on('drag', function () {
        return dragging;
      }, function (e) {
        this.off('click', readyForDirectSelect, directSelect);
        e.originalEvent.stopPropagation();
        if (featureCoords === null) {
          buildFeatureCoords();
        }

        var lngD = e.lngLat.lng - startPos.lng;
        var latD = e.lngLat.lat - startPos.lat;

        var coordMap = function coordMap(coord) {
          return [coord[0] + lngD, coord[1] + latD];
        };
        var ringMap = function ringMap(ring) {
          return ring.map(function (coord) {
            return coordMap(coord);
          });
        };
        var mutliMap = function mutliMap(multi) {
          return multi.map(function (ring) {
            return ringMap(ring);
          });
        };

        for (var i = 0; i < numFeatures; i++) {
          var feature = features[i];
          if (feature.type === 'Point') {
            feature.setCoordinates(coordMap(featureCoords[i]));
          } else if (feature.type === 'LineString' || feature.type === 'MultiPoint') {
            feature.setCoordinates(featureCoords[i].map(coordMap));
          } else if (feature.type === 'Polygon' || feature.type === 'MultiLineString') {
            feature.setCoordinates(featureCoords[i].map(ringMap));
          } else if (feature.type === 'MultiPolygon') {
            feature.setCoordinates(featureCoords[i].map(mutliMap));
          }
        }
      });

      this.on('trash', function () {
        return true;
      }, function () {
        dragging = false;
        featureCoords = null;
        features = null;
        numFeatures = null;
        ctx.store.delete(Object.keys(selectedFeaturesById));
        selectedFeaturesById = {};
      });
    },
    render: function render(geojson, push) {
      geojson.properties.active = selectedFeaturesById[geojson.properties.id] ? 'true' : 'false';
      if (geojson.properties.active === 'true' && geojson.geometry.type !== 'Point') {
        addCoords(geojson, false, push, ctx.map, []);
      }
      push(geojson);
    }
  };
};

},{"../lib/add_coords":20,"../lib/common_selectors":21}],38:[function(require,module,exports){
'use strict';

var hat = require('hat');

var defaultOptions = {
  defaultMode: 'simple_select',
  position: 'top-left',
  keybindings: true,
  displayControlsDefault: true,
  styles: require('./lib/theme'),
  controls: {}
};

var showControls = {
  point: true,
  line_string: true,
  polygon: true,
  trash: true
};

var hideControls = {
  point: false,
  line_string: false,
  polygon: false,
  trash: false
};

module.exports = function () {
  var options = arguments.length <= 0 || arguments[0] === undefined ? { controls: {} } : arguments[0];


  if (options.displayControlsDefault === false) {
    options.controls = Object.assign(hideControls, options.controls);
  } else {
    options.controls = Object.assign(showControls, options.controls);
  }

  options = Object.assign(defaultOptions, options);

  options.styles = options.styles.reduce(function (memo, style) {
    style.id = style.id || hat();
    if (style.source) {
      memo.push(style);
    } else {
      var id = style.id;
      style.id = id + '.hot';
      style.source = 'mapbox-gl-draw-hot';
      memo.push(JSON.parse(JSON.stringify(style)));

      style.id = id + '.cold';
      style.source = 'mapbox-gl-draw-cold';
      memo.push(JSON.parse(JSON.stringify(style)));
    }

    return memo;
  }, []);

  return options;
};

},{"./lib/theme":28,"hat":6}],39:[function(require,module,exports){
'use strict';

module.exports = function render() {
  var _this = this;

  var isStillAlive = this.ctx.map && this.ctx.map.getSource('mapbox-gl-draw-hot') !== undefined;
  if (isStillAlive) {
    var mode;
    var newHotIds;
    var newColdIds;

    (function () {
      // checks to make sure we still have a map
      mode = _this.ctx.events.currentModeName();

      _this.ctx.ui.setClass({
        mode: mode
      });

      newHotIds = [];
      newColdIds = [];


      if (_this.isDirty) {
        newColdIds = _this.featureIds;
      } else {
        newHotIds = _this.changedIds.filter(function (id) {
          return _this.features[id] !== undefined;
        });
        newColdIds = _this.sources.hot.filter(function getColdIds(geojson) {
          return geojson.properties.id && newHotIds.indexOf(geojson.properties.id) === -1 && this.features[geojson.properties.id] !== undefined;
        }.bind(_this)).map(function (geojson) {
          return geojson.properties.id;
        });
      }

      _this.sources.hot = [];
      var lastColdCount = _this.sources.cold.length;
      _this.sources.cold = _this.isDirty ? [] : _this.sources.cold.filter(function saveColdFeatures(geojson) {
        var id = geojson.properties.id || geojson.properties.parent;
        return newHotIds.indexOf(id) === -1;
      });

      var changed = [];
      newHotIds.concat(newColdIds).map(function prepForViewUpdates(id) {
        if (newHotIds.indexOf(id) > -1) {
          return { source: 'hot', 'id': id };
        } else {
          return { source: 'cold', 'id': id };
        }
      }).forEach(function calculateViewUpdate(change) {
        var id = change.id;
        var source = change.source;

        var feature = this.features[id];
        var featureInternal = feature.internal(mode);

        if (source === 'hot' && feature.isValid()) {
          changed.push(feature.toGeoJSON());
        }

        this.ctx.events.currentModeRender(featureInternal, function addGeoJsonToView(geojson) {
          this.sources[source].push(geojson);
        }.bind(this));
      }.bind(_this));

      if (lastColdCount !== _this.sources.cold.length) {
        _this.ctx.map.getSource('mapbox-gl-draw-cold').setData({
          type: 'FeatureCollection',
          features: _this.sources.cold
        });
      }

      _this.ctx.map.getSource('mapbox-gl-draw-hot').setData({
        type: 'FeatureCollection',
        features: _this.sources.hot
      });

      if (changed.length) {
        _this.ctx.map.fire('draw.changed', { features: changed });
      }
    })();
  }
  this.isDirty = false;
  this.changedIds = [];
};

},{}],40:[function(require,module,exports){
'use strict';

var events = require('./events');
var Store = require('./store');
var ui = require('./ui');

module.exports = function (ctx) {

  ctx.events = events(ctx);

  ctx.map = null;
  ctx.container = null;
  ctx.store = null;
  ui(ctx);

  var setup = {
    addTo: function addTo(map) {
      ctx.map = map;
      setup.onAdd(map);
      return this;
    },
    remove: function remove() {
      setup.removeLayers();
      ctx.ui.removeButtons();
      ctx.events.removeEventListeners();
      ctx.map = null;
      ctx.container = null;
      ctx.store = null;
      return this;
    },
    onAdd: function onAdd(map) {
      ctx.container = map.getContainer();
      ctx.store = new Store(ctx);

      ctx.ui.addButtons();

      if (map.style.loaded()) {
        // not public
        ctx.events.addEventListeners();
        setup.addLayers();
      } else {
        map.on('load', function () {
          ctx.events.addEventListeners();
          setup.addLayers();
        });
      }
    },
    addLayers: function addLayers() {
      // drawn features style
      ctx.map.addSource('mapbox-gl-draw-cold', {
        data: {
          type: 'FeatureCollection',
          features: []
        },
        type: 'geojson'
      });

      // hot features style
      ctx.map.addSource('mapbox-gl-draw-hot', {
        data: {
          type: 'FeatureCollection',
          features: []
        },
        type: 'geojson'
      });

      ctx.options.styles.forEach(function (style) {
        ctx.map.addLayer(style);
      });

      ctx.store.render();
    },
    removeLayers: function removeLayers() {
      ctx.options.styles.forEach(function (style) {
        ctx.map.removeLayer(style.id);
      });

      ctx.map.removeSource('mapbox-gl-draw-cold');
      ctx.map.removeSource('mapbox-gl-draw-hot');
    }
  };

  return setup;
};

},{"./events":14,"./store":41,"./ui":42}],41:[function(require,module,exports){
'use strict';

var _require = require('./lib/util');

var throttle = _require.throttle;

var render = require('./render');

var Store = module.exports = function (ctx) {
  this.ctx = ctx;
  this.features = {};
  this.featureIds = [];
  this.sources = {
    hot: [],
    cold: []
  };
  this.render = throttle(render, 16, this);

  this.isDirty = false;
  this.changedIds = [];
};

Store.prototype.setDirty = function () {
  this.isDirty = true;
};

Store.prototype.featureChanged = function (id) {
  if (this.changedIds.indexOf(id) === -1) {
    this.changedIds.push(id);
  }
};

Store.prototype.add = function (feature) {
  this.featureChanged(feature.id);
  this.features[feature.id] = feature;
  if (this.featureIds.indexOf(feature.id) === -1) {
    this.featureIds.push(feature.id);
  }
  return feature.id;
};

Store.prototype.get = function (id) {
  return this.features[id];
};

Store.prototype.getAll = function () {
  var _this = this;

  return Object.keys(this.features).map(function (id) {
    return _this.features[id];
  });
};

Store.prototype.delete = function (ids) {
  var _this2 = this;

  var deleted = [];
  ids.forEach(function (id) {
    var idx = _this2.featureIds.indexOf(id);
    if (idx !== -1) {
      var feature = _this2.get(id);
      deleted.push(feature.toGeoJSON());
      delete _this2.features[id];
      _this2.featureIds.splice(idx, 1);
    }
  });

  if (deleted.length > 0) {
    this.isDirty = true;
    this.ctx.map.fire('draw.deleted', { featureIds: deleted });
  }
};

},{"./lib/util":32,"./render":39}],42:[function(require,module,exports){
'use strict';

var types = require('./lib/types');

var _require = require('./lib/util');

var createButton = _require.createButton;


module.exports = function (ctx) {

  var buttons = {};

  var currentClass = {
    mode: null,
    feature: null,
    mouse: null
  };

  var nextClass = {
    mode: null,
    feature: null,
    mouse: null
  };

  var classTypes = ['mode', 'feature', 'mouse'];

  var update = function update() {
    if (ctx.container) {

      var remove = [];
      var add = [];

      var className = [];

      nextClass.feature = nextClass.mouse === 'none' ? null : nextClass.feature;

      classTypes.forEach(function (type) {
        className.push(type + '-' + nextClass[type]);
        if (nextClass[type] !== currentClass[type]) {
          remove.push(type + '-' + currentClass[type]);
          if (nextClass[type] !== null) {
            add.push(type + '-' + nextClass[type]);
          }
        }
      });

      if (remove.length) {
        ctx.container.classList.remove.apply(ctx.container.classList, remove);
        ctx.container.classList.add.apply(ctx.container.classList, add);
      }

      classTypes.forEach(function (type) {
        currentClass[type] = nextClass[type];
      });
    }
  };

  ctx.ui = {
    setClass: function setClass(opts) {
      classTypes.forEach(function (type) {
        if (opts[type]) {
          nextClass[type] = opts[type];
          if (nextClass[type] !== currentClass[type]) {
            update();
          }
        }
      });
    },
    addButtons: function addButtons() {
      var controlClass = 'mapbox-gl-draw_ctrl-draw-btn';
      var controls = ctx.options.controls;
      var ctrlPos = 'mapboxgl-ctrl-';
      switch (ctx.options.position) {
        case 'top-left':
        case 'top-right':
        case 'bottom-left':
        case 'bottom-right':
          ctrlPos += ctx.options.position;
          break;
        default:
          ctrlPos += 'top-left';
      }

      var controlContainer = ctx.container.getElementsByClassName(ctrlPos)[0];
      var controlGroup = controlContainer.getElementsByClassName('mapboxgl-ctrl-group')[0];
      if (!controlGroup) {
        controlGroup = document.createElement('div');
        controlGroup.className = 'mapboxgl-ctrl-group mapboxgl-ctrl';

        var attributionControl = controlContainer.getElementsByClassName('mapboxgl-ctrl-attrib')[0];
        if (attributionControl) {
          controlContainer.insertBefore(controlGroup, attributionControl);
        } else {
          controlContainer.appendChild(controlGroup);
        }
      }

      if (controls.line_string) {
        buttons[types.LINE] = createButton(controlGroup, {
          className: controlClass + ' mapbox-gl-draw_line',
          title: 'LineString tool ' + (ctx.options.keybindings && '(l)'),
          fn: function fn() {
            return ctx.api.changeMode('draw_line_string');
          }
        }, controlClass);
      }

      if (controls[types.POLYGON]) {
        buttons[types.POLYGON] = createButton(controlGroup, {
          className: controlClass + ' mapbox-gl-draw_polygon',
          title: 'Polygon tool ' + (ctx.options.keybindings && '(p)'),
          fn: function fn() {
            return ctx.api.changeMode('draw_polygon');
          }
        }, controlClass);
      }

      if (controls[types.POINT]) {
        buttons[types.POINT] = createButton(controlGroup, {
          className: controlClass + ' mapbox-gl-draw_point',
          title: 'Marker tool ' + (ctx.options.keybindings && '(m)'),
          fn: function fn() {
            return ctx.api.changeMode('draw_point');
          }
        }, controlClass);
      }

      if (controls.trash) {
        buttons.trash = createButton(controlGroup, {
          className: controlClass + ' mapbox-gl-draw_trash',
          title: 'delete',
          fn: function fn() {
            ctx.api.trash();
            ctx.ui.setButtonInactive('trash');
          }
        }, controlClass);
      }
    },
    setButtonActive: function setButtonActive(id) {
      if (buttons[id] && id !== 'trash') {
        buttons[id].classList.add('active');
      }
    },
    setButtonInactive: function setButtonInactive(id) {
      if (buttons[id]) {
        buttons[id].classList.remove('active');
      }
    },
    setAllInactive: function setAllInactive() {
      var buttonIds = Object.keys(buttons);

      buttonIds.forEach(function (buttonId) {
        if (buttonId !== 'trash') {
          var button = buttons[buttonId];
          button.classList.remove('active');
        }
      });
    },
    removeButtons: function removeButtons() {
      var buttonIds = Object.keys(buttons);

      buttonIds.forEach(function (buttonId) {
        var button = buttons[buttonId];
        if (button.parentNode) {
          button.parentNode.removeChild(button);
        }
        buttons[buttonId] = null;
      });
    }
  };
};

},{"./lib/types":31,"./lib/util":32}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5LW1pZGRsZXdhcmUvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImluZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnktbWlkZGxld2FyZS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2dlb2pzb24tYXJlYS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nZW9qc29uaGludC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nZW9qc29uaGludC9vYmplY3QuanMiLCJub2RlX21vZHVsZXMvaGF0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2pzb25saW50LWxpbmVzL2xpYi9qc29ubGludC5qcyIsIm5vZGVfbW9kdWxlcy9wYXRoLWJyb3dzZXJpZnkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcG9pbnQtZ2VvbWV0cnkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3R1cmYtYXJlYS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy93Z3M4NC9pbmRleC5qcyIsInNyYy9hcGkuanMiLCJzcmMvZXZlbnRzLmpzIiwic3JjL2ZlYXR1cmVfdHlwZXMvZmVhdHVyZS5qcyIsInNyYy9mZWF0dXJlX3R5cGVzL2xpbmVfc3RyaW5nLmpzIiwic3JjL2ZlYXR1cmVfdHlwZXMvbXVsdGlfZmVhdHVyZS5qcyIsInNyYy9mZWF0dXJlX3R5cGVzL3BvaW50LmpzIiwic3JjL2ZlYXR1cmVfdHlwZXMvcG9seWdvbi5qcyIsInNyYy9saWIvYWRkX2Nvb3Jkcy5qcyIsInNyYy9saWIvY29tbW9uX3NlbGVjdG9ycy5qcyIsInNyYy9saWIvZXVjbGlkZWFuX2Rpc3RhbmNlLmpzIiwic3JjL2xpYi9mZWF0dXJlc19hdC5qcyIsInNyYy9saWIvZ2V0X2ZlYXR1cmVzX2FuZF9zZXRfY3Vyc29yLmpzIiwic3JjL2xpYi9pc19jbGljay5qcyIsInNyYy9saWIvbW9kZV9oYW5kbGVyLmpzIiwic3JjL2xpYi9wb2x5ZmlsbHMuanMiLCJzcmMvbGliL3RoZW1lLmpzIiwic3JjL2xpYi90b19taWRwb2ludC5qcyIsInNyYy9saWIvdG9fdmVydGV4LmpzIiwic3JjL2xpYi90eXBlcy5qcyIsInNyYy9saWIvdXRpbC5qcyIsInNyYy9tb2Rlcy9kaXJlY3Rfc2VsZWN0LmpzIiwic3JjL21vZGVzL2RyYXdfbGluZV9zdHJpbmcuanMiLCJzcmMvbW9kZXMvZHJhd19wb2ludC5qcyIsInNyYy9tb2Rlcy9kcmF3X3BvbHlnb24uanMiLCJzcmMvbW9kZXMvc2ltcGxlX3NlbGVjdC5qcyIsInNyYy9vcHRpb25zLmpzIiwic3JjL3JlbmRlci5qcyIsInNyYy9zZXR1cC5qcyIsInNyYy9zdG9yZS5qcyIsInNyYy91aS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOztBQUVBLFFBQVEscUJBQVI7QUFDQSxJQUFJLFFBQVEsUUFBUSxhQUFSLENBQVo7QUFDQSxJQUFJLFVBQVUsUUFBUSxlQUFSLENBQWQ7QUFDQSxJQUFJLE1BQU0sUUFBUSxXQUFSLENBQVY7QUFDQSxJQUFNLFFBQVEsUUFBUSxpQkFBUixDQUFkOztBQUVBLElBQUksT0FBTyxTQUFQLElBQU8sQ0FBUyxPQUFULEVBQWtCO0FBQzNCLFlBQVUsUUFBUSxPQUFSLENBQVY7O0FBRUEsTUFBSSxNQUFNO0FBQ1IsYUFBUztBQURELEdBQVY7O0FBSUEsTUFBSSxNQUFNLElBQUksR0FBSixDQUFWO0FBQ0EsTUFBSSxHQUFKLEdBQVUsR0FBVjs7QUFFQSxNQUFJLFFBQVEsTUFBTSxHQUFOLENBQVo7QUFDQSxNQUFJLEtBQUosR0FBWSxNQUFNLEtBQWxCO0FBQ0EsTUFBSSxNQUFKLEdBQWEsTUFBTSxNQUFuQjtBQUNBLE1BQUksS0FBSixHQUFZLEtBQVo7QUFDQSxNQUFJLE9BQUosR0FBYyxPQUFkOztBQUVBLFNBQU8sR0FBUDtBQUNELENBakJEOztBQW1CQSxPQUFPLE9BQVAsR0FBaUIsSUFBakI7O0FBRUEsT0FBTyxRQUFQLEdBQWtCLE9BQU8sUUFBUCxJQUFtQixFQUFyQztBQUNBLE9BQU8sUUFBUCxDQUFnQixJQUFoQixHQUF1QixJQUF2Qjs7O0FDOUJBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3pyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ0hBLElBQUksTUFBTSxRQUFRLEtBQVIsQ0FBVjtBQUNBLElBQUksYUFBYSxRQUFRLG1CQUFSLENBQWpCO0FBQ0EsSUFBSSxjQUFjLFFBQVEsYUFBUixDQUFsQjs7QUFFQSxJQUFJLGVBQWU7QUFDakIsYUFBVyxRQUFRLHlCQUFSLENBRE07QUFFakIsZ0JBQWMsUUFBUSw2QkFBUixDQUZHO0FBR2pCLFdBQVMsUUFBUSx1QkFBUixDQUhRO0FBSWpCLGtCQUFnQixRQUFRLCtCQUFSLENBSkM7QUFLakIscUJBQW1CLFFBQVEsK0JBQVIsQ0FMRjtBQU1qQixnQkFBYyxRQUFRLCtCQUFSO0FBTkcsQ0FBbkI7O0FBU0EsSUFBSSxpQkFBaUIsT0FBTyxJQUFQLENBQVksWUFBWixFQUEwQixJQUExQixDQUErQixJQUEvQixDQUFyQjs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsVUFBUyxHQUFULEVBQWM7O0FBRTdCLFNBQU87QUFDTCxxQkFBaUIseUJBQVMsQ0FBVCxFQUFZLENBQVosRUFBZTtBQUM5QixVQUFJLFdBQVcsV0FBVyxFQUFDLE9BQU8sRUFBQyxJQUFELEVBQUksSUFBSixFQUFSLEVBQVgsRUFBNEIsR0FBNUIsQ0FBZjtBQUNBLGFBQU8sU0FBUyxHQUFULENBQWE7QUFBQSxlQUFXLFFBQVEsVUFBUixDQUFtQixFQUE5QjtBQUFBLE9BQWIsQ0FBUDtBQUNELEtBSkk7QUFLTCxTQUFLLGFBQVUsT0FBVixFQUF5QztBQUFBOztBQUFBLFVBQXRCLGVBQXNCLHlEQUFOLElBQU07OztBQUUzQyxVQUFJLFFBQVEsSUFBUixLQUFpQixtQkFBakIsSUFBd0MsQ0FBQyxRQUFRLFFBQXJELEVBQStEO0FBQzlELGtCQUFVO0FBQ1IsZ0JBQU0sU0FERTtBQUVSLGNBQUksUUFBUSxFQUZKO0FBR1Isc0JBQVksUUFBUSxVQUFSLElBQXNCLEVBSDFCO0FBSVIsb0JBQVU7QUFKRixTQUFWO0FBTUQ7O0FBRUQsVUFBSSxlQUFKLEVBQXFCO0FBQ25CLFlBQUksU0FBUyxZQUFZLElBQVosQ0FBaUIsT0FBakIsQ0FBYjtBQUNBLFlBQUksT0FBTyxNQUFYLEVBQW1CO0FBQ2pCLGdCQUFNLElBQUksS0FBSixDQUFVLE9BQU8sQ0FBUCxFQUFVLE9BQXBCLENBQU47QUFDRDs7QUFFRCxTQUFDLFFBQVEsSUFBUixLQUFpQixtQkFBakIsR0FBdUMsUUFBUSxRQUEvQyxHQUEwRCxDQUFDLE9BQUQsQ0FBM0QsRUFBc0UsT0FBdEUsQ0FBOEUsbUJBQVc7QUFDdkYsY0FBSSxhQUFhLFFBQVEsUUFBUixDQUFpQixJQUE5QixNQUF3QyxTQUE1QyxFQUF1RDtBQUNyRCxrQkFBTSxJQUFJLEtBQUosb0NBQTJDLGNBQTNDLENBQU47QUFDRDtBQUNGLFNBSkQ7QUFLRDs7QUFFRCxVQUFJLFFBQVEsSUFBUixLQUFpQixtQkFBckIsRUFBMEM7QUFDeEMsZUFBTyxRQUFRLFFBQVIsQ0FBaUIsR0FBakIsQ0FBcUI7QUFBQSxpQkFBVyxNQUFLLEdBQUwsQ0FBUyxPQUFULEVBQWtCLEtBQWxCLENBQVg7QUFBQSxTQUFyQixDQUFQO0FBQ0Q7O0FBRUQsZ0JBQVUsS0FBSyxLQUFMLENBQVcsS0FBSyxTQUFMLENBQWUsT0FBZixDQUFYLENBQVY7O0FBRUEsY0FBUSxFQUFSLEdBQWEsUUFBUSxFQUFSLElBQWMsS0FBM0I7O0FBRUEsVUFBSSxJQUFJLEtBQUosQ0FBVSxHQUFWLENBQWMsUUFBUSxFQUF0QixNQUE4QixTQUFsQyxFQUE2QztBQUMzQyxZQUFJLFFBQVEsYUFBYSxRQUFRLFFBQVIsQ0FBaUIsSUFBOUIsQ0FBWjs7QUFFQSxZQUFJLGtCQUFrQixJQUFJLEtBQUosQ0FBVSxHQUFWLEVBQWUsT0FBZixDQUF0QjtBQUNBLFlBQUksS0FBSixDQUFVLEdBQVYsQ0FBYyxlQUFkO0FBQ0QsT0FMRCxNQU1LO0FBQ0gsWUFBSSxtQkFBa0IsSUFBSSxLQUFKLENBQVUsR0FBVixDQUFjLFFBQVEsRUFBdEIsQ0FBdEI7QUFDQSx5QkFBZ0IsVUFBaEIsR0FBNkIsUUFBUSxVQUFyQztBQUNEOztBQUVELFVBQUksS0FBSixDQUFVLE1BQVY7QUFDQSxhQUFPLFFBQVEsRUFBZjtBQUNELEtBbERJO0FBbURMLFNBQUssYUFBVSxFQUFWLEVBQWM7QUFDakIsVUFBSSxVQUFVLElBQUksS0FBSixDQUFVLEdBQVYsQ0FBYyxFQUFkLENBQWQ7QUFDQSxVQUFJLE9BQUosRUFBYTtBQUNYLGVBQU8sUUFBUSxTQUFSLEVBQVA7QUFDRDtBQUNGLEtBeERJO0FBeURMLFlBQVEsa0JBQVc7QUFDakIsYUFBTztBQUNMLGNBQU0sbUJBREQ7QUFFTCxrQkFBVSxJQUFJLEtBQUosQ0FBVSxNQUFWLEdBQW1CLEdBQW5CLENBQXVCO0FBQUEsaUJBQVcsUUFBUSxTQUFSLEVBQVg7QUFBQSxTQUF2QjtBQUZMLE9BQVA7QUFJRCxLQTlESTtBQStETCxZQUFRLGlCQUFTLEVBQVQsRUFBYTtBQUNuQixVQUFJLEtBQUosQ0FBVSxNQUFWLENBQWlCLENBQUMsRUFBRCxDQUFqQjtBQUNBLFVBQUksS0FBSixDQUFVLE1BQVY7QUFDRCxLQWxFSTtBQW1FTCxlQUFXLHFCQUFXO0FBQ3BCLFVBQUksS0FBSixDQUFVLE1BQVYsQ0FBaUIsSUFBSSxLQUFKLENBQVUsTUFBVixHQUFtQixHQUFuQixDQUF1QjtBQUFBLGVBQVcsUUFBUSxFQUFuQjtBQUFBLE9BQXZCLENBQWpCO0FBQ0EsVUFBSSxLQUFKLENBQVUsTUFBVjtBQUNELEtBdEVJO0FBdUVMLGdCQUFZLG9CQUFTLElBQVQsRUFBZSxJQUFmLEVBQXFCO0FBQy9CLFVBQUksTUFBSixDQUFXLFVBQVgsQ0FBc0IsSUFBdEIsRUFBNEIsSUFBNUI7QUFDRCxLQXpFSTtBQTBFTCxXQUFPLGlCQUFXO0FBQ2hCLFVBQUksTUFBSixDQUFXLElBQVgsQ0FBZ0IsT0FBaEI7QUFDRDtBQTVFSSxHQUFQO0FBOEVELENBaEZEOzs7OztBQ2ZBLElBQUksY0FBYyxRQUFRLG9CQUFSLENBQWxCO0FBQ0EsSUFBSSw0QkFBNEIsUUFBUSxtQ0FBUixDQUFoQztBQUNBLElBQUksVUFBVSxRQUFRLGdCQUFSLENBQWQ7O0FBRUEsSUFBSSxRQUFRO0FBQ1YsbUJBQWlCLFFBQVEsdUJBQVIsQ0FEUDtBQUVWLG1CQUFpQixRQUFRLHVCQUFSLENBRlA7QUFHVixnQkFBYyxRQUFRLG9CQUFSLENBSEo7QUFJVixzQkFBb0IsUUFBUSwwQkFBUixDQUpWO0FBS1Ysa0JBQWdCLFFBQVEsc0JBQVI7QUFMTixDQUFaOztBQVFBLE9BQU8sT0FBUCxHQUFpQixVQUFTLEdBQVQsRUFBYzs7QUFFN0IsTUFBSSxnQkFBZ0I7QUFDbEIsWUFBUTtBQURVLEdBQXBCOztBQUlBLE1BQUksU0FBUyxFQUFiO0FBQ0EsTUFBSSxtQkFBa0IsZUFBdEI7QUFDQSxNQUFJLGNBQWMsWUFBWSxNQUFNLGFBQU4sQ0FBb0IsR0FBcEIsQ0FBWixFQUFzQyxHQUF0QyxDQUFsQjs7QUFFQSxTQUFPLElBQVAsR0FBYyxVQUFTLEtBQVQsRUFBZ0I7QUFDNUIsUUFBSSxRQUFRLGFBQVIsRUFBdUI7QUFDekIsYUFBTyxNQUFNLEtBRFk7QUFFekIsWUFBTSxJQUFJLElBQUosR0FBVyxPQUFYO0FBRm1CLEtBQXZCLENBQUosRUFHSTtBQUNGLFlBQU0sYUFBTixDQUFvQixlQUFwQjtBQUNELEtBTEQsTUFNSztBQUNILFVBQUksRUFBSixDQUFPLFFBQVAsQ0FBZ0IsRUFBQyxPQUFPLE1BQVIsRUFBaEI7QUFDQSxrQkFBWSxJQUFaLENBQWlCLEtBQWpCO0FBQ0Q7QUFDRixHQVhEOztBQWFBLFNBQU8sU0FBUCxHQUFtQixVQUFTLEtBQVQsRUFBZ0I7QUFDakMsUUFBSSxjQUFjLE1BQWxCLEVBQTBCO0FBQ3hCLGFBQU8sSUFBUCxDQUFZLEtBQVo7QUFDRCxLQUZELE1BR0s7QUFDSCxVQUFJLFNBQVMsMEJBQTBCLEtBQTFCLEVBQWlDLEdBQWpDLENBQWI7QUFDQSxZQUFNLGFBQU4sR0FBc0IsTUFBdEI7QUFDQSxrQkFBWSxTQUFaLENBQXNCLEtBQXRCO0FBQ0Q7QUFDRixHQVREOztBQVdBLFNBQU8sU0FBUCxHQUFtQixVQUFTLEtBQVQsRUFBZ0I7QUFDakMsb0JBQWdCO0FBQ2QsY0FBUSxJQURNO0FBRWQsWUFBTSxJQUFJLElBQUosR0FBVyxPQUFYLEVBRlE7QUFHZCxhQUFPLE1BQU07QUFIQyxLQUFoQjs7QUFNQSxRQUFJLFNBQVMsMEJBQTBCLEtBQTFCLEVBQWlDLEdBQWpDLENBQWI7QUFDQSxVQUFNLGFBQU4sR0FBc0IsTUFBdEI7QUFDQSxnQkFBWSxTQUFaLENBQXNCLEtBQXRCO0FBQ0QsR0FWRDs7QUFZQSxTQUFPLE9BQVAsR0FBaUIsVUFBUyxLQUFULEVBQWdCO0FBQy9CLGtCQUFjLE1BQWQsR0FBdUIsS0FBdkI7QUFDQSxRQUFJLFNBQVMsMEJBQTBCLEtBQTFCLEVBQWlDLEdBQWpDLENBQWI7QUFDQSxVQUFNLGFBQU4sR0FBc0IsTUFBdEI7O0FBRUEsUUFBSSxRQUFRLGFBQVIsRUFBdUI7QUFDekIsYUFBTyxNQUFNLEtBRFk7QUFFekIsWUFBTSxJQUFJLElBQUosR0FBVyxPQUFYO0FBRm1CLEtBQXZCLENBQUosRUFHSTtBQUNGLGtCQUFZLEtBQVosQ0FBa0IsS0FBbEI7QUFDRCxLQUxELE1BTUs7QUFDSCxrQkFBWSxPQUFaLENBQW9CLEtBQXBCO0FBQ0Q7QUFFRixHQWZEOztBQWlCQSxTQUFPLEtBQVAsR0FBZSxZQUFXO0FBQ3hCLGdCQUFZLEtBQVo7QUFDRCxHQUZEOztBQUlBLE1BQUksaUJBQWlCLFNBQWpCLGNBQWlCLENBQUMsSUFBRDtBQUFBLFdBQVUsRUFBRSxTQUFTLENBQVQsSUFBZSxRQUFRLEVBQVIsSUFBYyxRQUFRLEVBQXZDLENBQVY7QUFBQSxHQUFyQjs7QUFFQSxTQUFPLE9BQVAsR0FBaUIsVUFBUyxLQUFULEVBQWdCO0FBQy9CLFFBQUksTUFBTSxPQUFOLEtBQWtCLENBQXRCLEVBQXlCO0FBQ3ZCLFlBQU0sY0FBTjtBQUNBLFVBQUksSUFBSixDQUFTLE9BQVQ7QUFDRCxLQUhELE1BSUssSUFBSSxlQUFlLE1BQU0sT0FBckIsQ0FBSixFQUFtQztBQUN0QyxrQkFBWSxPQUFaLENBQW9CLEtBQXBCO0FBQ0QsS0FGSSxNQUdBLElBQUksTUFBTSxPQUFOLEtBQWtCLEVBQXRCLEVBQTBCO0FBQzdCLFVBQUksR0FBSixDQUFRLFVBQVIsQ0FBbUIsWUFBbkI7QUFDRCxLQUZJLE1BR0EsSUFBSSxNQUFNLE9BQU4sS0FBa0IsRUFBdEIsRUFBMEI7QUFDN0IsVUFBSSxHQUFKLENBQVEsVUFBUixDQUFtQixrQkFBbkI7QUFDRCxLQUZJLE1BR0EsSUFBSSxNQUFNLE9BQU4sS0FBa0IsRUFBdEIsRUFBMEI7QUFDN0IsVUFBSSxHQUFKLENBQVEsVUFBUixDQUFtQixjQUFuQjtBQUNEO0FBQ0YsR0FqQkQ7O0FBbUJBLFNBQU8sS0FBUCxHQUFlLFVBQVMsS0FBVCxFQUFnQjtBQUM3QixRQUFJLGVBQWUsTUFBTSxPQUFyQixDQUFKLEVBQW1DO0FBQ2pDLGtCQUFZLEtBQVosQ0FBa0IsS0FBbEI7QUFDRDtBQUNGLEdBSkQ7O0FBTUEsU0FBTyxPQUFQLEdBQWlCLFlBQVc7QUFDMUIsUUFBSSxLQUFKLENBQVUsVUFBVjtBQUNELEdBRkQ7O0FBSUEsTUFBSSxNQUFNO0FBQ1IscUJBQWlCLDJCQUFXO0FBQzFCLGFBQU8sZ0JBQVA7QUFDRCxLQUhPO0FBSVIsdUJBQW1CLDJCQUFTLE9BQVQsRUFBa0IsSUFBbEIsRUFBd0I7QUFDekMsYUFBTyxZQUFZLE1BQVosQ0FBbUIsT0FBbkIsRUFBNEIsSUFBNUIsQ0FBUDtBQUNELEtBTk87QUFPUixnQkFBWSxvQkFBUyxRQUFULEVBQW1CLElBQW5CLEVBQXlCO0FBQ25DLGtCQUFZLElBQVo7QUFDQSxVQUFJLGNBQWMsTUFBTSxRQUFOLENBQWxCO0FBQ0EsVUFBSSxnQkFBZ0IsU0FBcEIsRUFBK0I7QUFDN0IsY0FBTSxJQUFJLEtBQUosQ0FBYSxRQUFiLG1CQUFOO0FBQ0Q7QUFDRCx5QkFBa0IsUUFBbEI7QUFDQSxVQUFJLE9BQU8sWUFBWSxHQUFaLEVBQWlCLElBQWpCLENBQVg7QUFDQSxvQkFBYyxZQUFZLElBQVosRUFBa0IsR0FBbEIsQ0FBZDs7QUFFQSxVQUFJLEdBQUosQ0FBUSxJQUFSLENBQWEsaUJBQWIsRUFBZ0M7QUFDOUIsY0FBTSxRQUR3QjtBQUU5QixjQUFNO0FBRndCLE9BQWhDOztBQUtBLFVBQUksS0FBSixDQUFVLFFBQVY7QUFDQSxVQUFJLEtBQUosQ0FBVSxNQUFWO0FBQ0QsS0F4Qk87QUF5QlIsVUFBTSxjQUFTLElBQVQsRUFBZSxLQUFmLEVBQXNCO0FBQzFCLFVBQUksT0FBTyxJQUFQLENBQUosRUFBa0I7QUFDaEIsZUFBTyxJQUFQLEVBQWEsS0FBYjtBQUNEO0FBQ0YsS0E3Qk87QUE4QlIsdUJBQW1CLDZCQUFXO0FBQzVCLFVBQUksR0FBSixDQUFRLEVBQVIsQ0FBVyxXQUFYLEVBQXdCLE9BQU8sU0FBL0I7O0FBRUEsVUFBSSxHQUFKLENBQVEsRUFBUixDQUFXLFdBQVgsRUFBd0IsT0FBTyxTQUEvQjtBQUNBLFVBQUksR0FBSixDQUFRLEVBQVIsQ0FBVyxTQUFYLEVBQXNCLE9BQU8sT0FBN0I7O0FBRUEsVUFBSSxJQUFJLE9BQUosQ0FBWSxXQUFoQixFQUE2QjtBQUMzQixZQUFJLFNBQUosQ0FBYyxnQkFBZCxDQUErQixTQUEvQixFQUEwQyxPQUFPLE9BQWpEO0FBQ0EsWUFBSSxTQUFKLENBQWMsZ0JBQWQsQ0FBK0IsT0FBL0IsRUFBd0MsT0FBTyxLQUEvQztBQUNEO0FBQ0YsS0F4Q087QUF5Q1IsMEJBQXNCLGdDQUFXO0FBQy9CLFVBQUksR0FBSixDQUFRLEdBQVIsQ0FBWSxXQUFaLEVBQXlCLE9BQU8sU0FBaEM7O0FBRUEsVUFBSSxHQUFKLENBQVEsR0FBUixDQUFZLFdBQVosRUFBeUIsT0FBTyxTQUFoQztBQUNBLFVBQUksR0FBSixDQUFRLEdBQVIsQ0FBWSxTQUFaLEVBQXVCLE9BQU8sT0FBOUI7O0FBRUEsVUFBSSxJQUFJLE9BQUosQ0FBWSxXQUFoQixFQUE2QjtBQUMzQixZQUFJLFNBQUosQ0FBYyxtQkFBZCxDQUFrQyxTQUFsQyxFQUE2QyxPQUFPLE9BQXBEO0FBQ0EsWUFBSSxTQUFKLENBQWMsbUJBQWQsQ0FBa0MsT0FBbEMsRUFBMkMsT0FBTyxLQUFsRDtBQUNEO0FBQ0Y7QUFuRE8sR0FBVjs7QUFzREEsU0FBTyxHQUFQO0FBQ0QsQ0F6SkQ7Ozs7O0FDWkEsSUFBSSxNQUFNLFFBQVEsS0FBUixDQUFWOztBQUVBLElBQUksVUFBVSxTQUFWLE9BQVUsQ0FBUyxHQUFULEVBQWMsT0FBZCxFQUF1QjtBQUNuQyxPQUFLLEdBQUwsR0FBVyxHQUFYO0FBQ0EsT0FBSyxVQUFMLEdBQWtCLFFBQVEsVUFBUixJQUFzQixFQUF4QztBQUNBLE9BQUssV0FBTCxHQUFtQixRQUFRLFFBQVIsQ0FBaUIsV0FBcEM7QUFDQSxPQUFLLFlBQUwsR0FBb0IsSUFBcEI7QUFDQSxPQUFLLEVBQUwsR0FBVSxRQUFRLEVBQVIsSUFBYyxLQUF4QjtBQUNBLE9BQUssSUFBTCxHQUFZLFFBQVEsUUFBUixDQUFpQixJQUE3QjtBQUNELENBUEQ7O0FBU0EsUUFBUSxTQUFSLENBQWtCLE9BQWxCLEdBQTRCLFlBQVc7QUFDckMsT0FBSyxHQUFMLENBQVMsS0FBVCxDQUFlLGNBQWYsQ0FBOEIsS0FBSyxFQUFuQztBQUNELENBRkQ7O0FBSUEsUUFBUSxTQUFSLENBQWtCLGNBQWxCLEdBQW1DLFVBQVMsTUFBVCxFQUFpQjtBQUNsRCxPQUFLLFdBQUwsR0FBbUIsTUFBbkI7QUFDQSxPQUFLLE9BQUw7QUFDRCxDQUhEOztBQUtBLFFBQVEsU0FBUixDQUFrQixjQUFsQixHQUFtQyxZQUFXO0FBQzVDLFNBQU8sS0FBSyxLQUFMLENBQVcsS0FBSyxTQUFMLENBQWUsS0FBSyxXQUFwQixDQUFYLENBQVA7QUFDRCxDQUZEOztBQUlBLFFBQVEsU0FBUixDQUFrQixTQUFsQixHQUE4QixZQUFXO0FBQ3ZDLFNBQU8sS0FBSyxLQUFMLENBQVcsS0FBSyxTQUFMLENBQWU7QUFDL0IsVUFBTSxLQUFLLEVBRG9CO0FBRS9CLFlBQVEsU0FGdUI7QUFHL0Isa0JBQWMsS0FBSyxVQUhZO0FBSS9CLGdCQUFZO0FBQ1YscUJBQWUsS0FBSyxjQUFMLEVBREw7QUFFVixjQUFRLEtBQUs7QUFGSDtBQUptQixHQUFmLENBQVgsQ0FBUDtBQVNELENBVkQ7O0FBWUEsUUFBUSxTQUFSLENBQWtCLFFBQWxCLEdBQTZCLFVBQVMsSUFBVCxFQUFlO0FBQzFDLFNBQU87QUFDTCxZQUFRLFNBREg7QUFFTCxrQkFBYztBQUNaLFlBQU0sS0FBSyxFQURDO0FBRVosY0FBUSxTQUZJO0FBR1osbUJBQWEsS0FBSyxJQUhOO0FBSVosZ0JBQVUsT0FKRTtBQUtaLFlBQU07QUFMTSxLQUZUO0FBU0wsZ0JBQVk7QUFDVixxQkFBZSxLQUFLLGNBQUwsRUFETDtBQUVWLGNBQVEsS0FBSztBQUZIO0FBVFAsR0FBUDtBQWNELENBZkQ7O0FBaUJBLE9BQU8sT0FBUCxHQUFpQixPQUFqQjs7Ozs7QUNyREEsSUFBSSxVQUFVLFFBQVEsV0FBUixDQUFkOztBQUVBLElBQUksYUFBYSxTQUFiLFVBQWEsQ0FBUyxHQUFULEVBQWMsT0FBZCxFQUF1QjtBQUN0QyxVQUFRLElBQVIsQ0FBYSxJQUFiLEVBQW1CLEdBQW5CLEVBQXdCLE9BQXhCO0FBQ0QsQ0FGRDs7QUFJQSxXQUFXLFNBQVgsR0FBdUIsT0FBTyxNQUFQLENBQWMsUUFBUSxTQUF0QixDQUF2Qjs7QUFFQSxXQUFXLFNBQVgsQ0FBcUIsT0FBckIsR0FBK0IsWUFBVztBQUN4QyxTQUFPLEtBQUssV0FBTCxDQUFpQixNQUFqQixHQUEwQixDQUFqQztBQUNELENBRkQ7O0FBSUEsV0FBVyxTQUFYLENBQXFCLGFBQXJCLEdBQXFDLFVBQVMsSUFBVCxFQUFlLEdBQWYsRUFBb0IsR0FBcEIsRUFBeUI7QUFDNUQsT0FBSyxPQUFMO0FBQ0EsT0FBSyxjQUFMLEdBQXNCLEVBQXRCO0FBQ0EsTUFBSSxLQUFLLFNBQVMsSUFBVCxFQUFlLEVBQWYsQ0FBVDtBQUNBLE9BQUssV0FBTCxDQUFpQixNQUFqQixDQUF3QixFQUF4QixFQUE0QixDQUE1QixFQUErQixDQUFDLEdBQUQsRUFBTSxHQUFOLENBQS9CO0FBQ0QsQ0FMRDs7QUFPQSxXQUFXLFNBQVgsQ0FBcUIsYUFBckIsR0FBcUMsVUFBUyxJQUFULEVBQWU7QUFDbEQsTUFBSSxLQUFLLFNBQVMsSUFBVCxFQUFlLEVBQWYsQ0FBVDtBQUNBLFNBQU8sS0FBSyxLQUFMLENBQVcsS0FBSyxTQUFMLENBQWUsS0FBSyxXQUFMLENBQWlCLEVBQWpCLENBQWYsQ0FBWCxDQUFQO0FBQ0QsQ0FIRDs7QUFLQSxXQUFXLFNBQVgsQ0FBcUIsZ0JBQXJCLEdBQXdDLFVBQVMsSUFBVCxFQUFlO0FBQ3JELE9BQUssT0FBTDtBQUNBLE9BQUssV0FBTCxDQUFpQixNQUFqQixDQUF3QixTQUFTLElBQVQsRUFBZSxFQUFmLENBQXhCLEVBQTRDLENBQTVDO0FBQ0QsQ0FIRDs7QUFLQSxXQUFXLFNBQVgsQ0FBcUIsZ0JBQXJCLEdBQXdDLFVBQVMsSUFBVCxFQUFlLEdBQWYsRUFBb0IsR0FBcEIsRUFBeUI7QUFDL0QsTUFBSSxLQUFLLFNBQVMsSUFBVCxFQUFlLEVBQWYsQ0FBVDtBQUNBLE9BQUssV0FBTCxDQUFpQixFQUFqQixJQUF1QixDQUFDLEdBQUQsRUFBTSxHQUFOLENBQXZCO0FBQ0EsT0FBSyxPQUFMO0FBQ0QsQ0FKRDs7QUFNQSxPQUFPLE9BQVAsR0FBaUIsVUFBakI7Ozs7O0FDbkNBLElBQUksVUFBVSxRQUFRLFdBQVIsQ0FBZDs7QUFFQSxJQUFJLFNBQVM7QUFDWCxnQkFBYyxRQUFRLFNBQVIsQ0FESDtBQUVYLHFCQUFtQixRQUFRLGVBQVIsQ0FGUjtBQUdYLGtCQUFnQixRQUFRLFdBQVI7QUFITCxDQUFiOztBQU1BLElBQUksYUFBYSxTQUFiLFVBQWEsQ0FBQyxRQUFELEVBQVcsTUFBWCxFQUFtQixJQUFuQixFQUF5QixHQUF6QixFQUE4QixHQUE5QixFQUFzQztBQUNyRCxNQUFJLFFBQVEsS0FBSyxLQUFMLENBQVcsR0FBWCxDQUFaO0FBQ0EsTUFBSSxNQUFNLFNBQVMsTUFBTSxDQUFOLENBQVQsRUFBbUIsRUFBbkIsQ0FBVjtBQUNBLE1BQUksT0FBTyxNQUFNLEtBQU4sQ0FBWSxDQUFaLEVBQWUsSUFBZixDQUFvQixHQUFwQixDQUFYO0FBQ0EsU0FBTyxTQUFTLEdBQVQsRUFBYyxNQUFkLEVBQXNCLElBQXRCLEVBQTRCLEdBQTVCLEVBQWlDLEdBQWpDLENBQVA7QUFDRCxDQUxEOztBQU9BLElBQUksZUFBZSxTQUFmLFlBQWUsQ0FBUyxHQUFULEVBQWMsT0FBZCxFQUF1QjtBQUN4QyxVQUFRLElBQVIsQ0FBYSxJQUFiLEVBQW1CLEdBQW5CLEVBQXdCLE9BQXhCOztBQUVBLFNBQU8sS0FBSyxXQUFaO0FBQ0EsT0FBSyxLQUFMLEdBQWEsT0FBTyxRQUFRLFFBQVIsQ0FBaUIsSUFBeEIsQ0FBYjtBQUNBLE1BQUksS0FBSyxLQUFMLEtBQWUsU0FBbkIsRUFBOEIsTUFBTSxJQUFJLFNBQUosQ0FBaUIsUUFBUSxRQUFSLENBQWlCLElBQWxDLDBCQUFOO0FBQzlCLE9BQUssUUFBTCxHQUFnQixLQUFLLHFCQUFMLENBQTJCLFFBQVEsUUFBUixDQUFpQixXQUE1QyxDQUFoQjtBQUNELENBUEQ7O0FBU0EsYUFBYSxTQUFiLEdBQXlCLE9BQU8sTUFBUCxDQUFjLFFBQVEsU0FBdEIsQ0FBekI7O0FBRUEsYUFBYSxTQUFiLENBQXVCLHFCQUF2QixHQUErQyxVQUFTLFdBQVQsRUFBc0I7QUFBQTs7QUFDbkUsU0FBTyxZQUFZLEdBQVosQ0FBZ0I7QUFBQSxXQUFVLElBQUksTUFBSyxLQUFULENBQWUsTUFBSyxHQUFwQixFQUF5QjtBQUN4RCxVQUFJLE1BQUssRUFEK0M7QUFFeEQsWUFBTSxTQUZrRDtBQUd4RCxrQkFBWSxFQUg0QztBQUl4RCxnQkFBVTtBQUNSLHFCQUFhLE1BREw7QUFFUixjQUFNLE1BQUssSUFBTCxDQUFVLE9BQVYsQ0FBa0IsT0FBbEIsRUFBMkIsRUFBM0I7QUFGRTtBQUo4QyxLQUF6QixDQUFWO0FBQUEsR0FBaEIsQ0FBUDtBQVNELENBVkQ7O0FBWUEsYUFBYSxTQUFiLENBQXVCLE9BQXZCLEdBQWlDLFlBQVc7QUFDMUMsU0FBTyxLQUFLLFFBQUwsQ0FBYyxLQUFkLENBQW9CO0FBQUEsV0FBSyxFQUFFLE9BQUYsRUFBTDtBQUFBLEdBQXBCLENBQVA7QUFDRCxDQUZEOztBQUlBLGFBQWEsU0FBYixDQUF1QixjQUF2QixHQUF3QyxVQUFTLE1BQVQsRUFBaUI7QUFDdkQsT0FBSyxRQUFMLEdBQWdCLEtBQUsscUJBQUwsQ0FBMkIsTUFBM0IsQ0FBaEI7QUFDQSxPQUFLLE9BQUw7QUFDRCxDQUhEOztBQUtBLGFBQWEsU0FBYixDQUF1QixhQUF2QixHQUF1QyxVQUFTLElBQVQsRUFBZTtBQUNwRCxTQUFPLFdBQVcsS0FBSyxRQUFoQixFQUEwQixlQUExQixFQUEyQyxJQUEzQyxDQUFQO0FBQ0QsQ0FGRDs7QUFJQSxhQUFhLFNBQWIsQ0FBdUIsY0FBdkIsR0FBd0MsWUFBVztBQUNqRCxTQUFPLEtBQUssS0FBTCxDQUFXLEtBQUssU0FBTCxDQUFlLEtBQUssUUFBTCxDQUFjLEdBQWQsQ0FBa0I7QUFBQSxXQUFLLEVBQUUsSUFBRixLQUFXLFNBQVgsR0FBdUIsRUFBRSxjQUFGLEVBQXZCLEdBQTRDLEVBQUUsV0FBbkQ7QUFBQSxHQUFsQixDQUFmLENBQVgsQ0FBUDtBQUNELENBRkQ7O0FBSUEsYUFBYSxTQUFiLENBQXVCLGdCQUF2QixHQUEwQyxVQUFTLElBQVQsRUFBZSxHQUFmLEVBQW9CLEdBQXBCLEVBQXlCO0FBQ2pFLGFBQVcsS0FBSyxRQUFoQixFQUEwQixrQkFBMUIsRUFBOEMsSUFBOUMsRUFBb0QsR0FBcEQsRUFBeUQsR0FBekQ7QUFDRCxDQUZEOztBQUlBLGFBQWEsU0FBYixDQUF1QixhQUF2QixHQUF1QyxVQUFTLElBQVQsRUFBZSxHQUFmLEVBQW9CLEdBQXBCLEVBQXlCO0FBQzlELGFBQVcsS0FBSyxRQUFoQixFQUEwQixlQUExQixFQUEyQyxJQUEzQyxFQUFpRCxHQUFqRCxFQUFzRCxHQUF0RDtBQUNELENBRkQ7O0FBSUEsYUFBYSxTQUFiLENBQXVCLGdCQUF2QixHQUEwQyxVQUFTLElBQVQsRUFBZTtBQUN2RCxhQUFXLEtBQUssUUFBaEIsRUFBMEIsa0JBQTFCLEVBQThDLElBQTlDO0FBQ0QsQ0FGRDs7QUFJQSxPQUFPLE9BQVAsR0FBaUIsWUFBakI7Ozs7O0FDbkVBLElBQUksVUFBVSxRQUFRLFdBQVIsQ0FBZDs7QUFFQSxJQUFJLFFBQVEsU0FBUixLQUFRLENBQVMsR0FBVCxFQUFjLE9BQWQsRUFBdUI7QUFDakMsVUFBUSxJQUFSLENBQWEsSUFBYixFQUFtQixHQUFuQixFQUF3QixPQUF4QjtBQUNELENBRkQ7O0FBSUEsTUFBTSxTQUFOLEdBQWtCLE9BQU8sTUFBUCxDQUFjLFFBQVEsU0FBdEIsQ0FBbEI7O0FBRUEsTUFBTSxTQUFOLENBQWdCLE9BQWhCLEdBQTBCLFlBQVc7QUFDbkMsU0FBTyxPQUFPLEtBQUssV0FBTCxDQUFpQixDQUFqQixDQUFQLEtBQStCLFFBQXRDO0FBQ0QsQ0FGRDs7QUFJQSxNQUFNLFNBQU4sQ0FBZ0IsZ0JBQWhCLEdBQW1DLFVBQVMsSUFBVCxFQUFlLEdBQWYsRUFBb0IsR0FBcEIsRUFBeUI7QUFDMUQsT0FBSyxXQUFMLEdBQW1CLENBQUMsR0FBRCxFQUFNLEdBQU4sQ0FBbkI7QUFDQSxPQUFLLE9BQUw7QUFDRCxDQUhEOztBQUtBLE1BQU0sU0FBTixDQUFnQixhQUFoQixHQUFnQyxZQUFXO0FBQ3pDLFNBQU8sS0FBSyxjQUFMLEVBQVA7QUFDRCxDQUZEOztBQUlBLE9BQU8sT0FBUCxHQUFpQixLQUFqQjs7Ozs7QUNyQkEsSUFBSSxVQUFVLFFBQVEsV0FBUixDQUFkOztBQUVBLElBQUksVUFBVSxTQUFWLE9BQVUsQ0FBUyxHQUFULEVBQWMsT0FBZCxFQUF1QjtBQUNuQyxVQUFRLElBQVIsQ0FBYSxJQUFiLEVBQW1CLEdBQW5CLEVBQXdCLE9BQXhCO0FBQ0EsT0FBSyxXQUFMLEdBQW1CLEtBQUssV0FBTCxDQUFpQixHQUFqQixDQUFxQjtBQUFBLFdBQVUsT0FBTyxLQUFQLENBQWEsQ0FBYixFQUFnQixDQUFDLENBQWpCLENBQVY7QUFBQSxHQUFyQixDQUFuQjtBQUNELENBSEQ7O0FBS0EsUUFBUSxTQUFSLEdBQW9CLE9BQU8sTUFBUCxDQUFjLFFBQVEsU0FBdEIsQ0FBcEI7O0FBRUEsUUFBUSxTQUFSLENBQWtCLE9BQWxCLEdBQTRCLFlBQVc7QUFDckMsU0FBTyxLQUFLLFdBQUwsQ0FBaUIsS0FBakIsQ0FBdUIsVUFBUyxJQUFULEVBQWU7QUFDM0MsV0FBTyxLQUFLLE1BQUwsR0FBYyxDQUFyQjtBQUNELEdBRk0sQ0FBUDtBQUdELENBSkQ7O0FBTUEsUUFBUSxTQUFSLENBQWtCLGFBQWxCLEdBQWtDLFVBQVMsSUFBVCxFQUFlLEdBQWYsRUFBb0IsR0FBcEIsRUFBeUI7QUFDekQsT0FBSyxPQUFMO0FBQ0EsTUFBSSxNQUFNLEtBQUssS0FBTCxDQUFXLEdBQVgsRUFBZ0IsR0FBaEIsQ0FBb0I7QUFBQSxXQUFLLFNBQVMsQ0FBVCxFQUFZLEVBQVosQ0FBTDtBQUFBLEdBQXBCLENBQVY7O0FBRUEsTUFBSSxPQUFPLEtBQUssV0FBTCxDQUFpQixJQUFJLENBQUosQ0FBakIsQ0FBWDs7QUFFQSxPQUFLLE1BQUwsQ0FBWSxJQUFJLENBQUosQ0FBWixFQUFvQixDQUFwQixFQUF1QixDQUFDLEdBQUQsRUFBTSxHQUFOLENBQXZCO0FBQ0QsQ0FQRDs7QUFTQSxRQUFRLFNBQVIsQ0FBa0IsZ0JBQWxCLEdBQXFDLFVBQVMsSUFBVCxFQUFlO0FBQ2xELE9BQUssT0FBTDtBQUNBLE1BQUksTUFBTSxLQUFLLEtBQUwsQ0FBVyxHQUFYLEVBQWdCLEdBQWhCLENBQW9CO0FBQUEsV0FBSyxTQUFTLENBQVQsRUFBWSxFQUFaLENBQUw7QUFBQSxHQUFwQixDQUFWO0FBQ0EsTUFBSSxPQUFPLEtBQUssV0FBTCxDQUFpQixJQUFJLENBQUosQ0FBakIsQ0FBWDtBQUNBLE1BQUksSUFBSixFQUFVO0FBQ1IsU0FBSyxNQUFMLENBQVksSUFBSSxDQUFKLENBQVosRUFBb0IsQ0FBcEI7QUFDQSxRQUFJLEtBQUssTUFBTCxHQUFjLENBQWxCLEVBQXFCO0FBQ25CLFdBQUssV0FBTCxDQUFpQixNQUFqQixDQUF3QixJQUFJLENBQUosQ0FBeEIsRUFBZ0MsQ0FBaEM7QUFDRDtBQUNGO0FBQ0YsQ0FWRDs7QUFZQSxRQUFRLFNBQVIsQ0FBa0IsYUFBbEIsR0FBa0MsVUFBUyxJQUFULEVBQWU7QUFDL0MsTUFBSSxNQUFNLEtBQUssS0FBTCxDQUFXLEdBQVgsRUFBZ0IsR0FBaEIsQ0FBb0I7QUFBQSxXQUFLLFNBQVMsQ0FBVCxFQUFZLEVBQVosQ0FBTDtBQUFBLEdBQXBCLENBQVY7QUFDQSxNQUFJLE9BQU8sS0FBSyxXQUFMLENBQWlCLElBQUksQ0FBSixDQUFqQixDQUFYO0FBQ0EsU0FBTyxLQUFLLEtBQUwsQ0FBVyxLQUFLLFNBQUwsQ0FBZSxLQUFLLElBQUksQ0FBSixDQUFMLENBQWYsQ0FBWCxDQUFQO0FBQ0QsQ0FKRDs7QUFNQSxRQUFRLFNBQVIsQ0FBa0IsY0FBbEIsR0FBbUMsWUFBVztBQUM1QyxTQUFPLEtBQUssV0FBTCxDQUFpQixHQUFqQixDQUFxQjtBQUFBLFdBQVUsT0FBTyxNQUFQLENBQWMsQ0FBQyxPQUFPLENBQVAsQ0FBRCxDQUFkLENBQVY7QUFBQSxHQUFyQixDQUFQO0FBQ0QsQ0FGRDs7QUFJQSxRQUFRLFNBQVIsQ0FBa0IsZ0JBQWxCLEdBQXFDLFVBQVMsSUFBVCxFQUFlLEdBQWYsRUFBb0IsR0FBcEIsRUFBeUI7QUFDNUQsT0FBSyxPQUFMO0FBQ0EsTUFBSSxRQUFRLEtBQUssS0FBTCxDQUFXLEdBQVgsQ0FBWjtBQUNBLE1BQUksU0FBUyxTQUFTLE1BQU0sQ0FBTixDQUFULEVBQW1CLEVBQW5CLENBQWI7QUFDQSxNQUFJLFVBQVUsU0FBUyxNQUFNLENBQU4sQ0FBVCxFQUFtQixFQUFuQixDQUFkOztBQUVBLE1BQUksS0FBSyxXQUFMLENBQWlCLE1BQWpCLE1BQTZCLFNBQWpDLEVBQTRDO0FBQzFDLFNBQUssV0FBTCxDQUFpQixNQUFqQixJQUEyQixFQUEzQjtBQUNEOztBQUVELE9BQUssV0FBTCxDQUFpQixNQUFqQixFQUF5QixPQUF6QixJQUFvQyxDQUFDLEdBQUQsRUFBTSxHQUFOLENBQXBDO0FBQ0QsQ0FYRDs7QUFhQSxPQUFPLE9BQVAsR0FBaUIsT0FBakI7Ozs7Ozs7Ozs7O0FDdkRBLElBQUksYUFBYSxRQUFRLGVBQVIsQ0FBakI7QUFDQSxJQUFJLFdBQVcsUUFBUSxhQUFSLENBQWY7O0FBRUEsSUFBSSxZQUFZLE9BQU8sT0FBUCxHQUFpQixVQUFTLE9BQVQsRUFBa0IsV0FBbEIsRUFBK0IsSUFBL0IsRUFBcUMsR0FBckMsRUFBMEMsa0JBQTFDLEVBQStFO0FBQUEsTUFBakIsUUFBaUIseURBQU4sSUFBTTs7O0FBRTlHLE1BQUksUUFBUSxRQUFSLENBQWlCLElBQWpCLENBQXNCLFVBQXRCLENBQWlDLE9BQWpDLENBQUosRUFBK0M7QUFBQTtBQUM3QyxVQUFJLE9BQU8sUUFBUSxRQUFSLENBQWlCLElBQWpCLENBQXNCLE9BQXRCLENBQThCLE9BQTlCLEVBQXVDLEVBQXZDLENBQVg7QUFDQTtBQUFBLFdBQU8sUUFBUSxRQUFSLENBQWlCLFdBQWpCLENBQTZCLE9BQTdCLENBQXFDLFVBQUMsTUFBRCxFQUFTLENBQVQsRUFBZTtBQUN6RCxjQUFJLElBQUk7QUFDTixrQkFBTSxTQURBO0FBRU4sd0JBQVksUUFBUSxVQUZkO0FBR04sc0JBQVU7QUFDUixvQkFBTSxJQURFO0FBRVIsMkJBQWE7QUFGTDtBQUhKLFdBQVI7QUFRQSxvQkFBVSxDQUFWLEVBQWEsV0FBYixFQUEwQixJQUExQixFQUFnQyxHQUFoQyxFQUFxQyxrQkFBckMsT0FBNEQsQ0FBNUQ7QUFDRCxTQVZNO0FBQVA7QUFGNkM7O0FBQUE7QUFhOUMsR0FiRCxNQWNLLElBQUksUUFBUSxRQUFSLENBQWlCLElBQWpCLEtBQTBCLE9BQTlCLEVBQXVDO0FBQzFDLFdBQU8sS0FBSyxTQUFTLFFBQVEsVUFBUixDQUFtQixFQUE1QixFQUFnQyxRQUFRLFFBQVIsQ0FBaUIsV0FBakQsRUFBOEQsUUFBOUQsRUFBd0UsbUJBQW1CLE9BQW5CLENBQTJCLFFBQTNCLElBQXVDLENBQUMsQ0FBaEgsQ0FBTCxDQUFQO0FBQ0Q7O0FBRUQsTUFBSSxZQUFZLElBQWhCO0FBQ0EsTUFBSSxZQUFZLElBQWhCO0FBQ0EsTUFBSSxjQUFjLElBQWxCO0FBQ0EsT0FBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLFFBQVEsUUFBUixDQUFpQixXQUFqQixDQUE2QixNQUFqRCxFQUF5RCxHQUF6RCxFQUE4RDtBQUM1RCxRQUFJLFFBQVEsUUFBUixDQUFpQixJQUFqQixLQUEwQixTQUE5QixFQUF5QztBQUN2QyxVQUFJLE9BQU8sUUFBUSxRQUFSLENBQWlCLFdBQWpCLENBQTZCLENBQTdCLENBQVg7QUFDQSxXQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksS0FBSyxNQUFMLEdBQWMsQ0FBbEMsRUFBcUMsR0FBckMsRUFBMEM7QUFDeEMsWUFBSSxRQUFRLEtBQUssQ0FBTCxDQUFaO0FBQ0EsWUFBSSxhQUFhLFdBQWMsUUFBZCxTQUEwQixDQUExQixTQUErQixDQUEvQixHQUF3QyxDQUF4QyxTQUE2QyxDQUE5RDs7QUFFQSxvQkFBWSxTQUFTLFFBQVEsVUFBUixDQUFtQixFQUE1QixFQUFnQyxLQUFoQyxFQUF1QyxVQUF2QyxFQUFtRCxtQkFBbUIsT0FBbkIsQ0FBMkIsVUFBM0IsSUFBeUMsQ0FBQyxDQUE3RixDQUFaO0FBQ0Esc0JBQWMsY0FBYyxXQUFkLEdBQTRCLFNBQTFDO0FBQ0EsYUFBSyxTQUFMOztBQUVBLFlBQUksSUFBSSxDQUFKLElBQVMsV0FBYixFQUEwQjtBQUN4QixlQUFLLFdBQVcsUUFBUSxVQUFSLENBQW1CLEVBQTlCLEVBQWtDLFNBQWxDLEVBQTZDLFNBQTdDLEVBQXdELEdBQXhELENBQUw7QUFDRDs7QUFFRCxvQkFBWSxTQUFaO0FBQ0Q7QUFDRCxVQUFJLFdBQUosRUFBaUI7QUFDZixhQUFLLFdBQVcsUUFBUSxVQUFSLENBQW1CLEVBQTlCLEVBQWtDLFNBQWxDLEVBQTZDLFdBQTdDLEVBQTBELEdBQTFELENBQUw7QUFDRDtBQUNGLEtBbkJELE1Bb0JLO0FBQ0gsVUFBSSxTQUFRLFFBQVEsUUFBUixDQUFpQixXQUFqQixDQUE2QixDQUE3QixDQUFaO0FBQ0EsVUFBSSxjQUFhLFdBQVcsV0FBVyxHQUFYLEdBQWlCLENBQTVCLEdBQWdDLEtBQUssQ0FBdEQ7QUFDQSxrQkFBWSxTQUFTLFFBQVEsVUFBUixDQUFtQixFQUE1QixFQUFnQyxNQUFoQyxFQUF1QyxXQUF2QyxFQUFtRCxtQkFBbUIsT0FBbkIsQ0FBMkIsV0FBM0IsSUFBeUMsQ0FBQyxDQUE3RixDQUFaO0FBQ0EsV0FBSyxTQUFMO0FBQ0EsVUFBSSxJQUFJLENBQUosSUFBUyxXQUFiLEVBQTBCO0FBQ3hCLGFBQUssV0FBVyxRQUFRLFVBQVIsQ0FBbUIsRUFBOUIsRUFBa0MsU0FBbEMsRUFBNkMsU0FBN0MsRUFBd0QsR0FBeEQsQ0FBTDtBQUNEO0FBQ0Qsa0JBQVksU0FBWjtBQUNEO0FBQ0Y7QUFDRixDQXZERDs7Ozs7QUNQQSxPQUFPLE9BQVAsR0FBaUI7QUFDZixnQkFBYyxzQkFBUyxJQUFULEVBQWU7QUFDM0IsV0FBTyxVQUFTLENBQVQsRUFBWTtBQUNqQixVQUFJLGdCQUFnQixFQUFFLGFBQXRCO0FBQ0EsVUFBSSxhQUFKLEVBQW1CO0FBQ2pCLGVBQU8sY0FBYyxVQUFkLENBQXlCLElBQXpCLEtBQWtDLElBQXpDO0FBQ0QsT0FGRCxNQUdLO0FBQ0gsZUFBTyxLQUFQO0FBQ0Q7QUFDRixLQVJEO0FBU0QsR0FYYztBQVlmLGFBQVcsbUJBQVMsQ0FBVCxFQUFZO0FBQ3JCLFdBQU8sRUFBRSxhQUFGLEtBQW9CLFNBQTNCO0FBQ0QsR0FkYztBQWVmLGFBQVcsbUJBQVMsQ0FBVCxFQUFZO0FBQ3JCLFdBQU8sRUFBRSxhQUFGLEtBQW9CLFNBQXBCLElBQWlDLEVBQUUsYUFBRixDQUFnQixVQUFoQixDQUEyQixJQUEzQixLQUFvQyxTQUE1RTtBQUNELEdBakJjO0FBa0JmLGVBQWEscUJBQVMsQ0FBVCxFQUFZO0FBQ3ZCLFdBQU8sRUFBRSxhQUFGLENBQWdCLFFBQWhCLEtBQTZCLElBQXBDO0FBQ0QsR0FwQmM7QUFxQmYsZUFBYSxxQkFBUyxDQUFULEVBQVk7QUFDdkIsV0FBTyxFQUFFLE9BQUYsS0FBYyxFQUFyQjtBQUNELEdBdkJjO0FBd0JmLGNBQVksb0JBQVMsQ0FBVCxFQUFZO0FBQ3RCLFdBQU8sRUFBRSxPQUFGLEtBQWMsRUFBckI7QUFDRDtBQTFCYyxDQUFqQjs7Ozs7QUNBQSxPQUFPLE9BQVAsR0FBaUIsVUFBUyxDQUFULEVBQVksQ0FBWixFQUFlO0FBQzVCLFFBQUksSUFBSSxFQUFFLENBQUYsR0FBTSxFQUFFLENBQWhCO1FBQW1CLElBQUksRUFBRSxDQUFGLEdBQU0sRUFBRSxDQUEvQjtBQUNBLFdBQU8sS0FBSyxJQUFMLENBQVcsSUFBSSxDQUFMLEdBQVcsSUFBSSxDQUF6QixDQUFQO0FBQ0gsQ0FIRDs7Ozs7QUNBQSxJQUFJLE9BQU8sUUFBUSxXQUFSLENBQVg7O0FBRUEsSUFBSSxRQUFRLENBQUMsU0FBRCxFQUFZLFVBQVosRUFBd0IsUUFBeEIsQ0FBWjs7QUFFQSxJQUFJLHFCQUFxQjtBQUN2QixhQUFXLENBRFk7QUFFdkIsV0FBUyxDQUZjO0FBR3ZCLGdCQUFjO0FBSFMsQ0FBekI7O0FBTUEsSUFBTSxPQUFPLFNBQVAsSUFBTyxDQUFDLENBQUQsRUFBSSxDQUFKLEVBQVU7QUFDckIsTUFBSSxRQUFRLG1CQUFtQixFQUFFLFFBQUYsQ0FBVyxJQUE5QixJQUFzQyxtQkFBbUIsRUFBRSxRQUFGLENBQVcsSUFBOUIsQ0FBbEQ7O0FBRUEsTUFBSSxVQUFVLENBQVYsSUFBZSxFQUFFLFFBQUYsQ0FBVyxJQUFYLEtBQW9CLFNBQXZDLEVBQWtEO0FBQ2hELFdBQU8sRUFBRSxJQUFGLEdBQVMsRUFBRSxJQUFsQjtBQUNELEdBRkQsTUFHSztBQUNILFdBQU8sS0FBUDtBQUNEO0FBQ0YsQ0FURDs7QUFXQSxPQUFPLE9BQVAsR0FBaUIsVUFBUyxLQUFULEVBQWdCLEdBQWhCLEVBQXFCOztBQUVwQyxNQUFJLFdBQVcsRUFBZjtBQUNBLE1BQUksV0FBVyxJQUFJLEdBQUosQ0FBUSxxQkFBUixDQUE4QixDQUFDLENBQUMsTUFBTSxLQUFOLENBQVksQ0FBWixHQUFnQixRQUFqQixFQUEyQixNQUFNLEtBQU4sQ0FBWSxDQUFaLEdBQWdCLFFBQTNDLENBQUQsRUFBdUQsQ0FBQyxNQUFNLEtBQU4sQ0FBWSxDQUFaLEdBQWdCLFFBQWpCLEVBQTJCLE1BQU0sS0FBTixDQUFZLENBQVosR0FBZ0IsUUFBM0MsQ0FBdkQsQ0FBOUIsRUFBNEksRUFBNUksQ0FBZjs7QUFFQSxhQUFXLFNBQVMsTUFBVCxDQUFnQixVQUFTLE9BQVQsRUFBa0I7QUFDM0MsUUFBSSxPQUFPLFFBQVEsVUFBUixDQUFtQixJQUE5QjtBQUNBLFdBQU8sTUFBTSxPQUFOLENBQWMsSUFBZCxNQUF3QixDQUFDLENBQWhDO0FBQ0QsR0FIVSxFQUdSLEdBSFEsQ0FHSixVQUFTLE9BQVQsRUFBa0I7QUFDdkIsUUFBSSxRQUFRLFFBQVIsQ0FBaUIsSUFBakIsS0FBMEIsU0FBOUIsRUFBeUM7QUFDdkMsY0FBUSxJQUFSLEdBQWUsS0FBSztBQUNsQixjQUFNLFNBRFk7QUFFbEIsa0JBQVUsRUFGUTtBQUdsQixrQkFBVSxRQUFRO0FBSEEsT0FBTCxDQUFmO0FBS0Q7QUFDRCxXQUFPLE9BQVA7QUFDRCxHQVpVLENBQVg7O0FBY0EsV0FBUyxJQUFULENBQWMsSUFBZDs7QUFFQSxTQUFPLFFBQVA7QUFDRCxDQXRCRDs7Ozs7QUNyQkEsSUFBSSxhQUFhLFFBQVEsZUFBUixDQUFqQjs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsU0FBUyx5QkFBVCxDQUFtQyxLQUFuQyxFQUEwQyxHQUExQyxFQUErQztBQUM5RCxNQUFJLFdBQVcsV0FBVyxLQUFYLEVBQWtCLEdBQWxCLENBQWY7O0FBRUEsTUFBSSxTQUFTLENBQVQsQ0FBSixFQUFpQjtBQUNmLFFBQUksRUFBSixDQUFPLFFBQVAsQ0FBZ0I7QUFDZCxlQUFTLFNBQVMsQ0FBVCxFQUFZLFVBQVosQ0FBdUIsSUFEbEI7QUFFZCxhQUFPO0FBRk8sS0FBaEI7QUFJRCxHQUxELE1BTUs7QUFDSCxRQUFJLEVBQUosQ0FBTyxRQUFQLENBQWdCO0FBQ2QsYUFBTztBQURPLEtBQWhCO0FBR0Q7O0FBRUQsU0FBTyxTQUFTLENBQVQsQ0FBUDtBQUNELENBaEJEOzs7OztBQ0ZBLElBQUksb0JBQW9CLFFBQVEsc0JBQVIsQ0FBeEI7O0FBRUEsSUFBTSxpQkFBaUIsQ0FBdkI7QUFDQSxJQUFNLFlBQVksRUFBbEI7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLFNBQVMsT0FBVCxDQUFpQixLQUFqQixFQUF3QixHQUF4QixFQUE0QjtBQUMzQyxRQUFNLEtBQU4sR0FBYyxNQUFNLEtBQU4sSUFBZSxJQUFJLEtBQWpDO0FBQ0EsUUFBTSxJQUFOLEdBQWEsTUFBTSxJQUFOLElBQWMsSUFBSSxJQUEvQjtBQUNBLE1BQUksZUFBZSxrQkFBa0IsTUFBTSxLQUF4QixFQUErQixJQUFJLEtBQW5DLENBQW5CO0FBQ0EsU0FBTyxlQUFlLGNBQWYsSUFBa0MsZUFBZSxTQUFmLElBQTZCLElBQUksSUFBSixHQUFXLE1BQU0sSUFBbEIsR0FBMEIsR0FBL0Y7QUFDRCxDQUxEOzs7OztBQ0xBLElBQUksY0FBYyxTQUFkLFdBQWMsQ0FBUyxJQUFULEVBQWUsV0FBZixFQUE0Qjs7QUFFNUMsTUFBSSxXQUFXO0FBQ2IsVUFBTSxFQURPO0FBRWIsV0FBTyxFQUZNO0FBR2IsaUJBQWEsRUFIQTtBQUliLGVBQVcsRUFKRTtBQUtiLGVBQVcsRUFMRTtBQU1iLGFBQVMsRUFOSTtBQU9iLGFBQVMsRUFQSTtBQVFiLFdBQU8sRUFSTTtBQVNiLFdBQU87QUFUTSxHQUFmOztBQVlBLE1BQUksTUFBTTtBQUNSLFFBQUksWUFBUyxLQUFULEVBQWdCLFFBQWhCLEVBQTBCLEVBQTFCLEVBQThCO0FBQ2hDLFVBQUksU0FBUyxLQUFULE1BQW9CLFNBQXhCLEVBQW1DO0FBQ2pDLGNBQU0sSUFBSSxLQUFKLDBCQUFpQyxLQUFqQyxDQUFOO0FBQ0Q7QUFDRCxlQUFTLEtBQVQsRUFBZ0IsSUFBaEIsQ0FBcUI7QUFDbkIsa0JBQVUsUUFEUztBQUVuQixZQUFJO0FBRmUsT0FBckI7QUFJRCxLQVRPO0FBVVIsU0FBSyxhQUFTLEtBQVQsRUFBZ0IsUUFBaEIsRUFBMEIsRUFBMUIsRUFBOEI7QUFDakMsZUFBUyxLQUFULElBQWtCLFNBQVMsS0FBVCxFQUFnQixNQUFoQixDQUF1QixtQkFBVztBQUNsRCxlQUFPLFFBQVEsUUFBUixLQUFxQixRQUFyQixJQUFpQyxRQUFRLEVBQVIsS0FBZSxFQUF2RDtBQUNELE9BRmlCLENBQWxCO0FBR0QsS0FkTztBQWVSLFVBQU0sY0FBUyxLQUFULEVBQWdCLE9BQWhCLEVBQXlCO0FBQzdCLFVBQUksV0FBVyxZQUFZLE1BQVosQ0FBbUIsZUFBbkIsRUFBZjtBQUNBLGtCQUFZLEdBQVosQ0FBZ0IsSUFBaEIsV0FBNkIsUUFBN0IsU0FBeUMsS0FBekMsRUFBa0QsT0FBbEQ7QUFDRCxLQWxCTztBQW1CUixZQUFRLGdCQUFTLEVBQVQsRUFBYTtBQUNuQixrQkFBWSxLQUFaLENBQWtCLGNBQWxCLENBQWlDLEVBQWpDO0FBQ0Q7QUFyQk8sR0FBVjs7QUF3QkEsTUFBSSxXQUFXLFNBQVgsUUFBVyxDQUFVLFNBQVYsRUFBcUIsS0FBckIsRUFBNEI7QUFDekMsUUFBSSxVQUFVLFNBQVMsU0FBVCxDQUFkO0FBQ0EsUUFBSSxVQUFVLFFBQVEsTUFBdEI7QUFDQSxXQUFPLFNBQVAsRUFBa0I7QUFDaEIsVUFBSSxTQUFTLFFBQVEsT0FBUixDQUFiO0FBQ0EsVUFBSSxPQUFPLFFBQVAsQ0FBZ0IsS0FBaEIsQ0FBSixFQUE0QjtBQUMxQixlQUFPLEVBQVAsQ0FBVSxJQUFWLENBQWUsR0FBZixFQUFvQixLQUFwQjtBQUNBLG9CQUFZLEtBQVosQ0FBa0IsTUFBbEI7QUFDQTtBQUNEO0FBQ0Y7QUFDRixHQVhEOztBQWFBLE9BQUssS0FBTCxDQUFXLElBQVgsQ0FBZ0IsR0FBaEI7O0FBRUEsU0FBTztBQUNMLFlBQVEsS0FBSyxNQUFMLElBQWUsVUFBUyxPQUFULEVBQWtCO0FBQUMsYUFBTyxPQUFQO0FBQWlCLEtBRHREO0FBRUwsVUFBTSxLQUFLLElBQUwsSUFBYSxZQUFXLENBQUUsQ0FGM0I7QUFHTCxVQUFNLGNBQVMsS0FBVCxFQUFnQjtBQUNwQixlQUFTLE1BQVQsRUFBaUIsS0FBakI7QUFDRCxLQUxJO0FBTUwsV0FBTyxlQUFTLEtBQVQsRUFBZ0I7QUFDckIsZUFBUyxPQUFULEVBQWtCLEtBQWxCO0FBQ0QsS0FSSTtBQVNMLGVBQVcsbUJBQVMsS0FBVCxFQUFnQjtBQUN6QixlQUFTLFdBQVQsRUFBc0IsS0FBdEI7QUFDRCxLQVhJO0FBWUwsZUFBVyxtQkFBUyxLQUFULEVBQWdCO0FBQ3pCLGVBQVMsV0FBVCxFQUFzQixLQUF0QjtBQUNELEtBZEk7QUFlTCxhQUFTLGlCQUFTLEtBQVQsRUFBZ0I7QUFDdkIsZUFBUyxTQUFULEVBQW9CLEtBQXBCO0FBQ0QsS0FqQkk7QUFrQkwsYUFBUyxpQkFBUyxLQUFULEVBQWdCO0FBQ3ZCLGVBQVMsU0FBVCxFQUFvQixLQUFwQjtBQUNELEtBcEJJO0FBcUJMLFdBQU8sZUFBUyxLQUFULEVBQWdCO0FBQ3JCLGVBQVMsT0FBVCxFQUFrQixLQUFsQjtBQUNELEtBdkJJO0FBd0JMLFdBQU8sZUFBUyxLQUFULEVBQWdCO0FBQ3JCLGVBQVMsT0FBVCxFQUFrQixLQUFsQjtBQUNEO0FBMUJJLEdBQVA7QUE0QkQsQ0FqRkQ7O0FBbUZBLE9BQU8sT0FBUCxHQUFpQixXQUFqQjs7Ozs7QUNuRkEsT0FBTyxPQUFQLEdBQWlCLFlBQVc7QUFDMUIsTUFBSSxPQUFPLE9BQU8sTUFBZCxLQUF5QixVQUE3QixFQUF5QztBQUN2QyxLQUFDLFlBQVk7QUFDWCxhQUFPLE1BQVAsR0FBZ0IsVUFBVSxNQUFWLEVBQWtCO0FBQ2hDLFlBQUksV0FBVyxTQUFYLElBQXdCLFdBQVcsSUFBdkMsRUFBNkM7QUFDM0MsZ0JBQU0sSUFBSSxTQUFKLENBQWMsNENBQWQsQ0FBTjtBQUNEOztBQUVELFlBQUksU0FBUyxPQUFPLE1BQVAsQ0FBYjtBQUNBLGFBQUssSUFBSSxRQUFRLENBQWpCLEVBQW9CLFFBQVEsVUFBVSxNQUF0QyxFQUE4QyxPQUE5QyxFQUF1RDtBQUNyRCxjQUFJLFNBQVMsVUFBVSxLQUFWLENBQWI7QUFDQSxjQUFJLFdBQVcsU0FBWCxJQUF3QixXQUFXLElBQXZDLEVBQTZDO0FBQzNDLGlCQUFLLElBQUksT0FBVCxJQUFvQixNQUFwQixFQUE0QjtBQUMxQixrQkFBSSxPQUFPLGNBQVAsQ0FBc0IsT0FBdEIsQ0FBSixFQUFvQztBQUNsQyx1QkFBTyxPQUFQLElBQWtCLE9BQU8sT0FBUCxDQUFsQjtBQUNEO0FBQ0Y7QUFDRjtBQUNGO0FBQ0QsZUFBTyxNQUFQO0FBQ0QsT0FqQkQ7QUFrQkQsS0FuQkQ7QUFvQkQ7QUFDRixDQXZCRDs7Ozs7QUNBQSxPQUFPLE9BQVAsR0FBaUIsQ0FDZjtBQUNFLFFBQU0scUJBRFI7QUFFRSxVQUFRLE1BRlY7QUFHRSxZQUFVLENBQUMsS0FBRCxFQUNSLENBQUMsSUFBRCxFQUFPLE9BQVAsRUFBZ0IsWUFBaEIsQ0FEUSxFQUVSLENBQUMsSUFBRCxFQUFPLFFBQVAsRUFBaUIsTUFBakIsQ0FGUSxDQUhaO0FBT0UsWUFBVTtBQUNSLGdCQUFZLE9BREo7QUFFUixpQkFBYTtBQUZMLEdBUFo7QUFXRSxXQUFTO0FBQ1Asa0JBQWMsU0FEUDtBQUVQLHNCQUFrQixDQUFDLEdBQUQsRUFBTSxDQUFOLENBRlg7QUFHUCxrQkFBYztBQUhQLEdBWFg7QUFnQkUsaUJBQWU7QUFoQmpCLENBRGUsRUFtQmY7QUFDRSxRQUFNLHdCQURSO0FBRUUsVUFBUSxNQUZWO0FBR0UsWUFBVSxDQUFDLEtBQUQsRUFBUSxDQUFDLElBQUQsRUFBTyxRQUFQLEVBQWlCLE1BQWpCLENBQVIsRUFBa0MsQ0FBQyxJQUFELEVBQU8sT0FBUCxFQUFnQixTQUFoQixDQUFsQyxDQUhaO0FBSUUsV0FBUztBQUNQLGtCQUFjLFNBRFA7QUFFUCxvQkFBZ0I7QUFGVCxHQUpYO0FBUUUsaUJBQWU7QUFSakIsQ0FuQmUsRUE2QmY7QUFDRSxRQUFNLCtCQURSO0FBRUUsVUFBUSxNQUZWO0FBR0UsWUFBVSxDQUFDLEtBQUQsRUFBUSxDQUFDLElBQUQsRUFBTyxRQUFQLEVBQWlCLE1BQWpCLENBQVIsRUFBa0MsQ0FBQyxJQUFELEVBQU8sT0FBUCxFQUFnQixTQUFoQixDQUFsQyxDQUhaO0FBSUUsWUFBVTtBQUNSLGdCQUFZLE9BREo7QUFFUixpQkFBYTtBQUZMLEdBSlo7QUFRRSxXQUFTO0FBQ1Asa0JBQWMsU0FEUDtBQUVQLHNCQUFrQixDQUFDLEdBQUQsRUFBTSxDQUFOLENBRlg7QUFHUCxrQkFBYztBQUhQLEdBUlg7QUFhRSxpQkFBZTtBQWJqQixDQTdCZSxFQThDZjtBQUNFLFFBQU0sMkJBRFI7QUFFRSxVQUFRLFFBRlY7QUFHRSxZQUFVLENBQUMsS0FBRCxFQUNSLENBQUMsSUFBRCxFQUFPLE9BQVAsRUFBZ0IsT0FBaEIsQ0FEUSxFQUVSLENBQUMsSUFBRCxFQUFPLE1BQVAsRUFBZSxVQUFmLENBRlEsQ0FIWjtBQU1FLFdBQVM7QUFDUCxxQkFBaUIsQ0FEVjtBQUVQLHNCQUFrQixJQUZYO0FBR1Asb0JBQWdCO0FBSFQsR0FOWDtBQVdFLGlCQUFlO0FBWGpCLENBOUNlLEVBMkRiO0FBQ0EsUUFBTSxtQkFETjtBQUVBLFVBQVEsUUFGUjtBQUdBLFlBQVUsQ0FBQyxLQUFELEVBQ1IsQ0FBQyxJQUFELEVBQU8sT0FBUCxFQUFnQixPQUFoQixDQURRLEVBRVIsQ0FBQyxJQUFELEVBQU8sTUFBUCxFQUFlLFVBQWYsQ0FGUSxDQUhWO0FBTUEsV0FBUztBQUNQLHFCQUFpQixDQURWO0FBRVAsc0JBQWtCLElBRlg7QUFHUCxvQkFBZ0I7QUFIVCxHQU5UO0FBV0EsaUJBQWU7QUFYZixDQTNEYSxFQXdFZjtBQUNFLFFBQU0saUJBRFI7QUFFRSxVQUFRLE1BRlY7QUFHRSxZQUFVLENBQUMsS0FBRCxFQUFRLENBQUMsSUFBRCxFQUFPLFFBQVAsRUFBaUIsT0FBakIsQ0FBUixFQUFtQyxDQUFDLElBQUQsRUFBTyxPQUFQLEVBQWdCLFNBQWhCLENBQW5DLENBSFo7QUFJRSxXQUFTO0FBQ1Asa0JBQWMsU0FEUDtBQUVQLDBCQUFzQixTQUZmO0FBR1Asb0JBQWdCO0FBSFQsR0FKWDtBQVNFLGlCQUFlO0FBVGpCLENBeEVlLEVBbUZmO0FBQ0UsUUFBTSx3QkFEUjtBQUVFLFVBQVEsTUFGVjtBQUdFLFlBQVUsQ0FBQyxLQUFELEVBQVEsQ0FBQyxJQUFELEVBQU8sUUFBUCxFQUFpQixPQUFqQixDQUFSLEVBQW1DLENBQUMsSUFBRCxFQUFPLE9BQVAsRUFBZ0IsU0FBaEIsQ0FBbkMsQ0FIWjtBQUlFLFlBQVU7QUFDUixnQkFBWSxPQURKO0FBRVIsaUJBQWE7QUFGTCxHQUpaO0FBUUUsV0FBUztBQUNQLGtCQUFjLFNBRFA7QUFFUCxrQkFBYztBQUZQLEdBUlg7QUFZRSxpQkFBZTtBQVpqQixDQW5GZSxFQWlHZjtBQUNFLFFBQU0sY0FEUjtBQUVFLFVBQVEsTUFGVjtBQUdFLFlBQVUsQ0FBQyxLQUFELEVBQVEsQ0FBQyxJQUFELEVBQU8sUUFBUCxFQUFpQixPQUFqQixDQUFSLEVBQW1DLENBQUMsSUFBRCxFQUFPLE9BQVAsRUFBZ0IsWUFBaEIsQ0FBbkMsQ0FIWjtBQUlFLFlBQVU7QUFDUixnQkFBWSxPQURKO0FBRVIsaUJBQWE7QUFGTCxHQUpaO0FBUUUsV0FBUztBQUNQLGtCQUFjLFNBRFA7QUFFUCxrQkFBYztBQUZQLEdBUlg7QUFZRSxpQkFBZTtBQVpqQixDQWpHZSxFQStHZjtBQUNFLFFBQU0sc0JBRFI7QUFFRSxVQUFRLFFBRlY7QUFHRSxZQUFVLENBQUMsS0FBRCxFQUNSLENBQUMsSUFBRCxFQUFPLE9BQVAsRUFBZ0IsT0FBaEIsQ0FEUSxFQUVSLENBQUMsSUFBRCxFQUFPLFFBQVAsRUFBaUIsTUFBakIsQ0FGUSxFQUdSLENBQUMsSUFBRCxFQUFPLE1BQVAsRUFBZSxVQUFmLENBSFEsQ0FIWjtBQVFFLFdBQVM7QUFDUCxxQkFBaUIsQ0FEVjtBQUVQLG9CQUFnQjtBQUZULEdBUlg7QUFZRSxpQkFBZTtBQVpqQixDQS9HZSxFQTZIZjtBQUNFLFFBQU0sZ0NBRFI7QUFFRSxVQUFRLFFBRlY7QUFHRSxZQUFVLENBQUMsS0FBRCxFQUNSLENBQUMsSUFBRCxFQUFPLE9BQVAsRUFBZ0IsT0FBaEIsQ0FEUSxFQUVSLENBQUMsSUFBRCxFQUFPLE1BQVAsRUFBZSxVQUFmLENBRlEsRUFHUixDQUFDLElBQUQsRUFBTyxRQUFQLEVBQWlCLE1BQWpCLENBSFEsQ0FIWjtBQU9FLFdBQVM7QUFDUCxxQkFBaUIsQ0FEVjtBQUVQLG9CQUFnQjtBQUZULEdBUFg7QUFXRSxpQkFBZTtBQVhqQixDQTdIZSxFQTBJZjtBQUNFLFFBQU0sK0JBRFI7QUFFRSxVQUFRLFFBRlY7QUFHRSxZQUFVLENBQUMsS0FBRCxFQUFRLENBQUMsSUFBRCxFQUFPLFFBQVAsRUFBaUIsT0FBakIsQ0FBUixFQUFtQyxDQUFDLElBQUQsRUFBTyxPQUFQLEVBQWdCLE9BQWhCLENBQW5DLEVBQTZELENBQUMsSUFBRCxFQUFPLE1BQVAsRUFBZSxRQUFmLENBQTdELENBSFo7QUFJRSxXQUFTO0FBQ1AscUJBQWlCLENBRFY7QUFFUCxvQkFBZ0I7QUFGVCxHQUpYO0FBUUUsaUJBQWU7QUFSakIsQ0ExSWUsRUFvSmY7QUFDRSxRQUFNLHVCQURSO0FBRUUsVUFBUSxRQUZWO0FBR0UsWUFBVSxDQUFDLEtBQUQsRUFBUSxDQUFDLElBQUQsRUFBTyxRQUFQLEVBQWlCLE9BQWpCLENBQVIsRUFBbUMsQ0FBQyxJQUFELEVBQU8sT0FBUCxFQUFnQixPQUFoQixDQUFuQyxFQUE2RCxDQUFDLElBQUQsRUFBTyxNQUFQLEVBQWUsUUFBZixDQUE3RCxDQUhaO0FBSUUsV0FBUztBQUNQLHFCQUFpQixDQURWO0FBRVAsb0JBQWdCO0FBRlQsR0FKWDtBQVFFLGlCQUFlO0FBUmpCLENBcEplLEVBOEpmO0FBQ0UsUUFBTSw2QkFEUjtBQUVFLFVBQVEsUUFGVjtBQUdFLFlBQVUsQ0FBQyxLQUFELEVBQVEsQ0FBQyxJQUFELEVBQU8sUUFBUCxFQUFpQixPQUFqQixDQUFSLEVBQW1DLENBQUMsSUFBRCxFQUFPLE9BQVAsRUFBZ0IsT0FBaEIsQ0FBbkMsRUFBNkQsQ0FBQyxJQUFELEVBQU8sTUFBUCxFQUFlLFNBQWYsQ0FBN0QsQ0FIWjtBQUlFLFdBQVM7QUFDUCxxQkFBaUIsQ0FEVjtBQUVQLG9CQUFnQjtBQUZULEdBSlg7QUFRRSxpQkFBZTtBQVJqQixDQTlKZSxFQXdLZjtBQUNFLFFBQU0sZUFEUjtBQUVFLFVBQVEsUUFGVjtBQUdFLFlBQVUsQ0FBQyxLQUFELEVBQVEsQ0FBQyxJQUFELEVBQU8sUUFBUCxFQUFpQixPQUFqQixDQUFSLEVBQW1DLENBQUMsSUFBRCxFQUFPLE9BQVAsRUFBZ0IsT0FBaEIsQ0FBbkMsRUFBNkQsQ0FBQyxJQUFELEVBQU8sTUFBUCxFQUFlLFNBQWYsQ0FBN0QsQ0FIWjtBQUlFLFdBQVM7QUFDUCxxQkFBaUIsQ0FEVjtBQUVQLG9CQUFnQjtBQUZULEdBSlg7QUFRRSxpQkFBZTtBQVJqQixDQXhLZSxDQUFqQjs7Ozs7QUNBQSxPQUFPLE9BQVAsR0FBaUIsVUFBUyxNQUFULEVBQWlCLFdBQWpCLEVBQThCLFNBQTlCLEVBQXlDLEdBQXpDLEVBQThDO0FBQzdELE1BQUksYUFBYSxZQUFZLFFBQVosQ0FBcUIsV0FBdEM7QUFDQSxNQUFJLFdBQVcsVUFBVSxRQUFWLENBQW1CLFdBQWxDOztBQUVBLE1BQUksTUFBTSxJQUFJLE9BQUosQ0FBWSxDQUFFLFdBQVcsQ0FBWCxDQUFGLEVBQWlCLFdBQVcsQ0FBWCxDQUFqQixDQUFaLENBQVY7QUFDQSxNQUFJLE1BQU0sSUFBSSxPQUFKLENBQVksQ0FBRSxTQUFTLENBQVQsQ0FBRixFQUFlLFNBQVMsQ0FBVCxDQUFmLENBQVosQ0FBVjtBQUNBLE1BQUksTUFBTSxJQUFJLFNBQUosQ0FBYyxDQUFFLENBQUMsSUFBSSxDQUFKLEdBQVEsSUFBSSxDQUFiLElBQWtCLENBQXBCLEVBQXVCLENBQUMsSUFBSSxDQUFKLEdBQVEsSUFBSSxDQUFiLElBQWtCLENBQXpDLENBQWQsQ0FBVjs7QUFFQSxTQUFPO0FBQ0wsVUFBTSxTQUREO0FBRUwsZ0JBQVk7QUFDVixZQUFNLFVBREk7QUFFVixjQUFRLE1BRkU7QUFHVixXQUFLLElBQUksR0FIQztBQUlWLFdBQUssSUFBSSxHQUpDO0FBS1Ysa0JBQVksVUFBVSxVQUFWLENBQXFCO0FBTHZCLEtBRlA7QUFTTCxjQUFVO0FBQ1IsWUFBTSxPQURFO0FBRVIsbUJBQWEsQ0FBQyxJQUFJLEdBQUwsRUFBVSxJQUFJLEdBQWQ7QUFGTDtBQVRMLEdBQVA7QUFjRCxDQXRCRDs7Ozs7QUNDQSxPQUFPLE9BQVAsR0FBaUIsVUFBUyxNQUFULEVBQWlCLEtBQWpCLEVBQXdCLElBQXhCLEVBQThCLFFBQTlCLEVBQXdDO0FBQ3ZELFNBQU87QUFDSCxVQUFNLFNBREg7QUFFSCxnQkFBWTtBQUNWLFlBQU0sUUFESTtBQUVWLGNBQVEsTUFGRTtBQUdWLGtCQUFZLElBSEY7QUFJVixtQkFBVztBQUpELEtBRlQ7QUFRSCxjQUFVO0FBQ1IsWUFBTSxPQURFO0FBRVIsbUJBQWE7QUFGTDtBQVJQLEdBQVA7QUFhRCxDQWREOzs7OztBQ0RBLElBQU0sUUFBUTtBQUNaLFdBQVMsU0FERztBQUVaLFFBQU0sYUFGTTtBQUdaLFNBQU87QUFISyxDQUFkOztBQU1BLE9BQU8sT0FBUCxHQUFpQixLQUFqQjs7O0FDTkE7O0FBRUEsSUFBSSxRQUFRLFFBQVEsZ0JBQVIsQ0FBWjs7QUFFQSxJQUFJLE1BQU0sRUFBVjs7Ozs7Ozs7O0FBU0EsSUFBSSxRQUFKLEdBQWUsVUFBUyxDQUFULEVBQVksRUFBWixFQUFnQjtBQUM3QixNQUFJLE9BQU8sR0FBRyxxQkFBSCxFQUFYO0FBQ0EsU0FBTyxJQUFJLEtBQUosQ0FDTCxFQUFFLE9BQUYsR0FBWSxLQUFLLElBQWpCLEdBQXdCLEdBQUcsVUFEdEIsRUFFTCxFQUFFLE9BQUYsR0FBWSxLQUFLLEdBQWpCLEdBQXVCLEdBQUcsU0FGckIsQ0FBUDtBQUlELENBTkQ7Ozs7Ozs7Ozs7OztBQWtCQSxJQUFJLE1BQUosR0FBYSxVQUFTLEdBQVQsRUFBYyxTQUFkLEVBQXlCLFNBQXpCLEVBQW9DLFVBQXBDLEVBQWdEO0FBQzNELE1BQUksS0FBSyxTQUFTLGFBQVQsQ0FBdUIsR0FBdkIsQ0FBVDtBQUNBLE1BQUksU0FBSixFQUFlLEdBQUcsU0FBSCxHQUFlLFNBQWY7QUFDZixNQUFJLFVBQUosRUFBZ0I7QUFDZCxTQUFLLElBQUksR0FBVCxJQUFnQixVQUFoQixFQUE0QjtBQUMxQixTQUFHLFlBQUgsQ0FBZ0IsR0FBaEIsRUFBcUIsV0FBVyxHQUFYLENBQXJCO0FBQ0Q7QUFDRjtBQUNELE1BQUksU0FBSixFQUFlLFVBQVUsV0FBVixDQUFzQixFQUF0QjtBQUNmLFNBQU8sRUFBUDtBQUNELENBVkQ7Ozs7Ozs7O0FBa0JBLElBQUksV0FBSixHQUFrQixVQUFTLFFBQVQsRUFBbUIsS0FBbkIsRUFBMEI7QUFDMUMsUUFBTSxTQUFOLENBQWdCLE9BQWhCLENBQXdCLElBQXhCLENBQTZCLFFBQTdCLEVBQXVDLFVBQVMsRUFBVCxFQUFhO0FBQ2xELE9BQUcsU0FBSCxDQUFhLE1BQWIsQ0FBb0IsS0FBcEI7QUFDRCxHQUZEO0FBR0QsQ0FKRDs7QUFNQSxJQUFJLFdBQVcsU0FBUyxlQUFULENBQXlCLEtBQXhDOztBQUVBLFNBQVMsUUFBVCxDQUFrQixLQUFsQixFQUF5QjtBQUN2QixPQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksTUFBTSxNQUExQixFQUFrQyxHQUFsQyxFQUF1QztBQUNyQyxRQUFJLE1BQU0sQ0FBTixLQUFZLFFBQWhCLEVBQTBCO0FBQ3hCLGFBQU8sTUFBTSxDQUFOLENBQVA7QUFDRDtBQUNGO0FBQ0Y7O0FBRUQsSUFBSSxnQkFBZ0IsU0FBUyxDQUMzQixXQUQyQixFQUUzQixpQkFGMkIsQ0FBVCxDQUFwQjs7QUFLQSxJQUFJLFlBQUosR0FBbUIsVUFBUyxFQUFULEVBQWEsS0FBYixFQUFvQjtBQUNyQyxLQUFHLEtBQUgsQ0FBUyxhQUFULElBQTBCLEtBQTFCO0FBQ0QsQ0FGRDs7QUFJQSxJQUFJLGFBQWEsU0FBUyxDQUN4QixZQUR3QixFQUV4QixlQUZ3QixFQUd4QixrQkFId0IsRUFJeEIsY0FKd0IsQ0FBVCxDQUFqQjtJQUtJLFVBTEo7O0FBT0EsSUFBSSxnQkFBSixHQUF1QixZQUFZO0FBQ2pDLE1BQUksVUFBSixFQUFnQjtBQUNkLGlCQUFhLFNBQVMsVUFBVCxDQUFiO0FBQ0EsYUFBUyxVQUFULElBQXVCLE1BQXZCO0FBQ0Q7QUFDRixDQUxEOztBQU9BLElBQUksZUFBSixHQUFzQixZQUFZO0FBQ2hDLE1BQUksVUFBSixFQUFnQjtBQUNkLGFBQVMsVUFBVCxJQUF1QixVQUF2QjtBQUNEO0FBQ0YsQ0FKRDs7QUFNQSxPQUFPLE9BQVAsQ0FBZSxZQUFmLEdBQThCLFVBQVMsU0FBVCxFQUFvQixJQUFwQixFQUEwQixZQUExQixFQUF3QztBQUNwRSxNQUFJLE9BQU8sRUFBRSxPQUFPLEtBQUssS0FBZCxFQUFYO0FBQ0EsTUFBSSxLQUFLLEVBQVQsRUFBYTtBQUNYLFNBQUssRUFBTCxHQUFVLEtBQUssRUFBZjtBQUNEO0FBQ0QsTUFBSSxJQUFJLElBQUksTUFBSixDQUFXLFFBQVgsRUFBcUIsS0FBSyxTQUExQixFQUFxQyxTQUFyQyxFQUFnRCxJQUFoRCxDQUFSOztBQUVBLElBQUUsZ0JBQUYsQ0FBbUIsT0FBbkIsRUFBNEIsVUFBQyxDQUFELEVBQU87QUFDakMsTUFBRSxjQUFGO0FBQ0EsTUFBRSxlQUFGOztBQUVBLFFBQUksS0FBSyxFQUFFLE1BQVg7O0FBRUEsUUFBSSxHQUFHLFNBQUgsQ0FBYSxRQUFiLENBQXNCLFFBQXRCLENBQUosRUFBcUM7QUFDbkMsU0FBRyxTQUFILENBQWEsTUFBYixDQUFvQixRQUFwQjtBQUNELEtBRkQsTUFFTztBQUNMLFVBQUksV0FBSixDQUFnQixTQUFTLGdCQUFULENBQTBCLE1BQU0sWUFBaEMsQ0FBaEIsRUFBK0QsUUFBL0Q7QUFDQSxTQUFHLFNBQUgsQ0FBYSxHQUFiLENBQWlCLFFBQWpCO0FBQ0EsV0FBSyxFQUFMO0FBQ0Q7QUFFRixHQWRELEVBY0csSUFkSDs7QUFnQkEsU0FBTyxDQUFQO0FBQ0QsQ0F4QkQ7Ozs7Ozs7Ozs7O0FBbUNBLE9BQU8sT0FBUCxDQUFlLFNBQWYsR0FBMkIsVUFBUyxPQUFULEVBQWtCLElBQWxCLEVBQXdCLElBQXhCLEVBQThCLEdBQTlCLEVBQW1DO0FBQzVELFlBQVUsS0FBSyxLQUFMLENBQVcsS0FBSyxTQUFMLENBQWUsT0FBZixDQUFYLENBQVY7QUFDQSxNQUFJLEtBQUssS0FBSyxDQUFMLEdBQVMsS0FBSyxDQUF2QjtBQUNBLE1BQUksS0FBSyxLQUFLLENBQUwsR0FBUyxLQUFLLENBQXZCO0FBQ0EsTUFBSSxPQUFPLFFBQVEsUUFBbkI7OztBQUdBLE1BQUksQ0FBSixFQUFPLENBQVA7QUFDQSxNQUFJLEtBQUssSUFBTCxLQUFjLFNBQWxCLEVBQTZCO0FBQzNCLFFBQUksS0FBSyxXQUFMLENBQWlCLENBQWpCLEVBQW9CLE1BQXhCO0FBQ0EsU0FBSyxJQUFJLENBQVQsRUFBWSxJQUFJLENBQWhCLEVBQW1CLEdBQW5CLEVBQXdCO0FBQ3RCLFdBQUssV0FBTCxDQUFpQixDQUFqQixFQUFvQixDQUFwQixJQUF5QixlQUFlLEtBQUssV0FBTCxDQUFpQixDQUFqQixFQUFvQixDQUFwQixDQUFmLEVBQXVDLEVBQXZDLEVBQTJDLEVBQTNDLEVBQStDLEdBQS9DLENBQXpCO0FBQ0Q7QUFDRixHQUxELE1BS08sSUFBSSxLQUFLLElBQUwsS0FBYyxZQUFsQixFQUFnQztBQUNyQyxRQUFJLEtBQUssV0FBTCxDQUFpQixNQUFyQjtBQUNBLFNBQUssSUFBSSxDQUFULEVBQVksSUFBSSxDQUFoQixFQUFtQixHQUFuQixFQUF3QjtBQUN0QixXQUFLLFdBQUwsQ0FBaUIsQ0FBakIsSUFBc0IsZUFBZSxLQUFLLFdBQUwsQ0FBaUIsQ0FBakIsQ0FBZixFQUFvQyxFQUFwQyxFQUF3QyxFQUF4QyxFQUE0QyxHQUE1QyxDQUF0QjtBQUNEO0FBQ0YsR0FMTSxNQUtBO0FBQ0wsU0FBSyxXQUFMLEdBQW1CLGVBQWUsS0FBSyxXQUFwQixFQUFpQyxFQUFqQyxFQUFxQyxFQUFyQyxFQUF5QyxHQUF6QyxDQUFuQjtBQUNEOztBQUVELFNBQU8sT0FBUDtBQUNELENBdkJEOzs7Ozs7Ozs7OztBQWtDQSxJQUFJLGlCQUFpQixTQUFqQixjQUFpQixDQUFTLEtBQVQsRUFBZ0IsRUFBaEIsRUFBb0IsRUFBcEIsRUFBd0IsR0FBeEIsRUFBNkI7QUFDaEQsTUFBSSxJQUFJLElBQUksT0FBSixDQUFZLENBQUUsTUFBTSxDQUFOLENBQUYsRUFBWSxNQUFNLENBQU4sQ0FBWixDQUFaLENBQVI7QUFDQSxNQUFJLElBQUksU0FBSixDQUFjLENBQUUsRUFBRSxDQUFGLEdBQU0sRUFBUixFQUFZLEVBQUUsQ0FBRixHQUFNLEVBQWxCLENBQWQsQ0FBSjtBQUNBLFNBQU8sQ0FBRSxFQUFFLEdBQUosRUFBUyxFQUFFLEdBQVgsQ0FBUDtBQUNELENBSkQ7Ozs7Ozs7Ozs7OztBQWdCQSxTQUFTLFFBQVQsQ0FBa0IsRUFBbEIsRUFBc0IsSUFBdEIsRUFBNEIsT0FBNUIsRUFBcUM7QUFDbkMsTUFBSSxJQUFKLEVBQVUsSUFBVixFQUFnQixTQUFoQixFQUEyQixLQUEzQjs7QUFFQSxVQUFRLGlCQUFZOztBQUVsQixXQUFPLEtBQVA7QUFDQSxRQUFJLElBQUosRUFBVTtBQUNSLGdCQUFVLEtBQVYsQ0FBZ0IsT0FBaEIsRUFBeUIsSUFBekI7QUFDQSxhQUFPLEtBQVA7QUFDRDtBQUNGLEdBUEQ7O0FBU0EsY0FBWSxxQkFBWTtBQUN0QixRQUFJLElBQUosRUFBVTs7QUFFUixhQUFPLFNBQVA7QUFFRCxLQUpELE1BSU87O0FBRUwsU0FBRyxLQUFILENBQVMsT0FBVCxFQUFrQixTQUFsQjtBQUNBLGlCQUFXLEtBQVgsRUFBa0IsSUFBbEI7QUFDQSxhQUFPLElBQVA7QUFDRDtBQUNGLEdBWEQ7O0FBYUEsU0FBTyxTQUFQO0FBQ0Q7O0FBRUQsT0FBTyxPQUFQLENBQWUsUUFBZixHQUEwQixRQUExQjtBQUNBLE9BQU8sT0FBUCxDQUFlLEdBQWYsR0FBcUIsR0FBckI7QUFDQSxPQUFPLE9BQVAsQ0FBZSxjQUFmLEdBQWdDLGNBQWhDOzs7OztlQ2pONkMsUUFBUSx5QkFBUixDOztJQUF4QyxTLFlBQUEsUztJQUFXLFksWUFBQSxZO0lBQWMsVyxZQUFBLFc7O0FBQzlCLElBQUksWUFBWSxRQUFRLG1CQUFSLENBQWhCOztBQUVBLE9BQU8sT0FBUCxHQUFpQixVQUFTLEdBQVQsRUFBYyxJQUFkLEVBQW9CO0FBQ25DLE1BQUksWUFBWSxLQUFLLFNBQXJCO0FBQ0EsTUFBSSxVQUFVLElBQUksS0FBSixDQUFVLEdBQVYsQ0FBYyxTQUFkLENBQWQ7O0FBRUEsTUFBSSxRQUFRLElBQVIsS0FBaUIsT0FBckIsRUFBOEI7QUFDNUIsVUFBTSxJQUFJLFNBQUosQ0FBYyxtREFBZCxDQUFOO0FBQ0Q7O0FBRUQsTUFBSSxXQUFXLEtBQUssVUFBTCxJQUFtQixLQUFsQztBQUNBLE1BQUksV0FBVyxLQUFLLFFBQUwsSUFBaUIsSUFBaEM7QUFDQSxNQUFJLFdBQVcsSUFBZjtBQUNBLE1BQUksWUFBWSxJQUFoQjs7QUFFQSxNQUFJLHFCQUFxQixLQUFLLFNBQUwsR0FBaUIsQ0FBQyxLQUFLLFNBQU4sQ0FBakIsR0FBb0MsRUFBN0Q7O0FBRUEsTUFBSSxXQUFXLFNBQVgsUUFBVyxDQUFTLENBQVQsRUFBWTtBQUN6QixlQUFXLElBQVg7QUFDQSxlQUFXLEVBQUUsTUFBYjtBQUNBLFFBQUksUUFBUSxFQUFFLGFBQUYsQ0FBZ0IsVUFBNUI7QUFDQSxRQUFJLGdCQUFnQixtQkFBbUIsT0FBbkIsQ0FBMkIsTUFBTSxVQUFqQyxDQUFwQjtBQUNBLFFBQUksQ0FBQyxZQUFZLENBQVosQ0FBRCxJQUFtQixrQkFBa0IsQ0FBQyxDQUExQyxFQUE2QztBQUMzQywyQkFBcUIsQ0FBQyxNQUFNLFVBQVAsQ0FBckI7QUFDRCxLQUZELE1BR0ssSUFBSSxZQUFZLENBQVosS0FBa0Isa0JBQWtCLENBQUMsQ0FBekMsRUFBNEM7QUFDL0MseUJBQW1CLElBQW5CLENBQXdCLE1BQU0sVUFBOUI7QUFDRDtBQUNELFlBQVEsT0FBUjtBQUNELEdBWkQ7O0FBY0EsTUFBSSxhQUFhLFNBQWIsVUFBYSxDQUFTLENBQVQsRUFBWTtBQUMzQixlQUFXLElBQVg7QUFDQSxlQUFXLEVBQUUsTUFBYjtBQUNBLFFBQUksUUFBUSxFQUFFLGFBQUYsQ0FBZ0IsVUFBNUI7QUFDQSxZQUFRLGFBQVIsQ0FBc0IsTUFBTSxVQUE1QixFQUF3QyxNQUFNLEdBQTlDLEVBQW1ELE1BQU0sR0FBekQ7QUFDQSx5QkFBcUIsQ0FBQyxNQUFNLFVBQVAsQ0FBckI7QUFDRCxHQU5EOztBQVFBLE1BQUksZ0JBQWdCLFNBQWhCLGFBQWdCLEdBQVc7QUFDN0IsZUFBVyxtQkFBbUIsR0FBbkIsQ0FBdUI7QUFBQSxhQUFjLFFBQVEsYUFBUixDQUFzQixVQUF0QixDQUFkO0FBQUEsS0FBdkIsQ0FBWDtBQUNBLGdCQUFZLFNBQVMsTUFBckI7QUFDRCxHQUhEOztBQUtBLFNBQU87QUFDTCxXQUFPLGlCQUFXO0FBQ2hCLFdBQUssRUFBTCxDQUFRLFdBQVIsRUFBcUIsYUFBYSxRQUFiLENBQXJCLEVBQTZDLFFBQTdDO0FBQ0EsV0FBSyxFQUFMLENBQVEsV0FBUixFQUFxQixhQUFhLFVBQWIsQ0FBckIsRUFBK0MsVUFBL0M7QUFDQSxXQUFLLEVBQUwsQ0FBUSxNQUFSLEVBQWdCO0FBQUEsZUFBTSxRQUFOO0FBQUEsT0FBaEIsRUFBZ0MsVUFBUyxDQUFULEVBQVk7QUFDMUMsVUFBRSxhQUFGLENBQWdCLGVBQWhCO0FBQ0EsWUFBSSxhQUFhLElBQWpCLEVBQXVCO0FBQ3JCO0FBQ0Q7QUFDRCxZQUFJLFlBQVksRUFBRSxNQUFGLENBQVMsR0FBVCxHQUFlLFNBQVMsR0FBeEM7QUFDQSxZQUFJLFlBQVksRUFBRSxNQUFGLENBQVMsR0FBVCxHQUFlLFNBQVMsR0FBeEM7O0FBRUEsYUFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLFNBQXBCLEVBQStCLEdBQS9CLEVBQW9DO0FBQ2xDLGNBQUksYUFBYSxtQkFBbUIsQ0FBbkIsQ0FBakI7QUFDQSxjQUFJLE1BQU0sU0FBUyxDQUFULENBQVY7O0FBRUEsY0FBSSxNQUFNLElBQUksQ0FBSixJQUFTLFNBQW5CO0FBQ0EsY0FBSSxNQUFNLElBQUksQ0FBSixJQUFTLFNBQW5CO0FBQ0Esa0JBQVEsZ0JBQVIsQ0FBeUIsVUFBekIsRUFBcUMsR0FBckMsRUFBMEMsR0FBMUM7QUFDRDtBQUNGLE9BaEJEO0FBaUJBLFdBQUssRUFBTCxDQUFRLFNBQVIsRUFBbUI7QUFBQSxlQUFNLElBQU47QUFBQSxPQUFuQixFQUErQixZQUFXO0FBQ3hDLG1CQUFXLEtBQVg7QUFDQSxtQkFBVyxJQUFYO0FBQ0Esb0JBQVksSUFBWjtBQUNBLG1CQUFXLElBQVg7QUFDRCxPQUxEO0FBTUEsV0FBSyxFQUFMLENBQVEsT0FBUixFQUFpQixTQUFqQixFQUE0QixZQUFXO0FBQ3JDLFlBQUksTUFBSixDQUFXLFVBQVgsQ0FBc0IsZUFBdEI7QUFDRCxPQUZEO0FBR0EsV0FBSyxFQUFMLENBQVEsT0FBUixFQUFpQjtBQUFBLGVBQU0sbUJBQW1CLE1BQW5CLEdBQTRCLENBQWxDO0FBQUEsT0FBakIsRUFBc0QsWUFBVztBQUMvRCwyQkFBbUIsSUFBbkIsR0FBMEIsT0FBMUIsR0FBb0MsT0FBcEMsQ0FBNEM7QUFBQSxpQkFBTSxRQUFRLGdCQUFSLENBQXlCLEVBQXpCLENBQU47QUFBQSxTQUE1QztBQUNBLDZCQUFxQixFQUFyQjtBQUNBLFlBQUksUUFBUSxPQUFSLE9BQXNCLEtBQTFCLEVBQWlDO0FBQy9CLGNBQUksS0FBSixDQUFVLE1BQVYsQ0FBaUIsQ0FBQyxTQUFELENBQWpCO0FBQ0EsY0FBSSxNQUFKLENBQVcsVUFBWCxDQUFzQixlQUF0QjtBQUNEO0FBQ0YsT0FQRDtBQVFBLFdBQUssRUFBTCxDQUFRLE9BQVIsRUFBaUI7QUFBQSxlQUFNLG1CQUFtQixNQUFuQixLQUE4QixDQUFwQztBQUFBLE9BQWpCLEVBQXdELFlBQVc7QUFDakUsWUFBSSxNQUFKLENBQVcsVUFBWCxDQUFzQixlQUF0QixFQUF1QyxDQUFDLFNBQUQsQ0FBdkM7QUFDRCxPQUZEO0FBR0QsS0F6Q0k7QUEwQ0wsVUFBTSxnQkFBVyxDQUFFLENBMUNkO0FBMkNMLFlBQVEsZ0JBQVMsT0FBVCxFQUFrQixJQUFsQixFQUF3QjtBQUM5QixVQUFJLGNBQWMsUUFBUSxVQUFSLENBQW1CLEVBQXJDLEVBQXlDO0FBQ3ZDLGdCQUFRLFVBQVIsQ0FBbUIsTUFBbkIsR0FBNEIsTUFBNUI7QUFDQSxhQUFLLE9BQUw7QUFDQSxrQkFBVSxPQUFWLEVBQW1CLElBQW5CLEVBQXlCLElBQXpCLEVBQStCLElBQUksR0FBbkMsRUFBd0Msa0JBQXhDO0FBQ0QsT0FKRCxNQUtLO0FBQ0gsZ0JBQVEsVUFBUixDQUFtQixNQUFuQixHQUE0QixPQUE1QjtBQUNBLGFBQUssT0FBTDtBQUNEO0FBQ0Y7QUFyREksR0FBUDtBQXVERCxDQWpHRDs7Ozs7ZUNIZ0MsUUFBUSx5QkFBUixDOztJQUEzQixVLFlBQUEsVTtJQUFZLFcsWUFBQSxXOztBQUNqQixJQUFJLGFBQWEsUUFBUSw4QkFBUixDQUFqQjtBQUNBLElBQU0sUUFBUSxRQUFRLGNBQVIsQ0FBZDs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsVUFBUyxHQUFULEVBQWM7O0FBRTdCLE1BQUksVUFBVSxJQUFJLFVBQUosQ0FBZSxHQUFmLEVBQW9CO0FBQ2hDLFlBQVEsU0FEd0I7QUFFaEMsa0JBQWMsRUFGa0I7QUFHaEMsZ0JBQVk7QUFDVixjQUFRLFlBREU7QUFFVixxQkFBZTtBQUZMO0FBSG9CLEdBQXBCLENBQWQ7O0FBU0EsTUFBSSxLQUFKLENBQVUsR0FBVixDQUFjLE9BQWQ7O0FBRUEsTUFBSSx1QkFBdUIsU0FBdkIsb0JBQXVCLEdBQVc7QUFDcEMsUUFBSSxNQUFKLENBQVcsVUFBWCxDQUFzQixlQUF0QjtBQUNBLFFBQUksS0FBSixDQUFVLE1BQVYsQ0FBaUIsQ0FBQyxRQUFRLEVBQVQsQ0FBakI7QUFDRCxHQUhEOztBQUtBLE1BQUksTUFBTSxDQUFWOztBQUVBLE1BQUksY0FBYyxTQUFkLFdBQWMsQ0FBUyxDQUFULEVBQVk7QUFDNUIsUUFBSSxFQUFKLENBQU8sUUFBUCxDQUFnQixFQUFDLE9BQU0sS0FBUCxFQUFoQjtBQUNBLFlBQVEsZ0JBQVIsQ0FBeUIsR0FBekIsRUFBOEIsRUFBRSxNQUFGLENBQVMsR0FBdkMsRUFBNEMsRUFBRSxNQUFGLENBQVMsR0FBckQ7QUFDRCxHQUhEOztBQUtBLE1BQUksVUFBVSxTQUFWLE9BQVUsQ0FBUyxDQUFULEVBQVk7QUFDeEIsUUFBSSxFQUFKLENBQU8sUUFBUCxDQUFnQixFQUFDLE9BQU0sS0FBUCxFQUFoQjtBQUNDLFFBQUksTUFBTSxDQUFOLElBQVcsUUFBUSxXQUFSLENBQW9CLENBQXBCLEVBQXVCLENBQXZCLE1BQThCLEVBQUUsTUFBRixDQUFTLEdBQWxELElBQXlELFFBQVEsV0FBUixDQUFvQixDQUFwQixFQUF1QixDQUF2QixNQUE4QixFQUFFLE1BQUYsQ0FBUyxHQUFwRyxFQUF5Rzs7QUFFeEc7QUFDRCxLQUhBLE1BSUksSUFBSSxNQUFNLENBQU4sSUFBVyxRQUFRLFdBQVIsQ0FBb0IsTUFBTSxDQUExQixFQUE2QixDQUE3QixNQUFvQyxFQUFFLE1BQUYsQ0FBUyxHQUF4RCxJQUErRCxRQUFRLFdBQVIsQ0FBb0IsTUFBTSxDQUExQixFQUE2QixDQUE3QixNQUFvQyxFQUFFLE1BQUYsQ0FBUyxHQUFoSCxFQUFxSDs7QUFFeEg7QUFDRCxLQUhJLE1BSUE7QUFDSCxjQUFRLGdCQUFSLENBQXlCLEdBQXpCLEVBQThCLEVBQUUsTUFBRixDQUFTLEdBQXZDLEVBQTRDLEVBQUUsTUFBRixDQUFTLEdBQXJEO0FBQ0E7QUFDRDtBQUNGLEdBZEQ7O0FBZ0JBLE1BQUksV0FBVyxTQUFYLFFBQVcsR0FBVztBQUN4QixZQUFRLGdCQUFSLE1BQTRCLEdBQTVCO0FBQ0E7QUFDQSxRQUFJLE1BQUosQ0FBVyxVQUFYLENBQXNCLGVBQXRCLEVBQXVDLENBQUMsUUFBUSxFQUFULENBQXZDO0FBQ0QsR0FKRDs7QUFNQSxTQUFPO0FBQ0wsV0FBTyxpQkFBVztBQUNoQixVQUFJLEVBQUosQ0FBTyxRQUFQLENBQWdCLEVBQUMsT0FBTSxLQUFQLEVBQWhCO0FBQ0EsVUFBSSxFQUFKLENBQU8sZUFBUCxDQUF1QixNQUFNLElBQTdCO0FBQ0EsV0FBSyxFQUFMLENBQVEsV0FBUixFQUFxQjtBQUFBLGVBQU0sSUFBTjtBQUFBLE9BQXJCLEVBQWlDLFdBQWpDO0FBQ0EsV0FBSyxFQUFMLENBQVEsT0FBUixFQUFpQjtBQUFBLGVBQU0sSUFBTjtBQUFBLE9BQWpCLEVBQTZCLE9BQTdCO0FBQ0EsV0FBSyxFQUFMLENBQVEsT0FBUixFQUFpQixXQUFqQixFQUE4QixvQkFBOUI7QUFDQSxXQUFLLEVBQUwsQ0FBUSxPQUFSLEVBQWlCLFVBQWpCLEVBQTZCLFFBQTdCO0FBQ0EsV0FBSyxFQUFMLENBQVEsT0FBUixFQUFpQjtBQUFBLGVBQU0sSUFBTjtBQUFBLE9BQWpCLEVBQTZCLG9CQUE3QjtBQUNELEtBVEk7QUFVTCxVQUFNLGdCQUFXO0FBQ2YsVUFBSSxFQUFKLENBQU8saUJBQVAsQ0FBeUIsTUFBTSxJQUEvQjtBQUNBLFVBQUksQ0FBQyxRQUFRLE9BQVIsRUFBTCxFQUF3QjtBQUN0QixZQUFJLEtBQUosQ0FBVSxNQUFWLENBQWlCLENBQUMsUUFBUSxFQUFULENBQWpCO0FBQ0Q7QUFDRixLQWZJO0FBZ0JMLFlBQVEsZ0JBQVMsT0FBVCxFQUFrQixJQUFsQixFQUF3QjtBQUM5QixVQUFJLFFBQVEsUUFBUixDQUFpQixXQUFqQixDQUE2QixDQUE3QixNQUFvQyxTQUF4QyxFQUFtRDtBQUNqRCxnQkFBUSxVQUFSLENBQW1CLE1BQW5CLEdBQTRCLFFBQVEsVUFBUixDQUFtQixFQUFuQixLQUEwQixRQUFRLEVBQWxDLEdBQXVDLE1BQXZDLEdBQWdELE9BQTVFO0FBQ0EsZ0JBQVEsVUFBUixDQUFtQixJQUFuQixHQUEwQixRQUFRLFVBQVIsQ0FBbUIsTUFBbkIsS0FBOEIsTUFBOUIsR0FBdUMsU0FBdkMsR0FBbUQsUUFBUSxVQUFSLENBQW1CLElBQWhHO0FBQ0EsYUFBSyxPQUFMO0FBQ0Q7QUFDRjtBQXRCSSxHQUFQO0FBd0JELENBdkVEOzs7OztlQ0pnQyxRQUFRLHlCQUFSLEM7O0lBQTNCLFUsWUFBQSxVO0lBQVksVyxZQUFBLFc7O0FBQ2pCLElBQUksUUFBUSxRQUFRLHdCQUFSLENBQVo7QUFDQSxJQUFNLFFBQVEsUUFBUSxjQUFSLENBQWQ7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLFVBQVMsR0FBVCxFQUFjOztBQUU3QixNQUFJLFVBQVUsSUFBSSxLQUFKLENBQVUsR0FBVixFQUFlO0FBQzNCLFlBQVEsU0FEbUI7QUFFM0Isa0JBQWMsRUFGYTtBQUczQixnQkFBWTtBQUNWLGNBQVEsT0FERTtBQUVWLHFCQUFlO0FBRkw7QUFIZSxHQUFmLENBQWQ7O0FBU0EsTUFBSSxLQUFKLENBQVUsR0FBVixDQUFjLE9BQWQ7O0FBRUEsTUFBSSx1QkFBdUIsU0FBdkIsb0JBQXVCLEdBQVc7QUFDcEMsUUFBSSxNQUFKLENBQVcsVUFBWCxDQUFzQixlQUF0QjtBQUNBLFFBQUksS0FBSixDQUFVLE1BQVYsQ0FBaUIsQ0FBQyxRQUFRLEVBQVQsQ0FBakI7QUFDRCxHQUhEOztBQUtBLE1BQUksY0FBYyxTQUFkLFdBQWMsR0FBVztBQUMzQixRQUFJLEVBQUosQ0FBTyxRQUFQLENBQWdCLEVBQUMsT0FBTSxLQUFQLEVBQWhCO0FBQ0QsR0FGRDs7QUFJQSxNQUFJLE9BQU8sS0FBWDtBQUNBLE1BQUksVUFBVSxTQUFWLE9BQVUsQ0FBUyxDQUFULEVBQVk7QUFDeEIsUUFBSSxFQUFKLENBQU8sUUFBUCxDQUFnQixFQUFDLE9BQU0sS0FBUCxFQUFoQjtBQUNBLFdBQU8sSUFBUDtBQUNBLFlBQVEsZ0JBQVIsQ0FBeUIsRUFBekIsRUFBNkIsRUFBRSxNQUFGLENBQVMsR0FBdEMsRUFBMkMsRUFBRSxNQUFGLENBQVMsR0FBcEQ7QUFDQSxRQUFJLE1BQUosQ0FBVyxVQUFYLENBQXNCLGVBQXRCLEVBQXVDLENBQUMsUUFBUSxFQUFULENBQXZDO0FBQ0QsR0FMRDs7QUFPQSxTQUFPO0FBQ0wsV0FBTyxpQkFBVztBQUNoQixVQUFJLEVBQUosQ0FBTyxRQUFQLENBQWdCLEVBQUMsT0FBTSxLQUFQLEVBQWhCO0FBQ0EsVUFBSSxFQUFKLENBQU8sZUFBUCxDQUF1QixNQUFNLEtBQTdCO0FBQ0EsV0FBSyxFQUFMLENBQVEsV0FBUixFQUFxQjtBQUFBLGVBQU0sSUFBTjtBQUFBLE9BQXJCLEVBQWlDLFdBQWpDO0FBQ0EsV0FBSyxFQUFMLENBQVEsT0FBUixFQUFpQjtBQUFBLGVBQU0sSUFBTjtBQUFBLE9BQWpCLEVBQTZCLE9BQTdCO0FBQ0EsV0FBSyxFQUFMLENBQVEsT0FBUixFQUFpQixXQUFqQixFQUE4QixvQkFBOUI7QUFDQSxXQUFLLEVBQUwsQ0FBUSxPQUFSLEVBQWlCLFVBQWpCLEVBQTZCLG9CQUE3QjtBQUNBLFdBQUssRUFBTCxDQUFRLE9BQVIsRUFBaUI7QUFBQSxlQUFNLElBQU47QUFBQSxPQUFqQixFQUE2QixvQkFBN0I7QUFDRCxLQVRJO0FBVUwsVUFBTSxnQkFBVztBQUNmLFVBQUksRUFBSixDQUFPLGlCQUFQLENBQXlCLE1BQU0sS0FBL0I7QUFDQSxVQUFJLFNBQVMsS0FBYixFQUFvQjtBQUNsQixZQUFJLEtBQUosQ0FBVSxNQUFWLENBQWlCLENBQUMsUUFBUSxFQUFULENBQWpCO0FBQ0Q7QUFDRixLQWZJO0FBZ0JMLFlBQVEsZ0JBQVMsT0FBVCxFQUFrQixJQUFsQixFQUF3QjtBQUM5QixjQUFRLFVBQVIsQ0FBbUIsTUFBbkIsR0FBNEIsUUFBUSxVQUFSLENBQW1CLEVBQW5CLEtBQTBCLFFBQVEsRUFBbEMsR0FBdUMsTUFBdkMsR0FBZ0QsT0FBNUU7QUFDQSxVQUFJLFFBQVEsVUFBUixDQUFtQixNQUFuQixLQUE4QixPQUFsQyxFQUEyQztBQUN6QyxhQUFLLE9BQUw7QUFDRDtBQUNGO0FBckJJLEdBQVA7QUF1QkQsQ0FyREQ7Ozs7O2VDSmdDLFFBQVEseUJBQVIsQzs7SUFBM0IsVSxZQUFBLFU7SUFBWSxXLFlBQUEsVzs7QUFDakIsSUFBSSxVQUFVLFFBQVEsMEJBQVIsQ0FBZDtBQUNBLElBQU0sUUFBUSxRQUFRLGNBQVIsQ0FBZDs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsVUFBUyxHQUFULEVBQWM7O0FBRTdCLE1BQUksVUFBVSxJQUFJLE9BQUosQ0FBWSxHQUFaLEVBQWlCO0FBQzdCLFlBQVEsU0FEcUI7QUFFN0Isa0JBQWMsRUFGZTtBQUc3QixnQkFBWTtBQUNWLGNBQVEsU0FERTtBQUVWLHFCQUFlLENBQUMsRUFBRDtBQUZMO0FBSGlCLEdBQWpCLENBQWQ7O0FBU0EsTUFBSSxLQUFKLENBQVUsR0FBVixDQUFjLE9BQWQ7O0FBRUEsTUFBSSx1QkFBdUIsU0FBdkIsb0JBQXVCLEdBQVc7QUFDcEMsUUFBSSxNQUFKLENBQVcsVUFBWCxDQUFzQixlQUF0QjtBQUNBLFFBQUksS0FBSixDQUFVLE1BQVYsQ0FBaUIsQ0FBQyxRQUFRLEVBQVQsQ0FBakI7QUFDRCxHQUhEOztBQUtBLE1BQUksTUFBTSxDQUFWOztBQUVBLE1BQUksY0FBYyxTQUFkLFdBQWMsQ0FBUyxDQUFULEVBQVk7QUFDNUIsUUFBSSxFQUFKLENBQU8sUUFBUCxDQUFnQixFQUFDLE9BQU0sS0FBUCxFQUFoQjtBQUNBLFlBQVEsZ0JBQVIsUUFBOEIsR0FBOUIsRUFBcUMsRUFBRSxNQUFGLENBQVMsR0FBOUMsRUFBbUQsRUFBRSxNQUFGLENBQVMsR0FBNUQ7QUFDRCxHQUhEOztBQUtBLE1BQUksVUFBVSxTQUFWLE9BQVUsQ0FBUyxDQUFULEVBQVk7QUFDeEIsUUFBSSxFQUFKLENBQU8sUUFBUCxDQUFnQixFQUFDLE9BQU0sS0FBUCxFQUFoQjtBQUNBLFFBQUksTUFBTSxDQUFOLElBQVcsUUFBUSxXQUFSLENBQW9CLENBQXBCLEVBQXVCLENBQXZCLEVBQTBCLENBQTFCLE1BQWlDLEVBQUUsTUFBRixDQUFTLEdBQXJELElBQTRELFFBQVEsV0FBUixDQUFvQixDQUFwQixFQUF1QixDQUF2QixFQUEwQixDQUExQixNQUFpQyxFQUFFLE1BQUYsQ0FBUyxHQUExRyxFQUErRzs7QUFFN0c7QUFDRCxLQUhELE1BSUssSUFBSSxNQUFNLENBQU4sSUFBVyxRQUFRLFdBQVIsQ0FBb0IsQ0FBcEIsRUFBdUIsTUFBTSxDQUE3QixFQUFnQyxDQUFoQyxNQUF1QyxFQUFFLE1BQUYsQ0FBUyxHQUEzRCxJQUFrRSxRQUFRLFdBQVIsQ0FBb0IsQ0FBcEIsRUFBdUIsTUFBTSxDQUE3QixFQUFnQyxDQUFoQyxNQUF1QyxFQUFFLE1BQUYsQ0FBUyxHQUF0SCxFQUEySDs7QUFFOUg7QUFDRCxLQUhJLE1BSUE7QUFDSCxjQUFRLGdCQUFSLFFBQThCLEdBQTlCLEVBQXFDLEVBQUUsTUFBRixDQUFTLEdBQTlDLEVBQW1ELEVBQUUsTUFBRixDQUFTLEdBQTVEO0FBQ0E7QUFDRDtBQUVGLEdBZkQ7O0FBaUJBLE1BQUksV0FBVyxTQUFYLFFBQVcsR0FBVztBQUN4QixZQUFRLGdCQUFSLFFBQThCLEdBQTlCO0FBQ0E7QUFDQSxRQUFJLE1BQUosQ0FBVyxVQUFYLENBQXNCLGVBQXRCLEVBQXVDLENBQUMsUUFBUSxFQUFULENBQXZDO0FBQ0QsR0FKRDs7QUFNQSxTQUFPO0FBQ0wsV0FBTyxpQkFBVztBQUNoQixVQUFJLEVBQUosQ0FBTyxRQUFQLENBQWdCLEVBQUMsT0FBTSxLQUFQLEVBQWhCO0FBQ0EsVUFBSSxFQUFKLENBQU8sZUFBUCxDQUF1QixNQUFNLE9BQTdCO0FBQ0EsV0FBSyxFQUFMLENBQVEsV0FBUixFQUFxQjtBQUFBLGVBQU0sSUFBTjtBQUFBLE9BQXJCLEVBQWlDLFdBQWpDO0FBQ0EsV0FBSyxFQUFMLENBQVEsT0FBUixFQUFpQjtBQUFBLGVBQU0sSUFBTjtBQUFBLE9BQWpCLEVBQTZCLE9BQTdCO0FBQ0EsV0FBSyxFQUFMLENBQVEsT0FBUixFQUFpQixXQUFqQixFQUE4QixvQkFBOUI7QUFDQSxXQUFLLEVBQUwsQ0FBUSxPQUFSLEVBQWlCLFVBQWpCLEVBQTZCLFFBQTdCO0FBQ0EsV0FBSyxFQUFMLENBQVEsT0FBUixFQUFpQjtBQUFBLGVBQU0sSUFBTjtBQUFBLE9BQWpCLEVBQTZCLG9CQUE3QjtBQUNELEtBVEk7QUFVTCxVQUFNLGdCQUFXO0FBQ2YsVUFBSSxFQUFKLENBQU8saUJBQVAsQ0FBeUIsTUFBTSxPQUEvQjtBQUNBLFVBQUksQ0FBQyxRQUFRLE9BQVIsRUFBTCxFQUF3QjtBQUN0QixZQUFJLEtBQUosQ0FBVSxNQUFWLENBQWlCLENBQUMsUUFBUSxFQUFULENBQWpCO0FBQ0Q7QUFDRixLQWZJO0FBZ0JMLFlBQVEsZ0JBQVMsT0FBVCxFQUFrQixJQUFsQixFQUF3QjtBQUM5QixjQUFRLFVBQVIsQ0FBbUIsTUFBbkIsR0FBNEIsUUFBUSxVQUFSLENBQW1CLEVBQW5CLEtBQTBCLFFBQVEsRUFBbEMsR0FBdUMsTUFBdkMsR0FBZ0QsT0FBNUU7QUFDQSxjQUFRLFVBQVIsQ0FBbUIsSUFBbkIsR0FBMEIsUUFBUSxVQUFSLENBQW1CLE1BQW5CLEtBQThCLE1BQTlCLEdBQXVDLFNBQXZDLEdBQW1ELFFBQVEsVUFBUixDQUFtQixJQUFoRzs7QUFFQSxVQUFJLFFBQVEsVUFBUixDQUFtQixNQUFuQixLQUE4QixNQUE5QixJQUF3QyxRQUFRLENBQXBELEVBQXVEO0FBQ3JELFlBQUksU0FBUyxDQUFDLENBQUMsUUFBUSxRQUFSLENBQWlCLFdBQWpCLENBQTZCLENBQTdCLEVBQWdDLENBQWhDLEVBQW1DLENBQW5DLENBQUQsRUFBd0MsUUFBUSxRQUFSLENBQWlCLFdBQWpCLENBQTZCLENBQTdCLEVBQWdDLENBQWhDLEVBQW1DLENBQW5DLENBQXhDLENBQUQsRUFBaUYsQ0FBQyxRQUFRLFFBQVIsQ0FBaUIsV0FBakIsQ0FBNkIsQ0FBN0IsRUFBZ0MsQ0FBaEMsRUFBbUMsQ0FBbkMsQ0FBRCxFQUF3QyxRQUFRLFFBQVIsQ0FBaUIsV0FBakIsQ0FBNkIsQ0FBN0IsRUFBZ0MsQ0FBaEMsRUFBbUMsQ0FBbkMsQ0FBeEMsQ0FBakYsQ0FBYjtBQUNBLGFBQUs7QUFDSCxrQkFBUSxTQURMO0FBRUgsd0JBQWMsUUFBUSxVQUZuQjtBQUdILHNCQUFZO0FBQ1YsMkJBQWUsTUFETDtBQUVWLG9CQUFRO0FBRkU7QUFIVCxTQUFMO0FBUUQsT0FWRCxNQVdLLElBQUksUUFBUSxVQUFSLENBQW1CLE1BQW5CLEtBQThCLE9BQTlCLElBQXlDLE1BQU0sQ0FBbkQsRUFBc0Q7QUFDekQsYUFBSyxPQUFMO0FBQ0Q7QUFDRjtBQWxDSSxHQUFQO0FBb0NELENBcEZEOzs7OztlQ0p3RCxRQUFRLHlCQUFSLEM7O0lBQW5ELFMsWUFBQSxTO0lBQVcsVyxZQUFBLFc7SUFBYSxTLFlBQUEsUztJQUFXLFksWUFBQSxZOztBQUN4QyxJQUFJLFlBQVksUUFBUSxtQkFBUixDQUFoQjs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsVUFBUyxHQUFULEVBQWMsMEJBQWQsRUFBMEM7O0FBRXpELE1BQUksdUJBQXVCLEVBQTNCO0FBQ0EsR0FBQyw4QkFBOEIsRUFBL0IsRUFBbUMsT0FBbkMsQ0FBMkMsY0FBTTtBQUMvQyx5QkFBcUIsRUFBckIsSUFBMkIsSUFBSSxLQUFKLENBQVUsR0FBVixDQUFjLEVBQWQsQ0FBM0I7QUFDRCxHQUZEOztBQUlBLE1BQUksV0FBVyxJQUFmO0FBQ0EsTUFBSSxXQUFXLEtBQWY7QUFDQSxNQUFJLGdCQUFnQixJQUFwQjtBQUNBLE1BQUksV0FBVyxJQUFmO0FBQ0EsTUFBSSxjQUFjLElBQWxCOztBQUVBLE1BQUksdUJBQXVCLFNBQXZCLG9CQUF1QixDQUFTLENBQVQsRUFBWTtBQUNyQyxRQUFJLFVBQVUsQ0FBVixDQUFKLEVBQWtCO0FBQ2hCLFVBQUksUUFBUSxFQUFFLGFBQUYsQ0FBZ0IsVUFBNUI7QUFDQSxhQUFPLHFCQUFxQixNQUFNLEVBQTNCLE1BQW1DLFNBQW5DLElBQWdELHFCQUFxQixNQUFNLEVBQTNCLEVBQStCLElBQS9CLEtBQXdDLE9BQS9GO0FBQ0Q7QUFDRCxXQUFPLEtBQVA7QUFDRCxHQU5EOztBQVFBLE1BQUkscUJBQXFCLFNBQXJCLGtCQUFxQixHQUFXO0FBQ2xDLFFBQUksYUFBYSxPQUFPLElBQVAsQ0FBWSxvQkFBWixDQUFqQjtBQUNBLG9CQUFnQixXQUFXLEdBQVgsQ0FBZTtBQUFBLGFBQU0scUJBQXFCLEVBQXJCLEVBQXlCLGNBQXpCLEVBQU47QUFBQSxLQUFmLENBQWhCO0FBQ0EsZUFBVyxXQUFXLEdBQVgsQ0FBZTtBQUFBLGFBQU0scUJBQXFCLEVBQXJCLENBQU47QUFBQSxLQUFmLENBQVg7QUFDQSxrQkFBYyxXQUFXLE1BQXpCO0FBQ0QsR0FMRDs7QUFPQSxNQUFJLGVBQWUsU0FBZixZQUFlLENBQVMsQ0FBVCxFQUFZO0FBQzdCLFFBQUksR0FBSixDQUFRLFVBQVIsQ0FBbUIsZUFBbkIsRUFBb0M7QUFDbEMsaUJBQVcsRUFBRSxhQUFGLENBQWdCLFVBQWhCLENBQTJCO0FBREosS0FBcEM7QUFHRCxHQUpEOztBQU1BLFNBQU87QUFDTCxXQUFPLGlCQUFXO0FBQ2hCLFdBQUssRUFBTCxDQUFRLE9BQVIsRUFBaUIsU0FBakIsRUFBNEIsWUFBVztBQUFBOztBQUNyQyxZQUFJLGNBQWMsT0FBTyxJQUFQLENBQVksb0JBQVosQ0FBbEI7QUFDQSwrQkFBdUIsRUFBdkI7QUFDQSxvQkFBWSxPQUFaLENBQW9CO0FBQUEsaUJBQU0sTUFBSyxNQUFMLENBQVksRUFBWixDQUFOO0FBQUEsU0FBcEI7QUFDQSxhQUFLLElBQUwsQ0FBVSxjQUFWLEVBQTBCLEVBQUMsWUFBWSxXQUFiLEVBQTFCO0FBQ0QsT0FMRDs7QUFPQSxXQUFLLEVBQUwsQ0FBUSxXQUFSLEVBQXFCLGFBQWEsUUFBYixDQUFyQixFQUE2QyxVQUFTLENBQVQsRUFBWTtBQUN2RCxZQUFJLEdBQUosQ0FBUSxVQUFSLENBQW1CLGVBQW5CLEVBQW9DO0FBQ2xDLHFCQUFXLEVBQUUsYUFBRixDQUFnQixVQUFoQixDQUEyQixNQURKO0FBRWxDLHFCQUFXLEVBQUUsYUFBRixDQUFnQixVQUFoQixDQUEyQixVQUZKO0FBR2xDLHNCQUFZLElBSHNCO0FBSWxDLG9CQUFVLEVBQUU7QUFKc0IsU0FBcEM7QUFNRCxPQVBEOztBQVNBLFdBQUssRUFBTCxDQUFRLFdBQVIsRUFBcUIsU0FBckIsRUFBZ0MsVUFBUyxDQUFULEVBQVk7QUFBQTs7QUFDMUMsbUJBQVcsSUFBWDtBQUNBLG1CQUFXLEVBQUUsTUFBYjtBQUNBLFlBQUksS0FBSyxFQUFFLGFBQUYsQ0FBZ0IsVUFBaEIsQ0FBMkIsRUFBcEM7O0FBRUEsWUFBSSxhQUFhLHFCQUFxQixFQUFyQixNQUE2QixTQUE5Qzs7QUFFQSxZQUFJLGNBQWMsQ0FBQyxZQUFZLENBQVosQ0FBbkIsRUFBbUM7QUFDakMsZUFBSyxFQUFMLENBQVEsT0FBUixFQUFpQixvQkFBakIsRUFBdUMsWUFBdkM7QUFDRCxTQUZELE1BR0ssSUFBSSxjQUFjLFlBQVksQ0FBWixDQUFsQixFQUFrQztBQUNyQyxpQkFBTyxxQkFBcUIsRUFBckIsQ0FBUDtBQUNBLGVBQUssSUFBTCxDQUFVLGNBQVYsRUFBMEIsRUFBQyxZQUFXLENBQUMsRUFBRCxDQUFaLEVBQTFCO0FBQ0EsZUFBSyxNQUFMLENBQVksRUFBWjtBQUNELFNBSkksTUFLQSxJQUFJLENBQUMsVUFBRCxJQUFlLFlBQVksQ0FBWixDQUFuQixFQUFtQzs7QUFFdEMsK0JBQXFCLEVBQXJCLElBQTJCLElBQUksS0FBSixDQUFVLEdBQVYsQ0FBYyxFQUFkLENBQTNCO0FBQ0EsZUFBSyxJQUFMLENBQVUsZ0JBQVYsRUFBNEIsRUFBQyxZQUFXLENBQUMsRUFBRCxDQUFaLEVBQTVCO0FBQ0EsZUFBSyxNQUFMLENBQVksRUFBWjtBQUNELFNBTEksTUFNQTs7QUFFSCxjQUFJLGNBQWMsT0FBTyxJQUFQLENBQVksb0JBQVosQ0FBbEI7QUFDQSxzQkFBWSxPQUFaLENBQW9CO0FBQUEsbUJBQVUsT0FBSyxNQUFMLENBQVksTUFBWixDQUFWO0FBQUEsV0FBcEI7QUFDQSxpQ0FBdUIsRUFBdkI7QUFDQSwrQkFBcUIsRUFBckIsSUFBMkIsSUFBSSxLQUFKLENBQVUsR0FBVixDQUFjLEVBQWQsQ0FBM0I7QUFDQSxlQUFLLElBQUwsQ0FBVSxjQUFWLEVBQTBCLEVBQUMsWUFBVyxXQUFaLEVBQTFCO0FBQ0EsZUFBSyxJQUFMLENBQVUsZ0JBQVYsRUFBNEIsRUFBQyxZQUFXLENBQUMsRUFBRCxDQUFaLEVBQTVCO0FBQ0EsZUFBSyxNQUFMLENBQVksRUFBWjtBQUNEO0FBQ0YsT0EvQkQ7O0FBaUNBLFdBQUssRUFBTCxDQUFRLFNBQVIsRUFBbUI7QUFBQSxlQUFNLElBQU47QUFBQSxPQUFuQixFQUErQixZQUFXO0FBQ3hDLG1CQUFXLEtBQVg7QUFDQSx3QkFBZ0IsSUFBaEI7QUFDQSxtQkFBVyxJQUFYO0FBQ0Esc0JBQWMsSUFBZDtBQUNELE9BTEQ7O0FBT0EsV0FBSyxFQUFMLENBQVEsTUFBUixFQUFnQjtBQUFBLGVBQU0sUUFBTjtBQUFBLE9BQWhCLEVBQWdDLFVBQVMsQ0FBVCxFQUFZO0FBQzFDLGFBQUssR0FBTCxDQUFTLE9BQVQsRUFBa0Isb0JBQWxCLEVBQXdDLFlBQXhDO0FBQ0EsVUFBRSxhQUFGLENBQWdCLGVBQWhCO0FBQ0EsWUFBSSxrQkFBa0IsSUFBdEIsRUFBNEI7QUFDMUI7QUFDRDs7QUFFRCxZQUFJLE9BQU8sRUFBRSxNQUFGLENBQVMsR0FBVCxHQUFlLFNBQVMsR0FBbkM7QUFDQSxZQUFJLE9BQU8sRUFBRSxNQUFGLENBQVMsR0FBVCxHQUFlLFNBQVMsR0FBbkM7O0FBRUEsWUFBSSxXQUFXLFNBQVgsUUFBVyxDQUFDLEtBQUQ7QUFBQSxpQkFBVyxDQUFDLE1BQU0sQ0FBTixJQUFXLElBQVosRUFBa0IsTUFBTSxDQUFOLElBQVcsSUFBN0IsQ0FBWDtBQUFBLFNBQWY7QUFDQSxZQUFJLFVBQVUsU0FBVixPQUFVLENBQUMsSUFBRDtBQUFBLGlCQUFVLEtBQUssR0FBTCxDQUFTO0FBQUEsbUJBQVMsU0FBUyxLQUFULENBQVQ7QUFBQSxXQUFULENBQVY7QUFBQSxTQUFkO0FBQ0EsWUFBSSxXQUFXLFNBQVgsUUFBVyxDQUFDLEtBQUQ7QUFBQSxpQkFBVyxNQUFNLEdBQU4sQ0FBVTtBQUFBLG1CQUFRLFFBQVEsSUFBUixDQUFSO0FBQUEsV0FBVixDQUFYO0FBQUEsU0FBZjs7QUFFQSxhQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksV0FBcEIsRUFBaUMsR0FBakMsRUFBc0M7QUFDcEMsY0FBSSxVQUFVLFNBQVMsQ0FBVCxDQUFkO0FBQ0EsY0FBSSxRQUFRLElBQVIsS0FBaUIsT0FBckIsRUFBOEI7QUFDNUIsb0JBQVEsY0FBUixDQUF1QixTQUFTLGNBQWMsQ0FBZCxDQUFULENBQXZCO0FBQ0QsV0FGRCxNQUdLLElBQUksUUFBUSxJQUFSLEtBQWlCLFlBQWpCLElBQWlDLFFBQVEsSUFBUixLQUFpQixZQUF0RCxFQUFvRTtBQUN2RSxvQkFBUSxjQUFSLENBQXVCLGNBQWMsQ0FBZCxFQUFpQixHQUFqQixDQUFxQixRQUFyQixDQUF2QjtBQUNELFdBRkksTUFHQSxJQUFJLFFBQVEsSUFBUixLQUFpQixTQUFqQixJQUE4QixRQUFRLElBQVIsS0FBaUIsaUJBQW5ELEVBQXNFO0FBQ3pFLG9CQUFRLGNBQVIsQ0FBdUIsY0FBYyxDQUFkLEVBQWlCLEdBQWpCLENBQXFCLE9BQXJCLENBQXZCO0FBQ0QsV0FGSSxNQUdBLElBQUksUUFBUSxJQUFSLEtBQWlCLGNBQXJCLEVBQXFDO0FBQ3hDLG9CQUFRLGNBQVIsQ0FBdUIsY0FBYyxDQUFkLEVBQWlCLEdBQWpCLENBQXFCLFFBQXJCLENBQXZCO0FBQ0Q7QUFDRjtBQUNGLE9BN0JEOztBQStCQSxXQUFLLEVBQUwsQ0FBUSxPQUFSLEVBQWlCO0FBQUEsZUFBTSxJQUFOO0FBQUEsT0FBakIsRUFBNkIsWUFBVztBQUN0QyxtQkFBVyxLQUFYO0FBQ0Esd0JBQWdCLElBQWhCO0FBQ0EsbUJBQVcsSUFBWDtBQUNBLHNCQUFjLElBQWQ7QUFDQSxZQUFJLEtBQUosQ0FBVSxNQUFWLENBQWlCLE9BQU8sSUFBUCxDQUFZLG9CQUFaLENBQWpCO0FBQ0EsK0JBQXVCLEVBQXZCO0FBQ0QsT0FQRDtBQVFELEtBakdJO0FBa0dMLFlBQVEsZ0JBQVMsT0FBVCxFQUFrQixJQUFsQixFQUF3QjtBQUM5QixjQUFRLFVBQVIsQ0FBbUIsTUFBbkIsR0FBNEIscUJBQXFCLFFBQVEsVUFBUixDQUFtQixFQUF4QyxJQUE4QyxNQUE5QyxHQUF1RCxPQUFuRjtBQUNBLFVBQUksUUFBUSxVQUFSLENBQW1CLE1BQW5CLEtBQThCLE1BQTlCLElBQXdDLFFBQVEsUUFBUixDQUFpQixJQUFqQixLQUEwQixPQUF0RSxFQUErRTtBQUM3RSxrQkFBVSxPQUFWLEVBQW1CLEtBQW5CLEVBQTBCLElBQTFCLEVBQWdDLElBQUksR0FBcEMsRUFBeUMsRUFBekM7QUFDRDtBQUNELFdBQUssT0FBTDtBQUNEO0FBeEdJLEdBQVA7QUEwR0QsQ0E1SUQ7Ozs7O0FDSEEsSUFBSSxNQUFNLFFBQVEsS0FBUixDQUFWOztBQUVBLElBQU0saUJBQWlCO0FBQ3JCLGVBQWEsZUFEUTtBQUVyQixZQUFVLFVBRlc7QUFHckIsZUFBYSxJQUhRO0FBSXJCLDBCQUF3QixJQUpIO0FBS3JCLFVBQVEsUUFBUSxhQUFSLENBTGE7QUFNckIsWUFBVTtBQU5XLENBQXZCOztBQVNBLElBQU0sZUFBZTtBQUNuQixTQUFPLElBRFk7QUFFbkIsZUFBYSxJQUZNO0FBR25CLFdBQVMsSUFIVTtBQUluQixTQUFPO0FBSlksQ0FBckI7O0FBT0EsSUFBTSxlQUFlO0FBQ25CLFNBQU8sS0FEWTtBQUVuQixlQUFhLEtBRk07QUFHbkIsV0FBUyxLQUhVO0FBSW5CLFNBQU87QUFKWSxDQUFyQjs7QUFPQSxPQUFPLE9BQVAsR0FBaUIsWUFBbUM7QUFBQSxNQUExQixPQUEwQix5REFBaEIsRUFBQyxVQUFVLEVBQVgsRUFBZ0I7OztBQUVsRCxNQUFJLFFBQVEsc0JBQVIsS0FBbUMsS0FBdkMsRUFBOEM7QUFDNUMsWUFBUSxRQUFSLEdBQW1CLE9BQU8sTUFBUCxDQUFjLFlBQWQsRUFBNEIsUUFBUSxRQUFwQyxDQUFuQjtBQUNELEdBRkQsTUFFTztBQUNMLFlBQVEsUUFBUixHQUFtQixPQUFPLE1BQVAsQ0FBYyxZQUFkLEVBQTRCLFFBQVEsUUFBcEMsQ0FBbkI7QUFDRDs7QUFFRCxZQUFVLE9BQU8sTUFBUCxDQUFjLGNBQWQsRUFBOEIsT0FBOUIsQ0FBVjs7QUFFQSxVQUFRLE1BQVIsR0FBaUIsUUFBUSxNQUFSLENBQWUsTUFBZixDQUFzQixVQUFDLElBQUQsRUFBTyxLQUFQLEVBQWlCO0FBQ3RELFVBQU0sRUFBTixHQUFXLE1BQU0sRUFBTixJQUFZLEtBQXZCO0FBQ0EsUUFBSSxNQUFNLE1BQVYsRUFBa0I7QUFDaEIsV0FBSyxJQUFMLENBQVUsS0FBVjtBQUNELEtBRkQsTUFHSztBQUNILFVBQUksS0FBSyxNQUFNLEVBQWY7QUFDQSxZQUFNLEVBQU4sR0FBYyxFQUFkO0FBQ0EsWUFBTSxNQUFOLEdBQWUsb0JBQWY7QUFDQSxXQUFLLElBQUwsQ0FBVSxLQUFLLEtBQUwsQ0FBVyxLQUFLLFNBQUwsQ0FBZSxLQUFmLENBQVgsQ0FBVjs7QUFFQSxZQUFNLEVBQU4sR0FBYyxFQUFkO0FBQ0EsWUFBTSxNQUFOLEdBQWUscUJBQWY7QUFDQSxXQUFLLElBQUwsQ0FBVSxLQUFLLEtBQUwsQ0FBVyxLQUFLLFNBQUwsQ0FBZSxLQUFmLENBQVgsQ0FBVjtBQUNEOztBQUVELFdBQU8sSUFBUDtBQUNELEdBakJnQixFQWlCZCxFQWpCYyxDQUFqQjs7QUFtQkEsU0FBTyxPQUFQO0FBQ0QsQ0E5QkQ7Ozs7O0FDekJBLE9BQU8sT0FBUCxHQUFpQixTQUFTLE1BQVQsR0FBa0I7QUFBQTs7QUFDakMsTUFBSSxlQUFlLEtBQUssR0FBTCxDQUFTLEdBQVQsSUFBZ0IsS0FBSyxHQUFMLENBQVMsR0FBVCxDQUFhLFNBQWIsQ0FBdUIsb0JBQXZCLE1BQWlELFNBQXBGO0FBQ0EsTUFBSSxZQUFKLEVBQWtCO0FBQUEsUUFDWixJQURZO0FBQUEsUUFNWixTQU5ZO0FBQUEsUUFPWixVQVBZOztBQUFBOztBQUNaLGFBQU8sTUFBSyxHQUFMLENBQVMsTUFBVCxDQUFnQixlQUFoQixFQURLOztBQUVoQixZQUFLLEdBQUwsQ0FBUyxFQUFULENBQVksUUFBWixDQUFxQjtBQUNuQixjQUFNO0FBRGEsT0FBckI7O0FBSUksa0JBQVksRUFOQTtBQU9aLG1CQUFhLEVBUEQ7OztBQVNoQixVQUFJLE1BQUssT0FBVCxFQUFrQjtBQUNoQixxQkFBYSxNQUFLLFVBQWxCO0FBQ0QsT0FGRCxNQUdLO0FBQ0gsb0JBQVksTUFBSyxVQUFMLENBQWdCLE1BQWhCLENBQXVCO0FBQUEsaUJBQU0sTUFBSyxRQUFMLENBQWMsRUFBZCxNQUFzQixTQUE1QjtBQUFBLFNBQXZCLENBQVo7QUFDQSxxQkFBYSxNQUFLLE9BQUwsQ0FBYSxHQUFiLENBQWlCLE1BQWpCLENBQXdCLFNBQVMsVUFBVCxDQUFvQixPQUFwQixFQUE2QjtBQUNoRSxpQkFBTyxRQUFRLFVBQVIsQ0FBbUIsRUFBbkIsSUFBeUIsVUFBVSxPQUFWLENBQWtCLFFBQVEsVUFBUixDQUFtQixFQUFyQyxNQUE2QyxDQUFDLENBQXZFLElBQTRFLEtBQUssUUFBTCxDQUFjLFFBQVEsVUFBUixDQUFtQixFQUFqQyxNQUF5QyxTQUE1SDtBQUNELFNBRm9DLENBRW5DLElBRm1DLE9BQXhCLEVBRUMsR0FGRCxDQUVLO0FBQUEsaUJBQVcsUUFBUSxVQUFSLENBQW1CLEVBQTlCO0FBQUEsU0FGTCxDQUFiO0FBR0Q7O0FBRUQsWUFBSyxPQUFMLENBQWEsR0FBYixHQUFtQixFQUFuQjtBQUNBLFVBQUksZ0JBQWdCLE1BQUssT0FBTCxDQUFhLElBQWIsQ0FBa0IsTUFBdEM7QUFDQSxZQUFLLE9BQUwsQ0FBYSxJQUFiLEdBQW9CLE1BQUssT0FBTCxHQUFlLEVBQWYsR0FBb0IsTUFBSyxPQUFMLENBQWEsSUFBYixDQUFrQixNQUFsQixDQUF5QixTQUFTLGdCQUFULENBQTBCLE9BQTFCLEVBQW1DO0FBQ2xHLFlBQUksS0FBSyxRQUFRLFVBQVIsQ0FBbUIsRUFBbkIsSUFBeUIsUUFBUSxVQUFSLENBQW1CLE1BQXJEO0FBQ0EsZUFBTyxVQUFVLE9BQVYsQ0FBa0IsRUFBbEIsTUFBMEIsQ0FBQyxDQUFsQztBQUNELE9BSHVDLENBQXhDOztBQUtBLFVBQUksVUFBVSxFQUFkO0FBQ0EsZ0JBQVUsTUFBVixDQUFpQixVQUFqQixFQUE2QixHQUE3QixDQUFpQyxTQUFTLGtCQUFULENBQTRCLEVBQTVCLEVBQWdDO0FBQy9ELFlBQUksVUFBVSxPQUFWLENBQWtCLEVBQWxCLElBQXdCLENBQUMsQ0FBN0IsRUFBZ0M7QUFDOUIsaUJBQU8sRUFBQyxRQUFRLEtBQVQsRUFBZ0IsTUFBTSxFQUF0QixFQUFQO0FBQ0QsU0FGRCxNQUdLO0FBQ0gsaUJBQU8sRUFBQyxRQUFRLE1BQVQsRUFBaUIsTUFBTSxFQUF2QixFQUFQO0FBQ0Q7QUFDRixPQVBELEVBT0csT0FQSCxDQU9XLFNBQVMsbUJBQVQsQ0FBNkIsTUFBN0IsRUFBcUM7QUFBQSxZQUN6QyxFQUR5QyxHQUMzQixNQUQyQixDQUN6QyxFQUR5QztBQUFBLFlBQ3JDLE1BRHFDLEdBQzNCLE1BRDJCLENBQ3JDLE1BRHFDOztBQUU5QyxZQUFJLFVBQVUsS0FBSyxRQUFMLENBQWMsRUFBZCxDQUFkO0FBQ0EsWUFBSSxrQkFBa0IsUUFBUSxRQUFSLENBQWlCLElBQWpCLENBQXRCOztBQUVBLFlBQUksV0FBVyxLQUFYLElBQW9CLFFBQVEsT0FBUixFQUF4QixFQUEyQztBQUN6QyxrQkFBUSxJQUFSLENBQWEsUUFBUSxTQUFSLEVBQWI7QUFDRDs7QUFFRCxhQUFLLEdBQUwsQ0FBUyxNQUFULENBQWdCLGlCQUFoQixDQUFrQyxlQUFsQyxFQUFtRCxTQUFTLGdCQUFULENBQTBCLE9BQTFCLEVBQW1DO0FBQ3BGLGVBQUssT0FBTCxDQUFhLE1BQWIsRUFBcUIsSUFBckIsQ0FBMEIsT0FBMUI7QUFDRCxTQUZrRCxDQUVqRCxJQUZpRCxDQUU1QyxJQUY0QyxDQUFuRDtBQUdELE9BWlUsQ0FZVCxJQVpTLE9BUFg7O0FBcUJBLFVBQUksa0JBQWtCLE1BQUssT0FBTCxDQUFhLElBQWIsQ0FBa0IsTUFBeEMsRUFBZ0Q7QUFDOUMsY0FBSyxHQUFMLENBQVMsR0FBVCxDQUFhLFNBQWIsQ0FBdUIscUJBQXZCLEVBQThDLE9BQTlDLENBQXNEO0FBQ3BELGdCQUFNLG1CQUQ4QztBQUVwRCxvQkFBVSxNQUFLLE9BQUwsQ0FBYTtBQUY2QixTQUF0RDtBQUlEOztBQUVELFlBQUssR0FBTCxDQUFTLEdBQVQsQ0FBYSxTQUFiLENBQXVCLG9CQUF2QixFQUE2QyxPQUE3QyxDQUFxRDtBQUNuRCxjQUFNLG1CQUQ2QztBQUVuRCxrQkFBVSxNQUFLLE9BQUwsQ0FBYTtBQUY0QixPQUFyRDs7QUFLQSxVQUFJLFFBQVEsTUFBWixFQUFvQjtBQUNsQixjQUFLLEdBQUwsQ0FBUyxHQUFULENBQWEsSUFBYixDQUFrQixjQUFsQixFQUFrQyxFQUFDLFVBQVUsT0FBWCxFQUFsQztBQUNEO0FBOURlO0FBZ0VqQjtBQUNELE9BQUssT0FBTCxHQUFlLEtBQWY7QUFDQSxPQUFLLFVBQUwsR0FBa0IsRUFBbEI7QUFDRCxDQXJFRDs7Ozs7QUNBQSxJQUFJLFNBQVMsUUFBUSxVQUFSLENBQWI7QUFDQSxJQUFJLFFBQVEsUUFBUSxTQUFSLENBQVo7QUFDQSxJQUFJLEtBQUssUUFBUSxNQUFSLENBQVQ7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLFVBQVMsR0FBVCxFQUFjOztBQUU3QixNQUFJLE1BQUosR0FBYSxPQUFPLEdBQVAsQ0FBYjs7QUFFQSxNQUFJLEdBQUosR0FBVSxJQUFWO0FBQ0EsTUFBSSxTQUFKLEdBQWdCLElBQWhCO0FBQ0EsTUFBSSxLQUFKLEdBQVksSUFBWjtBQUNBLEtBQUcsR0FBSDs7QUFFQSxNQUFJLFFBQVE7QUFDVixXQUFPLGVBQVMsR0FBVCxFQUFjO0FBQ2pCLFVBQUksR0FBSixHQUFVLEdBQVY7QUFDQSxZQUFNLEtBQU4sQ0FBWSxHQUFaO0FBQ0EsYUFBTyxJQUFQO0FBQ0gsS0FMUztBQU1WLFlBQVEsa0JBQVc7QUFDakIsWUFBTSxZQUFOO0FBQ0EsVUFBSSxFQUFKLENBQU8sYUFBUDtBQUNBLFVBQUksTUFBSixDQUFXLG9CQUFYO0FBQ0EsVUFBSSxHQUFKLEdBQVUsSUFBVjtBQUNBLFVBQUksU0FBSixHQUFnQixJQUFoQjtBQUNBLFVBQUksS0FBSixHQUFZLElBQVo7QUFDQSxhQUFPLElBQVA7QUFDRCxLQWRTO0FBZVYsV0FBTyxlQUFTLEdBQVQsRUFBYztBQUNuQixVQUFJLFNBQUosR0FBZ0IsSUFBSSxZQUFKLEVBQWhCO0FBQ0EsVUFBSSxLQUFKLEdBQVksSUFBSSxLQUFKLENBQVUsR0FBVixDQUFaOztBQUVBLFVBQUksRUFBSixDQUFPLFVBQVA7O0FBRUEsVUFBSSxJQUFJLEtBQUosQ0FBVSxNQUFWLEVBQUosRUFBd0I7O0FBQ3RCLFlBQUksTUFBSixDQUFXLGlCQUFYO0FBQ0EsY0FBTSxTQUFOO0FBQ0QsT0FIRCxNQUdPO0FBQ0wsWUFBSSxFQUFKLENBQU8sTUFBUCxFQUFlLFlBQU07QUFDbkIsY0FBSSxNQUFKLENBQVcsaUJBQVg7QUFDQSxnQkFBTSxTQUFOO0FBQ0QsU0FIRDtBQUlEO0FBQ0YsS0E5QlM7QUErQlYsZUFBVyxxQkFBVzs7QUFFcEIsVUFBSSxHQUFKLENBQVEsU0FBUixDQUFrQixxQkFBbEIsRUFBeUM7QUFDdkMsY0FBTTtBQUNKLGdCQUFNLG1CQURGO0FBRUosb0JBQVU7QUFGTixTQURpQztBQUt2QyxjQUFNO0FBTGlDLE9BQXpDOzs7QUFTQSxVQUFJLEdBQUosQ0FBUSxTQUFSLENBQWtCLG9CQUFsQixFQUF3QztBQUN0QyxjQUFNO0FBQ0osZ0JBQU0sbUJBREY7QUFFSixvQkFBVTtBQUZOLFNBRGdDO0FBS3RDLGNBQU07QUFMZ0MsT0FBeEM7O0FBUUEsVUFBSSxPQUFKLENBQVksTUFBWixDQUFtQixPQUFuQixDQUEyQixpQkFBUztBQUNsQyxZQUFJLEdBQUosQ0FBUSxRQUFSLENBQWlCLEtBQWpCO0FBQ0QsT0FGRDs7QUFJQSxVQUFJLEtBQUosQ0FBVSxNQUFWO0FBQ0QsS0F2RFM7QUF3RFYsa0JBQWMsd0JBQVc7QUFDdkIsVUFBSSxPQUFKLENBQVksTUFBWixDQUFtQixPQUFuQixDQUEyQixpQkFBUztBQUNsQyxZQUFJLEdBQUosQ0FBUSxXQUFSLENBQW9CLE1BQU0sRUFBMUI7QUFDRCxPQUZEOztBQUlBLFVBQUksR0FBSixDQUFRLFlBQVIsQ0FBcUIscUJBQXJCO0FBQ0EsVUFBSSxHQUFKLENBQVEsWUFBUixDQUFxQixvQkFBckI7QUFDRDtBQS9EUyxHQUFaOztBQWtFQSxTQUFPLEtBQVA7QUFDRCxDQTVFRDs7Ozs7ZUNKaUIsUUFBUSxZQUFSLEM7O0lBQVosUSxZQUFBLFE7O0FBQ0wsSUFBSSxTQUFTLFFBQVEsVUFBUixDQUFiOztBQUVBLElBQUksUUFBUSxPQUFPLE9BQVAsR0FBaUIsVUFBUyxHQUFULEVBQWM7QUFDekMsT0FBSyxHQUFMLEdBQVcsR0FBWDtBQUNBLE9BQUssUUFBTCxHQUFnQixFQUFoQjtBQUNBLE9BQUssVUFBTCxHQUFrQixFQUFsQjtBQUNBLE9BQUssT0FBTCxHQUFlO0FBQ2IsU0FBSyxFQURRO0FBRWIsVUFBTTtBQUZPLEdBQWY7QUFJQSxPQUFLLE1BQUwsR0FBYyxTQUFTLE1BQVQsRUFBaUIsRUFBakIsRUFBcUIsSUFBckIsQ0FBZDs7QUFFQSxPQUFLLE9BQUwsR0FBZSxLQUFmO0FBQ0EsT0FBSyxVQUFMLEdBQWtCLEVBQWxCO0FBQ0QsQ0FaRDs7QUFjQSxNQUFNLFNBQU4sQ0FBZ0IsUUFBaEIsR0FBMkIsWUFBVztBQUNwQyxPQUFLLE9BQUwsR0FBZSxJQUFmO0FBQ0QsQ0FGRDs7QUFJQSxNQUFNLFNBQU4sQ0FBZ0IsY0FBaEIsR0FBaUMsVUFBUyxFQUFULEVBQWE7QUFDNUMsTUFBSSxLQUFLLFVBQUwsQ0FBZ0IsT0FBaEIsQ0FBd0IsRUFBeEIsTUFBZ0MsQ0FBQyxDQUFyQyxFQUF3QztBQUN0QyxTQUFLLFVBQUwsQ0FBZ0IsSUFBaEIsQ0FBcUIsRUFBckI7QUFDRDtBQUNGLENBSkQ7O0FBTUEsTUFBTSxTQUFOLENBQWdCLEdBQWhCLEdBQXNCLFVBQVMsT0FBVCxFQUFrQjtBQUN0QyxPQUFLLGNBQUwsQ0FBb0IsUUFBUSxFQUE1QjtBQUNBLE9BQUssUUFBTCxDQUFjLFFBQVEsRUFBdEIsSUFBNEIsT0FBNUI7QUFDQSxNQUFJLEtBQUssVUFBTCxDQUFnQixPQUFoQixDQUF3QixRQUFRLEVBQWhDLE1BQXdDLENBQUMsQ0FBN0MsRUFBZ0Q7QUFDOUMsU0FBSyxVQUFMLENBQWdCLElBQWhCLENBQXFCLFFBQVEsRUFBN0I7QUFDRDtBQUNELFNBQU8sUUFBUSxFQUFmO0FBQ0QsQ0FQRDs7QUFTQSxNQUFNLFNBQU4sQ0FBZ0IsR0FBaEIsR0FBc0IsVUFBUyxFQUFULEVBQWE7QUFDakMsU0FBTyxLQUFLLFFBQUwsQ0FBYyxFQUFkLENBQVA7QUFDRCxDQUZEOztBQUlBLE1BQU0sU0FBTixDQUFnQixNQUFoQixHQUF5QixZQUFXO0FBQUE7O0FBQ2xDLFNBQU8sT0FBTyxJQUFQLENBQVksS0FBSyxRQUFqQixFQUEyQixHQUEzQixDQUErQjtBQUFBLFdBQU0sTUFBSyxRQUFMLENBQWMsRUFBZCxDQUFOO0FBQUEsR0FBL0IsQ0FBUDtBQUNELENBRkQ7O0FBSUEsTUFBTSxTQUFOLENBQWdCLE1BQWhCLEdBQXlCLFVBQVUsR0FBVixFQUFlO0FBQUE7O0FBQ3RDLE1BQUksVUFBVSxFQUFkO0FBQ0EsTUFBSSxPQUFKLENBQVksVUFBQyxFQUFELEVBQVE7QUFDbEIsUUFBSSxNQUFNLE9BQUssVUFBTCxDQUFnQixPQUFoQixDQUF3QixFQUF4QixDQUFWO0FBQ0EsUUFBSSxRQUFRLENBQUMsQ0FBYixFQUFnQjtBQUNkLFVBQUksVUFBVSxPQUFLLEdBQUwsQ0FBUyxFQUFULENBQWQ7QUFDQSxjQUFRLElBQVIsQ0FBYSxRQUFRLFNBQVIsRUFBYjtBQUNBLGFBQU8sT0FBSyxRQUFMLENBQWMsRUFBZCxDQUFQO0FBQ0EsYUFBSyxVQUFMLENBQWdCLE1BQWhCLENBQXVCLEdBQXZCLEVBQTRCLENBQTVCO0FBQ0Q7QUFDRixHQVJEOztBQVVBLE1BQUksUUFBUSxNQUFSLEdBQWlCLENBQXJCLEVBQXdCO0FBQ3RCLFNBQUssT0FBTCxHQUFlLElBQWY7QUFDQSxTQUFLLEdBQUwsQ0FBUyxHQUFULENBQWEsSUFBYixDQUFrQixjQUFsQixFQUFrQyxFQUFDLFlBQVcsT0FBWixFQUFsQztBQUNEO0FBQ0YsQ0FoQkQ7Ozs7O0FDNUNBLElBQU0sUUFBUSxRQUFRLGFBQVIsQ0FBZDs7ZUFDcUIsUUFBUSxZQUFSLEM7O0lBQWhCLFksWUFBQSxZOzs7QUFFTCxPQUFPLE9BQVAsR0FBaUIsVUFBUyxHQUFULEVBQWM7O0FBRTdCLE1BQUksVUFBVSxFQUFkOztBQUVBLE1BQUksZUFBZTtBQUNqQixVQUFNLElBRFc7QUFFakIsYUFBUyxJQUZRO0FBR2pCLFdBQU87QUFIVSxHQUFuQjs7QUFNQSxNQUFJLFlBQVk7QUFDZCxVQUFNLElBRFE7QUFFZCxhQUFTLElBRks7QUFHZCxXQUFPO0FBSE8sR0FBaEI7O0FBTUEsTUFBSSxhQUFhLENBQUMsTUFBRCxFQUFTLFNBQVQsRUFBb0IsT0FBcEIsQ0FBakI7O0FBRUEsTUFBSSxTQUFTLFNBQVQsTUFBUyxHQUFNO0FBQ2pCLFFBQUksSUFBSSxTQUFSLEVBQW1COztBQUVqQixVQUFJLFNBQVMsRUFBYjtBQUNBLFVBQUksTUFBTSxFQUFWOztBQUVBLFVBQUksWUFBWSxFQUFoQjs7QUFFQSxnQkFBVSxPQUFWLEdBQW9CLFVBQVUsS0FBVixLQUFvQixNQUFwQixHQUE2QixJQUE3QixHQUFvQyxVQUFVLE9BQWxFOztBQUVBLGlCQUFXLE9BQVgsQ0FBbUIsVUFBUyxJQUFULEVBQWU7QUFDaEMsa0JBQVUsSUFBVixDQUFlLE9BQU8sR0FBUCxHQUFhLFVBQVUsSUFBVixDQUE1QjtBQUNBLFlBQUksVUFBVSxJQUFWLE1BQW9CLGFBQWEsSUFBYixDQUF4QixFQUE0QztBQUMxQyxpQkFBTyxJQUFQLENBQVksT0FBTyxHQUFQLEdBQWEsYUFBYSxJQUFiLENBQXpCO0FBQ0EsY0FBSSxVQUFVLElBQVYsTUFBb0IsSUFBeEIsRUFBOEI7QUFDNUIsZ0JBQUksSUFBSixDQUFTLE9BQU8sR0FBUCxHQUFhLFVBQVUsSUFBVixDQUF0QjtBQUNEO0FBQ0Y7QUFDRixPQVJEOztBQVVBLFVBQUksT0FBTyxNQUFYLEVBQW1CO0FBQ2pCLFlBQUksU0FBSixDQUFjLFNBQWQsQ0FBd0IsTUFBeEIsQ0FBK0IsS0FBL0IsQ0FBcUMsSUFBSSxTQUFKLENBQWMsU0FBbkQsRUFBOEQsTUFBOUQ7QUFDQSxZQUFJLFNBQUosQ0FBYyxTQUFkLENBQXdCLEdBQXhCLENBQTRCLEtBQTVCLENBQWtDLElBQUksU0FBSixDQUFjLFNBQWhELEVBQTJELEdBQTNEO0FBQ0Q7O0FBRUQsaUJBQVcsT0FBWCxDQUFtQixnQkFBUTtBQUN6QixxQkFBYSxJQUFiLElBQXFCLFVBQVUsSUFBVixDQUFyQjtBQUNELE9BRkQ7QUFHRDtBQUNGLEdBN0JEOztBQStCQSxNQUFJLEVBQUosR0FBUztBQUNQLGNBQVUsa0JBQVMsSUFBVCxFQUFlO0FBQ3JCLGlCQUFXLE9BQVgsQ0FBbUIsZ0JBQVE7QUFDM0IsWUFBSSxLQUFLLElBQUwsQ0FBSixFQUFnQjtBQUNkLG9CQUFVLElBQVYsSUFBa0IsS0FBSyxJQUFMLENBQWxCO0FBQ0EsY0FBSSxVQUFVLElBQVYsTUFBb0IsYUFBYSxJQUFiLENBQXhCLEVBQTRDO0FBQzFDO0FBQ0Q7QUFDRjtBQUNGLE9BUEM7QUFRSCxLQVZNO0FBV1AsZ0JBQVksc0JBQVc7QUFDckIsVUFBSSxlQUFlLDhCQUFuQjtBQUNBLFVBQUksV0FBVyxJQUFJLE9BQUosQ0FBWSxRQUEzQjtBQUNBLFVBQUksVUFBVSxnQkFBZDtBQUNFLGNBQVEsSUFBSSxPQUFKLENBQVksUUFBcEI7QUFDRSxhQUFLLFVBQUw7QUFDQSxhQUFLLFdBQUw7QUFDQSxhQUFLLGFBQUw7QUFDQSxhQUFLLGNBQUw7QUFDRSxxQkFBVyxJQUFJLE9BQUosQ0FBWSxRQUF2QjtBQUNBO0FBQ0Y7QUFDRSxxQkFBVyxVQUFYO0FBUko7O0FBV0EsVUFBSSxtQkFBbUIsSUFBSSxTQUFKLENBQWMsc0JBQWQsQ0FBcUMsT0FBckMsRUFBOEMsQ0FBOUMsQ0FBdkI7QUFDQSxVQUFJLGVBQWUsaUJBQWlCLHNCQUFqQixDQUF3QyxxQkFBeEMsRUFBK0QsQ0FBL0QsQ0FBbkI7QUFDQSxVQUFJLENBQUMsWUFBTCxFQUFtQjtBQUNqQix1QkFBZSxTQUFTLGFBQVQsQ0FBdUIsS0FBdkIsQ0FBZjtBQUNBLHFCQUFhLFNBQWIsR0FBeUIsbUNBQXpCOztBQUVBLFlBQUkscUJBQXFCLGlCQUFpQixzQkFBakIsQ0FBd0Msc0JBQXhDLEVBQWdFLENBQWhFLENBQXpCO0FBQ0EsWUFBSSxrQkFBSixFQUF3QjtBQUN0QiwyQkFBaUIsWUFBakIsQ0FBOEIsWUFBOUIsRUFBNEMsa0JBQTVDO0FBQ0QsU0FGRCxNQUdLO0FBQ0gsMkJBQWlCLFdBQWpCLENBQTZCLFlBQTdCO0FBQ0Q7QUFDRjs7QUFFRCxVQUFJLFNBQVMsV0FBYixFQUEwQjtBQUN4QixnQkFBUSxNQUFNLElBQWQsSUFBc0IsYUFBYSxZQUFiLEVBQTJCO0FBQy9DLHFCQUFjLFlBQWQseUJBRCtDO0FBRS9DLHVDQUEwQixJQUFJLE9BQUosQ0FBWSxXQUFaLElBQTJCLEtBQXJELENBRitDO0FBRy9DLGNBQUk7QUFBQSxtQkFBTSxJQUFJLEdBQUosQ0FBUSxVQUFSLENBQW1CLGtCQUFuQixDQUFOO0FBQUE7QUFIMkMsU0FBM0IsRUFJbkIsWUFKbUIsQ0FBdEI7QUFLRDs7QUFFRCxVQUFJLFNBQVMsTUFBTSxPQUFmLENBQUosRUFBNkI7QUFDM0IsZ0JBQVEsTUFBTSxPQUFkLElBQXlCLGFBQWEsWUFBYixFQUEyQjtBQUNsRCxxQkFBYyxZQUFkLDRCQURrRDtBQUVsRCxvQ0FBdUIsSUFBSSxPQUFKLENBQVksV0FBWixJQUEyQixLQUFsRCxDQUZrRDtBQUdsRCxjQUFJO0FBQUEsbUJBQU0sSUFBSSxHQUFKLENBQVEsVUFBUixDQUFtQixjQUFuQixDQUFOO0FBQUE7QUFIOEMsU0FBM0IsRUFJdEIsWUFKc0IsQ0FBekI7QUFLRDs7QUFFRCxVQUFJLFNBQVMsTUFBTSxLQUFmLENBQUosRUFBMkI7QUFDekIsZ0JBQVEsTUFBTSxLQUFkLElBQXVCLGFBQWEsWUFBYixFQUEyQjtBQUNoRCxxQkFBYyxZQUFkLDBCQURnRDtBQUVoRCxtQ0FBc0IsSUFBSSxPQUFKLENBQVksV0FBWixJQUEyQixLQUFqRCxDQUZnRDtBQUdoRCxjQUFJO0FBQUEsbUJBQU0sSUFBSSxHQUFKLENBQVEsVUFBUixDQUFtQixZQUFuQixDQUFOO0FBQUE7QUFINEMsU0FBM0IsRUFJcEIsWUFKb0IsQ0FBdkI7QUFLRDs7QUFFRCxVQUFJLFNBQVMsS0FBYixFQUFvQjtBQUNsQixnQkFBUSxLQUFSLEdBQWdCLGFBQWEsWUFBYixFQUEyQjtBQUN6QyxxQkFBYyxZQUFkLDBCQUR5QztBQUV6QyxpQkFBTyxRQUZrQztBQUd6QyxjQUFJLGNBQVc7QUFDYixnQkFBSSxHQUFKLENBQVEsS0FBUjtBQUNBLGdCQUFJLEVBQUosQ0FBTyxpQkFBUCxDQUF5QixPQUF6QjtBQUNEO0FBTndDLFNBQTNCLEVBT2IsWUFQYSxDQUFoQjtBQVFEO0FBQ0YsS0EzRUk7QUE0RUwscUJBQWlCLHlCQUFTLEVBQVQsRUFBYTtBQUM1QixVQUFJLFFBQVEsRUFBUixLQUFlLE9BQU8sT0FBMUIsRUFBbUM7QUFDL0IsZ0JBQVEsRUFBUixFQUFZLFNBQVosQ0FBc0IsR0FBdEIsQ0FBMEIsUUFBMUI7QUFDSDtBQUNGLEtBaEZJO0FBaUZMLHVCQUFtQiwyQkFBUyxFQUFULEVBQWE7QUFDOUIsVUFBSSxRQUFRLEVBQVIsQ0FBSixFQUFpQjtBQUNmLGdCQUFRLEVBQVIsRUFBWSxTQUFaLENBQXNCLE1BQXRCLENBQTZCLFFBQTdCO0FBQ0Q7QUFDRixLQXJGSTtBQXNGTCxvQkFBZ0IsMEJBQVc7QUFDekIsVUFBSSxZQUFZLE9BQU8sSUFBUCxDQUFZLE9BQVosQ0FBaEI7O0FBRUEsZ0JBQVUsT0FBVixDQUFrQixvQkFBWTtBQUM1QixZQUFJLGFBQWEsT0FBakIsRUFBMEI7QUFDeEIsY0FBSSxTQUFTLFFBQVEsUUFBUixDQUFiO0FBQ0EsaUJBQU8sU0FBUCxDQUFpQixNQUFqQixDQUF3QixRQUF4QjtBQUNEO0FBQ0YsT0FMRDtBQU1ELEtBL0ZJO0FBZ0dMLG1CQUFlLHlCQUFXO0FBQ3hCLFVBQUksWUFBWSxPQUFPLElBQVAsQ0FBWSxPQUFaLENBQWhCOztBQUVBLGdCQUFVLE9BQVYsQ0FBa0Isb0JBQVk7QUFDNUIsWUFBSSxTQUFTLFFBQVEsUUFBUixDQUFiO0FBQ0EsWUFBSSxPQUFPLFVBQVgsRUFBdUI7QUFDckIsaUJBQU8sVUFBUCxDQUFrQixXQUFsQixDQUE4QixNQUE5QjtBQUNEO0FBQ0QsZ0JBQVEsUUFBUixJQUFvQixJQUFwQjtBQUNELE9BTkQ7QUFPRDtBQTFHSSxHQUFUO0FBNEdELENBN0pEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxucmVxdWlyZSgnLi9zcmMvbGliL3BvbHlmaWxscycpO1xudmFyIFNldHVwID0gcmVxdWlyZSgnLi9zcmMvc2V0dXAnKTtcbnZhciBPcHRpb25zID0gcmVxdWlyZSgnLi9zcmMvb3B0aW9ucycpO1xudmFyIEFQSSA9IHJlcXVpcmUoJy4vc3JjL2FwaScpO1xuY29uc3QgdHlwZXMgPSByZXF1aXJlKCcuL3NyYy9saWIvdHlwZXMnKTtcblxudmFyIERyYXcgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBPcHRpb25zKG9wdGlvbnMpO1xuXG4gIHZhciBjdHggPSB7XG4gICAgb3B0aW9uczogb3B0aW9uc1xuICB9O1xuXG4gIHZhciBhcGkgPSBBUEkoY3R4KTtcbiAgY3R4LmFwaSA9IGFwaTtcblxuICB2YXIgc2V0dXAgPSBTZXR1cChjdHgpO1xuICBhcGkuYWRkVG8gPSBzZXR1cC5hZGRUbztcbiAgYXBpLnJlbW92ZSA9IHNldHVwLnJlbW92ZTtcbiAgYXBpLnR5cGVzID0gdHlwZXM7XG4gIGFwaS5vcHRpb25zID0gb3B0aW9ucztcblxuICByZXR1cm4gYXBpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEcmF3O1xuXG53aW5kb3cubWFwYm94Z2wgPSB3aW5kb3cubWFwYm94Z2wgfHwge307XG53aW5kb3cubWFwYm94Z2wuRHJhdyA9IERyYXc7XG4iLG51bGwsInZhciB3Z3M4NCA9IHJlcXVpcmUoJ3dnczg0Jyk7XG5cbm1vZHVsZS5leHBvcnRzLmdlb21ldHJ5ID0gZ2VvbWV0cnk7XG5tb2R1bGUuZXhwb3J0cy5yaW5nID0gcmluZ0FyZWE7XG5cbmZ1bmN0aW9uIGdlb21ldHJ5KF8pIHtcbiAgICB2YXIgYXJlYSA9IDAsIGk7XG4gICAgc3dpdGNoIChfLnR5cGUpIHtcbiAgICAgICAgY2FzZSAnUG9seWdvbic6XG4gICAgICAgICAgICByZXR1cm4gcG9seWdvbkFyZWEoXy5jb29yZGluYXRlcyk7XG4gICAgICAgIGNhc2UgJ011bHRpUG9seWdvbic6XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgXy5jb29yZGluYXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGFyZWEgKz0gcG9seWdvbkFyZWEoXy5jb29yZGluYXRlc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXJlYTtcbiAgICAgICAgY2FzZSAnUG9pbnQnOlxuICAgICAgICBjYXNlICdNdWx0aVBvaW50JzpcbiAgICAgICAgY2FzZSAnTGluZVN0cmluZyc6XG4gICAgICAgIGNhc2UgJ011bHRpTGluZVN0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgY2FzZSAnR2VvbWV0cnlDb2xsZWN0aW9uJzpcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBfLmdlb21ldHJpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBhcmVhICs9IGdlb21ldHJ5KF8uZ2VvbWV0cmllc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXJlYTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHBvbHlnb25BcmVhKGNvb3Jkcykge1xuICAgIHZhciBhcmVhID0gMDtcbiAgICBpZiAoY29vcmRzICYmIGNvb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGFyZWEgKz0gTWF0aC5hYnMocmluZ0FyZWEoY29vcmRzWzBdKSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmVhIC09IE1hdGguYWJzKHJpbmdBcmVhKGNvb3Jkc1tpXSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcmVhO1xufVxuXG4vKipcbiAqIENhbGN1bGF0ZSB0aGUgYXBwcm94aW1hdGUgYXJlYSBvZiB0aGUgcG9seWdvbiB3ZXJlIGl0IHByb2plY3RlZCBvbnRvXG4gKiAgICAgdGhlIGVhcnRoLiAgTm90ZSB0aGF0IHRoaXMgYXJlYSB3aWxsIGJlIHBvc2l0aXZlIGlmIHJpbmcgaXMgb3JpZW50ZWRcbiAqICAgICBjbG9ja3dpc2UsIG90aGVyd2lzZSBpdCB3aWxsIGJlIG5lZ2F0aXZlLlxuICpcbiAqIFJlZmVyZW5jZTpcbiAqIFJvYmVydC4gRy4gQ2hhbWJlcmxhaW4gYW5kIFdpbGxpYW0gSC4gRHVxdWV0dGUsIFwiU29tZSBBbGdvcml0aG1zIGZvclxuICogICAgIFBvbHlnb25zIG9uIGEgU3BoZXJlXCIsIEpQTCBQdWJsaWNhdGlvbiAwNy0wMywgSmV0IFByb3B1bHNpb25cbiAqICAgICBMYWJvcmF0b3J5LCBQYXNhZGVuYSwgQ0EsIEp1bmUgMjAwNyBodHRwOi8vdHJzLW5ldy5qcGwubmFzYS5nb3YvZHNwYWNlL2hhbmRsZS8yMDE0LzQwNDA5XG4gKlxuICogUmV0dXJuczpcbiAqIHtmbG9hdH0gVGhlIGFwcHJveGltYXRlIHNpZ25lZCBnZW9kZXNpYyBhcmVhIG9mIHRoZSBwb2x5Z29uIGluIHNxdWFyZVxuICogICAgIG1ldGVycy5cbiAqL1xuXG5mdW5jdGlvbiByaW5nQXJlYShjb29yZHMpIHtcbiAgICB2YXIgcDEsIHAyLCBwMywgbG93ZXJJbmRleCwgbWlkZGxlSW5kZXgsIHVwcGVySW5kZXgsXG4gICAgYXJlYSA9IDAsXG4gICAgY29vcmRzTGVuZ3RoID0gY29vcmRzLmxlbmd0aDtcblxuICAgIGlmIChjb29yZHNMZW5ndGggPiAyKSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb29yZHNMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGkgPT09IGNvb3Jkc0xlbmd0aCAtIDIpIHsvLyBpID0gTi0yXG4gICAgICAgICAgICAgICAgbG93ZXJJbmRleCA9IGNvb3Jkc0xlbmd0aCAtIDI7XG4gICAgICAgICAgICAgICAgbWlkZGxlSW5kZXggPSBjb29yZHNMZW5ndGggLTE7XG4gICAgICAgICAgICAgICAgdXBwZXJJbmRleCA9IDA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGkgPT09IGNvb3Jkc0xlbmd0aCAtIDEpIHsvLyBpID0gTi0xXG4gICAgICAgICAgICAgICAgbG93ZXJJbmRleCA9IGNvb3Jkc0xlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgbWlkZGxlSW5kZXggPSAwO1xuICAgICAgICAgICAgICAgIHVwcGVySW5kZXggPSAxO1xuICAgICAgICAgICAgfSBlbHNlIHsgLy8gaSA9IDAgdG8gTi0zXG4gICAgICAgICAgICAgICAgbG93ZXJJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgbWlkZGxlSW5kZXggPSBpKzE7XG4gICAgICAgICAgICAgICAgdXBwZXJJbmRleCA9IGkrMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHAxID0gY29vcmRzW2xvd2VySW5kZXhdO1xuICAgICAgICAgICAgcDIgPSBjb29yZHNbbWlkZGxlSW5kZXhdO1xuICAgICAgICAgICAgcDMgPSBjb29yZHNbdXBwZXJJbmRleF07XG4gICAgICAgICAgICBhcmVhICs9ICggcmFkKHAzWzBdKSAtIHJhZChwMVswXSkgKSAqIE1hdGguc2luKCByYWQocDJbMV0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFyZWEgPSBhcmVhICogd2dzODQuUkFESVVTICogd2dzODQuUkFESVVTIC8gMjtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJlYTtcbn1cblxuZnVuY3Rpb24gcmFkKF8pIHtcbiAgICByZXR1cm4gXyAqIE1hdGguUEkgLyAxODA7XG59IiwidmFyIGpzb25saW50ID0gcmVxdWlyZSgnanNvbmxpbnQtbGluZXMnKSxcbiAgZ2VvanNvbkhpbnRPYmplY3QgPSByZXF1aXJlKCcuL29iamVjdCcpO1xuXG4vKipcbiAqIEBhbGlhcyBnZW9qc29uaGludFxuICogQHBhcmFtIHsoc3RyaW5nfG9iamVjdCl9IEdlb0pTT04gZ2l2ZW4gYXMgYSBzdHJpbmcgb3IgYXMgYW4gb2JqZWN0XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5ub0R1cGxpY2F0ZU1lbWJlcnM9dHJ1ZV0gZm9yYmlkIHJlcGVhdGVkXG4gKiBwcm9wZXJ0aWVzLiBUaGlzIGlzIG9ubHkgYXZhaWxhYmxlIGZvciBzdHJpbmcgaW5wdXQsIGJlY2F1c2VkIHBhcnNlZFxuICogT2JqZWN0cyBjYW5ub3QgaGF2ZSBkdXBsaWNhdGUgcHJvcGVydGllcy5cbiAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fSBhbiBhcnJheSBvZiBlcnJvcnNcbiAqL1xuZnVuY3Rpb24gaGludChzdHIsIG9wdGlvbnMpIHtcblxuICAgIHZhciBnaiwgZXJyb3JzID0gW107XG5cbiAgICBpZiAodHlwZW9mIHN0ciA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZ2ogPSBzdHI7XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygc3RyID09PSAnc3RyaW5nJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZ2ogPSBqc29ubGludC5wYXJzZShzdHIpO1xuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIHZhciBtYXRjaCA9IGUubWVzc2FnZS5tYXRjaCgvbGluZSAoXFxkKykvKTtcbiAgICAgICAgICAgIHZhciBsaW5lTnVtYmVyID0gcGFyc2VJbnQobWF0Y2hbMV0sIDEwKTtcbiAgICAgICAgICAgIHJldHVybiBbe1xuICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIgLSAxLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGUubWVzc2FnZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogZVxuICAgICAgICAgICAgfV07XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gW3tcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdFeHBlY3RlZCBzdHJpbmcgb3Igb2JqZWN0IGFzIGlucHV0JyxcbiAgICAgICAgICAgIGxpbmU6IDBcbiAgICAgICAgfV07XG4gICAgfVxuXG4gICAgZXJyb3JzID0gZXJyb3JzLmNvbmNhdChnZW9qc29uSGludE9iamVjdC5oaW50KGdqLCBvcHRpb25zKSk7XG5cbiAgICByZXR1cm4gZXJyb3JzO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5oaW50ID0gaGludDtcbiIsIi8qKlxuICogQGFsaWFzIGdlb2pzb25oaW50XG4gKiBAcGFyYW0geyhzdHJpbmd8b2JqZWN0KX0gR2VvSlNPTiBnaXZlbiBhcyBhIHN0cmluZyBvciBhcyBhbiBvYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLm5vRHVwbGljYXRlTWVtYmVycz10cnVlXSBmb3JiaWQgcmVwZWF0ZWRcbiAqIHByb3BlcnRpZXMuIFRoaXMgaXMgb25seSBhdmFpbGFibGUgZm9yIHN0cmluZyBpbnB1dCwgYmVjYXVzZWQgcGFyc2VkXG4gKiBPYmplY3RzIGNhbm5vdCBoYXZlIGR1cGxpY2F0ZSBwcm9wZXJ0aWVzLlxuICogQHJldHVybnMge0FycmF5PE9iamVjdD59IGFuIGFycmF5IG9mIGVycm9yc1xuICovXG5mdW5jdGlvbiBoaW50KGdqLCBvcHRpb25zKSB7XG5cbiAgICB2YXIgZXJyb3JzID0gW107XG5cbiAgICBmdW5jdGlvbiByb290KF8pIHtcblxuICAgICAgICBpZiAoKCFvcHRpb25zIHx8IG9wdGlvbnMubm9EdXBsaWNhdGVNZW1iZXJzICE9PSBmYWxzZSkgJiZcbiAgICAgICAgICAgXy5fX2R1cGxpY2F0ZVByb3BlcnRpZXNfXykge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdBbiBvYmplY3QgY29udGFpbmVkIGR1cGxpY2F0ZSBtZW1iZXJzLCBtYWtpbmcgcGFyc2luZyBhbWJpZ291czogJyArIF8uX19kdXBsaWNhdGVQcm9wZXJ0aWVzX18uam9pbignLCAnKSxcbiAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghXy50eXBlKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSB0eXBlIHByb3BlcnR5IGlzIHJlcXVpcmVkIGFuZCB3YXMgbm90IGZvdW5kJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICghdHlwZXNbXy50eXBlXSkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgdHlwZSAnICsgXy50eXBlICsgJyBpcyB1bmtub3duJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHR5cGVzW18udHlwZV0oXyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBldmVyeUlzKF8sIHR5cGUpIHtcbiAgICAgICAgLy8gbWFrZSBhIHNpbmdsZSBleGNlcHRpb24gYmVjYXVzZSB0eXBlb2YgbnVsbCA9PT0gJ29iamVjdCdcbiAgICAgICAgcmV0dXJuIF8uZXZlcnkoZnVuY3Rpb24oeCkgeyByZXR1cm4gKHggIT09IG51bGwpICYmICh0eXBlb2YgeCA9PT0gdHlwZSk7IH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlcXVpcmVkUHJvcGVydHkoXywgbmFtZSwgdHlwZSkge1xuICAgICAgICBpZiAodHlwZW9mIF9bbmFtZV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdcIicgKyBuYW1lICsgJ1wiIHByb3BlcnR5IHJlcXVpcmVkJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnYXJyYXknKSB7XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoX1tuYW1lXSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnXCInICsgbmFtZSArXG4gICAgICAgICAgICAgICAgICAgICAgICAnXCIgcHJvcGVydHkgc2hvdWxkIGJlIGFuIGFycmF5LCBidXQgaXMgYW4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAodHlwZW9mIF9bbmFtZV0pICsgJyBpbnN0ZWFkJyxcbiAgICAgICAgICAgICAgICAgICAgbGluZTogXy5fX2xpbmVfX1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgJiYgdHlwZW9mIF9bbmFtZV0gIT09IHR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ1wiJyArIG5hbWUgK1xuICAgICAgICAgICAgICAgICAgICAnXCIgcHJvcGVydHkgc2hvdWxkIGJlICcgKyAodHlwZSkgK1xuICAgICAgICAgICAgICAgICAgICAnLCBidXQgaXMgYW4gJyArICh0eXBlb2YgX1tuYW1lXSkgKyAnIGluc3RlYWQnLFxuICAgICAgICAgICAgICAgIGxpbmU6IF8uX19saW5lX19cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gaHR0cDovL2dlb2pzb24ub3JnL2dlb2pzb24tc3BlYy5odG1sI2ZlYXR1cmUtY29sbGVjdGlvbi1vYmplY3RzXG4gICAgZnVuY3Rpb24gRmVhdHVyZUNvbGxlY3Rpb24oZmVhdHVyZUNvbGxlY3Rpb24pIHtcbiAgICAgICAgY3JzKGZlYXR1cmVDb2xsZWN0aW9uKTtcbiAgICAgICAgYmJveChmZWF0dXJlQ29sbGVjdGlvbik7XG4gICAgICAgIGlmICghcmVxdWlyZWRQcm9wZXJ0eShmZWF0dXJlQ29sbGVjdGlvbiwgJ2ZlYXR1cmVzJywgJ2FycmF5JykpIHtcbiAgICAgICAgICAgIGlmICghZXZlcnlJcyhmZWF0dXJlQ29sbGVjdGlvbi5mZWF0dXJlcywgJ29iamVjdCcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0V2ZXJ5IGZlYXR1cmUgbXVzdCBiZSBhbiBvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBsaW5lOiBmZWF0dXJlQ29sbGVjdGlvbi5fX2xpbmVfX1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmVhdHVyZUNvbGxlY3Rpb24uZmVhdHVyZXMuZm9yRWFjaChGZWF0dXJlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGh0dHA6Ly9nZW9qc29uLm9yZy9nZW9qc29uLXNwZWMuaHRtbCNwb3NpdGlvbnNcbiAgICBmdW5jdGlvbiBwb3NpdGlvbihfLCBsaW5lKSB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShfKSkge1xuICAgICAgICAgICAgcmV0dXJuIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAncG9zaXRpb24gc2hvdWxkIGJlIGFuIGFycmF5LCBpcyBhICcgKyAodHlwZW9mIF8pICtcbiAgICAgICAgICAgICAgICAgICAgJyBpbnN0ZWFkJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fIHx8IGxpbmVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKF8ubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgICAgIHJldHVybiBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdwb3NpdGlvbiBtdXN0IGhhdmUgMiBvciBtb3JlIGVsZW1lbnRzJyxcbiAgICAgICAgICAgICAgICAgICAgbGluZTogXy5fX2xpbmVfXyB8fCBsaW5lXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWV2ZXJ5SXMoXywgJ251bWJlcicpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ2VhY2ggZWxlbWVudCBpbiBhIHBvc2l0aW9uIG11c3QgYmUgYSBudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fIHx8IGxpbmVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBvc2l0aW9uQXJyYXkoY29vcmRzLCB0eXBlLCBkZXB0aCwgbGluZSkge1xuICAgICAgICBpZiAobGluZSA9PT0gdW5kZWZpbmVkICYmIGNvb3Jkcy5fX2xpbmVfXyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsaW5lID0gY29vcmRzLl9fbGluZV9fO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkZXB0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHBvc2l0aW9uKGNvb3JkcywgbGluZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoZGVwdGggPT09IDEgJiYgdHlwZSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAnTGluZWFyUmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGNvb3Jkc1tjb29yZHMubGVuZ3RoIC0gMV0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdhIG51bWJlciB3YXMgZm91bmQgd2hlcmUgYSBjb29yZGluYXRlIGFycmF5IHNob3VsZCBoYXZlIGJlZW4gZm91bmQ6IHRoaXMgbmVlZHMgdG8gYmUgbmVzdGVkIG1vcmUgZGVlcGx5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoY29vcmRzLmxlbmd0aCA8IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnYSBMaW5lYXJSaW5nIG9mIGNvb3JkaW5hdGVzIG5lZWRzIHRvIGhhdmUgZm91ciBvciBtb3JlIHBvc2l0aW9ucycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvb3Jkcy5sZW5ndGggJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIChjb29yZHNbY29vcmRzLmxlbmd0aCAtIDFdLmxlbmd0aCAhPT0gY29vcmRzWzBdLmxlbmd0aCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgIWNvb3Jkc1tjb29yZHMubGVuZ3RoIC0gMV0uZXZlcnkoZnVuY3Rpb24ocG9zaXRpb24sIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29vcmRzWzBdW2luZGV4XSA9PT0gcG9zaXRpb247XG4gICAgICAgICAgICAgICAgICAgIH0pKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICd0aGUgZmlyc3QgYW5kIGxhc3QgcG9zaXRpb25zIGluIGEgTGluZWFyUmluZyBvZiBjb29yZGluYXRlcyBtdXN0IGJlIHRoZSBzYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ0xpbmUnICYmIGNvb3Jkcy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdhIGxpbmUgbmVlZHMgdG8gaGF2ZSB0d28gb3IgbW9yZSBjb29yZGluYXRlcyB0byBiZSB2YWxpZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkoY29vcmRzKSkge1xuICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ2EgbnVtYmVyIHdhcyBmb3VuZCB3aGVyZSBhIGNvb3JkaW5hdGUgYXJyYXkgc2hvdWxkIGhhdmUgYmVlbiBmb3VuZDogdGhpcyBuZWVkcyB0byBiZSBuZXN0ZWQgbW9yZSBkZWVwbHknLFxuICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb25BcnJheShjLCB0eXBlLCBkZXB0aCAtIDEsIGMuX19saW5lX18gfHwgbGluZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcnMoXykge1xuICAgICAgICBpZiAoIV8uY3JzKSByZXR1cm47XG4gICAgICAgIGlmICh0eXBlb2YgXy5jcnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICB2YXIgc3RyRXJyID0gcmVxdWlyZWRQcm9wZXJ0eShfLmNycywgJ3R5cGUnLCAnc3RyaW5nJyksXG4gICAgICAgICAgICAgICAgcHJvcEVyciA9IHJlcXVpcmVkUHJvcGVydHkoXy5jcnMsICdwcm9wZXJ0aWVzJywgJ29iamVjdCcpO1xuICAgICAgICAgICAgaWYgKCFzdHJFcnIgJiYgIXByb3BFcnIpIHtcbiAgICAgICAgICAgICAgICAvLyBodHRwOi8vZ2VvanNvbi5vcmcvZ2VvanNvbi1zcGVjLmh0bWwjbmFtZWQtY3JzXG4gICAgICAgICAgICAgICAgaWYgKF8uY3JzLnR5cGUgPT09ICduYW1lJykge1xuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZFByb3BlcnR5KF8uY3JzLnByb3BlcnRpZXMsICduYW1lJywgJ3N0cmluZycpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5jcnMudHlwZSA9PT0gJ2xpbmsnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkUHJvcGVydHkoXy5jcnMucHJvcGVydGllcywgJ2hyZWYnLCAnc3RyaW5nJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSB0eXBlIG9mIGEgY3JzIG11c3QgYmUgZWl0aGVyIFwibmFtZVwiIG9yIFwibGlua1wiJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IF8uX19saW5lX19cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICd0aGUgdmFsdWUgb2YgdGhlIGNycyBwcm9wZXJ0eSBtdXN0IGJlIGFuIG9iamVjdCwgbm90IGEgJyArICh0eXBlb2YgXy5jcnMpLFxuICAgICAgICAgICAgICAgIGxpbmU6IF8uX19saW5lX19cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYmJveChfKSB7XG4gICAgICAgIGlmICghXy5iYm94KSB7IHJldHVybjsgfVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShfLmJib3gpKSB7XG4gICAgICAgICAgICBpZiAoIWV2ZXJ5SXMoXy5iYm94LCAnbnVtYmVyJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnZWFjaCBlbGVtZW50IGluIGEgYmJveCBwcm9wZXJ0eSBtdXN0IGJlIGEgbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgbGluZTogXy5iYm94Ll9fbGluZV9fXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ2Jib3ggcHJvcGVydHkgbXVzdCBiZSBhbiBhcnJheSBvZiBudW1iZXJzLCBidXQgaXMgYSAnICsgKHR5cGVvZiBfLmJib3gpLFxuICAgICAgICAgICAgICAgIGxpbmU6IF8uX19saW5lX19cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gaHR0cDovL2dlb2pzb24ub3JnL2dlb2pzb24tc3BlYy5odG1sI3BvaW50XG4gICAgZnVuY3Rpb24gUG9pbnQocG9pbnQpIHtcbiAgICAgICAgY3JzKHBvaW50KTtcbiAgICAgICAgYmJveChwb2ludCk7XG4gICAgICAgIGlmICghcmVxdWlyZWRQcm9wZXJ0eShwb2ludCwgJ2Nvb3JkaW5hdGVzJywgJ2FycmF5JykpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uKHBvaW50LmNvb3JkaW5hdGVzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGh0dHA6Ly9nZW9qc29uLm9yZy9nZW9qc29uLXNwZWMuaHRtbCNwb2x5Z29uXG4gICAgZnVuY3Rpb24gUG9seWdvbihwb2x5Z29uKSB7XG4gICAgICAgIGNycyhwb2x5Z29uKTtcbiAgICAgICAgYmJveChwb2x5Z29uKTtcbiAgICAgICAgaWYgKCFyZXF1aXJlZFByb3BlcnR5KHBvbHlnb24sICdjb29yZGluYXRlcycsICdhcnJheScpKSB7XG4gICAgICAgICAgICBwb3NpdGlvbkFycmF5KHBvbHlnb24uY29vcmRpbmF0ZXMsICdMaW5lYXJSaW5nJywgMik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBodHRwOi8vZ2VvanNvbi5vcmcvZ2VvanNvbi1zcGVjLmh0bWwjbXVsdGlwb2x5Z29uXG4gICAgZnVuY3Rpb24gTXVsdGlQb2x5Z29uKG11bHRpUG9seWdvbikge1xuICAgICAgICBjcnMobXVsdGlQb2x5Z29uKTtcbiAgICAgICAgYmJveChtdWx0aVBvbHlnb24pO1xuICAgICAgICBpZiAoIXJlcXVpcmVkUHJvcGVydHkobXVsdGlQb2x5Z29uLCAnY29vcmRpbmF0ZXMnLCAnYXJyYXknKSkge1xuICAgICAgICAgICAgcG9zaXRpb25BcnJheShtdWx0aVBvbHlnb24uY29vcmRpbmF0ZXMsICdMaW5lYXJSaW5nJywgMyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBodHRwOi8vZ2VvanNvbi5vcmcvZ2VvanNvbi1zcGVjLmh0bWwjbGluZXN0cmluZ1xuICAgIGZ1bmN0aW9uIExpbmVTdHJpbmcobGluZVN0cmluZykge1xuICAgICAgICBjcnMobGluZVN0cmluZyk7XG4gICAgICAgIGJib3gobGluZVN0cmluZyk7XG4gICAgICAgIGlmICghcmVxdWlyZWRQcm9wZXJ0eShsaW5lU3RyaW5nLCAnY29vcmRpbmF0ZXMnLCAnYXJyYXknKSkge1xuICAgICAgICAgICAgcG9zaXRpb25BcnJheShsaW5lU3RyaW5nLmNvb3JkaW5hdGVzLCAnTGluZScsIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gaHR0cDovL2dlb2pzb24ub3JnL2dlb2pzb24tc3BlYy5odG1sI211bHRpbGluZXN0cmluZ1xuICAgIGZ1bmN0aW9uIE11bHRpTGluZVN0cmluZyhtdWx0aUxpbmVTdHJpbmcpIHtcbiAgICAgICAgY3JzKG11bHRpTGluZVN0cmluZyk7XG4gICAgICAgIGJib3gobXVsdGlMaW5lU3RyaW5nKTtcbiAgICAgICAgaWYgKCFyZXF1aXJlZFByb3BlcnR5KG11bHRpTGluZVN0cmluZywgJ2Nvb3JkaW5hdGVzJywgJ2FycmF5JykpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uQXJyYXkobXVsdGlMaW5lU3RyaW5nLmNvb3JkaW5hdGVzLCAnTGluZScsIDIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gaHR0cDovL2dlb2pzb24ub3JnL2dlb2pzb24tc3BlYy5odG1sI211bHRpcG9pbnRcbiAgICBmdW5jdGlvbiBNdWx0aVBvaW50KG11bHRpUG9pbnQpIHtcbiAgICAgICAgY3JzKG11bHRpUG9pbnQpO1xuICAgICAgICBiYm94KG11bHRpUG9pbnQpO1xuICAgICAgICBpZiAoIXJlcXVpcmVkUHJvcGVydHkobXVsdGlQb2ludCwgJ2Nvb3JkaW5hdGVzJywgJ2FycmF5JykpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uQXJyYXkobXVsdGlQb2ludC5jb29yZGluYXRlcywgJycsIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gR2VvbWV0cnlDb2xsZWN0aW9uKGdlb21ldHJ5Q29sbGVjdGlvbikge1xuICAgICAgICBjcnMoZ2VvbWV0cnlDb2xsZWN0aW9uKTtcbiAgICAgICAgYmJveChnZW9tZXRyeUNvbGxlY3Rpb24pO1xuICAgICAgICBpZiAoIXJlcXVpcmVkUHJvcGVydHkoZ2VvbWV0cnlDb2xsZWN0aW9uLCAnZ2VvbWV0cmllcycsICdhcnJheScpKSB7XG4gICAgICAgICAgICBpZiAoIWV2ZXJ5SXMoZ2VvbWV0cnlDb2xsZWN0aW9uLmdlb21ldHJpZXMsICdvYmplY3QnKSkge1xuICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBnZW9tZXRyaWVzIGFycmF5IGluIGEgR2VvbWV0cnlDb2xsZWN0aW9uIG11c3QgY29udGFpbiBvbmx5IGdlb21ldHJ5IG9iamVjdHMnLFxuICAgICAgICAgICAgICAgICAgICBsaW5lOiBnZW9tZXRyeUNvbGxlY3Rpb24uX19saW5lX19cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGdlb21ldHJ5Q29sbGVjdGlvbi5nZW9tZXRyaWVzLmZvckVhY2goZnVuY3Rpb24oZ2VvbWV0cnkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZ2VvbWV0cnkpIHJvb3QoZ2VvbWV0cnkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBGZWF0dXJlKGZlYXR1cmUpIHtcbiAgICAgICAgY3JzKGZlYXR1cmUpO1xuICAgICAgICBiYm94KGZlYXR1cmUpO1xuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vZ2VvanNvbi9kcmFmdC1nZW9qc29uL2Jsb2IvbWFzdGVyL21pZGRsZS5ta2QjZmVhdHVyZS1vYmplY3RcbiAgICAgICAgaWYgKGZlYXR1cmUuaWQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgdHlwZW9mIGZlYXR1cmUuaWQgIT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgICB0eXBlb2YgZmVhdHVyZS5pZCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnRmVhdHVyZSBcImlkXCIgcHJvcGVydHkgbXVzdCBoYXZlIGEgc3RyaW5nIG9yIG51bWJlciB2YWx1ZScsXG4gICAgICAgICAgICAgICAgbGluZTogZmVhdHVyZS5fX2xpbmVfX1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZlYXR1cmUudHlwZSAhPT0gJ0ZlYXR1cmUnKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ0dlb0pTT04gZmVhdHVyZXMgbXVzdCBoYXZlIGEgdHlwZT1mZWF0dXJlIHByb3BlcnR5JyxcbiAgICAgICAgICAgICAgICBsaW5lOiBmZWF0dXJlLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXF1aXJlZFByb3BlcnR5KGZlYXR1cmUsICdwcm9wZXJ0aWVzJywgJ29iamVjdCcpO1xuICAgICAgICBpZiAoIXJlcXVpcmVkUHJvcGVydHkoZmVhdHVyZSwgJ2dlb21ldHJ5JywgJ29iamVjdCcpKSB7XG4gICAgICAgICAgICAvLyBodHRwOi8vZ2VvanNvbi5vcmcvZ2VvanNvbi1zcGVjLmh0bWwjZmVhdHVyZS1vYmplY3RzXG4gICAgICAgICAgICAvLyB0b2xlcmF0ZSBudWxsIGdlb21ldHJ5XG4gICAgICAgICAgICBpZiAoZmVhdHVyZS5nZW9tZXRyeSkgcm9vdChmZWF0dXJlLmdlb21ldHJ5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciB0eXBlcyA9IHtcbiAgICAgICAgUG9pbnQ6IFBvaW50LFxuICAgICAgICBGZWF0dXJlOiBGZWF0dXJlLFxuICAgICAgICBNdWx0aVBvaW50OiBNdWx0aVBvaW50LFxuICAgICAgICBMaW5lU3RyaW5nOiBMaW5lU3RyaW5nLFxuICAgICAgICBNdWx0aUxpbmVTdHJpbmc6IE11bHRpTGluZVN0cmluZyxcbiAgICAgICAgRmVhdHVyZUNvbGxlY3Rpb246IEZlYXR1cmVDb2xsZWN0aW9uLFxuICAgICAgICBHZW9tZXRyeUNvbGxlY3Rpb246IEdlb21ldHJ5Q29sbGVjdGlvbixcbiAgICAgICAgUG9seWdvbjogUG9seWdvbixcbiAgICAgICAgTXVsdGlQb2x5Z29uOiBNdWx0aVBvbHlnb25cbiAgICB9O1xuXG4gICAgaWYgKHR5cGVvZiBnaiAhPT0gJ29iamVjdCcgfHxcbiAgICAgICAgZ2ogPT09IG51bGwgfHxcbiAgICAgICAgZ2ogPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHJvb3Qgb2YgYSBHZW9KU09OIG9iamVjdCBtdXN0IGJlIGFuIG9iamVjdC4nLFxuICAgICAgICAgICAgbGluZTogMFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGVycm9ycztcbiAgICB9XG5cbiAgICByb290KGdqKTtcblxuICAgIGVycm9ycy5mb3JFYWNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICBpZiAoZXJyLmhhc093blByb3BlcnR5KCdsaW5lJykgJiYgZXJyLmxpbmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVsZXRlIGVyci5saW5lO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZXJyb3JzO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5oaW50ID0gaGludDtcbiIsInZhciBoYXQgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChiaXRzLCBiYXNlKSB7XG4gICAgaWYgKCFiYXNlKSBiYXNlID0gMTY7XG4gICAgaWYgKGJpdHMgPT09IHVuZGVmaW5lZCkgYml0cyA9IDEyODtcbiAgICBpZiAoYml0cyA8PSAwKSByZXR1cm4gJzAnO1xuICAgIFxuICAgIHZhciBkaWdpdHMgPSBNYXRoLmxvZyhNYXRoLnBvdygyLCBiaXRzKSkgLyBNYXRoLmxvZyhiYXNlKTtcbiAgICBmb3IgKHZhciBpID0gMjsgZGlnaXRzID09PSBJbmZpbml0eTsgaSAqPSAyKSB7XG4gICAgICAgIGRpZ2l0cyA9IE1hdGgubG9nKE1hdGgucG93KDIsIGJpdHMgLyBpKSkgLyBNYXRoLmxvZyhiYXNlKSAqIGk7XG4gICAgfVxuICAgIFxuICAgIHZhciByZW0gPSBkaWdpdHMgLSBNYXRoLmZsb29yKGRpZ2l0cyk7XG4gICAgXG4gICAgdmFyIHJlcyA9ICcnO1xuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgTWF0aC5mbG9vcihkaWdpdHMpOyBpKyspIHtcbiAgICAgICAgdmFyIHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBiYXNlKS50b1N0cmluZyhiYXNlKTtcbiAgICAgICAgcmVzID0geCArIHJlcztcbiAgICB9XG4gICAgXG4gICAgaWYgKHJlbSkge1xuICAgICAgICB2YXIgYiA9IE1hdGgucG93KGJhc2UsIHJlbSk7XG4gICAgICAgIHZhciB4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYikudG9TdHJpbmcoYmFzZSk7XG4gICAgICAgIHJlcyA9IHggKyByZXM7XG4gICAgfVxuICAgIFxuICAgIHZhciBwYXJzZWQgPSBwYXJzZUludChyZXMsIGJhc2UpO1xuICAgIGlmIChwYXJzZWQgIT09IEluZmluaXR5ICYmIHBhcnNlZCA+PSBNYXRoLnBvdygyLCBiaXRzKSkge1xuICAgICAgICByZXR1cm4gaGF0KGJpdHMsIGJhc2UpXG4gICAgfVxuICAgIGVsc2UgcmV0dXJuIHJlcztcbn07XG5cbmhhdC5yYWNrID0gZnVuY3Rpb24gKGJpdHMsIGJhc2UsIGV4cGFuZEJ5KSB7XG4gICAgdmFyIGZuID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIGl0ZXJzID0gMDtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgaWYgKGl0ZXJzICsrID4gMTApIHtcbiAgICAgICAgICAgICAgICBpZiAoZXhwYW5kQnkpIGJpdHMgKz0gZXhwYW5kQnk7XG4gICAgICAgICAgICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ3RvbyBtYW55IElEIGNvbGxpc2lvbnMsIHVzZSBtb3JlIGJpdHMnKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgaWQgPSBoYXQoYml0cywgYmFzZSk7XG4gICAgICAgIH0gd2hpbGUgKE9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKGhhdHMsIGlkKSk7XG4gICAgICAgIFxuICAgICAgICBoYXRzW2lkXSA9IGRhdGE7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9O1xuICAgIHZhciBoYXRzID0gZm4uaGF0cyA9IHt9O1xuICAgIFxuICAgIGZuLmdldCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gZm4uaGF0c1tpZF07XG4gICAgfTtcbiAgICBcbiAgICBmbi5zZXQgPSBmdW5jdGlvbiAoaWQsIHZhbHVlKSB7XG4gICAgICAgIGZuLmhhdHNbaWRdID0gdmFsdWU7XG4gICAgICAgIHJldHVybiBmbjtcbiAgICB9O1xuICAgIFxuICAgIGZuLmJpdHMgPSBiaXRzIHx8IDEyODtcbiAgICBmbi5iYXNlID0gYmFzZSB8fCAxNjtcbiAgICByZXR1cm4gZm47XG59O1xuIiwiLyogcGFyc2VyIGdlbmVyYXRlZCBieSBqaXNvbiAwLjQuMTcgKi9cbi8qXG4gIFJldHVybnMgYSBQYXJzZXIgb2JqZWN0IG9mIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlOlxuXG4gIFBhcnNlcjoge1xuICAgIHl5OiB7fVxuICB9XG5cbiAgUGFyc2VyLnByb3RvdHlwZToge1xuICAgIHl5OiB7fSxcbiAgICB0cmFjZTogZnVuY3Rpb24oKSxcbiAgICBzeW1ib2xzXzoge2Fzc29jaWF0aXZlIGxpc3Q6IG5hbWUgPT0+IG51bWJlcn0sXG4gICAgdGVybWluYWxzXzoge2Fzc29jaWF0aXZlIGxpc3Q6IG51bWJlciA9PT4gbmFtZX0sXG4gICAgcHJvZHVjdGlvbnNfOiBbLi4uXSxcbiAgICBwZXJmb3JtQWN0aW9uOiBmdW5jdGlvbiBhbm9ueW1vdXMoeXl0ZXh0LCB5eWxlbmcsIHl5bGluZW5vLCB5eSwgeXlzdGF0ZSwgJCQsIF8kKSxcbiAgICB0YWJsZTogWy4uLl0sXG4gICAgZGVmYXVsdEFjdGlvbnM6IHsuLi59LFxuICAgIHBhcnNlRXJyb3I6IGZ1bmN0aW9uKHN0ciwgaGFzaCksXG4gICAgcGFyc2U6IGZ1bmN0aW9uKGlucHV0KSxcblxuICAgIGxleGVyOiB7XG4gICAgICAgIEVPRjogMSxcbiAgICAgICAgcGFyc2VFcnJvcjogZnVuY3Rpb24oc3RyLCBoYXNoKSxcbiAgICAgICAgc2V0SW5wdXQ6IGZ1bmN0aW9uKGlucHV0KSxcbiAgICAgICAgaW5wdXQ6IGZ1bmN0aW9uKCksXG4gICAgICAgIHVucHV0OiBmdW5jdGlvbihzdHIpLFxuICAgICAgICBtb3JlOiBmdW5jdGlvbigpLFxuICAgICAgICBsZXNzOiBmdW5jdGlvbihuKSxcbiAgICAgICAgcGFzdElucHV0OiBmdW5jdGlvbigpLFxuICAgICAgICB1cGNvbWluZ0lucHV0OiBmdW5jdGlvbigpLFxuICAgICAgICBzaG93UG9zaXRpb246IGZ1bmN0aW9uKCksXG4gICAgICAgIHRlc3RfbWF0Y2g6IGZ1bmN0aW9uKHJlZ2V4X21hdGNoX2FycmF5LCBydWxlX2luZGV4KSxcbiAgICAgICAgbmV4dDogZnVuY3Rpb24oKSxcbiAgICAgICAgbGV4OiBmdW5jdGlvbigpLFxuICAgICAgICBiZWdpbjogZnVuY3Rpb24oY29uZGl0aW9uKSxcbiAgICAgICAgcG9wU3RhdGU6IGZ1bmN0aW9uKCksXG4gICAgICAgIF9jdXJyZW50UnVsZXM6IGZ1bmN0aW9uKCksXG4gICAgICAgIHRvcFN0YXRlOiBmdW5jdGlvbigpLFxuICAgICAgICBwdXNoU3RhdGU6IGZ1bmN0aW9uKGNvbmRpdGlvbiksXG5cbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgcmFuZ2VzOiBib29sZWFuICAgICAgICAgICAob3B0aW9uYWw6IHRydWUgPT0+IHRva2VuIGxvY2F0aW9uIGluZm8gd2lsbCBpbmNsdWRlIGEgLnJhbmdlW10gbWVtYmVyKVxuICAgICAgICAgICAgZmxleDogYm9vbGVhbiAgICAgICAgICAgICAob3B0aW9uYWw6IHRydWUgPT0+IGZsZXgtbGlrZSBsZXhpbmcgYmVoYXZpb3VyIHdoZXJlIHRoZSBydWxlcyBhcmUgdGVzdGVkIGV4aGF1c3RpdmVseSB0byBmaW5kIHRoZSBsb25nZXN0IG1hdGNoKVxuICAgICAgICAgICAgYmFja3RyYWNrX2xleGVyOiBib29sZWFuICAob3B0aW9uYWw6IHRydWUgPT0+IGxleGVyIHJlZ2V4ZXMgYXJlIHRlc3RlZCBpbiBvcmRlciBhbmQgZm9yIGVhY2ggbWF0Y2hpbmcgcmVnZXggdGhlIGFjdGlvbiBjb2RlIGlzIGludm9rZWQ7IHRoZSBsZXhlciB0ZXJtaW5hdGVzIHRoZSBzY2FuIHdoZW4gYSB0b2tlbiBpcyByZXR1cm5lZCBieSB0aGUgYWN0aW9uIGNvZGUpXG4gICAgICAgIH0sXG5cbiAgICAgICAgcGVyZm9ybUFjdGlvbjogZnVuY3Rpb24oeXksIHl5XywgJGF2b2lkaW5nX25hbWVfY29sbGlzaW9ucywgWVlfU1RBUlQpLFxuICAgICAgICBydWxlczogWy4uLl0sXG4gICAgICAgIGNvbmRpdGlvbnM6IHthc3NvY2lhdGl2ZSBsaXN0OiBuYW1lID09PiBzZXR9LFxuICAgIH1cbiAgfVxuXG5cbiAgdG9rZW4gbG9jYXRpb24gaW5mbyAoQCQsIF8kLCBldGMuKToge1xuICAgIGZpcnN0X2xpbmU6IG4sXG4gICAgbGFzdF9saW5lOiBuLFxuICAgIGZpcnN0X2NvbHVtbjogbixcbiAgICBsYXN0X2NvbHVtbjogbixcbiAgICByYW5nZTogW3N0YXJ0X251bWJlciwgZW5kX251bWJlcl0gICAgICAgKHdoZXJlIHRoZSBudW1iZXJzIGFyZSBpbmRleGVzIGludG8gdGhlIGlucHV0IHN0cmluZywgcmVndWxhciB6ZXJvLWJhc2VkKVxuICB9XG5cblxuICB0aGUgcGFyc2VFcnJvciBmdW5jdGlvbiByZWNlaXZlcyBhICdoYXNoJyBvYmplY3Qgd2l0aCB0aGVzZSBtZW1iZXJzIGZvciBsZXhlciBhbmQgcGFyc2VyIGVycm9yczoge1xuICAgIHRleHQ6ICAgICAgICAobWF0Y2hlZCB0ZXh0KVxuICAgIHRva2VuOiAgICAgICAodGhlIHByb2R1Y2VkIHRlcm1pbmFsIHRva2VuLCBpZiBhbnkpXG4gICAgbGluZTogICAgICAgICh5eWxpbmVubylcbiAgfVxuICB3aGlsZSBwYXJzZXIgKGdyYW1tYXIpIGVycm9ycyB3aWxsIGFsc28gcHJvdmlkZSB0aGVzZSBtZW1iZXJzLCBpLmUuIHBhcnNlciBlcnJvcnMgZGVsaXZlciBhIHN1cGVyc2V0IG9mIGF0dHJpYnV0ZXM6IHtcbiAgICBsb2M6ICAgICAgICAgKHl5bGxvYylcbiAgICBleHBlY3RlZDogICAgKHN0cmluZyBkZXNjcmliaW5nIHRoZSBzZXQgb2YgZXhwZWN0ZWQgdG9rZW5zKVxuICAgIHJlY292ZXJhYmxlOiAoYm9vbGVhbjogVFJVRSB3aGVuIHRoZSBwYXJzZXIgaGFzIGEgZXJyb3IgcmVjb3ZlcnkgcnVsZSBhdmFpbGFibGUgZm9yIHRoaXMgcGFydGljdWxhciBlcnJvcilcbiAgfVxuKi9cbnZhciBqc29ubGludCA9IChmdW5jdGlvbigpe1xudmFyIG89ZnVuY3Rpb24oayx2LG8sbCl7Zm9yKG89b3x8e30sbD1rLmxlbmd0aDtsLS07b1trW2xdXT12KTtyZXR1cm4gb30sJFYwPVsxLDEyXSwkVjE9WzEsMTNdLCRWMj1bMSw5XSwkVjM9WzEsMTBdLCRWND1bMSwxMV0sJFY1PVsxLDE0XSwkVjY9WzEsMTVdLCRWNz1bMTQsMTgsMjIsMjRdLCRWOD1bMTgsMjJdLCRWOT1bMjIsMjRdO1xudmFyIHBhcnNlciA9IHt0cmFjZTogZnVuY3Rpb24gdHJhY2UoKSB7IH0sXG55eToge30sXG5zeW1ib2xzXzoge1wiZXJyb3JcIjoyLFwiSlNPTlN0cmluZ1wiOjMsXCJTVFJJTkdcIjo0LFwiSlNPTk51bWJlclwiOjUsXCJOVU1CRVJcIjo2LFwiSlNPTk51bGxMaXRlcmFsXCI6NyxcIk5VTExcIjo4LFwiSlNPTkJvb2xlYW5MaXRlcmFsXCI6OSxcIlRSVUVcIjoxMCxcIkZBTFNFXCI6MTEsXCJKU09OVGV4dFwiOjEyLFwiSlNPTlZhbHVlXCI6MTMsXCJFT0ZcIjoxNCxcIkpTT05PYmplY3RcIjoxNSxcIkpTT05BcnJheVwiOjE2LFwie1wiOjE3LFwifVwiOjE4LFwiSlNPTk1lbWJlckxpc3RcIjoxOSxcIkpTT05NZW1iZXJcIjoyMCxcIjpcIjoyMSxcIixcIjoyMixcIltcIjoyMyxcIl1cIjoyNCxcIkpTT05FbGVtZW50TGlzdFwiOjI1LFwiJGFjY2VwdFwiOjAsXCIkZW5kXCI6MX0sXG50ZXJtaW5hbHNfOiB7MjpcImVycm9yXCIsNDpcIlNUUklOR1wiLDY6XCJOVU1CRVJcIiw4OlwiTlVMTFwiLDEwOlwiVFJVRVwiLDExOlwiRkFMU0VcIiwxNDpcIkVPRlwiLDE3Olwie1wiLDE4OlwifVwiLDIxOlwiOlwiLDIyOlwiLFwiLDIzOlwiW1wiLDI0OlwiXVwifSxcbnByb2R1Y3Rpb25zXzogWzAsWzMsMV0sWzUsMV0sWzcsMV0sWzksMV0sWzksMV0sWzEyLDJdLFsxMywxXSxbMTMsMV0sWzEzLDFdLFsxMywxXSxbMTMsMV0sWzEzLDFdLFsxNSwyXSxbMTUsM10sWzIwLDNdLFsxOSwxXSxbMTksM10sWzE2LDJdLFsxNiwzXSxbMjUsMV0sWzI1LDNdXSxcbnBlcmZvcm1BY3Rpb246IGZ1bmN0aW9uIGFub255bW91cyh5eXRleHQsIHl5bGVuZywgeXlsaW5lbm8sIHl5LCB5eXN0YXRlIC8qIGFjdGlvblsxXSAqLywgJCQgLyogdnN0YWNrICovLCBfJCAvKiBsc3RhY2sgKi8pIHtcbi8qIHRoaXMgPT0geXl2YWwgKi9cblxudmFyICQwID0gJCQubGVuZ3RoIC0gMTtcbnN3aXRjaCAoeXlzdGF0ZSkge1xuY2FzZSAxOlxuIC8vIHJlcGxhY2UgZXNjYXBlZCBjaGFyYWN0ZXJzIHdpdGggYWN0dWFsIGNoYXJhY3RlclxuICAgICAgICAgIHRoaXMuJCA9IHl5dGV4dC5yZXBsYWNlKC9cXFxcKFxcXFx8XCIpL2csIFwiJFwiK1wiMVwiKVxuICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxuL2csJ1xcbicpXG4gICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXHIvZywnXFxyJylcbiAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcdC9nLCdcXHQnKVxuICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFx2L2csJ1xcdicpXG4gICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXGYvZywnXFxmJylcbiAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcYi9nLCdcXGInKTtcbiAgICAgICAgXG5icmVhaztcbmNhc2UgMjpcbnRoaXMuJCA9IE51bWJlcih5eXRleHQpO1xuYnJlYWs7XG5jYXNlIDM6XG50aGlzLiQgPSBudWxsO1xuYnJlYWs7XG5jYXNlIDQ6XG50aGlzLiQgPSB0cnVlO1xuYnJlYWs7XG5jYXNlIDU6XG50aGlzLiQgPSBmYWxzZTtcbmJyZWFrO1xuY2FzZSA2OlxucmV0dXJuIHRoaXMuJCA9ICQkWyQwLTFdO1xuYnJlYWs7XG5jYXNlIDEzOlxudGhpcy4kID0ge307IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLiQsICdfX2xpbmVfXycsIHtcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLl8kLmZpcnN0X2xpbmUsXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICB9KVxuYnJlYWs7XG5jYXNlIDE0OiBjYXNlIDE5OlxudGhpcy4kID0gJCRbJDAtMV07IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLiQsICdfX2xpbmVfXycsIHtcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLl8kLmZpcnN0X2xpbmUsXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICB9KVxuYnJlYWs7XG5jYXNlIDE1OlxudGhpcy4kID0gWyQkWyQwLTJdLCAkJFskMF1dO1xuYnJlYWs7XG5jYXNlIDE2OlxudGhpcy4kID0ge307IHRoaXMuJFskJFskMF1bMF1dID0gJCRbJDBdWzFdO1xuYnJlYWs7XG5jYXNlIDE3OlxuXG4gICAgICAgICAgICB0aGlzLiQgPSAkJFskMC0yXTtcbiAgICAgICAgICAgIGlmICgkJFskMC0yXVskJFskMF1bMF1dICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuJC5fX2R1cGxpY2F0ZVByb3BlcnRpZXNfXykge1xuICAgICAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcy4kLCAnX19kdXBsaWNhdGVQcm9wZXJ0aWVzX18nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogW10sXG4gICAgICAgICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy4kLl9fZHVwbGljYXRlUHJvcGVydGllc19fLnB1c2goJCRbJDBdWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQkWyQwLTJdWyQkWyQwXVswXV0gPSAkJFskMF1bMV07XG4gICAgICAgIFxuYnJlYWs7XG5jYXNlIDE4OlxudGhpcy4kID0gW107IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLiQsICdfX2xpbmVfXycsIHtcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLl8kLmZpcnN0X2xpbmUsXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICB9KVxuYnJlYWs7XG5jYXNlIDIwOlxudGhpcy4kID0gWyQkWyQwXV07XG5icmVhaztcbmNhc2UgMjE6XG50aGlzLiQgPSAkJFskMC0yXTsgJCRbJDAtMl0ucHVzaCgkJFskMF0pO1xuYnJlYWs7XG59XG59LFxudGFibGU6IFt7Mzo1LDQ6JFYwLDU6Niw2OiRWMSw3OjMsODokVjIsOTo0LDEwOiRWMywxMTokVjQsMTI6MSwxMzoyLDE1OjcsMTY6OCwxNzokVjUsMjM6JFY2fSx7MTpbM119LHsxNDpbMSwxNl19LG8oJFY3LFsyLDddKSxvKCRWNyxbMiw4XSksbygkVjcsWzIsOV0pLG8oJFY3LFsyLDEwXSksbygkVjcsWzIsMTFdKSxvKCRWNyxbMiwxMl0pLG8oJFY3LFsyLDNdKSxvKCRWNyxbMiw0XSksbygkVjcsWzIsNV0pLG8oWzE0LDE4LDIxLDIyLDI0XSxbMiwxXSksbygkVjcsWzIsMl0pLHszOjIwLDQ6JFYwLDE4OlsxLDE3XSwxOToxOCwyMDoxOX0sezM6NSw0OiRWMCw1OjYsNjokVjEsNzozLDg6JFYyLDk6NCwxMDokVjMsMTE6JFY0LDEzOjIzLDE1OjcsMTY6OCwxNzokVjUsMjM6JFY2LDI0OlsxLDIxXSwyNToyMn0sezE6WzIsNl19LG8oJFY3LFsyLDEzXSksezE4OlsxLDI0XSwyMjpbMSwyNV19LG8oJFY4LFsyLDE2XSksezIxOlsxLDI2XX0sbygkVjcsWzIsMThdKSx7MjI6WzEsMjhdLDI0OlsxLDI3XX0sbygkVjksWzIsMjBdKSxvKCRWNyxbMiwxNF0pLHszOjIwLDQ6JFYwLDIwOjI5fSx7Mzo1LDQ6JFYwLDU6Niw2OiRWMSw3OjMsODokVjIsOTo0LDEwOiRWMywxMTokVjQsMTM6MzAsMTU6NywxNjo4LDE3OiRWNSwyMzokVjZ9LG8oJFY3LFsyLDE5XSksezM6NSw0OiRWMCw1OjYsNjokVjEsNzozLDg6JFYyLDk6NCwxMDokVjMsMTE6JFY0LDEzOjMxLDE1OjcsMTY6OCwxNzokVjUsMjM6JFY2fSxvKCRWOCxbMiwxN10pLG8oJFY4LFsyLDE1XSksbygkVjksWzIsMjFdKV0sXG5kZWZhdWx0QWN0aW9uczogezE2OlsyLDZdfSxcbnBhcnNlRXJyb3I6IGZ1bmN0aW9uIHBhcnNlRXJyb3Ioc3RyLCBoYXNoKSB7XG4gICAgaWYgKGhhc2gucmVjb3ZlcmFibGUpIHtcbiAgICAgICAgdGhpcy50cmFjZShzdHIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZ1bmN0aW9uIF9wYXJzZUVycm9yIChtc2csIGhhc2gpIHtcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZSA9IG1zZztcbiAgICAgICAgICAgIHRoaXMuaGFzaCA9IGhhc2g7XG4gICAgICAgIH1cbiAgICAgICAgX3BhcnNlRXJyb3IucHJvdG90eXBlID0gRXJyb3I7XG5cbiAgICAgICAgdGhyb3cgbmV3IF9wYXJzZUVycm9yKHN0ciwgaGFzaCk7XG4gICAgfVxufSxcbnBhcnNlOiBmdW5jdGlvbiBwYXJzZShpbnB1dCkge1xuICAgIHZhciBzZWxmID0gdGhpcywgc3RhY2sgPSBbMF0sIHRzdGFjayA9IFtdLCB2c3RhY2sgPSBbbnVsbF0sIGxzdGFjayA9IFtdLCB0YWJsZSA9IHRoaXMudGFibGUsIHl5dGV4dCA9ICcnLCB5eWxpbmVubyA9IDAsIHl5bGVuZyA9IDAsIHJlY292ZXJpbmcgPSAwLCBURVJST1IgPSAyLCBFT0YgPSAxO1xuICAgIHZhciBhcmdzID0gbHN0YWNrLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICB2YXIgbGV4ZXIgPSBPYmplY3QuY3JlYXRlKHRoaXMubGV4ZXIpO1xuICAgIHZhciBzaGFyZWRTdGF0ZSA9IHsgeXk6IHt9IH07XG4gICAgZm9yICh2YXIgayBpbiB0aGlzLnl5KSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcy55eSwgaykpIHtcbiAgICAgICAgICAgIHNoYXJlZFN0YXRlLnl5W2tdID0gdGhpcy55eVtrXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBsZXhlci5zZXRJbnB1dChpbnB1dCwgc2hhcmVkU3RhdGUueXkpO1xuICAgIHNoYXJlZFN0YXRlLnl5LmxleGVyID0gbGV4ZXI7XG4gICAgc2hhcmVkU3RhdGUueXkucGFyc2VyID0gdGhpcztcbiAgICBpZiAodHlwZW9mIGxleGVyLnl5bGxvYyA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBsZXhlci55eWxsb2MgPSB7fTtcbiAgICB9XG4gICAgdmFyIHl5bG9jID0gbGV4ZXIueXlsbG9jO1xuICAgIGxzdGFjay5wdXNoKHl5bG9jKTtcbiAgICB2YXIgcmFuZ2VzID0gbGV4ZXIub3B0aW9ucyAmJiBsZXhlci5vcHRpb25zLnJhbmdlcztcbiAgICBpZiAodHlwZW9mIHNoYXJlZFN0YXRlLnl5LnBhcnNlRXJyb3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5wYXJzZUVycm9yID0gc2hhcmVkU3RhdGUueXkucGFyc2VFcnJvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnBhcnNlRXJyb3IgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcykucGFyc2VFcnJvcjtcbiAgICB9XG4gICAgZnVuY3Rpb24gcG9wU3RhY2sobikge1xuICAgICAgICBzdGFjay5sZW5ndGggPSBzdGFjay5sZW5ndGggLSAyICogbjtcbiAgICAgICAgdnN0YWNrLmxlbmd0aCA9IHZzdGFjay5sZW5ndGggLSBuO1xuICAgICAgICBsc3RhY2subGVuZ3RoID0gbHN0YWNrLmxlbmd0aCAtIG47XG4gICAgfVxuICAgIF90b2tlbl9zdGFjazpcbiAgICAgICAgdmFyIGxleCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0b2tlbjtcbiAgICAgICAgICAgIHRva2VuID0gbGV4ZXIubGV4KCkgfHwgRU9GO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA9IHNlbGYuc3ltYm9sc19bdG9rZW5dIHx8IHRva2VuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICB9O1xuICAgIHZhciBzeW1ib2wsIHByZUVycm9yU3ltYm9sLCBzdGF0ZSwgYWN0aW9uLCBhLCByLCB5eXZhbCA9IHt9LCBwLCBsZW4sIG5ld1N0YXRlLCBleHBlY3RlZDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBzdGF0ZSA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAodGhpcy5kZWZhdWx0QWN0aW9uc1tzdGF0ZV0pIHtcbiAgICAgICAgICAgIGFjdGlvbiA9IHRoaXMuZGVmYXVsdEFjdGlvbnNbc3RhdGVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCB0eXBlb2Ygc3ltYm9sID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgc3ltYm9sID0gbGV4KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhY3Rpb24gPSB0YWJsZVtzdGF0ZV0gJiYgdGFibGVbc3RhdGVdW3N5bWJvbF07XG4gICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhY3Rpb24gPT09ICd1bmRlZmluZWQnIHx8ICFhY3Rpb24ubGVuZ3RoIHx8ICFhY3Rpb25bMF0pIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyU3RyID0gJyc7XG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHAgaW4gdGFibGVbc3RhdGVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRlcm1pbmFsc19bcF0gJiYgcCA+IFRFUlJPUikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQucHVzaCgnXFwnJyArIHRoaXMudGVybWluYWxzX1twXSArICdcXCcnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobGV4ZXIuc2hvd1Bvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGVyclN0ciA9ICdQYXJzZSBlcnJvciBvbiBsaW5lICcgKyAoeXlsaW5lbm8gKyAxKSArICc6XFxuJyArIGxleGVyLnNob3dQb3NpdGlvbigpICsgJ1xcbkV4cGVjdGluZyAnICsgZXhwZWN0ZWQuam9pbignLCAnKSArICcsIGdvdCBcXCcnICsgKHRoaXMudGVybWluYWxzX1tzeW1ib2xdIHx8IHN5bWJvbCkgKyAnXFwnJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlcnJTdHIgPSAnUGFyc2UgZXJyb3Igb24gbGluZSAnICsgKHl5bGluZW5vICsgMSkgKyAnOiBVbmV4cGVjdGVkICcgKyAoc3ltYm9sID09IEVPRiA/ICdlbmQgb2YgaW5wdXQnIDogJ1xcJycgKyAodGhpcy50ZXJtaW5hbHNfW3N5bWJvbF0gfHwgc3ltYm9sKSArICdcXCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJzZUVycm9yKGVyclN0ciwge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBsZXhlci5tYXRjaCxcbiAgICAgICAgICAgICAgICAgICAgdG9rZW46IHRoaXMudGVybWluYWxzX1tzeW1ib2xdIHx8IHN5bWJvbCxcbiAgICAgICAgICAgICAgICAgICAgbGluZTogbGV4ZXIueXlsaW5lbm8sXG4gICAgICAgICAgICAgICAgICAgIGxvYzogeXlsb2MsXG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBleHBlY3RlZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICBpZiAoYWN0aW9uWzBdIGluc3RhbmNlb2YgQXJyYXkgJiYgYWN0aW9uLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGFyc2UgRXJyb3I6IG11bHRpcGxlIGFjdGlvbnMgcG9zc2libGUgYXQgc3RhdGU6ICcgKyBzdGF0ZSArICcsIHRva2VuOiAnICsgc3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2ggKGFjdGlvblswXSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICBzdGFjay5wdXNoKHN5bWJvbCk7XG4gICAgICAgICAgICB2c3RhY2sucHVzaChsZXhlci55eXRleHQpO1xuICAgICAgICAgICAgbHN0YWNrLnB1c2gobGV4ZXIueXlsbG9jKTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2goYWN0aW9uWzFdKTtcbiAgICAgICAgICAgIHN5bWJvbCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoIXByZUVycm9yU3ltYm9sKSB7XG4gICAgICAgICAgICAgICAgeXlsZW5nID0gbGV4ZXIueXlsZW5nO1xuICAgICAgICAgICAgICAgIHl5dGV4dCA9IGxleGVyLnl5dGV4dDtcbiAgICAgICAgICAgICAgICB5eWxpbmVubyA9IGxleGVyLnl5bGluZW5vO1xuICAgICAgICAgICAgICAgIHl5bG9jID0gbGV4ZXIueXlsbG9jO1xuICAgICAgICAgICAgICAgIGlmIChyZWNvdmVyaW5nID4gMCkge1xuICAgICAgICAgICAgICAgICAgICByZWNvdmVyaW5nLS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzeW1ib2wgPSBwcmVFcnJvclN5bWJvbDtcbiAgICAgICAgICAgICAgICBwcmVFcnJvclN5bWJvbCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgbGVuID0gdGhpcy5wcm9kdWN0aW9uc19bYWN0aW9uWzFdXVsxXTtcbiAgICAgICAgICAgIHl5dmFsLiQgPSB2c3RhY2tbdnN0YWNrLmxlbmd0aCAtIGxlbl07XG4gICAgICAgICAgICB5eXZhbC5fJCA9IHtcbiAgICAgICAgICAgICAgICBmaXJzdF9saW5lOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIChsZW4gfHwgMSldLmZpcnN0X2xpbmUsXG4gICAgICAgICAgICAgICAgbGFzdF9saW5lOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIDFdLmxhc3RfbGluZSxcbiAgICAgICAgICAgICAgICBmaXJzdF9jb2x1bW46IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0uZmlyc3RfY29sdW1uLFxuICAgICAgICAgICAgICAgIGxhc3RfY29sdW1uOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIDFdLmxhc3RfY29sdW1uXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHJhbmdlcykge1xuICAgICAgICAgICAgICAgIHl5dmFsLl8kLnJhbmdlID0gW1xuICAgICAgICAgICAgICAgICAgICBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIChsZW4gfHwgMSldLnJhbmdlWzBdLFxuICAgICAgICAgICAgICAgICAgICBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIDFdLnJhbmdlWzFdXG4gICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHIgPSB0aGlzLnBlcmZvcm1BY3Rpb24uYXBwbHkoeXl2YWwsIFtcbiAgICAgICAgICAgICAgICB5eXRleHQsXG4gICAgICAgICAgICAgICAgeXlsZW5nLFxuICAgICAgICAgICAgICAgIHl5bGluZW5vLFxuICAgICAgICAgICAgICAgIHNoYXJlZFN0YXRlLnl5LFxuICAgICAgICAgICAgICAgIGFjdGlvblsxXSxcbiAgICAgICAgICAgICAgICB2c3RhY2ssXG4gICAgICAgICAgICAgICAgbHN0YWNrXG4gICAgICAgICAgICBdLmNvbmNhdChhcmdzKSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobGVuKSB7XG4gICAgICAgICAgICAgICAgc3RhY2sgPSBzdGFjay5zbGljZSgwLCAtMSAqIGxlbiAqIDIpO1xuICAgICAgICAgICAgICAgIHZzdGFjayA9IHZzdGFjay5zbGljZSgwLCAtMSAqIGxlbik7XG4gICAgICAgICAgICAgICAgbHN0YWNrID0gbHN0YWNrLnNsaWNlKDAsIC0xICogbGVuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YWNrLnB1c2godGhpcy5wcm9kdWN0aW9uc19bYWN0aW9uWzFdXVswXSk7XG4gICAgICAgICAgICB2c3RhY2sucHVzaCh5eXZhbC4kKTtcbiAgICAgICAgICAgIGxzdGFjay5wdXNoKHl5dmFsLl8kKTtcbiAgICAgICAgICAgIG5ld1N0YXRlID0gdGFibGVbc3RhY2tbc3RhY2subGVuZ3RoIC0gMl1dW3N0YWNrW3N0YWNrLmxlbmd0aCAtIDFdXTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobmV3U3RhdGUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufX07XG4vKiBnZW5lcmF0ZWQgYnkgamlzb24tbGV4IDAuMy40ICovXG52YXIgbGV4ZXIgPSAoZnVuY3Rpb24oKXtcbnZhciBsZXhlciA9ICh7XG5cbkVPRjoxLFxuXG5wYXJzZUVycm9yOmZ1bmN0aW9uIHBhcnNlRXJyb3Ioc3RyLCBoYXNoKSB7XG4gICAgICAgIGlmICh0aGlzLnl5LnBhcnNlcikge1xuICAgICAgICAgICAgdGhpcy55eS5wYXJzZXIucGFyc2VFcnJvcihzdHIsIGhhc2gpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHN0cik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4vLyByZXNldHMgdGhlIGxleGVyLCBzZXRzIG5ldyBpbnB1dFxuc2V0SW5wdXQ6ZnVuY3Rpb24gKGlucHV0LCB5eSkge1xuICAgICAgICB0aGlzLnl5ID0geXkgfHwgdGhpcy55eSB8fCB7fTtcbiAgICAgICAgdGhpcy5faW5wdXQgPSBpbnB1dDtcbiAgICAgICAgdGhpcy5fbW9yZSA9IHRoaXMuX2JhY2t0cmFjayA9IHRoaXMuZG9uZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnl5bGluZW5vID0gdGhpcy55eWxlbmcgPSAwO1xuICAgICAgICB0aGlzLnl5dGV4dCA9IHRoaXMubWF0Y2hlZCA9IHRoaXMubWF0Y2ggPSAnJztcbiAgICAgICAgdGhpcy5jb25kaXRpb25TdGFjayA9IFsnSU5JVElBTCddO1xuICAgICAgICB0aGlzLnl5bGxvYyA9IHtcbiAgICAgICAgICAgIGZpcnN0X2xpbmU6IDEsXG4gICAgICAgICAgICBmaXJzdF9jb2x1bW46IDAsXG4gICAgICAgICAgICBsYXN0X2xpbmU6IDEsXG4gICAgICAgICAgICBsYXN0X2NvbHVtbjogMFxuICAgICAgICB9O1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykge1xuICAgICAgICAgICAgdGhpcy55eWxsb2MucmFuZ2UgPSBbMCwwXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9mZnNldCA9IDA7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbi8vIGNvbnN1bWVzIGFuZCByZXR1cm5zIG9uZSBjaGFyIGZyb20gdGhlIGlucHV0XG5pbnB1dDpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjaCA9IHRoaXMuX2lucHV0WzBdO1xuICAgICAgICB0aGlzLnl5dGV4dCArPSBjaDtcbiAgICAgICAgdGhpcy55eWxlbmcrKztcbiAgICAgICAgdGhpcy5vZmZzZXQrKztcbiAgICAgICAgdGhpcy5tYXRjaCArPSBjaDtcbiAgICAgICAgdGhpcy5tYXRjaGVkICs9IGNoO1xuICAgICAgICB2YXIgbGluZXMgPSBjaC5tYXRjaCgvKD86XFxyXFxuP3xcXG4pLiovZyk7XG4gICAgICAgIGlmIChsaW5lcykge1xuICAgICAgICAgICAgdGhpcy55eWxpbmVubysrO1xuICAgICAgICAgICAgdGhpcy55eWxsb2MubGFzdF9saW5lKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5sYXN0X2NvbHVtbisrO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5yYW5nZVsxXSsrO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5faW5wdXQgPSB0aGlzLl9pbnB1dC5zbGljZSgxKTtcbiAgICAgICAgcmV0dXJuIGNoO1xuICAgIH0sXG5cbi8vIHVuc2hpZnRzIG9uZSBjaGFyIChvciBhIHN0cmluZykgaW50byB0aGUgaW5wdXRcbnVucHV0OmZ1bmN0aW9uIChjaCkge1xuICAgICAgICB2YXIgbGVuID0gY2gubGVuZ3RoO1xuICAgICAgICB2YXIgbGluZXMgPSBjaC5zcGxpdCgvKD86XFxyXFxuP3xcXG4pL2cpO1xuXG4gICAgICAgIHRoaXMuX2lucHV0ID0gY2ggKyB0aGlzLl9pbnB1dDtcbiAgICAgICAgdGhpcy55eXRleHQgPSB0aGlzLnl5dGV4dC5zdWJzdHIoMCwgdGhpcy55eXRleHQubGVuZ3RoIC0gbGVuKTtcbiAgICAgICAgLy90aGlzLnl5bGVuZyAtPSBsZW47XG4gICAgICAgIHRoaXMub2Zmc2V0IC09IGxlbjtcbiAgICAgICAgdmFyIG9sZExpbmVzID0gdGhpcy5tYXRjaC5zcGxpdCgvKD86XFxyXFxuP3xcXG4pL2cpO1xuICAgICAgICB0aGlzLm1hdGNoID0gdGhpcy5tYXRjaC5zdWJzdHIoMCwgdGhpcy5tYXRjaC5sZW5ndGggLSAxKTtcbiAgICAgICAgdGhpcy5tYXRjaGVkID0gdGhpcy5tYXRjaGVkLnN1YnN0cigwLCB0aGlzLm1hdGNoZWQubGVuZ3RoIC0gMSk7XG5cbiAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIHRoaXMueXlsaW5lbm8gLT0gbGluZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgciA9IHRoaXMueXlsbG9jLnJhbmdlO1xuXG4gICAgICAgIHRoaXMueXlsbG9jID0ge1xuICAgICAgICAgICAgZmlyc3RfbGluZTogdGhpcy55eWxsb2MuZmlyc3RfbGluZSxcbiAgICAgICAgICAgIGxhc3RfbGluZTogdGhpcy55eWxpbmVubyArIDEsXG4gICAgICAgICAgICBmaXJzdF9jb2x1bW46IHRoaXMueXlsbG9jLmZpcnN0X2NvbHVtbixcbiAgICAgICAgICAgIGxhc3RfY29sdW1uOiBsaW5lcyA/XG4gICAgICAgICAgICAgICAgKGxpbmVzLmxlbmd0aCA9PT0gb2xkTGluZXMubGVuZ3RoID8gdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uIDogMClcbiAgICAgICAgICAgICAgICAgKyBvbGRMaW5lc1tvbGRMaW5lcy5sZW5ndGggLSBsaW5lcy5sZW5ndGhdLmxlbmd0aCAtIGxpbmVzWzBdLmxlbmd0aCA6XG4gICAgICAgICAgICAgIHRoaXMueXlsbG9jLmZpcnN0X2NvbHVtbiAtIGxlblxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5yYW5nZSA9IFtyWzBdLCByWzBdICsgdGhpcy55eWxlbmcgLSBsZW5dO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueXlsZW5nID0gdGhpcy55eXRleHQubGVuZ3RoO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4vLyBXaGVuIGNhbGxlZCBmcm9tIGFjdGlvbiwgY2FjaGVzIG1hdGNoZWQgdGV4dCBhbmQgYXBwZW5kcyBpdCBvbiBuZXh0IGFjdGlvblxubW9yZTpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX21vcmUgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4vLyBXaGVuIGNhbGxlZCBmcm9tIGFjdGlvbiwgc2lnbmFscyB0aGUgbGV4ZXIgdGhhdCB0aGlzIHJ1bGUgZmFpbHMgdG8gbWF0Y2ggdGhlIGlucHV0LCBzbyB0aGUgbmV4dCBtYXRjaGluZyBydWxlIChyZWdleCkgc2hvdWxkIGJlIHRlc3RlZCBpbnN0ZWFkLlxucmVqZWN0OmZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5iYWNrdHJhY2tfbGV4ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX2JhY2t0cmFjayA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZUVycm9yKCdMZXhpY2FsIGVycm9yIG9uIGxpbmUgJyArICh0aGlzLnl5bGluZW5vICsgMSkgKyAnLiBZb3UgY2FuIG9ubHkgaW52b2tlIHJlamVjdCgpIGluIHRoZSBsZXhlciB3aGVuIHRoZSBsZXhlciBpcyBvZiB0aGUgYmFja3RyYWNraW5nIHBlcnN1YXNpb24gKG9wdGlvbnMuYmFja3RyYWNrX2xleGVyID0gdHJ1ZSkuXFxuJyArIHRoaXMuc2hvd1Bvc2l0aW9uKCksIHtcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiLFxuICAgICAgICAgICAgICAgIHRva2VuOiBudWxsLFxuICAgICAgICAgICAgICAgIGxpbmU6IHRoaXMueXlsaW5lbm9cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuLy8gcmV0YWluIGZpcnN0IG4gY2hhcmFjdGVycyBvZiB0aGUgbWF0Y2hcbmxlc3M6ZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgdGhpcy51bnB1dCh0aGlzLm1hdGNoLnNsaWNlKG4pKTtcbiAgICB9LFxuXG4vLyBkaXNwbGF5cyBhbHJlYWR5IG1hdGNoZWQgaW5wdXQsIGkuZS4gZm9yIGVycm9yIG1lc3NhZ2VzXG5wYXN0SW5wdXQ6ZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcGFzdCA9IHRoaXMubWF0Y2hlZC5zdWJzdHIoMCwgdGhpcy5tYXRjaGVkLmxlbmd0aCAtIHRoaXMubWF0Y2gubGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIChwYXN0Lmxlbmd0aCA+IDIwID8gJy4uLic6JycpICsgcGFzdC5zdWJzdHIoLTIwKS5yZXBsYWNlKC9cXG4vZywgXCJcIik7XG4gICAgfSxcblxuLy8gZGlzcGxheXMgdXBjb21pbmcgaW5wdXQsIGkuZS4gZm9yIGVycm9yIG1lc3NhZ2VzXG51cGNvbWluZ0lucHV0OmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5leHQgPSB0aGlzLm1hdGNoO1xuICAgICAgICBpZiAobmV4dC5sZW5ndGggPCAyMCkge1xuICAgICAgICAgICAgbmV4dCArPSB0aGlzLl9pbnB1dC5zdWJzdHIoMCwgMjAtbmV4dC5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAobmV4dC5zdWJzdHIoMCwyMCkgKyAobmV4dC5sZW5ndGggPiAyMCA/ICcuLi4nIDogJycpKS5yZXBsYWNlKC9cXG4vZywgXCJcIik7XG4gICAgfSxcblxuLy8gZGlzcGxheXMgdGhlIGNoYXJhY3RlciBwb3NpdGlvbiB3aGVyZSB0aGUgbGV4aW5nIGVycm9yIG9jY3VycmVkLCBpLmUuIGZvciBlcnJvciBtZXNzYWdlc1xuc2hvd1Bvc2l0aW9uOmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHByZSA9IHRoaXMucGFzdElucHV0KCk7XG4gICAgICAgIHZhciBjID0gbmV3IEFycmF5KHByZS5sZW5ndGggKyAxKS5qb2luKFwiLVwiKTtcbiAgICAgICAgcmV0dXJuIHByZSArIHRoaXMudXBjb21pbmdJbnB1dCgpICsgXCJcXG5cIiArIGMgKyBcIl5cIjtcbiAgICB9LFxuXG4vLyB0ZXN0IHRoZSBsZXhlZCB0b2tlbjogcmV0dXJuIEZBTFNFIHdoZW4gbm90IGEgbWF0Y2gsIG90aGVyd2lzZSByZXR1cm4gdG9rZW5cbnRlc3RfbWF0Y2g6ZnVuY3Rpb24gKG1hdGNoLCBpbmRleGVkX3J1bGUpIHtcbiAgICAgICAgdmFyIHRva2VuLFxuICAgICAgICAgICAgbGluZXMsXG4gICAgICAgICAgICBiYWNrdXA7XG5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5iYWNrdHJhY2tfbGV4ZXIpIHtcbiAgICAgICAgICAgIC8vIHNhdmUgY29udGV4dFxuICAgICAgICAgICAgYmFja3VwID0ge1xuICAgICAgICAgICAgICAgIHl5bGluZW5vOiB0aGlzLnl5bGluZW5vLFxuICAgICAgICAgICAgICAgIHl5bGxvYzoge1xuICAgICAgICAgICAgICAgICAgICBmaXJzdF9saW5lOiB0aGlzLnl5bGxvYy5maXJzdF9saW5lLFxuICAgICAgICAgICAgICAgICAgICBsYXN0X2xpbmU6IHRoaXMubGFzdF9saW5lLFxuICAgICAgICAgICAgICAgICAgICBmaXJzdF9jb2x1bW46IHRoaXMueXlsbG9jLmZpcnN0X2NvbHVtbixcbiAgICAgICAgICAgICAgICAgICAgbGFzdF9jb2x1bW46IHRoaXMueXlsbG9jLmxhc3RfY29sdW1uXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB5eXRleHQ6IHRoaXMueXl0ZXh0LFxuICAgICAgICAgICAgICAgIG1hdGNoOiB0aGlzLm1hdGNoLFxuICAgICAgICAgICAgICAgIG1hdGNoZXM6IHRoaXMubWF0Y2hlcyxcbiAgICAgICAgICAgICAgICBtYXRjaGVkOiB0aGlzLm1hdGNoZWQsXG4gICAgICAgICAgICAgICAgeXlsZW5nOiB0aGlzLnl5bGVuZyxcbiAgICAgICAgICAgICAgICBvZmZzZXQ6IHRoaXMub2Zmc2V0LFxuICAgICAgICAgICAgICAgIF9tb3JlOiB0aGlzLl9tb3JlLFxuICAgICAgICAgICAgICAgIF9pbnB1dDogdGhpcy5faW5wdXQsXG4gICAgICAgICAgICAgICAgeXk6IHRoaXMueXksXG4gICAgICAgICAgICAgICAgY29uZGl0aW9uU3RhY2s6IHRoaXMuY29uZGl0aW9uU3RhY2suc2xpY2UoMCksXG4gICAgICAgICAgICAgICAgZG9uZTogdGhpcy5kb25lXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHtcbiAgICAgICAgICAgICAgICBiYWNrdXAueXlsbG9jLnJhbmdlID0gdGhpcy55eWxsb2MucmFuZ2Uuc2xpY2UoMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsaW5lcyA9IG1hdGNoWzBdLm1hdGNoKC8oPzpcXHJcXG4/fFxcbikuKi9nKTtcbiAgICAgICAgaWYgKGxpbmVzKSB7XG4gICAgICAgICAgICB0aGlzLnl5bGluZW5vICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnl5bGxvYyA9IHtcbiAgICAgICAgICAgIGZpcnN0X2xpbmU6IHRoaXMueXlsbG9jLmxhc3RfbGluZSxcbiAgICAgICAgICAgIGxhc3RfbGluZTogdGhpcy55eWxpbmVubyArIDEsXG4gICAgICAgICAgICBmaXJzdF9jb2x1bW46IHRoaXMueXlsbG9jLmxhc3RfY29sdW1uLFxuICAgICAgICAgICAgbGFzdF9jb2x1bW46IGxpbmVzID9cbiAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXS5sZW5ndGggLSBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXS5tYXRjaCgvXFxyP1xcbj8vKVswXS5sZW5ndGggOlxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMueXlsbG9jLmxhc3RfY29sdW1uICsgbWF0Y2hbMF0ubGVuZ3RoXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMueXl0ZXh0ICs9IG1hdGNoWzBdO1xuICAgICAgICB0aGlzLm1hdGNoICs9IG1hdGNoWzBdO1xuICAgICAgICB0aGlzLm1hdGNoZXMgPSBtYXRjaDtcbiAgICAgICAgdGhpcy55eWxlbmcgPSB0aGlzLnl5dGV4dC5sZW5ndGg7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5yYW5nZSA9IFt0aGlzLm9mZnNldCwgdGhpcy5vZmZzZXQgKz0gdGhpcy55eWxlbmddO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX21vcmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fYmFja3RyYWNrID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2lucHV0ID0gdGhpcy5faW5wdXQuc2xpY2UobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgdGhpcy5tYXRjaGVkICs9IG1hdGNoWzBdO1xuICAgICAgICB0b2tlbiA9IHRoaXMucGVyZm9ybUFjdGlvbi5jYWxsKHRoaXMsIHRoaXMueXksIHRoaXMsIGluZGV4ZWRfcnVsZSwgdGhpcy5jb25kaXRpb25TdGFja1t0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgaWYgKHRoaXMuZG9uZSAmJiB0aGlzLl9pbnB1dCkge1xuICAgICAgICAgICAgdGhpcy5kb25lID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRva2VuKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYmFja3RyYWNrKSB7XG4gICAgICAgICAgICAvLyByZWNvdmVyIGNvbnRleHRcbiAgICAgICAgICAgIGZvciAodmFyIGsgaW4gYmFja3VwKSB7XG4gICAgICAgICAgICAgICAgdGhpc1trXSA9IGJhY2t1cFtrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gcnVsZSBhY3Rpb24gY2FsbGVkIHJlamVjdCgpIGltcGx5aW5nIHRoZSBuZXh0IHJ1bGUgc2hvdWxkIGJlIHRlc3RlZCBpbnN0ZWFkLlxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuXG4vLyByZXR1cm4gbmV4dCBtYXRjaCBpbiBpbnB1dFxubmV4dDpmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmRvbmUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLkVPRjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuX2lucHV0KSB7XG4gICAgICAgICAgICB0aGlzLmRvbmUgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRva2VuLFxuICAgICAgICAgICAgbWF0Y2gsXG4gICAgICAgICAgICB0ZW1wTWF0Y2gsXG4gICAgICAgICAgICBpbmRleDtcbiAgICAgICAgaWYgKCF0aGlzLl9tb3JlKSB7XG4gICAgICAgICAgICB0aGlzLnl5dGV4dCA9ICcnO1xuICAgICAgICAgICAgdGhpcy5tYXRjaCA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIHZhciBydWxlcyA9IHRoaXMuX2N1cnJlbnRSdWxlcygpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0ZW1wTWF0Y2ggPSB0aGlzLl9pbnB1dC5tYXRjaCh0aGlzLnJ1bGVzW3J1bGVzW2ldXSk7XG4gICAgICAgICAgICBpZiAodGVtcE1hdGNoICYmICghbWF0Y2ggfHwgdGVtcE1hdGNoWzBdLmxlbmd0aCA+IG1hdGNoWzBdLmxlbmd0aCkpIHtcbiAgICAgICAgICAgICAgICBtYXRjaCA9IHRlbXBNYXRjaDtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5iYWNrdHJhY2tfbGV4ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4gPSB0aGlzLnRlc3RfbWF0Y2godGVtcE1hdGNoLCBydWxlc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbiAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9iYWNrdHJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTsgLy8gcnVsZSBhY3Rpb24gY2FsbGVkIHJlamVjdCgpIGltcGx5aW5nIGEgcnVsZSBNSVNtYXRjaC5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVsc2U6IHRoaXMgaXMgYSBsZXhlciBydWxlIHdoaWNoIGNvbnN1bWVzIGlucHV0IHdpdGhvdXQgcHJvZHVjaW5nIGEgdG9rZW4gKGUuZy4gd2hpdGVzcGFjZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMub3B0aW9ucy5mbGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIHRva2VuID0gdGhpcy50ZXN0X21hdGNoKG1hdGNoLCBydWxlc1tpbmRleF0pO1xuICAgICAgICAgICAgaWYgKHRva2VuICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGVsc2U6IHRoaXMgaXMgYSBsZXhlciBydWxlIHdoaWNoIGNvbnN1bWVzIGlucHV0IHdpdGhvdXQgcHJvZHVjaW5nIGEgdG9rZW4gKGUuZy4gd2hpdGVzcGFjZSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5faW5wdXQgPT09IFwiXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLkVPRjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcnNlRXJyb3IoJ0xleGljYWwgZXJyb3Igb24gbGluZSAnICsgKHRoaXMueXlsaW5lbm8gKyAxKSArICcuIFVucmVjb2duaXplZCB0ZXh0LlxcbicgKyB0aGlzLnNob3dQb3NpdGlvbigpLCB7XG4gICAgICAgICAgICAgICAgdGV4dDogXCJcIixcbiAgICAgICAgICAgICAgICB0b2tlbjogbnVsbCxcbiAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLnl5bGluZW5vXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbi8vIHJldHVybiBuZXh0IG1hdGNoIHRoYXQgaGFzIGEgdG9rZW5cbmxleDpmdW5jdGlvbiBsZXgoKSB7XG4gICAgICAgIHZhciByID0gdGhpcy5uZXh0KCk7XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxleCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuLy8gYWN0aXZhdGVzIGEgbmV3IGxleGVyIGNvbmRpdGlvbiBzdGF0ZSAocHVzaGVzIHRoZSBuZXcgbGV4ZXIgY29uZGl0aW9uIHN0YXRlIG9udG8gdGhlIGNvbmRpdGlvbiBzdGFjaylcbmJlZ2luOmZ1bmN0aW9uIGJlZ2luKGNvbmRpdGlvbikge1xuICAgICAgICB0aGlzLmNvbmRpdGlvblN0YWNrLnB1c2goY29uZGl0aW9uKTtcbiAgICB9LFxuXG4vLyBwb3AgdGhlIHByZXZpb3VzbHkgYWN0aXZlIGxleGVyIGNvbmRpdGlvbiBzdGF0ZSBvZmYgdGhlIGNvbmRpdGlvbiBzdGFja1xucG9wU3RhdGU6ZnVuY3Rpb24gcG9wU3RhdGUoKSB7XG4gICAgICAgIHZhciBuID0gdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGggLSAxO1xuICAgICAgICBpZiAobiA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvblN0YWNrLnBvcCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZGl0aW9uU3RhY2tbMF07XG4gICAgICAgIH1cbiAgICB9LFxuXG4vLyBwcm9kdWNlIHRoZSBsZXhlciBydWxlIHNldCB3aGljaCBpcyBhY3RpdmUgZm9yIHRoZSBjdXJyZW50bHkgYWN0aXZlIGxleGVyIGNvbmRpdGlvbiBzdGF0ZVxuX2N1cnJlbnRSdWxlczpmdW5jdGlvbiBfY3VycmVudFJ1bGVzKCkge1xuICAgICAgICBpZiAodGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGggJiYgdGhpcy5jb25kaXRpb25TdGFja1t0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aCAtIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25kaXRpb25zW3RoaXMuY29uZGl0aW9uU3RhY2tbdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGggLSAxXV0ucnVsZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25kaXRpb25zW1wiSU5JVElBTFwiXS5ydWxlcztcbiAgICAgICAgfVxuICAgIH0sXG5cbi8vIHJldHVybiB0aGUgY3VycmVudGx5IGFjdGl2ZSBsZXhlciBjb25kaXRpb24gc3RhdGU7IHdoZW4gYW4gaW5kZXggYXJndW1lbnQgaXMgcHJvdmlkZWQgaXQgcHJvZHVjZXMgdGhlIE4tdGggcHJldmlvdXMgY29uZGl0aW9uIHN0YXRlLCBpZiBhdmFpbGFibGVcbnRvcFN0YXRlOmZ1bmN0aW9uIHRvcFN0YXRlKG4pIHtcbiAgICAgICAgbiA9IHRoaXMuY29uZGl0aW9uU3RhY2subGVuZ3RoIC0gMSAtIE1hdGguYWJzKG4gfHwgMCk7XG4gICAgICAgIGlmIChuID49IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvblN0YWNrW25dO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFwiSU5JVElBTFwiO1xuICAgICAgICB9XG4gICAgfSxcblxuLy8gYWxpYXMgZm9yIGJlZ2luKGNvbmRpdGlvbilcbnB1c2hTdGF0ZTpmdW5jdGlvbiBwdXNoU3RhdGUoY29uZGl0aW9uKSB7XG4gICAgICAgIHRoaXMuYmVnaW4oY29uZGl0aW9uKTtcbiAgICB9LFxuXG4vLyByZXR1cm4gdGhlIG51bWJlciBvZiBzdGF0ZXMgY3VycmVudGx5IG9uIHRoZSBzdGFja1xuc3RhdGVTdGFja1NpemU6ZnVuY3Rpb24gc3RhdGVTdGFja1NpemUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aDtcbiAgICB9LFxub3B0aW9uczoge30sXG5wZXJmb3JtQWN0aW9uOiBmdW5jdGlvbiBhbm9ueW1vdXMoeXkseXlfLCRhdm9pZGluZ19uYW1lX2NvbGxpc2lvbnMsWVlfU1RBUlQpIHtcbnZhciBZWVNUQVRFPVlZX1NUQVJUO1xuc3dpdGNoKCRhdm9pZGluZ19uYW1lX2NvbGxpc2lvbnMpIHtcbmNhc2UgMDovKiBza2lwIHdoaXRlc3BhY2UgKi9cbmJyZWFrO1xuY2FzZSAxOnJldHVybiA2XG5icmVhaztcbmNhc2UgMjp5eV8ueXl0ZXh0ID0geXlfLnl5dGV4dC5zdWJzdHIoMSx5eV8ueXlsZW5nLTIpOyByZXR1cm4gNFxuYnJlYWs7XG5jYXNlIDM6cmV0dXJuIDE3XG5icmVhaztcbmNhc2UgNDpyZXR1cm4gMThcbmJyZWFrO1xuY2FzZSA1OnJldHVybiAyM1xuYnJlYWs7XG5jYXNlIDY6cmV0dXJuIDI0XG5icmVhaztcbmNhc2UgNzpyZXR1cm4gMjJcbmJyZWFrO1xuY2FzZSA4OnJldHVybiAyMVxuYnJlYWs7XG5jYXNlIDk6cmV0dXJuIDEwXG5icmVhaztcbmNhc2UgMTA6cmV0dXJuIDExXG5icmVhaztcbmNhc2UgMTE6cmV0dXJuIDhcbmJyZWFrO1xuY2FzZSAxMjpyZXR1cm4gMTRcbmJyZWFrO1xuY2FzZSAxMzpyZXR1cm4gJ0lOVkFMSUQnXG5icmVhaztcbn1cbn0sXG5ydWxlczogWy9eKD86XFxzKykvLC9eKD86KC0/KFswLTldfFsxLTldWzAtOV0rKSkoXFwuWzAtOV0rKT8oW2VFXVstK10/WzAtOV0rKT9cXGIpLywvXig/OlwiKD86XFxcXFtcXFxcXCJiZm5ydFxcL118XFxcXHVbYS1mQS1GMC05XXs0fXxbXlxcXFxcXDAtXFx4MDlcXHgwYS1cXHgxZlwiXSkqXCIpLywvXig/OlxceykvLC9eKD86XFx9KS8sL14oPzpcXFspLywvXig/OlxcXSkvLC9eKD86LCkvLC9eKD86OikvLC9eKD86dHJ1ZVxcYikvLC9eKD86ZmFsc2VcXGIpLywvXig/Om51bGxcXGIpLywvXig/OiQpLywvXig/Oi4pL10sXG5jb25kaXRpb25zOiB7XCJJTklUSUFMXCI6e1wicnVsZXNcIjpbMCwxLDIsMyw0LDUsNiw3LDgsOSwxMCwxMSwxMiwxM10sXCJpbmNsdXNpdmVcIjp0cnVlfX1cbn0pO1xucmV0dXJuIGxleGVyO1xufSkoKTtcbnBhcnNlci5sZXhlciA9IGxleGVyO1xuZnVuY3Rpb24gUGFyc2VyICgpIHtcbiAgdGhpcy55eSA9IHt9O1xufVxuUGFyc2VyLnByb3RvdHlwZSA9IHBhcnNlcjtwYXJzZXIuUGFyc2VyID0gUGFyc2VyO1xucmV0dXJuIG5ldyBQYXJzZXI7XG59KSgpO1xuXG5cbmlmICh0eXBlb2YgcmVxdWlyZSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG5leHBvcnRzLnBhcnNlciA9IGpzb25saW50O1xuZXhwb3J0cy5QYXJzZXIgPSBqc29ubGludC5QYXJzZXI7XG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4ganNvbmxpbnQucGFyc2UuYXBwbHkoanNvbmxpbnQsIGFyZ3VtZW50cyk7IH07XG5leHBvcnRzLm1haW4gPSBmdW5jdGlvbiBjb21tb25qc01haW4oYXJncykge1xuICAgIGlmICghYXJnc1sxXSkge1xuICAgICAgICBjb25zb2xlLmxvZygnVXNhZ2U6ICcrYXJnc1swXSsnIEZJTEUnKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIH1cbiAgICB2YXIgc291cmNlID0gcmVxdWlyZSgnZnMnKS5yZWFkRmlsZVN5bmMocmVxdWlyZSgncGF0aCcpLm5vcm1hbGl6ZShhcmdzWzFdKSwgXCJ1dGY4XCIpO1xuICAgIHJldHVybiBleHBvcnRzLnBhcnNlci5wYXJzZShzb3VyY2UpO1xufTtcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiByZXF1aXJlLm1haW4gPT09IG1vZHVsZSkge1xuICBleHBvcnRzLm1haW4ocHJvY2Vzcy5hcmd2LnNsaWNlKDEpKTtcbn1cbn0iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gcmVzb2x2ZXMgLiBhbmQgLi4gZWxlbWVudHMgaW4gYSBwYXRoIGFycmF5IHdpdGggZGlyZWN0b3J5IG5hbWVzIHRoZXJlXG4vLyBtdXN0IGJlIG5vIHNsYXNoZXMsIGVtcHR5IGVsZW1lbnRzLCBvciBkZXZpY2UgbmFtZXMgKGM6XFwpIGluIHRoZSBhcnJheVxuLy8gKHNvIGFsc28gbm8gbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyAtIGl0IGRvZXMgbm90IGRpc3Rpbmd1aXNoXG4vLyByZWxhdGl2ZSBhbmQgYWJzb2x1dGUgcGF0aHMpXG5mdW5jdGlvbiBub3JtYWxpemVBcnJheShwYXJ0cywgYWxsb3dBYm92ZVJvb3QpIHtcbiAgLy8gaWYgdGhlIHBhdGggdHJpZXMgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIGB1cGAgZW5kcyB1cCA+IDBcbiAgdmFyIHVwID0gMDtcbiAgZm9yICh2YXIgaSA9IHBhcnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxhc3QgPSBwYXJ0c1tpXTtcbiAgICBpZiAobGFzdCA9PT0gJy4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgfSBlbHNlIGlmIChsYXN0ID09PSAnLi4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cCsrO1xuICAgIH0gZWxzZSBpZiAodXApIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwLS07XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHBhdGggaXMgYWxsb3dlZCB0byBnbyBhYm92ZSB0aGUgcm9vdCwgcmVzdG9yZSBsZWFkaW5nIC4uc1xuICBpZiAoYWxsb3dBYm92ZVJvb3QpIHtcbiAgICBmb3IgKDsgdXAtLTsgdXApIHtcbiAgICAgIHBhcnRzLnVuc2hpZnQoJy4uJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhcnRzO1xufVxuXG4vLyBTcGxpdCBhIGZpbGVuYW1lIGludG8gW3Jvb3QsIGRpciwgYmFzZW5hbWUsIGV4dF0sIHVuaXggdmVyc2lvblxuLy8gJ3Jvb3QnIGlzIGp1c3QgYSBzbGFzaCwgb3Igbm90aGluZy5cbnZhciBzcGxpdFBhdGhSZSA9XG4gICAgL14oXFwvP3wpKFtcXHNcXFNdKj8pKCg/OlxcLnsxLDJ9fFteXFwvXSs/fCkoXFwuW14uXFwvXSp8KSkoPzpbXFwvXSopJC87XG52YXIgc3BsaXRQYXRoID0gZnVuY3Rpb24oZmlsZW5hbWUpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aFJlLmV4ZWMoZmlsZW5hbWUpLnNsaWNlKDEpO1xufTtcblxuLy8gcGF0aC5yZXNvbHZlKFtmcm9tIC4uLl0sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZXNvbHZlID0gZnVuY3Rpb24oKSB7XG4gIHZhciByZXNvbHZlZFBhdGggPSAnJyxcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBmYWxzZTtcblxuICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTEgJiYgIXJlc29sdmVkQWJzb2x1dGU7IGktLSkge1xuICAgIHZhciBwYXRoID0gKGkgPj0gMCkgPyBhcmd1bWVudHNbaV0gOiBwcm9jZXNzLmN3ZCgpO1xuXG4gICAgLy8gU2tpcCBlbXB0eSBhbmQgaW52YWxpZCBlbnRyaWVzXG4gICAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGgucmVzb2x2ZSBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICByZXNvbHZlZFBhdGggPSBwYXRoICsgJy8nICsgcmVzb2x2ZWRQYXRoO1xuICAgIHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsIGJ1dFxuICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcmVzb2x2ZWRQYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHJlc29sdmVkUGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFyZXNvbHZlZEFic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgcmV0dXJuICgocmVzb2x2ZWRBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHJlc29sdmVkUGF0aCkgfHwgJy4nO1xufTtcblxuLy8gcGF0aC5ub3JtYWxpemUocGF0aClcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMubm9ybWFsaXplID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgaXNBYnNvbHV0ZSA9IGV4cG9ydHMuaXNBYnNvbHV0ZShwYXRoKSxcbiAgICAgIHRyYWlsaW5nU2xhc2ggPSBzdWJzdHIocGF0aCwgLTEpID09PSAnLyc7XG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFpc0Fic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgaWYgKCFwYXRoICYmICFpc0Fic29sdXRlKSB7XG4gICAgcGF0aCA9ICcuJztcbiAgfVxuICBpZiAocGF0aCAmJiB0cmFpbGluZ1NsYXNoKSB7XG4gICAgcGF0aCArPSAnLyc7XG4gIH1cblxuICByZXR1cm4gKGlzQWJzb2x1dGUgPyAnLycgOiAnJykgKyBwYXRoO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5pc0Fic29sdXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuam9pbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcGF0aHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICByZXR1cm4gZXhwb3J0cy5ub3JtYWxpemUoZmlsdGVyKHBhdGhzLCBmdW5jdGlvbihwLCBpbmRleCkge1xuICAgIGlmICh0eXBlb2YgcCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLmpvaW4gbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9KS5qb2luKCcvJykpO1xufTtcblxuXG4vLyBwYXRoLnJlbGF0aXZlKGZyb20sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZWxhdGl2ZSA9IGZ1bmN0aW9uKGZyb20sIHRvKSB7XG4gIGZyb20gPSBleHBvcnRzLnJlc29sdmUoZnJvbSkuc3Vic3RyKDEpO1xuICB0byA9IGV4cG9ydHMucmVzb2x2ZSh0bykuc3Vic3RyKDEpO1xuXG4gIGZ1bmN0aW9uIHRyaW0oYXJyKSB7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKDsgc3RhcnQgPCBhcnIubGVuZ3RoOyBzdGFydCsrKSB7XG4gICAgICBpZiAoYXJyW3N0YXJ0XSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIHZhciBlbmQgPSBhcnIubGVuZ3RoIC0gMTtcbiAgICBmb3IgKDsgZW5kID49IDA7IGVuZC0tKSB7XG4gICAgICBpZiAoYXJyW2VuZF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoc3RhcnQgPiBlbmQpIHJldHVybiBbXTtcbiAgICByZXR1cm4gYXJyLnNsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCArIDEpO1xuICB9XG5cbiAgdmFyIGZyb21QYXJ0cyA9IHRyaW0oZnJvbS5zcGxpdCgnLycpKTtcbiAgdmFyIHRvUGFydHMgPSB0cmltKHRvLnNwbGl0KCcvJykpO1xuXG4gIHZhciBsZW5ndGggPSBNYXRoLm1pbihmcm9tUGFydHMubGVuZ3RoLCB0b1BhcnRzLmxlbmd0aCk7XG4gIHZhciBzYW1lUGFydHNMZW5ndGggPSBsZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZnJvbVBhcnRzW2ldICE9PSB0b1BhcnRzW2ldKSB7XG4gICAgICBzYW1lUGFydHNMZW5ndGggPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIG91dHB1dFBhcnRzID0gW107XG4gIGZvciAodmFyIGkgPSBzYW1lUGFydHNMZW5ndGg7IGkgPCBmcm9tUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXRwdXRQYXJ0cy5wdXNoKCcuLicpO1xuICB9XG5cbiAgb3V0cHV0UGFydHMgPSBvdXRwdXRQYXJ0cy5jb25jYXQodG9QYXJ0cy5zbGljZShzYW1lUGFydHNMZW5ndGgpKTtcblxuICByZXR1cm4gb3V0cHV0UGFydHMuam9pbignLycpO1xufTtcblxuZXhwb3J0cy5zZXAgPSAnLyc7XG5leHBvcnRzLmRlbGltaXRlciA9ICc6JztcblxuZXhwb3J0cy5kaXJuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgcmVzdWx0ID0gc3BsaXRQYXRoKHBhdGgpLFxuICAgICAgcm9vdCA9IHJlc3VsdFswXSxcbiAgICAgIGRpciA9IHJlc3VsdFsxXTtcblxuICBpZiAoIXJvb3QgJiYgIWRpcikge1xuICAgIC8vIE5vIGRpcm5hbWUgd2hhdHNvZXZlclxuICAgIHJldHVybiAnLic7XG4gIH1cblxuICBpZiAoZGlyKSB7XG4gICAgLy8gSXQgaGFzIGEgZGlybmFtZSwgc3RyaXAgdHJhaWxpbmcgc2xhc2hcbiAgICBkaXIgPSBkaXIuc3Vic3RyKDAsIGRpci5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIHJldHVybiByb290ICsgZGlyO1xufTtcblxuXG5leHBvcnRzLmJhc2VuYW1lID0gZnVuY3Rpb24ocGF0aCwgZXh0KSB7XG4gIHZhciBmID0gc3BsaXRQYXRoKHBhdGgpWzJdO1xuICAvLyBUT0RPOiBtYWtlIHRoaXMgY29tcGFyaXNvbiBjYXNlLWluc2Vuc2l0aXZlIG9uIHdpbmRvd3M/XG4gIGlmIChleHQgJiYgZi5zdWJzdHIoLTEgKiBleHQubGVuZ3RoKSA9PT0gZXh0KSB7XG4gICAgZiA9IGYuc3Vic3RyKDAsIGYubGVuZ3RoIC0gZXh0Lmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGY7XG59O1xuXG5cbmV4cG9ydHMuZXh0bmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aChwYXRoKVszXTtcbn07XG5cbmZ1bmN0aW9uIGZpbHRlciAoeHMsIGYpIHtcbiAgICBpZiAoeHMuZmlsdGVyKSByZXR1cm4geHMuZmlsdGVyKGYpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChmKHhzW2ldLCBpLCB4cykpIHJlcy5wdXNoKHhzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cblxuLy8gU3RyaW5nLnByb3RvdHlwZS5zdWJzdHIgLSBuZWdhdGl2ZSBpbmRleCBkb24ndCB3b3JrIGluIElFOFxudmFyIHN1YnN0ciA9ICdhYicuc3Vic3RyKC0xKSA9PT0gJ2InXG4gICAgPyBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7IHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pIH1cbiAgICA6IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHtcbiAgICAgICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBzdHIubGVuZ3RoICsgc3RhcnQ7XG4gICAgICAgIHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pO1xuICAgIH1cbjtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBQb2ludDtcblxuZnVuY3Rpb24gUG9pbnQoeCwgeSkge1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbn1cblxuUG9pbnQucHJvdG90eXBlID0ge1xuICAgIGNsb25lOiBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBQb2ludCh0aGlzLngsIHRoaXMueSk7IH0sXG5cbiAgICBhZGQ6ICAgICBmdW5jdGlvbihwKSB7IHJldHVybiB0aGlzLmNsb25lKCkuX2FkZChwKTsgICAgIH0sXG4gICAgc3ViOiAgICAgZnVuY3Rpb24ocCkgeyByZXR1cm4gdGhpcy5jbG9uZSgpLl9zdWIocCk7ICAgICB9LFxuICAgIG11bHQ6ICAgIGZ1bmN0aW9uKGspIHsgcmV0dXJuIHRoaXMuY2xvbmUoKS5fbXVsdChrKTsgICAgfSxcbiAgICBkaXY6ICAgICBmdW5jdGlvbihrKSB7IHJldHVybiB0aGlzLmNsb25lKCkuX2RpdihrKTsgICAgIH0sXG4gICAgcm90YXRlOiAgZnVuY3Rpb24oYSkgeyByZXR1cm4gdGhpcy5jbG9uZSgpLl9yb3RhdGUoYSk7ICB9LFxuICAgIG1hdE11bHQ6IGZ1bmN0aW9uKG0pIHsgcmV0dXJuIHRoaXMuY2xvbmUoKS5fbWF0TXVsdChtKTsgfSxcbiAgICB1bml0OiAgICBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuY2xvbmUoKS5fdW5pdCgpOyB9LFxuICAgIHBlcnA6ICAgIGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5jbG9uZSgpLl9wZXJwKCk7IH0sXG4gICAgcm91bmQ6ICAgZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmNsb25lKCkuX3JvdW5kKCk7IH0sXG5cbiAgICBtYWc6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSk7XG4gICAgfSxcblxuICAgIGVxdWFsczogZnVuY3Rpb24ocCkge1xuICAgICAgICByZXR1cm4gdGhpcy54ID09PSBwLnggJiZcbiAgICAgICAgICAgICAgIHRoaXMueSA9PT0gcC55O1xuICAgIH0sXG5cbiAgICBkaXN0OiBmdW5jdGlvbihwKSB7XG4gICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kaXN0U3FyKHApKTtcbiAgICB9LFxuXG4gICAgZGlzdFNxcjogZnVuY3Rpb24ocCkge1xuICAgICAgICB2YXIgZHggPSBwLnggLSB0aGlzLngsXG4gICAgICAgICAgICBkeSA9IHAueSAtIHRoaXMueTtcbiAgICAgICAgcmV0dXJuIGR4ICogZHggKyBkeSAqIGR5O1xuICAgIH0sXG5cbiAgICBhbmdsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBNYXRoLmF0YW4yKHRoaXMueSwgdGhpcy54KTtcbiAgICB9LFxuXG4gICAgYW5nbGVUbzogZnVuY3Rpb24oYikge1xuICAgICAgICByZXR1cm4gTWF0aC5hdGFuMih0aGlzLnkgLSBiLnksIHRoaXMueCAtIGIueCk7XG4gICAgfSxcblxuICAgIGFuZ2xlV2l0aDogZnVuY3Rpb24oYikge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmdsZVdpdGhTZXAoYi54LCBiLnkpO1xuICAgIH0sXG5cbiAgICAvLyBGaW5kIHRoZSBhbmdsZSBvZiB0aGUgdHdvIHZlY3RvcnMsIHNvbHZpbmcgdGhlIGZvcm11bGEgZm9yIHRoZSBjcm9zcyBwcm9kdWN0IGEgeCBiID0gfGF8fGJ8c2luKM64KSBmb3IgzrguXG4gICAgYW5nbGVXaXRoU2VwOiBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgIHJldHVybiBNYXRoLmF0YW4yKFxuICAgICAgICAgICAgdGhpcy54ICogeSAtIHRoaXMueSAqIHgsXG4gICAgICAgICAgICB0aGlzLnggKiB4ICsgdGhpcy55ICogeSk7XG4gICAgfSxcblxuICAgIF9tYXRNdWx0OiBmdW5jdGlvbihtKSB7XG4gICAgICAgIHZhciB4ID0gbVswXSAqIHRoaXMueCArIG1bMV0gKiB0aGlzLnksXG4gICAgICAgICAgICB5ID0gbVsyXSAqIHRoaXMueCArIG1bM10gKiB0aGlzLnk7XG4gICAgICAgIHRoaXMueCA9IHg7XG4gICAgICAgIHRoaXMueSA9IHk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBfYWRkOiBmdW5jdGlvbihwKSB7XG4gICAgICAgIHRoaXMueCArPSBwLng7XG4gICAgICAgIHRoaXMueSArPSBwLnk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBfc3ViOiBmdW5jdGlvbihwKSB7XG4gICAgICAgIHRoaXMueCAtPSBwLng7XG4gICAgICAgIHRoaXMueSAtPSBwLnk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBfbXVsdDogZnVuY3Rpb24oaykge1xuICAgICAgICB0aGlzLnggKj0gaztcbiAgICAgICAgdGhpcy55ICo9IGs7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBfZGl2OiBmdW5jdGlvbihrKSB7XG4gICAgICAgIHRoaXMueCAvPSBrO1xuICAgICAgICB0aGlzLnkgLz0gaztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIF91bml0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5fZGl2KHRoaXMubWFnKCkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgX3BlcnA6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgeSA9IHRoaXMueTtcbiAgICAgICAgdGhpcy55ID0gdGhpcy54O1xuICAgICAgICB0aGlzLnggPSAteTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIF9yb3RhdGU6IGZ1bmN0aW9uKGFuZ2xlKSB7XG4gICAgICAgIHZhciBjb3MgPSBNYXRoLmNvcyhhbmdsZSksXG4gICAgICAgICAgICBzaW4gPSBNYXRoLnNpbihhbmdsZSksXG4gICAgICAgICAgICB4ID0gY29zICogdGhpcy54IC0gc2luICogdGhpcy55LFxuICAgICAgICAgICAgeSA9IHNpbiAqIHRoaXMueCArIGNvcyAqIHRoaXMueTtcbiAgICAgICAgdGhpcy54ID0geDtcbiAgICAgICAgdGhpcy55ID0geTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIF9yb3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMueCA9IE1hdGgucm91bmQodGhpcy54KTtcbiAgICAgICAgdGhpcy55ID0gTWF0aC5yb3VuZCh0aGlzLnkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59O1xuXG4vLyBjb25zdHJ1Y3RzIFBvaW50IGZyb20gYW4gYXJyYXkgaWYgbmVjZXNzYXJ5XG5Qb2ludC5jb252ZXJ0ID0gZnVuY3Rpb24gKGEpIHtcbiAgICBpZiAoYSBpbnN0YW5jZW9mIFBvaW50KSB7XG4gICAgICAgIHJldHVybiBhO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheShhKSkge1xuICAgICAgICByZXR1cm4gbmV3IFBvaW50KGFbMF0sIGFbMV0pO1xuICAgIH1cbiAgICByZXR1cm4gYTtcbn07XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciBnZW9tZXRyeUFyZWEgPSByZXF1aXJlKCdnZW9qc29uLWFyZWEnKS5nZW9tZXRyeTtcblxuLyoqXG4gKiBUYWtlcyBhIHtAbGluayBHZW9KU09OfSBmZWF0dXJlIG9yIHtAbGluayBGZWF0dXJlQ29sbGVjdGlvbn0gb2YgYW55IHR5cGUgYW5kIHJldHVybnMgdGhlIGFyZWEgb2YgdGhhdCBmZWF0dXJlXG4gKiBpbiBzcXVhcmUgbWV0ZXJzLlxuICpcbiAqIEBtb2R1bGUgdHVyZi9hcmVhXG4gKiBAY2F0ZWdvcnkgbWVhc3VyZW1lbnRcbiAqIEBwYXJhbSB7R2VvSlNPTn0gaW5wdXQgYSB7QGxpbmsgRmVhdHVyZX0gb3Ige0BsaW5rIEZlYXR1cmVDb2xsZWN0aW9ufSBvZiBhbnkgdHlwZVxuICogQHJldHVybiB7TnVtYmVyfSBhcmVhIGluIHNxdWFyZSBtZXRlcnNcbiAqIEBleGFtcGxlXG4gKiB2YXIgcG9seWdvbnMgPSB7XG4gKiAgIFwidHlwZVwiOiBcIkZlYXR1cmVDb2xsZWN0aW9uXCIsXG4gKiAgIFwiZmVhdHVyZXNcIjogW1xuICogICAgIHtcbiAqICAgICAgIFwidHlwZVwiOiBcIkZlYXR1cmVcIixcbiAqICAgICAgIFwicHJvcGVydGllc1wiOiB7fSxcbiAqICAgICAgIFwiZ2VvbWV0cnlcIjoge1xuICogICAgICAgICBcInR5cGVcIjogXCJQb2x5Z29uXCIsXG4gKiAgICAgICAgIFwiY29vcmRpbmF0ZXNcIjogW1tcbiAqICAgICAgICAgICBbLTY3LjAzMTAyMSwgMTAuNDU4MTAyXSxcbiAqICAgICAgICAgICBbLTY3LjAzMTAyMSwgMTAuNTMzNzJdLFxuICogICAgICAgICAgIFstNjYuOTI5Mzk3LCAxMC41MzM3Ml0sXG4gKiAgICAgICAgICAgWy02Ni45MjkzOTcsIDEwLjQ1ODEwMl0sXG4gKiAgICAgICAgICAgWy02Ny4wMzEwMjEsIDEwLjQ1ODEwMl1cbiAqICAgICAgICAgXV1cbiAqICAgICAgIH1cbiAqICAgICB9LCB7XG4gKiAgICAgICBcInR5cGVcIjogXCJGZWF0dXJlXCIsXG4gKiAgICAgICBcInByb3BlcnRpZXNcIjoge30sXG4gKiAgICAgICBcImdlb21ldHJ5XCI6IHtcbiAqICAgICAgICAgXCJ0eXBlXCI6IFwiUG9seWdvblwiLFxuICogICAgICAgICBcImNvb3JkaW5hdGVzXCI6IFtbXG4gKiAgICAgICAgICAgWy02Ni45MTk3ODQsIDEwLjM5NzMyNV0sXG4gKiAgICAgICAgICAgWy02Ni45MTk3ODQsIDEwLjUxMzQ2N10sXG4gKiAgICAgICAgICAgWy02Ni44MDUxMTQsIDEwLjUxMzQ2N10sXG4gKiAgICAgICAgICAgWy02Ni44MDUxMTQsIDEwLjM5NzMyNV0sXG4gKiAgICAgICAgICAgWy02Ni45MTk3ODQsIDEwLjM5NzMyNV1cbiAqICAgICAgICAgXV1cbiAqICAgICAgIH1cbiAqICAgICB9XG4gKiAgIF1cbiAqIH07XG4gKlxuICogdmFyIGFyZWEgPSB0dXJmLmFyZWEocG9seWdvbnMpO1xuICpcbiAqIC8vPWFyZWFcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKF8udHlwZSA9PT0gJ0ZlYXR1cmVDb2xsZWN0aW9uJykge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgc3VtID0gMDsgaSA8IF8uZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChfLmZlYXR1cmVzW2ldLmdlb21ldHJ5KSB7XG4gICAgICAgICAgICAgICAgc3VtICs9IGdlb21ldHJ5QXJlYShfLmZlYXR1cmVzW2ldLmdlb21ldHJ5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VtO1xuICAgIH0gZWxzZSBpZiAoXy50eXBlID09PSAnRmVhdHVyZScpIHtcbiAgICAgICAgcmV0dXJuIGdlb21ldHJ5QXJlYShfLmdlb21ldHJ5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZ2VvbWV0cnlBcmVhKF8pO1xuICAgIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cy5SQURJVVMgPSA2Mzc4MTM3O1xubW9kdWxlLmV4cG9ydHMuRkxBVFRFTklORyA9IDEvMjk4LjI1NzIyMzU2Mztcbm1vZHVsZS5leHBvcnRzLlBPTEFSX1JBRElVUyA9IDYzNTY3NTIuMzE0MjtcbiIsInZhciBoYXQgPSByZXF1aXJlKCdoYXQnKTtcbnZhciBmZWF0dXJlc0F0ID0gcmVxdWlyZSgnLi9saWIvZmVhdHVyZXNfYXQnKTtcbnZhciBnZW9qc29uaGludCA9IHJlcXVpcmUoJ2dlb2pzb25oaW50Jyk7XG5cbnZhciBmZWF0dXJlVHlwZXMgPSB7XG4gICdQb2x5Z29uJzogcmVxdWlyZSgnLi9mZWF0dXJlX3R5cGVzL3BvbHlnb24nKSxcbiAgJ0xpbmVTdHJpbmcnOiByZXF1aXJlKCcuL2ZlYXR1cmVfdHlwZXMvbGluZV9zdHJpbmcnKSxcbiAgJ1BvaW50JzogcmVxdWlyZSgnLi9mZWF0dXJlX3R5cGVzL3BvaW50JyksXG4gICdNdWx0aVBvbHlnb24nOiByZXF1aXJlKCcuL2ZlYXR1cmVfdHlwZXMvbXVsdGlfZmVhdHVyZScpLFxuICAnTXVsdGlMaW5lU3RyaW5nJzogcmVxdWlyZSgnLi9mZWF0dXJlX3R5cGVzL211bHRpX2ZlYXR1cmUnKSxcbiAgJ011bHRpUG9pbnQnOiByZXF1aXJlKCcuL2ZlYXR1cmVfdHlwZXMvbXVsdGlfZmVhdHVyZScpXG59O1xuXG52YXIgZmVhdHVyZVR5cGVTdHIgPSBPYmplY3Qua2V5cyhmZWF0dXJlVHlwZXMpLmpvaW4oJywgJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY3R4KSB7XG5cbiAgcmV0dXJuIHtcbiAgICBnZXRGZWF0dXJlSWRzQXQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgIHZhciBmZWF0dXJlcyA9IGZlYXR1cmVzQXQoe3BvaW50OiB7eCwgeX19LCBjdHgpO1xuICAgICAgcmV0dXJuIGZlYXR1cmVzLm1hcChmZWF0dXJlID0+IGZlYXR1cmUucHJvcGVydGllcy5pZCk7XG4gICAgfSxcbiAgICBhZGQ6IGZ1bmN0aW9uIChnZW9qc29uLCB2YWxpZGF0ZUdlb0pTT049dHJ1ZSkge1xuXG4gICAgICAgaWYgKGdlb2pzb24udHlwZSAhPT0gJ0ZlYXR1cmVDb2xsZWN0aW9uJyAmJiAhZ2VvanNvbi5nZW9tZXRyeSkge1xuICAgICAgICBnZW9qc29uID0ge1xuICAgICAgICAgIHR5cGU6ICdGZWF0dXJlJyxcbiAgICAgICAgICBpZDogZ2VvanNvbi5pZCxcbiAgICAgICAgICBwcm9wZXJ0aWVzOiBnZW9qc29uLnByb3BlcnRpZXMgfHwge30sXG4gICAgICAgICAgZ2VvbWV0cnk6IGdlb2pzb25cbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgaWYgKHZhbGlkYXRlR2VvSlNPTikge1xuICAgICAgICB2YXIgZXJyb3JzID0gZ2VvanNvbmhpbnQuaGludChnZW9qc29uKTtcbiAgICAgICAgaWYgKGVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JzWzBdLm1lc3NhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgKGdlb2pzb24udHlwZSA9PT0gJ0ZlYXR1cmVDb2xsZWN0aW9uJyA/IGdlb2pzb24uZmVhdHVyZXMgOiBbZ2VvanNvbl0pLmZvckVhY2goZmVhdHVyZSA9PiB7XG4gICAgICAgICAgaWYgKGZlYXR1cmVUeXBlc1tmZWF0dXJlLmdlb21ldHJ5LnR5cGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBmZWF0dXJlIHR5cGUuIE11c3QgYmUgJHtmZWF0dXJlVHlwZVN0cn1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoZ2VvanNvbi50eXBlID09PSAnRmVhdHVyZUNvbGxlY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBnZW9qc29uLmZlYXR1cmVzLm1hcChmZWF0dXJlID0+IHRoaXMuYWRkKGZlYXR1cmUsIGZhbHNlKSk7XG4gICAgICB9XG5cbiAgICAgIGdlb2pzb24gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGdlb2pzb24pKTtcblxuICAgICAgZ2VvanNvbi5pZCA9IGdlb2pzb24uaWQgfHwgaGF0KCk7XG5cbiAgICAgIGlmIChjdHguc3RvcmUuZ2V0KGdlb2pzb24uaWQpID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmFyIG1vZGVsID0gZmVhdHVyZVR5cGVzW2dlb2pzb24uZ2VvbWV0cnkudHlwZV07XG5cbiAgICAgICAgbGV0IGludGVybmFsRmVhdHVyZSA9IG5ldyBtb2RlbChjdHgsIGdlb2pzb24pO1xuICAgICAgICBjdHguc3RvcmUuYWRkKGludGVybmFsRmVhdHVyZSk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgbGV0IGludGVybmFsRmVhdHVyZSA9IGN0eC5zdG9yZS5nZXQoZ2VvanNvbi5pZCk7XG4gICAgICAgIGludGVybmFsRmVhdHVyZS5wcm9wZXJ0aWVzID0gZ2VvanNvbi5wcm9wZXJ0aWVzO1xuICAgICAgfVxuXG4gICAgICBjdHguc3RvcmUucmVuZGVyKCk7XG4gICAgICByZXR1cm4gZ2VvanNvbi5pZDtcbiAgICB9LFxuICAgIGdldDogZnVuY3Rpb24gKGlkKSB7XG4gICAgICB2YXIgZmVhdHVyZSA9IGN0eC5zdG9yZS5nZXQoaWQpO1xuICAgICAgaWYgKGZlYXR1cmUpIHtcbiAgICAgICAgcmV0dXJuIGZlYXR1cmUudG9HZW9KU09OKCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBnZXRBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ0ZlYXR1cmVDb2xsZWN0aW9uJyxcbiAgICAgICAgZmVhdHVyZXM6IGN0eC5zdG9yZS5nZXRBbGwoKS5tYXAoZmVhdHVyZSA9PiBmZWF0dXJlLnRvR2VvSlNPTigpKVxuICAgICAgfTtcbiAgICB9LFxuICAgIGRlbGV0ZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgIGN0eC5zdG9yZS5kZWxldGUoW2lkXSk7XG4gICAgICBjdHguc3RvcmUucmVuZGVyKCk7XG4gICAgfSxcbiAgICBkZWxldGVBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgY3R4LnN0b3JlLmRlbGV0ZShjdHguc3RvcmUuZ2V0QWxsKCkubWFwKGZlYXR1cmUgPT4gZmVhdHVyZS5pZCkpO1xuICAgICAgY3R4LnN0b3JlLnJlbmRlcigpO1xuICAgIH0sXG4gICAgY2hhbmdlTW9kZTogZnVuY3Rpb24obW9kZSwgb3B0cykge1xuICAgICAgY3R4LmV2ZW50cy5jaGFuZ2VNb2RlKG1vZGUsIG9wdHMpO1xuICAgIH0sXG4gICAgdHJhc2g6IGZ1bmN0aW9uKCkge1xuICAgICAgY3R4LmV2ZW50cy5maXJlKCd0cmFzaCcpO1xuICAgIH1cbiAgfTtcbn07XG4iLCJ2YXIgTW9kZUhhbmRsZXIgPSByZXF1aXJlKCcuL2xpYi9tb2RlX2hhbmRsZXInKTtcbnZhciBnZXRGZWF0dXJlQXRBbmRTZXRDdXJzb3JzID0gcmVxdWlyZSgnLi9saWIvZ2V0X2ZlYXR1cmVzX2FuZF9zZXRfY3Vyc29yJyk7XG52YXIgaXNDbGljayA9IHJlcXVpcmUoJy4vbGliL2lzX2NsaWNrJyk7XG5cbnZhciBtb2RlcyA9IHtcbiAgJ3NpbXBsZV9zZWxlY3QnOiByZXF1aXJlKCcuL21vZGVzL3NpbXBsZV9zZWxlY3QnKSxcbiAgJ2RpcmVjdF9zZWxlY3QnOiByZXF1aXJlKCcuL21vZGVzL2RpcmVjdF9zZWxlY3QnKSxcbiAgJ2RyYXdfcG9pbnQnOiByZXF1aXJlKCcuL21vZGVzL2RyYXdfcG9pbnQnKSxcbiAgJ2RyYXdfbGluZV9zdHJpbmcnOiByZXF1aXJlKCcuL21vZGVzL2RyYXdfbGluZV9zdHJpbmcnKSxcbiAgJ2RyYXdfcG9seWdvbic6IHJlcXVpcmUoJy4vbW9kZXMvZHJhd19wb2x5Z29uJylcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY3R4KSB7XG5cbiAgdmFyIG1vdXNlRG93bkluZm8gPSB7XG4gICAgaXNEb3duOiBmYWxzZVxuICB9O1xuXG4gIHZhciBldmVudHMgPSB7fTtcbiAgdmFyIGN1cnJlbnRNb2RlTmFtZSA9ICdzaW1wbGVfc2VsZWN0JztcbiAgdmFyIGN1cnJlbnRNb2RlID0gTW9kZUhhbmRsZXIobW9kZXMuc2ltcGxlX3NlbGVjdChjdHgpLCBjdHgpO1xuXG4gIGV2ZW50cy5kcmFnID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICBpZiAoaXNDbGljayhtb3VzZURvd25JbmZvLCB7XG4gICAgICBwb2ludDogZXZlbnQucG9pbnQsXG4gICAgICB0aW1lOiBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICAgIH0pKSB7XG4gICAgICBldmVudC5vcmlnaW5hbEV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGN0eC51aS5zZXRDbGFzcyh7bW91c2U6ICdkcmFnJ30pO1xuICAgICAgY3VycmVudE1vZGUuZHJhZyhldmVudCk7XG4gICAgfVxuICB9O1xuXG4gIGV2ZW50cy5tb3VzZW1vdmUgPSBmdW5jdGlvbihldmVudCkge1xuICAgIGlmIChtb3VzZURvd25JbmZvLmlzRG93bikge1xuICAgICAgZXZlbnRzLmRyYWcoZXZlbnQpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZhciB0YXJnZXQgPSBnZXRGZWF0dXJlQXRBbmRTZXRDdXJzb3JzKGV2ZW50LCBjdHgpO1xuICAgICAgZXZlbnQuZmVhdHVyZVRhcmdldCA9IHRhcmdldDtcbiAgICAgIGN1cnJlbnRNb2RlLm1vdXNlbW92ZShldmVudCk7XG4gICAgfVxuICB9O1xuXG4gIGV2ZW50cy5tb3VzZWRvd24gPSBmdW5jdGlvbihldmVudCkge1xuICAgIG1vdXNlRG93bkluZm8gPSB7XG4gICAgICBpc0Rvd246IHRydWUsXG4gICAgICB0aW1lOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcbiAgICAgIHBvaW50OiBldmVudC5wb2ludFxuICAgIH07XG5cbiAgICB2YXIgdGFyZ2V0ID0gZ2V0RmVhdHVyZUF0QW5kU2V0Q3Vyc29ycyhldmVudCwgY3R4KTtcbiAgICBldmVudC5mZWF0dXJlVGFyZ2V0ID0gdGFyZ2V0O1xuICAgIGN1cnJlbnRNb2RlLm1vdXNlZG93bihldmVudCk7XG4gIH07XG5cbiAgZXZlbnRzLm1vdXNldXAgPSBmdW5jdGlvbihldmVudCkge1xuICAgIG1vdXNlRG93bkluZm8uaXNEb3duID0gZmFsc2U7XG4gICAgdmFyIHRhcmdldCA9IGdldEZlYXR1cmVBdEFuZFNldEN1cnNvcnMoZXZlbnQsIGN0eCk7XG4gICAgZXZlbnQuZmVhdHVyZVRhcmdldCA9IHRhcmdldDtcblxuICAgIGlmIChpc0NsaWNrKG1vdXNlRG93bkluZm8sIHtcbiAgICAgIHBvaW50OiBldmVudC5wb2ludCxcbiAgICAgIHRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gICAgfSkpIHtcbiAgICAgIGN1cnJlbnRNb2RlLmNsaWNrKGV2ZW50KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjdXJyZW50TW9kZS5tb3VzZXVwKGV2ZW50KTtcbiAgICB9XG5cbiAgfTtcblxuICBldmVudHMudHJhc2ggPSBmdW5jdGlvbigpIHtcbiAgICBjdXJyZW50TW9kZS50cmFzaCgpO1xuICB9O1xuXG4gIHZhciBpc0tleU1vZGVWYWxpZCA9IChjb2RlKSA9PiAhKGNvZGUgPT09IDggfHwgKGNvZGUgPj0gNDggJiYgY29kZSA8PSA1NykpO1xuXG4gIGV2ZW50cy5rZXlkb3duID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gOCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGFwaS5maXJlKCd0cmFzaCcpO1xuICAgIH1cbiAgICBlbHNlIGlmIChpc0tleU1vZGVWYWxpZChldmVudC5rZXlDb2RlKSkge1xuICAgICAgY3VycmVudE1vZGUua2V5ZG93bihldmVudCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2ZW50LmtleUNvZGUgPT09IDQ5KSB7XG4gICAgICBjdHguYXBpLmNoYW5nZU1vZGUoJ2RyYXdfcG9pbnQnKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZXZlbnQua2V5Q29kZSA9PT0gNTApIHtcbiAgICAgIGN0eC5hcGkuY2hhbmdlTW9kZSgnZHJhd19saW5lX3N0cmluZycpO1xuICAgIH1cbiAgICBlbHNlIGlmIChldmVudC5rZXlDb2RlID09PSA1MSkge1xuICAgICAgY3R4LmFwaS5jaGFuZ2VNb2RlKCdkcmF3X3BvbHlnb24nKTtcbiAgICB9XG4gIH07XG5cbiAgZXZlbnRzLmtleXVwID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICBpZiAoaXNLZXlNb2RlVmFsaWQoZXZlbnQua2V5Q29kZSkpIHtcbiAgICAgIGN1cnJlbnRNb2RlLmtleXVwKGV2ZW50KTtcbiAgICB9XG4gIH07XG5cbiAgZXZlbnRzLnpvb21lbmQgPSBmdW5jdGlvbigpIHtcbiAgICBjdHguc3RvcmUuY2hhbmdlWm9vbSgpO1xuICB9O1xuXG4gIHZhciBhcGkgPSB7XG4gICAgY3VycmVudE1vZGVOYW1lOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBjdXJyZW50TW9kZU5hbWU7XG4gICAgfSxcbiAgICBjdXJyZW50TW9kZVJlbmRlcjogZnVuY3Rpb24oZ2VvanNvbiwgcHVzaCkge1xuICAgICAgcmV0dXJuIGN1cnJlbnRNb2RlLnJlbmRlcihnZW9qc29uLCBwdXNoKTtcbiAgICB9LFxuICAgIGNoYW5nZU1vZGU6IGZ1bmN0aW9uKG1vZGVuYW1lLCBvcHRzKSB7XG4gICAgICBjdXJyZW50TW9kZS5zdG9wKCk7XG4gICAgICB2YXIgbW9kZWJ1aWxkZXIgPSBtb2Rlc1ttb2RlbmFtZV07XG4gICAgICBpZiAobW9kZWJ1aWxkZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bW9kZW5hbWV9IGlzIG5vdCB2YWxpZGApO1xuICAgICAgfVxuICAgICAgY3VycmVudE1vZGVOYW1lID0gbW9kZW5hbWU7XG4gICAgICB2YXIgbW9kZSA9IG1vZGVidWlsZGVyKGN0eCwgb3B0cyk7XG4gICAgICBjdXJyZW50TW9kZSA9IE1vZGVIYW5kbGVyKG1vZGUsIGN0eCk7XG5cbiAgICAgIGN0eC5tYXAuZmlyZSgnZHJhdy5tb2RlY2hhbmdlJywge1xuICAgICAgICBtb2RlOiBtb2RlbmFtZSxcbiAgICAgICAgb3B0czogb3B0c1xuICAgICAgfSk7XG5cbiAgICAgIGN0eC5zdG9yZS5zZXREaXJ0eSgpO1xuICAgICAgY3R4LnN0b3JlLnJlbmRlcigpO1xuICAgIH0sXG4gICAgZmlyZTogZnVuY3Rpb24obmFtZSwgZXZlbnQpIHtcbiAgICAgIGlmIChldmVudHNbbmFtZV0pIHtcbiAgICAgICAgZXZlbnRzW25hbWVdKGV2ZW50KTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFkZEV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcbiAgICAgIGN0eC5tYXAub24oJ21vdXNlbW92ZScsIGV2ZW50cy5tb3VzZW1vdmUpO1xuXG4gICAgICBjdHgubWFwLm9uKCdtb3VzZWRvd24nLCBldmVudHMubW91c2Vkb3duKTtcbiAgICAgIGN0eC5tYXAub24oJ21vdXNldXAnLCBldmVudHMubW91c2V1cCk7XG5cbiAgICAgIGlmIChjdHgub3B0aW9ucy5rZXliaW5kaW5ncykge1xuICAgICAgICBjdHguY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBldmVudHMua2V5ZG93bik7XG4gICAgICAgIGN0eC5jb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBldmVudHMua2V5dXApO1xuICAgICAgfVxuICAgIH0sXG4gICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgY3R4Lm1hcC5vZmYoJ21vdXNlbW92ZScsIGV2ZW50cy5tb3VzZW1vdmUpO1xuXG4gICAgICBjdHgubWFwLm9mZignbW91c2Vkb3duJywgZXZlbnRzLm1vdXNlZG93bik7XG4gICAgICBjdHgubWFwLm9mZignbW91c2V1cCcsIGV2ZW50cy5tb3VzZXVwKTtcblxuICAgICAgaWYgKGN0eC5vcHRpb25zLmtleWJpbmRpbmdzKSB7XG4gICAgICAgIGN0eC5jb250YWluZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGV2ZW50cy5rZXlkb3duKTtcbiAgICAgICAgY3R4LmNvbnRhaW5lci5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGV2ZW50cy5rZXl1cCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBhcGk7XG59O1xuIiwidmFyIGhhdCA9IHJlcXVpcmUoJ2hhdCcpO1xuXG52YXIgRmVhdHVyZSA9IGZ1bmN0aW9uKGN0eCwgZ2VvanNvbikge1xuICB0aGlzLmN0eCA9IGN0eDtcbiAgdGhpcy5wcm9wZXJ0aWVzID0gZ2VvanNvbi5wcm9wZXJ0aWVzIHx8IHt9O1xuICB0aGlzLmNvb3JkaW5hdGVzID0gZ2VvanNvbi5nZW9tZXRyeS5jb29yZGluYXRlcztcbiAgdGhpcy5hdExhc3RSZW5kZXIgPSBudWxsO1xuICB0aGlzLmlkID0gZ2VvanNvbi5pZCB8fCBoYXQoKTtcbiAgdGhpcy50eXBlID0gZ2VvanNvbi5nZW9tZXRyeS50eXBlO1xufTtcblxuRmVhdHVyZS5wcm90b3R5cGUuY2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmN0eC5zdG9yZS5mZWF0dXJlQ2hhbmdlZCh0aGlzLmlkKTtcbn07XG5cbkZlYXR1cmUucHJvdG90eXBlLnNldENvb3JkaW5hdGVzID0gZnVuY3Rpb24oY29vcmRzKSB7XG4gIHRoaXMuY29vcmRpbmF0ZXMgPSBjb29yZHM7XG4gIHRoaXMuY2hhbmdlZCgpO1xufTtcblxuRmVhdHVyZS5wcm90b3R5cGUuZ2V0Q29vcmRpbmF0ZXMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5jb29yZGluYXRlcykpO1xufTtcblxuRmVhdHVyZS5wcm90b3R5cGUudG9HZW9KU09OID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHtcbiAgICAnaWQnOiB0aGlzLmlkLFxuICAgICd0eXBlJzogJ0ZlYXR1cmUnLFxuICAgICdwcm9wZXJ0aWVzJzogdGhpcy5wcm9wZXJ0aWVzLFxuICAgICdnZW9tZXRyeSc6IHtcbiAgICAgICdjb29yZGluYXRlcyc6IHRoaXMuZ2V0Q29vcmRpbmF0ZXMoKSxcbiAgICAgICd0eXBlJzogdGhpcy50eXBlXG4gICAgfVxuICB9KSk7XG59O1xuXG5GZWF0dXJlLnByb3RvdHlwZS5pbnRlcm5hbCA9IGZ1bmN0aW9uKG1vZGUpIHtcbiAgcmV0dXJuIHtcbiAgICAndHlwZSc6ICdGZWF0dXJlJyxcbiAgICAncHJvcGVydGllcyc6IHtcbiAgICAgICdpZCc6IHRoaXMuaWQsXG4gICAgICAnbWV0YSc6ICdmZWF0dXJlJyxcbiAgICAgICdtZXRhOnR5cGUnOiB0aGlzLnR5cGUsXG4gICAgICAnYWN0aXZlJzogJ2ZhbHNlJyxcbiAgICAgIG1vZGU6IG1vZGVcbiAgICB9LFxuICAgICdnZW9tZXRyeSc6IHtcbiAgICAgICdjb29yZGluYXRlcyc6IHRoaXMuZ2V0Q29vcmRpbmF0ZXMoKSxcbiAgICAgICd0eXBlJzogdGhpcy50eXBlXG4gICAgfVxuICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGZWF0dXJlO1xuIiwidmFyIEZlYXR1cmUgPSByZXF1aXJlKCcuL2ZlYXR1cmUnKTtcblxudmFyIExpbmVTdHJpbmcgPSBmdW5jdGlvbihjdHgsIGdlb2pzb24pIHtcbiAgRmVhdHVyZS5jYWxsKHRoaXMsIGN0eCwgZ2VvanNvbik7XG59O1xuXG5MaW5lU3RyaW5nLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRmVhdHVyZS5wcm90b3R5cGUpO1xuXG5MaW5lU3RyaW5nLnByb3RvdHlwZS5pc1ZhbGlkID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmNvb3JkaW5hdGVzLmxlbmd0aCA+IDE7XG59O1xuXG5MaW5lU3RyaW5nLnByb3RvdHlwZS5hZGRDb29yZGluYXRlID0gZnVuY3Rpb24ocGF0aCwgbG5nLCBsYXQpIHtcbiAgdGhpcy5jaGFuZ2VkKCk7XG4gIHRoaXMuc2VsZWN0ZWRDb29yZHMgPSB7fTtcbiAgdmFyIGlkID0gcGFyc2VJbnQocGF0aCwgMTApO1xuICB0aGlzLmNvb3JkaW5hdGVzLnNwbGljZShpZCwgMCwgW2xuZywgbGF0XSk7XG59O1xuXG5MaW5lU3RyaW5nLnByb3RvdHlwZS5nZXRDb29yZGluYXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgaWQgPSBwYXJzZUludChwYXRoLCAxMCk7XG4gIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuY29vcmRpbmF0ZXNbaWRdKSk7XG59O1xuXG5MaW5lU3RyaW5nLnByb3RvdHlwZS5yZW1vdmVDb29yZGluYXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICB0aGlzLmNoYW5nZWQoKTtcbiAgdGhpcy5jb29yZGluYXRlcy5zcGxpY2UocGFyc2VJbnQocGF0aCwgMTApLCAxKTtcbn07XG5cbkxpbmVTdHJpbmcucHJvdG90eXBlLnVwZGF0ZUNvb3JkaW5hdGUgPSBmdW5jdGlvbihwYXRoLCBsbmcsIGxhdCkge1xuICB2YXIgaWQgPSBwYXJzZUludChwYXRoLCAxMCk7XG4gIHRoaXMuY29vcmRpbmF0ZXNbaWRdID0gW2xuZywgbGF0XTtcbiAgdGhpcy5jaGFuZ2VkKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExpbmVTdHJpbmc7XG5cbiIsInZhciBGZWF0dXJlID0gcmVxdWlyZSgnLi9mZWF0dXJlJyk7XG5cbnZhciBtb2RlbHMgPSB7XG4gICdNdWx0aVBvaW50JzogcmVxdWlyZSgnLi9wb2ludCcpLFxuICAnTXVsdGlMaW5lU3RyaW5nJzogcmVxdWlyZSgnLi9saW5lX3N0cmluZycpLFxuICAnTXVsdGlQb2x5Z29uJzogcmVxdWlyZSgnLi9wb2x5Z29uJylcbn07XG5cbmxldCB0YWtlQWN0aW9uID0gKGZlYXR1cmVzLCBhY3Rpb24sIHBhdGgsIGxuZywgbGF0KSA9PiB7XG4gIHZhciBwYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcbiAgdmFyIGlkeCA9IHBhcnNlSW50KHBhcnRzWzBdLCAxMCk7XG4gIHZhciB0YWlsID0gcGFydHMuc2xpY2UoMSkuam9pbignLicpO1xuICByZXR1cm4gZmVhdHVyZXNbaWR4XVthY3Rpb25dKHRhaWwsIGxuZywgbGF0KTtcbn07XG5cbnZhciBNdWx0aUZlYXR1cmUgPSBmdW5jdGlvbihjdHgsIGdlb2pzb24pIHtcbiAgRmVhdHVyZS5jYWxsKHRoaXMsIGN0eCwgZ2VvanNvbik7XG5cbiAgZGVsZXRlIHRoaXMuY29vcmRpbmF0ZXM7XG4gIHRoaXMubW9kZWwgPSBtb2RlbHNbZ2VvanNvbi5nZW9tZXRyeS50eXBlXTtcbiAgaWYgKHRoaXMubW9kZWwgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtnZW9qc29uLmdlb21ldHJ5LnR5cGV9IGlzIG5vdCBhIHZhbGlkIHR5cGVgKTtcbiAgdGhpcy5mZWF0dXJlcyA9IHRoaXMuY29vcmRpbmF0ZXNUb0ZlYXR1cmVzKGdlb2pzb24uZ2VvbWV0cnkuY29vcmRpbmF0ZXMpO1xufTtcblxuTXVsdGlGZWF0dXJlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRmVhdHVyZS5wcm90b3R5cGUpO1xuXG5NdWx0aUZlYXR1cmUucHJvdG90eXBlLmNvb3JkaW5hdGVzVG9GZWF0dXJlcyA9IGZ1bmN0aW9uKGNvb3JkaW5hdGVzKSB7XG4gIHJldHVybiBjb29yZGluYXRlcy5tYXAoY29vcmRzID0+IG5ldyB0aGlzLm1vZGVsKHRoaXMuY3R4LCB7XG4gICAgaWQ6IHRoaXMuaWQsXG4gICAgdHlwZTogJ0ZlYXR1cmUnLFxuICAgIHByb3BlcnRpZXM6IHt9LFxuICAgIGdlb21ldHJ5OiB7XG4gICAgICBjb29yZGluYXRlczogY29vcmRzLFxuICAgICAgdHlwZTogdGhpcy50eXBlLnJlcGxhY2UoJ011bHRpJywgJycpXG4gICAgfVxuICB9KSk7XG59O1xuXG5NdWx0aUZlYXR1cmUucHJvdG90eXBlLmlzVmFsaWQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZmVhdHVyZXMuZXZlcnkoZiA9PiBmLmlzVmFsaWQoKSk7XG59O1xuXG5NdWx0aUZlYXR1cmUucHJvdG90eXBlLnNldENvb3JkaW5hdGVzID0gZnVuY3Rpb24oY29vcmRzKSB7XG4gIHRoaXMuZmVhdHVyZXMgPSB0aGlzLmNvb3JkaW5hdGVzVG9GZWF0dXJlcyhjb29yZHMpO1xuICB0aGlzLmNoYW5nZWQoKTtcbn07XG5cbk11bHRpRmVhdHVyZS5wcm90b3R5cGUuZ2V0Q29vcmRpbmF0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHRha2VBY3Rpb24odGhpcy5mZWF0dXJlcywgJ2dldENvb3JkaW5hdGUnLCBwYXRoKTtcbn07XG5cbk11bHRpRmVhdHVyZS5wcm90b3R5cGUuZ2V0Q29vcmRpbmF0ZXMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5mZWF0dXJlcy5tYXAoZiA9PiBmLnR5cGUgPT09ICdQb2x5Z29uJyA/IGYuZ2V0Q29vcmRpbmF0ZXMoKSA6IGYuY29vcmRpbmF0ZXMpKSk7XG59O1xuXG5NdWx0aUZlYXR1cmUucHJvdG90eXBlLnVwZGF0ZUNvb3JkaW5hdGUgPSBmdW5jdGlvbihwYXRoLCBsbmcsIGxhdCkge1xuICB0YWtlQWN0aW9uKHRoaXMuZmVhdHVyZXMsICd1cGRhdGVDb29yZGluYXRlJywgcGF0aCwgbG5nLCBsYXQpO1xufTtcblxuTXVsdGlGZWF0dXJlLnByb3RvdHlwZS5hZGRDb29yZGluYXRlID0gZnVuY3Rpb24ocGF0aCwgbG5nLCBsYXQpIHtcbiAgdGFrZUFjdGlvbih0aGlzLmZlYXR1cmVzLCAnYWRkQ29vcmRpbmF0ZScsIHBhdGgsIGxuZywgbGF0KTtcbn07XG5cbk11bHRpRmVhdHVyZS5wcm90b3R5cGUucmVtb3ZlQ29vcmRpbmF0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdGFrZUFjdGlvbih0aGlzLmZlYXR1cmVzLCAncmVtb3ZlQ29vcmRpbmF0ZScsIHBhdGgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNdWx0aUZlYXR1cmU7XG4iLCJ2YXIgRmVhdHVyZSA9IHJlcXVpcmUoJy4vZmVhdHVyZScpO1xuXG52YXIgUG9pbnQgPSBmdW5jdGlvbihjdHgsIGdlb2pzb24pIHtcbiAgRmVhdHVyZS5jYWxsKHRoaXMsIGN0eCwgZ2VvanNvbik7XG59O1xuXG5Qb2ludC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEZlYXR1cmUucHJvdG90eXBlKTtcblxuUG9pbnQucHJvdG90eXBlLmlzVmFsaWQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHR5cGVvZiB0aGlzLmNvb3JkaW5hdGVzWzBdID09PSAnbnVtYmVyJztcbn07XG5cblBvaW50LnByb3RvdHlwZS51cGRhdGVDb29yZGluYXRlID0gZnVuY3Rpb24ocGF0aCwgbG5nLCBsYXQpIHtcbiAgdGhpcy5jb29yZGluYXRlcyA9IFtsbmcsIGxhdF07XG4gIHRoaXMuY2hhbmdlZCgpO1xufTtcblxuUG9pbnQucHJvdG90eXBlLmdldENvb3JkaW5hdGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZ2V0Q29vcmRpbmF0ZXMoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUG9pbnQ7XG4iLCJ2YXIgRmVhdHVyZSA9IHJlcXVpcmUoJy4vZmVhdHVyZScpO1xuXG52YXIgUG9seWdvbiA9IGZ1bmN0aW9uKGN0eCwgZ2VvanNvbikge1xuICBGZWF0dXJlLmNhbGwodGhpcywgY3R4LCBnZW9qc29uKTtcbiAgdGhpcy5jb29yZGluYXRlcyA9IHRoaXMuY29vcmRpbmF0ZXMubWFwKGNvb3JkcyA9PiBjb29yZHMuc2xpY2UoMCwgLTEpKTtcbn07XG5cblBvbHlnb24ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShGZWF0dXJlLnByb3RvdHlwZSk7XG5cblBvbHlnb24ucHJvdG90eXBlLmlzVmFsaWQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuY29vcmRpbmF0ZXMuZXZlcnkoZnVuY3Rpb24ocmluZykge1xuICAgIHJldHVybiByaW5nLmxlbmd0aCA+IDI7XG4gIH0pO1xufTtcblxuUG9seWdvbi5wcm90b3R5cGUuYWRkQ29vcmRpbmF0ZSA9IGZ1bmN0aW9uKHBhdGgsIGxuZywgbGF0KSB7XG4gIHRoaXMuY2hhbmdlZCgpO1xuICB2YXIgaWRzID0gcGF0aC5zcGxpdCgnLicpLm1hcCh4ID0+IHBhcnNlSW50KHgsIDEwKSk7XG5cbiAgdmFyIHJpbmcgPSB0aGlzLmNvb3JkaW5hdGVzW2lkc1swXV07XG5cbiAgcmluZy5zcGxpY2UoaWRzWzFdLCAwLCBbbG5nLCBsYXRdKTtcbn07XG5cblBvbHlnb24ucHJvdG90eXBlLnJlbW92ZUNvb3JkaW5hdGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHRoaXMuY2hhbmdlZCgpO1xuICB2YXIgaWRzID0gcGF0aC5zcGxpdCgnLicpLm1hcCh4ID0+IHBhcnNlSW50KHgsIDEwKSk7XG4gIHZhciByaW5nID0gdGhpcy5jb29yZGluYXRlc1tpZHNbMF1dO1xuICBpZiAocmluZykge1xuICAgIHJpbmcuc3BsaWNlKGlkc1sxXSwgMSk7XG4gICAgaWYgKHJpbmcubGVuZ3RoIDwgMykge1xuICAgICAgdGhpcy5jb29yZGluYXRlcy5zcGxpY2UoaWRzWzBdLCAxKTtcbiAgICB9XG4gIH1cbn07XG5cblBvbHlnb24ucHJvdG90eXBlLmdldENvb3JkaW5hdGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBpZHMgPSBwYXRoLnNwbGl0KCcuJykubWFwKHggPT4gcGFyc2VJbnQoeCwgMTApKTtcbiAgdmFyIHJpbmcgPSB0aGlzLmNvb3JkaW5hdGVzW2lkc1swXV07XG4gIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHJpbmdbaWRzWzFdXSkpO1xufTtcblxuUG9seWdvbi5wcm90b3R5cGUuZ2V0Q29vcmRpbmF0ZXMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuY29vcmRpbmF0ZXMubWFwKGNvb3JkcyA9PiBjb29yZHMuY29uY2F0KFtjb29yZHNbMF1dKSk7XG59O1xuXG5Qb2x5Z29uLnByb3RvdHlwZS51cGRhdGVDb29yZGluYXRlID0gZnVuY3Rpb24ocGF0aCwgbG5nLCBsYXQpIHtcbiAgdGhpcy5jaGFuZ2VkKCk7XG4gIHZhciBwYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcbiAgdmFyIHJpbmdJZCA9IHBhcnNlSW50KHBhcnRzWzBdLCAxMCk7XG4gIHZhciBjb29yZElkID0gcGFyc2VJbnQocGFydHNbMV0sIDEwKTtcblxuICBpZiAodGhpcy5jb29yZGluYXRlc1tyaW5nSWRdID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLmNvb3JkaW5hdGVzW3JpbmdJZF0gPSBbXTtcbiAgfVxuXG4gIHRoaXMuY29vcmRpbmF0ZXNbcmluZ0lkXVtjb29yZElkXSA9IFtsbmcsIGxhdF07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBvbHlnb247XG5cbiIsIi8qKlxuICogVGhpcyBmaWxlIGNvdWxkIGRvIHdpdGggYSBuaWNlIHJlZmFjdG9yLi4uXG4gKi9cblxudmFyIHRvTWlkcG9pbnQgPSByZXF1aXJlKCcuL3RvX21pZHBvaW50Jyk7XG52YXIgdG9WZXJ0ZXggPSByZXF1aXJlKCcuL3RvX3ZlcnRleCcpO1xuXG52YXIgYWRkQ29vcmRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihnZW9qc29uLCBkb01pZHBvaW50cywgcHVzaCwgbWFwLCBzZWxlY3RlZENvb3JkUGF0aHMsIGJhc2VQYXRoID0gbnVsbCkge1xuXG4gIGlmIChnZW9qc29uLmdlb21ldHJ5LnR5cGUuc3RhcnRzV2l0aCgnTXVsdGknKSkge1xuICAgIGxldCB0eXBlID0gZ2VvanNvbi5nZW9tZXRyeS50eXBlLnJlcGxhY2UoJ011bHRpJywgJycpO1xuICAgIHJldHVybiBnZW9qc29uLmdlb21ldHJ5LmNvb3JkaW5hdGVzLmZvckVhY2goKGNvb3JkcywgaSkgPT4ge1xuICAgICAgbGV0IGYgPSB7XG4gICAgICAgIHR5cGU6ICdGZWF0dXJlJyxcbiAgICAgICAgcHJvcGVydGllczogZ2VvanNvbi5wcm9wZXJ0aWVzLFxuICAgICAgICBnZW9tZXRyeToge1xuICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgY29vcmRpbmF0ZXM6IGNvb3Jkc1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgYWRkQ29vcmRzKGYsIGRvTWlkcG9pbnRzLCBwdXNoLCBtYXAsIHNlbGVjdGVkQ29vcmRQYXRocywgYCR7aX1gKTtcbiAgICB9KTtcbiAgfVxuICBlbHNlIGlmIChnZW9qc29uLmdlb21ldHJ5LnR5cGUgPT09ICdQb2ludCcpIHtcbiAgICByZXR1cm4gcHVzaCh0b1ZlcnRleChnZW9qc29uLnByb3BlcnRpZXMuaWQsIGdlb2pzb24uZ2VvbWV0cnkuY29vcmRpbmF0ZXMsIGJhc2VQYXRoLCBzZWxlY3RlZENvb3JkUGF0aHMuaW5kZXhPZihiYXNlUGF0aCkgPiAtMSkpO1xuICB9XG5cbiAgdmFyIG9uZVZlcnRleCA9IG51bGw7XG4gIHZhciB0d29WZXJ0ZXggPSBudWxsO1xuICB2YXIgc3RhcnRWZXJ0ZXggPSBudWxsO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGdlb2pzb24uZ2VvbWV0cnkuY29vcmRpbmF0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZ2VvanNvbi5nZW9tZXRyeS50eXBlID09PSAnUG9seWdvbicpIHtcbiAgICAgIGxldCByaW5nID0gZ2VvanNvbi5nZW9tZXRyeS5jb29yZGluYXRlc1tpXTtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgcmluZy5sZW5ndGggLSAxOyBqKyspIHtcbiAgICAgICAgbGV0IGNvb3JkID0gcmluZ1tqXTtcbiAgICAgICAgbGV0IGNvb3JkX3BhdGggPSBiYXNlUGF0aCA/IGAke2Jhc2VQYXRofS4ke2l9LiR7an1gIDogYCR7aX0uJHtqfWA7XG5cbiAgICAgICAgb25lVmVydGV4ID0gdG9WZXJ0ZXgoZ2VvanNvbi5wcm9wZXJ0aWVzLmlkLCBjb29yZCwgY29vcmRfcGF0aCwgc2VsZWN0ZWRDb29yZFBhdGhzLmluZGV4T2YoY29vcmRfcGF0aCkgPiAtMSk7XG4gICAgICAgIHN0YXJ0VmVydGV4ID0gc3RhcnRWZXJ0ZXggPyBzdGFydFZlcnRleCA6IG9uZVZlcnRleDtcbiAgICAgICAgcHVzaChvbmVWZXJ0ZXgpO1xuXG4gICAgICAgIGlmIChqID4gMCAmJiBkb01pZHBvaW50cykge1xuICAgICAgICAgIHB1c2godG9NaWRwb2ludChnZW9qc29uLnByb3BlcnRpZXMuaWQsIHR3b1ZlcnRleCwgb25lVmVydGV4LCBtYXApKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHR3b1ZlcnRleCA9IG9uZVZlcnRleDtcbiAgICAgIH1cbiAgICAgIGlmIChkb01pZHBvaW50cykge1xuICAgICAgICBwdXNoKHRvTWlkcG9pbnQoZ2VvanNvbi5wcm9wZXJ0aWVzLmlkLCBvbmVWZXJ0ZXgsIHN0YXJ0VmVydGV4LCBtYXApKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBsZXQgY29vcmQgPSBnZW9qc29uLmdlb21ldHJ5LmNvb3JkaW5hdGVzW2ldO1xuICAgICAgbGV0IGNvb3JkX3BhdGggPSBiYXNlUGF0aCA/IGJhc2VQYXRoICsgJy4nICsgaSA6ICcnICsgaTtcbiAgICAgIG9uZVZlcnRleCA9IHRvVmVydGV4KGdlb2pzb24ucHJvcGVydGllcy5pZCwgY29vcmQsIGNvb3JkX3BhdGgsIHNlbGVjdGVkQ29vcmRQYXRocy5pbmRleE9mKGNvb3JkX3BhdGgpID4gLTEpO1xuICAgICAgcHVzaChvbmVWZXJ0ZXgpO1xuICAgICAgaWYgKGkgPiAwICYmIGRvTWlkcG9pbnRzKSB7XG4gICAgICAgIHB1c2godG9NaWRwb2ludChnZW9qc29uLnByb3BlcnRpZXMuaWQsIHR3b1ZlcnRleCwgb25lVmVydGV4LCBtYXApKTtcbiAgICAgIH1cbiAgICAgIHR3b1ZlcnRleCA9IG9uZVZlcnRleDtcbiAgICB9XG4gIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgaXNPZk1ldGFUeXBlOiBmdW5jdGlvbih0eXBlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciBmZWF0dXJlVGFyZ2V0ID0gZS5mZWF0dXJlVGFyZ2V0O1xuICAgICAgaWYgKGZlYXR1cmVUYXJnZXQpIHtcbiAgICAgICAgcmV0dXJuIGZlYXR1cmVUYXJnZXQucHJvcGVydGllcy5tZXRhID09PSB0eXBlO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuICBub0ZlYXR1cmU6IGZ1bmN0aW9uKGUpIHtcbiAgICByZXR1cm4gZS5mZWF0dXJlVGFyZ2V0ID09PSB1bmRlZmluZWQ7XG4gIH0sXG4gIGlzRmVhdHVyZTogZnVuY3Rpb24oZSkge1xuICAgIHJldHVybiBlLmZlYXR1cmVUYXJnZXQgIT09IHVuZGVmaW5lZCAmJiBlLmZlYXR1cmVUYXJnZXQucHJvcGVydGllcy5tZXRhID09PSAnZmVhdHVyZSc7XG4gIH0sXG4gIGlzU2hpZnREb3duOiBmdW5jdGlvbihlKSB7XG4gICAgcmV0dXJuIGUub3JpZ2luYWxFdmVudC5zaGlmdEtleSA9PT0gdHJ1ZTtcbiAgfSxcbiAgaXNFc2NhcGVLZXk6IGZ1bmN0aW9uKGUpIHtcbiAgICByZXR1cm4gZS5rZXlDb2RlID09PSAyNztcbiAgfSxcbiAgaXNFbnRlcktleTogZnVuY3Rpb24oZSkge1xuICAgIHJldHVybiBlLmtleUNvZGUgPT09IDEzO1xuICB9XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgdmFyIHggPSBhLnggLSBiLngsIHkgPSBhLnkgLSBiLnk7XG4gICAgcmV0dXJuIE1hdGguc3FydCgoeCAqIHgpICsgKHkgKiB5KSk7XG59O1xuIiwidmFyIGFyZWEgPSByZXF1aXJlKCd0dXJmLWFyZWEnKTtcblxudmFyIG1ldGFzID0gWydmZWF0dXJlJywgJ21pZHBvaW50JywgJ3ZlcnRleCddO1xuXG52YXIgZ2VvbWV0cnlUeXBlVmFsdWVzID0ge1xuICAnUG9seWdvbic6IDIsXG4gICdQb2ludCc6IDAsXG4gICdMaW5lU3RyaW5nJzogMVxufTtcblxuY29uc3Qgc29ydCA9IChhLCBiKSA9PiB7XG4gIHZhciBzY29yZSA9IGdlb21ldHJ5VHlwZVZhbHVlc1thLmdlb21ldHJ5LnR5cGVdIC0gZ2VvbWV0cnlUeXBlVmFsdWVzW2IuZ2VvbWV0cnkudHlwZV07XG5cbiAgaWYgKHNjb3JlID09PSAwICYmIGEuZ2VvbWV0cnkudHlwZSA9PT0gJ1BvbHlnb24nKSB7XG4gICAgcmV0dXJuIGEuYXJlYSAtIGIuYXJlYTtcbiAgfVxuICBlbHNlIHtcbiAgICByZXR1cm4gc2NvcmU7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZXZlbnQsIGN0eCkge1xuXG4gIHZhciBncmFiU2l6ZSA9IC41O1xuICB2YXIgZmVhdHVyZXMgPSBjdHgubWFwLnF1ZXJ5UmVuZGVyZWRGZWF0dXJlcyhbW2V2ZW50LnBvaW50LnggLSBncmFiU2l6ZSwgZXZlbnQucG9pbnQueSAtIGdyYWJTaXplXSwgW2V2ZW50LnBvaW50LnggKyBncmFiU2l6ZSwgZXZlbnQucG9pbnQueSArIGdyYWJTaXplXV0sIHt9KTtcblxuICBmZWF0dXJlcyA9IGZlYXR1cmVzLmZpbHRlcihmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgdmFyIG1ldGEgPSBmZWF0dXJlLnByb3BlcnRpZXMubWV0YTtcbiAgICByZXR1cm4gbWV0YXMuaW5kZXhPZihtZXRhKSAhPT0gLTE7XG4gIH0pLm1hcChmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgaWYgKGZlYXR1cmUuZ2VvbWV0cnkudHlwZSA9PT0gJ1BvbHlnb24nKSB7XG4gICAgICBmZWF0dXJlLmFyZWEgPSBhcmVhKHtcbiAgICAgICAgdHlwZTogJ0ZlYXR1cmUnLFxuICAgICAgICBwcm9wZXJ0eToge30sXG4gICAgICAgIGdlb21ldHJ5OiBmZWF0dXJlLmdlb21ldHJ5XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGZlYXR1cmU7XG4gIH0pO1xuXG4gIGZlYXR1cmVzLnNvcnQoc29ydCk7XG5cbiAgcmV0dXJuIGZlYXR1cmVzO1xufTtcbiIsInZhciBmZWF0dXJlc0F0ID0gcmVxdWlyZSgnLi9mZWF0dXJlc19hdCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldEZlYXR1cmVBdEFuZFNldEN1cnNvcnMoZXZlbnQsIGN0eCkge1xuICB2YXIgZmVhdHVyZXMgPSBmZWF0dXJlc0F0KGV2ZW50LCBjdHgpO1xuXG4gIGlmIChmZWF0dXJlc1swXSkge1xuICAgIGN0eC51aS5zZXRDbGFzcyh7XG4gICAgICBmZWF0dXJlOiBmZWF0dXJlc1swXS5wcm9wZXJ0aWVzLm1ldGEsXG4gICAgICBtb3VzZTogJ2hvdmVyJ1xuICAgIH0pO1xuICB9XG4gIGVsc2Uge1xuICAgIGN0eC51aS5zZXRDbGFzcyh7XG4gICAgICBtb3VzZTogJ25vbmUnXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gZmVhdHVyZXNbMF07XG59O1xuIiwidmFyIGV1Y2xpZGVhbkRpc3RhbmNlID0gcmVxdWlyZSgnLi9ldWNsaWRlYW5fZGlzdGFuY2UnKTtcblxuY29uc3QgY2xvc2VUb2xlcmFuY2UgPSA0O1xuY29uc3QgdG9sZXJhbmNlID0gMTI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNDbGljayhzdGFydCwgZW5kKXtcbiAgc3RhcnQucG9pbnQgPSBzdGFydC5wb2ludCB8fCBlbmQucG9pbnQ7XG4gIHN0YXJ0LnRpbWUgPSBzdGFydC50aW1lIHx8IGVuZC50aW1lO1xuICB2YXIgbW92ZURpc3RhbmNlID0gZXVjbGlkZWFuRGlzdGFuY2Uoc3RhcnQucG9pbnQsIGVuZC5wb2ludCk7XG4gIHJldHVybiBtb3ZlRGlzdGFuY2UgPCBjbG9zZVRvbGVyYW5jZSB8fCAobW92ZURpc3RhbmNlIDwgdG9sZXJhbmNlICYmIChlbmQudGltZSAtIHN0YXJ0LnRpbWUpIDwgNTAwKTtcbn07XG4iLCJ2YXIgTW9kZUhhbmRsZXIgPSBmdW5jdGlvbihtb2RlLCBEcmF3Q29udGV4dCkge1xuXG4gIHZhciBoYW5kbGVycyA9IHtcbiAgICBkcmFnOiBbXSxcbiAgICBjbGljazogW10sXG4gICAgZG91YmxlY2xpY2s6IFtdLFxuICAgIG1vdXNlbW92ZTogW10sXG4gICAgbW91c2Vkb3duOiBbXSxcbiAgICBtb3VzZXVwOiBbXSxcbiAgICBrZXlkb3duOiBbXSxcbiAgICBrZXl1cDogW10sXG4gICAgdHJhc2g6IFtdXG4gIH07XG5cbiAgdmFyIGN0eCA9IHtcbiAgICBvbjogZnVuY3Rpb24oZXZlbnQsIHNlbGVjdG9yLCBmbikge1xuICAgICAgaWYgKGhhbmRsZXJzW2V2ZW50XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBldmVudCB0eXBlOiAke2V2ZW50fWApO1xuICAgICAgfVxuICAgICAgaGFuZGxlcnNbZXZlbnRdLnB1c2goe1xuICAgICAgICBzZWxlY3Rvcjogc2VsZWN0b3IsXG4gICAgICAgIGZuOiBmblxuICAgICAgfSk7XG4gICAgfSxcbiAgICBvZmY6IGZ1bmN0aW9uKGV2ZW50LCBzZWxlY3RvciwgZm4pIHtcbiAgICAgIGhhbmRsZXJzW2V2ZW50XSA9IGhhbmRsZXJzW2V2ZW50XS5maWx0ZXIoaGFuZGxlciA9PiB7XG4gICAgICAgIHJldHVybiBoYW5kbGVyLnNlbGVjdG9yICE9PSBzZWxlY3RvciB8fCBoYW5kbGVyLmZuICE9PSBmbjtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZmlyZTogZnVuY3Rpb24oZXZlbnQsIHBheWxvYWQpIHtcbiAgICAgIHZhciBtb2RlbmFtZSA9IERyYXdDb250ZXh0LmV2ZW50cy5jdXJyZW50TW9kZU5hbWUoKTtcbiAgICAgIERyYXdDb250ZXh0Lm1hcC5maXJlKGBkcmF3LiR7bW9kZW5hbWV9LiR7ZXZlbnR9YCwgcGF5bG9hZCk7XG4gICAgfSxcbiAgICByZW5kZXI6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICBEcmF3Q29udGV4dC5zdG9yZS5mZWF0dXJlQ2hhbmdlZChpZCk7XG4gICAgfVxuICB9O1xuXG4gIHZhciBkZWxlZ2F0ZSA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGV2ZW50KSB7XG4gICAgdmFyIGhhbmRsZXMgPSBoYW5kbGVyc1tldmVudE5hbWVdO1xuICAgIHZhciBpSGFuZGxlID0gaGFuZGxlcy5sZW5ndGg7XG4gICAgd2hpbGUgKGlIYW5kbGUtLSkge1xuICAgICAgdmFyIGhhbmRsZSA9IGhhbmRsZXNbaUhhbmRsZV07XG4gICAgICBpZiAoaGFuZGxlLnNlbGVjdG9yKGV2ZW50KSkge1xuICAgICAgICBoYW5kbGUuZm4uY2FsbChjdHgsIGV2ZW50KTtcbiAgICAgICAgRHJhd0NvbnRleHQuc3RvcmUucmVuZGVyKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBtb2RlLnN0YXJ0LmNhbGwoY3R4KTtcblxuICByZXR1cm4ge1xuICAgIHJlbmRlcjogbW9kZS5yZW5kZXIgfHwgZnVuY3Rpb24oZ2VvanNvbikge3JldHVybiBnZW9qc29uOyB9LFxuICAgIHN0b3A6IG1vZGUuc3RvcCB8fCBmdW5jdGlvbigpIHt9LFxuICAgIGRyYWc6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICBkZWxlZ2F0ZSgnZHJhZycsIGV2ZW50KTtcbiAgICB9LFxuICAgIGNsaWNrOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgZGVsZWdhdGUoJ2NsaWNrJywgZXZlbnQpO1xuICAgIH0sXG4gICAgbW91c2Vtb3ZlOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgZGVsZWdhdGUoJ21vdXNlbW92ZScsIGV2ZW50KTtcbiAgICB9LFxuICAgIG1vdXNlZG93bjogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIGRlbGVnYXRlKCdtb3VzZWRvd24nLCBldmVudCk7XG4gICAgfSxcbiAgICBtb3VzZXVwOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgZGVsZWdhdGUoJ21vdXNldXAnLCBldmVudCk7XG4gICAgfSxcbiAgICBrZXlkb3duOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgZGVsZWdhdGUoJ2tleWRvd24nLCBldmVudCk7XG4gICAgfSxcbiAgICBrZXl1cDogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIGRlbGVnYXRlKCdrZXl1cCcsIGV2ZW50KTtcbiAgICB9LFxuICAgIHRyYXNoOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgZGVsZWdhdGUoJ3RyYXNoJywgZXZlbnQpO1xuICAgIH1cbiAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW9kZUhhbmRsZXI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICBpZiAodHlwZW9mIE9iamVjdC5hc3NpZ24gIT09ICdmdW5jdGlvbicpIHtcbiAgICAoZnVuY3Rpb24gKCkge1xuICAgICAgT2JqZWN0LmFzc2lnbiA9IGZ1bmN0aW9uICh0YXJnZXQpIHtcbiAgICAgICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkIHx8IHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjb252ZXJ0IHVuZGVmaW5lZCBvciBudWxsIHRvIG9iamVjdCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG91dHB1dCA9IE9iamVjdCh0YXJnZXQpO1xuICAgICAgICBmb3IgKHZhciBpbmRleCA9IDE7IGluZGV4IDwgYXJndW1lbnRzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaW5kZXhdO1xuICAgICAgICAgIGlmIChzb3VyY2UgIT09IHVuZGVmaW5lZCAmJiBzb3VyY2UgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGZvciAodmFyIG5leHRLZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkobmV4dEtleSkpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXRbbmV4dEtleV0gPSBzb3VyY2VbbmV4dEtleV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICAgIH07XG4gICAgfSkoKTtcbiAgfVxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gW1xuICB7XG4gICAgJ2lkJzogJ2dsLWRyYXctYWN0aXZlLWxpbmUnLFxuICAgICd0eXBlJzogJ2xpbmUnLFxuICAgICdmaWx0ZXInOiBbJ2FsbCcsXG4gICAgICBbJz09JywgJyR0eXBlJywgJ0xpbmVTdHJpbmcnXSxcbiAgICAgIFsnPT0nLCAnYWN0aXZlJywgJ3RydWUnXVxuICAgIF0sXG4gICAgJ2xheW91dCc6IHtcbiAgICAgICdsaW5lLWNhcCc6ICdyb3VuZCcsXG4gICAgICAnbGluZS1qb2luJzogJ3JvdW5kJ1xuICAgIH0sXG4gICAgJ3BhaW50Jzoge1xuICAgICAgJ2xpbmUtY29sb3InOiAnI0ZGOTgwMCcsXG4gICAgICAnbGluZS1kYXNoYXJyYXknOiBbMC4yLCAyXSxcbiAgICAgICdsaW5lLXdpZHRoJzogNFxuICAgIH0sXG4gICAgJ2ludGVyYWN0aXZlJzogdHJ1ZVxuICB9LFxuICB7XG4gICAgJ2lkJzogJ2dsLWRyYXctYWN0aXZlLXBvbHlnb24nLFxuICAgICd0eXBlJzogJ2ZpbGwnLFxuICAgICdmaWx0ZXInOiBbJ2FsbCcsIFsnPT0nLCAnYWN0aXZlJywgJ3RydWUnXSwgWyc9PScsICckdHlwZScsICdQb2x5Z29uJ11dLFxuICAgICdwYWludCc6IHtcbiAgICAgICdmaWxsLWNvbG9yJzogJyNGRjk4MDAnLFxuICAgICAgJ2ZpbGwtb3BhY2l0eSc6IDAuMjVcbiAgICB9LFxuICAgICdpbnRlcmFjdGl2ZSc6IHRydWVcbiAgfSxcbiAge1xuICAgICdpZCc6ICdnbC1kcmF3LWFjdGl2ZS1wb2x5Z29uLXN0cm9rZScsXG4gICAgJ3R5cGUnOiAnbGluZScsXG4gICAgJ2ZpbHRlcic6IFsnYWxsJywgWyc9PScsICdhY3RpdmUnLCAndHJ1ZSddLCBbJz09JywgJyR0eXBlJywgJ1BvbHlnb24nXV0sXG4gICAgJ2xheW91dCc6IHtcbiAgICAgICdsaW5lLWNhcCc6ICdyb3VuZCcsXG4gICAgICAnbGluZS1qb2luJzogJ3JvdW5kJ1xuICAgIH0sXG4gICAgJ3BhaW50Jzoge1xuICAgICAgJ2xpbmUtY29sb3InOiAnI0ZGOTgwMCcsXG4gICAgICAnbGluZS1kYXNoYXJyYXknOiBbMC4yLCAyXSxcbiAgICAgICdsaW5lLXdpZHRoJzogNFxuICAgIH0sXG4gICAgJ2ludGVyYWN0aXZlJzogdHJ1ZVxuICB9LFxuXG5cbiAge1xuICAgICdpZCc6ICdnbC1kcmF3LXBvaW50LW1pZC1vdXRsaW5lJyxcbiAgICAndHlwZSc6ICdjaXJjbGUnLFxuICAgICdmaWx0ZXInOiBbJ2FsbCcsXG4gICAgICBbJz09JywgJyR0eXBlJywgJ1BvaW50J10sXG4gICAgICBbJz09JywgJ21ldGEnLCAnbWlkcG9pbnQnXV0sXG4gICAgJ3BhaW50Jzoge1xuICAgICAgJ2NpcmNsZS1yYWRpdXMnOiA3LFxuICAgICAgJ2NpcmNsZS1vcGFjaXR5JzogMC42NSxcbiAgICAgICdjaXJjbGUtY29sb3InOiAnI2ZmZidcbiAgICB9LFxuICAgICdpbnRlcmFjdGl2ZSc6IHRydWVcbiAgfSxcbiAgICB7XG4gICAgJ2lkJzogJ2dsLWRyYXctcG9pbnQtbWlkJyxcbiAgICAndHlwZSc6ICdjaXJjbGUnLFxuICAgICdmaWx0ZXInOiBbJ2FsbCcsXG4gICAgICBbJz09JywgJyR0eXBlJywgJ1BvaW50J10sXG4gICAgICBbJz09JywgJ21ldGEnLCAnbWlkcG9pbnQnXV0sXG4gICAgJ3BhaW50Jzoge1xuICAgICAgJ2NpcmNsZS1yYWRpdXMnOiA2LFxuICAgICAgJ2NpcmNsZS1vcGFjaXR5JzogMC42NSxcbiAgICAgICdjaXJjbGUtY29sb3InOiAnI0ZGOTgwMCdcbiAgICB9LFxuICAgICdpbnRlcmFjdGl2ZSc6IHRydWVcbiAgfSxcbiAge1xuICAgICdpZCc6ICdnbC1kcmF3LXBvbHlnb24nLFxuICAgICd0eXBlJzogJ2ZpbGwnLFxuICAgICdmaWx0ZXInOiBbJ2FsbCcsIFsnPT0nLCAnYWN0aXZlJywgJ2ZhbHNlJ10sIFsnPT0nLCAnJHR5cGUnLCAnUG9seWdvbiddXSxcbiAgICAncGFpbnQnOiB7XG4gICAgICAnZmlsbC1jb2xvcic6ICcjMDNBOUY0JyxcbiAgICAgICdmaWxsLW91dGxpbmUtY29sb3InOiAnIzAzQTlGNCcsXG4gICAgICAnZmlsbC1vcGFjaXR5JzogMC4yNVxuICAgIH0sXG4gICAgJ2ludGVyYWN0aXZlJzogdHJ1ZVxuICB9LFxuICB7XG4gICAgJ2lkJzogJ2dsLWRyYXctcG9seWdvbi1zdHJva2UnLFxuICAgICd0eXBlJzogJ2xpbmUnLFxuICAgICdmaWx0ZXInOiBbJ2FsbCcsIFsnPT0nLCAnYWN0aXZlJywgJ2ZhbHNlJ10sIFsnPT0nLCAnJHR5cGUnLCAnUG9seWdvbiddXSxcbiAgICAnbGF5b3V0Jzoge1xuICAgICAgJ2xpbmUtY2FwJzogJ3JvdW5kJyxcbiAgICAgICdsaW5lLWpvaW4nOiAncm91bmQnXG4gICAgfSxcbiAgICAncGFpbnQnOiB7XG4gICAgICAnbGluZS1jb2xvcic6ICcjMDNBOUY0JyxcbiAgICAgICdsaW5lLXdpZHRoJzogM1xuICAgIH0sXG4gICAgJ2ludGVyYWN0aXZlJzogdHJ1ZVxuICB9LFxuICB7XG4gICAgJ2lkJzogJ2dsLWRyYXctbGluZScsXG4gICAgJ3R5cGUnOiAnbGluZScsXG4gICAgJ2ZpbHRlcic6IFsnYWxsJywgWyc9PScsICdhY3RpdmUnLCAnZmFsc2UnXSwgWyc9PScsICckdHlwZScsICdMaW5lU3RyaW5nJ11dLFxuICAgICdsYXlvdXQnOiB7XG4gICAgICAnbGluZS1jYXAnOiAncm91bmQnLFxuICAgICAgJ2xpbmUtam9pbic6ICdyb3VuZCdcbiAgICB9LFxuICAgICdwYWludCc6IHtcbiAgICAgICdsaW5lLWNvbG9yJzogJyMwM0E5RjQnLFxuICAgICAgJ2xpbmUtd2lkdGgnOiAzXG4gICAgfSxcbiAgICAnaW50ZXJhY3RpdmUnOiB0cnVlXG4gIH0sXG4gIHtcbiAgICAnaWQnOiAnZ2wtZHJhdy1hY3RpdmUtcG9pbnQnLFxuICAgICd0eXBlJzogJ2NpcmNsZScsXG4gICAgJ2ZpbHRlcic6IFsnYWxsJyxcbiAgICAgIFsnPT0nLCAnJHR5cGUnLCAnUG9pbnQnXSxcbiAgICAgIFsnPT0nLCAnYWN0aXZlJywgJ3RydWUnXSxcbiAgICAgIFsnIT0nLCAnbWV0YScsICdtaWRwb2ludCddXG4gICAgXSxcbiAgICAncGFpbnQnOiB7XG4gICAgICAnY2lyY2xlLXJhZGl1cyc6IDksXG4gICAgICAnY2lyY2xlLWNvbG9yJzogJyNmZmYnXG4gICAgfSxcbiAgICAnaW50ZXJhY3RpdmUnOiB0cnVlXG4gIH0sXG4gIHtcbiAgICAnaWQnOiAnZ2wtZHJhdy1hY3RpdmUtcG9pbnQtaGlnaGxpZ2h0JyxcbiAgICAndHlwZSc6ICdjaXJjbGUnLFxuICAgICdmaWx0ZXInOiBbJ2FsbCcsXG4gICAgICBbJz09JywgJyR0eXBlJywgJ1BvaW50J10sXG4gICAgICBbJyE9JywgJ21ldGEnLCAnbWlkcG9pbnQnXSxcbiAgICAgIFsnPT0nLCAnYWN0aXZlJywgJ3RydWUnXV0sXG4gICAgJ3BhaW50Jzoge1xuICAgICAgJ2NpcmNsZS1yYWRpdXMnOiA3LFxuICAgICAgJ2NpcmNsZS1jb2xvcic6ICcjRUY2QzAwJ1xuICAgIH0sXG4gICAgJ2ludGVyYWN0aXZlJzogdHJ1ZVxuICB9LFxuICB7XG4gICAgJ2lkJzogJ2dsLWRyYXctcG9seWdvbi1wb2ludC1vdXRsaW5lJyxcbiAgICAndHlwZSc6ICdjaXJjbGUnLFxuICAgICdmaWx0ZXInOiBbJ2FsbCcsIFsnPT0nLCAnYWN0aXZlJywgJ2ZhbHNlJ10sIFsnPT0nLCAnJHR5cGUnLCAnUG9pbnQnXSwgWyc9PScsICdtZXRhJywgJ3ZlcnRleCddXSxcbiAgICAncGFpbnQnOiB7XG4gICAgICAnY2lyY2xlLXJhZGl1cyc6IDksXG4gICAgICAnY2lyY2xlLWNvbG9yJzogJyNmZmYnXG4gICAgfSxcbiAgICAnaW50ZXJhY3RpdmUnOiB0cnVlXG4gIH0sXG4gIHtcbiAgICAnaWQnOiAnZ2wtZHJhdy1wb2x5Z29uLXBvaW50JyxcbiAgICAndHlwZSc6ICdjaXJjbGUnLFxuICAgICdmaWx0ZXInOiBbJ2FsbCcsIFsnPT0nLCAnYWN0aXZlJywgJ2ZhbHNlJ10sIFsnPT0nLCAnJHR5cGUnLCAnUG9pbnQnXSwgWyc9PScsICdtZXRhJywgJ3ZlcnRleCddXSxcbiAgICAncGFpbnQnOiB7XG4gICAgICAnY2lyY2xlLXJhZGl1cyc6IDcsXG4gICAgICAnY2lyY2xlLWNvbG9yJzogJyNGRjk4MDAnXG4gICAgfSxcbiAgICAnaW50ZXJhY3RpdmUnOiB0cnVlXG4gIH0sXG4gIHtcbiAgICAnaWQnOiAnZ2wtZHJhdy1wb2ludC1wb2ludC1vdXRsaW5lJyxcbiAgICAndHlwZSc6ICdjaXJjbGUnLFxuICAgICdmaWx0ZXInOiBbJ2FsbCcsIFsnPT0nLCAnYWN0aXZlJywgJ2ZhbHNlJ10sIFsnPT0nLCAnJHR5cGUnLCAnUG9pbnQnXSwgWyc9PScsICdtZXRhJywgJ2ZlYXR1cmUnXV0sXG4gICAgJ3BhaW50Jzoge1xuICAgICAgJ2NpcmNsZS1yYWRpdXMnOiA5LFxuICAgICAgJ2NpcmNsZS1jb2xvcic6ICcjZmZmJ1xuICAgIH0sXG4gICAgJ2ludGVyYWN0aXZlJzogdHJ1ZVxuICB9LFxuICB7XG4gICAgJ2lkJzogJ2dsLWRyYXctcG9pbnQnLFxuICAgICd0eXBlJzogJ2NpcmNsZScsXG4gICAgJ2ZpbHRlcic6IFsnYWxsJywgWyc9PScsICdhY3RpdmUnLCAnZmFsc2UnXSwgWyc9PScsICckdHlwZScsICdQb2ludCddLCBbJz09JywgJ21ldGEnLCAnZmVhdHVyZSddXSxcbiAgICAncGFpbnQnOiB7XG4gICAgICAnY2lyY2xlLXJhZGl1cyc6IDcsXG4gICAgICAnY2lyY2xlLWNvbG9yJzogJyMwM0E5RjQnXG4gICAgfSxcbiAgICAnaW50ZXJhY3RpdmUnOiB0cnVlXG4gIH1cbl07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBhcmVudCwgc3RhcnRWZXJ0ZXgsIGVuZFZlcnRleCwgbWFwKSB7XG4gIHZhciBzdGFydENvb3JkID0gc3RhcnRWZXJ0ZXguZ2VvbWV0cnkuY29vcmRpbmF0ZXM7XG4gIHZhciBlbmRDb29yZCA9IGVuZFZlcnRleC5nZW9tZXRyeS5jb29yZGluYXRlcztcblxuICB2YXIgcHRBID0gbWFwLnByb2plY3QoWyBzdGFydENvb3JkWzBdLCBzdGFydENvb3JkWzFdIF0pO1xuICB2YXIgcHRCID0gbWFwLnByb2plY3QoWyBlbmRDb29yZFswXSwgZW5kQ29vcmRbMV0gXSk7XG4gIHZhciBtaWQgPSBtYXAudW5wcm9qZWN0KFsgKHB0QS54ICsgcHRCLngpIC8gMiwgKHB0QS55ICsgcHRCLnkpIC8gMiBdKTtcblxuICByZXR1cm4ge1xuICAgIHR5cGU6ICdGZWF0dXJlJyxcbiAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICBtZXRhOiAnbWlkcG9pbnQnLFxuICAgICAgcGFyZW50OiBwYXJlbnQsXG4gICAgICBsbmc6IG1pZC5sbmcsXG4gICAgICBsYXQ6IG1pZC5sYXQsXG4gICAgICBjb29yZF9wYXRoOiBlbmRWZXJ0ZXgucHJvcGVydGllcy5jb29yZF9wYXRoXG4gICAgfSxcbiAgICBnZW9tZXRyeToge1xuICAgICAgdHlwZTogJ1BvaW50JyxcbiAgICAgIGNvb3JkaW5hdGVzOiBbbWlkLmxuZywgbWlkLmxhdF1cbiAgICB9XG4gIH07XG59O1xuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBhcmVudCwgY29vcmQsIHBhdGgsIHNlbGVjdGVkKSB7XG4gIHJldHVybiB7XG4gICAgICB0eXBlOiAnRmVhdHVyZScsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1ldGE6ICd2ZXJ0ZXgnLFxuICAgICAgICBwYXJlbnQ6IHBhcmVudCxcbiAgICAgICAgY29vcmRfcGF0aDogcGF0aCxcbiAgICAgICAgYWN0aXZlOiBgJHtzZWxlY3RlZH1gXG4gICAgICB9LFxuICAgICAgZ2VvbWV0cnk6IHtcbiAgICAgICAgdHlwZTogJ1BvaW50JyxcbiAgICAgICAgY29vcmRpbmF0ZXM6IGNvb3JkXG4gICAgICB9XG4gICAgfTtcbn07XG4iLCJjb25zdCB0eXBlcyA9IHtcbiAgUE9MWUdPTjogJ3BvbHlnb24nLFxuICBMSU5FOiAnbGluZV9zdHJpbmcnLFxuICBQT0lOVDogJ3BvaW50J1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB0eXBlcztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFBvaW50ID0gcmVxdWlyZSgncG9pbnQtZ2VvbWV0cnknKTtcblxudmFyIERPTSA9IHt9O1xuXG4vKipcbiAqIENhcHR1cmVzIG1vdXNlIHBvc2l0aW9uXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGUgTW91c2UgZXZlbnRcbiAqIEBwYXJhbSB7T2JqZWN0fSBlbCBDb250YWluZXIgZWxlbWVudC5cbiAqIEByZXR1cm5zIHtQb2ludH1cbiAqL1xuRE9NLm1vdXNlUG9zID0gZnVuY3Rpb24oZSwgZWwpIHtcbiAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgcmV0dXJuIG5ldyBQb2ludChcbiAgICBlLmNsaWVudFggLSByZWN0LmxlZnQgLSBlbC5jbGllbnRMZWZ0LFxuICAgIGUuY2xpZW50WSAtIHJlY3QudG9wIC0gZWwuY2xpZW50VG9wXG4gICk7XG59O1xuXG4vKipcbiAqIEJ1aWxkcyBET00gZWxlbWVudHNcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdGFnIEVsZW1lbnQgbmFtZVxuICogQHBhcmFtIHtTdHJpbmd9IFtjbGFzc05hbWVdXG4gKiBAcGFyYW0ge09iamVjdH0gW2NvbnRhaW5lcl0gRE9NIGVsZW1lbnQgdG8gYXBwZW5kIHRvXG4gKiBAcGFyYW0ge09iamVjdH0gW2F0dHJidXRlc10gT2JqZWN0IGNvbnRhaW5pbmcgYXR0cmlidXRlcyB0byBhcHBseSB0byBhblxuICogZWxlbWVudC4gQXR0cmlidXRlIG5hbWUgY29ycmVzcG9uZHMgdG8gdGhlIGtleS5cbiAqIEByZXR1cm5zIHtlbH0gVGhlIGRvbSBlbGVtZW50XG4gKi9cbkRPTS5jcmVhdGUgPSBmdW5jdGlvbih0YWcsIGNsYXNzTmFtZSwgY29udGFpbmVyLCBhdHRyaWJ1dGVzKSB7XG4gIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKTtcbiAgaWYgKGNsYXNzTmFtZSkgZWwuY2xhc3NOYW1lID0gY2xhc3NOYW1lO1xuICBpZiAoYXR0cmlidXRlcykge1xuICAgIGZvciAodmFyIGtleSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoa2V5LCBhdHRyaWJ1dGVzW2tleV0pO1xuICAgIH1cbiAgfVxuICBpZiAoY29udGFpbmVyKSBjb250YWluZXIuYXBwZW5kQ2hpbGQoZWwpO1xuICByZXR1cm4gZWw7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgY2xhc3NlcyBmcm9tIGFuIGFycmF5IG9mIERPTSBlbGVtZW50c1xuICpcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnRzXG4gKiBAcGFyYW0ge1N0cmluZ30ga2xhc3NcbiAqL1xuRE9NLnJlbW92ZUNsYXNzID0gZnVuY3Rpb24oZWxlbWVudHMsIGtsYXNzKSB7XG4gIEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwoZWxlbWVudHMsIGZ1bmN0aW9uKGVsKSB7XG4gICAgZWwuY2xhc3NMaXN0LnJlbW92ZShrbGFzcyk7XG4gIH0pO1xufTtcblxudmFyIGRvY1N0eWxlID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlO1xuXG5mdW5jdGlvbiB0ZXN0UHJvcChwcm9wcykge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHByb3BzW2ldIGluIGRvY1N0eWxlKSB7XG4gICAgICByZXR1cm4gcHJvcHNbaV07XG4gICAgfVxuICB9XG59XG5cbnZhciB0cmFuc2Zvcm1Qcm9wID0gdGVzdFByb3AoW1xuICAndHJhbnNmb3JtJyxcbiAgJ1dlYmtpdFRyYW5zZm9ybSdcbl0pO1xuXG5ET00uc2V0VHJhbnNmb3JtID0gZnVuY3Rpb24oZWwsIHZhbHVlKSB7XG4gIGVsLnN0eWxlW3RyYW5zZm9ybVByb3BdID0gdmFsdWU7XG59O1xuXG52YXIgc2VsZWN0UHJvcCA9IHRlc3RQcm9wKFtcbiAgJ3VzZXJTZWxlY3QnLFxuICAnTW96VXNlclNlbGVjdCcsXG4gICdXZWJraXRVc2VyU2VsZWN0JyxcbiAgJ21zVXNlclNlbGVjdCdcbl0pLCB1c2VyU2VsZWN0O1xuXG5ET00uZGlzYWJsZVNlbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHNlbGVjdFByb3ApIHtcbiAgICB1c2VyU2VsZWN0ID0gZG9jU3R5bGVbc2VsZWN0UHJvcF07XG4gICAgZG9jU3R5bGVbc2VsZWN0UHJvcF0gPSAnbm9uZSc7XG4gIH1cbn07XG5cbkRPTS5lbmFibGVTZWxlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG4gIGlmIChzZWxlY3RQcm9wKSB7XG4gICAgZG9jU3R5bGVbc2VsZWN0UHJvcF0gPSB1c2VyU2VsZWN0O1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVCdXR0b24gPSBmdW5jdGlvbihjb250YWluZXIsIG9wdHMsIGNvbnRyb2xDbGFzcykge1xuICB2YXIgYXR0ciA9IHsgdGl0bGU6IG9wdHMudGl0bGUgfTtcbiAgaWYgKG9wdHMuaWQpIHtcbiAgICBhdHRyLmlkID0gb3B0cy5pZDtcbiAgfVxuICB2YXIgYSA9IERPTS5jcmVhdGUoJ2J1dHRvbicsIG9wdHMuY2xhc3NOYW1lLCBjb250YWluZXIsIGF0dHIpO1xuXG4gIGEuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgdmFyIGVsID0gZS50YXJnZXQ7XG5cbiAgICBpZiAoZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdhY3RpdmUnKSkge1xuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIERPTS5yZW1vdmVDbGFzcyhkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuJyArIGNvbnRyb2xDbGFzcyksICdhY3RpdmUnKTtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgICAgb3B0cy5mbigpO1xuICAgIH1cblxuICB9LCB0cnVlKTtcblxuICByZXR1cm4gYTtcbn07XG5cbi8qKlxuICogVHJhbnNsYXRlcyBmZWF0dXJlcyBiYXNlZCBvbiBtb3VzZSBsb2NhdGlvblxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBmZWF0dXJlIC0gQSBHZW9KU09OIGZlYXR1cmVcbiAqIEBwYXJhbSB7QXJyYXk8TnVtYmVyPn0gaW5pdCAtIEluaXRpYWwgcG9zaXRpb24gb2YgdGhlIG1vdXNlXG4gKiBAcGFyYW0ge0FycmF5PE51bWJlcj59IGN1cnIgLSBDdXJyZW50IHBvc2l0aW9uIG9mIHRoZSBtb3VzZVxuICogQHBhcmFtIHtNYXB9IG1hcCAtIEluc3RhbmNlIG9mIG1hcGJveGhsLk1hcFxuICogQHJldHVybnMge09iamVjdH0gR2VvSlNPTiBmZWF0dXJlXG4gKi9cbm1vZHVsZS5leHBvcnRzLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uKGZlYXR1cmUsIGluaXQsIGN1cnIsIG1hcCkge1xuICBmZWF0dXJlID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShmZWF0dXJlKSk7XG4gIHZhciBkeCA9IGN1cnIueCAtIGluaXQueDtcbiAgdmFyIGR5ID0gY3Vyci55IC0gaW5pdC55O1xuICB2YXIgZ2VvbSA9IGZlYXR1cmUuZ2VvbWV0cnk7XG5cbiAgLy8gaXRlcmF0ZSBkaWZmZXJlbnRseSBkdWUgdG8gR2VvSlNPTiBuZXN0aW5nXG4gIHZhciBsLCBpO1xuICBpZiAoZ2VvbS50eXBlID09PSAnUG9seWdvbicpIHtcbiAgICBsID0gZ2VvbS5jb29yZGluYXRlc1swXS5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgZ2VvbS5jb29yZGluYXRlc1swXVtpXSA9IHRyYW5zbGF0ZVBvaW50KGdlb20uY29vcmRpbmF0ZXNbMF1baV0sIGR4LCBkeSwgbWFwKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoZ2VvbS50eXBlID09PSAnTGluZVN0cmluZycpIHtcbiAgICBsID0gZ2VvbS5jb29yZGluYXRlcy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgZ2VvbS5jb29yZGluYXRlc1tpXSA9IHRyYW5zbGF0ZVBvaW50KGdlb20uY29vcmRpbmF0ZXNbaV0sIGR4LCBkeSwgbWFwKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZ2VvbS5jb29yZGluYXRlcyA9IHRyYW5zbGF0ZVBvaW50KGdlb20uY29vcmRpbmF0ZXMsIGR4LCBkeSwgbWFwKTtcbiAgfVxuXG4gIHJldHVybiBmZWF0dXJlO1xufTtcblxuLyoqXG4gKiBUcmFuc2xhdGUgYSBwb2ludCBiYXNlZCBvbiBtb3VzZSBsb2NhdGlvblxuICpcbiAqIEBwYXJhbSB7QXJyYXk8TnVtYmVyPn0gcG9pbnQgLSBbIGxvbmdpdHVkZSwgbGF0aXR1ZGUgXVxuICogQHBhcmFtIHtOdW1iZXJ9IGR4IC0gRGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSBpbml0aWFsIHggbW91c2UgcG9zaXRpb24gYW5kIGN1cnJlbnQgeCBwb3NpdGlvblxuICogQHBhcmFtIHtOdW1iZXJ9IGR5IC0gRGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSBpbml0aWFsIHkgbW91c2UgcG9zaXRpb24gYW5kIGN1cnJlbnQgeSBwb3NpdGlvblxuICogQHBhcmFtIHtNYXB9IG1hcCAtIEluc3RhbmNlIG9mIG1hcGJveGdsLk1hcFxuICogQHJldHVybnMge0FycmF5PE51bWJlcj59IG5ldyB0cmFuc2xhdGVkIHBvaW50XG4gKi9cbnZhciB0cmFuc2xhdGVQb2ludCA9IGZ1bmN0aW9uKHBvaW50LCBkeCwgZHksIG1hcCkge1xuICB2YXIgYyA9IG1hcC5wcm9qZWN0KFsgcG9pbnRbMF0sIHBvaW50WzFdIF0pO1xuICBjID0gbWFwLnVucHJvamVjdChbIGMueCArIGR4LCBjLnkgKyBkeSBdKTtcbiAgcmV0dXJuIFsgYy5sbmcsIGMubGF0IF07XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIHZlcnNpb24gb2YgYGZuYCB0aGF0IG9ubHkgZmlyZXMgb25jZSBldmVyeSBgdGltZWAgbWlsbHNlY29uZHMuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gdGhlIGZ1bmN0aW9uIHRvIGJlIHRocm90dGxlZFxuICogQHBhcmFtIHtudW1iZXJ9IHRpbWUgbWlsbHNlY29uZHMgcmVxdWlyZWQgYmV0d2VlbiBmdW5jdGlvbiBjYWxsc1xuICogQHBhcmFtIHsqfSBjb250ZXh0IHRoZSB2YWx1ZSBvZiBgdGhpc2Agd2l0aCB3aGljaCB0aGUgZnVuY3Rpb24gaXMgY2FsbGVkXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IGRlYm91bmNlZCBmdW5jdGlvblxuICogQHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiB0aHJvdHRsZShmbiwgdGltZSwgY29udGV4dCkge1xuICB2YXIgbG9jaywgYXJncywgd3JhcHBlckZuLCBsYXRlcjtcblxuICBsYXRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyByZXNldCBsb2NrIGFuZCBjYWxsIGlmIHF1ZXVlZFxuICAgIGxvY2sgPSBmYWxzZTtcbiAgICBpZiAoYXJncykge1xuICAgICAgd3JhcHBlckZuLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgYXJncyA9IGZhbHNlO1xuICAgIH1cbiAgfTtcblxuICB3cmFwcGVyRm4gPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGxvY2spIHtcbiAgICAgIC8vIGNhbGxlZCB0b28gc29vbiwgcXVldWUgdG8gY2FsbCBsYXRlclxuICAgICAgYXJncyA9IGFyZ3VtZW50cztcblxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjYWxsIGFuZCBsb2NrIHVudGlsIGxhdGVyXG4gICAgICBmbi5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpO1xuICAgICAgc2V0VGltZW91dChsYXRlciwgdGltZSk7XG4gICAgICBsb2NrID0gdHJ1ZTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHdyYXBwZXJGbjtcbn1cblxubW9kdWxlLmV4cG9ydHMudGhyb3R0bGUgPSB0aHJvdHRsZTtcbm1vZHVsZS5leHBvcnRzLkRPTSA9IERPTTtcbm1vZHVsZS5leHBvcnRzLnRyYW5zbGF0ZVBvaW50ID0gdHJhbnNsYXRlUG9pbnQ7XG4iLCJ2YXIge25vRmVhdHVyZSwgaXNPZk1ldGFUeXBlLCBpc1NoaWZ0RG93bn0gPSByZXF1aXJlKCcuLi9saWIvY29tbW9uX3NlbGVjdG9ycycpO1xudmFyIGFkZENvb3JkcyA9IHJlcXVpcmUoJy4uL2xpYi9hZGRfY29vcmRzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY3R4LCBvcHRzKSB7XG4gIHZhciBmZWF0dXJlSWQgPSBvcHRzLmZlYXR1cmVJZDtcbiAgdmFyIGZlYXR1cmUgPSBjdHguc3RvcmUuZ2V0KGZlYXR1cmVJZCk7XG5cbiAgaWYgKGZlYXR1cmUudHlwZSA9PT0gJ1BvaW50Jykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2RpcmVjdF9zZWxlY3QgbW9kZSBkb2VzblxcJ3QgaGFuZGxlIHBvaW50IGZlYXR1cmVzJyk7XG4gIH1cblxuICB2YXIgZHJhZ2dpbmcgPSBvcHRzLmlzRHJhZ2dpbmcgfHwgZmFsc2U7XG4gIHZhciBzdGFydFBvcyA9IG9wdHMuc3RhcnRQb3MgfHwgbnVsbDtcbiAgdmFyIGNvb3JkUG9zID0gbnVsbDtcbiAgdmFyIG51bUNvb3JkcyA9IG51bGw7XG5cbiAgdmFyIHNlbGVjdGVkQ29vcmRQYXRocyA9IG9wdHMuY29vcmRQYXRoID8gW29wdHMuY29vcmRQYXRoXSA6IFtdO1xuXG4gIHZhciBvblZlcnRleCA9IGZ1bmN0aW9uKGUpIHtcbiAgICBkcmFnZ2luZyA9IHRydWU7XG4gICAgc3RhcnRQb3MgPSBlLmxuZ0xhdDtcbiAgICB2YXIgYWJvdXQgPSBlLmZlYXR1cmVUYXJnZXQucHJvcGVydGllcztcbiAgICB2YXIgc2VsZWN0ZWRJbmRleCA9IHNlbGVjdGVkQ29vcmRQYXRocy5pbmRleE9mKGFib3V0LmNvb3JkX3BhdGgpO1xuICAgIGlmICghaXNTaGlmdERvd24oZSkgJiYgc2VsZWN0ZWRJbmRleCA9PT0gLTEpIHtcbiAgICAgIHNlbGVjdGVkQ29vcmRQYXRocyA9IFthYm91dC5jb29yZF9wYXRoXTtcbiAgICB9XG4gICAgZWxzZSBpZiAoaXNTaGlmdERvd24oZSkgJiYgc2VsZWN0ZWRJbmRleCA9PT0gLTEpIHtcbiAgICAgIHNlbGVjdGVkQ29vcmRQYXRocy5wdXNoKGFib3V0LmNvb3JkX3BhdGgpO1xuICAgIH1cbiAgICBmZWF0dXJlLmNoYW5nZWQoKTtcbiAgfTtcblxuICB2YXIgb25NaWRwb2ludCA9IGZ1bmN0aW9uKGUpIHtcbiAgICBkcmFnZ2luZyA9IHRydWU7XG4gICAgc3RhcnRQb3MgPSBlLmxuZ0xhdDtcbiAgICB2YXIgYWJvdXQgPSBlLmZlYXR1cmVUYXJnZXQucHJvcGVydGllcztcbiAgICBmZWF0dXJlLmFkZENvb3JkaW5hdGUoYWJvdXQuY29vcmRfcGF0aCwgYWJvdXQubG5nLCBhYm91dC5sYXQpO1xuICAgIHNlbGVjdGVkQ29vcmRQYXRocyA9IFthYm91dC5jb29yZF9wYXRoXTtcbiAgfTtcblxuICB2YXIgc2V0dXBDb29yZFBvcyA9IGZ1bmN0aW9uKCkge1xuICAgIGNvb3JkUG9zID0gc2VsZWN0ZWRDb29yZFBhdGhzLm1hcChjb29yZF9wYXRoID0+IGZlYXR1cmUuZ2V0Q29vcmRpbmF0ZShjb29yZF9wYXRoKSk7XG4gICAgbnVtQ29vcmRzID0gY29vcmRQb3MubGVuZ3RoO1xuICB9O1xuXG4gIHJldHVybiB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5vbignbW91c2Vkb3duJywgaXNPZk1ldGFUeXBlKCd2ZXJ0ZXgnKSwgb25WZXJ0ZXgpO1xuICAgICAgdGhpcy5vbignbW91c2Vkb3duJywgaXNPZk1ldGFUeXBlKCdtaWRwb2ludCcpLCBvbk1pZHBvaW50KTtcbiAgICAgIHRoaXMub24oJ2RyYWcnLCAoKSA9PiBkcmFnZ2luZywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLm9yaWdpbmFsRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGlmIChjb29yZFBvcyA9PT0gbnVsbCkge1xuICAgICAgICAgIHNldHVwQ29vcmRQb3MoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbG5nQ2hhbmdlID0gZS5sbmdMYXQubG5nIC0gc3RhcnRQb3MubG5nO1xuICAgICAgICB2YXIgbGF0Q2hhbmdlID0gZS5sbmdMYXQubGF0IC0gc3RhcnRQb3MubGF0O1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQ29vcmRzOyBpKyspIHtcbiAgICAgICAgICB2YXIgY29vcmRfcGF0aCA9IHNlbGVjdGVkQ29vcmRQYXRoc1tpXTtcbiAgICAgICAgICB2YXIgcG9zID0gY29vcmRQb3NbaV07XG5cbiAgICAgICAgICB2YXIgbG5nID0gcG9zWzBdICsgbG5nQ2hhbmdlO1xuICAgICAgICAgIHZhciBsYXQgPSBwb3NbMV0gKyBsYXRDaGFuZ2U7XG4gICAgICAgICAgZmVhdHVyZS51cGRhdGVDb29yZGluYXRlKGNvb3JkX3BhdGgsIGxuZywgbGF0KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB0aGlzLm9uKCdtb3VzZXVwJywgKCkgPT4gdHJ1ZSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGRyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgIGNvb3JkUG9zID0gbnVsbDtcbiAgICAgICAgbnVtQ29vcmRzID0gbnVsbDtcbiAgICAgICAgc3RhcnRQb3MgPSBudWxsO1xuICAgICAgfSk7XG4gICAgICB0aGlzLm9uKCdjbGljaycsIG5vRmVhdHVyZSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGN0eC5ldmVudHMuY2hhbmdlTW9kZSgnc2ltcGxlX3NlbGVjdCcpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLm9uKCd0cmFzaCcsICgpID0+IHNlbGVjdGVkQ29vcmRQYXRocy5sZW5ndGggPiAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZWN0ZWRDb29yZFBhdGhzLnNvcnQoKS5yZXZlcnNlKCkuZm9yRWFjaChpZCA9PiBmZWF0dXJlLnJlbW92ZUNvb3JkaW5hdGUoaWQpKTtcbiAgICAgICAgc2VsZWN0ZWRDb29yZFBhdGhzID0gW107XG4gICAgICAgIGlmIChmZWF0dXJlLmlzVmFsaWQoKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBjdHguc3RvcmUuZGVsZXRlKFtmZWF0dXJlSWRdKTtcbiAgICAgICAgICBjdHguZXZlbnRzLmNoYW5nZU1vZGUoJ3NpbXBsZV9zZWxlY3QnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB0aGlzLm9uKCd0cmFzaCcsICgpID0+IHNlbGVjdGVkQ29vcmRQYXRocy5sZW5ndGggPT09IDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjdHguZXZlbnRzLmNoYW5nZU1vZGUoJ3NpbXBsZV9zZWxlY3QnLCBbZmVhdHVyZUlkXSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHN0b3A6IGZ1bmN0aW9uKCkge30sXG4gICAgcmVuZGVyOiBmdW5jdGlvbihnZW9qc29uLCBwdXNoKSB7XG4gICAgICBpZiAoZmVhdHVyZUlkID09PSBnZW9qc29uLnByb3BlcnRpZXMuaWQpIHtcbiAgICAgICAgZ2VvanNvbi5wcm9wZXJ0aWVzLmFjdGl2ZSA9ICd0cnVlJztcbiAgICAgICAgcHVzaChnZW9qc29uKTtcbiAgICAgICAgYWRkQ29vcmRzKGdlb2pzb24sIHRydWUsIHB1c2gsIGN0eC5tYXAsIHNlbGVjdGVkQ29vcmRQYXRocyk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZ2VvanNvbi5wcm9wZXJ0aWVzLmFjdGl2ZSA9ICdmYWxzZSc7XG4gICAgICAgIHB1c2goZ2VvanNvbik7XG4gICAgICB9XG4gICAgfVxuICB9O1xufTtcbiIsInZhciB7aXNFbnRlcktleSwgaXNFc2NhcGVLZXl9ID0gcmVxdWlyZSgnLi4vbGliL2NvbW1vbl9zZWxlY3RvcnMnKTtcbnZhciBMaW5lU3RyaW5nID0gcmVxdWlyZSgnLi4vZmVhdHVyZV90eXBlcy9saW5lX3N0cmluZycpO1xuY29uc3QgdHlwZXMgPSByZXF1aXJlKCcuLi9saWIvdHlwZXMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjdHgpIHtcblxuICB2YXIgZmVhdHVyZSA9IG5ldyBMaW5lU3RyaW5nKGN0eCwge1xuICAgICd0eXBlJzogJ0ZlYXR1cmUnLFxuICAgICdwcm9wZXJ0aWVzJzoge30sXG4gICAgJ2dlb21ldHJ5Jzoge1xuICAgICAgJ3R5cGUnOiAnTGluZVN0cmluZycsXG4gICAgICAnY29vcmRpbmF0ZXMnOiBbXVxuICAgIH1cbiAgfSk7XG5cbiAgY3R4LnN0b3JlLmFkZChmZWF0dXJlKTtcblxuICB2YXIgc3RvcERyYXdpbmdBbmRSZW1vdmUgPSBmdW5jdGlvbigpIHtcbiAgICBjdHguZXZlbnRzLmNoYW5nZU1vZGUoJ3NpbXBsZV9zZWxlY3QnKTtcbiAgICBjdHguc3RvcmUuZGVsZXRlKFtmZWF0dXJlLmlkXSk7XG4gIH07XG5cbiAgdmFyIHBvcyA9IDA7XG5cbiAgdmFyIG9uTW91c2VNb3ZlID0gZnVuY3Rpb24oZSkge1xuICAgIGN0eC51aS5zZXRDbGFzcyh7bW91c2U6J2FkZCd9KTtcbiAgICBmZWF0dXJlLnVwZGF0ZUNvb3JkaW5hdGUocG9zLCBlLmxuZ0xhdC5sbmcsIGUubG5nTGF0LmxhdCk7XG4gIH07XG5cbiAgdmFyIG9uQ2xpY2sgPSBmdW5jdGlvbihlKSB7XG4gICAgY3R4LnVpLnNldENsYXNzKHttb3VzZTonYWRkJ30pO1xuICAgICBpZiAocG9zID4gMCAmJiBmZWF0dXJlLmNvb3JkaW5hdGVzWzBdWzBdID09PSBlLmxuZ0xhdC5sbmcgJiYgZmVhdHVyZS5jb29yZGluYXRlc1swXVsxXSA9PT0gZS5sbmdMYXQubGF0KSB7XG4gICAgICAvLyBkaWQgd2UgY2xpY2sgb24gdGhlIGZpcnN0IHBvaW50XG4gICAgICBvbkZpbmlzaCgpO1xuICAgIH1cbiAgICBlbHNlIGlmIChwb3MgPiAwICYmIGZlYXR1cmUuY29vcmRpbmF0ZXNbcG9zIC0gMV1bMF0gPT09IGUubG5nTGF0LmxuZyAmJiBmZWF0dXJlLmNvb3JkaW5hdGVzW3BvcyAtIDFdWzFdID09PSBlLmxuZ0xhdC5sYXQpIHtcbiAgICAgIC8vIGNsaWNrIG9uIHRoZSBsYXN0IHBvaW50XG4gICAgICBvbkZpbmlzaCgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGZlYXR1cmUudXBkYXRlQ29vcmRpbmF0ZShwb3MsIGUubG5nTGF0LmxuZywgZS5sbmdMYXQubGF0KTtcbiAgICAgIHBvcysrO1xuICAgIH1cbiAgfTtcblxuICB2YXIgb25GaW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICBmZWF0dXJlLnJlbW92ZUNvb3JkaW5hdGUoYCR7cG9zfWApO1xuICAgIHBvcy0tO1xuICAgIGN0eC5ldmVudHMuY2hhbmdlTW9kZSgnc2ltcGxlX3NlbGVjdCcsIFtmZWF0dXJlLmlkXSk7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICBzdGFydDogZnVuY3Rpb24oKSB7XG4gICAgICBjdHgudWkuc2V0Q2xhc3Moe21vdXNlOidhZGQnfSk7XG4gICAgICBjdHgudWkuc2V0QnV0dG9uQWN0aXZlKHR5cGVzLkxJTkUpO1xuICAgICAgdGhpcy5vbignbW91c2Vtb3ZlJywgKCkgPT4gdHJ1ZSwgb25Nb3VzZU1vdmUpO1xuICAgICAgdGhpcy5vbignY2xpY2snLCAoKSA9PiB0cnVlLCBvbkNsaWNrKTtcbiAgICAgIHRoaXMub24oJ2tleXVwJywgaXNFc2NhcGVLZXksIHN0b3BEcmF3aW5nQW5kUmVtb3ZlKTtcbiAgICAgIHRoaXMub24oJ2tleXVwJywgaXNFbnRlcktleSwgb25GaW5pc2gpO1xuICAgICAgdGhpcy5vbigndHJhc2gnLCAoKSA9PiB0cnVlLCBzdG9wRHJhd2luZ0FuZFJlbW92ZSk7XG4gICAgfSxcbiAgICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICAgIGN0eC51aS5zZXRCdXR0b25JbmFjdGl2ZSh0eXBlcy5MSU5FKTtcbiAgICAgIGlmICghZmVhdHVyZS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgY3R4LnN0b3JlLmRlbGV0ZShbZmVhdHVyZS5pZF0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyOiBmdW5jdGlvbihnZW9qc29uLCBwdXNoKSB7XG4gICAgICBpZiAoZ2VvanNvbi5nZW9tZXRyeS5jb29yZGluYXRlc1swXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGdlb2pzb24ucHJvcGVydGllcy5hY3RpdmUgPSBnZW9qc29uLnByb3BlcnRpZXMuaWQgPT09IGZlYXR1cmUuaWQgPyAndHJ1ZScgOiAnZmFsc2UnO1xuICAgICAgICBnZW9qc29uLnByb3BlcnRpZXMubWV0YSA9IGdlb2pzb24ucHJvcGVydGllcy5hY3RpdmUgPT09ICd0cnVlJyA/ICdmZWF0dXJlJyA6IGdlb2pzb24ucHJvcGVydGllcy5tZXRhO1xuICAgICAgICBwdXNoKGdlb2pzb24pO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn07XG4iLCJ2YXIge2lzRW50ZXJLZXksIGlzRXNjYXBlS2V5fSA9IHJlcXVpcmUoJy4uL2xpYi9jb21tb25fc2VsZWN0b3JzJyk7XG52YXIgUG9pbnQgPSByZXF1aXJlKCcuLi9mZWF0dXJlX3R5cGVzL3BvaW50Jyk7XG5jb25zdCB0eXBlcyA9IHJlcXVpcmUoJy4uL2xpYi90eXBlcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGN0eCkge1xuXG4gIHZhciBmZWF0dXJlID0gbmV3IFBvaW50KGN0eCwge1xuICAgICd0eXBlJzogJ0ZlYXR1cmUnLFxuICAgICdwcm9wZXJ0aWVzJzoge30sXG4gICAgJ2dlb21ldHJ5Jzoge1xuICAgICAgJ3R5cGUnOiAnUG9pbnQnLFxuICAgICAgJ2Nvb3JkaW5hdGVzJzogW11cbiAgICB9XG4gIH0pO1xuXG4gIGN0eC5zdG9yZS5hZGQoZmVhdHVyZSk7XG5cbiAgdmFyIHN0b3BEcmF3aW5nQW5kUmVtb3ZlID0gZnVuY3Rpb24oKSB7XG4gICAgY3R4LmV2ZW50cy5jaGFuZ2VNb2RlKCdzaW1wbGVfc2VsZWN0Jyk7XG4gICAgY3R4LnN0b3JlLmRlbGV0ZShbZmVhdHVyZS5pZF0pO1xuICB9O1xuXG4gIHZhciBvbk1vdXNlTW92ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGN0eC51aS5zZXRDbGFzcyh7bW91c2U6J2FkZCd9KTtcbiAgfTtcblxuICB2YXIgZG9uZSA9IGZhbHNlO1xuICB2YXIgb25DbGljayA9IGZ1bmN0aW9uKGUpIHtcbiAgICBjdHgudWkuc2V0Q2xhc3Moe21vdXNlOidhZGQnfSk7XG4gICAgZG9uZSA9IHRydWU7XG4gICAgZmVhdHVyZS51cGRhdGVDb29yZGluYXRlKCcnLCBlLmxuZ0xhdC5sbmcsIGUubG5nTGF0LmxhdCk7XG4gICAgY3R4LmV2ZW50cy5jaGFuZ2VNb2RlKCdzaW1wbGVfc2VsZWN0JywgW2ZlYXR1cmUuaWRdKTtcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIHN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgIGN0eC51aS5zZXRDbGFzcyh7bW91c2U6J2FkZCd9KTtcbiAgICAgIGN0eC51aS5zZXRCdXR0b25BY3RpdmUodHlwZXMuUE9JTlQpO1xuICAgICAgdGhpcy5vbignbW91c2Vtb3ZlJywgKCkgPT4gdHJ1ZSwgb25Nb3VzZU1vdmUpO1xuICAgICAgdGhpcy5vbignY2xpY2snLCAoKSA9PiB0cnVlLCBvbkNsaWNrKTtcbiAgICAgIHRoaXMub24oJ2tleXVwJywgaXNFc2NhcGVLZXksIHN0b3BEcmF3aW5nQW5kUmVtb3ZlKTtcbiAgICAgIHRoaXMub24oJ2tleXVwJywgaXNFbnRlcktleSwgc3RvcERyYXdpbmdBbmRSZW1vdmUpO1xuICAgICAgdGhpcy5vbigndHJhc2gnLCAoKSA9PiB0cnVlLCBzdG9wRHJhd2luZ0FuZFJlbW92ZSk7XG4gICAgfSxcbiAgICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICAgIGN0eC51aS5zZXRCdXR0b25JbmFjdGl2ZSh0eXBlcy5QT0lOVCk7XG4gICAgICBpZiAoZG9uZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgY3R4LnN0b3JlLmRlbGV0ZShbZmVhdHVyZS5pZF0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyOiBmdW5jdGlvbihnZW9qc29uLCBwdXNoKSB7XG4gICAgICBnZW9qc29uLnByb3BlcnRpZXMuYWN0aXZlID0gZ2VvanNvbi5wcm9wZXJ0aWVzLmlkID09PSBmZWF0dXJlLmlkID8gJ3RydWUnIDogJ2ZhbHNlJztcbiAgICAgIGlmIChnZW9qc29uLnByb3BlcnRpZXMuYWN0aXZlID09PSAnZmFsc2UnKSB7XG4gICAgICAgIHB1c2goZ2VvanNvbik7XG4gICAgICB9XG4gICAgfVxuICB9O1xufTtcbiIsInZhciB7aXNFbnRlcktleSwgaXNFc2NhcGVLZXl9ID0gcmVxdWlyZSgnLi4vbGliL2NvbW1vbl9zZWxlY3RvcnMnKTtcbnZhciBQb2x5Z29uID0gcmVxdWlyZSgnLi4vZmVhdHVyZV90eXBlcy9wb2x5Z29uJyk7XG5jb25zdCB0eXBlcyA9IHJlcXVpcmUoJy4uL2xpYi90eXBlcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGN0eCkge1xuXG4gIHZhciBmZWF0dXJlID0gbmV3IFBvbHlnb24oY3R4LCB7XG4gICAgJ3R5cGUnOiAnRmVhdHVyZScsXG4gICAgJ3Byb3BlcnRpZXMnOiB7fSxcbiAgICAnZ2VvbWV0cnknOiB7XG4gICAgICAndHlwZSc6ICdQb2x5Z29uJyxcbiAgICAgICdjb29yZGluYXRlcyc6IFtbXV1cbiAgICB9XG4gIH0pO1xuXG4gIGN0eC5zdG9yZS5hZGQoZmVhdHVyZSk7XG5cbiAgdmFyIHN0b3BEcmF3aW5nQW5kUmVtb3ZlID0gZnVuY3Rpb24oKSB7XG4gICAgY3R4LmV2ZW50cy5jaGFuZ2VNb2RlKCdzaW1wbGVfc2VsZWN0Jyk7XG4gICAgY3R4LnN0b3JlLmRlbGV0ZShbZmVhdHVyZS5pZF0pO1xuICB9O1xuXG4gIHZhciBwb3MgPSAwO1xuXG4gIHZhciBvbk1vdXNlTW92ZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICBjdHgudWkuc2V0Q2xhc3Moe21vdXNlOidhZGQnfSk7XG4gICAgZmVhdHVyZS51cGRhdGVDb29yZGluYXRlKGAwLiR7cG9zfWAsIGUubG5nTGF0LmxuZywgZS5sbmdMYXQubGF0KTtcbiAgfTtcblxuICB2YXIgb25DbGljayA9IGZ1bmN0aW9uKGUpIHtcbiAgICBjdHgudWkuc2V0Q2xhc3Moe21vdXNlOidhZGQnfSk7XG4gICAgaWYgKHBvcyA+IDAgJiYgZmVhdHVyZS5jb29yZGluYXRlc1swXVswXVswXSA9PT0gZS5sbmdMYXQubG5nICYmIGZlYXR1cmUuY29vcmRpbmF0ZXNbMF1bMF1bMV0gPT09IGUubG5nTGF0LmxhdCkge1xuICAgICAgLy8gZGlkIHdlIGNsaWNrIG9uIHRoZSBmaXJzdCBwb2ludFxuICAgICAgb25GaW5pc2goKTtcbiAgICB9XG4gICAgZWxzZSBpZiAocG9zID4gMCAmJiBmZWF0dXJlLmNvb3JkaW5hdGVzWzBdW3BvcyAtIDFdWzBdID09PSBlLmxuZ0xhdC5sbmcgJiYgZmVhdHVyZS5jb29yZGluYXRlc1swXVtwb3MgLSAxXVsxXSA9PT0gZS5sbmdMYXQubGF0KSB7XG4gICAgICAvLyBjbGljayBvbiB0aGUgbGFzdCBwb2ludFxuICAgICAgb25GaW5pc2goKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBmZWF0dXJlLnVwZGF0ZUNvb3JkaW5hdGUoYDAuJHtwb3N9YCwgZS5sbmdMYXQubG5nLCBlLmxuZ0xhdC5sYXQpO1xuICAgICAgcG9zKys7XG4gICAgfVxuXG4gIH07XG5cbiAgdmFyIG9uRmluaXNoID0gZnVuY3Rpb24oKSB7XG4gICAgZmVhdHVyZS5yZW1vdmVDb29yZGluYXRlKGAwLiR7cG9zfWApO1xuICAgIHBvcy0tO1xuICAgIGN0eC5ldmVudHMuY2hhbmdlTW9kZSgnc2ltcGxlX3NlbGVjdCcsIFtmZWF0dXJlLmlkXSk7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICBzdGFydDogZnVuY3Rpb24oKSB7XG4gICAgICBjdHgudWkuc2V0Q2xhc3Moe21vdXNlOidhZGQnfSk7XG4gICAgICBjdHgudWkuc2V0QnV0dG9uQWN0aXZlKHR5cGVzLlBPTFlHT04pO1xuICAgICAgdGhpcy5vbignbW91c2Vtb3ZlJywgKCkgPT4gdHJ1ZSwgb25Nb3VzZU1vdmUpO1xuICAgICAgdGhpcy5vbignY2xpY2snLCAoKSA9PiB0cnVlLCBvbkNsaWNrKTtcbiAgICAgIHRoaXMub24oJ2tleXVwJywgaXNFc2NhcGVLZXksIHN0b3BEcmF3aW5nQW5kUmVtb3ZlKTtcbiAgICAgIHRoaXMub24oJ2tleXVwJywgaXNFbnRlcktleSwgb25GaW5pc2gpO1xuICAgICAgdGhpcy5vbigndHJhc2gnLCAoKSA9PiB0cnVlLCBzdG9wRHJhd2luZ0FuZFJlbW92ZSk7XG4gICAgfSxcbiAgICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICAgIGN0eC51aS5zZXRCdXR0b25JbmFjdGl2ZSh0eXBlcy5QT0xZR09OKTtcbiAgICAgIGlmICghZmVhdHVyZS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgY3R4LnN0b3JlLmRlbGV0ZShbZmVhdHVyZS5pZF0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyOiBmdW5jdGlvbihnZW9qc29uLCBwdXNoKSB7XG4gICAgICBnZW9qc29uLnByb3BlcnRpZXMuYWN0aXZlID0gZ2VvanNvbi5wcm9wZXJ0aWVzLmlkID09PSBmZWF0dXJlLmlkID8gJ3RydWUnIDogJ2ZhbHNlJztcbiAgICAgIGdlb2pzb24ucHJvcGVydGllcy5tZXRhID0gZ2VvanNvbi5wcm9wZXJ0aWVzLmFjdGl2ZSA9PT0gJ3RydWUnID8gJ2ZlYXR1cmUnIDogZ2VvanNvbi5wcm9wZXJ0aWVzLm1ldGE7XG5cbiAgICAgIGlmIChnZW9qc29uLnByb3BlcnRpZXMuYWN0aXZlID09PSAndHJ1ZScgJiYgcG9zID09PSAxKSB7XG4gICAgICAgIGxldCBjb29yZHMgPSBbW2dlb2pzb24uZ2VvbWV0cnkuY29vcmRpbmF0ZXNbMF1bMF1bMF0sIGdlb2pzb24uZ2VvbWV0cnkuY29vcmRpbmF0ZXNbMF1bMF1bMV1dLCBbZ2VvanNvbi5nZW9tZXRyeS5jb29yZGluYXRlc1swXVsxXVswXSwgZ2VvanNvbi5nZW9tZXRyeS5jb29yZGluYXRlc1swXVsxXVsxXV1dO1xuICAgICAgICBwdXNoKHtcbiAgICAgICAgICAndHlwZSc6ICdGZWF0dXJlJyxcbiAgICAgICAgICAncHJvcGVydGllcyc6IGdlb2pzb24ucHJvcGVydGllcyxcbiAgICAgICAgICAnZ2VvbWV0cnknOiB7XG4gICAgICAgICAgICAnY29vcmRpbmF0ZXMnOiBjb29yZHMsXG4gICAgICAgICAgICAndHlwZSc6ICdMaW5lU3RyaW5nJ1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChnZW9qc29uLnByb3BlcnRpZXMuYWN0aXZlID09PSAnZmFsc2UnIHx8IHBvcyA+IDEpIHtcbiAgICAgICAgcHVzaChnZW9qc29uKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59O1xuIiwidmFyIHtub0ZlYXR1cmUsIGlzU2hpZnREb3duLCBpc0ZlYXR1cmUsIGlzT2ZNZXRhVHlwZX0gPSByZXF1aXJlKCcuLi9saWIvY29tbW9uX3NlbGVjdG9ycycpO1xudmFyIGFkZENvb3JkcyA9IHJlcXVpcmUoJy4uL2xpYi9hZGRfY29vcmRzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY3R4LCBzdGFydGluZ1NlbGVjdGVkRmVhdHVyZUlkcykge1xuXG4gIHZhciBzZWxlY3RlZEZlYXR1cmVzQnlJZCA9IHt9O1xuICAoc3RhcnRpbmdTZWxlY3RlZEZlYXR1cmVJZHMgfHwgW10pLmZvckVhY2goaWQgPT4ge1xuICAgIHNlbGVjdGVkRmVhdHVyZXNCeUlkW2lkXSA9IGN0eC5zdG9yZS5nZXQoaWQpO1xuICB9KTtcblxuICB2YXIgc3RhcnRQb3MgPSBudWxsO1xuICB2YXIgZHJhZ2dpbmcgPSBmYWxzZTtcbiAgdmFyIGZlYXR1cmVDb29yZHMgPSBudWxsO1xuICB2YXIgZmVhdHVyZXMgPSBudWxsO1xuICB2YXIgbnVtRmVhdHVyZXMgPSBudWxsO1xuXG4gIHZhciByZWFkeUZvckRpcmVjdFNlbGVjdCA9IGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoaXNGZWF0dXJlKGUpKSB7XG4gICAgICB2YXIgYWJvdXQgPSBlLmZlYXR1cmVUYXJnZXQucHJvcGVydGllcztcbiAgICAgIHJldHVybiBzZWxlY3RlZEZlYXR1cmVzQnlJZFthYm91dC5pZF0gIT09IHVuZGVmaW5lZCAmJiBzZWxlY3RlZEZlYXR1cmVzQnlJZFthYm91dC5pZF0udHlwZSAhPT0gJ1BvaW50JztcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIHZhciBidWlsZEZlYXR1cmVDb29yZHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZmVhdHVyZUlkcyA9IE9iamVjdC5rZXlzKHNlbGVjdGVkRmVhdHVyZXNCeUlkKTtcbiAgICBmZWF0dXJlQ29vcmRzID0gZmVhdHVyZUlkcy5tYXAoaWQgPT4gc2VsZWN0ZWRGZWF0dXJlc0J5SWRbaWRdLmdldENvb3JkaW5hdGVzKCkpO1xuICAgIGZlYXR1cmVzID0gZmVhdHVyZUlkcy5tYXAoaWQgPT4gc2VsZWN0ZWRGZWF0dXJlc0J5SWRbaWRdKTtcbiAgICBudW1GZWF0dXJlcyA9IGZlYXR1cmVJZHMubGVuZ3RoO1xuICB9O1xuXG4gIHZhciBkaXJlY3RTZWxlY3QgPSBmdW5jdGlvbihlKSB7XG4gICAgY3R4LmFwaS5jaGFuZ2VNb2RlKCdkaXJlY3Rfc2VsZWN0Jywge1xuICAgICAgZmVhdHVyZUlkOiBlLmZlYXR1cmVUYXJnZXQucHJvcGVydGllcy5pZFxuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5vbignY2xpY2snLCBub0ZlYXR1cmUsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgd2FzU2VsZWN0ZWQgPSBPYmplY3Qua2V5cyhzZWxlY3RlZEZlYXR1cmVzQnlJZCk7XG4gICAgICAgIHNlbGVjdGVkRmVhdHVyZXNCeUlkID0ge307XG4gICAgICAgIHdhc1NlbGVjdGVkLmZvckVhY2goaWQgPT4gdGhpcy5yZW5kZXIoaWQpKTtcbiAgICAgICAgdGhpcy5maXJlKCdzZWxlY3RlZC5lbmQnLCB7ZmVhdHVyZUlkczogd2FzU2VsZWN0ZWR9KTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLm9uKCdtb3VzZWRvd24nLCBpc09mTWV0YVR5cGUoJ3ZlcnRleCcpLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGN0eC5hcGkuY2hhbmdlTW9kZSgnZGlyZWN0X3NlbGVjdCcsIHtcbiAgICAgICAgICBmZWF0dXJlSWQ6IGUuZmVhdHVyZVRhcmdldC5wcm9wZXJ0aWVzLnBhcmVudCxcbiAgICAgICAgICBjb29yZFBhdGg6IGUuZmVhdHVyZVRhcmdldC5wcm9wZXJ0aWVzLmNvb3JkX3BhdGgsXG4gICAgICAgICAgaXNEcmFnZ2luZzogdHJ1ZSxcbiAgICAgICAgICBzdGFydFBvczogZS5sbmdMYXRcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5vbignbW91c2Vkb3duJywgaXNGZWF0dXJlLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGRyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgc3RhcnRQb3MgPSBlLmxuZ0xhdDtcbiAgICAgICAgdmFyIGlkID0gZS5mZWF0dXJlVGFyZ2V0LnByb3BlcnRpZXMuaWQ7XG5cbiAgICAgICAgdmFyIGlzU2VsZWN0ZWQgPSBzZWxlY3RlZEZlYXR1cmVzQnlJZFtpZF0gIT09IHVuZGVmaW5lZDtcblxuICAgICAgICBpZiAoaXNTZWxlY3RlZCAmJiAhaXNTaGlmdERvd24oZSkpIHtcbiAgICAgICAgICB0aGlzLm9uKCdjbGljaycsIHJlYWR5Rm9yRGlyZWN0U2VsZWN0LCBkaXJlY3RTZWxlY3QpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzU2VsZWN0ZWQgJiYgaXNTaGlmdERvd24oZSkpIHtcbiAgICAgICAgICBkZWxldGUgc2VsZWN0ZWRGZWF0dXJlc0J5SWRbaWRdO1xuICAgICAgICAgIHRoaXMuZmlyZSgnc2VsZWN0ZWQuZW5kJywge2ZlYXR1cmVJZHM6W2lkXX0pO1xuICAgICAgICAgIHRoaXMucmVuZGVyKGlkKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghaXNTZWxlY3RlZCAmJiBpc1NoaWZ0RG93bihlKSkge1xuICAgICAgICAgIC8vIGFkZCB0byBzZWxlY3RlZFxuICAgICAgICAgIHNlbGVjdGVkRmVhdHVyZXNCeUlkW2lkXSA9IGN0eC5zdG9yZS5nZXQoaWQpO1xuICAgICAgICAgIHRoaXMuZmlyZSgnc2VsZWN0ZWQuc3RhcnQnLCB7ZmVhdHVyZUlkczpbaWRdfSk7XG4gICAgICAgICAgdGhpcy5yZW5kZXIoaWQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIC8vbWFrZSBzZWxlY3RlZFxuICAgICAgICAgIHZhciB3YXNTZWxlY3RlZCA9IE9iamVjdC5rZXlzKHNlbGVjdGVkRmVhdHVyZXNCeUlkKTtcbiAgICAgICAgICB3YXNTZWxlY3RlZC5mb3JFYWNoKHdlcmVJZCA9PiB0aGlzLnJlbmRlcih3ZXJlSWQpKTtcbiAgICAgICAgICBzZWxlY3RlZEZlYXR1cmVzQnlJZCA9IHt9O1xuICAgICAgICAgIHNlbGVjdGVkRmVhdHVyZXNCeUlkW2lkXSA9IGN0eC5zdG9yZS5nZXQoaWQpO1xuICAgICAgICAgIHRoaXMuZmlyZSgnc2VsZWN0ZWQuZW5kJywge2ZlYXR1cmVJZHM6d2FzU2VsZWN0ZWR9KTtcbiAgICAgICAgICB0aGlzLmZpcmUoJ3NlbGVjdGVkLnN0YXJ0Jywge2ZlYXR1cmVJZHM6W2lkXX0pO1xuICAgICAgICAgIHRoaXMucmVuZGVyKGlkKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMub24oJ21vdXNldXAnLCAoKSA9PiB0cnVlLCBmdW5jdGlvbigpIHtcbiAgICAgICAgZHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgICAgZmVhdHVyZUNvb3JkcyA9IG51bGw7XG4gICAgICAgIGZlYXR1cmVzID0gbnVsbDtcbiAgICAgICAgbnVtRmVhdHVyZXMgPSBudWxsO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMub24oJ2RyYWcnLCAoKSA9PiBkcmFnZ2luZywgZnVuY3Rpb24oZSkge1xuICAgICAgICB0aGlzLm9mZignY2xpY2snLCByZWFkeUZvckRpcmVjdFNlbGVjdCwgZGlyZWN0U2VsZWN0KTtcbiAgICAgICAgZS5vcmlnaW5hbEV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBpZiAoZmVhdHVyZUNvb3JkcyA9PT0gbnVsbCkge1xuICAgICAgICAgIGJ1aWxkRmVhdHVyZUNvb3JkcygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxuZ0QgPSBlLmxuZ0xhdC5sbmcgLSBzdGFydFBvcy5sbmc7XG4gICAgICAgIHZhciBsYXREID0gZS5sbmdMYXQubGF0IC0gc3RhcnRQb3MubGF0O1xuXG4gICAgICAgIHZhciBjb29yZE1hcCA9IChjb29yZCkgPT4gW2Nvb3JkWzBdICsgbG5nRCwgY29vcmRbMV0gKyBsYXREXTtcbiAgICAgICAgdmFyIHJpbmdNYXAgPSAocmluZykgPT4gcmluZy5tYXAoY29vcmQgPT4gY29vcmRNYXAoY29vcmQpKTtcbiAgICAgICAgdmFyIG11dGxpTWFwID0gKG11bHRpKSA9PiBtdWx0aS5tYXAocmluZyA9PiByaW5nTWFwKHJpbmcpKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bUZlYXR1cmVzOyBpKyspIHtcbiAgICAgICAgICB2YXIgZmVhdHVyZSA9IGZlYXR1cmVzW2ldO1xuICAgICAgICAgIGlmIChmZWF0dXJlLnR5cGUgPT09ICdQb2ludCcpIHtcbiAgICAgICAgICAgIGZlYXR1cmUuc2V0Q29vcmRpbmF0ZXMoY29vcmRNYXAoZmVhdHVyZUNvb3Jkc1tpXSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChmZWF0dXJlLnR5cGUgPT09ICdMaW5lU3RyaW5nJyB8fCBmZWF0dXJlLnR5cGUgPT09ICdNdWx0aVBvaW50Jykge1xuICAgICAgICAgICAgZmVhdHVyZS5zZXRDb29yZGluYXRlcyhmZWF0dXJlQ29vcmRzW2ldLm1hcChjb29yZE1hcCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChmZWF0dXJlLnR5cGUgPT09ICdQb2x5Z29uJyB8fCBmZWF0dXJlLnR5cGUgPT09ICdNdWx0aUxpbmVTdHJpbmcnKSB7XG4gICAgICAgICAgICBmZWF0dXJlLnNldENvb3JkaW5hdGVzKGZlYXR1cmVDb29yZHNbaV0ubWFwKHJpbmdNYXApKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoZmVhdHVyZS50eXBlID09PSAnTXVsdGlQb2x5Z29uJykge1xuICAgICAgICAgICAgZmVhdHVyZS5zZXRDb29yZGluYXRlcyhmZWF0dXJlQ29vcmRzW2ldLm1hcChtdXRsaU1hcCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMub24oJ3RyYXNoJywgKCkgPT4gdHJ1ZSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGRyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgIGZlYXR1cmVDb29yZHMgPSBudWxsO1xuICAgICAgICBmZWF0dXJlcyA9IG51bGw7XG4gICAgICAgIG51bUZlYXR1cmVzID0gbnVsbDtcbiAgICAgICAgY3R4LnN0b3JlLmRlbGV0ZShPYmplY3Qua2V5cyhzZWxlY3RlZEZlYXR1cmVzQnlJZCkpO1xuICAgICAgICBzZWxlY3RlZEZlYXR1cmVzQnlJZCA9IHt9O1xuICAgICAgfSk7XG4gICAgfSxcbiAgICByZW5kZXI6IGZ1bmN0aW9uKGdlb2pzb24sIHB1c2gpIHtcbiAgICAgIGdlb2pzb24ucHJvcGVydGllcy5hY3RpdmUgPSBzZWxlY3RlZEZlYXR1cmVzQnlJZFtnZW9qc29uLnByb3BlcnRpZXMuaWRdID8gJ3RydWUnIDogJ2ZhbHNlJztcbiAgICAgIGlmIChnZW9qc29uLnByb3BlcnRpZXMuYWN0aXZlID09PSAndHJ1ZScgJiYgZ2VvanNvbi5nZW9tZXRyeS50eXBlICE9PSAnUG9pbnQnKSB7XG4gICAgICAgIGFkZENvb3JkcyhnZW9qc29uLCBmYWxzZSwgcHVzaCwgY3R4Lm1hcCwgW10pO1xuICAgICAgfVxuICAgICAgcHVzaChnZW9qc29uKTtcbiAgICB9XG4gIH07XG59O1xuIiwidmFyIGhhdCA9IHJlcXVpcmUoJ2hhdCcpO1xuXG5jb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgZGVmYXVsdE1vZGU6ICdzaW1wbGVfc2VsZWN0JyxcbiAgcG9zaXRpb246ICd0b3AtbGVmdCcsXG4gIGtleWJpbmRpbmdzOiB0cnVlLFxuICBkaXNwbGF5Q29udHJvbHNEZWZhdWx0OiB0cnVlLFxuICBzdHlsZXM6IHJlcXVpcmUoJy4vbGliL3RoZW1lJyksXG4gIGNvbnRyb2xzOiB7fVxufTtcblxuY29uc3Qgc2hvd0NvbnRyb2xzID0ge1xuICBwb2ludDogdHJ1ZSxcbiAgbGluZV9zdHJpbmc6IHRydWUsXG4gIHBvbHlnb246IHRydWUsXG4gIHRyYXNoOiB0cnVlXG59O1xuXG5jb25zdCBoaWRlQ29udHJvbHMgPSB7XG4gIHBvaW50OiBmYWxzZSxcbiAgbGluZV9zdHJpbmc6IGZhbHNlLFxuICBwb2x5Z29uOiBmYWxzZSxcbiAgdHJhc2g6IGZhbHNlXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdGlvbnMgPSB7Y29udHJvbHM6IHt9fSkge1xuXG4gIGlmIChvcHRpb25zLmRpc3BsYXlDb250cm9sc0RlZmF1bHQgPT09IGZhbHNlKSB7XG4gICAgb3B0aW9ucy5jb250cm9scyA9IE9iamVjdC5hc3NpZ24oaGlkZUNvbnRyb2xzLCBvcHRpb25zLmNvbnRyb2xzKTtcbiAgfSBlbHNlIHtcbiAgICBvcHRpb25zLmNvbnRyb2xzID0gT2JqZWN0LmFzc2lnbihzaG93Q29udHJvbHMsIG9wdGlvbnMuY29udHJvbHMpO1xuICB9XG5cbiAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpO1xuXG4gIG9wdGlvbnMuc3R5bGVzID0gb3B0aW9ucy5zdHlsZXMucmVkdWNlKChtZW1vLCBzdHlsZSkgPT4ge1xuICAgIHN0eWxlLmlkID0gc3R5bGUuaWQgfHwgaGF0KCk7XG4gICAgaWYgKHN0eWxlLnNvdXJjZSkge1xuICAgICAgbWVtby5wdXNoKHN0eWxlKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2YXIgaWQgPSBzdHlsZS5pZDtcbiAgICAgIHN0eWxlLmlkID0gYCR7aWR9LmhvdGA7XG4gICAgICBzdHlsZS5zb3VyY2UgPSAnbWFwYm94LWdsLWRyYXctaG90JztcbiAgICAgIG1lbW8ucHVzaChKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHN0eWxlKSkpO1xuXG4gICAgICBzdHlsZS5pZCA9IGAke2lkfS5jb2xkYDtcbiAgICAgIHN0eWxlLnNvdXJjZSA9ICdtYXBib3gtZ2wtZHJhdy1jb2xkJztcbiAgICAgIG1lbW8ucHVzaChKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHN0eWxlKSkpO1xuICAgIH1cblxuICAgIHJldHVybiBtZW1vO1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiByZW5kZXIoKSB7XG4gIHZhciBpc1N0aWxsQWxpdmUgPSB0aGlzLmN0eC5tYXAgJiYgdGhpcy5jdHgubWFwLmdldFNvdXJjZSgnbWFwYm94LWdsLWRyYXctaG90JykgIT09IHVuZGVmaW5lZDtcbiAgaWYgKGlzU3RpbGxBbGl2ZSkgeyAvLyBjaGVja3MgdG8gbWFrZSBzdXJlIHdlIHN0aWxsIGhhdmUgYSBtYXBcbiAgICB2YXIgbW9kZSA9IHRoaXMuY3R4LmV2ZW50cy5jdXJyZW50TW9kZU5hbWUoKTtcbiAgICB0aGlzLmN0eC51aS5zZXRDbGFzcyh7XG4gICAgICBtb2RlOiBtb2RlXG4gICAgfSk7XG5cbiAgICB2YXIgbmV3SG90SWRzID0gW107XG4gICAgdmFyIG5ld0NvbGRJZHMgPSBbXTtcblxuICAgIGlmICh0aGlzLmlzRGlydHkpIHtcbiAgICAgIG5ld0NvbGRJZHMgPSB0aGlzLmZlYXR1cmVJZHM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgbmV3SG90SWRzID0gdGhpcy5jaGFuZ2VkSWRzLmZpbHRlcihpZCA9PiB0aGlzLmZlYXR1cmVzW2lkXSAhPT0gdW5kZWZpbmVkKTtcbiAgICAgIG5ld0NvbGRJZHMgPSB0aGlzLnNvdXJjZXMuaG90LmZpbHRlcihmdW5jdGlvbiBnZXRDb2xkSWRzKGdlb2pzb24pIHtcbiAgICAgICAgcmV0dXJuIGdlb2pzb24ucHJvcGVydGllcy5pZCAmJiBuZXdIb3RJZHMuaW5kZXhPZihnZW9qc29uLnByb3BlcnRpZXMuaWQpID09PSAtMSAmJiB0aGlzLmZlYXR1cmVzW2dlb2pzb24ucHJvcGVydGllcy5pZF0gIT09IHVuZGVmaW5lZDtcbiAgICAgIH0uYmluZCh0aGlzKSkubWFwKGdlb2pzb24gPT4gZ2VvanNvbi5wcm9wZXJ0aWVzLmlkKTtcbiAgICB9XG5cbiAgICB0aGlzLnNvdXJjZXMuaG90ID0gW107XG4gICAgbGV0IGxhc3RDb2xkQ291bnQgPSB0aGlzLnNvdXJjZXMuY29sZC5sZW5ndGg7XG4gICAgdGhpcy5zb3VyY2VzLmNvbGQgPSB0aGlzLmlzRGlydHkgPyBbXSA6IHRoaXMuc291cmNlcy5jb2xkLmZpbHRlcihmdW5jdGlvbiBzYXZlQ29sZEZlYXR1cmVzKGdlb2pzb24pIHtcbiAgICAgIHZhciBpZCA9IGdlb2pzb24ucHJvcGVydGllcy5pZCB8fCBnZW9qc29uLnByb3BlcnRpZXMucGFyZW50O1xuICAgICAgcmV0dXJuIG5ld0hvdElkcy5pbmRleE9mKGlkKSA9PT0gLTE7XG4gICAgfSk7XG5cbiAgICBsZXQgY2hhbmdlZCA9IFtdO1xuICAgIG5ld0hvdElkcy5jb25jYXQobmV3Q29sZElkcykubWFwKGZ1bmN0aW9uIHByZXBGb3JWaWV3VXBkYXRlcyhpZCkge1xuICAgICAgaWYgKG5ld0hvdElkcy5pbmRleE9mKGlkKSA+IC0xKSB7XG4gICAgICAgIHJldHVybiB7c291cmNlOiAnaG90JywgJ2lkJzogaWR9O1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJldHVybiB7c291cmNlOiAnY29sZCcsICdpZCc6IGlkfTtcbiAgICAgIH1cbiAgICB9KS5mb3JFYWNoKGZ1bmN0aW9uIGNhbGN1bGF0ZVZpZXdVcGRhdGUoY2hhbmdlKSB7XG4gICAgICBsZXQge2lkLCBzb3VyY2V9ID0gY2hhbmdlO1xuICAgICAgbGV0IGZlYXR1cmUgPSB0aGlzLmZlYXR1cmVzW2lkXTtcbiAgICAgIGxldCBmZWF0dXJlSW50ZXJuYWwgPSBmZWF0dXJlLmludGVybmFsKG1vZGUpO1xuXG4gICAgICBpZiAoc291cmNlID09PSAnaG90JyAmJiBmZWF0dXJlLmlzVmFsaWQoKSkge1xuICAgICAgICBjaGFuZ2VkLnB1c2goZmVhdHVyZS50b0dlb0pTT04oKSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuY3R4LmV2ZW50cy5jdXJyZW50TW9kZVJlbmRlcihmZWF0dXJlSW50ZXJuYWwsIGZ1bmN0aW9uIGFkZEdlb0pzb25Ub1ZpZXcoZ2VvanNvbikge1xuICAgICAgICB0aGlzLnNvdXJjZXNbc291cmNlXS5wdXNoKGdlb2pzb24pO1xuICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgaWYgKGxhc3RDb2xkQ291bnQgIT09IHRoaXMuc291cmNlcy5jb2xkLmxlbmd0aCkge1xuICAgICAgdGhpcy5jdHgubWFwLmdldFNvdXJjZSgnbWFwYm94LWdsLWRyYXctY29sZCcpLnNldERhdGEoe1xuICAgICAgICB0eXBlOiAnRmVhdHVyZUNvbGxlY3Rpb24nLFxuICAgICAgICBmZWF0dXJlczogdGhpcy5zb3VyY2VzLmNvbGRcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuY3R4Lm1hcC5nZXRTb3VyY2UoJ21hcGJveC1nbC1kcmF3LWhvdCcpLnNldERhdGEoe1xuICAgICAgdHlwZTogJ0ZlYXR1cmVDb2xsZWN0aW9uJyxcbiAgICAgIGZlYXR1cmVzOiB0aGlzLnNvdXJjZXMuaG90XG4gICAgfSk7XG5cbiAgICBpZiAoY2hhbmdlZC5sZW5ndGgpIHtcbiAgICAgIHRoaXMuY3R4Lm1hcC5maXJlKCdkcmF3LmNoYW5nZWQnLCB7ZmVhdHVyZXM6IGNoYW5nZWR9KTtcbiAgICB9XG5cbiAgfVxuICB0aGlzLmlzRGlydHkgPSBmYWxzZTtcbiAgdGhpcy5jaGFuZ2VkSWRzID0gW107XG59O1xuIiwidmFyIGV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJyk7XG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlJyk7XG52YXIgdWkgPSByZXF1aXJlKCcuL3VpJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY3R4KSB7XG5cbiAgY3R4LmV2ZW50cyA9IGV2ZW50cyhjdHgpO1xuXG4gIGN0eC5tYXAgPSBudWxsO1xuICBjdHguY29udGFpbmVyID0gbnVsbDtcbiAgY3R4LnN0b3JlID0gbnVsbDtcbiAgdWkoY3R4KTtcblxuICB2YXIgc2V0dXAgPSB7XG4gICAgYWRkVG86IGZ1bmN0aW9uKG1hcCkge1xuICAgICAgICBjdHgubWFwID0gbWFwO1xuICAgICAgICBzZXR1cC5vbkFkZChtYXApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgICBzZXR1cC5yZW1vdmVMYXllcnMoKTtcbiAgICAgIGN0eC51aS5yZW1vdmVCdXR0b25zKCk7XG4gICAgICBjdHguZXZlbnRzLnJlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XG4gICAgICBjdHgubWFwID0gbnVsbDtcbiAgICAgIGN0eC5jb250YWluZXIgPSBudWxsO1xuICAgICAgY3R4LnN0b3JlID0gbnVsbDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgb25BZGQ6IGZ1bmN0aW9uKG1hcCkge1xuICAgICAgY3R4LmNvbnRhaW5lciA9IG1hcC5nZXRDb250YWluZXIoKTtcbiAgICAgIGN0eC5zdG9yZSA9IG5ldyBTdG9yZShjdHgpO1xuXG4gICAgICBjdHgudWkuYWRkQnV0dG9ucygpO1xuXG4gICAgICBpZiAobWFwLnN0eWxlLmxvYWRlZCgpKSB7IC8vIG5vdCBwdWJsaWNcbiAgICAgICAgY3R4LmV2ZW50cy5hZGRFdmVudExpc3RlbmVycygpO1xuICAgICAgICBzZXR1cC5hZGRMYXllcnMoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1hcC5vbignbG9hZCcsICgpID0+IHtcbiAgICAgICAgICBjdHguZXZlbnRzLmFkZEV2ZW50TGlzdGVuZXJzKCk7XG4gICAgICAgICAgc2V0dXAuYWRkTGF5ZXJzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgYWRkTGF5ZXJzOiBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGRyYXduIGZlYXR1cmVzIHN0eWxlXG4gICAgICBjdHgubWFwLmFkZFNvdXJjZSgnbWFwYm94LWdsLWRyYXctY29sZCcsIHtcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHR5cGU6ICdGZWF0dXJlQ29sbGVjdGlvbicsXG4gICAgICAgICAgZmVhdHVyZXM6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIHR5cGU6ICdnZW9qc29uJ1xuICAgICAgfSk7XG5cbiAgICAgIC8vIGhvdCBmZWF0dXJlcyBzdHlsZVxuICAgICAgY3R4Lm1hcC5hZGRTb3VyY2UoJ21hcGJveC1nbC1kcmF3LWhvdCcsIHtcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHR5cGU6ICdGZWF0dXJlQ29sbGVjdGlvbicsXG4gICAgICAgICAgZmVhdHVyZXM6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIHR5cGU6ICdnZW9qc29uJ1xuICAgICAgfSk7XG5cbiAgICAgIGN0eC5vcHRpb25zLnN0eWxlcy5mb3JFYWNoKHN0eWxlID0+IHtcbiAgICAgICAgY3R4Lm1hcC5hZGRMYXllcihzdHlsZSk7XG4gICAgICB9KTtcblxuICAgICAgY3R4LnN0b3JlLnJlbmRlcigpO1xuICAgIH0sXG4gICAgcmVtb3ZlTGF5ZXJzOiBmdW5jdGlvbigpIHtcbiAgICAgIGN0eC5vcHRpb25zLnN0eWxlcy5mb3JFYWNoKHN0eWxlID0+IHtcbiAgICAgICAgY3R4Lm1hcC5yZW1vdmVMYXllcihzdHlsZS5pZCk7XG4gICAgICB9KTtcblxuICAgICAgY3R4Lm1hcC5yZW1vdmVTb3VyY2UoJ21hcGJveC1nbC1kcmF3LWNvbGQnKTtcbiAgICAgIGN0eC5tYXAucmVtb3ZlU291cmNlKCdtYXBib3gtZ2wtZHJhdy1ob3QnKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHNldHVwO1xufTtcbiIsInZhciB7dGhyb3R0bGV9ID0gcmVxdWlyZSgnLi9saWIvdXRpbCcpO1xudmFyIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyJyk7XG5cbnZhciBTdG9yZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY3R4KSB7XG4gIHRoaXMuY3R4ID0gY3R4O1xuICB0aGlzLmZlYXR1cmVzID0ge307XG4gIHRoaXMuZmVhdHVyZUlkcyA9IFtdO1xuICB0aGlzLnNvdXJjZXMgPSB7XG4gICAgaG90OiBbXSxcbiAgICBjb2xkOiBbXVxuICB9O1xuICB0aGlzLnJlbmRlciA9IHRocm90dGxlKHJlbmRlciwgMTYsIHRoaXMpO1xuXG4gIHRoaXMuaXNEaXJ0eSA9IGZhbHNlO1xuICB0aGlzLmNoYW5nZWRJZHMgPSBbXTtcbn07XG5cblN0b3JlLnByb3RvdHlwZS5zZXREaXJ0eSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmlzRGlydHkgPSB0cnVlO1xufTtcblxuU3RvcmUucHJvdG90eXBlLmZlYXR1cmVDaGFuZ2VkID0gZnVuY3Rpb24oaWQpIHtcbiAgaWYgKHRoaXMuY2hhbmdlZElkcy5pbmRleE9mKGlkKSA9PT0gLTEpIHtcbiAgICB0aGlzLmNoYW5nZWRJZHMucHVzaChpZCk7XG4gIH1cbn07XG5cblN0b3JlLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihmZWF0dXJlKSB7XG4gIHRoaXMuZmVhdHVyZUNoYW5nZWQoZmVhdHVyZS5pZCk7XG4gIHRoaXMuZmVhdHVyZXNbZmVhdHVyZS5pZF0gPSBmZWF0dXJlO1xuICBpZiAodGhpcy5mZWF0dXJlSWRzLmluZGV4T2YoZmVhdHVyZS5pZCkgPT09IC0xKSB7XG4gICAgdGhpcy5mZWF0dXJlSWRzLnB1c2goZmVhdHVyZS5pZCk7XG4gIH1cbiAgcmV0dXJuIGZlYXR1cmUuaWQ7XG59O1xuXG5TdG9yZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oaWQpIHtcbiAgcmV0dXJuIHRoaXMuZmVhdHVyZXNbaWRdO1xufTtcblxuU3RvcmUucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5mZWF0dXJlcykubWFwKGlkID0+IHRoaXMuZmVhdHVyZXNbaWRdKTtcbn07XG5cblN0b3JlLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAoaWRzKSB7XG4gIHZhciBkZWxldGVkID0gW107XG4gIGlkcy5mb3JFYWNoKChpZCkgPT4ge1xuICAgIHZhciBpZHggPSB0aGlzLmZlYXR1cmVJZHMuaW5kZXhPZihpZCk7XG4gICAgaWYgKGlkeCAhPT0gLTEpIHtcbiAgICAgIHZhciBmZWF0dXJlID0gdGhpcy5nZXQoaWQpO1xuICAgICAgZGVsZXRlZC5wdXNoKGZlYXR1cmUudG9HZW9KU09OKCkpO1xuICAgICAgZGVsZXRlIHRoaXMuZmVhdHVyZXNbaWRdO1xuICAgICAgdGhpcy5mZWF0dXJlSWRzLnNwbGljZShpZHgsIDEpO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKGRlbGV0ZWQubGVuZ3RoID4gMCkge1xuICAgIHRoaXMuaXNEaXJ0eSA9IHRydWU7XG4gICAgdGhpcy5jdHgubWFwLmZpcmUoJ2RyYXcuZGVsZXRlZCcsIHtmZWF0dXJlSWRzOmRlbGV0ZWR9KTtcbiAgfVxufTtcbiIsImNvbnN0IHR5cGVzID0gcmVxdWlyZSgnLi9saWIvdHlwZXMnKTtcbnZhciB7Y3JlYXRlQnV0dG9ufSA9IHJlcXVpcmUoJy4vbGliL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjdHgpIHtcblxuICB2YXIgYnV0dG9ucyA9IHt9O1xuXG4gIHZhciBjdXJyZW50Q2xhc3MgPSB7XG4gICAgbW9kZTogbnVsbCxcbiAgICBmZWF0dXJlOiBudWxsLFxuICAgIG1vdXNlOiBudWxsXG4gIH07XG5cbiAgdmFyIG5leHRDbGFzcyA9IHtcbiAgICBtb2RlOiBudWxsLFxuICAgIGZlYXR1cmU6IG51bGwsXG4gICAgbW91c2U6IG51bGxcbiAgfTtcblxuICB2YXIgY2xhc3NUeXBlcyA9IFsnbW9kZScsICdmZWF0dXJlJywgJ21vdXNlJ107XG5cbiAgbGV0IHVwZGF0ZSA9ICgpID0+IHtcbiAgICBpZiAoY3R4LmNvbnRhaW5lcikge1xuXG4gICAgICB2YXIgcmVtb3ZlID0gW107XG4gICAgICB2YXIgYWRkID0gW107XG5cbiAgICAgIHZhciBjbGFzc05hbWUgPSBbXTtcblxuICAgICAgbmV4dENsYXNzLmZlYXR1cmUgPSBuZXh0Q2xhc3MubW91c2UgPT09ICdub25lJyA/IG51bGwgOiBuZXh0Q2xhc3MuZmVhdHVyZTtcblxuICAgICAgY2xhc3NUeXBlcy5mb3JFYWNoKGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgY2xhc3NOYW1lLnB1c2godHlwZSArICctJyArIG5leHRDbGFzc1t0eXBlXSk7XG4gICAgICAgIGlmIChuZXh0Q2xhc3NbdHlwZV0gIT09IGN1cnJlbnRDbGFzc1t0eXBlXSkge1xuICAgICAgICAgIHJlbW92ZS5wdXNoKHR5cGUgKyAnLScgKyBjdXJyZW50Q2xhc3NbdHlwZV0pO1xuICAgICAgICAgIGlmIChuZXh0Q2xhc3NbdHlwZV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgIGFkZC5wdXNoKHR5cGUgKyAnLScgKyBuZXh0Q2xhc3NbdHlwZV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChyZW1vdmUubGVuZ3RoKSB7XG4gICAgICAgIGN0eC5jb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZS5hcHBseShjdHguY29udGFpbmVyLmNsYXNzTGlzdCwgcmVtb3ZlKTtcbiAgICAgICAgY3R4LmNvbnRhaW5lci5jbGFzc0xpc3QuYWRkLmFwcGx5KGN0eC5jb250YWluZXIuY2xhc3NMaXN0LCBhZGQpO1xuICAgICAgfVxuXG4gICAgICBjbGFzc1R5cGVzLmZvckVhY2godHlwZSA9PiB7XG4gICAgICAgIGN1cnJlbnRDbGFzc1t0eXBlXSA9IG5leHRDbGFzc1t0eXBlXTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICBjdHgudWkgPSB7XG4gICAgc2V0Q2xhc3M6IGZ1bmN0aW9uKG9wdHMpIHtcbiAgICAgICAgY2xhc3NUeXBlcy5mb3JFYWNoKHR5cGUgPT4ge1xuICAgICAgICBpZiAob3B0c1t0eXBlXSkge1xuICAgICAgICAgIG5leHRDbGFzc1t0eXBlXSA9IG9wdHNbdHlwZV07XG4gICAgICAgICAgaWYgKG5leHRDbGFzc1t0eXBlXSAhPT0gY3VycmVudENsYXNzW3R5cGVdKSB7XG4gICAgICAgICAgICB1cGRhdGUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgYWRkQnV0dG9uczogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY29udHJvbENsYXNzID0gJ21hcGJveC1nbC1kcmF3X2N0cmwtZHJhdy1idG4nO1xuICAgICAgdmFyIGNvbnRyb2xzID0gY3R4Lm9wdGlvbnMuY29udHJvbHM7XG4gICAgICB2YXIgY3RybFBvcyA9ICdtYXBib3hnbC1jdHJsLSc7XG4gICAgICAgIHN3aXRjaCAoY3R4Lm9wdGlvbnMucG9zaXRpb24pIHtcbiAgICAgICAgICBjYXNlICd0b3AtbGVmdCc6XG4gICAgICAgICAgY2FzZSAndG9wLXJpZ2h0JzpcbiAgICAgICAgICBjYXNlICdib3R0b20tbGVmdCc6XG4gICAgICAgICAgY2FzZSAnYm90dG9tLXJpZ2h0JzpcbiAgICAgICAgICAgIGN0cmxQb3MgKz0gY3R4Lm9wdGlvbnMucG9zaXRpb247XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgY3RybFBvcyArPSAndG9wLWxlZnQnO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNvbnRyb2xDb250YWluZXIgPSBjdHguY29udGFpbmVyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoY3RybFBvcylbMF07XG4gICAgICAgIGxldCBjb250cm9sR3JvdXAgPSBjb250cm9sQ29udGFpbmVyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ21hcGJveGdsLWN0cmwtZ3JvdXAnKVswXTtcbiAgICAgICAgaWYgKCFjb250cm9sR3JvdXApIHtcbiAgICAgICAgICBjb250cm9sR3JvdXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICBjb250cm9sR3JvdXAuY2xhc3NOYW1lID0gJ21hcGJveGdsLWN0cmwtZ3JvdXAgbWFwYm94Z2wtY3RybCc7XG5cbiAgICAgICAgICBsZXQgYXR0cmlidXRpb25Db250cm9sID0gY29udHJvbENvbnRhaW5lci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdtYXBib3hnbC1jdHJsLWF0dHJpYicpWzBdO1xuICAgICAgICAgIGlmIChhdHRyaWJ1dGlvbkNvbnRyb2wpIHtcbiAgICAgICAgICAgIGNvbnRyb2xDb250YWluZXIuaW5zZXJ0QmVmb3JlKGNvbnRyb2xHcm91cCwgYXR0cmlidXRpb25Db250cm9sKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb250cm9sQ29udGFpbmVyLmFwcGVuZENoaWxkKGNvbnRyb2xHcm91cCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbnRyb2xzLmxpbmVfc3RyaW5nKSB7XG4gICAgICAgICAgYnV0dG9uc1t0eXBlcy5MSU5FXSA9IGNyZWF0ZUJ1dHRvbihjb250cm9sR3JvdXAsIHtcbiAgICAgICAgICAgIGNsYXNzTmFtZTogYCR7Y29udHJvbENsYXNzfSBtYXBib3gtZ2wtZHJhd19saW5lYCxcbiAgICAgICAgICAgIHRpdGxlOiBgTGluZVN0cmluZyB0b29sICR7Y3R4Lm9wdGlvbnMua2V5YmluZGluZ3MgJiYgJyhsKSd9YCxcbiAgICAgICAgICAgIGZuOiAoKSA9PiBjdHguYXBpLmNoYW5nZU1vZGUoJ2RyYXdfbGluZV9zdHJpbmcnKVxuICAgICAgICAgIH0sIGNvbnRyb2xDbGFzcyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29udHJvbHNbdHlwZXMuUE9MWUdPTl0pIHtcbiAgICAgICAgICBidXR0b25zW3R5cGVzLlBPTFlHT05dID0gY3JlYXRlQnV0dG9uKGNvbnRyb2xHcm91cCwge1xuICAgICAgICAgICAgY2xhc3NOYW1lOiBgJHtjb250cm9sQ2xhc3N9IG1hcGJveC1nbC1kcmF3X3BvbHlnb25gLFxuICAgICAgICAgICAgdGl0bGU6IGBQb2x5Z29uIHRvb2wgJHtjdHgub3B0aW9ucy5rZXliaW5kaW5ncyAmJiAnKHApJ31gLFxuICAgICAgICAgICAgZm46ICgpID0+IGN0eC5hcGkuY2hhbmdlTW9kZSgnZHJhd19wb2x5Z29uJylcbiAgICAgICAgICB9LCBjb250cm9sQ2xhc3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbnRyb2xzW3R5cGVzLlBPSU5UXSkge1xuICAgICAgICAgIGJ1dHRvbnNbdHlwZXMuUE9JTlRdID0gY3JlYXRlQnV0dG9uKGNvbnRyb2xHcm91cCwge1xuICAgICAgICAgICAgY2xhc3NOYW1lOiBgJHtjb250cm9sQ2xhc3N9IG1hcGJveC1nbC1kcmF3X3BvaW50YCxcbiAgICAgICAgICAgIHRpdGxlOiBgTWFya2VyIHRvb2wgJHtjdHgub3B0aW9ucy5rZXliaW5kaW5ncyAmJiAnKG0pJ31gLFxuICAgICAgICAgICAgZm46ICgpID0+IGN0eC5hcGkuY2hhbmdlTW9kZSgnZHJhd19wb2ludCcpXG4gICAgICAgICAgfSwgY29udHJvbENsYXNzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb250cm9scy50cmFzaCkge1xuICAgICAgICAgIGJ1dHRvbnMudHJhc2ggPSBjcmVhdGVCdXR0b24oY29udHJvbEdyb3VwLCB7XG4gICAgICAgICAgICBjbGFzc05hbWU6IGAke2NvbnRyb2xDbGFzc30gbWFwYm94LWdsLWRyYXdfdHJhc2hgLFxuICAgICAgICAgICAgdGl0bGU6ICdkZWxldGUnLFxuICAgICAgICAgICAgZm46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBjdHguYXBpLnRyYXNoKCk7XG4gICAgICAgICAgICAgIGN0eC51aS5zZXRCdXR0b25JbmFjdGl2ZSgndHJhc2gnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LCBjb250cm9sQ2xhc3MpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgc2V0QnV0dG9uQWN0aXZlOiBmdW5jdGlvbihpZCkge1xuICAgICAgICBpZiAoYnV0dG9uc1tpZF0gJiYgaWQgIT09ICd0cmFzaCcpIHtcbiAgICAgICAgICAgIGJ1dHRvbnNbaWRdLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgc2V0QnV0dG9uSW5hY3RpdmU6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIGlmIChidXR0b25zW2lkXSkge1xuICAgICAgICAgIGJ1dHRvbnNbaWRdLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgc2V0QWxsSW5hY3RpdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYnV0dG9uSWRzID0gT2JqZWN0LmtleXMoYnV0dG9ucyk7XG5cbiAgICAgICAgYnV0dG9uSWRzLmZvckVhY2goYnV0dG9uSWQgPT4ge1xuICAgICAgICAgIGlmIChidXR0b25JZCAhPT0gJ3RyYXNoJykge1xuICAgICAgICAgICAgdmFyIGJ1dHRvbiA9IGJ1dHRvbnNbYnV0dG9uSWRdO1xuICAgICAgICAgICAgYnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgcmVtb3ZlQnV0dG9uczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBidXR0b25JZHMgPSBPYmplY3Qua2V5cyhidXR0b25zKTtcblxuICAgICAgICBidXR0b25JZHMuZm9yRWFjaChidXR0b25JZCA9PiB7XG4gICAgICAgICAgdmFyIGJ1dHRvbiA9IGJ1dHRvbnNbYnV0dG9uSWRdO1xuICAgICAgICAgIGlmIChidXR0b24ucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgYnV0dG9uLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoYnV0dG9uKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnV0dG9uc1tidXR0b25JZF0gPSBudWxsO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xufTtcbiJdfQ==
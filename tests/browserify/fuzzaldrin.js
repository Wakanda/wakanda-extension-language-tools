(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function() {
  var pluckCandidates, scorer, sortCandidates;

  scorer = require('./scorer');

  pluckCandidates = function(a) {
    return a.candidate;
  };

  sortCandidates = function(a, b) {
    return b.score - a.score;
  };

  module.exports = function(candidates, query, queryHasSlashes, _arg) {
    var candidate, key, maxResults, score, scoredCandidates, string, _i, _len, _ref;
    _ref = _arg != null ? _arg : {}, key = _ref.key, maxResults = _ref.maxResults;
    if (query) {
      scoredCandidates = [];
      for (_i = 0, _len = candidates.length; _i < _len; _i++) {
        candidate = candidates[_i];
        string = key != null ? candidate[key] : candidate;
        if (!string) {
          continue;
        }
        score = scorer.score(string, query, queryHasSlashes);
        if (!queryHasSlashes) {
          score = scorer.basenameScore(string, query, score);
        }
        if (score > 0) {
          scoredCandidates.push({
            candidate: candidate,
            score: score
          });
        }
      }
      scoredCandidates.sort(sortCandidates);
      candidates = scoredCandidates.map(pluckCandidates);
    }
    if (maxResults != null) {
      candidates = candidates.slice(0, maxResults);
    }
    return candidates;
  };

}).call(this);

},{"./scorer":4}],2:[function(require,module,exports){
(function() {
  var PathSeparator, SpaceRegex, filter, matcher, scorer;

  scorer = require('./scorer');

  filter = require('./filter');

  matcher = require('./matcher');

  PathSeparator = "/";//require('path').sep;

  SpaceRegex = /\ /g;

  module.exports = {
    filter: function(candidates, query, options) {
      var queryHasSlashes;
      if (query) {
        queryHasSlashes = query.indexOf(PathSeparator) !== -1;
        query = query.replace(SpaceRegex, '');
      }
      return filter(candidates, query, queryHasSlashes, options);
    },
    score: function(string, query) {
      var queryHasSlashes, score;
      if (!string) {
        return 0;
      }
      if (!query) {
        return 0;
      }
      if (string === query) {
        return 2;
      }
      queryHasSlashes = query.indexOf(PathSeparator) !== -1;
      query = query.replace(SpaceRegex, '');
      score = scorer.score(string, query);
      if (!queryHasSlashes) {
        score = scorer.basenameScore(string, query, score);
      }
      return score;
    },
    match: function(string, query) {
      var baseMatches, index, matches, queryHasSlashes, seen, _i, _ref, _results;
      if (!string) {
        return [];
      }
      if (!query) {
        return [];
      }
      if (string === query) {
        return (function() {
          _results = [];
          for (var _i = 0, _ref = string.length; 0 <= _ref ? _i < _ref : _i > _ref; 0 <= _ref ? _i++ : _i--){ _results.push(_i); }
          return _results;
        }).apply(this);
      }
      queryHasSlashes = query.indexOf(PathSeparator) !== -1;
      query = query.replace(SpaceRegex, '');
      matches = matcher.match(string, query);
      if (!queryHasSlashes) {
        baseMatches = matcher.basenameMatch(string, query);
        matches = matches.concat(baseMatches).sort(function(a, b) {
          return a - b;
        });
        seen = null;
        index = 0;
        while (index < matches.length) {
          if (index && seen === matches[index]) {
            matches.splice(index, 1);
          } else {
            seen = matches[index];
            index++;
          }
        }
      }
      return matches;
    }
  };

}).call(this);

},{"./filter":1,"./matcher":3,"./scorer":4}],3:[function(require,module,exports){
(function() {
  var PathSeparator;

  PathSeparator = "/";//require('path').sep;

  exports.basenameMatch = function(string, query) {
    var base, index, lastCharacter, slashCount;
    index = string.length - 1;
    while (string[index] === PathSeparator) {
      index--;
    }
    slashCount = 0;
    lastCharacter = index;
    base = null;
    while (index >= 0) {
      if (string[index] === PathSeparator) {
        slashCount++;
        if (base == null) {
          base = string.substring(index + 1, lastCharacter + 1);
        }
      } else if (index === 0) {
        if (lastCharacter < string.length - 1) {
          if (base == null) {
            base = string.substring(0, lastCharacter + 1);
          }
        } else {
          if (base == null) {
            base = string;
          }
        }
      }
      index--;
    }
    return exports.match(base, query, string.length - base.length);
  };

  exports.match = function(string, query, stringOffset) {
    var character, indexInQuery, indexInString, lowerCaseIndex, matches, minIndex, queryLength, stringLength, upperCaseIndex, _i, _ref, _results;
    if (stringOffset == null) {
      stringOffset = 0;
    }
    if (string === query) {
      return (function() {
        _results = [];
        for (var _i = stringOffset, _ref = stringOffset + string.length; stringOffset <= _ref ? _i < _ref : _i > _ref; stringOffset <= _ref ? _i++ : _i--){ _results.push(_i); }
        return _results;
      }).apply(this);
    }
    queryLength = query.length;
    stringLength = string.length;
    indexInQuery = 0;
    indexInString = 0;
    matches = [];
    while (indexInQuery < queryLength) {
      character = query[indexInQuery++];
      lowerCaseIndex = string.indexOf(character.toLowerCase());
      upperCaseIndex = string.indexOf(character.toUpperCase());
      minIndex = Math.min(lowerCaseIndex, upperCaseIndex);
      if (minIndex === -1) {
        minIndex = Math.max(lowerCaseIndex, upperCaseIndex);
      }
      indexInString = minIndex;
      if (indexInString === -1) {
        return [];
      }
      matches.push(stringOffset + indexInString);
      stringOffset += indexInString + 1;
      string = string.substring(indexInString + 1, stringLength);
    }
    return matches;
  };

}).call(this);

},{}],4:[function(require,module,exports){
(function() {
  var PathSeparator, queryIsLastPathSegment;

  PathSeparator = "/";//require('path').sep;

  exports.basenameScore = function(string, query, score) {
    var base, depth, index, lastCharacter, segmentCount, slashCount;
    index = string.length - 1;
    while (string[index] === PathSeparator) {
      index--;
    }
    slashCount = 0;
    lastCharacter = index;
    base = null;
    while (index >= 0) {
      if (string[index] === PathSeparator) {
        slashCount++;
        if (base == null) {
          base = string.substring(index + 1, lastCharacter + 1);
        }
      } else if (index === 0) {
        if (lastCharacter < string.length - 1) {
          if (base == null) {
            base = string.substring(0, lastCharacter + 1);
          }
        } else {
          if (base == null) {
            base = string;
          }
        }
      }
      index--;
    }
    if (base === string) {
      score *= 2;
    } else if (base) {
      score += exports.score(base, query);
    }
    segmentCount = slashCount + 1;
    depth = Math.max(1, 10 - segmentCount);
    score *= depth * 0.01;
    return score;
  };

  exports.score = function(string, query) {
    var character, characterScore, indexInQuery, indexInString, lowerCaseIndex, minIndex, queryLength, queryScore, stringLength, totalCharacterScore, upperCaseIndex, _ref;
    if (string === query) {
      return 1;
    }
    if (queryIsLastPathSegment(string, query)) {
      return 1;
    }
    totalCharacterScore = 0;
    queryLength = query.length;
    stringLength = string.length;
    indexInQuery = 0;
    indexInString = 0;
    while (indexInQuery < queryLength) {
      character = query[indexInQuery++];
      lowerCaseIndex = string.indexOf(character.toLowerCase());
      upperCaseIndex = string.indexOf(character.toUpperCase());
      minIndex = Math.min(lowerCaseIndex, upperCaseIndex);
      if (minIndex === -1) {
        minIndex = Math.max(lowerCaseIndex, upperCaseIndex);
      }
      indexInString = minIndex;
      if (indexInString === -1) {
        return 0;
      }
      characterScore = 0.1;
      if (string[indexInString] === character) {
        characterScore += 0.1;
      }
      if (indexInString === 0 || string[indexInString - 1] === PathSeparator) {
        characterScore += 0.8;
      } else if ((_ref = string[indexInString - 1]) === '-' || _ref === '_' || _ref === ' ') {
        characterScore += 0.7;
      }
      string = string.substring(indexInString + 1, stringLength);
      totalCharacterScore += characterScore;
    }
    queryScore = totalCharacterScore / queryLength;
    return ((queryScore * (queryLength / stringLength)) + queryScore) / 2;
  };

  queryIsLastPathSegment = function(string, query) {
    if (string[string.length - query.length - 1] === PathSeparator) {
      return string.lastIndexOf(query) === string.length - query.length;
    }
  };

}).call(this);

},{}],5:[function(require,module,exports){
var fuzzaldrin = require("./fuzzaldrin/index");
window.fuzzaldrin = fuzzaldrin;
},{"./fuzzaldrin/index":2}]},{},[5]);

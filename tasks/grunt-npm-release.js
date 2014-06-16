/*
 * grunt-release
 * https://github.com/geddski/grunt-release
 *
 * Copyright (c) 2013 Dave Geddes
 * Licensed under the MIT license.
 */


var util = require('util');
var Q = require('q');

module.exports = function(grunt) {
  grunt.registerTask('npmrelease', 'git push, npm publish', function(type) {

    //defaults
    var options = this.options({
      bump: true,
      push: true,
      pushTags: true,
      npm : true
    });

    options.silent = typeof options.silent == 'undefined' || options.silent;

    var newVersion = type || 'patch';
    var commitMessage = grunt.config.getRaw('npmrelease.options.commitMessage') || 'release %s';
    var nowrite = options['no-write'] || grunt.option('no-write');
    var done = this.async();

    if (nowrite) {
      grunt.log.ok('-------RELEASE DRY RUN-------');
    }

    Q()
      .then(ifEnabled('bump', bump))
      .then(ifEnabled('push', pull))
      .then(ifEnabled('push', push))
      .then(ifEnabled('pushTags', pushTags))
      .then(ifEnabled('npm', publish))
      .catch(function(msg) {
        grunt.fail.warn(msg || 'release failed')
      })
      .finally(done);


    function ifEnabled(option, fn) {
      if (options[option]) {
        return fn;
      }
    }

    function run(cmd, msg) {
      var deferred = Q.defer();
      grunt.verbose.writeln('Running: ' + cmd);

      if (nowrite) {
        grunt.log.ok(msg || cmd);
        deferred.resolve();
      } else {
        var shell = require('shelljs');
        var success = shell.exec(cmd, {silent:options.silent}).code === 0;

        if (success) {
          grunt.log.ok(msg || cmd);
          deferred.resolve();
        } else {
          // fail and stop execution of further tasks
          deferred.reject('Failed when executing: `' + cmd + '`\n');
        }
      }
      return deferred.promise;
    }

    function getNpmTag() {
      var tag = grunt.option('npmtag') || options.npmtag;
      if (tag === true) {
        tag = newVersion;
      }
      return tag;
    }

    function push() {
      return run('git push', 'pushed to remote git repo');
    }

    function pull() {
      return run('git pull', 'pulled from remote git repo');
    }

    function pushTags() {
      return run('git push --tags', 'pushed new tag '+ newVersion +' to remote git repo');
    }

    function bump() {
      var command = util.format('npm version %s -m "%s"', newVersion, commitMessage);
      return run(command, 'created new npm version: ' + command);
    }

    function publish() {
      var cmd = 'npm publish';
      var msg = 'published version '+ newVersion +' to npm';
      var npmtag = getNpmTag();
      if (npmtag) {
        cmd += ' --tag ' + npmtag;
        msg += ' with a tag of "' + npmtag + '"';
      }

      return run(cmd, msg);
    }
  });
};

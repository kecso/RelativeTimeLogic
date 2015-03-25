/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var config = require('webgme/config/config.default');

config.server.port = 80;

config.plugin.basePaths.push('./src/plugins');

config.mongo.uri = 'mongodb://127.0.0.1:27017/RTL';

module.exports = config;
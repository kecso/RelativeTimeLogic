/**
 * @author kecso / https://github.com/kecso
 */

define(['plugin/PluginConfig',
    'plugin/PluginBase',
    './project'], function (PluginConfig, PluginBase, VerificationProject) {
    'use strict';

    /**
     * Initializes a new instance of ConfigurationArtifact.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin RuntimeVerification.
     * @constructor
     */
    var RuntimeVerification = function () {
        PluginBase.call(this);
    };

    // Prototypal inheritance from PluginBase.
    RuntimeVerification.prototype = Object.create(PluginBase.prototype);
    RuntimeVerification.prototype.constructor = RuntimeVerification;

    /**
     * Gets the name of the ConfigurationArtifact.
     * @returns {string} The name of the plugin.
     * @public
     */
    RuntimeVerification.prototype.getName = function () {
        return 'Runtime Verification Plugin';
    };

    /**
     * Gets the semantic version (semver.org) of the ConfigurationArtifact.
     * @returns {string} The version of the plugin.
     * @public
     */
    RuntimeVerification.prototype.getVersion = function () {
        return '0.1.0';
    };

    /**
     * Gets the configuration structure for the ConfigurationArtifact.
     * The ConfigurationStructure defines the configuration for the plugin
     * and will be used to populate the GUI when invoking the plugin from webGME.
     * @returns {object} The version of the plugin.
     * @public
     */
    RuntimeVerification.prototype.getConfigStructure = function () {
        return [
            {
                'name': 'runName',
                'displayName': 'Name of the Verification Run',
                'description': 'The name of the current run, where the results will be stored for later checking',
                'value': '',
                'valueType': 'string',
                'readOnly': false
            },
            {
                'name': 'inputData',
                'displayName': 'Input Data Table File',
                'description': 'The file, that contains all observed data in each line separated by spaces',
                'value': '',
                'valueType': 'asset',
                'readOnly': false
            }
        ];
    };

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */

    RuntimeVerification.prototype.processResult = function (result, callback) {
        var self = this,
            config = self.getCurrentConfig(),
            str2ab = function (str) {
                var buf = new ArrayBuffer(str.length),
                    bufView = new Uint8Array(buf),
                    i, strLen;
                for (i = 0, strLen = str.length; i < strLen; i++) {
                    bufView[i] = str.charCodeAt(i);
                }

                //return ab2buffer(buf);
                return buf;
            };

        self.blobClient.putFile((config.runName || 'run') + '.json',
            str2ab(JSON.stringify(result, null, 2)),
            function (err, hash) {
                if (err) {
                    callback(err);
                    return;
                }

                //now we should load the run prototype to be able to instantiate it
                //TODO maybe the loading of run ptototype should be more dynamic
                self.core.loadByPath(self.rootNode, '/720793692/2081646032', function (err, runNode) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    var myRun = self.core.createNode({parent: self.activeNode, base: runNode});

                    if (config.runName) {
                        self.core.setAttribute(myRun, 'name', config.runName);
                    }
                    self.core.setAttribute(myRun, 'input', config.inputData);
                    self.core.setAttribute(myRun, 'output', hash);
                    callback(null);
                });
            });
    };

    RuntimeVerification.prototype.createVerdict = function (nodes, output, input) {
        //there are three types of verdict
        //the always true -> statement is Globally True
        //the only a few false (less than half the time) -> statement is Not Globally True
        // the sometime true (less than third is true) -> ... occurred n times

        var i, j, occurrences = [], name, self = this;

        for (i = 0; i < nodes.length; i++) {
            name = self.core.getAttribute(nodes[i], 'name');
            occurrences = [];
            for (j = 0; j < output[name].length; j++) {
                if (output[name][j] === 1) {
                    occurrences.push(input.timeLine[j]);
                }
            }

            if (occurrences.length === output[name].length) {
                self.createMessage(nodes[i], 'Statement [' + name + '] is GLOBALLY true');
            } else if (occurrences.length === 0) {
                self.createMessage(nodes[i], 'Statement [' + name + '] is GLOBALLY false');
            } else if (occurrences.length < 10) {
                self.createMessage(nodes[i], 'Event [' + name + '] occurred at ' + occurrences + 's');
            } else {
                self.createMessage(nodes[i], 'Statement [' + name + '] was not always true');
            }
        }
    };

    RuntimeVerification.prototype.main = function (callback) {
        var self = this,
            currentConfig = self.getCurrentConfig(),
            verification = new VerificationProject(),
            inputData,
            inputAssociation,
            fail = function (error) {
                self.result.setSuccess(false);
                self.result.setError(error);
                callback(error, self.result);
            };

        self.blobClient.getObject(currentConfig.inputData, function (err, data) {
            if (err) {
                fail(err);
                return;
            }
            inputData = data;

            verification.verify(self.core, inputData, self.activeNode, function (err, result) {
                //TODO result should contain the output data table and the run node we should update and save
                if (err) {
                    fail(err);
                    return;
                }

                self.processResult(result.output, function (err) {
                    if (err) {
                        fail(err);
                        return;
                    }

                    self.createVerdict(result.nodes, result.output, inputData);

                    self.save('verification run ' + currentConfig.runName + ' was created into project',
                        function (err) {
                            if (err) {
                                fail(err);
                                return;
                            }
                            self.result.setSuccess(true);
                            callback(null, self.result);
                        });
                });
            });
        });

    };

    return RuntimeVerification;
});
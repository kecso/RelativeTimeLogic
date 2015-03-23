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
            },
            {
                'name': 'inputAssociation',
                'displayName': 'Input Data Table Association',
                'description': 'The file, that contains a json object which represents a dictionary which connects the lines of the input data to logical signals',
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
            /*ab2buffer = function (ab) {
                var buffer = new Buffer(ab.byteLength),
                    view = new Uint8Array(ab),
                    i;
                for (i = 0; i < buffer.length; ++i) {
                    buffer[i] = view[i];
                }
                return buffer;
            },*/
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

        self.blobClient.putFile((config.runName || 'run') + '.rvf', str2ab(JSON.stringify(result.outData,null,2)), function (err, hash) {
            if (err) {
                callback(err);
                return;
            }

            //now we should load the run prototype to be able to instantiate it
            //TODO maybe the loading of run ptototype should be more dynamic
            self.core.loadByPath(self.rootNode, '/67231682/1683375814', function (err, runNode) {
                if (err) {
                    callback(err);
                    return;
                }

                var myRun = self.core.createNode({parent: self.activeNode, base: runNode});

                self.core.setAttribute(myRun, 'name', config.runName || 'run');
                self.core.setAttribute(myRun, 'inputData', config.inputData);
                self.core.setAttribute(myRun, 'dataAssociation', config.inputAssociation);
                self.core.setAttribute(myRun, 'outputData', hash);
                callback(null);
            });
        });
    };

    RuntimeVerification.prototype.main = function (callback) {
        var self = this,
            currentConfig = self.getCurrentConfig(),
            verification = new VerificationProject(),
            inputData,
            inputAssociation,
            fail = function (error) {
                self.result.setSuccess(false);
                callback(error, self.result);
            };

        self.blobClient.getObject(currentConfig.inputData, function (err, data) {
            if (err) {
                fail(err);
                return;
            }
            inputData = data;
            self.blobClient.getObject(currentConfig.inputAssociation, function (err, data) {
                if (err) {
                    fail(err);
                    return;
                }
                inputAssociation = data;

                verification.verify(self.core, inputData, inputAssociation, self.activeNode, function (err, result) {
                    //TODO result should contain the output data table and the run node we should update and save
                    if (err) {
                        fail(err);
                        return;
                    }

                    self.processResult(result, function (err) {
                        if (err) {
                            fail(err);
                            return;
                        }


                        self.save('verification run ' + currentConfig.runName + ' was created into project',
                            function (err) {
                                if (err) {
                                    fail(err);
                                    return;
                                }
                                self.setSuccess(true);
                                callback(null, self.result);
                            });
                    });
                });
            });
        });

    };

    return RuntimeVerification;
});
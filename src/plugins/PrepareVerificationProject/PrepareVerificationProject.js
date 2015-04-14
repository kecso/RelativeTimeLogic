/**
 * @author kecso / https://github.com/kecso
 */

define(['plugin/PluginConfig',
    'plugin/PluginBase'], function (PluginConfig, PluginBase) {
    'use strict';

    /**
     * Initializes a new instance of ConfigurationArtifact.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin PrepareVerificationProject.
     * @constructor
     */
    var PrepareVerificationProject = function () {
        PluginBase.call(this);
    };

    // Prototypal inheritance from PluginBase.
    PrepareVerificationProject.prototype = Object.create(PluginBase.prototype);
    PrepareVerificationProject.prototype.constructor = PrepareVerificationProject;

    /**
     * Gets the name of the ConfigurationArtifact.
     * @returns {string} The name of the plugin.
     * @public
     */
    PrepareVerificationProject.prototype.getName = function () {
        return 'Prepare Verification Project Plugin';
    };

    /**
     * Gets the semantic version (semver.org) of the ConfigurationArtifact.
     * @returns {string} The version of the plugin.
     * @public
     */
    PrepareVerificationProject.prototype.getVersion = function () {
        return '0.1.0';
    };

    /**
     * Gets the configuration structure for the ConfigurationArtifact.
     * The ConfigurationStructure defines the configuration for the plugin
     * and will be used to populate the GUI when invoking the plugin from webGME.
     * @returns {object} The version of the plugin.
     * @public
     */
    PrepareVerificationProject.prototype.getConfigStructure = function () {
        return [
            {
                'name': 'inputData',
                'displayName': 'Input Data Table File',
                'description': 'The file, that contains all observed data in each line separated by spaces',
                'value': '',
                'valueType': 'asset',
                'readOnly': false
            },
            {
                'name': 'maxCurrent',
                'displayName': 'maximum allowed current',
                'value': 2000,
                'valueType': 'float',
                'readOnly': false
            },
            {
                'name': 'maxZeroCurrent',
                'displayName': 'maximum possible current in broken circuit',
                'value': 100,
                'valueType': 'float',
                'readOnly': false
            },
            {
                'name': 'maxVoltage',
                'displayName': 'maximum allowed Voltage in normal mode',
                'value': 25500,
                'valueType': 'float',
                'readOnly': false
            },
            {
                'name': 'minVoltage',
                'displayName': 'minimum allowed Voltage in normal mode',
                'value': 24500,
                'valueType': 'float',
                'readOnly': false
            },
            {
                'name': 'groundVoltage',
                'displayName': 'maximum possible Voltage during ground fault',
                'value': 1000,
                'valueType': 'float',
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

    PrepareVerificationProject.prototype.main = function (callback) {
        var self = this,
            currentConfig = self.getCurrentConfig(),
            inputData,
            baseNode,
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

            self.core.loadByPath(self.rootNode, '/720793692/311005721', function (err, node) {
                var signals = Object.keys(inputData.data || {}),
                    i, node;

                if (err) {
                    fail(err);
                    return;
                }

                baseNode = node;

                for (i = 0; i < signals.length; i++) {
                    if (signals[i][0] === 'I') {
                        //current
                        node = self.core.createNode({parent: self.activeNode, base: baseNode});
                        self.core.setAttribute(node,'dataId',signals[i]);
                        self.core.setAttribute(node, 'name', signals[i] + '_normal');
                        self.core.setAttribute(node, 'min', 0.0);
                        self.core.setAttribute(node, 'max', currentConfig.maxCurrent || 1.0);

                        node = self.core.createNode({parent: self.activeNode, base: baseNode});
                        self.core.setAttribute(node,'dataId',signals[i]);
                        self.core.setAttribute(node, 'name', signals[i] + '_zero');
                        self.core.setAttribute(node, 'min', 0.0);
                        self.core.setAttribute(node, 'max', currentConfig.maxZeroCurrent || 0.0);

                    } else {
                        //voltage
                        node = self.core.createNode({parent: self.activeNode, base: baseNode});
                        self.core.setAttribute(node,'dataId',signals[i]);
                        self.core.setAttribute(node, 'name', signals[i] + '_normal');
                        self.core.setAttribute(node, 'min', currentConfig.minVoltage || 25000);
                        self.core.setAttribute(node, 'max', currentConfig.maxVoltage || 25000);

                        node = self.core.createNode({parent: self.activeNode, base: baseNode});
                        self.core.setAttribute(node,'dataId',signals[i]);
                        self.core.setAttribute(node, 'name', signals[i] + '_gfault');
                        self.core.setAttribute(node, 'min', 0.0);
                        self.core.setAttribute(node, 'max', currentConfig.groundVoltage || 100.0);
                    }
                }

                self.save('verification run ' + currentConfig.runName + ' was created into project',
                    function (err) {
                        if (err) {
                            fail(err);
                            return;
                        }
                        self.result.setSuccess(true);
                        callback(null, self.result);
                    }
                );
            });
        });

    };

    return PrepareVerificationProject;
});
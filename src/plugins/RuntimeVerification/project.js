/* globals define, console */
/**
 * @author kecso / https://github.com/kecso
 */
define([], function () {
    'use strict';
    function VerificationProject() {
        var verification = {};

        function calculateSignalValues(signalName) {
            switch (verification.core.getAttribute(verification.nodes.signals[signalName], 'mapFunctionType')) {
                case 'range':
                    return calculateRangeBoolValue(signalName);
                case 'change':
                    return calculateChangeBoolValue(signalName);
                case 'changeFrom':
                    return calculateChangeFromBoolValue(signalName);
                case 'changeTo':
                    return calculateChangeToBoolValue(signalName);
                case 'enterRange':
                    return calculateEnterRangeBoolValue(signalName);
                case 'leaveRange':
                    return calculateLeaveRangeBoolValue(signalName);
                default:
                    return null;
            }
        }

        function calculateChangeBoolValue(signalName) {
            var i,
                realData = verification.input.data[verification.input.association[signalName]],
                boolData = [];

            if (realData.length > 0) {
                boolData.push(1);
            }
            for (i = 1; i < realData.length; i++) {
                if (realData[i] !== realData[i - 1]) {
                    boolData.push(1);
                } else {
                    boolData.push(0);
                }
            }
            return boolData;
        }

        function calculateRangeBoolValue(signalName) {
            var i, params = JSON.parse(verification.core.getAttribute(verification.nodes.signals[signalName],
                    'mapFunctionParameters') || '{}'),
                realData = verification.input.data[verification.input.association[signalName]],
                boolData = [];

            for (i = 0; i < realData.length; i++) {
                if (params.min && params.max) {
                    if (realData[i] >= params.min && realData[i] <= params.max) {
                        boolData.push(1);
                    } else {
                        boolData.push(0);
                    }
                } else {
                    if (realData[i]) {
                        boolData.push(1);
                    } else {
                        boolData.push(0);
                    }
                }
            }
            return boolData;
        }

        function calculateChangeToBoolValue(signalName) {
            var i, params = JSON.parse(verification.core.getAttribute(verification.nodes.signals[signalName],
                    'mapFunctionParameters') || '{}'),
                realData = verification.input.data[verification.input.association[signalName]],
                boolData = [],
                isValue = false;

            for (i = 0; i < realData.length; i++) {
                if (params.value) {
                    if (!isValue && realData[i] === params.value) {
                        boolData.push(1);
                        isValue = true;
                    } else {
                        boolData.push(0);
                    }

                    if (isValue && realData[i] !== params.value) {
                        isValue = false;
                    }
                } else {
                    boolData.push(0);
                }
            }
            return boolData;
        }

        function calculateChangeFromBoolValue(signalName) {
            var i, params = JSON.parse(verification.core.getAttribute(verification.nodes.signals[signalName],
                    'mapFunctionParameters') || '{}'),
                realData = verification.input.data[verification.input.association[signalName]],
                boolData = [],
                isValue = false;

            for (i = 0; i < realData.length; i++) {
                if (params.value) {
                    if (isValue && realData[i] !== params.value) {
                        boolData.push(1);
                        isValue = false;
                    } else {
                        boolData.push(0);
                    }

                    if (!isValue && realData[i] === params.value) {
                        isValue = true;
                    }
                } else {
                    boolData.push(0);
                }
            }
            return boolData;
        }

        function calculateEnterRangeBoolValue(signalName) {
            var i, params = JSON.parse(verification.core.getAttribute(verification.nodes.signals[signalName],
                    'mapFunctionParameters') || '{}'),
                realData = verification.input.data[verification.input.association[signalName]],
                boolData = [],
                inRange = false;

            for (i = 0; i < realData.length; i++) {
                if (params.min && params.max) {
                    if (!inRange && realData[i] >= params.min && realData[i] <= params.max) {
                        boolData.push(1);
                        inRange = true;
                    } else {
                        boolData.push(0);
                    }

                    if (inRange && (realData[i] < params.min || realData[i] > params.max)) {
                        inRange = false;
                    }
                } else {
                    boolData.push(0);
                }
            }
            return boolData;
        }

        function calculateLeaveRangeBoolValue(signalName) {
            var i, params = JSON.parse(verification.core.getAttribute(verification.nodes.signals[signalName],
                    'mapFunctionParameters') || '{}'),
                realData = verification.input.data[verification.input.association[signalName]],
                boolData = [],
                inRange = false;

            for (i = 0; i < realData.length; i++) {
                if (params.min && params.max) {
                    if (inRange && (realData[i] < params.min || realData[i] > params.max)) {
                        boolData.push(1);
                        inRange = false;
                    } else {
                        boolData.push(0);
                    }

                    if (!inRange && realData[i] >= params.min && realData[i] <= params.max) {
                        inRange = false;
                    }
                } else {
                    boolData.push(0);
                }
            }
            return boolData;
        }

        function evaluateSignals() {
            var i,
                signalNames = Object.keys(verification.nodes.signals);

            verification.evaluation = {};
            verification.evaluation.paths = {};
            for (i = 0; i < signalNames.length; i++) {
                verification.evaluation.paths[verification.core.getPath(verification.nodes.signals[signalNames[i]])] = calculateSignalValues(signalNames[i]);
            }
        }

        function buildEvaluationQueue() {
            var i,
                resultNames = Object.keys(verification.nodes.results);

            verification.evaluation.queue = [];

            for (i = 0; i < resultNames.length; i++) {
                addToEvaluationQueue(verification.core.getPath(verification.nodes.results[resultNames[i]]));
            }
        }

        function addToEvaluationQueue(path) {
            var node = verification.nodes.raw[path];

            if (verification.evaluation.queue.indexOf(path) !== -1) {
                //already in the queue
                return;
            }

            //we check only the operators here as the signals should be already covered
            if (verification.core.isInstanceOf(node, 'binary')) {
                addToEvaluationQueue(verification.core.getPointerPath(node, 'firstArg'));
                addToEvaluationQueue(verification.core.getPointerPath(node, 'secondArg'));
                verification.evaluation.queue.push(path);
            }

            if (verification.core.isInstanceOf(node, 'unary')) {
                addToEvaluationQueue(verification.core.getPointerPath(node, 'arg'));
                verification.evaluation.queue.push(path);
            }

        }

        function evaluateNot(path) {
            var node = verification.nodes.raw[path],
                inData = verification.evaluation.paths[verification.core.getPointerPath(node, 'arg')],
                outData = [],
                i;

            for (i = 0; i < inData.length; i++) {
                if (inData) {
                    outData.push(0);
                } else {
                    outData.push(1);
                }
            }

            verification.evaluation.paths[path] = outData;
        }

        function evaluateAnd(path) {
            var node = verification.nodes.raw[path],
                firstInData = verification.evaluation.paths[verification.core.getPointerPath(node, 'firstArg')],
                secondInData = verification.evaluation.paths[verification.core.getPointerPath(node, 'secondArg')],
                outData = [],
                i;

            for (i = 0; i < firstInData.length; i++) {
                if (firstInData[i] && secondInData[i]) {
                    outData.push(1);
                } else {
                    outData.push(0);
                }
            }

            verification.evaluation.paths[path] = outData;
        }

        function evaluateOr(path) {
            var node = verification.nodes.raw[path],
                firstInData = verification.evaluation.paths[verification.core.getPointerPath(node, 'firstArg')],
                secondInData = verification.evaluation.paths[verification.core.getPointerPath(node, 'secondArg')],
                outData = [],
                i;

            for (i = 0; i < firstInData.length; i++) {
                if (firstInData[i] || secondInData[i]) {
                    outData.push(1);
                } else {
                    outData.push(0);
                }
            }

            verification.evaluation.paths[path] = outData;
        }

        function evaluateNode(path) {
            var node = null;
            if (!path || !verification.nodes.raw[path]) {
                return false;
            }

            node = verification.nodes.raw[path];

            //now the sub evaluator functions
            if (verification.core.isInstanceOf(node, 'not')) {
                evaluateNot(path);
                return true;
            }

            if (verification.core.isInstanceOf(node, 'and')) {
                evaluateAnd(path);
                return true;
            }

            if (verification.core.isInstanceOf(node, 'or')) {
                evaluateOr(path);
                return true;
            }

        }

        function processEvaluationQueue() {
            while (evaluateNode(verification.evaluation.queue.shift())) {

            }
        }

        function initializeNodes(next) {

            var resultPaths = verification.core.getMemberPaths(verification.nodes.project, 'result'),
                signalNames = Object.keys(verification.input.association);


            verification.core.loadChildren(verification.nodes.project, function (err, children) {
                var i, path, name, isSignal, isOperator;
                if (err) {
                    next(err);
                    return;
                }

                for (i = 0; i < children.length; i++) {
                    path = verification.core.getPath(children[i]);
                    name = verification.core.getAttribute(children[i], 'name');
                    isSignal = verification.core.isInstanceOf(children[i], 'logicSignal');
                    isOperator = verification.core.isInstanceOf(children[i], 'operator');

                    if (isOperator || isSignal) {
                        verification.nodes.raw[path] = children[i];

                        if (resultPaths.indexOf(path) !== -1) {
                            verification.nodes.results[name] = children[i];
                        }

                        if (isSignal && signalNames.indexOf(name) !== -1) {
                            verification.nodes.signals[name] = children[i];
                        }
                    }
                }

                next(null);
            });
        }

        function verify(core, data, association, project, callback) {

            verification.core = core;
            verification.input = {};
            verification.input.data = data;
            verification.input.association = association;
            verification.nodes = {signals: {}, results: {}, raw: {}};
            verification.nodes.project = project;

            initializeNodes(function (err) {
                if (err) {
                    callback(err);
                    return;
                }

                evaluateSignals();
                buildEvaluationQueue();
                processEvaluationQueue();

                console.log(verification.evaluation.paths);
                callback(new Error('not implemented yet'));
            });
        }


        return {
            verify: verify
        };
    }

    return VerificationProject;
});
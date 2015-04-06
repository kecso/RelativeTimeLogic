/* globals define, console, setInterval, clearInterval */
/**
 * @author kecso / https://github.com/kecso
 */
define([], function () {
    'use strict';
    function VerificationProject() {
        var verification = {};

        function calculateRangeSignalValues(signalName) {
            var node = verification.nodes.signals[signalName],
                core = verification.core,
                inputData = verification.input.data[core.getAttribute(node, 'dataId')],
                outputData = [],
                min = core.getAttribute(node, 'min'),
                max = core.getAttribute(node, 'max'),
                i;

            for (i = 0; i < inputData.length; i++) {
                if (inputData[i] >= min && inputData[i] <= max) {
                    outputData.push(1);
                } else {
                    outputData.push(0);
                }
            }
            return outputData;
        }

        function calculateSignalValues(signalName) {
            return calculateRangeSignalValues(signalName);
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

        function addToEvaluationQueue(path) {
            var node = verification.nodes.raw[path],
                lowerEvent, upperEvent,
                core = verification.core;

            if (verification.evaluation.queue.indexOf(path) !== -1) {
                //already in the queue
                return;
            }

            //we check only the operators here as the signals should be already covered
            if (core.isInstanceOf(node, 'Binary')) {
                addToEvaluationQueue(core.getPointerPath(node, 'firstArg'));
                addToEvaluationQueue(core.getPointerPath(node, 'secondArg'));
                verification.evaluation.queue.push(path);
            }

            if (core.isInstanceOf(node, 'Unary')) {
                if (core.isInstanceOf(node, 'AtOperator') || core.isInstanceOf(node, 'QuestionOperator')) {
                    lowerEvent = verification.nodes.intervals[path].lower.event;
                    upperEvent = verification.nodes.intervals[path].upper.event;

                    if (lowerEvent) {
                        addToEvaluationQueue(lowerEvent);
                    }

                    if (upperEvent) {
                        addToEvaluationQueue(upperEvent);
                    }
                }
                addToEvaluationQueue(core.getPointerPath(node, 'arg'));
                verification.evaluation.queue.push(path);
            }

        }

        function buildEvaluationQueue() {
            var i,
                resultPaths = Object.keys(verification.nodes.results);

            verification.evaluation.queue = [];

            for (i = 0; i < resultPaths.length; i++) {
                addToEvaluationQueue(resultPaths[i]);
            }
        }

        function evaluateNot(path) {
            var node = verification.nodes.raw[path],
                inData = verification.evaluation.paths[verification.core.getPointerPath(node, 'arg')],
                outData = [],
                i;

            for (i = 0; i < inData.length; i++) {
                if (inData[i]) {
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

        function evaluateImply(path) {
            var node = verification.nodes.raw[path],
                core = verification.core,
                firstInData = verification.evaluation.paths[core.getPointerPath(node, 'firstArg')],
                secondInData = verification.evaluation.paths[core.getPointerPath(node, 'secondArg')],
                outData = [],
                i;

            for (i = 0; i < firstInData.length; i++) {
                if (firstInData[i] && !secondInData[i]) {
                    outData.push(0);
                } else {
                    outData.push(1);
                }
            }

            verification.evaluation.paths[path] = outData;
        }

        function getInterval(path, index) {
            var result = {lower: 0, upper: 0},
                interval = verification.nodes.intervals[path],
                calculateBound = function (isUpper) {
                    var bound = isUpper ? interval.upper : interval.lower,
                        result = 0,
                        offset = 0;
                    if (bound.value) {
                        result = bound.value;

                        if (bound.isPast) {
                            result = -1 * result;
                        }

                        if (bound.infinite) {
                            if (bound.isPast) {
                                result = -1 * index;
                            } else {
                                result = verification.input.timeLine.length - (index + 1);
                                if (result < 0) {
                                    result = 0;
                                }
                            }
                        } else {
                            if (bound.isExclusive) {
                                if (isUpper) {
                                    result = result - 1;
                                } else {
                                    result = result + 1;
                                }
                            }
                        }
                    } else if (bound.event) {
                        while (index + offset >= 0 &&
                               index + offset < verification.evaluation.paths[bound.event].length &&
                               verification.evaluation.paths[bound.event][index + offset] !== 1) {
                            if (bound.isPast) {
                                offset = offset - 1;
                            } else {
                                offset = offset + 1;
                            }
                        }

                        if (index + offset >= 0 &&
                            index + offset < verification.evaluation.paths[bound.event].length &&
                            verification.evaluation.paths[bound.event][index + offset] === 1 &&
                            bound.isExclusive) {
                            if (isUpper) {
                                offset = offset - 1;
                            } else {
                                offset = offset + 1;
                            }
                        }
                    }

                    return Number(result);
                };

            result.lower = calculateBound(false);
            result.upper = calculateBound(true);

            return result;

        }

        function evaluateAtOperator(path) {
            var node = verification.nodes.raw[path],
                core = verification.core,
                input = verification.evaluation.paths[core.getPointerPath(node, 'arg')],
                output = [],
                holds,
                i, j,
                interval;

            for (i = 0; i < input.length; i++) {
                interval = getInterval(path, i);
                holds = true;
                for (j = i + interval.lower; j <= i + interval.upper; j++) {
                    if (input[j] === 0) {
                        holds = false;
                    }
                }

                if (holds) {
                    output.push(1);
                } else {
                    output.push(0);
                }
            }

            verification.evaluation.paths[path] = output;
        }

        function evaluateQuestionOperator(path) {
            var node = verification.nodes.raw[path],
                core = verification.core,
                input = verification.evaluation.paths[core.getPointerPath(node, 'arg')],
                output = [],
                occured,
                min = core.getAttribute(node, 'min'),
                max = core.getAttribute(node, 'max'),
                i, j,
                interval;

            for (i = 0; i < input.length; i++) {
                interval = getInterval(path, i);
                occured = 0;
                for (j = i + interval.lower; j <= i + interval.upper; j++) {
                    if (input[j] === 1) {
                        occured = occured + 1;
                    }
                }

                if (occured > 0) {
                    if (occured >= min) {
                        if (max === 0) {
                            output.push(1);
                        } else if (max < min) {
                            output.push(0);
                        } else if (occured <= max) {
                            output.push(1);
                        } else {
                            output.push(0);
                        }
                    } else {
                        output.push(0);
                    }
                } else {
                    output.push(0);
                }

            }

            verification.evaluation.paths[path] = output;
        }

        function evaluateNode(path) {
            var node = null;
            if (!path || !verification.nodes.raw[path]) {
                return false;
            }

            node = verification.nodes.raw[path];

            //now the sub evaluator functions
            if (verification.core.isInstanceOf(node, 'Not')) {
                evaluateNot(path);
                return true;
            }

            if (verification.core.isInstanceOf(node, 'And')) {
                evaluateAnd(path);
                return true;
            }

            if (verification.core.isInstanceOf(node, 'Or')) {
                evaluateOr(path);
                return true;
            }

            if (verification.core.isInstanceOf(node, 'Imply')) {
                evaluateImply(path);
                return true;
            }

            if (verification.core.isInstanceOf(node, 'AtOperator')) {
                evaluateAtOperator(path);
                return true;
            }

            if (verification.core.isInstanceOf(node, 'QuestionOperator')) {
                evaluateQuestionOperator(path);
                return true;
            }

        }

        function processEvaluationQueue() {
            while (evaluateNode(verification.evaluation.queue.shift())) {

            }
        }

        function initializeNode(node, isResult, finished) {
            var core = verification.core,
                path = core.getPath(node),
                name = core.getAttribute(node, 'name'),
                isSignal = core.isInstanceOf(node, 'LogicSignal'),
                isOperator = core.isInstanceOf(node, 'Operator'),
                hasInterval = core.isInstanceOf(node, 'IntervalOperator'),
                interval = {lower: {}, upper: {}};

            //synchronous data storage
            if (isSignal || isOperator) {
                verification.nodes.raw[path] = node;

                if (isResult) {
                    verification.nodes.results[path] = node;
                }

                if(isSignal) {
                    verification.nodes.signals[name] = node;
                }
            }


            if (hasInterval) {
                if (core.getAttribute(node, 'lInfinite') === true) {
                    interval.lower.infinite = true;
                    interval.lower.isExclusive = true;
                } else if (core.getPointerPath(node, 'lEvent')) {
                    interval.lower.event = core.getPointerPath(node, 'lEvent');
                    interval.lower.isExclusive = core.getAttribute(node, 'lExclusive') === true;
                } else {
                    interval.lower.value = core.getAttribute(node, 'lValue') || 0;
                    interval.lower.isExclusive = core.getAttribute(node, 'lExclusive') === true;
                }
                interval.lower.isPast = core.getAttribute(node, 'lPast') === true;

                if (core.getAttribute(node, 'uInfinite') === true) {
                    interval.upper.infinite = true;
                    interval.upper.isExclusive = true;
                } else if (core.getPointerPath(node, 'uEvent')) {
                    interval.upper.event = core.getPointerPath(node, 'uEvent');
                    interval.upper.isExclusive = core.getAttribute(node, 'uExclusive') === true;
                } else {
                    interval.upper.value = core.getAttribute(node, 'uValue') || 0;
                    interval.upper.isExclusive = core.getAttribute(node, 'uExclusive') === true;
                }
                interval.upper.isPast = core.getAttribute(node, 'uPast') === true;

                verification.nodes.intervals[path] = interval;

                finished(null);
            } else {
                finished(null);
            }
        }

        function initializeNodes(next) {

            var resultPaths = verification.core.getMemberPaths(verification.nodes.project, 'result');


            verification.core.loadChildren(verification.nodes.project, function (err, children) {
                var index, max, timerId, calculating, error = null;
                if (err) {
                    next(err);
                    return;
                }

                max = children.length;
                index = 0;
                calculating = false;

                timerId = setInterval(function () {
                    if (!calculating) {
                        if (index < max) {
                            calculating = true;
                            initializeNode(
                                children[index],
                                resultPaths.indexOf(verification.core.getPath(children[index])) !== -1,
                                function (err) {
                                    calculating = false;
                                    error = error || err;
                                }
                            );
                            index++;
                        } else {
                            clearInterval(timerId);
                            next(error);
                        }
                    }
                }, 2);
            });
        }

        function verify(core, input, project, callback) {
            var result = {},
                keys, i,nodes=[];

            verification.core = core;
            verification.input = input;
            verification.nodes = {signals: {}, results: {}, raw: {}, intervals: {}};
            verification.nodes.project = project;

            initializeNodes(function (err) {
                if (err) {
                    callback(err);
                    return;
                }

                evaluateSignals();
                buildEvaluationQueue();
                processEvaluationQueue();

                keys = Object.keys(verification.nodes.results);
                for (i = 0; i < keys.length; i++) {
                    result[verification.core.getAttribute(verification.nodes.raw[keys[i]],
                        'name')] = verification.evaluation.paths[keys[i]];
                    nodes.push(verification.nodes.results[keys[i]]);
                }
                callback(null, {nodes:nodes, output: result});
            });
        }


        return {
            verify: verify
        };
    }

    return VerificationProject;
});
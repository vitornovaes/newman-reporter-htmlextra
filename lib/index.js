/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable arrow-body-style */
/* eslint-disable padding-line-between-statements */
/* eslint-disable semi */
/* eslint-disable arrow-parens */
/* eslint-disable block-scoped-var */
/* eslint-disable no-redeclare */
/* eslint-disable one-var */
/* eslint-disable no-unused-vars */
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const moment = require('moment-timezone');
const handlebars = require('handlebars');
const helpers = require('@budibase/handlebars-helpers')({
        handlebars: handlebars
    });
const version = require('../package.json').version;
const chalk = require('chalk');
const util = require('./util');
const progress = require('cli-progress');

    /**
 * An object of the default file read preferences.
 *
 * @type {Object}
 */
const FILE_READ_OPTIONS = { encoding: 'utf8' };

    /**
 * The default Handlebars template to use when no user specified template is provided.
 *
 * @type {String}
 */
const DEFAULT_TEMPLATE = 'dashboard-template.hbs';

    /**
    /**
 * The show only fails Handlebars template is used when the arg is passed in the cli.
 *
 * @type {String}
 */
const SHOW_ONLY_FAILS = 'only-failures-dashboard.hbs';

    /**
    /**
 * The list of execution data fields that are aggregated over multiple requests for the collection run
 *
 * @type {String[]}
 */
const AGGREGATED_FIELDS = ['cursor', 'item', 'request', 'response', 'requestError'];

const SENSITIVE_KEYS = [
    'password', 'token', 'secret', 'apikey', 'auth', 'authorization', 'cookie',
    'set-cookie', 'sessionid', 'access_token', 'refresh_token', 'client_secret',
    // Add common variations if needed, e.g., x-api-key, api_key
    'x-api-key', 'api_key', 'privatekey', 'private_key', 'credentials'
].map(k => k.toLowerCase());

const OBFUSCATED_VALUE = '****';

const BEARER_TOKEN_REGEX = /^(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*$/i;
const BASIC_AUTH_REGEX = /^(Basic\s+)[A-Za-z0-9\+\/]+=*$/i;
const SIMPLE_JWT_REGEX = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;

// Helper function to obfuscate by pattern if key-based obfuscation didn't apply
function obfuscateValueByPattern(value) {
    if (typeof value !== 'string') {
        return value;
    }
    if (BEARER_TOKEN_REGEX.test(value)) {
        return value.replace(BEARER_TOKEN_REGEX, `$1${OBFUSCATED_VALUE}`);
    }
    if (BASIC_AUTH_REGEX.test(value)) {
        return value.replace(BASIC_AUTH_REGEX, `$1${OBFUSCATED_VALUE}`);
    }
    if (SIMPLE_JWT_REGEX.test(value)) {
        return OBFUSCATED_VALUE;
    }
    return value;
}

// Helper function to obfuscate a single value based on its key, then by pattern
function obfuscateValue(key, value, sensitiveKeysList) {
    if (typeof value === 'string') {
        if (sensitiveKeysList.includes(String(key).toLowerCase())) {
            return OBFUSCATED_VALUE;
        }
        // If not obfuscated by key, try by pattern
        return obfuscateValueByPattern(value);
    }
    return value;
}

// Recursive helper function to obfuscate values in a JSON object
function obfuscateJsonObject(obj, sensitiveKeysList) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => obfuscateJsonObject(item, sensitiveKeysList));
    }

    const newObj = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (typeof obj[key] === 'string') {
                newObj[key] = obfuscateValue(key, obj[key], sensitiveKeysList);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                newObj[key] = obfuscateJsonObject(obj[key], sensitiveKeysList);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    return newObj;
}

// Helper function to parse, obfuscate, and re-stringify a JSON string
function obfuscateJsonString(jsonString, sensitiveKeysList) {
    if (typeof jsonString !== 'string') return jsonString;
    try {
        let parsed = JSON.parse(jsonString);
        parsed = obfuscateJsonObject(parsed, sensitiveKeysList);
        return JSON.stringify(parsed, null, 2); // Pretty print for readability
    } catch (e) {
        // If parsing fails, it might not be JSON or might be malformed.
        // For now, return original. Could apply regex for tokens here in future.
        return jsonString;
    }
}


let htmlTemplate = null; // Will be assigned in PostmanHTMLExtraReporter
let compiler = null; // Will be assigned in PostmanHTMLExtraReporter

let PostmanHTMLExtraReporter;

/**
 * A function that creates raw markup to be written to Newman HTML reports.
 *
 * @param {Object} newman - The collection run object, with a event handler setter, used to enable event wise reporting.
 * @param {Object} options - The set of HTML reporter run options.
 * @param {String} options.template - Optional path to the custom user defined HTML report template (Handlebars).
 * @param {String} options.export - Optional custom path to create the HTML report at.
 * @param {Object} collectionRunOptions - The set of all the collection run options.
 * @returns {*}
 */
PostmanHTMLExtraReporter = (newman, options, collectionRunOptions) => {
    // Helper for calculating pass percentage
    handlebars.registerHelper('percent', (passed, failed) => {
        return (passed * 100 / (passed + failed)).toFixed(0);
    });
    // Helper for converting object to json
    handlebars.registerHelper('formdata', (context) => {
        const formdata = {};

        context.forEach((value, key) => {
            if (!value.disabled) {
                if (value.src) {
                    formdata[value.key] = value.src;
                }
                else {
                    formdata[value.key] = value.value;
                }
            }
        });

        return JSON.stringify(formdata);
    });

    // Helper for simple converting object to json when context.forEach returns empty value
    handlebars.registerHelper('object', (context) => {
        return JSON.stringify(context);
    });
    // increment helper for zero index
    handlebars.registerHelper('inc', (value) => {
        return parseInt(value) + 1;
    });
    // Sums the total tests by 'assertions - skipped tests'
    handlebars.registerHelper('totalTests', (assertions, skippedTests) => {
        return skippedTests ? parseInt(assertions) - parseInt(skippedTests) : parseInt(assertions);
    });
    // Adds the moment helper module
    handlebars.registerHelper('paging', () => {
        const paging = options.testPaging || false;

        return paging;
    });
    handlebars.registerHelper('logs', () => {
        const logs = options.logs || false;

        return logs;
    });
    handlebars.registerHelper('isTheSame', function (lvalue, rvalue, options) {
        if (arguments.length < 3) {
            throw new Error('Handlebars Helper equal needs 2 parameters');
        }
        // eslint-disable-next-line no-negated-condition
        // eslint-disable-next-line eqeqeq
        // eslint-disable-next-line no-negated-condition
        if (lvalue !== rvalue) {
            return options.inverse(this);
        }
        // eslint-disable-next-line no-else-return
        else {
            return options.fn(this);
        }
    });
    handlebars.registerHelper('isNotIn', function (elem, list, options) {
        if ((options.data.root.skipFolders === list &&
            options.data.root.skipFolders.length) ||
            (options.data.root.skipRequests === list &&
                options.data.root.skipRequests.length)) {
            // splits nested folder names fol1/fol2/fol3
            const convertedElemTemp = elem.split('/').map((item) => item.trim()) // Renamed elem to item for clarity
            const listTemp = list.split(',').map((item) => item.trim()) // Renamed elem to item for clarity
            const present = _.intersectionWith(listTemp, convertedElemTemp, _.isEqual);
            return present.length ? undefined : options.fn(this)
        }

        let processedList = list;
        if (typeof (processedList) === 'object') {
            processedList = processedList.map(v => v.toLowerCase())
        }
        else if (processedList.length !== undefined) {
            processedList = processedList.toLowerCase()
        }

        if (elem === null) {
            return;
        }
        // eslint-disable-next-line lodash/prefer-is-nil
        let convertedElem;
        if (elem !== undefined && elem !== null) {
            convertedElem = elem.toLowerCase()
        }

        if (_.includes(processedList, convertedElem)) {
            return options.inverse(this);
        }

        return options.fn(this);
    });
    handlebars.registerHelper('totalFolders', (aggregations) => {
        return aggregations.length;
    });
    handlebars.registerHelper('totalFailedFolders', (aggregations) => {
        let failedFolders = 0;

        aggregations.forEach(aggregation => {
            aggregation.executions.forEach(execution => {
                if (execution.cumulativeTests.failed > 0) {
                    failedFolders++;
                }
            });
        });

        return failedFolders;
    });

    // @todo throw error here or simply don't catch them and it will show up as warning on newman
    // Assign to module-scoped htmlTemplate
    htmlTemplate = options.showOnlyFails && !options.template ?
        path.join(__dirname, SHOW_ONLY_FAILS) :
        (options.template || path.join(__dirname, DEFAULT_TEMPLATE));

    // Assign to module-scoped compiler
    compiler = handlebars.compile(fs.readFileSync(htmlTemplate, FILE_READ_OPTIONS));
    // Handle the skipped tests

    newman.on('assertion', function (err, o) { // 'this' is used by Newman, so not an arrow function
        if (err) { return; }

        if (o.skipped) {
            this.summary.skippedTests = this.summary.skippedTests || [];

            this.summary.skippedTests.push({
                cursor: {
                    ref: o.cursor.ref,
                    iteration: o.cursor.iteration,
                    scriptId: o.cursor.scriptId
                },
                assertion: o.assertion,
                skipped: o.skipped,
                error: o.error,
                item: {
                    id: o.item.id,
                    name: o.item.name
                }
            });
        }
    });
    if (options.displayProgressBar) {
        // Add progress feedback for the reporter
        if (_.includes(collectionRunOptions.reporters, 'cli') || _.get(collectionRunOptions.reporter, 'cli') || _.includes(collectionRunOptions.reporters, 'json') || _.get(collectionRunOptions.reporter, 'json') || _.includes(collectionRunOptions.reporters, 'progress') || _.get(collectionRunOptions.reporter, 'progress')) {
                newman.on('start', (err, o) => { // Arrow function if 'this' is not critical
                if (err) { return err; }
            });
        }
        if (!_.includes(collectionRunOptions.reporters, 'progress') && !_.get(collectionRunOptions.reporter, 'progress') && !_.includes(collectionRunOptions.reporters, 'cli') && !_.get(collectionRunOptions.reporter, 'cli') && !_.includes(collectionRunOptions.reporters, 'json') && !_.get(collectionRunOptions.reporter, 'json')) {
                const bar = new progress.Bar({ // Changed var to const
                format: 'Newman Run Progress |' + chalk.green('{bar}') + '| {percentage}% || Requests: {value}/{total} || ETA: {eta}s',
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
                hideCursor: true
            });

                newman.on('start', (err, o) => { // Arrow function if 'this' is not critical
                if (err) { return; }
                bar.start(o.cursor.length * o.cursor.cycles, 0);
            });

                newman.on('item', () => { // Arrow function
                bar.increment();
            });

                newman.on('done', () => { // Arrow function
                bar.stop();
            });
        }
    }

    newman.on('console', function (err, o) { // 'this' is used by Newman for summary context
        if (err) { return; }

        if (options.logs) {
            this.summary.consoleLogs = this.summary.consoleLogs || {};
            this.summary.consoleLogs[o.cursor.ref] = this.summary.consoleLogs[o.cursor.ref] || [];
            this.summary.consoleLogs[o.cursor.ref].push(o);
        }
    });

    newman.on('beforeDone', function () { // 'this' is used by Newman
        const items = {}; // Changed var to const
        const executionMeans = {}; // Changed var to const
        const netTestCounts = {}; // Changed var to const
        const aggregations = []; // Changed var to const
        const traversedRequests = {}; // Changed var to const
        const aggregatedExecutions = {}; // Changed var to const
        const consoleLogs = this.summary.consoleLogs || {};
        const executions = _.get(this, 'summary.run.executions');
        const assertions = _.transform(executions, (result, currentExecution) => { // Changed to arrow function
                let stream; // Changed var to let
                let reducedExecution; // Changed var to let
                const executionId = currentExecution.cursor.ref; // Changed var to const

                if (!_.has(traversedRequests, executionId)) {
                    // mark the current request instance as traversed
                    _.set(traversedRequests, executionId, 1);

                    // set the base assertion and cumulative test details for the current request instance
                    _.set(result, executionId, {});
                    _.set(netTestCounts, executionId, { passed: 0, failed: 0, skipped: 0 });

                    // set base values for overall response size and time values
                    _.set(executionMeans, executionId, { time: { sum: 0, count: 0 }, size: { sum: 0, count: 0 } });

                    reducedExecution = _.pick(currentExecution, AGGREGATED_FIELDS);

                    if (reducedExecution.response && _.isFunction(reducedExecution.response.toJSON)) {
                        reducedExecution.response = reducedExecution.response.toJSON();
                        stream = reducedExecution.response.stream;
                        // Original response body for type checking before obfuscation
                        const originalResponseBody = Buffer.from(stream).toString();
                        reducedExecution.response.body = originalResponseBody; // Keep it as string for now
                    }

                    // Apply obfuscation if skipSensitiveData is not true
                    if (!options.skipSensitiveData) {
                        // 0. Obfuscate URL Query Parameters
                        if (reducedExecution.request && reducedExecution.request.url && reducedExecution.request.url.query && Array.isArray(reducedExecution.request.url.query.members)) {
                            reducedExecution.request.url.query.members.forEach(param => {
                                param.value = obfuscateValue(param.key, param.value, SENSITIVE_KEYS);
                            });
                        }

                        // 1. Obfuscate Request Headers
                        if (!options.omitHeaders && reducedExecution.request && reducedExecution.request.headers && reducedExecution.request.headers.members) {
                            reducedExecution.request.headers.members.forEach(header => {
                                if (!(options.skipHeaders || []).includes(header.key)) {
                                    header.value = obfuscateValue(header.key, header.value, SENSITIVE_KEYS);
                                }
                            });
                        }

                        // 2. Obfuscate Request Body
                        if (!options.omitRequestBodies && reducedExecution.request && reducedExecution.request.body) {
                            const requestName = reducedExecution.item.name; // For hideRequestBody check
                            const skipThisBody = (options.hideRequestBody || []).includes(requestName);

                            if (!skipThisBody) {
                                if (reducedExecution.request.body.raw) {
                                    // Check content type if available, otherwise attempt parse
                                    let contentType = '';
                                    if (reducedExecution.request.headers && reducedExecution.request.headers.members) {
                                        const contentTypeHeader = reducedExecution.request.headers.members.find(h => String(h.key).toLowerCase() === 'content-type');
                                        if (contentTypeHeader) contentType = String(contentTypeHeader.value).toLowerCase();
                                    }
                                    if (contentType.includes('json') || (!contentType && reducedExecution.request.body.raw.trim().startsWith('{'))) {
                                        reducedExecution.request.body.raw = obfuscateJsonString(reducedExecution.request.body.raw, SENSITIVE_KEYS);
                                    }
                                }
                                if (reducedExecution.request.body.formdata && reducedExecution.request.body.formdata.members) {
                                    reducedExecution.request.body.formdata.members.forEach(member => {
                                        member.value = obfuscateValue(member.key, member.value, SENSITIVE_KEYS);
                                    });
                                }
                                if (reducedExecution.request.body.urlencoded && reducedExecution.request.body.urlencoded.members) {
                                    reducedExecution.request.body.urlencoded.members.forEach(member => {
                                        member.value = obfuscateValue(member.key, member.value, SENSITIVE_KEYS);
                                    });
                                }
                                if (reducedExecution.request.body.graphql && reducedExecution.request.body.graphql.variables) {
                                    reducedExecution.request.body.graphql.variables = obfuscateJsonString(
                                        reducedExecution.request.body.graphql.variables, SENSITIVE_KEYS
                                    );
                                }
                            }
                        }

                        // 3. Obfuscate Response Headers
                        if (!options.omitHeaders && reducedExecution.response && reducedExecution.response.headers) {
                            // Response headers in Postman SDK are often an array of {key, value} from .toJSON()
                            // If it's an object, Object.entries might be needed, but usually it's an array.
                            if (Array.isArray(reducedExecution.response.headers)) {
                                reducedExecution.response.headers.forEach(header => {
                                    if (!(options.skipHeaders || []).includes(header.key)) {
                                        header.value = obfuscateValue(header.key, header.value, SENSITIVE_KEYS);
                                    }
                                });
                            } else if (typeof reducedExecution.response.headers === 'object') { // Fallback for key-value object
                                for (const key in reducedExecution.response.headers) {
                                    if (Object.prototype.hasOwnProperty.call(reducedExecution.response.headers, key)) {
                                        if (!(options.skipHeaders || []).includes(key)) {
                                            reducedExecution.response.headers[key] = obfuscateValue(key, reducedExecution.response.headers[key], SENSITIVE_KEYS);
                                        }
                                    }
                                }
                            }
                        }
                        
                        // 4. Obfuscate Response Body
                        if (!options.omitResponseBodies && reducedExecution.response && reducedExecution.response.body) {
                            const requestName = reducedExecution.item.name; // For hideResponseBody check
                            const skipThisBody = (options.hideResponseBody || []).includes(requestName);
                            if (!skipThisBody) {
                                let contentType = '';
                                if (reducedExecution.response.headers) {
                                    const headersArray = Array.isArray(reducedExecution.response.headers) ? 
                                                         reducedExecution.response.headers : 
                                                         Object.entries(reducedExecution.response.headers).map(([k,v]) => ({key:k, value:v}));
                                    const contentTypeHeader = headersArray.find(h => String(h.key).toLowerCase() === 'content-type');
                                    if (contentTypeHeader) contentType = String(contentTypeHeader.value).toLowerCase();
                                }
                                if (contentType.includes('json') || (!contentType && reducedExecution.response.body.trim().startsWith('{'))) {
                                     reducedExecution.response.body = obfuscateJsonString(reducedExecution.response.body, SENSITIVE_KEYS);
                                }
                            }
                        }
                    }


                    // set sample request and response details for the current request
                    items[reducedExecution.cursor.ref] = reducedExecution;
                }

                executionMeans[executionId].time.sum += _.get(currentExecution, 'response.responseTime', 0);
                executionMeans[executionId].size.sum += _.get(currentExecution, 'response.responseSize', 0);

                ++executionMeans[executionId].time.count;
                ++executionMeans[executionId].size.count;

                _.forEach(currentExecution.assertions, (assertion) => { // Changed to arrow function
                    let aggregationResult; // Changed var to let
                    const assertionName = assertion.assertion; // Changed var to const
                    const testName = _.get(assertion, 'error.test') || undefined; // Changed var to const
                    const errorMessage = _.get(assertion, 'error.message') || undefined; // Changed var to const
                    const isError = _.get(assertion, 'error') !== undefined; // Changed var to const
                    const isSkipped = _.get(assertion, 'skipped'); // Changed var to const

                    result[executionId][assertionName] = result[executionId][assertionName] || {
                        name: assertionName,
                        testFailure: { test: testName, message: errorMessage },
                        passed: 0,
                        failed: 0,
                        skipped: 0
                    };
                    aggregationResult = result[executionId][assertionName];

                    if (isError && isSkipped !== true) {
                        aggregationResult.failed++;
                        netTestCounts[executionId].failed++;
                    }
                    else if (isSkipped) {
                        aggregationResult.skipped++;
                        netTestCounts[executionId].skipped++;
                    }
                    else if (isError === false && isSkipped === false) {
                        aggregationResult.passed++;
                        netTestCounts[executionId].passed++;
                    }
                });
            }, {}),

            aggregator = (execution) => { // Changed to arrow function
                // fetch aggregated run times and response sizes for items, (0 for failed requests)
                const aggregationMean = executionMeans[execution.cursor.ref]; // Changed var to const
                const meanTime = _.get(aggregationMean, 'time', 0); // Changed var to const
                const meanSize = _.get(aggregationMean, 'size', 0); // Changed var to const
                const parent = execution.item.parent(); // Changed var to const
                const iteration = execution.cursor.iteration; // Changed var to const
                const previous = _.last(aggregations); // Changed var to const
                const current = _.merge(items[execution.cursor.ref], { // Changed var to const
                        assertions: _.values(assertions[execution.cursor.ref]),
                        mean: {
                            time: util.prettyms(meanTime.sum / meanTime.count),
                            size: util.filesize(meanSize.sum / meanSize.count)
                        },
                        cumulativeTests: netTestCounts[execution.cursor.ref],
                        consoleLogs: consoleLogs[execution.cursor.ref]
                    });

                if (aggregatedExecutions[execution.cursor.ref]) { return; }

                aggregatedExecutions[execution.cursor.ref] = true;

                if (previous && parent.id === previous.parent.id && previous.parent.iteration === iteration) {
                    previous.executions.push(current);
                }
                else {
                    aggregations.push({
                        parent: {
                            id: parent.id,
                            name: util.getFullName(parent),
                            description: parent.description,
                            iteration: iteration
                        },
                        executions: [current]
                    });
                }
            };

        _.forEach(this.summary.run.executions, aggregator);

        //  File name validation regex from owasp https://owasp.org/www-community/OWASP_Validation_Regex_Repository
        const pattern = new RegExp('^(([a-zA-Z]:|\\\\)\\\\)?(((\\.)|' + // Changed var to const
        '(\\.\\.)|([^\\\\/:*?"|<>. ](([^\\\\/:*?"|<>. ])|' +
        '([^\\\\/:*?"|<>]*[^\\\\/:*?"|<>. ]))?))' +
        '\\\\)*[^\\\\/:*?"|<>. ](([^\\\\/:*?"|<>. ])' +
        '|([^\\\\/:*?"|<>]*[^\\\\/:*?"|<>. ]))?$');

        const timezone = options.timezone || moment.tz.guess(true); // Changed let to const

        this.exports.push({
            name: 'html-reporter-htmlextra',
            default: (this.summary.collection.name).match(pattern) ?
                `${this.summary.collection.name}.html` : 'newman_htmlextra.html',
            path: options.export,
            content: compiler({
                // skipHeaders is used by the obfuscation logic now, so it's still passed
                // for the template to potentially use if it iterates headers itself.
                skipHeaders: options.skipHeaders || [],
                skipEnvironmentVars: options.skipEnvironmentVars || [], // For env/global var view
                skipGlobalVars: options.skipGlobalVars || [], // For env/global var view
                omitRequestBodies: options.omitRequestBodies || false,
                omitResponseBodies: options.omitResponseBodies || false,
                hideRequestBody: options.hideRequestBody || [],
                hideResponseBody: options.hideResponseBody || [],
                showEnvironmentData: options.showEnvironmentData || false,
                showGlobalData: options.showGlobalData || false,
                skipSensitiveData: options.skipSensitiveData || false,
                omitHeaders: options.omitHeaders || false,
                showMarkdownLinks: options.showMarkdownLinks || false,
                noSyntaxHighlighting: options.noSyntaxHighlighting || false,
                showFolderDescription: options.showFolderDescription || false,
                displayProgressBar: options.silentProgressBar || false,
                browserTitle: options.browserTitle || 'Newman Summary Report',
                title: options.title || 'Newman Run Dashboard',
                titleSize: options.titleSize || 2,
                timestamp: moment().tz(timezone).format('dddd, DD MMMM YYYY HH:mm:ss'),
                version: collectionRunOptions.newmanVersion,
                folders: collectionRunOptions.folder,
                skipFolders: options.skipFolders || [],
                skipRequests: options.skipRequests || [],
                aggregations: aggregations,
                summary: {
                    stats: this.summary.run.stats,
                    collection: this.summary.collection,
                    globals: _.isObject(this.summary.globals) ? this.summary.globals : undefined,
                    environment: _.isObject(this.summary.environment) ? this.summary.environment : undefined,
                    failures: this.summary.run.failures,
                    responseTotal: util.filesize(this.summary.run.transfers.responseTotal),
                    responseAverage: util.prettyms(this.summary.run.timings.responseAverage),
                    duration: util.prettyms(this.summary.run.timings.completed - this.summary.run.timings.started),
                skippedTests: _.isObject(this.summary.skippedTests) ? this.summary.skippedTests : undefined,
                // pass percentage
                passedPercent: this.summary.run.stats.assertions.total === 0 ? 100 : parseFloat(((this.summary.run.stats.assertions.total - this.summary.run.stats.assertions.failed) / this.summary.run.stats.assertions.total * 100).toFixed(2)),
                failedPercent: this.summary.run.stats.assertions.total === 0 ? 0 : parseFloat((this.summary.run.stats.assertions.failed / this.summary.run.stats.assertions.total * 100).toFixed(2))
                }
            })
        });
    });
};

module.exports = PostmanHTMLExtraReporter;

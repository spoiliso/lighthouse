/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to see if it does not use <link> that block first paint.
 */

'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');
const DevtoolsTimelineModel = require('../lib/traces/devtools-timeline-model');

const timelineCategories = [
  'Compile Script',
  'Evaluate Script',
  'Minor GC',
  'Major GC',
  'XHR Ready State Change',
  'Layout',
  'Paint',
  'Composite Layers',
  'Recalculate Style',
  'Parse HTML',
  'Parse Stylesheet',
  'DOM GC',
  'Image Decode',
];

class PageExecutionTimings extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'boot-up-time',
      description: 'Boot-up time is high',
      informative: true,
      helpText: 'Consider reducing the time spent parsing, compiling and executing JS.' +
        'You may find delivering smaller JS payloads helps with this.',
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @param {!Array<TraceEvent>=} trace
   * @param {!WebInspector.TimelineProfileTree.Node} A grouped and sorted tree
   */
  static getTimingsByCategory(trace) {
    const timelineModel = new DevtoolsTimelineModel(trace);

    return timelineModel.bottomUpGroupBy('EventName');
  }

  /**
   * @param {!Array<TraceEvent>=} trace
   * @return {!Map<string, Number>}
   */
  static getExecutionTimingsByCategory(trace) {
    const bottomUpByName = PageExecutionTimings.getTimingsByCategory(trace);

    const result = new Map();
    bottomUpByName.children.forEach((value, key) =>
      result.set(key, value.selfTime.toFixed(1)));

    return result;
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[PageExecutionTimings.DEFAULT_PASS].traceEvents;
    const executionTimings = PageExecutionTimings.getExecutionTimingsByCategory(trace);
    let totalExecutionTime = 0;

    const results = timelineCategories.map(category => {
      const timing = Number(executionTimings.get(category) || 0);
      totalExecutionTime += timing;

      return {
        category,
        duration: Util.formatMilliseconds(timing, 1),
      }
    });

    const headings = [
      {key: 'category', itemType: 'text', text: 'Category'},
      {key: 'duration', itemType: 'text', text: 'Time spent'},
    ];
    const tableDetails = PageExecutionTimings.makeTableDetails(headings, results);

    return {
      rawValue: totalExecutionTime,
      displayValue: Util.formatMilliseconds(totalExecutionTime),
      details: tableDetails,
    };
  }
}

module.exports = PageExecutionTimings;

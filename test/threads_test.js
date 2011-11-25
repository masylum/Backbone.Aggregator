/*global describe, it*/
var _ = require('underscore')
  , assert = require('assert');

GLOBAL.Backbone = require('backbone');
require('../backbone.aggregator');

var happened = {}
  , i
  , Models = {}
  , Collections = {}

// instances
, tasks, activities, threads;

function inc(what) {
  return function () {
    happened[what]++;
  };
}

Models.Task = Backbone.Model.extend({
  initialize: function () {
    this.collection = tasks;
    this.attributes.type = 'Task';
  }
});

Models.Activity = Backbone.Model.extend({
  initialize: function () {
    this.collection = activities;
    this.attributes.type = 'Activity';
  }
});

Collections.Tasks = Backbone.Collection.extend({
  model: Models.Task
});

Collections.Activities = Backbone.Collection.extend({
  model: Models.Activity
});

Collections.Threads = Backbone.Aggregator.extend({
  model: function (attr, opt) {
    return new Models[attr.type](attr, opt);
  }
, collections: function () {
    return {Task: tasks, Activity: activities};
  }
, reset: function (models, options) {
    models = models || [];
    options = options || {};
    this.each(this._removeReference);
    this._reset();
    //Not silent, so that child collection trigger all
    //and this adds models to aggregator.
    this.add(models);
    if (!options.silent) this.trigger('reset', this, options);
    return this;
  }
, _proxyEvents: function (ev, model, collection, options) {
    if (ev !== 'reset') {
      Backbone.Aggregator.prototype._proxyEvents.apply(this, arguments);
    }
  }
});

describe('Custom Aggregated collections', function () {
  it('a `reset` on a child collection does not proxy event to parent thread collection', function () {
    tasks = new Collections.Tasks();
    activities = new Collections.Activities();
    threads = new Collections.Threads();

    // add
    for (i = 0; i < 2; i++) {
      threads.add({id: i, type: 'Task'});
      threads.add({id: i, type: 'Activity'});
    }

    var inc_threads = inc('threads')
    , inc_tasks = inc('tasks')
    , inc_threads_all = inc('threads_all')
    , inc_threads_add = inc('threads_add')
    , inc_tasks_all = inc('tasks_all')
    , inc_tasks_add = inc('tasks_add');

    happened = {threads: 0, tasks: 0};
    threads.bind('reset', inc_threads);
    tasks.bind('reset', inc_tasks);

    assert.equal(threads.length, 4);
    assert.deepEqual(threads.pluck('id'), [1, 1, 0, 0]);
    assert.deepEqual(tasks.pluck('id'), [0, 1]);

    tasks.reset([{id: 2}, {id: 3}]);

    assert.equal(happened.threads, 0);
    assert.equal(happened.tasks, 1);

    assert.deepEqual(threads.pluck('id'), [1, 1, 0, 0]);
    assert.deepEqual(tasks.pluck('id'), [2, 3]);
    assert.deepEqual(_.pluck(threads.models, 'cid'), ["c3", "c2", "c1", "c0"]);
    assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c4', 'c5']);
  });

  it("a `reset` on the parent thread collection does not proxy the `reset` event to it's child collections", function () {
    tasks = new Collections.Tasks();
    activities = new Collections.Activities();
    threads = new Collections.Threads();

    // add
    for (i = 0; i < 2; i++) {
      threads.add({id: i, type: 'Task'});
      threads.add({id: i, type: 'Activity'});
    }

    var inc_threads = inc('threads')
    , inc_tasks = inc('tasks')
    , inc_threads_all = inc('threads_all')
    , inc_threads_add = inc('threads_add')
    , inc_tasks_all = inc('tasks_all')
    , inc_tasks_add = inc('tasks_add');

    happened = {threads: 0, tasks: 0, threads_add: 0, tasks_add: 0, threads_all: 0, tasks_all: 0};

    //Clear out event handlers from previous test
    threads.unbind('reset', inc_threads);
    tasks.unbind('reset', inc_tasks);

    //rebind for this test
    threads.bind('all', inc_threads_all);
    threads.bind('add', inc_threads_add);
    tasks.bind('all', inc_tasks_all);
    tasks.bind('add', inc_tasks_add);
    threads.bind('reset', inc_threads);
    tasks.bind('reset', inc_tasks);

    threads.reset([{id: 4, type: 'Task'}, {id: 5, type: 'Task'}]);

    assert.equal(happened.threads, 1); //reset
    assert.equal(happened.tasks, 0);
    assert.equal(happened.threads_add, 2); //2x add
    assert.equal(happened.threads_all, 3); //reset, 2x add
    assert.equal(happened.tasks_add, 2);
    assert.equal(happened.tasks_all, 2);

    assert.equal(tasks.length, 4);
    assert.deepEqual(tasks.pluck('id'), [0, 1, 4, 5]);
    assert.equal(threads.length, 2);
    assert.deepEqual(threads.pluck('id'), [5, 4]);
    assert.deepEqual(_.pluck(threads.models, 'cid'), ['c11', 'c10']);
    assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c6', 'c8', 'c10', 'c11']);
    assert.equal(activities.length, 2);
  });
});

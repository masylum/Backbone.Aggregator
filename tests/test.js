var _ = require('underscore')
  , assert = require('assert')
  , happened = {}
  , Models = {}
  , Collections = {}

  // instances
  , tasks, activities, threads;

function inc(what) {
  return function () {
    happened[what]++;
  }
}

GLOBAL.Backbone = require('backbone');
require('../backbone.aggregator');

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
});

tasks = new Collections.Tasks();
activities = new Collections.Activities();
threads = new Collections.Threads();

// add
for (var i = 0; i < 2; i++) {
  threads.add({id: i, type: 'Task'});
  threads.add({id: i, type: 'Activity'});
}

// lengths
assert.equal(threads.length, 4);
assert.equal(tasks.length, 2);
assert.equal(activities.length, 2);

// cids
assert.deepEqual(_.pluck(threads.models, 'cid'), ['c3', 'c2', 'c1', 'c0']);
assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c0', 'c2']);
assert.deepEqual(_.pluck(activities.models, 'cid'), ['c1', 'c3']);

// ids
assert.deepEqual(threads.pluck('id'), [1, 1, 0, 0]);
assert.deepEqual(tasks.pluck('id'), [0, 1]);
assert.deepEqual(activities.pluck('id'), [0, 1]);

// get
assert.deepEqual(threads.get({type: 'Task', id: 0}), tasks.get(0));
assert.deepEqual(threads.get({type: 'Activity', id: 0}), activities.get(0));
assert.deepEqual(threads.get('Task', 0), tasks.get(0));
assert.deepEqual(threads.get('Activity', 0), activities.get(0));

// remove
threads.remove({id: 0, type: 'Task'});
threads.remove(activities.get(0));
assert.deepEqual(threads.pluck('id'), [1, 1]);
assert.deepEqual(tasks.pluck('id'), [1]);
assert.deepEqual(activities.pluck('id'), [1]);

// children events add
happened = {threads: false, tasks: false};
threads.bind('add', function () {
  happened.threads = true
});
tasks.bind('add', function () {
  happened.tasks = true
});
tasks.add({id: 0});
assert.ok(happened.threads);
assert.ok(happened.tasks);
assert.deepEqual(threads.pluck('id'), [0, 1, 1]);
assert.deepEqual(tasks.pluck('id'), [1, 0]);
assert.deepEqual(_.pluck(threads.models, 'cid'), ['c4', 'c3', 'c2']);
assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c2', 'c4']);

// children events remove
happened = {threads: false, tasks: false};
threads.bind('remove', function () {
  happened.threads = true
});
tasks.bind('remove', function () {
  happened.tasks = true
});
tasks.remove({id: 0});
assert.ok(happened.threads);
assert.ok(happened.tasks);
assert.deepEqual(threads.pluck('id'), [1, 1]);
assert.deepEqual(tasks.pluck('id'), [1]);
assert.deepEqual(_.pluck(threads.models, 'cid'), ['c3', 'c2']);
assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c2']);

// change!
happened = {threads: false, tasks: false, threads_attr: false, tasks_attr: false};
threads.bind('change', function () {
  happened.threads = true
});
tasks.bind('change', function () {
  happened.tasks = true
});
threads.bind('change:name', function () {
  happened.threads_attr = true
});
tasks.bind('change:name', function () {
  happened.tasks_attr = true
});
threads.get('Task', 1).set({name: 'fleiba'});
assert.ok(happened.threads);
assert.ok(happened.tasks);
assert.ok(happened.threads_attr);
assert.ok(happened.tasks_attr);
assert.equal(threads.get('Task', 1).get('name'), 'fleiba');
assert.equal(tasks.get(1).get('name'), 'fleiba');

// event children reset!
happened = {threads: 0, tasks: 0};
threads.bind('reset', inc('threads'));
tasks.bind('reset', inc('tasks'));

tasks.reset([{id: 2}, {id: 3}]);

assert.equal(happened.threads, 1);
assert.equal(happened.tasks, 1);

assert.deepEqual(threads.pluck('id'), [3, 2, 1]);
assert.deepEqual(tasks.pluck('id'), [2, 3]);
assert.deepEqual(_.pluck(threads.models, 'cid'), ['c6', 'c5', 'c3']);
assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c5', 'c6']);

// event agregator reset
happened = {threads: 0, tasks: 0, threads_add: 0, tasks_add: 0};
threads.unbind('add');
tasks.unbind('add');
threads.unbind('reset');
tasks.unbind('reset');
threads.bind('add', inc('threads_add'));
tasks.bind('add', inc('tasks_add'));
threads.bind('reset', inc('threads'));
tasks.bind('reset', inc('tasks'));

threads.reset([{id: 4, type: 'Task'}, {id: 5, type: 'Task'}]);

assert.equal(happened.threads, 2);
assert.equal(happened.tasks, 1);
assert.equal(happened.threads_add, 0);
assert.equal(happened.tasks_add, 0);

assert.deepEqual(threads.pluck('id'), [5, 4]);
assert.deepEqual(tasks.pluck('id'), [4, 5]);
assert.deepEqual(_.pluck(threads.models, 'cid'), ['c10', 'c9']);
assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c9', 'c10']);
assert.equal(activities.length, 0);
console.log('Green...');

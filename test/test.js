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
  };
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
describe('Aggregator', function () {
  it('has a length the sum of their aggregated collections', function () {
    assert.equal(threads.length, 4);
    assert.equal(tasks.length, 2);
    assert.equal(activities.length, 2);
  });

  it('contains corrects cids', function () {
    assert.deepEqual(_.pluck(threads.models, 'cid'), ['c3', 'c2', 'c1', 'c0']);
    assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c0', 'c2']);
    assert.deepEqual(_.pluck(activities.models, 'cid'), ['c1', 'c3']);
  });

  it('contains corrects ids', function () {
    assert.deepEqual(threads.pluck('id'), [1, 1, 0, 0]);
    assert.deepEqual(tasks.pluck('id'), [0, 1]);
    assert.deepEqual(activities.pluck('id'), [0, 1]);
  });

  it('has a `get` function that behaves similar as Collections one', function () {
    assert.deepEqual(threads.get({type: 'Task', id: 0}), tasks.get(0));
    assert.deepEqual(threads.get({type: 'Activity', id: 0}), activities.get(0));
    assert.deepEqual(threads.get('Task', 0), tasks.get(0));
    assert.deepEqual(threads.get('Activity', 0), activities.get(0));
  });

  it('has a `remove` function that removes also from the aggregated collection', function () {
    happened = {threads: 0, tasks: 0, activities: 0};
    threads.bind('remove', inc('threads'));
    tasks.bind('remove', inc('tasks'));
    activities.bind('remove', inc('activities'));

    threads.remove({id: 0, type: 'Task'});
    threads.remove(activities.get(0));

    assert.equal(happened.threads, 2);
    assert.equal(happened.tasks, 1);
    assert.equal(happened.activities, 1);

    assert.deepEqual(threads.pluck('id'), [1, 1]);
    assert.deepEqual(tasks.pluck('id'), [1]);
    assert.deepEqual(activities.pluck('id'), [1]);
  });
});

describe('Aggregated collections', function () {
  it('proxies the `add` event', function () {
    happened = {threads: 0, tasks: 0};

    threads.bind('add', inc('threads'));
    tasks.bind('add', inc('tasks'));

    tasks.add({id: 0});

    assert.equal(happened.threads, 1);
    assert.equal(happened.tasks, 1);

    assert.deepEqual(threads.pluck('id'), [0, 1, 1]);
    assert.deepEqual(tasks.pluck('id'), [1, 0]);
    assert.deepEqual(_.pluck(threads.models, 'cid'), ['c4', 'c3', 'c2']);
    assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c2', 'c4']);
  });

  it('proxies the `remove` event', function () {
    happened = {threads: 0, tasks: 0};

    threads.unbind('remove');
    tasks.unbind('remove');
    threads.bind('remove', inc('threads'));
    tasks.bind('remove', inc('tasks'));

    tasks.remove({id: 0});

    assert.equal(happened.threads, 1);
    assert.equal(happened.tasks, 1);

    assert.deepEqual(threads.pluck('id'), [1, 1]);
    assert.deepEqual(tasks.pluck('id'), [1]);
    assert.deepEqual(_.pluck(threads.models, 'cid'), ['c3', 'c2']);
    assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c2']);
  });

  it('proxies the `change` event', function () {
    happened = {threads: 0, tasks: 0, threads_attr: 0, tasks_attr: 0};

    threads.bind('change', inc('threads'));
    tasks.bind('change', inc('tasks'));
    threads.bind('change:name', inc('threads_attr'));
    tasks.bind('change:name', inc('tasks_attr'));

    threads.get('Task', 1).set({name: 'fleiba'});

    assert.equal(happened.threads, 1);
    assert.equal(happened.tasks, 1);
    assert.equal(happened.threads_attr, 1);
    assert.equal(happened.tasks_attr, 1);

    assert.equal(threads.get('Task', 1).get('name'), 'fleiba');
    assert.equal(tasks.get(1).get('name'), 'fleiba');
  });

  it('proxies the `reset` event', function () {
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
  });

  it("allows customizing the collections function via options.collections", function () {
    var my_tasks = new Collections.Tasks()
    ,   my_activities = new Collections.Activities()
    ,   my_threads = new Collections.Threads(false, {collections: function () { 
      return {
        Task: my_tasks
      , Activity: my_activities
      };
    }});

    happened = {threads: 0, tasks: 0, activities: 0};

    my_threads.bind('add', inc('threads'));
    my_tasks.bind('add', inc('tasks'));
    my_activities.bind('add', inc('activities'));

    my_tasks.add({id: 0});
    my_activities.add({id: 0});

    assert.equal(happened.threads, 2);
    assert.equal(happened.tasks, 1);
    assert.equal(happened.activities, 1);

    assert.deepEqual(my_threads.pluck('id'), [0,0]);
    assert.deepEqual(my_tasks.pluck('id'), [0]);
    assert.deepEqual(my_activities.pluck('id'), [0]);
  });

});

[![build status](https://secure.travis-ci.org/masylum/Backbone.Aggregator.png)](http://travis-ci.org/masylum/Backbone.Aggregator)
# Backbone.aggregator

A collection that contains pointers to elements to other collections models.

## Use case?

Having a polymorphic collection that just points to existant elements in your state.

For instance having a *Recent activities* that mixes *Tasks* and *Activities*,
you want to be sure that adding, deleting or changing a Task or Activity will
update Recent Activities.

## How does it work?

The API is almost the same as `Backbone.Collection`.

  * You must specify which `collection` the model belongs.
  * Each model must have a `type` attribute.
  * The aggregator collection must implement the `collections` method. This will return a mapping of `type` and `collection`.
  * If you want to `get` a model from the aggregator collection you must specify the type too.

``` javascript
Models.Task = Backbone.Model.extend({initialize: function () {
  this.collection = tasks;
}});

Models.Activity = Backbone.Model.extend({initialize: function () {
  this.collection = activities;
}});

Collections.Tasks = Backbone.Collection.extend({model: Models.Task});
Collections.Activities = Backbone.Collection.extend({model: Models.Activity});

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
```

## Tests

You must have node installed in order to run the tests.

```
npm install
make
```

## License

(The MIT License)

Copyright (c) 2010-2011 Pau Ramon <masylum@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

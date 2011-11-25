/**
 * @class  Backbone.Aggregator
 * @name   Backbone Aggregator collections
 * @desc   Implements a collection that aggregates other Backbone Collections
*/
(function () {

  var root = this
    , Aggregator = {}
    , _ = root._;

  if (!_ && (typeof require !== 'undefined')) {
    _ = require('underscore')._;
  }

  /**
   * Aggregator constructor
   *
   * @param {String|Object} type
   * @param {Number} id
   * @return {Object}
   */
  Backbone.Aggregator = function Aggregator(models, options) {
    options = options || {};
    if (options.comparator) {
      this.comparator = options.comparator;
    }

    if (options.collections) {
      this.collections = options.collections;
    }

    _.bindAll(this, '_onModelEvent', '_removeReference', '_proxyEvents');

    _.each(this.collections(), function (collection, index) {
      collection.bind('all', this._proxyEvents);
    }, this);

    this._reset();
    if (models) {
      this.reset(models, {silent: true});
    }
    this.initialize.apply(this, arguments);
  };

  /**
   * Get an object given an id, type or a object containing both
   *
   * @param {String|Object} type
   * @param {Number} id
   * @return {Object}
   */
  Aggregator.get = function (type, id) {
    if (typeof type === 'object') {
      id = type.id;
      type = typeof type.type === 'string' ? type.type : type.get('type');
    }

    if (id === null || !type) {
      return null;
    }
    return this.collections()[type]._byId[id];
  };

  /**
   * Resets the aggregated collections
   *
   * @param {Object} models
   * @param {Object} options
   * @return {Object} collection
   */
  Aggregator.reset = function (models, options) {
    models = models || [];
    options = options || {};
    this.each(this._removeReference);
    this._reset();
    this.add(models, {silent: true});
    _.each(this.collections(), function (collection, index) {
      collection.reset(_.filter(models, function (model) {
        return model.type === index;
      }), _.clone(options));
    }, this);
    return this;
  };

  /**
   * Adds a model into the aggregated collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Aggregator._add = function (model, options) {
    options = options || {};
    model = this._prepareModel(model, options);
    return model.collection._add(model, options);
  };

  /**
   * Adds a model into the aggregator collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Aggregator._addToAggregator = function (model, options) {
    this._byCid[model.cid] = model;

    var index = options.at !== null ? options.at :
              this.comparator ? this.sortedIndex(model, this.comparator) :
              this.length;

    this.models.splice(index, 0, model);
    model.bind('all', this._onModelEvent);
    this.length++;
    options.index = index;
    return model;
  };

  /**
   * Remove a model from the aggregated collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Aggregator._remove = function (model, options) {
    options = options || {};
    model = this.getByCid(model) || this.get(model);
    return model.collection._remove(model, options);
  };

  /**
   * Remove a model from the aggregator collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Aggregator._removeFromAggregator = function (model, options) {
    delete this._byCid[model.cid];
    var index = this.indexOf(model);
    this.models.splice(index, 1);
    this.length--;
    options.index = index;
    this._removeReference(model);
    return model;
  };

  /**
   * Remove a model from the aggregator collection
   *
   * @param {Object} collection
   * @param {Object} options
   * @return {Object} model
   */
  Aggregator._resetFromAggregator = function (collection, options) {
    var type;

    _.any(this.collections(), function (coll, index) {
      var found = coll === collection;
      if (found) {
        type = index;
      }
      return found;
    });

    this.each(function (model) {
      if (model.get('type') === type) {
        this._removeFromAggregator(model, options);
      }
    }, this);

    collection.each(function (model) {
      if (model.get('type') === type) {
        this._addToAggregator(model, options);
      }
    }, this);
  };

  /**
   * Prepare a model to be added to a collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Aggregator._prepareModel = function (model, options) {
    if (!(model instanceof Backbone.Model)) {
      var attrs = model;
      model = new this.model(attrs);
      if (model.validate && !model._performValidation(model.attributes, options)) {
        model = false;
      }
    } else if (!model.collection) {
      throw Error('Aggregator models have to implement a collection');
    }
    return model;
  };

  /**
   * Proxies an event happening into the aggregated collection to the aggregator
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Aggregator._proxyEvents = function (ev, model, collection, options) {
    if (ev === 'add' && collection !== this) {
      this._addToAggregator(model, options);
    }

    if (ev === 'remove' && collection !== this) {
      this._removeFromAggregator(model, options);
    }

    if (ev === 'reset' && model !== this) {
      this._resetFromAggregator(model, collection);
    }

    if (['add', 'remove', 'reset'].indexOf(ev) >= 0) {
      this.trigger.apply(this, arguments);
    }
  };

  /**
   * Unbinds the _onModelEvent listener
   *
   * @param {Object} model
   */
  Aggregator._removeReference = function (model) {
    model.unbind('all', this._onModelEvent);
  };

  _.extend(Backbone.Aggregator.prototype, Backbone.Collection.prototype, Aggregator);
  Backbone.Aggregator.extend = Backbone.Collection.extend;
}).call(this);

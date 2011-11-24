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
   * Get an object given an id, type or a object containing both
   *
   * @param {String|Object} type
   * @param {Number} id
   * @return {Object}
   */
  Aggregator.get = function (type, id) {
    if (typeof type === 'object') {
      id = type.id;
      type = type.type || type.get('type');
    }

    if (id === null || !type) {
      return null;
    }
    return this.collections()[type]._byId[id];
  };

  /**
   * Resets the collection and proxies the aggregator collection events
   *
   * @param {Object} options
   */
  Aggregator._reset = function (options) {
    Backbone.Collection.prototype._reset.call(this);
    _.each(this.collections(), function (collection) {
      collection.bind('all', _.bind(this._proxyEvents, this));
    }, this);
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
    if (!options.silent) {
      model.trigger('add', model, this, options);
    }
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
    if (!options.silent) {
      model.trigger('remove', model, this, options);
    }
    model.unbind('all', this._onModelEvent);
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
      this._addToAggregator(model, options);
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

    this.trigger.apply(this, arguments);
  };

  Backbone.Aggregator = Backbone.Collection.extend(Aggregator);
}).call(this);

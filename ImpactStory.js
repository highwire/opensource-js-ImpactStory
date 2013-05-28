// Set up the global impact story object
var ImpactStory = new impactStory();

// impactStory class.
// If you don't want to use the global object, you can create a new impactStory object by using `var myIS = new impactStory()`.
function impactStory() {

  var self = this;

  // This should be overriden. An error will be thrown if a key is not set.
  self.key = '';

  // Template directory. This needs to be overriden and set.
  // @@TODO: Once we have this properly hosted somewhere, we can default this to the hosted template path.
  self.templates = '';

  // This may optionally be overriden if you want to use a different URL
  self.url = 'http://api.impactstory.org/v1/';

  /**
   * Add an item.
   * ImpactStory.addItem(item, callback, error);
   *
   * @item:     key-value pairs. For example: ['pmid','12345'] or ['doi','10.1371/journal.pbio.1000056']
   *            You may also pass a hash object such as {pmid: 12345} or {doi: '10.1371/journal.pbio.1000056'}
   * @callback: Callback to be called when call finishes. function(data)
   * @error:    callback function to be called on error: functon(error)
   */
  self.addItem = function(item, callback, error) {
      if (!self._checkKey()) return false;

      // Transform hash objects into arrays
      item = self._arrayify(item);

      jQuery.ajax({
          url: self.url + "item/" + item[0] + "/" + item[1] + "?key=" + self.key,
          type: 'POST',
      }).done(function () {
          callback();
      }).error(function (err) {
          if (error) {
              error(err);
          }
      });
  };

  /**
   * Get an item with ALM data
   * ImpactStory.getItem(item, callback, error);
   *
   * @item:     key-value pair. For example: ['pmid','12345'] or ['doi','10.1371/journal.pbio.1000056']
   *            You may also pass a hash object such as {pmid: 12345} or {doi: '10.1371/journal.pbio.1000056'}
   * @callback: Callback to be called when call finishes. function(data)
   * @error:    callback function to be called on error: functon(error)
   */
  self.getItem = function(item, callback, error) {
      if (!self._checkKey()) return false;

      // Transform hash objects into arrays
      item = self._arrayify(item);

      jQuery.ajax({
          url: self.url + "item/" + item[0] + "/" + item[1] + "?key=" + self.key,
          type: "GET",
          dataType: "json",
          contentType: "application/json; charset=utf-8",
          statusCode: {
              210: function(data){
                      //@@TODO: run partial callback stuff and deal with errors
                      //@@TODO: Respect conf.retry and conf.interval
                      setTimeout(function(){
                          self.getItem(item, callback, error, conf)
                      }, 1000)
                  },
              200: function(data) {
                      callback(data)
                  }
          }
      });
  };

  /**
   * Add and then get ALM for an item
   * ImpactStory.addAndGetItem(item, callback, error, conf);
   *
   * See documentation on impactStory.getCollection for more information on how polling works
   *
   * @item: key-value pair. For example: ['pmid','12345'] or ['doi','10.1371/journal.pbio.1000056']
   * @callback: Callback to be called when the item gotten. function(data)
   * @error callback function to be called on error: functon(error)
   * @conf Configuration object. For example:
   *   {
   *    retry: 10,                    // Number of times to poll before giving up
   *    interval: 1000,               // Number of milliseconds between polls
   *   }
   */
  self.addAndGetItem = function(item, callback, error, conf) {
      if (!self._checkKey()) return false;

      self.addItem(item, function() {
          self.getItem(item, callback, error, conf);
      }, error);
  };

  /**
   * Get collection information (including all ALM data)
   * ImpactStory.getCollection(collection, callback, error, conf);
   *
   * Note that for a newly created collection, this can time some time to return the full set of data
   * as total-impact can take a while to generate it. To get around this problem we poll the total-impact API
   * in intervals and only return when we have the full set of data. This generally takes about 5 seconds.
   * To get back partial (incomplete) data returned from each poll, defind a partial-callback function
   * using conf.partial = partialCallbackFunc.
   *
   * @collection: Can be either the collection ID (string), a "create-collection" meta-object, or a collection object.
   * @callback:   Callback to be called when the collection is done loading and we have all data. function(data)
   * @error:      Callback function to be called on error: functon(error)
   * @conf Configuration object. For example:
   *   {
   *    includeItems: true,           // set to false to only return meta-information, not ALM data
   *    retry: 10,                    // Number of times to poll before giving up
   *    interval: 1000,               // Number of milliseconds between polls
   *    partial: function(data)       // Partial callback function. Call this on each poll, even if we have only partial data.
   *   }
   */
  self.getCollection = function(collection, callback, error, conf) {
      if (!self._checkKey()) return false;

      // Get the collection ID. Can pass either a string, a "create-collection" meta-object, or a collection object
      var collectionId;
      if (typeof collection == 'string') {
          collectionId = collection;
      }
      if (typeof collection == 'object') {
          if (collection.hasOwnProperty('collection')) {
              collectionId = collection.collection._id;
          }
          else {
              collectionId = collection._id;
          }
      }

      jQuery.ajax({
          url: self.url + "collection/" + collectionId + '?key=' + self.key,
          type: "GET",
          dataType: "json",
          contentType: "application/json; charset=utf-8",
          statusCode: {
              210: function(data){
                      //@@TODO: run partial callback stuff and deal with errors
                      //@@TODO: Respect conf.retry and conf.interval
                      setTimeout(function(){
                          self.getCollection(collection, callback, error, conf)
                      }, 1000)
                  },
              200: function(data) {
                      callback(data)
                  }
          }
      });
  };

  /**
   * Create a collection
   * ImpactStory.createCollection(aliases, title, callback, error);
   *
   * @aliases:  list of key-value pairs. For example: [['pmid','12345'],['doi','10.1371/journal.pbio.1000056']]
   *            You may also pass an array of object hashes, for example [{pmid: 12345} , {doi: '10.1371/journal.pbio.1000056'}]
   * @title:    Title of collection
   * @callback: Callback to be called when the collection is done loading. function(data)
   * @error:    callback function to be called on error: functon(error)
   */
  self.createCollection = function(aliases, title, callback, error) {
      if (!self._checkKey()) return false;

      // Transform all hash objects into arrays for POSTing
      for (var i in aliases) {
        aliases[i] = self._arrayify(aliases[i]);
      }

      var postData = {
          'aliases' : aliases,
          'title': title
      };

      jQuery.ajax({
          url: self.url + "collection?key=" + self.key,
          type: 'POST',
          dataType: 'json',
          contentType:"application/json; charset=utf-8",
          data: JSON.stringify(postData)
      }).done(function (returnedData) {
          callback(returnedData);
      }).error(function (err) {
          if (error) {
              error(err);
          }
      });
  };

  /**
   * Create and then get ALM for a collection
   * ImpactStory.createAndGetCollection(aliases, title, callback, error, conf);
   *
   * See documentation on impactStory.getCollection for more information on how polling works
   *
   * @aliases: list of key-value pairs. For example: [['pmid','12345'],['doi','10.1371/journal.pbio.1000056']]
   * @title: Title of collection
   * @callback: Callback to be called when the collection is done loading. function(data)
   * @error callback function to be called on error: functon(error)
   * @conf Configuration object. For example:
   *   {
   *    includeItems: true,           // set to false to only return meta-information, not ALM data
   *    retry: 10,                    // Number of times to poll before giving up
   *    interval: 1000,               // Number of milliseconds between polls
   *    partial: function(data)       // Partial callback function. Call this on each poll, even if we have only partial data.
   *   }
   */
  self.createAndGetCollection = function(aliases, title, callback, error, conf) {
      if (!self._checkKey()) return false;

      self.createCollection(aliases, title, function(collection) {
          self.getCollection(collection, callback, error, conf);
      }, error);
  };

  //@@TODO
  self.getProviderInfo = function() {
    // http://api.impactstory.org/v1/provider?key=YOURKEY
  };

  self.renderTemplate = function(template, item, callback, error) {
      jQuery.ajax({
          url: self.templates + "/" + template + ".html",
          type: "GET"
          //cache: false
      }).done(function (returnedData) {
          // First we need to transform metrics
          callback(Mustache.render(returnedData, self.templatizeItem(item)));
      }).error(function (err) {
          if (error) {
              error(err);
          }
      });
  };

  // Get an item ready for templatization
  // This basically just transforms the metrics object into an array and adds other useful data required by the moustache template engine
  self.templatizeItem = function(item) {
    var metricsArray = [];
    console.log(item);
    for (var name in item.metrics) {
      // Add the name to the metrics
      item.metrics[name].name = name;

      // Mark wether it's values are a "simple" string or a "complex" array of objects
      if (Array.isArray(item.metrics[name].values.raw)) {
        item.metrics[name].values.simple = false;
      }
      else {
        item.metrics[name].values.simple = true;
      }

      // When rendering, we need to know how much to offset the upper-limit WoS. 
      if (self._propExists(item.metrics[name], 'values.WoS.CI95_upper')) {
        item.metrics[name].values.WoS.CI95_upper_offset = 100 - item.metrics[name].values.WoS.CI95_upper;
      }
      if (self._propExists(item.metrics[name], 'values.WoS.estimate_upper')) {
        item.metrics[name].values.WoS.estimate_upper_offset = 100 - item.metrics[name].values.WoS.estimate_upper;
      }

      metricsArray.push(item.metrics[name])
    }
    item.metrics = metricsArray;
    return item;
  };

  /**
   * Private function that checks for a valid key and alerts an error if there isn't one set.
   */
  self._checkKey = function() {
    if (self.key === "") {
      alert('Please specify an Impact Story key by running `impactStory.key = "YOURKEY";` before calling any impactStory methods.');
      return false;
    }
    else {
      return true;
    }
  };

  /**
   * Private utlity function that transforms a hash object like {pmid: 12345} into an array like ['pmid','12345']
   */
  self._arrayify = function(item) {
    // cross-browser method to determine if a variable is an array or not
    if (Object.prototype.toString.call(item) === '[object Array]') return item;

    if (typeof item === 'object') {
      for (var key in item) {
        return [key, item[key]];
      }
    }
    else {
      throw "impactStory error: items must be in the form of an array (eg. ['pmid','12345'] ) or a hash object (eg. {doi: '10.1371/journal.pbio.1000056'} .)";
    }
  };

  /**
   * Private utlity function that checks if a sub-property exists
   * See: http://stackoverflow.com/questions/4676223/check-if-object-member-exists-in-nested-object
   */
  self._propExists = function(obj, prop) {
    var parts = prop.split('.');
    for(var i = 0, l = parts.length; i < l; i++) {
        var part = parts[i];
        if(obj !== null && typeof obj === "object" && part in obj) {
            obj = obj[part];
        }
        else {
            return false;
        }
    }
    return true;
  };

}

/**
 * ImpactStoryEmbed is a jQuery plugin that will embed an ImpactStory template
 */
(function($){
    $.fn.extend({
        ImpactStoryEmbed: function(template, options) {
            var defaults = {
                'api-key' : ImpactStory.key,
                'url' : ImpactStory.url,
                'templates': ImpactStory.templates,
                'preloaded': false, // Set to true if you are sure ImpactStory already has your item indexed. Setting this to true should make things faster.
                'doi' :    false,   // Can set a DOI
                'pmid' :   false,  // can set a pmid
                'item' :   false,  // can set an item in the form of {pmid: 12345} or ['pmid','12345']
                'id-type': "doi",   // Can set the type for the "id" field
                'id':      false,  // Can set an id
            }

            var options = $.extend(defaults, options);

            return this.each(function() {
               var item;
               var $container = $(this);
               var IS = new impactStory();

               // Data options in the element override the options passed or defauled
               for (var i in options) {
                 if ($container.data(i)) {
                   options[i] = $(this).data(i);
                 }
               }

               // Lots of ways to specify the id-type and id-value. Start by checking the "doi" and "pmid" values
               if (options.pmid) {
                 item = ['pmid', options.pmid];
               }
               else if (options.doi) {
                 item = ['doi', options.doi];
               }
               else if (options.item) {
                 item = options.item;
               }
               else {
                 item = [options['id-type'], options['id']];
               }

               // Set the key, url and templates
               IS.key = options['api-key'];
               IS.url = options['url'];
               IS.templates = options['templates'];

               if (options.preloaded) {
                 IS.getItem(item, function(data) {
                   IS.renderTemplate(template, data, function(markup) {
                     $container.html(markup);
                   });
                 });
               }
               else {
                 IS.addAndGetItem(item, function(data) {
                   IS.renderTemplate(template, data, function(markup) {
                     $container.html(markup);
                   });
                 });
               }
            });
        }
    });
})(jQuery);


/**
 * Automatically process all items with impactstory-embed-report and impactstory-embed-badges
 */
(function($){
  $(document).ready(function() {
    $('.impactstory-embed-report').ImpactStoryEmbed('report');

    //@@TODO
    //$('.impactstory-embed-report').ImpactStoryEmbed('badges');
  });
})(jQuery);

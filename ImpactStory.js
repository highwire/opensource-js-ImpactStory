var impactStory = {};

var jQuery = jQuery;

// This should be overriden. An error will be thrown if a key is not set.
impactStory.key = '';

// This may optionally be overriden if you want to use a different URL
impactStory.url = 'http://api.impactstory.org/v1/';

/**
 * Add an item
 *
 * @item:     key-value pairs. For example: ['pmid','12345'] or ['doi','10.1371/journal.pbio.1000056']
 *            You may also pass a hash object such as {pmid: 12345} or {doi: '10.1371/journal.pbio.1000056'}
 * @callback: Callback to be called when call finishes. function(data)
 * @error:    callback function to be called on error: functon(error)
 */
impactStory.addItem = function(item, callback, error) {
    if (!impactStory._checkKey()) return false;

    // Transform hash objects into arrays
    item = impactStory._arrayify(item);

    jQuery.ajax({
        url: "http://api.impactstory.org/v1/item/" + item[0] + "/" + item[1] + "?key=" + impactStory.key,
        type: 'POST',
    }).done(function () {
        callback();
    }).error(function (err) {
        if (error) {
            error(err);
        }
    });
}

/**
 * Get an item with ALM data
 *
 * @item:     key-value pair. For example: ['pmid','12345'] or ['doi','10.1371/journal.pbio.1000056']
 *            You may also pass a hash object such as {pmid: 12345} or {doi: '10.1371/journal.pbio.1000056'}
 * @callback: Callback to be called when call finishes. function(data)
 * @error:    callback function to be called on error: functon(error)
 */
impactStory.getItem = function(item, callback, error) {
    if (!impactStory._checkKey()) return false;
    
    // Transform hash objects into arrays
    item = impactStory._arrayify(item);
    
    jQuery.ajax({
        url: impactStory.url + "item/" + item[0] + "/" + item[1] + "?key=" + impactStory.key,
        type: "GET",
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        statusCode: {
            210: function(data){
                    //@@TODO: run partial callback stuff and deal with errors
                    //@@TODO: Respect conf.retry and conf.interval
                    setTimeout(function(){
                        impactStory.getItem(item, callback, error, conf)
                    }, 1000)
                },
            200: function(data) {
                    callback(data)
                }
        }
    });
}

/**
 * Add and then get ALM for an item
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
impactStory.addAndGetItem = function(item, callback, error, conf) {
    if (!impactStory._checkKey()) return false;

    impactStory.addItem(item, function() {
        impactStory.getItem(item, callback, error, conf);
    }, error);
}

/**
 * Get collection information (including all ALM data)
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
impactStory.getCollection = function(collection, callback, error, conf) {
    if (!impactStory._checkKey()) return false;

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
        url: impactStory.url + "collection/" + collectionId + '?key=' + impactStory.key,
        type: "GET",
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        statusCode: {
            210: function(data){
                    //@@TODO: run partial callback stuff and deal with errors
                    //@@TODO: Respect conf.retry and conf.interval
                    setTimeout(function(){
                        impactStory.getCollection(collection, callback, error, conf)
                    }, 1000)
                },
            200: function(data) {
                    callback(data)
                }
        }
    });
}

/**
 * Create a collection
 *
 * @aliases:  list of key-value pairs. For example: [['pmid','12345'],['doi','10.1371/journal.pbio.1000056']] 
 *            You may also pass an array of object hashes, for example [{pmid: 12345} , {doi: '10.1371/journal.pbio.1000056'}]
 * @title:    Title of collection
 * @callback: Callback to be called when the collection is done loading. function(data)
 * @error:    callback function to be called on error: functon(error)
 */
impactStory.createCollection = function(aliases, title, callback, error) {
    if (!impactStory._checkKey()) return false;
    
    // Transform all hash objects into arrays for POSTing
    for (var i in aliases) {
      aliases[i] = impactStory._arrayify(aliases[i]);
    }
    
    var postData = {
        'aliases' : aliases,
        'title': title
    };

    jQuery.ajax({
        url: impactStory.url + "collection?key=" + impactStory.key,
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
}

/**
 * Create and then get ALM for a collection
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
impactStory.createAndGetCollection = function(aliases, title, callback, error, conf) {
    if (!impactStory._checkKey()) return false;
    
    impactStory.createCollection(aliases, title, function(collection) {
        impactStory.getCollection(collection, callback, error, conf);
    }, error);
}

/**
 * Private function that checks for a valid key and alerts an error if there isn't one set.
 */
impactStory._checkKey = function() {
  if (impactStory.key === "") {
    alert('Please specify an Impact Story key by running `impactStory.key = "YOURKEY";` before calling any impactStory methods.');
    return false;
  }
  else {
    return true;
  }
}

/**
 * Private utlity function that transforms a hash object like {pmid: 12345} into an array like ['pmid','12345']
 */
impactStory._arrayify = function(item) {
  if (Array.isArray(item)) return item;
  
  if (typeof item === 'object') {
    for (var key in item) {
      return [key, item[key]];
    }
  }
  else {
    throw "impactStory error: items must be in the form of an array (eg. ['pmid','12345'] ) or a hash object (eg. {doi: '10.1371/journal.pbio.1000056'} .)";
    return false;
  }

}
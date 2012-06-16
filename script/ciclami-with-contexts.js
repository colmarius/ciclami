(function() {

  var root = this;

  var COUCH_URL  = 'http://ciclami.iriscouch.com/ciclami';
  var PHOTO_NAME = 'ciclami.jpeg';

  var DEFAULT = {
    HOME_PAGE       : 'home-web',
    MAP_CANVAS      : 'map_canvas_web',
    MAP_DRAGGABLE   : true,
    MAP_ZOOM        : 12,
    GPS_FREQUENCY   : 15000, // msec
    PICTURE_QUALITY : 50 // percent
  };

  var map              = null;
  var marker           = null;
  var markers          = [];
  var markerData       = {};
  var markerPosition   = null;
  var selectedMarkerId = null;
  var previousSelected = null;
  var posWatchId       = 0;
  var lastSavedImage   = '';
  var supportsTouch    = 'ontouchstart' in window;

  var CICLAMI = root.CICLAMI = {

    init: function(zoomLevel) {
      var self = this;
      var resizeTimer;
      $(window).resize(function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() { self.initScreen(); }, 100);
      });
      this.run(zoomLevel);
      this.initScreen();
      this.initHandlers();
      touchToContinue(DEFAULT.HOME_PAGE);
    },

    initHandlers: function() {
      $("a[href='#marker-detail']").live(supportsTouch ? 'tap' : 'click', this.updateResourceDetails);
    },

    run: function(zoomLevel) {
      function onSuccess(pos) {
        var position = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        if (map) map.panTo(position); 
        else self.gotoPosition(position, zoomLevel);
        self.findResources(function() { self.updateDisplay(); });
      }
      function onError(error) {
        alert('code: '    + error.code    + '\n' +
              'message: ' + error.message + '\n');
      }
      var self = this;
      navigator.geolocation.getCurrentPosition(onSuccess, onError,
      { enableHighAccuracy: true });
    },

    gotoPosition: function(position, zoomLevel) {
      var self = this;
      map = new google.maps.Map(document.getElementById(DEFAULT.MAP_CANVAS), {
        zoom: zoomLevel ? zoomLevel : DEFAULT.MAP_ZOOM,
        center: position,
        draggable: DEFAULT.MAP_DRAGGABLE,
        mapTypeControl: false,
        streetViewControl: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      });
      google.maps.event.addListener(map, 'idle', function() { self.onIdleMap(); });
    },

    onIdleMap: function() {
      var self = this;
      self.findResources(function() { self.updateDisplay(); });
    },

    initScreen: function() {
      $('#' + DEFAULT.MAP_CANVAS).height(
        document.body.clientHeight -
        $("#" + DEFAULT.HOME_PAGE + " div[data-role='header']").outerHeight() -
        $("#" + DEFAULT.HOME_PAGE + " div[data-role='footer']").outerHeight() - 30
      );
      if (map) google.maps.event.trigger(map, 'resize');
    },

    findResources: function(callback) {
      function getBoundBox(map) {
        var result, sw, ne, bounds = map.getBounds();
        if (bounds) {
          sw = bounds.getSouthWest();
          ne = bounds.getNorthEast();
          result = sw.lng() + ',' + sw.lat() + ',' + ne.lng() + ',' + ne.lat();
        }
        return result;
      }
      var self = this;
      var bbox = getBoundBox(map);
      if (bbox === undefined) this.resetMarkerNav();
      else
        $.ajax({
            url: COUCH_URL + '/_design/geo/_rewrite/data',
            dataType: 'jsonp',
            data: {'bbox': bbox},
            success: function(data) {
              self.processResourceSearch(data);
              if(callback) callback();
            }
        });
    },

    processResourceSearch: function(data) {
      function clearMarkers() {
        forEach(markers, function(marker) { marker.setMap(null); });
        markers = [];
      }
      var self = this;
      clearMarkers();
      if (data.features.length === 0) this.resetMarkerNav();
      forEach(data.features, function(doc) {
        var lat = doc.geometry.coordinates[1];
        var lng = doc.geometry.coordinates[0];
        var pos = new google.maps.LatLng(lat, lng);
        self.addMarker(pos, doc.properties);
      });
    },

    updateResourceDetails: function() {
      var marker = markerData[selectedMarkerId];
      if (marker) {
        $('#marker-detail .title').html(marker.title);
        $('#marker-detail .description').html(marker.description);
        $('#marker-detail .date').html((new Date(marker.date)).toDateString());
        var photoURL = COUCH_URL + '/' + selectedMarkerId + '/' + PHOTO_NAME;
        $('#marker-detail img.photo-container').attr('src', photoURL);
        if( document.body.clientWidth <= 400 ) {
          // On mobile device.
          $('#marker-detail img.photo-container').css({
            width:  '70%',
            height: '70%'
          });
        }
      }
    },
    
    addMarker: function(position, data) {
      var self   = this;
      var marker = new google.maps.Marker({
        position: position, 
        map:   map,
        title: data.title,
        id:    data._id,
        icon:  'style/images/marker-inactive.png'
      });
      markers.push(marker);
      markerData[data._id] = {
        date:  data.date,
        title: data.title || 'No title',
        description: data.description || 'No description'
      };
      google.maps.event.addListener(marker, 'click', function() {
        self.activateMarker(marker);
      });
    },

    activateMarker: function(marker) {
      function getIndex(marker) {        
        for (var i = 0, len = markers.length; i < len; i++) {
          if (markers[i] === marker) return i;
        }
        return -1;
      }
      $('#home-web .marker-nav .detail')
        .removeClass('ui-disabled')
        .find('.ui-btn-text')
        .html(marker.getTitle());
      selectedMarkerId = marker.id;
      this.updateMarkerNav(getIndex(marker));
    },

    updateMarkerNav: function(markerIndex) {        
      function enableIcon(marker) {
        if (marker) marker.setIcon('style/images/marker-active.png');
      }
      function disableIcon(marker) {
        if (marker) marker.setIcon('style/images/marker-inactive.png');
      }
      var self = this;
      if (previousSelected) disableIcon(markers[previousSelected]);
      enableIcon(markers[markerIndex]);
      var markerNav = $('#home-web .marker-nav');
      this.disableNavigation(markerNav);
      if (markerIndex < markers.length - 1)
        markerNav.find('a.right')
          .removeClass('ui-disabled')
          .bind('tap', function() { 
            self.activateMarker(markers[markerIndex + 1]);
          });
      if (markerIndex > 0)
        markerNav.find('a.left')
          .removeClass('ui-disabled')
          .bind('tap', function() {
            self.activateMarker(markers[markerIndex - 1]);
          });
      previousSelected = markerIndex;
    },
    
    sortMarkers: function() {
      markers.sort(function(first, second) {
        var a = first.getPosition();
        var b = second.getPosition();
        var result = b.lat() - a.lat();
        if (result === 0) result = a.lng() - b.lng();
        return result;
      });
    },
    
    disableNavigation: function(markerNav) {
      markerNav.find('a').unbind();
      markerNav.find('a.right').addClass('ui-disabled');
      markerNav.find('a.left').addClass('ui-disabled');
    },

    resetMarkerNav: function() {
      var markerNav = $('#home-web .marker-nav');
      this.disableNavigation(markerNav);
      markerNav.find('a.detail')
        .addClass('ui-disabled')
        .find('.ui-btn-text').html('Info');
    },

    updateDisplay: function() {
      this.sortMarkers();
      if (markers.length > 0) this.activateMarker(markers[markers.length - 1]);
    }

  };

  // Helper functions.

  function forEach(array, action) {
    for (var i = 0; i < array.length; i++)
      action(array[i]);
  }
  function navigateTo(pageId) {
    $.mobile.changePage($('#' + pageId), 'slide', true, true);
    $.mobile.hidePageLoadingMsg();
  }
  function touchToContinue(pageId) {
    $('#splash').tap(function() {
      $('#splash').hide();
      $('.noauth').removeClass('noauth');
      navigateTo(pageId);
    });
    $('#splash .hint').text('Touch to continue!');
  }
  function touchToExit(message) {
    $('#splash').tap(function() { exitApp(); });
    $('#splash .hint').text(message);
  }
  function exitApp() {
    navigator.app.exitApp();
  }

  //
  // Adding contexts.
  //

  var Android = new Cop.Context({ 
    name: 'Android',
    initialize: function() {
      function onDeviceReady() { Android.activate(); }
      document.addEventListener("deviceready", onDeviceReady, true);
    }
  });

  var Offline = new Cop.Context({
    name: 'Offline',
    initialize: function() {
      // On desktop.
      if (!navigator.onLine) this.activate();
      // On mobile: subscribe to Phonegap online/offline events.
      document.addEventListener('offline', function() { Offline.activate(); }, false); 
      document.addEventListener('online',  function() { Offline.deactivate(); }, false);
    }
  });

  // 
  // Adding adaptations.
  // 

  Offline.adapt(CICLAMI, Trait({

    init: function() {
      touchToExit('No network connection. Try again later.');
    }

  }));

  Offline.on("activate", function() {
    navigateTo('info');
    $('#info .hint').text('You gone offline! Try to restore network connection.');
  });

  Offline.on("deactivate", function() {
    navigateTo('info');
    $('#info .hint').text('Online again! Touch to continue.')
    $('#info').tap(function() {
      navigateTo(DEFAULT.HOME_PAGE);
      $(this).unbind('tap');
    });
  });

  Android.adapt(DEFAULT, Trait({

    HOME_PAGE     : 'home-mobile',
    MAP_CANVAS    : 'map_canvas_mobile',
    MAP_DRAGGABLE : false

  }));

  Android.adapt(CICLAMI, Trait({

    initHandlers: function() {
      var self = this;
      $('#exit-app-btn').tap(function() { 
        exitApp(); 
      });
      $('#take-photo-btn').tap(function() { 
        self.capturePhoto(); 
      });
      $('#upload-data-btn').tap(function() { 
        self.uploadData(); 
      });
      $('#home-mobile').live('pageshow', function() { 
        self.initScreen(); 
      });
      $('#upload-data').live('pagebeforeshow', function() { 
        self.clearFieldsUploadDataPage(); 
      });
      $('#options').live('pagehide', function() {
        self.setNewOptions();
      });
    },

    run: function(zoomLevel) {
      function onSuccess(pos) {
        var position = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        if (map) map.panTo(position); 
        else self.gotoPosition(position, zoomLevel);
      }
      function onError(error) {
        alert('code: '    + error.code    + '\n' +
              'message: ' + error.message + '\n');
      }
      var self = this;
      if(posWatchId !== 0)
        return;
      posWatchId = navigator.geolocation.watchPosition(onSuccess, onError, 
        { enableHighAccuracy: true,
          frequency: DEFAULT.GPS_FREQUENCY });
    },

    gotoPosition: function(position, zoomLevel) {
      // Call basic behavior.
      this._super.gotoPosition(position, zoomLevel);
      var icon = new google.maps.MarkerImage('style/images/marker-active.png',
        new google.maps.Size(64, 31),
        new google.maps.Point(0,0),
        new google.maps.Point(16, 31)
      );
      marker = new google.maps.Marker({
        position: position, 
        clickable: true,
        icon: icon,
        map: map 
      });
      google.maps.event.addListener(map, 'center_changed', this.onCenterChanged);
    },

    onIdleMap: function() {
      marker.setPosition(map.getCenter());
    },

    onCenterChanged: function() {
      window.setTimeout(function() {
        map.panTo(marker.getPosition());
      }, 200);
    },

    initScreen: function() {
      // Call basic behavior.
      this._super.initScreen();
      $('.crosshair').css('left', (document.body.clientWidth - 320) / 2 );
      $('.crosshair').css('top', (document.body.clientHeight - 200) / 2 );
      if (marker) map.panTo(marker.getPosition());
    },

    capturePhoto: function() {
      function camWin(imageData) {
        var image = document.getElementById('upload-photo');
        image.style.display = 'block';
        image.src = 'data:image/jpeg;base64,' + imageData;
        lastSavedImage = imageData || '';
        $('#upload-data').trigger('updatelayout');
      }
      function camFail(message) {
        alert('Failed because: ' + message);
      }
      navigator.camera.getPicture(camWin, camFail, {
        quality: DEFAULT.PICTURE_QUALITY,
        destinationType: Camera.DestinationType.DATA_URL 
      });
    },

    clearFieldsUploadDataPage: function() {
      markerPosition = marker.getPosition();
      $('input#addTitleField').val('');
      $('textarea#addDescriptionField').val('');
      var image = document.getElementById('upload-photo');
      if (image) {
        image.style.display = 'none';
        image.src = lastSavedImage = '';
      }
    },
    
    uploadData: function() {
      function makeDoc(options) {
        return {
          _attachments: {
            'ciclami.jpeg': {
              content_type: 'image/jpeg',
              data: options.imageData
            }
          },
          geometry: {
            type: 'Point',
            coordinates: [options.lng , options.lat]
          },
          date: (new Date()).getTime(),
          title: options.title,
          description: options.description
        };      
      }
      function uploadWin() {
        navigateTo('home-mobile');
        alert('Data uploaded successfully!');
      }
      function uploadFail() {
        navigateTo('home-mobile');
        alert('Failed to upload data!');
      }
      var title = $('input#addTitleField').val();
      var description = $('textarea#addDescriptionField').val();
      var doc = makeDoc({
        imageData: lastSavedImage, 
        lng: markerPosition.lng( ),
        lat: markerPosition.lat( ),
        title: title,
        description: description
      });
      $.mobile.showPageLoadingMsg();
      $.ajax({
        url: COUCH_URL,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(doc),
        success: uploadWin,
        error: uploadFail
      });
    },

    setNewOptions: function() {            
      var mapOptions = {
        draggable: false  
      };
      if($('select#draggable-map')[0].selectedIndex === 1) {
        mapOptions.draggable = true;
      }
      map.setOptions(mapOptions);
    }

  }));

  var contextManager = new Cop.ContextManager({
    contexts: [Android, Offline]
  });

  contextManager.resolveConflict(CICLAMI, [Android, Offline], 
    function(AndroidT, OfflineT) {
      return Trait.compose(OfflineT, 
        Trait.resolve({ init: undefined }, AndroidT));
  });

  contextManager.start();

}).call(this);
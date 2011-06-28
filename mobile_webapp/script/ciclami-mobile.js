// **CiclaMI** - "Monitoraggio piste ciclabili a Milano" made easy!
//
// This project, used to monitor the work in progress of the bicycle paths 
// in Milan area, has two main applications:
// 
// 1. A **mobile client**, found in directory `mobile_webapp`, runs on Android. 
//    As the name says it is a *webapp*, so it can be adapted to run on 
//    other mobile clients (e.g., iPhone, Blackberry.. see 
//    [Phonegap](http://www.phonegap.com)).
// 
// 2. A **web application**, found in directory `geo_couchapp`.
//
//    * *Couchapp*, because it is a [couchapp](http://couchapp.org/). Means that it
//      lives in [CouchDb](http://couchdb.apache.org/) - a document-oriented 
//      database from Apache that can be queried and indexed in a MapReduce 
//      fashion using JavaScript. 
//    * *Geo*, because it needs to be deployed on Couchdb with 
//      [Geocouch](https://github.com/couchbase/geocouch) extension. It also
//      defines the functions needed to obtain the data from the geocouch 
//      instance.
//
// Monitored bicycle paths can be found 
// [here](http://ciclami.iriscouch.com/ciclami/_design/geo/index.html)
//
// The [source for CiclaMI](https://github.com/colmarius/ciclami) is available 
// on GitHub.
//
// Third-party libraries used:
//
//  1. The *native look-and-feel* is handled by
//    [JQuery Mobile](http://www.jquerymobile.com) (Beta 1).
//
//  2. In order to obtain the *native application* and to access the *Android sensors* 
//    (like GPS, network connectivity and camera) we need
//    [Phonegap](http://www.phonegap.com) (version 0.9.5).
//
//  3. [Docco](http://jashkenas.github.com/docco/), a literate-programming-style 
//    documentation generator written in 
//    [CoffeeScript](http://jashkenas.github.com/coffee-script/),
//    is used to obtain this page when it runs against the main source file
//    (`mobile_webapp/script/ciclami-mobile.js`).

//
// #### Build Android Webapp
//
//		./build_android.sh

// #### Deploy Couchapp
//
//		cd geo_couchapp
//		couchapp push http://user:pass@your-couch.iriscouch.com/some-db

// #### Notes on Couchdb
//
//    You should consider getting *your own couch*, as
//    [Iris Couch](http://www.iriscouch.com) is hosting it for free.
//		Then you should change in both mobile and couchapp the following variable,
//    `COUCH_URL`, to something more appropriate like: 
//    **your-couch**.iriscouch.com/**some-db**

// #### Main Documentation
//
// Bellow is the documentation of the main Javascript file from the 
// *mobile webapp*. All application functionalities are implemented here.
//
// Note that both couchapp and mobile client are quite similar, as they share
// part of functionality and also part of the Javascript code.

// One variable lives in the global space.
CICLAMI = (function() {

    var DEFAULT_ZOOM = 17,
        DEFAULT_PICTURE_QUALITY = 50, // %
        DEFAULT_GPS_FREQUENCY = 15000, // msec
        COUCH_URL = "http://ciclami.iriscouch.com/ciclami";
    
    var map = null,
        marker = null,
        markerPosition = null,
        posWatchId = 0,
        lastSavedImage = '',
        zoomLevel;
    
    function run( zoomLevel, mockPosition ){
      // Check that the watch hasn't already been set up,
      // if it has then exit as we don't want two watches...
      if( posWatchId !== 0 ){
        return;
      }
      
      // If mock position, then use that instead.
      if( mockPosition ){
        gotoPosition( mockPosition, zoomLevel );           
      } 
      else{
        // Create the watch.
        posWatchId = navigator.geolocation.watchPosition(
          function( position ){
            var lat = position.coords.latitude,
                lng = position.coords.longitude;
            
            var pos = new google.maps.LatLng( lat, lng );
            if( map ) {
                map.panTo( pos );
            }
            else {
                gotoPosition( pos, zoomLevel );
            }
          }, 
          null,
          {
            enableHighAccuracy: true,
            frequency: DEFAULT_GPS_FREQUENCY
          });
      }
    }
    
    function gotoPosition( position, zoomLevel ){    
        // Define the required map options.
        var myOptions = {
          zoom: zoomLevel ? zoomLevel : DEFAULT_ZOOM,
          center: position,
          draggable: false,
          mapTypeControl: false,
          streetViewControl: false,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        // Initialise the map.
        map = new google.maps.Map(
          document.getElementById("map_canvas"),
          myOptions
        );
        
        var image = new google.maps.MarkerImage('style/images/marker-active.png',
          new google.maps.Size(64, 31),
          new google.maps.Point(0,0),
          new google.maps.Point(16, 31)
        );
        
        marker = new google.maps.Marker({
          position: position, 
          clickable: true,
          icon: image,
          map: map 
        });  
        
        // As the map center can change on multiple events like `dragend` and 
        // `resize`, listen for the `idle` map event. When it is triggered
        // set the marker position in the center of the map.
        google.maps.event.addListener( map, 'idle', function(){
          marker.setPosition( map.getCenter() );
        });
    }
    
    // Screen initialization called in a number of occasions:
    // 
    // * on the first initialization
    // * when orientation changes
    // * each time we navigate back to the main page, meaning the map page
    function initScreen()
    {
      markerPosition = ( marker === null  ? null : marker.getPosition( ) );
      
      // Size the map canvas to the height of the page less the header 
      // and footer.
      $('#map_canvas').height(
        document.body.clientHeight -
        $('#main div[data-role="header"]').outerHeight() -
        $('#main div[data-role="footer"]').outerHeight() - 30
      );
      
      // Center crosshair. 
      $('.crosshair').css( 'left', (document.body.clientWidth - 320) / 2 );
      $('.crosshair').css( 'top', (document.body.clientHeight - 200) / 2 );
      
      // As the div has changed size, we should trigger this event on the map.
      google.maps.event.trigger( map, 'resize' );

      // When orientation changes on mobile, we might end up with a different
      // map center. We use the previous stored marker position to force the 
      // map to pan there.
      if( markerPosition ){
        map.panTo( markerPosition );
      }  
    }
    
    function camWin( imageData ) 
    { 
      var image;
      lastSavedImage = imageData || '';
      
      image = document.getElementById( 'photo-container' );
      image.style.display = 'block';
      image.src = 'data:image/jpeg;base64,' + imageData;
    }
    
    function camFail( err ) 
    {
      alert( 'Failed to take picture!' );
    }
    
    function capturePhoto( ) 
    {
      navigator.camera.getPicture( camWin, camFail, {quality: DEFAULT_PICTURE_QUALITY} );
    }
    
    // From `spec` make the JSON document to be stored on Couchdb.
    function makeDoc( spec )
    {
      var doc = {
        "_attachments": {
          "ciclami.jpeg": {
            "content_type":"image/jpeg",
            "data": spec.imageData
          }
        },
        "geometry": {
          "type": "Point",
          "coordinates": [spec.lng , spec.lat]
        },
        "date": (new Date()).getTime(),
        "title": spec.title,
        "description": spec.description
      };      
      return doc;
    }
    
    // Used to navigate back to main page.
    function navigateTo( pageDivId, message ){
      $.mobile.changePage( $( pageDivId ), 'slide', true, true );
      $.mobile.hidePageLoadingMsg();
    }
    
    function uploadWin( ){
      navigateTo( '#main' );
      alert( 'Data uploaded successfully!' );
    }
    
    function uploadFail( ){
      navigateTo( '#main' );
      alert( 'Failed to upload data!' );
    }
    
    function uploadData()
    {
      var title       = $( 'input#addTitleField' ).val( ),
          description = $( 'textarea#addDescriptionField' ).val( ),
          doc = makeDoc({
            imageData: lastSavedImage, 
            lng: markerPosition.lng( ),
            lat: markerPosition.lat( ),
            title: title,
            description: description
          });
      
      $.mobile.showPageLoadingMsg();
      
      // Here we make an AJAX call to store the JSON document in Couchdb.
      $.ajax({
        url: COUCH_URL,
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify( doc ),
        success: uploadWin,
        error: uploadFail
      });
    }
    
    function checkNetworkConnectivity()
    {
      navigator.network.isReachable( "google.com", reachableCallback, {} );
    }

    function reachableCallback( reachability )
    {
      // Note: there is no consistency on the format of reachability.
      var networkState = reachability.code || reachability;
          hasNetwork = false;
          
      if( networkState !== NetworkStatus.NOT_REACHABLE ){
        hasNetwork = true;
      }
      
      $( 'body' ).trigger( 'network-checked', [hasNetwork] );
    }
    
    // Phonegap functionality called here to exit the application. 
    // Also clear cache, as it can easily grow since we are using Google maps.
    function exitApp( ) 
    { 
      App.prototype.clearHistory();
      App.prototype.clearCache();
      App.prototype.exitApp();
    }
    
    
    function isAndroid( ){
      if( navigator.userAgent.indexOf('Android') >= 0 ){
        return true;
      }
      return false;
    }

    // This functions will be exported.
    var module = {
      
        isAndroid: isAndroid,
  
        initScreen: initScreen,
        
        init: function( zoomLevel ){
            // As I am running on mobile, I might have no network connection.
            if( isAndroid( ) ){
              checkNetworkConnectivity();
            } else {
              // I run in browser too, for debug reasons.
              // On click hide the splash screen.
              $( '#splash' ).tap( function(){
                $( '#splash' ).hide( );
                $( '.noauth' ).removeClass( 'noauth' );
              });
              $( '#splash .hint' ).text( 'Touch to continue!' );
            }
            
            // Wait for network to connectivity to be checked.
            $( 'body' ).bind( 'network-checked', function( e, hasNetwork ){
              if( hasNetwork ){
                // Hide splash screen on tap.
                $( '#splash' ).tap( function(evt){
                  $( '#splash' ).hide( );
                  $( '.noauth' ).removeClass( 'noauth' );
                });
                $( '#splash .hint' ).text( 'Touch to continue!' );
              } else {
                // Notify user, and exit application on tap.
                $( '#splash' ).tap( function(){
                  exitApp();
                });
                $( '#splash .hint' ).text( 'No network connection. Try again later.' );
              }
            });
            
            // Implicitly triggered when device orientation changes.
            // We need to re-initialize the screen as it contains the map.
            var resizeTimer;
            $( window ).resize( function(){
              clearTimeout( resizeTimer );
              resizeTimer = setTimeout( initScreen, 100 );
            });
            
            $( "#exit-app-btn" ).tap( function(){
              exitApp( );
            });
            
            $( "#take-photo-btn" ).tap( function(){
              capturePhoto( );
            });
            
            // 
            $( "#upload-data-btn" ).tap( function(){
              uploadData( );
            });
            
            // Always refresh main page when we navigate back to it,
            // as it containts the map and needs to be rerendered.
            $( '#main' ).live( 'pageshow', function(){
              initScreen( );
            });
            
            // Before navigating to "Upload data" page..
            $( '#upload-data' ).live( 'pagebeforeshow', function(){
              var image;
              
              // Save marker position.
              markerPosition = marker.getPosition( );
              
              // Clear fields.
              $( 'input#addTitleField' ).val( '' );
              $( 'textarea#addDescriptionField' ).val( '' );
              image = document.getElementById( 'photo-container' );
              image.style.display = 'none';
              lastSavedImage = image.src ='';
            });
            
            // After navigating away from "Options" page..
            $( '#options' ).live( 'pagehide', function(evt, ui){            
              var mapOptions = {
                draggable: false  
              };
              
              // Check if *draggable map* option was activated.
              //
              // > **Note**: this is the only option implemented!
              //
              if( $( 'select#draggable-map' )[0].selectedIndex === 1 ){
                mapOptions.draggable = true;
              }
              
              map.setOptions( mapOptions );
            });
            
            // Run the app.
            run( zoomLevel );
          
            // Initialize the screen.
            initScreen( );
        },
        
        run: run
    };
    
    return module;
}( ));

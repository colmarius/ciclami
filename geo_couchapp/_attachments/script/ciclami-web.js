CICLAMI = (function() {
  
    var DEFAULT_ZOOM = 17,
        COUCH_URL = "http://ciclami.iriscouch.com/ciclami";
    
    var map = null,
        markers = [],
        markerData = {},
        currentMarkerId = '',
        posWatchId = 0,
        supportsTouch = 'ontouchstart' in window;
    
    function gotoPosition( position, zoomLevel ){
        
        var myOptions = {
            zoom: zoomLevel ? zoomLevel : DEFAULT_ZOOM,
            center: position,
            mapTypeControl: false,
            streetViewControl: false,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        CICLAMI.map = map = new google.maps.Map(
            document.getElementById("map_canvas"),
            myOptions);
        
        google.maps.event.addListener( map, 'idle', function(){
            findResources( function(){
                module.updateDisplay( );
            });
        });
    }
    
    function findResources( callback ){
        var bbox_str = bbox( map );        
        
        if( ! bbox_str ){
            resetMarkerNav( );
        } else {
            $.ajax({
                url: COUCH_URL + '/_design/geo/_rewrite/data',
                dataType: 'jsonp',
                data: {
                  "bbox": bbox_str
                },
                success: function( data ){
                  processResourceSearch( data );
                  if( callback ){
                    callback( );
                  }
                }
            });
        }
    }
    
    function processResourceSearch( data ){
        var doc, lat, lng, pos;
        
        clearMarkers();
        
        if( data.features.length === 0 ){
            resetMarkerNav( ); 
        }
                      
        for( var i = 0, len = data.features.length; i < len; i++ )
        {
            // Resources are JSON documents.
            doc = data.features[i];
            
            lat = doc.geometry.coordinates[1];
            lng = doc.geometry.coordinates[0];
            pos = new google.maps.LatLng( lat, lng );
            
            addMarker( pos, doc.properties );
        }
    }
    
    function updateResourceDetails( ){
        var photoURL,
            currentData = markerData[currentMarkerId];
        
        if( currentData ){           
            $('#marker-detail .title').html( currentData.title !== '' ? currentData.title : "No title" );
            $('#marker-detail .date').html( (new Date(currentData.date)).toDateString() );
            $('#marker-detail .description').html( currentData.description !== '' ? currentData.description : "No description" );
            
            photoURL =  COUCH_URL + '/' + currentMarkerId + '/ciclami.jpeg';
            
            $('#photo-container').attr( "src", photoURL );
            if( document.body.clientWidth <= 400 ) {
              // On mobile device.
              $('#photo-container').css( 'width', '80%' );
            }
        }
    }
    
    function addMarker( position, data ){
        var marker = new google.maps.Marker({
            position: position, 
            map: map,
            title: data.title,
            id: data._id,
            icon: 'image/marker-inactive.png'
        });
        
        // Save the marker content.
        markerData[data._id] = data;
        
        markers.push( marker );
        
        google.maps.event.addListener( marker, 'click', function(){
            activateMarker( marker );
        });
    }
    
    function activateMarker( marker ){
        for( var i = 0, len = markers.length; i < len; i++ ){
            markers[i].setIcon( 'style/images/marker-inactive.png' );
        }
        
        marker.setIcon( 'style/images/marker-active.png' );
            
        $( '#marker-nav a[href="#marker-detail"]' )
            .removeClass( 'ui-disabled' )
            .find( '.ui-btn-text' )
            .html( marker.getTitle() );
        
        // Store the current active marker id.
        currentMarkerId = marker.id;

        updateMarkerNav( getMarkerIndex(marker) );
    }
 
    function clearMarkers( ){
        for( var i = 0, len = markers.length; i < len; i++ ){
            markers[i].setMap( null );
        }
        markers = [];
    }
    
    function getMarkerIndex( marker ){        
        for( var i = 0, len = markers.length; i < len; i++ ){
            if( markers[i] === marker ){
                return i;
            }
        }
        return -1;
    }
    
    function sortMarkers( ){
        // Sort the markers from top to bottom, left to right
        // remembering that latitudes are less the further south we go.
        markers.sort( function( markerA, markerB ){
            var posA = markerA.getPosition( ),
                posB = markerB.getPosition( ),
                result = posB.lat( ) - posA.lat( );
                
            if( result === 0 ){
                result = posA.lng( ) - posB.lng( );
            }
            
            return result;
        });
    }
    
    function resetMarkerNav( ){
        var markerNav = $('#marker-nav');
        
        // Reset the disabled state for the images and unbind click events.
        markerNav.find( 'a' ).unbind( 'tap' );
        markerNav.find( 'a.right' ).addClass( 'ui-disabled' );
        markerNav.find( 'a.left' ).addClass( 'ui-disabled' );
        
        $( '#marker-nav a[href="#marker-detail"]' )
            .addClass( 'ui-disabled' )
            .find( '.ui-btn-text' ).html( "Info" );
    }
    
    function updateMarkerNav( markerIndex ){        
        
        // FIXME:       Navigation Bug
        // Description: When clicking on "Next" and "Previous" buttons
        //              only the first and last markers get selected.
        
        // console.log( "Updating marker index: " + markerIndex );
        
        var markerNav = $('#marker-nav');
        
        // Reset the disabled state for the images and unbind click events.
        markerNav.find( 'a' ).unbind( 'tap' );
        markerNav.find( 'a.right' ).addClass( 'ui-disabled' );
        markerNav.find( 'a.left' ).addClass( 'ui-disabled' );
            
        // If we have more markers at the end of the array, 
        // then update the marker state.
        if( markerIndex < markers.length - 1 ){
            markerNav.find( 'a.right' )
                .removeClass( 'ui-disabled' )
                .bind( 'tap', function(){
                    activateMarker( markers[markerIndex + 1] );
                });
        }
        
        if( markerIndex > 0 ){
            markerNav.find( 'a.left' )
                .removeClass( 'ui-disabled' )
                .bind( 'tap', function(){
                    activateMarker( markers[markerIndex - 1] );
                });
        }
    }
    
    function bbox( map ){
        var sw, ne, ret,
            bounds = map.getBounds( );
            
        if( bounds ){
          sw = bounds.getSouthWest( );
          ne = bounds.getNorthEast( );
          ret = sw.lng( ) + "," + sw.lat( ) + "," + ne.lng( ) + "," + ne.lat( );
        }
        return ret;
    }
    
    function initScreen( ){

        $('#map_canvas').height(
          document.body.clientHeight -
          $('#main div[data-role="header"]').outerHeight() -
          $('#main div[data-role="footer"]').outerHeight() - 30
        );
        
        // Remember this! (from Google Maps API Reference)
        // "Developers should trigger this event on the map 
        //  when the div changes size" 
        google.maps.event.trigger( map, 'resize' );
    }
    
    function run( zoomLevel, mockPosition ){
        // If mock position, then use it.
        if( mockPosition ){
            gotoPosition( mockPosition, zoomLevel );
            findResources( function(){
                module.updateDisplay( );
            });
        }
        else {
            navigator.geolocation.getCurrentPosition(
                function( position ){
                    var pos = new google.maps.LatLng(
                        position.coords.latitude, 
                        position.coords.longitude);

                    if( map ){
                        map.panTo( pos );
                    }
                    else {
                        gotoPosition( pos, zoomLevel );
                    }

                    findResources( function(){
                        module.updateDisplay( );
                    });
                }, 
                null,
                {
                    enableHighAccuracy: true
                });
        }
    }
    
    var module = {
        findResources: findResources,
        
        init: function( zoomLevel ){
            var resizeTimer;
            $( window ).resize( function(){
              clearTimeout( resizeTimer );
              resizeTimer = setTimeout( initScreen, 100 );
            });
            
            $('a[href="#marker-detail"]').live( supportsTouch ? 'tap' : 'click', 
                                                updateResourceDetails );
            
            run( zoomLevel );
            
            initScreen( );
        },
        
        run: run,
        
        updateDisplay: function() {

            var firstMarker = ( markers.length > 0 ? markers[0] : null );
            
            sortMarkers( );

            if( firstMarker ){
                activateMarker( firstMarker );
            }
            
            //$.mobile.silentScroll( 1 );
        }
    };
    
    return module;
})();
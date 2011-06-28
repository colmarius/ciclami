/**
 * A simple spatial view that emits GeoJSON if your lat/long are stored as invidivual keys called "lat" and "long"
 */
function(doc){
	if(doc.lat && doc.long){
    var geometry = {type: "Point", coordinates: [doc.long, doc.lat]};
		emit(geometry, {
			id: doc._id,
			geometry: geometry		
		});
	}
}

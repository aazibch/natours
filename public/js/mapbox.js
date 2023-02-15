export const displayMap = (locations) => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiYWF6aWJjaCIsImEiOiJja2Fjd2VnZnAxNDNnMnlydTE1bTY4YXZpIn0.rq9Cl4wLsBQkIGwRoCZxkQ';

    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/aazibch/ckacwtsle05ua1impgxm6v5j5',
        scrollZoom: false
    });

    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach(loc => {
        // Create marker
        const el = document.createElement('div');
        el.className = 'marker';

        // Add marker
        new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        })
            .setLngLat(loc.coordinates)
            .addTo(map);

        // Add popup
        new mapboxgl.Popup({
            offset: 30
        })
            .setLngLat(loc.coordinates)
            .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
            .addTo(map);

        // Extend the map bounds to include current location
        bounds.extend(loc.coordinates);
    });

    map.fitBounds(bounds, {
        padding: {
            top: 150,
            bottom: 150,
            left: 100,
            right: 100
        }
    });
}
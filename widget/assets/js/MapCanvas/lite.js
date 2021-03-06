        var esriMap = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: 'Esri',
                    minZoom: 0,
                    maxZoom: 20,
                });

        var osmMap = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {  
            attribution: 'OpenStreetMap',
            minZoom: 0,
            maxZoom: 20,
        });

        var hereMap = L.tileLayer('http://{s}.{base}.maps.cit.api.here.com/maptile/2.1/maptile/{mapID}/satellite.day/{z}/{x}/{y}/256/png8?app_id={app_id}&app_code={app_code}', {
            attribution: 'Here',
            subdomains: '1234',
            mapID: 'newest',
            app_id: 'DemoAppId01082013GAL',
            app_code: 'AJKnXv84fjrb0KIHawS0Tg',
            base: 'aerial',
            minZoom: 0,
            maxZoom: 20,
        });

        var baseMaps = {
            'Esri': esriMap,
            'Osm': osmMap,
            'Here': hereMap,
        };

        var map = L.map('map', {fullscreenControl: true,  layers: [hereMap]}).setView([lat_map_canvas1234, lon_map_canvas1234], zoom_level_map_canvas1234);

        var options = {
           key: '873e91818a81770ead632470f0ba9325',
           limit: 10
        };

        layercontrol = L.control.layers(baseMaps).addTo(map);
        
        L.control.scale().addTo(map);

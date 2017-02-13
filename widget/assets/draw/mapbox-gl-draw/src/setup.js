var events = require('./events');
var Store = require('./store');
var ui = require('./ui');

module.exports = function(ctx) {

  ctx.events = events(ctx);

  ctx.map = null;
  ctx.container = null;
  ctx.store = null;
  ui(ctx);

  var setup = {
    addTo: function(map) {
        ctx.map = map;
        setup.onAdd(map);
        return this;
    },
    remove: function() {
      setup.removeLayers();
      ctx.ui.removeButtons();
      ctx.events.removeEventListeners();
      ctx.map = null;
      ctx.container = null;
      ctx.store = null;
      return this;
    },
    onAdd: function(map) {
      ctx.container = map.getContainer();
      ctx.store = new Store(ctx);

      ctx.ui.addButtons();

      if (map.style.loaded()) { // not public
        ctx.events.addEventListeners();
        setup.addLayers();
      } else {
        map.on('load', () => {
          ctx.events.addEventListeners();
          setup.addLayers();
        });
      }
    },
    addLayers: function() {
      // drawn features style
      ctx.map.addSource('mapbox-gl-draw-cold', {
        data: {
          type: 'FeatureCollection',
          features: []
        },
        type: 'geojson'
      });

      // hot features style
      ctx.map.addSource('mapbox-gl-draw-hot', {
        data: {
          type: 'FeatureCollection',
          features: []
        },
        type: 'geojson'
      });

      ctx.options.styles.forEach(style => {
        ctx.map.addLayer(style);
      });

      ctx.store.render();
    },
    removeLayers: function() {
      ctx.options.styles.forEach(style => {
        ctx.map.removeLayer(style.id);
      });

      ctx.map.removeSource('mapbox-gl-draw-cold');
      ctx.map.removeSource('mapbox-gl-draw-hot');
    }
  };

  return setup;
};

import test from 'tape';
import mapboxgl from 'mapbox-gl-js-mock';
import GLDraw from '../';
import { accessToken, createMap, features, click } from './utils';

var feature = features.line;

mapboxgl.accessToken = accessToken;

var map = createMap();

test('Line draw class', function lineDrawClass(t){
  var Draw = GLDraw();
  map.addControl(Draw);

  Draw.changeMode('draw_line_string');

  let coords = feature.geometry.coordinates;

  for (var i = 0; i < coords.length; i++) {
    let c = coords[i];

    click(map, {
      lngLat: {
        lng: c[0],
        lat: c[1]
      }
    });
  }

  // complete drawing
  map.fire('keyup', {
    keyCode: 13
  });

  Draw.remove();
  t.end();
});

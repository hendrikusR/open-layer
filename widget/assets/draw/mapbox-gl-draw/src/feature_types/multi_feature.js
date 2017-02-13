var Feature = require('./feature');

var models = {
  'MultiPoint': require('./point'),
  'MultiLineString': require('./line_string'),
  'MultiPolygon': require('./polygon')
};

let takeAction = (features, action, path, lng, lat) => {
  var parts = path.split('.');
  var idx = parseInt(parts[0], 10);
  var tail = parts.slice(1).join('.');
  return features[idx][action](tail, lng, lat);
};

var MultiFeature = function(ctx, geojson) {
  Feature.call(this, ctx, geojson);

  delete this.coordinates;
  this.model = models[geojson.geometry.type];
  if (this.model === undefined) throw new TypeError(`${geojson.geometry.type} is not a valid type`);
  this.features = this.coordinatesToFeatures(geojson.geometry.coordinates);
};

MultiFeature.prototype = Object.create(Feature.prototype);

MultiFeature.prototype.coordinatesToFeatures = function(coordinates) {
  return coordinates.map(coords => new this.model(this.ctx, {
    id: this.id,
    type: 'Feature',
    properties: {},
    geometry: {
      coordinates: coords,
      type: this.type.replace('Multi', '')
    }
  }));
};

MultiFeature.prototype.isValid = function() {
  return this.features.every(f => f.isValid());
};

MultiFeature.prototype.setCoordinates = function(coords) {
  this.features = this.coordinatesToFeatures(coords);
  this.changed();
};

MultiFeature.prototype.getCoordinate = function(path) {
  return takeAction(this.features, 'getCoordinate', path);
};

MultiFeature.prototype.getCoordinates = function() {
  return JSON.parse(JSON.stringify(this.features.map(f => f.type === 'Polygon' ? f.getCoordinates() : f.coordinates)));
};

MultiFeature.prototype.updateCoordinate = function(path, lng, lat) {
  takeAction(this.features, 'updateCoordinate', path, lng, lat);
};

MultiFeature.prototype.addCoordinate = function(path, lng, lat) {
  takeAction(this.features, 'addCoordinate', path, lng, lat);
};

MultiFeature.prototype.removeCoordinate = function(path) {
  takeAction(this.features, 'removeCoordinate', path);
};

module.exports = MultiFeature;

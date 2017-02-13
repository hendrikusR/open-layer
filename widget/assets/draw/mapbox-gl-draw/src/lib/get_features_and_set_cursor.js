var featuresAt = require('./features_at');

module.exports = function getFeatureAtAndSetCursors(event, ctx) {
  var features = featuresAt(event, ctx);

  if (features[0]) {
    ctx.ui.setClass({
      feature: features[0].properties.meta,
      mouse: 'hover'
    });
  }
  else {
    ctx.ui.setClass({
      mouse: 'none'
    });
  }

  return features[0];
};

<?php

/* @var $this yii\web\View */
use yii\web\view;
use app\components\MapCanvas;

$this->title = 'My Yii Application';
?>
<div class="site-index">

    <?= app\widget\MapCanvas::widget([
        "id" => "",
        "options" => [
            "library-js" => "openlayers",
            "setView"=> "-2, 117",
            "setZoom"=> "5",
            "height" => "450px",
            "width" => "100%",
            //'draw'  => TRUE
        ]
    ]);?>


    </div>
</div>
<?php
$script = "

    var image = new ol.style.Circle({
        radius: 5,
        fill: null,
        stroke: new ol.style.Stroke({color: 'red', width: 10})
    });


    var styles = {
        'Point': new ol.style.Style({
            image: image,

        })
    };


    var styleFunction = function(feature) {
        return styles[feature.getGeometry().getType()];
    };

    var geojsonObject = {
        'type': 'FeatureCollection',
        'crs': {
            'type': 'name',
            'properties': {
                'name': 'EPSG:4326'
            }
        },
        'features': [
            {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'Point',
                    'coordinates': [
                     4e6,-2e6
                    ]
                }
            }
        ]
    };

    var vectorSource = new ol.source.Vector({
        features: (new ol.format.GeoJSON()).readFeatures(geojsonObject)
    });

    vectorSource.addFeature(new ol.Feature(new ol.geom.Circle([5e6, 7e6], 1e6)));

    var vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        style: styleFunction
    });


    var view = map.getView();


    map.addControl(new bukapeta.ol.BasemapProvider({
        default : ['mapbox','streets-basic'],
        apikey : {
            mapbox : 'pk.eyJ1IjoiLWhhYmliLSIsImEiOiJjaWdjbmpsZzE0MXM3dmptM3NzN292NWVhIn0.AfZ7s3jnuqK-2nPzbfl7IA',
        },
        preset : ['all']
    }));

    map.addLayer(vectorLayer);




";
$this->registerJsFile('/web/js/bukapeta-ol.js',[/*'depends'=> ['\yii\web\JqueryAsset'],*/'position'=>\yii\web\View::POS_END]);
$this->registerJs($script, View::POS_END)?>

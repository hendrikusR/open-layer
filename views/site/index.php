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
                'name': 'EPSG:3857'
            }
        },
        'features': [
            {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'Point',
                    'coordinates': [
                        106.8310546875,
                        -6.18424616128059
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

    map = new ol.Map({

        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            vectorLayer
        ],
        view: new ol.View({
            projection: ol.proj.get('EPSG:3857'),
            center: ol.proj.transform([117, -2], 'EPSG:4326', 'EPSG:3857'),
            zoom: 4,
        })
    });




";
$this->registerJsFile('/web/js/bukapeta-ol.js',[/*'depends'=> ['\yii\web\JqueryAsset'],*/'position'=>\yii\web\View::POS_END]);
$this->registerJs($script, View::POS_END)?>

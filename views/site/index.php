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


    var raster = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    var wkt = '$data_replace';

    console.log(wkt);
    var format = new ol.format.WKT();

    var feature = format.readFeature(wkt, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
    });

    var vector = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [feature]
        })
    });

    var view = map.getView();

    map.addControl(new bukapeta.ol.BasemapProvider({
        default : ['mapbox','streets-basic'],
        apikey : {
            mapbox : 'pk.eyJ1IjoiLWhhYmliLSIsImEiOiJjaWdjbmpsZzE0MXM3dmptM3NzN292NWVhIn0.AfZ7s3jnuqK-2nPzbfl7IA',
        },
        preset : ['all']
    }));

    map.addLayer(vector);




";
$this->registerJsFile('/web/js/bukapeta-ol.js',[/*'depends'=> ['\yii\web\JqueryAsset'],*/'position'=>\yii\web\View::POS_END]);
$this->registerJs($script, View::POS_END)?>

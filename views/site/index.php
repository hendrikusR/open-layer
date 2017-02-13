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
            // "height" => "40%",
            "width" => "100%"
        ]
    ]);?>


    </div>
</div>
<?php
$script = '

var view = map.getView();

map.addControl(new bukapeta.ol.BasemapProvider({
    default : ["mapbox","streets-basic"],
    apikey : {
        mapbox : "pk.eyJ1IjoiLWhhYmliLSIsImEiOiJjaWdjbmpsZzE0MXM3dmptM3NzN292NWVhIn0.AfZ7s3jnuqK-2nPzbfl7IA",
    },
    preset : ["all"]
}));

mapModal = new ol.Map({
    //target: "mapModal",
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    view: new ol.View({
        projection: ol.proj.get("EPSG:3857"),
        center: ol.proj.transform([117, -2], "EPSG:4326", "EPSG:3857"),
        zoom: 4,
    })
});


';

$this->registerJs($script, View::POS_END)?>

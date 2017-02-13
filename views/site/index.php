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
            "width" => "100%",
            'draw'  => TRUE
        ]
    ]);?>

    <label>Geometry type &nbsp;</label>
    <select id="type">
        <option value="Point">Point</option>
        <option value="LineString">LineString</option>
        <option value="Polygon">Polygon</option>
        <option value="Circle">Circle</option>
        <option value="None">None</option>
    </select>


    </div>
</div>
<?php
$script = '


var view = map.getView();


    var raster = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    var source = new ol.source.Vector({wrapX: false});

    var vector = new ol.layer.Vector({
        source: source
    });

    map.addControl(new bukapeta.ol.BasemapProvider({
        default : ["mapbox","streets-basic"],
        apikey : {
            mapbox : "pk.eyJ1IjoiLWhhYmliLSIsImEiOiJjaWdjbmpsZzE0MXM3dmptM3NzN292NWVhIn0.AfZ7s3jnuqK-2nPzbfl7IA",
        },
        preset : ["all"]
    }));

    mapModal = new ol.Map({
    //target: "mapModal",
    layers: [raster, vector],
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            })
        ],

    });

    var typeSelect = document.getElementById("type");

    var draw;

    function addInteraction() {
        var value = typeSelect.value;
        
        if(value !== "None") {
            draw = new ol.interaction.Draw({
                source : source,
                type : (typeSelect.value)
            });
            map.addInteraction(draw);
        }
    }

    typeSelect.onchange = function() {
        map.removeInteraction(draw);
        addInteraction();
    };

    addInteraction();




';
$this->registerJsFile('/web/js/bukapeta-ol.js',[/*'depends'=> ['\yii\web\JqueryAsset'],*/'position'=>\yii\web\View::POS_END]);
$this->registerJs($script, View::POS_END)?>

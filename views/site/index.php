<?php

/* @var $this yii\web\View */
use yii\web\view;
use yii\helpers\Url;
use app\components\MapCanvas;

$this->title = 'My Yii Application';



?>
<div class="site-index">

    <?= app\widget\MapCanvas::widget([
        "id" => "",
        "options" => [
            "library-js" => "openlayers",
            "setView"=> "-2, 117",
            "setZoom"=> "6",
            "height" => "100%",
            "width" => "100%",
            //'draw'  => TRUE
        ]
    ]);?>


    </div>
</div>
<?php
$data_provinsi = Url::to(['site/peta']);



$script = <<<JAVASCRIPT


    var view = map.getView();

    map.addControl(new bukapeta.ol.BasemapProvider({
        default : ["mapbox","streets-basic"],
        apikey : {
            mapbox : "pk.eyJ1IjoiLWhhYmliLSIsImEiOiJjaWdjbmpsZzE0MXM3dmptM3NzN292NWVhIn0.AfZ7s3jnuqK-2nPzbfl7IA",
        },
        preset : ["all"]
    }));

    $.ajax({type: "GET",url: "{$data_provinsi}", dataType: "json", success: function(resp) {
        if (resp.error) {
            console.log(resp.error.message);
        } else {
            var format = new ol.format.WKT();
            var vectorSource = new ol.source.Vector({});
            for (i = 0; i < resp.length; i++) {
                $.ajax({type: "GET",url: "{$data_provinsi}", dataType: "json", success: function(respon) {
                    if (respon.error) {
                        console.log(respon.error.message);
                    } else {
                        var feature = format.readFeature(respon[0]["wkt"], {
                            dataProjection: "EPSG:3857",
                            featureProjection: "EPSG:3857"
                        });                        
                    }
                }});
            }
            var vector = new ol.layer.Vector({
                source: vectorSource,
                
            });
            map.addLayer(vector);
        }
    }});




JAVASCRIPT;
$this->registerJsFile('/web/js/bukapeta-ol.js',[/*'depends'=> ['\yii\web\JqueryAsset'],*/'position'=>\yii\web\View::POS_END]);
$this->registerJs($script, View::POS_END)?>

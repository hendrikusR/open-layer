<?php

/**
 * @copyright Copyright (c) 2015 PT. Buka Media Teknologi
 * @license http://www.bukapeta.com/license/
 * @link http://www.bukapeta.com/dokumentasi/
 */

/**
 * Display map canvas with leaflet, openlayers or mapboxgl javascipt library
 *
 * How to use:
 * <?= app\widget\MapCanvas::widget();?>
 *
 * or Call with assign params
 * <?= app\widget\MapCanvas::widget([
 *      'options' => [
 *          'library-js' => 'leaflet',
 *          'width' => '100',
 *          'height' => '350',
 *          'setView'=> '-2, 125',
 *          'setZoom'=> '4'
 *      ]
 *   ]);?>
 */

namespace app\widget;

use Yii;
use yii\web\View;
use app\widget\AssetBundle;

/**
 * Create app\widgets\MapCanvas
 */
class MapCanvas extends \yii\base\Widget
{

    public $id;

	public $options = [];

    public function run()
    {
        echo "<div id='map".$this->id."' style='width: ".$this->options['width']."; height: ".$this->options['height'].";'></div><div id='sidebar'></div>";
    }

    /**
     * Initializes the widget
     * @throws InvalidConfigException
     */
    public function init()
    {
        if(!isset($this->id)){
            $this->id = $this->getId();
        }

        if(empty($this->options['width'])){
            $this->options['width'] = '100%';
        }

        if (empty($this->options['height'])) {
            $this->options['height'] = '100%';
        }

        if (empty($this->options['draw'])) {
            $this->options['draw'] = FALSE;
        }

        $this->registerAssets();

        parent::init();
    }

    /**
     * Registers the needed assets
     */
    public function registerAssets()
    {

        if (empty($this->options['library-js'])) {
            $this->options['library-js'] = 'leaflet';
        }

        if (empty($this->options['setView'])) {
            $this->options['setView'] = '-2, 117';
        }

        if (empty($this->options['setZoom'])) {
            $this->options['setZoom'] = '4';
        }

        /* Memecah string menjadi array */
        $setView            = explode(",", $this->options['setView']);

        /***
         * zoom_canvas_level STRING
         * Untuk parameter zoom
         ***/
        $zoom_canvas_level  =  $this->options['setZoom'];

        /***
         * lat NUMBER
         * Untuk parameter coordinate lattitude
         ***/
        $lat                = $setView[0];

        /***
         * lon NUMBER
         * Untuk parameter coordinate longitude
         ***/
        $lon                = $setView[1];

        /***
         * options STRING
         * Untuk mengirim parameter lat, lon dan zoom ke base.js pada bahasa javascript
         ***/
        $options            ="
            var lat_map_canvas1234          = $lat;
            var lon_map_canvas1234          = $lon;
            var zoom_level_map_canvas1234   = $zoom_canvas_level;
        ";

        $view = $this->getView();

        $view->registerJs($options,View::POS_HEAD);


        if (empty($this->options['library-js']) || $this->options['library-js'] === 'leaflet' || $this->options['library-js'] === 'Leaflet') {

            MapCanvasLeafletAsset::register($view);

        }

        if ($this->options['library-js'] === 'openlayers' || $this->options['library-js'] === 'openlayer' || $this->options['library-js'] === 'Openlayers' || $this->options['library-js'] === 'Openlayer' || $this->options['library-js'] === 'OpenLayer' || $this->options['library-js'] === 'OpenLayers') {

            MapCanvasOpenlayersAsset::register($view);

            $this->ScriptOpenlayers();

        }

		if ($this->options['library-js'] === 'mapbox' || $this->options['library-js'] === 'Mapbox' || $this->options['library-js'] === 'MapBox' || $this->options['library-js'] === 'mapboxgl' || $this->options['library-js'] === 'MapboxGL') {

            MapCanvasMapboxGLAsset::register($view);

			      $this->ScriptMapboxGL();

            if ($this->options['draw'] === TRUE) {
                MapCanvasMapboxGLdrawAsset::register($view);
                $this->ScriptMapboxGLdraw();
            }
		}

    }

    public function ScriptMapboxGLdraw(){
        $view = $this->getView();

        $view->registerJs("



        ", \yii\web\View::POS_END);
    }

	public function ScriptMapboxGL(){
        /***
         * Script dasar MapboxGL
         ***/

        $setView = explode(",", $this->options['setView']);

        $view = $this->getView();

        $view->registerJs("
    			mapboxgl.accessToken = 'pk.eyJ1IjoiLWhhYmliLSIsImEiOiJjaWdjbmpsZzE0MXM3dmptM3NzN292NWVhIn0.AfZ7s3jnuqK-2nPzbfl7IA';
    			var map".$this->id." = new mapboxgl.Map({
    				container: 'map".$this->id."', // container id
    				style: 'mapbox://styles/mapbox/streets-v8', //stylesheet location
    				center: [" . $setView[1] . ", " . $setView[0] . "], // starting position
    				zoom: ". $this->options['setZoom'] ." // starting zoom
    			});
    		", \yii\web\View::POS_END);

    }

    public function ScriptOpenlayers(){
        /***
         * Script dasar openlayers
         ***/

        $setView = explode(",", $this->options['setView']);

        $view = $this->getView();

        $view->registerJs("

        var map".$this->id." = new ol.Map({
            target: 'map".$this->id."',
            view: new ol.View({
                projection: ol.proj.get('EPSG:3857'),
                center: ol.proj.transform([" . $setView[1] . ", " . $setView[0] . "], 'EPSG:4326', 'EPSG:3857'),
                zoom: " . $this->options['setZoom'] . ",
            })
        });

        ", \yii\web\View::POS_END);

    }
}

<?php

namespace app\widget;

use Yii;
use yii\web\View;
use app\widget\AssetBundle;

class MapCanvasLeafletAsset extends AssetBundle
{
    public function init()
    {
        $this->jsOptions['position'] = View::POS_END;

        $this->setSourcePath('@app/widget/assets');

        $this->setupAssets('css', [
            'css/MapCanvas/leaflet',
            'css/MapCanvas/L.Control.OpenCageData.Search.min',
            'css/MapCanvas/easyPrint',
            'css/MapCanvas/leaflet.fullscreen',
            'css/MapCanvas/opencage',
            'css/MapCanvas/minimap',
            'css/MapCanvas/measure',
            'css/MapCanvas/MarkerCluster',
            'css/MapCanvas/MarkerCluster.Default',
            'css/MapCanvas/leaflet-sidebar'
        ]);

        $this->setupAssets('js', [
            'js/MapCanvas/leaflet',
            'js/MapCanvas/leaflet-src',
            'js/MapCanvas/Leaflet-fullscreen',
            'js/MapCanvas/geocoder',
            'js/MapCanvas/geocoder.min',
            'js/MapCanvas/jQuery.print',
            'js/MapCanvas/leaflet.easyPrint',
            'js/MapCanvas/utf',
            'js/MapCanvas/minimap',
            'js/MapCanvas/measure',
            'js/MapCanvas/leaflet.markercluster-src',
            'js/MapCanvas/leaflet-sidebar',
            'js/MapCanvas/base',
        ]);

        parent::init();
    }
}
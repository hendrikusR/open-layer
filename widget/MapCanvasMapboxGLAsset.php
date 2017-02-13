<?php

namespace app\widget;

use Yii;
use yii\web\View;
use app\widget\AssetBundle;

class MapCanvasMapboxGLAsset extends AssetBundle
{
    public function init()
    {
        $this->jsOptions['position'] = View::POS_END;

        $this->setSourcePath('@app/widget/assets');

        $this->setupAssets('css', [
            'css/MapCanvas/mapboxgl',
            'css/MapCanvas/mapboxgl-geocoder',
        ]);

        $this->setupAssets('js', [
            'js/MapCanvas/mapboxgl',
            'js/MapCanvas/mapboxgl-geocoder',
        ]);

        parent::init();
    }
}

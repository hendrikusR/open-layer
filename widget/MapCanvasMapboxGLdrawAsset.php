<?php

namespace app\widget;

use Yii;
use yii\web\View;
use app\widget\AssetBundle;

class MapCanvasMapboxGLdrawAsset extends AssetBundle
{
    public function init()
    {
        $this->jsOptions['position'] = View::POS_END;

        $this->setSourcePath('@app/widget/assets');

        $this->setupAssets('css', [
            'draw/mapbox-gl-draw/dist/mapbox-gl-draw'
        ]);

        $this->setupAssets('js', [
            'draw/mapbox-gl-draw/dist/mapbox-gl-draw'
        ]);

        parent::init();
    }
}

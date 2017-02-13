<?php

namespace app\widget;

use Yii;
use yii\web\View;
use app\widget\AssetBundle;

class MapCanvasOpenlayersAsset extends AssetBundle
{
    public function init()
    {
        $this->jsOptions['position'] = View::POS_HEAD;

        $this->setSourcePath('@app/widget/assets');

        $this->setupAssets('css', [
        	'css/MapCanvas/ol',
            'css/MapCanvas/bukapeta-ol'
        ]);

		if (YII_ENV_DEV) {
            $this->setupAssets('js', [
               'js/MapCanvas/ol-debug',
               'js/MapCanvas/bukapeta-ol'
            ]);
        } else {
            $this->setupAssets('js', [
                'js/MapCanvas/ol',
                'js/MapCanvas/bukapeta-ol'
            ]);
        }
        
        parent::init();
    }
}

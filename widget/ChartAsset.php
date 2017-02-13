<?php

namespace app\widget;

use Yii;
use yii\web\View;
use app\widget\AssetBundle;

class ChartAsset extends AssetBundle
{
    public function init()
    {
        $this->jsOptions['position'] = View::POS_END;

        $this->setSourcePath('@app/widget/assets/js/chart');

        $this->setupAssets('js', [
            'chart',
        ]);

        parent::init();
    }
}

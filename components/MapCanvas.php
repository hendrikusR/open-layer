<?php

namespace app\components;

use Yii;
use yii\base\Widget;
use yii\helpers\Html;
use app\components\AssetBundle;


class MapCanvas extends Widget
{
    public $options = [];

    public function init()
    {
        parent::init();

        if(empty($this->options['width'] == null)){
            $this->options['width'] = '300px';
        }

        if(empty($this->options['height'] == null)){
            $this->options['height'] = '300px';
        }
    }

    public function run()
    {
        echo '<div class="jumbotron">Tes</div>';
    }
}

<?php

namespace app\widget;

use Yii;
use yii\web\View;
use yii\helpers\Url;
use app\widget\AssetBundle;

/**
 * Load chart dari chartJS.
 */
class Chart extends \yii\base\Widget
{
    public $id;

    /**
    * @var string 
    * HTML Id of chart (div) container
    */
    public $html_id;
	
	public $options = [];

    public $data;

    public $categories;

    public function run()
    {
        echo '<div id="chart'.$this->html_id.'" width="400px" height="400px"></div>';
    }

    /**
     * Initializes the widget
     * @throws InvalidConfigException
     */
    public function init()
    {
        $this->html_id = $this->getId();

        $this->registerAssets();

        parent::init();
    }

    /**
     * Registers the needed assets
     */
    public function registerAssets()
    {
        $view = $this->getView();
            
        ChartAsset::register($view);

        $this->Script();
    }

    public function Script(){

        $view       = $this->getView();

        $view->registerJs('

            var ctx = document.getElementById("chart'.$this->html_id.'");

            var data = {
                labels: ["January", "February", "March", "April", "May", "June", "July"],
                datasets: [
                    {
                        label: "My First dataset",
                        backgroundColor: "rgba(255,99,132,0.2)",
                        borderColor: "rgba(255,99,132,1)",
                        borderWidth: 1,
                        hoverBackgroundColor: "rgba(255,99,132,0.4)",
                        hoverBorderColor: "rgba(255,99,132,1)",
                        data: [65, 59, 80, 81, 56, 55, 40],
                    }
                ]
            };

            var myBarChart = new Chart(ctx, {
                type: "bar",
                data: data,
                options: {
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero:true
                            }
                        }]
                    }
                }
            });



        ', \yii\web\View::POS_END);
    }

}

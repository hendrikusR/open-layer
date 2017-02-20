<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "provinsi".
 *
 * @property string $kode_provinsi
 * @property string $nama_provinsi
 * @property string $the_geom
 */
class Provinsi extends \yii\db\ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'provinsi';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['kode_provinsi', 'nama_provinsi'], 'required'],
            [['the_geom'], 'string'],
            [['kode_provinsi'], 'string', 'max' => 2],
            [['nama_provinsi'], 'string', 'max' => 225],
        ];
    }

    /**
     * @inheritdoc
     */
    public function attributeLabels()
    {
        return [
            'kode_provinsi' => 'Kode Provinsi',
            'nama_provinsi' => 'Nama Provinsi',
            'the_geom' => 'The Geom',
        ];
    }
}

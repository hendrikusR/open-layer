<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "multipoint".
 *
 * @property integer $gid
 * @property string $id
 * @property string $nama
 * @property string $geom
 */
class Multipoint extends \yii\db\ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return 'multipoint';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['id'], 'number'],
            [['geom'], 'string'],
            [['nama'], 'string', 'max' => 80],
        ];
    }

    /**
     * @inheritdoc
     */
    public function attributeLabels()
    {
        return [
            'gid' => 'Gid',
            'id' => 'ID',
            'nama' => 'Nama',
            'geom' => 'Geom',
        ];
    }
}

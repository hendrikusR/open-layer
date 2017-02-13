<?php

/**
 * @link http://dokumentasi.local-server.link/
 * @copyright Copyright (c) 2015 PT. Buka Media Teknologi
 * @license http://www.bukapeta.co.id/license/
 */

/**
 * Display map canvas with leaflet or openlayers javascipt library
 *
 * How to use:
 * <?=app\widget\Token::widget(["id" => $model->id, "module" => $this->context->module->id,"type" => "tms"]);?>
 * 
 */

namespace app\widget;

use Yii;

/**
 * This is just an example.
 */
class Token extends \yii\base\Widget
{
	public $id; // id data

	public $type; // TMS or UTF

	public $model; // Data, Map or Story

	public $idmodel; // id map / storysequence

    public function run()
    {
    	/* Get Database Name & Database User */
        $data               = explode(";",Yii::$app->db->dsn);
        $Dbri               = $data[1];
        $dbName1            = explode("=",$Dbri);
        $db_name            = $dbName1[1];
        $db_user            = Yii::$app->db->username;
        $db_password        = Yii::$app->db->password;

    	$view 				= $this->getView();

		/*
		creating cipher object using Rijndael encyrption algorithm with Cipher-block chaining (CBC) as mode of AES encryption
		Here I have chosen 128 bit Rijndael encyrption
		*/
		$cipher 			= mcrypt_module_open(MCRYPT_RIJNDAEL_128, '', MCRYPT_MODE_CBC, '');
		

		/*
		for 256 bit AES encryption key size should be of 32 bytes (256 bits)
		for 128 bit AES encryption key size should be of 16 bytes (128 bits)
		here i am doing 256-bit AES encryption
		choose a strong key
		*/
		$key256 			= '12345678901234561234567890123456';

		/*
		for 128 bit Rijndael encryption, initialization vector (iv) size should be 16 bytes
		for 256 bit Rijndael encryption, initialization vector (iv) size should be 32 bytes
		here I have chosen 128 bit Rijndael encyrption, so $iv size is 16 bytes
		*/
		$iv 				= '1234567890123456';

		$plainText 			= $_SERVER['HTTP_HOST'].'|map|'.$this->id.'|'.$this->type.'|'.$this->model.'|'.$this->idmodel.'|'.$db_name.'|'.$db_user.'|'.$db_password;

		mcrypt_generic_init($cipher, $key256, $iv);
		// PHP pads with NULL bytes if $plainText is not a multiple of the block size
		$cipherText256 		= mcrypt_generic($cipher,$plainText );
		mcrypt_generic_deinit($cipher);
		/*
		$cipherHexText256 stores encrypted text in hex
		we will be decrypting data stored in $cipherHexText256 from node js
		*/
		$cipherHexText256 	= bin2hex($cipherText256);

		/*
		echoing $cipherHexText256 (copy the output)
		*/
		echo $cipherHexText256;
    }
}


/**
* Copyright Bukapeta 2016
* 
*/

(function(bukapeta,bp,undefined) { 
  bp.version = '1.0';
  bp.helloWorld = function() {
	console.log("hello world!");
  };
}(window.bukapeta=window.bukapeta || {},bukapeta));

(function(bukapeta,bpol,$,undefined) {

	// Bukapeta Openlayers 3 Plugin
	bpol.version = '1.2';

	// div bpol control & overlay container
	bpol.element = document.getElementsByClassName('bp-ol-control');
	if (bpol.element.length > 0) {
		bpol.element = bpol.element[0];
	} else {
		bpol.element = document.createElement('div');
		bpol.element.className = 'bp-ol-control ol-unselectable ol-control';
	}
	bpol.target = document.getElementsByClassName('bp-ol-overlaycontainer');
	if (bpol.target.length > 0) {
		bpol.target = bpol.target[0];
	} else {
		bpol.target = document.createElement('div');
		bpol.target.className = 'bp-ol-overlaycontainer';
	}
	// prevent event but click
	var overlayEvents = [
		// ol.events.EventType.CLICK,
		ol.events.EventType.DBLCLICK,
		ol.events.EventType.MOUSEDOWN,
		ol.events.EventType.TOUCHSTART,
		ol.events.EventType.MSPOINTERDOWN,
		ol.MapBrowserEvent.EventType.POINTERDOWN,
		ol.events.EventType.MOUSEWHEEL,
		ol.events.EventType.WHEEL
	];
	for (var i = 0, ii = overlayEvents.length; i < ii; ++i) {
		ol.events.listen(bpol.target, overlayEvents[i],
		ol.events.Event.stopPropagation);
	}
	/**
	 * @classdesc
	 * Rewrite ol.control.Control without event propagation
	 * all bukapeta openlayers control should inherit this class
	 */
	bpol.Control = function(options) {
		ol.Object.call(this);
		this.element = options.element ? options.element : null;
		this.target_ = null;
		this.map_ = null;
		this.listenerKeys = [];
		this.render = options.render ? options.render : ol.nullFunction;
		if (options.target) {
			this.setTarget(options.target);
		}
	}; ol.inherits(bpol.Control, ol.Object);

	bpol.Control.prototype.disposeInternal = function() {
		ol.dom.removeNode(this.element);
		ol.Object.prototype.disposeInternal.call(this);
	};

	bpol.Control.prototype.getMap = function() {
		return this.map_;
	};

	bpol.Control.prototype.setMap = function(map) {
		if (!map.getViewport().contains(bpol.target)) {
			map.getViewport().appendChild(bpol.target);
		}
		if (this.map_) {
			ol.dom.removeNode(this.element);
		}
		for (var i = 0, ii = this.listenerKeys.length; i < ii; ++i) {
			ol.events.unlistenByKey(this.listenerKeys[i]);
		}
		this.listenerKeys.length = 0;
		this.map_ = map;
		if (this.map_) {
			var target = this.target_ ?
				this.target_ : bpol.target; // <- this
			target.appendChild(this.element);
			if (this.render !== ol.nullFunction) {
			this.listenerKeys.push(ol.events.listen(map,
				ol.MapEventType.POSTRENDER, this.render, this));
			}
			map.render();
		}
	};

	bpol.Control.prototype.setTarget = function(target) {
		this.target_ = typeof target === 'string' ?
		document.getElementById(target) :
		target;
	};

	bpol.Control.prototype.dominateControl = function() {
		var controls = this.getMap().getControls().getArray();
		for (var key in controls) {
			if (controls[key] instanceof bpol.Control && controls[key].toggleControl && controls[key].isActive && controls[key] != this) {
				controls[key].controlButtonHandler();
			}
		}
	};


	bpol.multiLevelsVT = function(tileSourceUrl,reuseZoomLevels,zoomOffset){
		// For how many zoom levels do we want to use the same vector tiles?
		// 1 means "use tiles from all zoom levels". 2 means "use the same tiles for 2
		// subsequent zoom levels".
		reuseZoomLevels = reuseZoomLevels? reuseZoomLevels : 1;
		// Offset of loaded tiles from web mercator zoom level 0.
		// 0 means "At map zoom level 0, use tiles from zoom level 0". 1 means "At map
		// zoom level 0, use tiles from zoom level 1".
		zoomOffset = zoomOffset ? zoomOffset : 0;
		// Calculation of tile urls
		var resolutions = [];
		for (var z = zoomOffset / reuseZoomLevels; z <= 22 / reuseZoomLevels; ++z) {
			resolutions.push(156543.03392804097 / Math.pow(2, z * reuseZoomLevels));
		}
		var tileUrlFunction = function(tileCoord) {
			return (tileSourceUrl)
				.replace('{z}', String(tileCoord[0] * reuseZoomLevels + zoomOffset))
				.replace('{x}', String(tileCoord[1]))
				.replace('{y}', String(-tileCoord[2] - 1))
				.replace('{a-d}', 'abcd'.substr(((tileCoord[1] << tileCoord[0]) + tileCoord[2]) % 4, 1));
		}
		return [resolutions,tileUrlFunction]
	}

	/**
	* bukapeta.ol.DrawZoom is a custom openlayers3 control that implements ol.interaction.DragZoom
	* @constructor
	* @extends {bukapeta.ol.Control}
	* @param {Object=} opt_options Control options.
	*/
	bpol.DrawZoom = function(opt_options) {
		var options = opt_options ? opt_options : {};
		options.className = options.className ? options.className : 'bp-ol-zoombox';

		this.isActive = false;
		this.toggleControl = true; // this control type is toggle type

		this.ctButton_ = document.createElement('button');
		this.ctButton_.innerHTML = '&#9712;';
		this.ctButton_.title = 'Draw a box to zoom in';
		this.ctInput_ = document.createElement('input');
		this.ctInput_.type = 'checkbok';
		this.ctInput_.setAttribute('hidden',null);

		var this_ = this;
		var handleCheckbox = function(mapBrowserEvent){
			return (this_.ctInput_.checked);
		};
		options.condition = handleCheckbox;
		this.drawZoomInteraction_ = new ol.interaction.DragZoom(options);

		this.ctButton_.addEventListener('click', function(e){this_.controlButtonHandler();}, false);
		//button.addEventListener('touchstart', handleButton, false);

		var drawZoomEl = document.createElement('div');
		drawZoomEl.className = 'bp-ol-zoomdraw';
		drawZoomEl.appendChild(this.ctInput_);
		drawZoomEl.appendChild(this.ctButton_);
		bpol.element.appendChild(drawZoomEl);

		bpol.Control.call(this, {
			element: bpol.element,
			target: options.target
		});

	}; ol.inherits(bpol.DrawZoom, bpol.Control);

	bpol.DrawZoom.prototype.controlButtonHandler = function() {
		this.ctInput_.checked = !this.ctInput_.checked;
		if (this.ctInput_.checked) {
			this.isActive = true;
			this.getMap().getViewport().style.cursor = 'zoom-in';
			this.getMap().addInteraction(this.drawZoomInteraction_);
			this.ctButton_.className = 'active';
			this.dominateControl();
		} else {
			this.isActive = false;
			this.getMap().getViewport().style.cursor = 'unset';
			this.getMap().removeInteraction(this.drawZoomInteraction_);
			this.ctButton_.className = '';
		}
	}

	/**
	* bukapeta.ol.ZoomToView
	* @constructor
	* @extends {bukapeta.ol.Control}
	* @param {Object=} opt_options Control options.
	*/
	bpol.ZoomToView = function(opt_options) {
		var options = opt_options ? opt_options : {};
		options.view = options.view ? options.view : undefined;
		options.title = options.title ? options.title : 'Zoom To View';

		this.toggleControl = false; // this control type is non toggle type

		var button = document.createElement('button');
		button.innerHTML = '&#9635;';
		button.title = options.title;

		var this_ = this;
		var handleButton = function() {
			if (options.view instanceof ol.View && (options.view.getZoom()) && (options.view.getCenter()!=null)) {
				this_.getMap().getView().setCenter(options.view.getCenter());
				this_.getMap().getView().setZoom(options.view.getZoom());
			} else {
				//console.log('fail');
			}
		};

		button.addEventListener('click', handleButton, false);
		//button.addEventListener('touchstart', handleButton, false);

		var zoomViewEl = document.createElement('div');
		zoomViewEl.className = 'bp-ol-zoomtoview';
		zoomViewEl.appendChild(button);
		bpol.element.appendChild(zoomViewEl);

		bpol.Control.call(this, {
			element: bpol.element,
			target: options.target
		});

	}; ol.inherits(bpol.ZoomToView, bpol.Control);    


	// TO-DO
	// add:
	// - zoom back & zoom forward
	// - goto xy
	// - draw
	/**
	* bukapeta.ol.Draw
	* @constructor
	* @extends {ol.control.Control}
	* @param {Object=} opt_options Control options.
	*/
	bpol.Draw = function(opt_options) {
		var options = opt_options ? opt_options : {};
		options.source = options.source ? options.source : '{wrapX: false}';
		options.title = options.title ? options.title : 'Draw';

		var source_draw = new ol.source.Vector({wrapX: false});
		var vector_draw = new ol.layer.Vector({
			source: source_draw
		});

		map.addLayer(vector_draw);

		var element = document.getElementsByClassName('bp-ol-draw');
		if (element.length > 0) {
			element = element[0];
		} else {
			element = document.createElement('div');
			element.className = 'bp-ol-draw ol-unselectable ol-control';
		}

		var options = {
			"popup_form" : false,
			"draw": {
				"Point": true,
				"LineString": true,
				"Square": false,
				"Circle": false,
				"Polygon": true
			}
		};

		var buttonsDrawControls = new ol.control.ControlDrawButtons(vector_draw, options);
		map.addControl(buttonsDrawControls);

	}; ol.inherits(bpol.Draw, ol.control.Control);

	/**
	* bukapeta.ol.Legend
	* @constructor
	* @extends {bukapeta.ol.Control}
	* @param {Object=} opt_options Control options.
	*/
	bpol.Legend = function(opt_options) {
		var options = opt_options ? opt_options : {};
		options.view = options.view ? options.view : undefined;
		options.title = options.title ? options.title : 'Legend';

		var element = document.getElementsByClassName('bp-ol-legend');
		if (element.length > 0) {
			element = element[0];
		} else {
			element = document.createElement('div');
			element.className = 'bp-ol-legend ol-unselectable ol-control';
		}

		var button = document.createElement('div');
		button.innerHTML = '<b>Legenda :</b><br>';
		button.className = 'bp-ol-legend-div';
		button.title = options.title;
		button.id = 'bp-ol-legend';
		element.appendChild(button);

		bpol.Control.call(this, {
			element: element,
			target: options.target
		});

	}; ol.inherits(bpol.Legend, bpol.Control);

	// - data legend
	/**
	* bukapeta.ol.DataLegend
	* @constructor
	* @extends {bukapeta.ol.Control}
	* @param {Object=} opt_options Control options.
	* @option.data = [{"name": "POLA RUANG","token": "token","legend": [{"color": "white","label": "kawasan"}, {"color": "yellow","label": "cagar alam"}]}, {"name": "Bandara","token": "token","legend": [{"color": "white","label": "kawasan"}]}];
	*/
	bpol.DataLegend = function(opt_options) {
		var options = opt_options ? opt_options : {};
		options.view = options.view ? options.view : undefined;
		options.data = options.data ? options.data : '[{"name": "Data sample","token": "token","legend": [{"color": "yellow","label": "sample"}]}]';

		// Add data to legend container
		var data = JSON.parse(options.data);
		for (i = 0; i < data.length; i++) {
			document.getElementById("bp-ol-legend").innerHTML += '<button type="button" class="btn btn-default btn-xs" visibility="true"><span class="glyphicon glyphicon-eye-open" aria-hidden="true"></span></button>'+data[i]["name"]+'<br>';
			var legend = data[i]["legend"];
			for (var ind = 0; ind < legend.length; ind++) {
				document.getElementById("bp-ol-legend").innerHTML += '<i></i><i style="background:'+legend[ind]["color"]+'"></i> '+legend[ind]["label"]+'<br>';
			}
		}
		
	}; ol.inherits(bpol.DataLegend, bpol.Control);

	// - 9


	/**
	* bukapeta.ol.TOC Table of Contents (campuran legenda dan layer control)
	* @constructor
	* @extends {bukapeta.ol.Control}
	* @param {Object=} opt_options Control options.
	*/
	// opt_options.layersData = {
	// 	name : 'Peta ini',
	// 	type : 'group',
	// 	data : [
	// 		{
	// 		type : 'group',
	// 		name : 'Nama Group A',
	// 		data : [
	// 			{
	// 				type : 'layer',
	// 				name : 'Nama Layer A1',
	// 				data : {
	// 					layer : {},
	// 					legend : {},
	// 					dll : {}
	// 				}
	// 			}
	// 		]
	// 		},
	// 		{
	// 			type : 'layer',
	// 			name : 'Nama Layer 2',
	// 			data : {
	// 				layer : {},
	// 				legend : {},
	// 				dll : {}
	// 			}
	// 		}
	// 	]
	// }
	// biar bisa nampilin legenda di element
	bpol.TOC = function(opt_options) {
		var options = opt_options ? opt_options : {};
		options.title = options.title ? options.title : 'Table of Contents';
		this.layersData_ = options.layersData ? options.layersData : {};
		options.visible = options.visible ? options.visible : false;

		this.isActive = options.visible;
		this.toggleControl = true; // this control type is toggle type

		this.data_ = {};
		this.tocLegendElement_ = document.createElement('div');
		this.tocLegendElement_.className = 'bp-ol-toc-element';

		this.ctButton_ = document.createElement('button');
		this.ctButton_.title = options.title;
		this.ctButton_.className = '';
		var symbol = document.createElement('span');
			symbol.className = 'glyphicon glyphicon-list';
			symbol.setAttribute('aria-hidden','true');
		this.ctButton_.appendChild(symbol);
		this.ctInput_ = document.createElement('input');
		this.ctInput_.checked = options.visible;
		this.ctInput_.type = 'checkbok';
		this.ctInput_.setAttribute('hidden',null);

		if (options.visible) {
			this.ctInput_.checked = true;
			this.ctButton_.className = 'active';
			this.tocLegendElement_.style.display = 'unset';
		} else {
			this.ctInput_.checked = false;
			this.ctButton_.className = '';
			this.tocLegendElement_.style.display = 'none';
		}

		var this_ = this;
		this.ctButton_.addEventListener('click', function(e){this_.controlButtonHandler();}, false);

		var tocElement = document.createElement('div');
		tocElement.className = 'bp-ol-toc';
		tocElement.appendChild(this.ctInput_);
		tocElement.appendChild(this.ctButton_);
		tocElement.appendChild(this.tocLegendElement_);
		bpol.element.appendChild(tocElement);

		bpol.Control.call(this, {
			element: bpol.element,
			// target: options.target
		});

	}; ol.inherits(bpol.TOC, bpol.Control);
	bpol.TOC.prototype.setMap = function(map) {
		bpol.Control.prototype.setMap.call(this, map);
		if(this.isActive) {
			this.dominateControl();
		}
		this.setLayerList(this.layersData_);
	};
	bpol.TOC.prototype.controlButtonHandler = function() {
		this.ctInput_.checked = !this.ctInput_.checked;
		if (this.ctInput_.checked) {
			this.isActive = true;
			this.ctButton_.className = 'active';
			this.tocLegendElement_.style.display = 'unset';
			this.dominateControl();
		} else {
			this.isActive = false;
			this.ctButton_.className = '';
			this.tocLegendElement_.style.display = 'none';
		}
	};
	bpol.TOC.prototype.setLayerList = function(layersData) {
		// remove child nodes
		var this_ = this;
		var map = this_.getMap();
		if (map != null && this_.data_.layers != undefined) {
			for (var i = this_.data_.layers.length - 1; i >= 0; i--) {
				map.removeLayer(this_.data_.layers[i].layer);
				this_.data_.layers[i].layer.setVisible(true); // workaround #1 temporary
			}
		}

		for (var k = this.tocLegendElement_.children.length - 1; k >= 0;k--) {
			for (var l = this.tocLegendElement_.children[k].children.length - 1; l >= 0;l--) {
				this.tocLegendElement_.children[k].children[l].innerHTML=''
				this.tocLegendElement_.children[k].removeChild(this.tocLegendElement_.children[k].children[l]);
			}
			this.tocLegendElement_.children[k].innerHTML=''
			this.tocLegendElement_.removeChild(this.tocLegendElement_.children[k]);
		}
		function parentVisibility(groups,visible) {
			var id = groups[0].substr(1);
			var type = groups[0].substr(0,1);
			var groupsid = groups[0];
			var pvisible = visible;
			var warning = false;
			for (var i = this_.data_.groupContents.length - 1; i >= 0; i--) {
				if(this_.data_.groupContents[i].indexOf(groupsid) != -1) {
					for (var m in this_.data_.groupContents[i]) {
						var osp = document.getElementById('bpol-toc-sp-'+this_.data_.groupContents[i][m]);
						warning = (osp.bpVisibility != pvisible && this_.data_.groupContents[i][m] != groupsid) ? true : warning;
					}
					groupsid = 'G'+i;
					var sp = document.getElementById('bpol-toc-sp-'+groupsid);
					// if (sp.bpVisibility == pvisible && warning == false) {
					if (!warning) {
						sp.bpVisibility = pvisible;
						switch(pvisible) {
							case 0: // off
								sp.className = 'glyphicon glyphicon-eye-close';
								break;
							case 1: // on
								sp.className = 'glyphicon glyphicon-eye-open';
								break;
							case 2: // warning
								sp.className = 'glyphicon glyphicon-warning-sign';
						}
					} else {
						warning = false;
						sp.bpVisibility = 2; //warning
						sp.className = 'glyphicon glyphicon-warning-sign';
					}
					// if (warning) {
					// 	sp.className='glyphicon glyphicon-warning-sign';
					// 	// warning = false;
					// }
					pvisible = sp.bpVisibility;
				}
			}
		}
		function visibleHandler(groups,visible=undefined) {
			for (var key in groups) {
				var id = groups[key].substr(1);
				var type = groups[key].substr(0,1);
				var sp = document.getElementById('bpol-toc-sp-'+type+id);
				var visibility;
				if (visible != undefined) {
					visibility = visible;
					sp.bpVisibility = visibility;
				} else {
					switch(sp.bpVisibility) {
						case 0:
							visibility = 1;
							break;
						case 1:
							visibility = 0;
							break;
						default: // set to visible
							visibility = 1;
					}
					//checking parent;
					sp.bpVisibility = visibility;
					parentVisibility(groups,visibility);
				}
				switch(visibility) {
					case 0: // off
						sp.className = 'glyphicon glyphicon-eye-close';
						break;
					case 1: // on
						sp.className = 'glyphicon glyphicon-eye-open';
						break;
					default:
						sp.className = 'glyphicon glyphicon-eye-open';
						break;
				}
				switch(type){
					case 'L':
						// if type layer do something
						if(this_.data_.layers[id].layer instanceof ol.layer.Layer) {
							this_.data_.layers[id].layer.setVisible((visibility==true)?true:false);
						}
						break;
					case 'G':
						// if type group do something
						// group recursive
						visibleHandler(this_.data_.groupContents[id],visibility);
						break;
					default:
						break;
				}
			}
		}
		function grupOrLayer(layersData,groupsIndex=0,layersIndex=0,level=0) {
			var res = {};
			res.groups = [];
			res.groupContents = [];
			res.layers = [];
			res.layersIndex = layersIndex;
			res.groupsIndex = groupsIndex;
			var visible;
			switch(layersData.visible) {
				case 'off':
					visible = 0; // using integer so 0 == false
					break;
				// case 'always': // to-do
				default: // on
					visible = 1;
					break;
			}
			res.elements = document.createElement('div');
			var divHead = document.createElement('div');
				divHead.className = 'bpol-toc-hd list-group-item';
			var divTitle = document.createElement('div');
				divTitle.className = 'bpol-toc-hdtitle';
				//  Map , Group , Layer name
				divTitle.innerHTML = layersData.name;
			var divCtrVis = document.createElement('div');
				divCtrVis.className = 'bpol-toc-ctrl';

			var btVis = document.createElement('button');
				btVis.className = 'btn btn-default btn-xs bpol-toc-btnvis';
				btVis.style = 'display: inline;';
				btVis.setAttribute('type','button');
				//btVis.setAttribute('','');
			var spVisGlyph = document.createElement('span');
				spVisGlyph.bpVisibility = visible;
				spVisGlyph.className = 'glyphicon glyphicon-eye-open';
				spVisGlyph.setAttribute('aria-hidden','true');

			// Add editor button
			var editorAhref = document.createElement('a');
				editorAhref.style = 'display: inline;';
				editorAhref.setAttribute('href','/web/data/editor?id='+layersData.id);
			var editorVis = document.createElement('button');
				editorVis.className = 'btn btn-default btn-xs bpol-toc-btn-editor';
				editorVis.style = 'display: inline;';
				editorVis.setAttribute('type','button');
			var editorVisGlyph = document.createElement('span');
				editorVisGlyph.className = 'glyphicon glyphicon-pencil';
				editorVisGlyph.setAttribute('aria-hidden','true');

			btVis.appendChild(spVisGlyph);
			divCtrVis.appendChild(btVis);
			divHead.appendChild(divCtrVis);
			divHead.appendChild(divTitle);			
			var divContent = document.createElement('div');
				divContent.className = 'list-group-item';

			if (layersData.type === 'group') {
				var tempLevel = level;
				tempLevel++;
				// Layer list - group element
				if (level==0) {
					// Map Title Element (non collapsing)
					res.elements.className = 'bpol-toc-map';
					divContent.className = divContent.className+' bpol-toc-ct-m';
				} else {
					// Group Element (collapsible)
					res.elements.className = 'bpol-toc-group';
					divHead.id = 'bpol-toc-hd-g'+groupsIndex;
					divTitle.setAttribute('data-toggle','collapse');
					divTitle.setAttribute('data-target','#bpol-toc-ct-g'+groupsIndex);
					divContent.id = 'bpol-toc-ct-g'+groupsIndex;
					divContent.className = divContent.className+' bpol-toc-ct-g collapse';
				}
				for (var key in layersData.data) {
					if (layersData.data[key].type === 'group') {
						var groupResults = grupOrLayer(layersData.data[key],res.groupsIndex+1,res.layersIndex,tempLevel);
					} else {
						var groupResults = grupOrLayer(layersData.data[key],res.groupsIndex,res.layersIndex,level);
					}
					//res.groups.push(groupResults.groups);
					for (var k in groupResults.groups) {
						switch(groupResults.groups[k].substring(0,1)){
							case 'L':
								res.groups.push(groupResults.groups[k]);
								break;
							case 'G':
								res.groups.push(groupResults.groups[k]);
								break;
							default:
								break;
						}
					}
					for (var k in groupResults.groupContents) {
						res.groupContents[k] = groupResults.groupContents[k];
					}
					for (var i in groupResults.layers) {
						res.layers.push(groupResults.layers[i]);
					}
					res.layersIndex = groupResults.layersIndex;
					res.groupsIndex = groupResults.groupsIndex;
					divContent.appendChild(groupResults.elements);
				}
				res.groupContents[groupsIndex] = res.groups;
				res.groups = ['G'+groupsIndex];
				spVisGlyph.id = 'bpol-toc-sp-G'+groupsIndex;
				res.elements.appendChild(divHead);
				res.elements.appendChild(divContent);
				btVis.addEventListener('click',function(e){visibleHandler(res.groups);},false);
			}
			else if (layersData.type === 'layer') {
				if (layersData.layer != undefined && layersData.layer instanceof ol.layer.Layer) {
					
					if (layersData.editasi == true) {
						// Add editor button
						editorVis.appendChild(editorVisGlyph);
						editorAhref.appendChild(editorVis);
						divCtrVis.appendChild(editorAhref);
					}

					layersData.layer.setZIndex((9999-layersIndex));
					map.addLayer(layersData.layer);
					res.groups = ['L'+(layersIndex)];
					res.layers.push(layersData);
					// Layer list - layer element
					res.elements.className = 'bpol-toc-layer';
					res.elements.appendChild(divHead);
					res.elements.appendChild(divContent);
					divHead.id = 'bpol-toc-hd-l'+layersIndex;
					spVisGlyph.id = 'bpol-toc-sp-L'+layersIndex;
					divTitle.setAttribute('data-toggle','collapse');
					divTitle.setAttribute('data-target','#bpol-toc-ct-l'+layersIndex);
					divContent.id = 'bpol-toc-ct-l'+layersIndex;
					divContent.className = divContent.className+' bpol-toc-ct-l collapse';
					btVis.addEventListener('click',function(e){visibleHandler(res.groups);},false);

					// Legend container
					var legend = getLegendElement((layersData.data != undefined && layersData.data.style != undefined)?layersData.data.style:{data:{}},layersData.name);
					divContent.appendChild(legend);

					res.layersIndex++;
				} else {
					res.elements.className = 'bpol-toc-invalid';
					console.log('invalid layer : '+layersData.name);
				}
			}
			else {
				res.elements.className = 'bpol-toc-invalid';
				//invalid
			}
			return res;
		}
		function getLegendElement(data,name = '') {
			styles = data; // format styling yang lama

			var container = document.createElement('div');
			container.className = 'bpol-toc-legend-container';
			var content = document.createElement('div');
			container.appendChild(content);

			var NS="http://www.w3.org/2000/svg";
			var svg = document.createElementNS(NS,"svg");
				svg.setAttribute('width',32);
				svg.setAttribute('height',20);
				svg.style.float = 'left';
			var symb = document.createElementNS(NS,"rect");
				symb.setAttribute('width',32);
				symb.setAttribute('height',20);
			var label = document.createElement('div');
				label.style.paddingLeft = '36px';
			svg.appendChild(symb);
			content.appendChild(svg);
			content.appendChild(label);

			if (styles.style==="sewarna") {
				symb.style.fill = styles.layer[0].paint["fill-color"] || '#fff';
				symb.style.fillOpacity = styles.layer[0].paint["fill-opacity"] || 1.0;
				symb.style.stroke = styles.outline.paint["line-color"] || '#000';
				symb.style.strokeWidth = (styles.outline.paint["line-width"])*2 || 1;
				symb.style.strokeOpacity = styles.outline.paint["line-opacity"] || 1;
				label.innerHTML = name;
			}

			return container;
		}
		
		var theLayers = grupOrLayer(layersData);
		window.temp = theLayers;
		this.data_ = theLayers;
		this.tocLegendElement_.appendChild(theLayers.elements);
	};
	bpol.TOC.prototype.getLayerList = function() {
		return this.data_.layers;
	}

	/**
	* bukapeta.ol.BasemapProvider Basemap control and provider for openlayers 3
	* @constructor
	* @extends {bukapeta.ol.Control}
	* @param {Object=} opt_options Control options.
	*/

	// KAYAKNYA JADIIII
	bpol.BasemapProvider = function(opt_options) {
		var options = opt_options ? opt_options : {};
		options.default = options.default ? options.default : ['mapbox','streets'];
		options.customList = (options.customList && options.customList instanceof Array) ? options.customList : [];
		options.visible = options.visible ? options.visible : false;
		options.title = 'Basemap Selector';
		options.preset = (options.preset && options.preset instanceof Array) ? options.preset : ['basic'];
		this.apikey_ = options.apikey ? options.apikey : {};

		this.supportedList_ = ['mapbox','osm','stamen']; //hmmm

		var preset = {};
			preset['basic'] = [
				['mapbox','streets-basic'],
				['mapbox','streets'],
				['mapbox','satellite'],
				['mapbox','streets-satellite'],
				['stamen','terrain'],
				['osm'],
			];
			preset['other'] = [
				['mapbox','light'],
				['mapbox','dark'],
				['mapbox','outdoors'],
				['mapbox','run-bike-hike',],
				['mapbox','pirates'],
				['mapbox','high-contrast'],
			]
			preset['artistic'] = [
				['mapbox','pencil'],
				['mapbox','wheatpaste'],
				['mapbox','comic'],
				['mapbox','emerald'],
				['stamen','watercolor'],
				['stamen','toner'],
			];
			preset['all'] = preset['basic'].concat(preset['other']).concat(preset['artistic']);
		this.presetCache_ = {};

		this.isActive = options.visible;
		this.toggleControl = true; // this control type is toggle type

		this.baseMapList = [];
		this.baseMapListCache_ = {};

		var defaultBase = options.default[0];
		var defaultType = options.default[1];

		this.basemapElement_ = document.createElement('div');
		this.basemapElement_.className = 'bp-ol-basemap-element';
		this.ctButton_ = document.createElement('button');
		this.ctButton_.title = options.title;
		this.ctButton_.className = '';
		var symbol = document.createElement('span');
			symbol.className = 'glyphicon glyphicon-globe';
			symbol.setAttribute('aria-hidden','true');
		this.ctButton_.appendChild(symbol);
		this.ctInput_ = document.createElement('input');
		this.ctInput_.checked = options.visible;
		this.ctInput_.type = 'checkbok';
		this.ctInput_.setAttribute('hidden',null);

		var this_ = this;
		this.ctButton_.addEventListener('click', function(e){this_.controlButtonHandler();}, false);

		var bmElement = document.createElement('div');
		bmElement.className = 'bp-ol-basemap';
		bmElement.appendChild(this.ctInput_);
		bmElement.appendChild(this.ctButton_);
		bmElement.appendChild(this.basemapElement_);
		bpol.element.appendChild(bmElement);

		if (options.visible) {
			this.ctInput_.checked = true;
			this.ctButton_.className = 'active';
			this.basemapElement_.style.display = 'unset';
		} else {
			this.ctInput_.checked = false;
			this.ctButton_.className = '';
			this.basemapElement_.style.display = 'none';
		}
		var first	= false;
		var second	= false;
		for (var pk in options.preset) {
			if (preset.hasOwnProperty(options.preset[pk])) {
				for (var key in preset[options.preset[pk]]) {
					var base = preset[options.preset[pk]][key][0];
					var type = preset[options.preset[pk]][key][1] || '';
					this.presetCache_[base] = this.presetCache_[base] ? this.presetCache_[base] : []
					if(this.presetCache_[base].indexOf(type)!=-1) {
						continue;
					}
					this.presetCache_[base].push(type);
					this.baseMapList.push({
						base	: base,
						type	: type,
						apikey	: this.apikey_[base] ? this.apikey_[base] : '',
						other	: []
					});
					if (base == defaultBase && type == defaultType && !first) {
						this.defaultKey_ = this.baseMapList.length - 1;
						first = true;
						second = true;
					} else if (base == defaultBase && !second) {
						this.defaultKey_ = this.defaultKey_ ? this.defaultKey_ : this.baseMapList.length - 1;
						second = true;
					}
				}
			}
		}
		if (options.customList.length > 0) {
			for (var key in options.customList) {
				if(options.customList[key] instanceof Array){
					var base = options.customList[key][0];
					var type = options.customList[key][1] || '';
					var apikey = options.customList[key][2] || '';
					var other = options.customList[key].slice(3) || [];
					this.baseMapList.push({
						base	: base,
						type	: type,
						apikey	: this.apikey_[base] ? this.apikey_[base] : apikey,
						other	: other
					});
					if (base == defaultBase && type == defaultType && !first) {
						this.defaultKey_ = this.baseMapList.length - 1;
						first = true;
						second = true;
					} else if (base == defaultBase && !second) {
						this.defaultKey_ = this.defaultKey_ ? this.defaultKey_ : this.baseMapList.length - 1;
						second = true;
					}
				}
			}
		}
		this.defaultKey_ = this.defaultKey_ ? this.defaultKey_ : 0;
		this.generateBasemap();

		bpol.Control.call(this, {
			element : bpol.element
		})
	}; ol.inherits(bpol.BasemapProvider, bpol.Control);

	bpol.BasemapProvider.prototype.controlButtonHandler = function() {
		this.ctInput_.checked = !this.ctInput_.checked;
		if (this.ctInput_.checked) {
			this.isActive = true;
			this.ctButton_.className = 'active';
			this.basemapElement_.style.display = 'unset';
			this.dominateControl();
		} else {
			this.isActive = false;
			this.ctButton_.className = '';
			this.basemapElement_.style.display = 'none';
		}
	};

	bpol.BasemapProvider.prototype.setMap = function(map) {
		bpol.Control.prototype.setMap.call(this, map);
		if(this.isActive) {
			this.dominateControl();
		}
		for (var key in this.baseMapList) {
			if (this.baseMapList[key].layer instanceof ol.layer.Layer) {
				map.addLayer(this.baseMapList[key].layer);
			}
		}
		this.setBasemap();
	};
	bpol.BasemapProvider.prototype.generateBasemap = function() {
		var this_ = this;
		var divBaseGroup = document.createElement('div');
			divBaseGroup.className = 'list-group';
		this.basemapElement_.appendChild(divBaseGroup);
		for (var key in this.baseMapList) {
			if (this.supportedList_.indexOf(this.baseMapList[key].base) != -1) {
				var a = document.createElement('a');
					a.href = '#';
					a.basemapKey = key;
					a.disabled = false;
					a.className = 'list-group-item';
					a.addEventListener('click',function(e){this_.setBasemap(this)},false);
				var img = document.createElement('img');
					img.className = 'list-group-item-heading';
					img.style.width = '100px';
					img.style.height = '67px';
				var p = document.createElement('p');
					p.className = 'list-group-item-text';
				a.appendChild(img);
				a.appendChild(p);
				this.baseMapList[key].a = a;
				var base	= this.baseMapList[key].base;
				var type	= this.baseMapList[key].type;
				var apikey	= this.baseMapList[key].apikey;
				var olLayer = null;
				switch(base) {
					case 'mapbox':
						this.baseMapListCache_.mapbox = this.baseMapListCache_.mapbox ? this.baseMapListCache_.mapbox : [];
						if (this.baseMapListCache_.mapbox.indexOf(type) != -1) {
							break;
						}
						p.innerHTML = 'Mapbox ';
						switch(type) {
							case 'streets':
								p.innerHTML += 'Streets';
								break;
							case 'streets-basic':
								p.innerHTML += 'Streets Basic';
								break;
							case 'satellite':
								p.innerHTML += 'Satellite';
								break;
							case 'streets-satellite':
								p.innerHTML += 'Streets Satellite';
								break;
							case 'light':
								p.innerHTML += 'Light';
								break;
							case 'dark':
								p.innerHTML += 'Dark';
								break;
							case 'pencil':
								p.innerHTML += 'Pencil';
								break;
							case 'wheatpaste':
								p.innerHTML += 'Wheatpaste';
								break;
							case 'comic':
								p.innerHTML += 'Comic';
								break;
							case 'emerald':
								p.innerHTML += 'Emerald';
								break;
							case 'outdoors':
								p.innerHTML += 'Outdoors';
								break;
							case 'run-bike-hike':
								p.innerHTML += 'Outdoor Activities';
								break;
							case 'pirates':
								p.innerHTML += 'Pirates';
								break;
							case 'high-contrast':
								p.innerHTML += 'High Contrast';
								break;
							default:
								p.innerHTML += 'Streets';
								type = 'streets';
								break;
						}
						img.src = 'https://a.tiles.mapbox.com/v4/mapbox.'+type+'/15/26107/16947.png?access_token='+apikey;
						jQuery.ajax({
							type: 'GET',
							url: img.src,
							a: a,
							error : function(e) {
								this.a.children[0].src = '';
								this.a.disabled = true;
							},
						});
						olLayer = new ol.layer.Tile({
							source: new ol.source.XYZ({
								attributions: '©<a href="https://www.mapbox.com/about/maps/">Mapbox</a> ©<a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
								urls: [
									'https://a.tiles.mapbox.com/v4/mapbox.'+type+'/{z}/{x}/{y}.png?access_token='+apikey,
									'https://b.tiles.mapbox.com/v4/mapbox.'+type+'/{z}/{x}/{y}.png?access_token='+apikey,
									'https://c.tiles.mapbox.com/v4/mapbox.'+type+'/{z}/{x}/{y}.png?access_token='+apikey,
									'https://d.tiles.mapbox.com/v4/mapbox.'+type+'/{z}/{x}/{y}.png?access_token='+apikey,
								],
							})
						});
						divBaseGroup.appendChild(a);
						this.baseMapListCache_.mapbox.push(type);
						break;
					case 'osm':
						this.baseMapListCache_.osm = this.baseMapListCache_.osm ? this.baseMapListCache_.osm : [];
						if (this.baseMapListCache_.osm.indexOf(base) != -1) {
							break;
						}
						img.src = 'https://a.tile.openstreetmap.org/15/26107/16947.png';
						p.innerHTML = 'OpenstreetMap';
						olLayer = new ol.layer.Tile({
							source: new ol.source.OSM(),
						});
						divBaseGroup.appendChild(a);
						this.baseMapListCache_.osm.push(base);
						break;
					case 'stamen':
						this.baseMapListCache_.stamen = this.baseMapListCache_.stamen ? this.baseMapListCache_.stamen : [];
						if (this.baseMapListCache_.stamen.indexOf(type) != -1) {
							break;
						}
						p.innerHTML = 'Stamen ';
						switch(type) {
							case 'watercolor':
								p.innerHTML += 'Watercolor';
								break;
							case 'toner':
								p.innerHTML += 'Toner';
								break;
							case 'terrain':
							default:
								type = 'terrain';
								p.innerHTML += 'Terrain';
								break;
						}
						img.src = 'https://stamen-tiles-c.a.ssl.fastly.net/'+type+'/15/26107/16947.png';
						olLayer = new ol.layer.Tile({
							source: new ol.source.Stamen({
								layer: type,
							}),
						});
						divBaseGroup.appendChild(a);
						this.baseMapListCache_.stamen.push(type);
						break;
					case 'arcgis':
						//TO-DO
						this.baseMapListCache_.arcgis = this.baseMapListCache_.arcgis ? this.baseMapListCache_.arcgis : [];
						if (this.baseMapListCache_.arcgis.indexOf(type) != -1) {
							break;
						}

						img.src = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/16947/26107';
						p.innerHTML = 'ArcGIS Online Imagery';

						divBaseGroup.appendChild(a);
						this.baseMapListCache_.arcgis.push(type);
						break;
					case 'plain':
						//TO-DOOOOO
						this.baseMapListCache_.plain = this.baseMapListCache_.plain ? this.baseMapListCache_.plain : [];
						if (this.baseMapListCache_.plain.indexOf(type) != -1) {
							break;
						}

						img.src = '';
						p.innerHTML = 'Custom Background '+type;

						divBaseGroup.appendChild(a);
						this.baseMapListCache_.plain.push(type);
						break;
				}
				if (olLayer instanceof ol.layer.Layer) {
					olLayer.setVisible(false);
					this.baseMapList[key].layer = olLayer;
				}
			} else {
				this.baseMapList[key] = undefined;
			}
		}
	};
	bpol.BasemapProvider.prototype.setBasemap = function(a) {
		var basemapKey = a ? a.basemapKey : this.defaultKey_;
		var map = this.getMap();
		if (!(a ? a.disabled : false)) {
			for (var key in this.baseMapList) {
				if (this.baseMapList[key] != undefined) {
					if (key == basemapKey) {
						this.baseMapList[key].a.className = 'list-group-item active';
						if (this.baseMapList[key].layer instanceof ol.layer.Layer) {
							this.baseMapList[key].layer.setVisible(true);
						}
					} else {
						this.baseMapList[key].a.className = 'list-group-item';
						if (this.baseMapList[key].layer instanceof ol.layer.Layer) {
							this.baseMapList[key].layer.setVisible(false);
						}
					}
				}
			}
		} else {

		}
	};

	/**
	* bukapeta.ol.Analysis Analysis control for openlayers 3
	* @constructor
	* @extends {bukapeta.ol.Control}
	* @param {Object=} opt_options Control options.
	*/
	bpol.Analysis = function(opt_options) {
		var options = opt_options ? opt_options : {};
		options.title = 'Perform Analysis';

		// this.requestUrl = options.requestUrl;
		this.requestUrl = '/web/data/intersect';

		this.isActive = false;
		this.toggleControl = true; // this control type is toggle type

		this.ctButton_ = document.createElement('button');
		// button.innerHTML = 'A';
		this.ctButton_.title = options.title;
		this.ctButton_.className = '';
		var symbol = document.createElement('span');
		symbol.className = 'glyphicon glyphicon-text-background';
		symbol.setAttribute('aria-hidden','true');
		this.ctButton_.appendChild(symbol);
		this.ctInput_ = document.createElement('input');
		this.ctInput_.checked = false;
		this.ctInput_.type = 'checkbok';
		this.ctInput_.setAttribute('hidden',null);

		this.analysisElement_ = document.createElement('div');
		this.analysisElement_.className = 'bp-ol-analysis-el';
		this.analysisElement_.setAttribute('style', 'position:absolute;'+
													'right:1%;'+
													'top:0;'+
													'padding:2px;'+
													'background-color: rgba(255,255,255,.4);'+
													'transform: translate(-40px,0px);'+
													'border-radius:4px;'+
													'display:none');

		
		this.ctButton_.addEventListener('click', function(e) { this_.controlButtonHandler(); }, false);

		var b1 = document.createElement('button');
			var b1Sym = document.createElement('span');
				b1Sym.className = 'glyphicon glyphicon-pencil';
				b1Sym.setAttribute('aria-hidden','true');
			b1.appendChild(b1Sym);
			b1.title = 'Draw';
			b1.tool = 0; 
			b1.checked = false;
		var b2 = document.createElement('button');
			var b2Sym = document.createElement('span');
				b2Sym.className = 'glyphicon glyphicon-edit';
				b2Sym.setAttribute('aria-hidden','true');
			b2.appendChild(b2Sym);
			b2.title = 'Freehand Draw';
			b2.tool = 1;
			b2.checked = false;
		var b3 = document.createElement('button');
			b3.innerHTML = 'S';
			b3.title = 'Select a Feature';
			b3.tool = 2;
			b3.checked = false;
		var b4 = document.createElement('button');
			var b4Sym = document.createElement('span');
				b4Sym.className = 'glyphicon glyphicon-fullscreen';
				b4Sym.setAttribute('aria-hidden','true');
			b4.appendChild(b4Sym);
			b4.title = 'Analysis Current Extent';
			b4.tool = 3;
			b4.checked = false;
		this.btAnalysis_ = [b1,b2,b4];
		var anaCt = document.createElement('div');
			anaCt.className = '';

		this.analysisElement_.appendChild(anaCt);

		this.mdL_ = document.createElement('div');
		this.mdL_.className = 'modal fade';
		this.mdL_.id = 'bp-ol-analysis-loading';
		this.mdL_.setAttribute('tabindex','-1');
		this.mdL_.setAttribute('role','dialog');
		// this.mdL_.setAttribute('aria-labelledby','Loading');
		var iLd = document.createElement('img');
			iLd.src = '/web/images/loader.gif';
			iLd.setAttribute('style',	'position: absolute;'+
										'width: 20%;'+
										'top: 50%;'+
										'left: 50%;'+
										'transform: translate(-50%,-50%);'
							);
		this.mdL_.appendChild(iLd);
		document.body.appendChild(this.mdL_);

		this.pie_ = [];

		this.md_ = document.createElement('div');
		this.md_.className = 'modal fade';
		this.md_.id = 'bp-ol-analysis-modal';
		this.md_.setAttribute('tabindex','-1');
		this.md_.setAttribute('role','dialog');
		this.md_.setAttribute('aria-labelledby','AnalysisResults');
		var mdDialog = document.createElement('div');
			mdDialog.className = 'modal-dialog';
			mdDialog.setAttribute('role','document');
		var mdContent = document.createElement('div');
			mdContent.className = 'modal-content';
		var mdHeader = document.createElement('div');
			mdHeader.className = 'modal-header';
			mdHeader.innerHTML =	'<button type="button" class="close" data-dismiss="modal" aria-label="Close">'+
									'<span aria-hidden="true">&times;</span>'+
									'</button>'+
									'<h4 class="modal-title" id="AnalysisResults">Hasil Analisis Fitur</h4>';
		this.mdBody_ = document.createElement('div');
		this.mdBody_.className = 'modal-body';
		var mdFooter = document.createElement('div');
			mdFooter.className = 'modal-footer';
			mdFooter.innerHTML =	'<button type="button" class="btn btn-primary" data-dismiss="modal">Selesai</button>';
		this.md_.appendChild(mdDialog);
		mdDialog.appendChild(mdContent);
		mdContent.appendChild(mdHeader);
		mdContent.appendChild(this.mdBody_);
		mdContent.appendChild(mdFooter);
		document.body.appendChild(this.md_);

		this.wktFormat_ = new ol.format.WKT();
		this.geoJsonFormat_ = new ol.format.GeoJSON();
		this.features = new ol.Collection();
		this.freehand_ = false;
		var this_ = this;
		var freehandCondition = function() {
			return this_.freehand_;
		}
		this.draw_ = new ol.interaction.Draw({
			features: this.features,
			type: 'Polygon',
			freehandCondition: freehandCondition,
		});
		this.drawLayer_ = new ol.layer.Vector({
	        source: new ol.source.Vector({features: this.features}),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
						color: 'rgba(255, 255, 255, 0.2)'
					}),
				stroke: new ol.style.Stroke({
						color: '#ffcc33',
						width: 2
					}),
				image: new ol.style.Circle({
					radius: 7,
					fill: new ol.style.Fill({
						color: '#ffcc33'
					})
				})
			})
		});

		for(var btkey in this.btAnalysis_) {
			this.btAnalysis_[btkey].addEventListener('click',function(e) { this_.analysisButtonHandler(this); },false);
			anaCt.appendChild(this.btAnalysis_[btkey]);
		}

		var anElement = document.createElement('div');
		anElement.className = 'bp-ol-analysis';
		anElement.appendChild(this.ctInput_);
		anElement.appendChild(this.ctButton_);
		anElement.appendChild(this.analysisElement_);
		bpol.element.appendChild(anElement);

		bpol.Control.call(this, {
			element : bpol.element
		})
	}; ol.inherits(bpol.Analysis, bpol.Control);
	bpol.Analysis.prototype.controlButtonHandler = function() {
		var map = this.getMap();
		this.ctInput_.checked = !this.ctInput_.checked;
		if (this.ctInput_.checked) {
			this.isActive = true;
			this.ctButton_.className = 'active';
			this.analysisElement_.style.display = 'unset';
			this.dominateControl();
		} else {
			this.isActive = false;
			this.ctButton_.className = '';
			this.analysisElement_.style.display = 'none';
			this.features.clear();
			for(var btkey in this.btAnalysis_) {
				if(this.btAnalysis_[btkey]) {
					this.btAnalysis_[btkey].checked = false;
					this.btAnalysis_[btkey].className = '';
					map.removeInteraction(this.draw_);
				}
			}
			$('#bp-ol-analysis-modal').modal('hide');
			map.un('click',this.featureToModal,this);
		}
	};
	bpol.Analysis.prototype.analysisButtonHandler = function(button) {
		var bt = button;
		var map = this.getMap();
		this.freehand_ = false;
		map.un('click',this.featureToModal,this);
		bt.checked = !bt.checked;
		if (bt.checked) {
			this.features.clear();
			for(var btkey in this.btAnalysis_) {
				if(this.btAnalysis_[btkey] != bt) {
					this.btAnalysis_[btkey].checked = false;
					this.btAnalysis_[btkey].className = '';
					map.removeInteraction(this.draw_);
				}
			}
			bt.className = 'active';
			$('#bp-ol-analysis-modal').modal('hide');
			switch(bt.tool) {
				case 0:
					this.draw_.on('drawend', this.onDrawEnd, this);
					map.addInteraction(this.draw_);
					break;
				case 1:
					this.freehand_ = true;
					this.draw_.on('drawend', this.onDrawEnd, this);
					map.addInteraction(this.draw_);
					break;
				case 2:
					// TO-DO: by selected feature
					// 
					break;
				case 3:
					var extent		= map.getView().calculateExtent(map.getSize());
					var feature		= new ol.Feature({geometry: new ol.geom.Polygon.fromExtent(extent)});
					var e			= {};
						e.feature	= feature;
					this.onDrawEnd(e);
					break;
			}
		} else {
			bt.className = '';
			switch(bt.tool) {
				case 0:
					this.draw_.un('drawend', this.onDrawEnd, this);
					map.removeInteraction(this.draw_);
					break;
				case 1:
					this.freehand_ = false;
					this.draw_.un('drawend', this.onDrawEnd, this);
					map.removeInteraction(this.draw_);
					break;
				case 2:
					break;
				case 3:
					break;
			}
		}
	};
	bpol.Analysis.prototype.onDrawEnd = function(e) {
		for(var btkey in this.btAnalysis_) {
			if(this.btAnalysis_[btkey].checked) {
				this.analysisButtonHandler({target:this.btAnalysis_[btkey]});
			}
		}
		var map = this.getMap();
		var controls = map.getControls().getArray();
		var toc;
		var layerIds = [];
		for (var x in controls) {
			if (controls[x] instanceof bukapeta.ol.TOC) {
				toc = controls[x];
				break;
			}
		}
		var tocLayers = toc.getLayerList();
		for (var key in tocLayers) {
			if (tocLayers[key].layer.getVisible()) {
				layerIds.push(tocLayers[key].id);
			}
		}
		var feature = e.feature;
		var wktString = this.wktFormat_.writeFeature(feature);
		var srid = map.getView().getProjection().getCode().substr(5);
		var obj = {};
			obj.ids = layerIds;
			obj.wkt = wktString;
			obj.srid = srid;
		this.request(obj,feature);
	};
	bpol.Analysis.prototype.setMap = function(map) {
		bpol.Control.prototype.setMap.call(this, map);
		this.drawLayer_.setMap(map);
	};
	bpol.Analysis.prototype.request = function(data,feature) {
		var this_ = this;
		$('#bp-ol-analysis-loading').modal({backdrop: 'static', keyboard: false});
		jQuery.ajax({
			type : 'POST',
			url : this.requestUrl,
			data : data,
			error: function(e) {
				this_.requestError(e);
			},
			success: function(data){ this_.result(data,feature);},
		});
	};
	bpol.Analysis.prototype.result = function(data,feature) {
		$('#bp-ol-analysis-loading').modal('hide');
		window.temp = data;
		var d = document;
		d.cE = d.createElement;
		this.mdBody_.innerHTML = '';
		this.svgPieGColl_ = [];
		this.pieColl_ = [];
		this.arcColl_ = [];
		this.outerArcColl_ = [];
		this.rowCacheColl_ = [];
		this.areaCache_ = [];
		var found = false;
		var map = this.getMap();
		map.on('click',this.featureToModal,this);
		var results = JSON.parse(data);
		var this_ = this;
		for (var key in results.data) {
			var found = true;

			var divLayer = d.cE('div');
				divLayer.className = 'list-group';
			var dt = d.cE('div');
				dt.className = 'list-group-item';
				dt.innerHTML = results.data[key].name+((results.data[key].invalidFeatures.length>0)?' <span class="label label-danger" style="float:right">invalid feature : '+results.data[key].invalidFeatures.length+'</span>':'');
			var dc = d.cE('div');
				dc.className = 'list-group-item';
			divLayer.appendChild(dt);
			divLayer.appendChild(dc);

			// TAB NAV
			var tabUl = d.cE('ul');
				tabUl.className = 'nav nav-tabs';
			var tabLiInfo = d.cE('li');
				tabLiInfo.className = 'active';
				tabLiInfo.innerHTML = '<a data-toggle="pill" href="#bp-ol-analysis-info'+key+'">Info Layer</a>';
			var tabLiGraph = d.cE('li');
				tabLiGraph.innerHTML = '<a data-toggle="pill" href="#bp-ol-analysis-graph'+key+'">Diagram</a>';
			var tabLiTable = d.cE('li');
				tabLiTable.innerHTML = '<a data-toggle="pill" href="#bp-ol-analysis-table'+key+'">Tabel</a>';
			var tabLiMap = d.cE('li');
				tabLiMap.innerHTML = '<a data-toggle="pill" href="#bp-ol-analysis-map'+key+'">Peta</a>';
			tabUl.appendChild(tabLiInfo);
			tabUl.appendChild(tabLiGraph);
			tabUl.appendChild(tabLiTable);
			// tabUl.appendChild(tabLiMap);

			// TAB CONTENT
			var tabDiv = d.cE('div');
				tabDiv.className = 'tab-content';
				tabDiv.style.overflow = 'auto';
				tabDiv.style.maxHeight = '500px';
				tabDiv.style.padding = '5px';
				tabDiv.style.border = '1px solid #ddd';
				tabDiv.style.borderTop = 'unset';
			var tabDivInfo = d.cE('div');
				tabDivInfo.id = 'bp-ol-analysis-info'+key;
				tabDivInfo.className = 'tab-pane fade in active';
			var tabDivGraph = d.cE('div');
				tabDivGraph.id = 'bp-ol-analysis-graph'+key;
				tabDivGraph.className = 'tab-pane fade';
			var tabDivTable = d.cE('div');
				tabDivTable.id = 'bp-ol-analysis-table'+key;
				tabDivTable.className = 'tab-pane fade';
			var tabDivMap = d.cE('div');
				tabDivMap.id = 'bp-ol-analysis-map'+key;
				tabDivMap.className = 'tab-pane fade';
			tabDiv.appendChild(tabDivInfo);
			tabDiv.appendChild(tabDivGraph);
			tabDiv.appendChild(tabDivTable);
			// tabDiv.appendChild(tabDivMap);

			// simplify m2
			var simplifyM2 = function(luasIntsM2) {
				var luasToDisplay = '';
				if (luasIntsM2.split('e').length>1) {
					// exponential
					var luasV = luasIntsM2.split('e')[0];
					var luasVD = luasIntsM2.split('e')[1];
					var sign = luasVD.substr(0,1);
					if (sign=='-') {
						// to-do cm2, mm2, 
						luasToDisplay = luasV + ' &times; 10<sup>' + luasVD +'</sup> m&sup2;';
					} else {
						//to-do km2
						luasToDisplay = luasV + ' &times; 10<sup>' + luasVD +'</sup> m&sup2;';
					}
				} else {
					var luasV = luasIntsM2.split('.')[0];
					var luasVD = luasIntsM2.split('.')[1] ? luasIntsM2.split('.')[1] : 0;
					if (luasV == 0) {
						// //decimal meter
						// decLength = luasVD.length;
						// decNumLength = parseFloat(luasVD).toString().length;

						luasToDisplay = parseFloat(luasIntsM2).toFixed(6) + ' m&sup2;';
					} else {
						if ((parseFloat(luasV)/10000).toString().split('.')[0]==0) {
							// 0.001 / x1000 => m2
							luasToDisplay = (parseFloat(luasIntsM2)).toFixed(2) + ' m&sup2;';
						} else {
							// => km2
							luasToDisplay = (parseFloat(luasIntsM2)/1000000).toFixed(2) + ' km&sup2;'; // km²
						}
					}
				}
				return luasToDisplay;
			}

			// caching row for pie graph
			var rowKeyGroup = {};
			for (var rn in results.data[key].dataFields) {
				if (results.data[key].dataFields[rn] != 'gid' && results.data[key].dataFields[rn] != 'luas') {
					rowKeyGroup[results.data[key].dataFields[rn]] = {};
				}
			}
			// valid feature
			for (var dk in results.data[key].data) {
				for (var dkv in results.data[key].data[dk]) {
					if (rowKeyGroup.hasOwnProperty(dkv) && (dkv != 'gid' && dkv != 'luas')) {
						if(rowKeyGroup[dkv].hasOwnProperty(results.data[key].data[dk][dkv])) {
							rowKeyGroup[dkv][results.data[key].data[dk][dkv]] = rowKeyGroup[dkv][results.data[key].data[dk][dkv]] + parseFloat(results.data[key].data[dk]['luas']);
						} else {
							rowKeyGroup[dkv][results.data[key].data[dk][dkv]] = parseFloat(results.data[key].data[dk]['luas']);
						}
					}
				}
			}
			// invalid feature
			for (var idk in results.data[key].invalidFeatures) {
				for (var idkv in results.data[key].invalidFeatures[idk]) {
					if (rowKeyGroup.hasOwnProperty(idkv) && (idkv != 'gid' && idkv != 'luas')) {
						if(rowKeyGroup[idkv].hasOwnProperty(results.data[key].invalidFeatures[idk][idkv])) {
							rowKeyGroup[idkv][results.data[key].invalidFeatures[idk][idkv]] = rowKeyGroup[idkv][results.data[key].invalidFeatures[idk][idkv]] + parseFloat(results.data[key].invalidFeatures[idk]['luas']);
						} else {
							rowKeyGroup[idkv][results.data[key].invalidFeatures[idk][idkv]] = parseFloat(results.data[key].invalidFeatures[idk]['luas']);
						}
					}
				}
			}
			this_.rowCacheColl_.push(rowKeyGroup);
			this_.areaCache_.push(results.data[key].intersectAreaM2);
			// GRAPH BEGIN
			tabDivGraph.style.height = '350px';

			var grDrdwn = d.cE('div');
				grDrdwn.className = 'dropdown';
			var grDrdwnBtn = d.cE('button');
				grDrdwnBtn.id = 'bp-ol-analysis-graph-dd'+key;
				grDrdwnBtn.className = 'btn btn-default dropdown-toggle';
				grDrdwnBtn.setAttribute('type','button');
				grDrdwnBtn.setAttribute('data-toggle','dropdown');
				grDrdwnBtn.setAttribute('aria-haspopup','true');
				grDrdwnBtn.setAttribute('aria-expanden','true');
				grDrdwnBtn.innerHTML = 'Pilih Kolom <span class="caret"></span>';
			var grDrdwnUl = d.cE('ul');
				grDrdwnUl.className = 'dropdown-menu';
				grDrdwnUl.setAttribute('aria-labelledby','bp-ol-analysis-graph-dd'+key);
			var spPieCaption = d.cE('div');
				spPieCaption.id = 'bp-ol-analysis-piecapt'+key;
				spPieCaption.className = "label label-primary";
				spPieCaption.style.marginLeft = '10px';

			var ddHandler = function(e) {
				var rowName = e.target.rowName;
				var pieg = e.target.pieg;
				var pieCaption = d.getElementById('bp-ol-analysis-piecapt'+pieg);
					pieCaption.innerHTML = "Kolom Terpilih : "+rowName;
				var dataRaw = {};
				if (this_.rowCacheColl_[pieg].hasOwnProperty(rowName)) {
					var groupArray = rowGroupArray(rowName,pieg);
					var value = [];
					var smallValue = 0;
					var count = 0;
					for (var rowk in this_.rowCacheColl_[pieg][rowName]) {
						if (((this_.rowCacheColl_[pieg][rowName][rowk]*100)/parseFloat(this_.areaCache_[pieg])).toFixed(2)>=2) {
							count++;
							var labelr = rowk + ' (' + ((this_.rowCacheColl_[pieg][rowName][rowk]*100)/parseFloat(this_.areaCache_[pieg])).toFixed(2) + '%)';
							value.push({label:labelr,value:this_.rowCacheColl_[pieg][rowName][rowk]});
						} else {
							smallValue += this_.rowCacheColl_[pieg][rowName][rowk];
						}
					}
					if (smallValue>0) {
						count++;
						value.push({
							label: '[Other Values] (' + ((smallValue*100)/parseFloat(this_.areaCache_[pieg])).toFixed(2) + '%)',
							value: smallValue
						})
					}
					var colorArray = randColorArray(count);
				} else {
					var colorArray = [];
					var groupArray = [];
					var value = [];
				}
				dataRaw.domain = groupArray;
				dataRaw.color = colorArray;
				dataRaw.value = value;
				setPie(dataRaw,pieg);
			}
			for (var rowName in rowKeyGroup) {
				var grddulli = d.cE('li');
				var anch = d.cE('a');
					anch.href = '#';
					anch.innerHTML = rowName;
					anch.rowName = rowName;
					anch.pieg = key;
					anch.addEventListener('click',ddHandler,false);
				grddulli.appendChild(anch);
				grDrdwnUl.appendChild(grddulli);
			}
			grDrdwn.appendChild(grDrdwnBtn);
			grDrdwn.appendChild(grDrdwnUl);
			grDrdwn.appendChild(spPieCaption);

			tabDivGraph.appendChild(grDrdwn);

			var randColorArray = function(num = 0){
				var colorArray = [];
				for (var i = 0; i < num; i++) {
					var col = '#'+	(Math.floor(Math.random()*200)+55).toString(16)+
									(Math.floor(Math.random()*200)+55).toString(16)+
									(Math.floor(Math.random()*200)+55).toString(16);
					colorArray.push(col);
				}
				return colorArray;
			}
			var rowGroupArray = function(row,pieg) {
				var groupArray = [];
				if(this_.rowCacheColl_[pieg].hasOwnProperty(row)){
					for (var keyg in this_.rowCacheColl_[pieg][row]) {
						groupArray.push(keyg);
					}
				}
				return groupArray;
			}

			var divSvg = d.cE('div');
				divSvg.className = 'bp-ol-analysis-pie';
				divSvg.style.width = '524px';
				divSvg.style.height = '316px';
			tabDivGraph.appendChild(divSvg);
			var svgPie = d3.select(divSvg).append('svg');
			var svgPieG = svgPie.append('g');
				// svgPieG.attr('class','bp-ol-analysis-pieg'+key);
				svgPieG.attr('transform','translate(262,158)');
				svgPieG.append('g').attr('class','slices'+key).attr('id','slices'+key);
				svgPieG.append('g').attr('class','labels'+key).attr('id','labels'+key);
				svgPieG.append('g').attr('class','lines'+key).attr('id','lines'+key);
			this_.svgPieGColl_.push(svgPieG);
			// var pieWidth = 524;
			// var pieHeight = 316;
			var pieRadius = 120;
			var pie = d3.layout.pie().sort(null).value( function(d) {return d.value;} );
			this_.pieColl_.push(pie);
			var arc = d3.svg.arc().outerRadius(pieRadius*0.7).innerRadius(pieRadius*0.35);
			this_.arcColl_.push(arc);
			var outerArc = d3.svg.arc().outerRadius(pieRadius*0.8).innerRadius(pieRadius*0.8);
			this_.outerArcColl_.push(outerArc);

			var setPie = function(dataRaw,pieg) {
				// PIE SLICES
				var labelFunction = function(d) { return d.data.label; };
				var svgPieGt = this_.svgPieGColl_[pieg];
				var pief = this_.pieColl_[pieg];
				var arcf = this_.arcColl_[pieg];
				var outerArcf = this_.outerArcColl_[pieg];
				var color = d3.scale.ordinal()
									.domain(dataRaw.domain)
									.range(dataRaw.color);
				var slice = svgPieGt.select('.slices'+pieg).selectAll('path.slice').data(pief(dataRaw.value),labelFunction);
					slice	.enter()
							.insert('path')
							.style('fill',function(d){return color(d.data.label);})
							.attr('class','slice');
					slice	.transition().duration(1000)
							.attrTween('d',function(d){
								this._current = this._current || d;
								var interpolate = d3.interpolate(this._current, d);
								this._current = interpolate(0);
								return function(t) {
									return arcf(interpolate(t));
								};
							});
					slice	.exit()
							.remove();
				// TEXT LABELS
				function midAngle(d){
						return d.startAngle + (d.endAngle - d.startAngle)/2;
					}
				var text = svgPieGt	.select(".labels"+pieg).selectAll("text")
									.data(pief(dataRaw.value), labelFunction);
					text.enter()
						.append("text")
						.attr("dy", ".35em")
						.text(function(d) {
							return d.data.label;
						});
					text.transition().duration(1000)
						.attrTween("transform", function(d) {
							this._current = this._current || d;
							var interpolate = d3.interpolate(this._current, d);
							this._current = interpolate(0);
							return function(t) {
								var d2 = interpolate(t);
								var pos = outerArcf.centroid(d2);
								pos[0] = (pieRadius) * (midAngle(d2) < Math.PI ? 1 : -1);
								return "translate("+ pos +")";
							};
						})
						.styleTween("text-anchor", function(d){
							this._current = this._current || d;
							var interpolate = d3.interpolate(this._current, d);
							this._current = interpolate(0);
							return function(t) {
								var d2 = interpolate(t);
								return midAngle(d2) < Math.PI ? "start":"end";
							};
						});
					text.exit()
						.remove();
				var otherValues = svgPieGt	.select(".labels"+pieg).selectAll("text").filter(":last-child");
				if (otherValues.text().substr(0,14)=="[Other Values]") {
					otherValues.attr("style","fill:#ff0000");
				}
				// LINE
				var polyline = svgPieGt	.select(".lines"+pieg).selectAll("polyline")
									.data(pief(dataRaw.value), labelFunction);
					polyline.enter()
							.append("polyline");
					polyline.transition().duration(1000)
							.attrTween("points", function(d) {
								this._current = this._current || d;
								var interpolate = d3.interpolate(this._current, d);
								this._current = interpolate(0);
								return function(t) {
									var d2 = interpolate(t);
									var pos = outerArcf.centroid(d2);
									pos[0] = (pieRadius) * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
									return [arcf.centroid(d2), outerArcf.centroid(d2), pos];
							};			
						});
					polyline.exit()
						.remove();
			}
			
			// GRAPH END

			// META INFO BEGIN
			var luasIntsM2 = results.data[key].intersectAreaM2;
			var luasToDisplay = simplifyM2(luasIntsM2);
			
			var metaTable = d.cE('table');
				metaTable.className = 'table table-hover table-bordered';
			var metaTbody = d.cE('tbody');
			var metaTrArea = d.cE('tr');
			var metaTdArea = d.cE('td');
				metaTdArea.innerHTML = 'Luas Hasil Analisis';
			var metaTdAreaValue = d.cE('td');
				metaTdAreaValue.innerHTML = luasToDisplay; // m²
				metaTdAreaValue.title = results.data[key].intersectAreaM2 + ' m²';
				metaTrArea.appendChild(metaTdArea);
				metaTrArea.appendChild(metaTdAreaValue);
				metaTbody.appendChild(metaTrArea);
			var metaTrCount = d.cE('tr');
			var metaTdCount = d.cE('td');
				metaTdCount.innerHTML = 'Jumlah Fitur Terpilih';
			var metaTdCountValue = d.cE('td');
				metaTdCountValue.innerHTML = (results.data[key].data.length+results.data[key].invalidFeatures.length) + ' fitur';
				metaTrCount.appendChild(metaTdCount);
				metaTrCount.appendChild(metaTdCountValue);
				metaTbody.appendChild(metaTrCount);
			if (results.data[key].invalidFeatures.length>0) {
				var metaTrInv = d.cE('tr');
					metaTrInv.title = 'Fitur yang memiliki geometri yang tidak lolos uji validasi PostGIS';
				var metaTdInv = d.cE('td');
					metaTdInv.innerHTML = 'Jumlah Fitur Tidak Valid';
				var metaTdInvValue = d.cE('td');
					metaTdInvValue.innerHTML = results.data[key].invalidFeatures.length + ' fitur';
					metaTrInv.appendChild(metaTdInv);
					metaTrInv.appendChild(metaTdInvValue);
					metaTbody.appendChild(metaTrInv);
			}
			metaTable.appendChild(metaTbody);
			tabDivInfo.appendChild(metaTable);
			// META INFO END

			// ATTRIBUTE TABLE BEGIN
			var table = d.cE('table');
				table.className = 'table table-bordered';
			var thead = d.cE('thead');
			var thr = d.cE('tr');
			var urutan = [];
			for(var thhk in results.data[key].dataFields) {
				var thh = d.cE('th');
					thh.innerHTML = results.data[key].dataFields[thhk];
				thr.appendChild(thh);
				urutan.push(results.data[key].dataFields[thhk]);
			}
			thead.appendChild(thr);
			var tbody = d.cE('tbody');
			for(var tbrk in results.data[key].data) {
				var tbr = d.cE('tr');
				var ftRow = results.data[key].data[tbrk];
				for(var tdk in ftRow) {			
					var td = d.cE('td');
						td.innerHTML = ftRow[tdk];
					tbr.appendChild(td);
				}
				tbody.appendChild(tbr);
			}
			for(var tbrik in results.data[key].invalidFeatures) {
				var tbri = d.cE('tr');
					tbri.className = 'danger';
				var ftiRow = results.data[key].invalidFeatures[tbrik];
				for(var tdik in ftiRow) {			
					var tdi = d.cE('td');
						tdi.innerHTML = ftiRow[tdik];
					tbri.appendChild(tdi);
				}
				tbody.appendChild(tbri);
			}
			table.appendChild(thead);
			table.appendChild(tbody);
			tabDivTable.appendChild(table);
			// ATTRIBUTE TABLE END

			dc.appendChild(tabUl);
			dc.appendChild(tabDiv);
			this.mdBody_.appendChild(divLayer);
		}
		if(found) {
			setTimeout(function(){ $('#bp-ol-analysis-modal').modal('show'); },500);
		}
	};
	bpol.Analysis.prototype.requestError = function(e) {
		$('#bp-ol-analysis-loading').modal('hide');
		console.log(e);
	};
	bpol.Analysis.prototype.featureToModal = function(e) {
		var map = this.getMap();
		var found = false;
		map.forEachFeatureAtPixel(e.pixel, function (feature, layer) {
			if (layer==this.drawLayer_) {
				found = true;
			}
		});
		if(found){$('#bp-ol-analysis-modal').modal('show');}
	};

	/**
	* bukapeta.ol.Analysis Analysis control for openlayers 3
	* @constructor
	* @extends {bukapeta.ol.Control}
	* @param {Object=} opt_options Control options.
	*/
	bpol.Identify = function(opt_options) {
		var options = opt_options ? opt_options : {};
		options.title = 'Identify Features';

		this.isActive = false;
		this.toggleControl = true; // this control type is toggle type

		this.identifyElement_ = document.createElement('div');
		this.identifyElement_.className = 'bp-ol-identify-el';

		this.md_ = document.createElement('div');
		this.md_.className = 'modal fade';
		this.md_.id = 'bp-ol-identify-modal';
		this.md_.setAttribute('tabindex','-1');
		this.md_.setAttribute('role','dialog');
		this.md_.setAttribute('aria-labelledby','IdentifyResults');
		var mdDialog = document.createElement('div');
			mdDialog.className = 'modal-dialog';
			mdDialog.setAttribute('role','document');
		var mdContent = document.createElement('div');
			mdContent.className = 'modal-content';
		var mdHeader = document.createElement('div');
			mdHeader.className = 'modal-header';
			mdHeader.innerHTML =	'<button type="button" class="close" data-dismiss="modal" aria-label="Close">'+
									'<span aria-hidden="true">&times;</span>'+
									'</button>'+
									'<h4 class="modal-title" id="IdentifyResults">Hasil Identifikasi Fitur</h4>';
		this.mdBody_ = document.createElement('div');
		this.mdBody_.className = 'modal-body';
		var mdFooter = document.createElement('div');
			mdFooter.className = 'modal-footer';
			mdFooter.innerHTML =	'<button type="button" class="btn btn-primary" data-dismiss="modal">Selesai</button>';
		this.md_.appendChild(mdDialog);
		mdDialog.appendChild(mdContent);
		mdContent.appendChild(mdHeader);
		mdContent.appendChild(this.mdBody_);
		mdContent.appendChild(mdFooter);
		document.body.appendChild(this.md_);

		this.ctButton_ = document.createElement('button');
		this.ctButton_.title = options.title;
		this.ctButton_.className = '';
		var symbol = document.createElement('span');
		symbol.className = 'glyphicon glyphicon-info-sign';
		symbol.setAttribute('aria-hidden','true');
		this.ctButton_.appendChild(symbol);
		this.ctInput_ = document.createElement('input');
		this.ctInput_.checked = false;
		this.ctInput_.type = 'checkbok';
		this.ctInput_.setAttribute('hidden',null);

		var this_ = this;
		this.ctButton_.addEventListener('click', function(e){this_.controlButtonHandler();}, false);
		var idElement = document.createElement('div');
		idElement.className = 'bp-ol-identify';
		idElement.appendChild(this.ctInput_);
		idElement.appendChild(this.ctButton_);
		//idElement.appendChild(this.identifyElement_);
		bpol.element.appendChild(idElement);

		bpol.Control.call(this, {
			element : bpol.element
		})
	}; ol.inherits(bpol.Identify, bpol.Control);

	bpol.Identify.prototype.controlButtonHandler = function() {
		var map = this.getMap();
		this.ctInput_.checked = !this.ctInput_.checked;
		if (this.ctInput_.checked) {
			this.isActive = true;
			this.ctButton_.className = 'active';
			this.identifyElement_.style.display = 'unset';
			map.getViewport().style.cursor = 'pointer';
			this.dominateControl();
			map.on(ol.MapBrowserEvent.EventType.SINGLECLICK,this.identifyHandler,this);
		} else {
			this.isActive = false;
			this.ctButton_.className = '';
			this.identifyElement_.style.display = 'none';
			map.getViewport().style.cursor = 'unset';
			map.un(ol.MapBrowserEvent.EventType.SINGLECLICK,this.identifyHandler,this);
		}
	};

	bpol.Identify.prototype.identifyHandler = function(e) {
		var map = e.map;
		var this_ = this;
		var found = false;
		var d = document;
			d.cE = d.createElement;
		this.mdBody_.innerHTML = '';
		var controls = map.getControls().getArray();
		var toc;
		for (var x in controls) {
			if (controls[x] instanceof bukapeta.ol.TOC) {
				toc = controls[x];
				break;
			}
		}
		layers = toc.getLayerList() || [];
		var cache = {};
			cache.layer = [];
			cache.col = [];
			cache.prop = [];
			cache.layerIndex = [];

		map.forEachFeatureAtPixel(e.pixel, function (feature, layer) {
			for (var k in layers) {
				if(layers[k].layer == layer) {
					found = true;
					var valueProperties = feature.getProperties();
					if (cache.layer.indexOf(layer) != -1) {
						var cacheIndex		= cache.layer.indexOf(layer);
						var colCache		= cache.col[cacheIndex];
						var propCache		= {};
						var tempRowCache	= [];
						for (var rck in colCache) {
							for (var propKey in valueProperties) {
								if (propKey != feature.getGeometryName() && propKey != 'layer') {
									if (colCache[rck] == propKey) {
										propCache[propKey] = valueProperties[propKey];
									} else if (colCache.indexOf(propKey) == -1) {
										tempColCache.push(propKey);
										propCache[propKey] = valueProperties[propKey];
									}
								}
							}
						}
						for (var trk in tempColCache) {
							cache.col[cacheIndex].push(tempColCache[trk]);
						}
						cache.prop[cacheIndex].push(propCache);
					} else {
						var tempColCache	= [];
						var propCache		= {};
						for (var propKey in valueProperties) {
							if (propKey != feature.getGeometryName() && propKey != 'layer') {
								tempColCache.push(propKey);
								propCache[propKey] = valueProperties[propKey];
							}
						}
						cache.layer.push(layer);
						cache.col.push(tempColCache);
						cache.prop.push([propCache]);
						cache.layerIndex.push(k);
					}
				}
			}
		});

		for (var k in cache.layer) {
			var divLayer = d.cE('div');
				divLayer.className = 'list-group';
			var dt = d.cE('div');
				dt.className = 'list-group-item';
				dt.innerHTML = layers[cache.layerIndex[k]].name;
			var dc = d.cE('div');
				dc.className = 'list-group-item';
				dc.style.overflow = 'auto';
			divLayer.appendChild(dt);
			divLayer.appendChild(dc);
			var table = d.cE('table');
				table.className = 'table table-bordered';
			var thead = d.cE('thead');
			var thr = d.cE('tr');
			for(var thhk in cache.col[k]) {
				var thh = d.cE('th');
					thh.innerHTML = cache.col[k][thhk];
				thr.appendChild(thh);
			}
			thead.appendChild(thr);
			var tbody = d.cE('tbody');
			for(var propk in cache.prop[k]) {
				var tbr = d.cE('tr');
				var ftRow = cache.prop[k][propk];
				for(var uk in cache.col[k]) {
					var td = d.cE('td');
						td.innerHTML = '';
					for(var tdk in ftRow) {
						if (cache.col[k][uk] == tdk) {
							td.innerHTML = ftRow[tdk];
						}
					}
					tbr.appendChild(td);
				}
				tbody.appendChild(tbr);
			}
			table.appendChild(thead);
			table.appendChild(tbody);
			dc.appendChild(table);
			this.mdBody_.appendChild(divLayer);
		}
		if(found){$('#bp-ol-identify-modal').modal('show');}
	};


	/**
	* bukapeta.ol.Tahun Set tahun control for openlayers 3
	* @constructor
	* @extends {bukapeta.ol.Control}
	* @param {Object=} opt_options Control options.
	*/
	bpol.Tahun = function(opt_options)
	{
		var options 			= opt_options ? opt_options : {};
		options.title 			= 'Tahun';

		this.isActive = options.visible;
		this.toggleControl = true; // this control type is toggle type

		this.SearchElement_ = document.createElement('div');
		this.SearchElement_.className = 'bp-ol-tahun-element';
		this.SearchElement_.style.display = 'none';
		this.ctButton_ = document.createElement('button');
		this.ctButton_.title = options.title;
		this.ctButton_.className = '';
		var symbol = document.createElement('span');
			symbol.className = 'glyphicon glyphicon-calendar';
			symbol.setAttribute('aria-hidden','true');
		this.ctButton_.appendChild(symbol);
		this.ctInput_ = document.createElement('input');
		this.ctInput_.checked = options.visible;
		this.ctInput_.type = 'checkbok';
		this.ctInput_.setAttribute('hidden',null);

		this.dropdownSelect = document.createElement('select');
		this.dropdownSelect.id = 'dropdown-tahun';

		var this_ = this;

		this.ctButton_.addEventListener('click', function(e){this_.controlButtonHandler();}, false);

		this.bmElement = document.createElement('div');
		this.bmElement.className = 'bp-ol-tahun';
		this.bmElement.appendChild(this.ctInput_);
		this.bmElement.appendChild(this.ctButton_);
		this.bmElement.appendChild(this.SearchElement_);
		bpol.element.appendChild(this.bmElement);

		this.dropdownOptions = document.createElement('option');
		this.dropdownOptions.value = 'Tahun 2016';
		this.dropdownOptions.innerHTML = 'Tahun 2016';
		this.dropdownSelect.appendChild(this.dropdownOptions);
		this.SearchElement_.appendChild(this.dropdownSelect);

		bpol.Control.call(this, {
			element : bpol.element
		})

	};ol.inherits(bpol.Tahun, bpol.Control);

	bpol.Tahun.prototype.controlButtonHandler = function() {
		this.ctInput_.checked = !this.ctInput_.checked;
		if (this.ctInput_.checked) {
			this.isActive = true;
			this.ctButton_.className = 'active';
			this.SearchElement_.style.display = 'unset';
			
			this.dominateControl();
		} else {
			this.isActive = false;
			this.ctButton_.className = '';
			this.SearchElement_.style.display = 'none';
		}
	};

	/**
	* bukapeta.ol.Nasional Set tahun control for openlayers 3
	* @constructor
	* @extends {bukapeta.ol.Control}
	* @param {Object=} opt_options Control options.
	*/
	bpol.Nasional = function(opt_options)
	{
		var options 			= opt_options ? opt_options : {};
		options.title 			= 'Informasi';

		this.isActive = options.visible;
		this.toggleControl = true; // this control type is toggle type

		this.SearchElement_ = document.createElement('div');
		this.SearchElement_.className = 'bp-ol-nasional-element';
		this.SearchElement_.style.display = 'none';
		this.ctButton_ = document.createElement('button');
		this.ctButton_.title = options.title;
		this.ctButton_.className = '';
		this.ctButton_.setAttribute('data-toggle','modal');
		this.ctButton_.setAttribute('data-target','#myModal');
		var symbol = document.createElement('span');
			symbol.className = 'glyphicon glyphicon-info-sign';
			symbol.setAttribute('aria-hidden','true');
		this.ctButton_.appendChild(symbol);
		this.ctInput_ = document.createElement('input');
		this.ctInput_.checked = options.visible;
		this.ctInput_.type = 'checkbok';
		this.ctInput_.setAttribute('hidden',null);

		var this_ = this;

		this.ctButton_.addEventListener('click', function(e){this_.controlButtonHandler();}, false);

		this.bmElement = document.createElement('div');
		this.bmElement.className = 'bp-ol-nasional';
		this.bmElement.appendChild(this.ctInput_);
		this.bmElement.appendChild(this.ctButton_);
		this.bmElement.appendChild(this.SearchElement_);
		bpol.element.appendChild(this.bmElement);

		bpol.Control.call(this, {
			element : bpol.element
		})

	};ol.inherits(bpol.Nasional, bpol.Control);

	bpol.Nasional.prototype.controlButtonHandler = function() {
		this.ctInput_.checked = !this.ctInput_.checked;
		if (this.ctInput_.checked) {
			this.isActive = true;
			this.ctButton_.className = 'active';
			
			this.dominateControl();
		} else {
			this.isActive = false;
			this.ctButton_.className = '';
		}
	};

}(window.bukapeta=window.bukapeta || {},bukapeta.ol = bukapeta.ol || {},window.jQuery = window.jQuery || undefined));

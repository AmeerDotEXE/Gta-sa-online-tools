var VehicleColours = [];
var ModelInfos = {};
var ModelInfosName = {};
var CurrentModel = null;

function SetCarColors(cols)
{
	carColors = [
		[ 0, 0, 0, 255 ],
		[ 0, 0, 0, 255 ],
		[ 0, 0, 0, 255 ],
		[ 0, 0, 0, 255 ]
	];
	if(cols !== undefined) {
		for(let i = 0; i < cols.length; i++){
			let col = VehicleColours[cols[i]];
			if (col == null) continue;
			carColors[i][0] = col[0];
			carColors[i][1] = col[1];
			carColors[i][2] = col[2];
		}
	}
}

function LoadColors(cols)
{
	SetCarColors(cols);
	setVehicleColors(modelinfo, carColors[0], carColors[1], carColors[2], carColors[3]);
}

function SelectModel(model)
{
	vehiclesList.find(x => x.name == model).colors = [];
	CurrentModel = vehiclesList.find(x => x.name == model);
	if (carcolsLines[model]?.line) {
		let line = carcolsLines[model].line.replace(/,/g, " ").replace(/#.*/g, "").trim().toLowerCase();
		let fields = line.split(/[\t ]+/);
		if (carcolsLines[model].line.split(",")[3]?.includes(" ") === false) {
			LoadVehicleColour4(fields);
		} else LoadVehicleColour(fields);
	}

	let vehGameNameEl = document.getElementById('veh-game-name-viewer');
	let vehNameEl = document.getElementById('veh-name-viewer');
	let vehIdEl = document.getElementById('veh-id-viewer');
	vehGameNameEl.textContent = CurrentModel.gameName;
	vehNameEl.textContent = CurrentModel.name;
	vehIdEl.textContent = CurrentModel.id;

	vehGameNameEl.addEventListener("click", () => {
		if (!CurrentModel) return;
		copyContent(CurrentModel.gameName);
	});
	vehNameEl.addEventListener("click", () => {
		if (!CurrentModel) return;
		copyContent(CurrentModel.name);
	});
	vehIdEl.addEventListener("click", () => {
		if (!CurrentModel) return;
		copyContent(CurrentModel.id);
	});

	let colortable = document.getElementById('colors');
	removeChildren(colortable);

	let col1 = [ 0, 0, 0, 255 ];
	let col2 = [ 0, 0, 0, 255 ];
	for(let i = 0; i < CurrentModel.colors.length; i++){
		let c = CurrentModel.colors[i];
		let c1 = VehicleColours[c[0]];
		let c2 = VehicleColours[c[1]];
		if (c1 == null) continue;
		if (c2 == null) continue;

		if(i == 0){
			col1[0] = c1[0];
			col1[1] = c1[1];
			col1[2] = c1[2];
			col2[0] = c2[0];
			col2[1] = c2[1];
			col2[2] = c2[2];
		}
		let tr = document.createElement('tr');
		for(let j = 0; j < c.length; j++){
			let col = VehicleColours[c[j]];
			if (col == null) continue;

			let td = document.createElement('td');
			td.width = "16px";
			td.height = "16px";
			td.style = "background-color: rgb("+col[0]+","+col[1]+","+col[2]+")";
			tr.appendChild(td);
		}
		tr.onclick = function() { LoadColors(c); };
		colortable.appendChild(tr);
	}

	camDist = 5.0;
	camPitch = 0.3;
	camYaw = 1.0;
	SetCarColors(CurrentModel.colors[0]);

	loadCarSA(CurrentModel);
}

function StartUI()
{
	let objects = document.getElementById('objects');
	removeChildren(objects);
	for(let model in ModelInfosName){
		let option = document.createElement('option');
		option.innerHTML = ModelInfosName[model].id+ " " + model;
		option.onclick = function(){ SelectModel(model); };
		objects.appendChild(option);
	}
}

function LoadVehicle(fields)
{
	let id = Number(fields[0]);
	let mi = {};
	mi.id = id;
	mi.type = "vehicle";
	mi.model = fields[1];
	mi.txd = fields[2];
	mi.vehtype = fields[3];
	mi.handling = fields[4];
	if(mi.vehtype == "car"){
		// TODO: check SA
		mi.wheelId = Number(fields[11]);
		mi.wheelScale = Number(fields[12]);
	}
	mi.colors = [];
	ModelInfos[mi.id] = mi;
	ModelInfosName[mi.model] = mi;
}

function LoadColour(fields)
{
	let r = Number(fields[0]);
	let g = Number(fields[1]);
	let b = Number(fields[2]);
	VehicleColours.push([r, g, b]);
}

function LoadVehicleColour(fields)
{
	let mi = vehiclesList.find(x => x.name == fields[0]);
	if (mi == null) return;
	for(let i = 1; i < fields.length; i += 2){
		let c1 = Number(fields[i]);
		let c2 = Number(fields[i+1]);
		mi.colors.push([c1, c2]);
	}
}

function LoadVehicleColour4(fields)
{
	let mi = vehiclesList.find(x => x.name == fields[0]);
	if (mi == null) return;
	for(let i = 1; i < fields.length; i += 4){
		let c1 = Number(fields[i]);
		let c2 = Number(fields[i+1]);
		let c3 = Number(fields[i+2]);
		let c4 = Number(fields[i+3]);
		mi.colors.push([c1, c2, c3, c4]);
	}
}

function LoadObjectTypes(text)
{
	LoadSectionedFile(text, {
		"cars": LoadVehicle
	});
}

function LoadVehicleColours(text)
{
	LoadSectionedFile(text, {
		"col": LoadColour,
		"car": LoadVehicleColour,
		"car4": LoadVehicleColour4
	});
}

function LoadSectionedFile(text, sections)
{
	let section = "end";
	let lines = text.split("\n");
	for(let i = 0; i < lines.length; i++){
		let line = lines[i].replace(/,/g, " ").replace(/#.*/g, "").trim().toLowerCase();
		if(line.length == 0)
			continue;
		let fields = line.split(/[\t ]+/);

		if(section == "end"){
			section = fields[0];
			continue;
		}
		if(fields[0] == "end"){
			section = "end";
			continue;
		}

		if(section in sections)
			sections[section](fields);
	}
}

function loadText(filename, cb)
{
	let req = new XMLHttpRequest();
	req.open("GET", DataDirPath + "/" + filename, true);
	req.responseType = "text";

	req.onload = function(oEvent){
		cb(req.response);
	};

	req.send(null);
}

function loadVehicleViewer(idefile, CB)
{
	VehicleColours = [];
	ModelInfos = {};
	ModelInfosName = {};
	CurrentModel = null;

	loadText(idefile, function(text){
		LoadObjectTypes(text);
		loadText("carcols.dat", function(text){
			LoadVehicleColours(text);
			loadModelTXD("vehicle.txd", function(vehTxd) {
				globalTxd = vehTxd;
				StartUI();
				CB();
			}, DataDirPath);
		});
	});
}
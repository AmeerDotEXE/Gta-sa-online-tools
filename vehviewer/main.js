var DataDirPath;
var ModelsDirPath;
var TexturesDirPath;
var TxdDirPath;

// init info
var isIIICar;
var isSACar;
var carColors;

// the scene
var running = false;
var myclump;
var myTxd;
var globalTxd;
var modelinfo;
var camPitch;
var camYaw;
var camDist;
var camScroll = true;

// gl things
var state = {};
var whitetex;
var camera;

var envFrame;
var defaultProgram;
var envMapProgram;
var carPS2Program;

var allVehWheels = [];

function deg2rad(d) { return d / 180.0 * Math.PI; }

var rotating, zooming;

function mouseDown(e)
{
	if(e.button == 0)
		rotating = true;
	else if(e.button == 1) {
		zooming = true;
	}
	old_x = e.pageX;
	old_y = e.pageY;
	camScroll = false;
	e.preventDefault();
}

function mouseUp(e)
{
	rotating = false;
	zooming = false;
}

function mouseMove(e)
{
	let dX, dY;
	if(rotating){
		dX = (e.pageX-old_x)*2*Math.PI/gl.canvas.width,
		dY = (e.pageY-old_y)*2*Math.PI/gl.canvas.height;

		camYaw -= dX;
		camPitch += dY*0.75;
		if(camPitch > Math.PI/2 - 0.01) camPitch = Math.PI/2 - 0.01
		if(camPitch < -Math.PI/2 + 0.01) camPitch = -Math.PI/2 + 0.01

		old_x = e.pageX;
		old_y = e.pageY;
		e.preventDefault();
	}
	if(zooming){
		dY = (e.pageY-old_y)/gl.canvas.height;

		camDist += dY;
		if(camDist < 0.1) camDist = 0.1;

		old_x = e.pageX;
		e.preventDefault();
	}
};
function mouseScroll(e)
{
	camDist += e.deltaY / 400;
	if(camDist < 0.1) camDist = 0.1;
	e.preventDefault();
};

function InitRW()
{
console.log("InitRW()");
	let canvas = document.querySelector('#glcanvas');
	gl = canvas.getContext('webgl');

	if(!gl){
		alert('Unable to initialize WebGL. Your browser or machine may not support it.');
		return;
	}

	canvas.addEventListener("mousedown", mouseDown, false);
	canvas.addEventListener("mouseup", mouseUp, false);
	canvas.addEventListener("mouseout", mouseUp, false);
	canvas.addEventListener("mousemove", mouseMove, false);
	canvas.addEventListener("mousewheel", mouseScroll, false);

	whitetex = loadTexture("textures/white.png");

	defaultProgram = loadShaders(defaultVS, defaultFS);
	envMapProgram = loadShaders(envVS, envFS);
	carPS2Program = loadShaders(carPS2VS, carPS2FS);

	state.alphaRef = 0.1;
	state.projectionMatrix = mat4.create();
	state.viewMatrix = mat4.create();
	state.worldMatrix = mat4.create();
	state.envMatrix = mat4.create();
	state.matColor = vec4.create();
	state.surfaceProps = vec4.create();
	state.ambLight = vec3.fromValues(0.4, 0.4, 0.4);
	const alpha = 45;
	const beta = 45;
	state.lightDir = vec3.fromValues(
		-Math.cos(deg2rad(beta))*Math.cos(deg2rad(alpha)),
		-Math.sin(deg2rad(beta))*Math.cos(deg2rad(alpha)),
		-Math.sin(deg2rad(alpha))
	);
	state.lightCol = vec3.fromValues(1.0, 1.0, 1.0);


	AttachPlugins();

	camera = RwCameraCreate();
	camera.nearPlane = 0.1;
	camera.farPlane = 100.0;
	let frm = RwFrameCreate();
	RwCameraSetFrame(camera, frm);

	const fov = deg2rad(70);
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	camera.viewWindow[1] = Math.tan(fov / 2);
	camera.viewWindow[0] = camera.viewWindow[1]*aspect;

	envFrame = RwFrameCreate();
	mat4.rotateX(envFrame.matrix, envFrame.matrix, deg2rad(60));
	rwFrameSynchLTM(envFrame);
}

function displayFrames(frame, parelem)
{
	let li = document.createElement('li');
	li.innerHTML = frame.name;
	for(let i = 0; i < frame.objects.length; i++){
		let o = frame.objects[i];
		if(o.type == rwID_ATOMIC){
			let checkbox = document.createElement('input');
			checkbox.type = "checkbox";
			checkbox.onclick = function() { o.visible = checkbox.checked; };
			checkbox.checked = o.visible;
			li.appendChild(checkbox);
		}
	}
	parelem.appendChild(li);
	if(frame.child){
		let ul = document.createElement('ul');
		parelem.appendChild(ul);
		for(let c = frame.child; c != null; c = c.next)
			displayFrames(c, ul);
	}
}

function putControl()
{
//	let ctl = document.getElementById('control');
//	let reloadbtn = document.createElement('input');
//	reloadbtn.type = "button";
//	reloadbtn.value = "reload";
//	reloadbtn.onclick = reload;
//	ctl.appendChild(reloadbtn);
}


function loadCarIII(CurrentModel)
{
	loadDFF(CurrentModel.model + ".dff", function(clump){
		myclump = clump;
		modelinfo = processVehicle(myclump);
		setupIIICar(myclump);
		setVehicleColors(modelinfo, carColors[0], carColors[1]);
		main();
	});
}

function loadCarVC(CurrentModel)
{
	loadDFF(CurrentModel.model + ".dff", function(clump){
		myclump = clump;
		modelinfo = processVehicle(myclump);
		setVehicleColors(modelinfo, carColors[0], carColors[1]);
		main();
	});
}

async function loadCarSA(car, callback)
{
	if (car.filePaths.dff == null) return;
	// console.log(car);
	CurrentModel = car;

	let txdDir = await loadModelTXD(car.filePaths.txd);
	myTxd = txdDir;
	await loadDFF(car.filePaths.dff, function(clump){
		myclump = clump;
		allVehWheels = [];
		//camScroll = true;
		modelinfo = processVehicle(myclump);
		setupSACar(myclump);
		setVehicleColors(modelinfo,
			carColors[0], carColors[1], carColors[2], carColors[3]);
		// setVehicleLightColors(modelinfo,
		// 	[ 128, 0, 0, 255 ],
		// 	[ 128, 0, 0, 255 ],
		// 	[ 128, 0, 0, 255 ],
		// 	[ 128, 0, 0, 255 ]);

		main();
		if (typeof callback == "function") {
			callback();
		}
	});
}

function loadModel(filename)
{
	loadDFF(filename, function(clump){
		myclump = clump;
		main();
	});
}

function removeChildren(x)
{
	while(x.firstChild)
		x.removeChild(x.firstChild);
}

function findNodeInFrame(frame, name) {
	if (frame.name == name) return frame;

	let temp = frame.next;
	while (temp != null && temp.name != name) temp = temp.next;
	if (temp?.name == name) return temp;

	temp = frame;
	while (temp != null) {
		if (temp.child == null) {
			temp = temp.next;
			continue;
		}
		let result = findNodeInFrame(temp.child, name);
		if (result != null) return result;
		temp = temp.next;
	}
	return null;
}

function main()
{
	//let ul = document.getElementById('veh-hir');
	//removeChildren(ul);
	//displayFrames(myclump.frame, ul);

	//let spoilerPlace = findNodeInFrame(myclump.frame, "ug_spoiler");
	//if (CurrentModel.lines.carmods?.includes("spl_") && spoilerPlace == null)
	//	console.warn("===============================", "spoiler", CurrentModel, "===============================");

	if(!running){
		running = true;

		putControl();

		let then = 0;
		function render(now){
			now *= 0.001;  // convert to seconds
			const deltaTime = now - then;
			then = now;
	
			if (camScroll) camYaw += 0.002;
			allVehWheels.forEach((whel) => {
				mat4.rotateX(whel.ltm, whel.ltm, -0.02);
			});
			drawScene(deltaTime);
	
			requestAnimationFrame(render);
		}
		requestAnimationFrame(render);
	}
}

function setupIIICar(clump)
{
	for(let i = 0; i < clump.atomics.length; i++){
		let a = clump.atomics[i];
		a.pipeline = matFXPipe;
		for(let j = 0; j < a.geometry.materials.length; j++){
			m = a.geometry.materials[j];
			if(m.surfaceProperties[1] <= 0.0)
				continue;
			m.matfx = {
				type: 2,
				envCoefficient: m.surfaceProperties[1],
				envTex: RwTextureRead("reflection01", "")
			};
		}
	}
}

function setupSACar(clump)
{
	for(let i = 0; i < clump.atomics.length; i++){
		let a = clump.atomics[i];
		a.pipeline = carPipe;
		for(let j = 0; j < a.geometry.materials.length; j++){
			m = a.geometry.materials[j];
			m.fxFlags = 0;
			if(!m.matfx || m.matfx.type != 2) continue;

			if(m.matfx.envTex && m.envMap && m.envMap.shininess != 0){
				m.envMap.texture = m.matfx.envTex;
				if(m.envMap.texture.name[0] == 'x')
					m.fxFlags |= 2;
				else
					m.fxFlags |= 1;
			}

			if(m.specMap && m.specMap.specularity != 0)
				m.fxFlags |= 4;
		}
	}
}

function setVehicleColors(vehinfo, c1, c2, c3, c4)
{
	for(let i = 0; i < vehinfo.firstMaterials.length; i++)
		vehinfo.firstMaterials[i].color = c1;
	for(let i = 0; i < vehinfo.secondMaterials.length; i++)
		vehinfo.secondMaterials[i].color = c2;
	for(let i = 0; i < vehinfo.thirdMaterials.length; i++)
		vehinfo.thirdMaterials[i].color = c3;
	for(let i = 0; i < vehinfo.fourthMaterials.length; i++)
		vehinfo.fourthMaterials[i].color = c4;
}

function setVehicleLightColors(vehinfo, c1, c2, c3, c4)
{
	for(let i = 0; i < vehinfo.firstLightMaterials.length; i++)
		vehinfo.firstLightMaterials[i].color = c1;
	for(let i = 0; i < vehinfo.secondLightMaterials.length; i++)
		vehinfo.secondLightMaterials[i].color = c2;
	for(let i = 0; i < vehinfo.thirdLightMaterials.length; i++)
		vehinfo.thirdLightMaterials[i].color = c3;
	for(let i = 0; i < vehinfo.fourthLightMaterials.length; i++)
		vehinfo.fourthLightMaterials[i].color = c4;
}

function findEditableMaterials(geo, vehinfo)
{
	for(let i = 0; i < geo.materials.length; i++){
		m = geo.materials[i];
		if(m.color[0] == 0x3C && m.color[1] == 0xFF && m.color[2] == 0)
			vehinfo.firstMaterials.push(m);
		else if(m.color[0] == 0xFF && m.color[1] == 0 && m.color[2] == 0xAF)
			vehinfo.secondMaterials.push(m);
		else if(m.color[0] == 0 && m.color[1] == 0xFF && m.color[2] == 0xFF)
			vehinfo.thirdMaterials.push(m);
		else if(m.color[0] == 0xFF && m.color[1] == 0x00 && m.color[2] == 0xFF)
			vehinfo.fourthMaterials.push(m);
		else if(m.color[0] == 0xFF && m.color[1] == 0xAF && m.color[2] == 0)
			vehinfo.firstLightMaterials.push(m);
		else if(m.color[0] == 0 && m.color[1] == 0xFF && m.color[2] == 0xC8)
			vehinfo.secondLightMaterials.push(m);
		else if(m.color[0] == 0xB9 && m.color[1] == 0xFF && m.color[2] == 0)
			vehinfo.thirdLightMaterials.push(m);
		else if(m.color[0] == 0xFF && m.color[1] == 0x3C && m.color[2] == 0)
			vehinfo.fourthLightMaterials.push(m);
	}
}

function processVehicle(clump)
{
	let vehicleInfo = {
		firstMaterials: [],
		secondMaterials: [],
		thirdMaterials: [],
		fourthMaterials: [],
		firstLightMaterials: [],	// front left
		secondLightMaterials: [],	// front right
		thirdLightMaterials: [],	// back left
		fourthLightMaterials: [],	// back right
		clump: clump
	};
	wheelNum = 0
	for(let i = 0; i < clump.atomics.length; i++){
		a = clump.atomics[i];
		f = a.frame;
		if(f.name.endsWith("_dam") ||
		   f.name.endsWith("_lo") ||
		   f.name.endsWith("_vlo"))
			a.visible = false;
		if(f.name == "wheel" && allVehWheels.length == 0) {
			// let cleanA = JSON.parse(JSON.stringify(a, (key, val) => {
			// 	if (key == "objects") console.log(key, val)
			// 	if (key == "objects" && val.length == 1) return [];
			// 	if (key == "parent") return null;
			// 	if (key == "root") return null;
			// 	return val
			// }))
			// cleanA.geometry = a.geometry
			// cleanA.pipeline = a.pipeline
			// cleanA.frame.objects.push(cleanA)
			// // cleanA.frame.parent = clump.frame.child.next.next.next.next
			// cleanA.frame.parent = f.parent
			// cleanA.frame.root = f.root
			// cleanA.frame.ltm[12] = -0.9056603312492371
			// cleanA.frame.ltm[0] = -1
			// console.log("cleanA", cleanA);
			// f.child = cleanA.frame
			// // clump.frame.child.next.next.next.next.child = cleanA.frame
			// clump.atomics.push(cleanA)
			// console.log("oldA", a);
			// f.name = "rfWheel"
			let lfWheelParent = f.parent.parent?.child;
			let lbWheelParent = f.parent.parent?.child;
			let rbWheelParent = f.parent.parent?.child;
			while (lfWheelParent != null && !lfWheelParent.name.startsWith("wheel_lf"))
				lfWheelParent = lfWheelParent.next
			while (lbWheelParent != null && !lbWheelParent.name.startsWith("wheel_lb"))
				lbWheelParent = lbWheelParent.next
			while (rbWheelParent != null && !rbWheelParent.name.startsWith("wheel_rb"))
				rbWheelParent = rbWheelParent.next

			// console.log("nextWheel", nextWheel, f)
			var lfWheel = CreateWheelFromOriginal(a, lfWheelParent)
			if (lfWheelParent) {
				lfWheel.frame.ltm[0] *= -1
				clump.atomics.push(lfWheel)
			}

			var lbWheel = CreateWheelFromOriginal(lfWheel, lbWheelParent)
			if (lbWheelParent) {
				lbWheel.frame.ltm[0] *= -1
				clump.atomics.push(lbWheel)
			}

			var rbWheel = CreateWheelFromOriginal(lbWheel, rbWheelParent)
			if (rbWheelParent) clump.atomics.push(rbWheel)

			allVehWheels.push(a.frame);
			if (lfWheelParent) allVehWheels.push(lfWheel.frame);
			if (lbWheelParent) allVehWheels.push(lbWheel.frame);
			if (rbWheelParent) allVehWheels.push(rbWheel.frame);
		}
		findEditableMaterials(a.geometry, vehicleInfo);
	}
	// console.log("clump", clump);
	return vehicleInfo;
}

function CreateWheelFromOriginal(a, newPlace) {
	if (newPlace == null) return null;
	var f = a.frame
	let cleanA = JSON.parse(JSON.stringify(a, (key, val) => {
		// if (key == "objects") console.log(key, val)
		if (key == "objects" && val.length == 1) return [];
		if (key == "parent") return null;
		if (key == "root") return null;
		return val
	}))
	cleanA.geometry = a.geometry
	cleanA.pipeline = a.pipeline
	cleanA.frame.objects.push(cleanA)
	window.whel = cleanA.frame;
	// cleanA.frame.parent = clump.frame.child.next.next.next.next
	cleanA.frame.parent = f.parent
	cleanA.frame.root = f.root
	// console.log("cleanA", cleanA);
	// f.next = cleanA.frame
	// clump.frame.child.next.next.next.next.child = cleanA.frame

	cleanA.frame.ltm = newPlace.ltm
	cleanA.frame.parent = newPlace
	newPlace.child = cleanA.frame
	return cleanA
}

function drawScene(deltaTime)
{
//	camYaw += deltaTime;

	gl.clearColor(0.5, 0.5, 0.5, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	let x = camDist * Math.cos(camYaw)* Math.cos(camPitch);
	let y = camDist * Math.sin(camYaw)* Math.cos(camPitch);
	let z = camDist * Math.sin(camPitch);
	RwFrameLookAt(camera.frame, 
		[ x, y, z ],
		[ 0.0, 0.0, 0.0 ],
		[ 0.0, 0.0, 1.0 ]);
	rwFrameSynchLTM(camera.frame);

	RwCameraBeginUpdate(camera);

	RenderPass = 0;
	RpClumpRender(myclump);
	RenderPass = 1;
	RpClumpRender(myclump);
	RenderPass = -1;
}


async function loadDFF(filepath, cb)
{
	let arrayBuffer = await files[filepath]?.file.arrayBuffer()
	if(!arrayBuffer) return;

	stream = RwStreamCreate(arrayBuffer);

	if(RwStreamFindChunk(stream, rwID_CLUMP)){
		let c = RpClumpStreamRead(stream);
		if(c != null)
			cb(c);
	}
	return null;
}

async function loadModelTXD(filepath)
{
	let arrayBuffer = await files[filepath]?.file.arrayBuffer()
	if(!arrayBuffer) return;

	stream = RwStreamCreate(arrayBuffer);
	// console.log(arrayBuffer, stream);

	if(RwStreamFindChunk(stream, rwID_TexDictionary)){
		// console.log(stream)
		let c = RpTexDictionaryStreamRead(stream);
		// console.log("tex dictionary", c);
		return c;
	}
	// console.log(false)
	return null;
}
function fetchModelTXD(filepath, cb)
{
	let req = new XMLHttpRequest();
	req.open("GET", filepath, true);
	req.responseType = "arraybuffer";

	req.onload = function(oEvent){
		let arrayBuffer = req.response;
		if(arrayBuffer){
			stream = RwStreamCreate(arrayBuffer);

			if(RwStreamFindChunk(stream, rwID_TexDictionary)){
                // console.log(stream)
				let c = RpTexDictionaryStreamRead(stream);
				// console.log("tex dictionary", c);
				if(c != null)
					cb(c);
			}
            // console.log(false)
			return null;
		}
	};

	req.send(null);
}
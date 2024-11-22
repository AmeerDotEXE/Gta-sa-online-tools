// Define a message handler for the Web Worker
self.onmessage = function(event) {
	// This function is called when the main script sends a message to the worker
	const messageFromMainScript = event.data;

	// console.log("Test Started");
	var tInit = Date.now();
	for (let i = messageFromMainScript[0]; i < messageFromMainScript[1]; i++) {
		//testing INeedSomeHelp number 288560596
		// alex_crc32("PLEHEMOSDEENI");
		let result = alex_crc32(getSequence(i));
		if (result === 288560596) console.warn(getSequence(i));
	}
	var tDuration = Date.now() - tInit;
	// console.log("done", tEnd);

	// Send a message back to the main script
	self.postMessage({
		runDuration: tDuration,
	});
};
  

// Alex
var makeCRCTable = function(){
	var c;
	var crcTable = [];
	for(var n =0; n < 256; n++){
		c = n;
		for(var k =0; k < 8; k++){
			c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
		}
		crcTable[n] = c;
	}
	return crcTable;
}
var crcTable = makeCRCTable();
var alex_crc32 = function(str) {
	var crc = 0 ^ (-1);

	for (var i = 0; i < str.length; i++ ) {
		crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
	}

	return (crc ^ (-1)) >>> 0;
};


// not alex
const letters = ["w","a"];
const MinimumLetterLength = 6;
function getSequence(id) {
	let numberSequence = id.toString(letters.length).padStart(MinimumLetterLength, 0);

	return numberSequence.split("").map(num => letters[num]).join("");
}
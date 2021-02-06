var skynet = require('skynet-js');
var blake = require('blakejs');
var buffer = require('buffer');
var aes = require('aes-js');
var base64 = require('js-base64');

var client = new skynet.SkynetClient();
window.defaultPortal = skynet.defaultSkynetPortalUrl;
window.appId = 'SkyLearn-4qAM4dNgUDI2mNF3B82zMno';
const seedGenFile = 'english.txt';
const repoGenFile = 'words3.txt';

window.changeDefaultPortal = function(url) {
	window.defaultPortal = url;
	client = new skynet.SkynetClient(url);
}

window.fromRegistry = async function(seed) {
	const {publicKey, privateKey} = skynet.genKeyPairFromSeed(seed);
	try {
		const {data, revision} = await client.db.getJSON(publicKey, window.appId);
		return {data, revision};
	} catch (error) {
		console.log(error);
		return null;
	}
}

window.toRegistry = async function(seed, json) {
	const {publicKey, privateKey} = skynet.genKeyPairFromSeed(seed);
	try {
		await client.db.setJSON(privateKey, window.appId, json);
	} catch (error) {
		console.log(error);
	}
}

function NewHash() {
	return blake.blake2bInit(32, null);
}

function HashAll(...args) {
	const h = NewHash();
	for (let i = 0; i < args.length; i++) {
		blake.blake2bUpdate(h, args[i]);
	}
	return blake.blake2bFinal(h);
}

function HashDataKey(datakey) {
	return HashAll(encodeString(datakey));
}

function encodeNumber(num) {
	const encoded = new Uint8Array(8);
	for (let index = 0; index < encoded.length; index++) {
		const byte = num & 0xFF;
		encoded[index] = byte;
		num = num >> 8;
	}
	return encoded;
}

function encodeString(str) {
	const encoded = new Uint8Array(8 + str.length);
	encoded.set(encodeNumber(str.length));
	encoded.set(stringToUint8Array(str), 8);
	return encoded;
}

function stringToUint8Array(str) {
	return Uint8Array.from(buffer.Buffer.from(str));
}

function hexToUint8Array(str) {
	return new Uint8Array(str.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

window.keyPairFromSeed = function(seed) {
	return skynet.genKeyPairFromSeed(seed);
}

function from32To24(arr32) {
	const arr24 = new Array(24);
	let bits = 8;
	let bits32 = 8;
	let bits24 = 11;
	let sh = 0;
	let maskLow = 0;
	let maskHigh = 7;
	let mask;
	let curr24 = 0;
	let curr32 = 0;
	let byte;
	while (curr32 < 32) {
		mask = (1 << (maskHigh + 1)) - (1 << maskLow);
		byte = arr32[curr32] & mask;
		if (sh >= maskLow) {
			arr24[curr24] |= byte << (sh - maskLow);
		} else {
			arr24[curr24] |= byte >> (maskLow - sh);
		};
		bits32 = bits32 - bits;
		if (bits32 == 0) {
			bits32 = 8;
			curr32++;
		};
		bits24 = bits24 - bits;
		if (bits24 == 0) {
			bits24 = 11;
			curr24++;
		};
		sh = (sh + bits) % 11;
		bits = Math.min(bits24, bits32);
		maskLow = (maskHigh + 1) % 8;
		maskHigh = maskLow + bits - 1;
	};
	return arr24;
}

function from24To32(arr24) {
	const arr32 = new Uint8Array(32);
	let bits = 8;
	let bits32 = 8;
	let bits24 = 11;
	let maskLow = 0;
	let maskHigh = 7;
	let mask;
	let curr24 = 0;
	let curr32 = 0;
	let byte;
	while (curr32 < 32) {
		mask = (1 << (maskHigh + 1)) - (1 << maskLow);
		byte = (arr24[curr24] & mask) >> maskLow;
		arr32[curr32] |= byte << (8 - bits32);
		bits32 = bits32 - bits;
		if (bits32 == 0) {
			bits32 = 8;
			curr32++;
		};
		bits24 = bits24 - bits;
		if (bits24 == 0) {
			bits24 = 11;
			curr24++;
		};
		bits = Math.min(bits24, bits32);
		maskLow = (maskHigh + 1) % 11;
		maskHigh = maskLow + bits - 1;
	};
	return arr32;
}

window.generateSeed = async function(username, password) {
	const aesKey = HashDataKey(window.appId);
	const aesIV = new Uint8Array(16);
	aesIV.set(stringToUint8Array(window.appId).slice(0, 16));
	const input = new Uint8Array(32);
	input.set(aes.utils.utf8.toBytes(username));
	input.set(aes.utils.utf8.toBytes(password), 32 - password.length);
	const aesCbc = new aes.ModeOfOperation.cbc(aesKey, aesIV);
	const enc = aesCbc.encrypt(input);
	const num = from32To24(enc);
	return await getWords(num);
}

window.recoverPassword = async function(seed) {
	const aesKey = HashDataKey(window.appId);
	const aesIV = new Uint8Array(16);
	aesIV.set(stringToUint8Array(window.appId).slice(0, 16));
	const num = await getNumbers(seed);
	if (num) {
		const enc = from24To32(num);
		const aesCbc = new aes.ModeOfOperation.cbc(aesKey, aesIV);
		const output = aesCbc.decrypt(enc);
		const str = aes.utils.utf8.fromBytes(output);
		const ind = str.indexOf(String.fromCharCode(0));
		if (ind >= 0) {
			const user = str.slice(0, str.indexOf(String.fromCharCode(0)));
			const pwd = str.slice(str.lastIndexOf(String.fromCharCode(0)) + 1);
			return { username: user, password: pwd };
		}
	}
	return { username: '', password: '' };
}

async function getWords(numbers) {
	let text = await window.downloadFile(seedGenFile);
	if (text != '') {
		let lines = text.split('\n');
		let result = numbers.map((i) => {return lines[i]}).join(' ');
		return result;
	} else {
		return null;
	}
}

async function getNumbers(phrase) {
	let text = await window.downloadFile(seedGenFile);
	if (text != '') {
		let lines = text.split('\n');
		let words = phrase.split(' ');
		let result = new Array(words.length);
		let b = true;
		let n;
		words.forEach((w, i) => {
			n = lines.indexOf(words[i]);
			if (n < 0) b = false;
			result[i] = n;
		});
		if (b) {
			return result;
		} else {
			return null;
		}
	} else {
		return null;
	}
}

function executeRequest(method, link, data, options = {}) {
	return new Promise(function (resolve, reject) {
		let req = new XMLHttpRequest();
		req.open(method, link);
		if (options && options.timeout) {
			req.timeout = options.timeout;
		} else {
			req.timeout = 5000;
		}
		if (options && options.onUploadProgress) {
			req.upload.onprogress = options.onUploadProgress;
		}
		req.onload = function () {
			if (this.status >= 200 && this.status < 300) {
				resolve(this);
			} else {
				reject(this);
			}
		}
		req.ontimeout = function () {
			reject(this);
		}
		req.send(data);
	});
}

window.downloadFile = async function(link) {
	let fullLink = link;
	if (link.indexOf('https://') == -1) {
		const href = window.location.href;
		fullLink = href.slice(0, href.lastIndexOf('/') + 1) + link;
	}
	try {
		let req = await executeRequest('GET', fullLink, null);
		if (req.status == 200) {
			return req.responseText;
		} else {
			throw new Error('Could not download file: ' + req.responseText);
		}
	} catch (error) {
		console.log(error);
		return '';
	}
}

window.appendKey = async function(key) {
	const seed = buffer.Buffer.from(HashDataKey(window.appId)).toString('hex');
	const input = new Uint8Array(32);
	input.set(stringToUint8Array('{' + key + '}').slice(0, 32));
	const aesKey = HashAll(encodeString(window.appId), encodeString(key));
	let aesEcb = new aes.ModeOfOperation.ecb(aesKey);
	let encrypted = aesEcb.encrypt(input);
	const {data} = await window.fromRegistry(seed);
	if (!data) {
		const newData = {database: base64.Base64.fromUint8Array(encrypted)};
		await window.toRegistry(seed, newData);
		return true;
	} else {
		const database = data.database;
		if (!database) {
			throw new Error('Error: database is corrupt');
		}
		aesEcb = new aes.ModeOfOperation.ecb(aesKey);
		if (database.length > 0) {
			const oldDB = base64.Base64.toUint8Array(database);
			const decrypted = aes.utils.utf8.fromBytes(aesEcb.decrypt(oldDB));
			if (decrypted.indexOf(key) >= 0) {
				return false;
			}
			aesEcb = new aes.ModeOfOperation.ecb(aesKey);
			const newDB = new Uint8Array(oldDB.length + encrypted.length);
			newDB.set(oldDB);
			newDB.set(encrypted, oldDB.length);
			const newData = {database: base64.Base64.fromUint8Array(newDB)};
			await window.toRegistry(seed, newData);
			return true;
		} else {
			return false;
		}
	}
}

window.keyExists = async function(key) {
	const seed = buffer.Buffer.from(HashDataKey(window.appId)).toString('hex');
	const {data} = await window.fromRegistry(seed);
	if (data) {
		const database = data.database;
		if (!database) {
			throw new Error('Error: database is corrupt');
		}
		const aesKey = HashAll(encodeString(window.appId), encodeString(key));
		const aesEcb = new aes.ModeOfOperation.ecb(aesKey);
		if (database.length > 0) {
			const decrypted = aes.utils.utf8.fromBytes(aesEcb.decrypt(base64.Base64.toUint8Array(database)));
			if (decrypted.indexOf(key) >= 0) {
				return true;
			}
		}
	}
	return false;
}

window.createAppId = function(id) {
	if (id.length >= 32) {
		return id;
	}
	const asciiChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
	let result = id + '-';
	for (let i = result.length; i < 32; i++) {
		result = result + asciiChars[Math.floor(Math.random() * asciiChars.length)];
	}
	return result;
}

window.generateRepoName = async function() {
	const text = await window.downloadFile(repoGenFile);
	if (text == '') {
		return '';
	}
	const parts = text.split('\n');
	parts[0] = parts[0].slice(0, parts[0].length - 1);
	parts[1] = parts[1].slice(0, parts[1].length - 1);
	const words0 = parts[0].split(',');
	const words1 = parts[1].split(',');
	const words2 = parts[2].split(',');
	return words0[Math.floor(Math.random() * 100)] +
		words1[Math.floor(Math.random() * 100)] +
		words2[Math.floor(Math.random() * 100)];
}

window.uploadDirectory = async function(dir, base) {
	try {
		const {skylink} = await client.uploadDirectory(dir, base);
		return skylink.slice(skylink.indexOf(':') + 1);
	} catch (error) {
		console.log(error);
		return '';
	}
}

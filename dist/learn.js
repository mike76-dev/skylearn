var seed;
var user = '';
var repo = '';
var repos = [];
var currentRepo = 0;

var hiddenNav = false;
var hiddenCode = false;
var hiddenConsole = false;
var smallScreen = false;

var navSection;
var codeSection;
var consoleSection;
var main;
var codeArea;
var terminalInput;
var output;

var tree;
var activeItem = null;
var itemToDelete = null;
var editingItem = null;

var tabCharacter = '\t';
var softwareTabs = false;
var atomicSoftTabs = true;
var tabSize = 2;
var softWrap = true;
var indentedSoftWrap = false;
var showMargin = true;
var marginOffset = 80;
var showInvisibles = false;
var showGuides = true;
var autoIndent = true;
var addClosing = true;
var autoCompletion = false;
var keyBindings = 'default';
var darkMode = false;
var autoSave = 30;

var changed = false;
var runClicked = false;
var running = false;
var executing = false;
var consoleFocus = false;

const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
const isMobile = /Android|webOS|iPhone|iPad|iPod|Blackberry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const invalidFileNameChars = [
	'`', '~', '!', '@', '#', '$', '%', '^',
	'&', '*', '(', ')', '=', '+', '[', '{',
	']', '}', ';', ':', "'", '"', '\\', '|',
	',', '<', '>', '/', '?'
];

const nonEditingKeys = [
	'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7',
	'F8', 'F9', 'F10', 'F11', 'F12', 'PrintScreen', 'CapsLock', 'NumLock',
	'ScrollLock', 'Pause', 'Shift', 'Control', 'Alt', 'Meta', 'ContextMenu', 'PageUp',
	'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'
];

var importPath = '';
var brythonLoaded = false;
var brythonOptions = {
	debug: 1,
	pythonpath: []
};
var imported;

function initialize() {
	navSection = document.getElementById('nav-section');
	codeSection = document.getElementById('code-section');
	consoleSection = document.getElementById('console-section');
	main = document.getElementsByTagName('main')[0];
	tree = document.getElementById('files-tree');
	codeArea = document.getElementById('code-area');
	terminalInput = document.getElementById('terminal-input');
	output = document.getElementById('terminal');
	output.replaceChild(document.createTextNode('Loading Python...'), output.firstChild);
	resizeInput();
	if (window.innerWidth <= 600) {
		smallScreen = true;
		codeSection.style.display = 'none';
		consoleSection.style.display = 'none';
	}
	dragSeparators();
	brython(brythonOptions);
	imported = __BRYTHON__.imported;
}

function initEditor(ed, name, contents) {
	const py = (name.slice(name.lastIndexOf('.') + 1) === 'py');
	ed.editor = ace.edit(ed.id);
	ed.editor.setValue(contents);
	ed.editor.getSession().getUndoManager().reset();
	ed.editor.navigateFileStart();
	ed.firstElementChild.classList.add('focusable');
	ed.editor.commands.addCommand({
		name: 'disableHelp',
		exec: function() {},
		bindKey: {mac: 'F1', win: 'F1'}
	});
	ed.editor.commands.addCommand({
		name: 'disableSettings',
		exec: function() {},
		bindKey: {mac: 'cmd-,', win: 'ctrl-,'}
	});
	ed.firstElementChild.onkeydown = function(ev) {
		if (!nonEditingKeys.includes(ev.key)) {
			changed = true;
		}
	}
	ed.firstElementChild.onpaste = function() {
		changed = true;
	}
	ed.firstElementChild.oncut = function() {
		changed = true;
	}
	ed.firstElementChild.oncontextmenu = function() {
		changed = true;
	}
	ed.firstElementChild.onchange = function() {
		changed = true;
	}
	ed.firstElementChild.onfocus = function() {
		consoleFocus = false;
	}
	ed.editor.setOption('navigateWithinSoftTabs', atomicSoftTabs);
	ed.editor.setOption('useSoftTabs', softwareTabs);
	ed.editor.setOption('tabSize', tabSize);
	ed.editor.setOption('wrap', softWrap ? 'free' : 'off');
	ed.editor.setOption('showPrintMargin', showMargin);
	ed.editor.setOption('printMarginColumn', marginOffset);
	ed.editor.setOption('showInvisibles', showInvisibles);
	switch (keyBindings) {
		case 'Vim':
			ed.editor.setKeyboardHandler('ace/keyboard/vim');
			break;
		case 'Emacs':
			ed.editor.setKeyboardHandler('ace/keyboard/emacs');
			break;
		case 'Sublime':
			ed.editor.setKeyboardHandler('ace/keyboard/sublime');
			break;
		case 'VSCode':
			ed.editor.setKeyboardHandler('ace/keyboard/vscode');
			break;
		default:
			ed.editor.setKeyboardHandler(null);
	}
	if (py) {
		ed.editor.session.setMode('ace/mode/python');
		ed.editor.setOption('indentedSoftWrap', indentedSoftWrap);
		ed.editor.setOption('displayIndentGuides', showGuides);
		ed.editor.setOption('enableAutoIndent', autoIndent);
		ed.editor.setOption('behavioursEnabled', addClosing);
		ed.editor.setOption('enableLiveAutocompletion', autoCompletion);
	} else {
		ed.editor.session.setMode('ace/mode/text');
		ed.editor.setOption('indentedSoftWrap', false);
		ed.editor.setOption('displayIndentGuides', false);
		ed.editor.setOption('enableAutoIndent', false);
		ed.editor.setOption('behavioursEnabled', false);
		ed.editor.setOption('enableLiveAutocompletion', false);
	}
	if (darkMode) {
		ed.editor.setTheme('ace/theme/monokai');
	} else {
		ed.editor.setTheme('ace/theme/chrome');
	}
}

function checkResize() {
	if ((window.innerWidth <= 600) && !smallScreen) {
		smallScreen = true;
		toggleScreen();
	} else if ((window.innerWidth > 600) && smallScreen) {
		smallScreen = false;
		toggleScreen();
		if ((consoleSection.offsetWidth < 60) || !brythonLoaded) {
			document.getElementById('clear-console').style.display = 'none';
		} else {
			document.getElementById('clear-console').style.display = 'inline-block';
		}
	}
	resizeInput();
}

function toggleScreen() {
	if (smallScreen) {
		if (hiddenNav) {
			showCodeSection(!hiddenCode);
			showConsoleSection(hiddenCode);
		} else {
			showNavSection(true);
			showCodeSection(false);
			showConsoleSection(false);
		}
		main.style.paddingRight = '0.5rem';
	} else {
		showNavSection(!hiddenNav);
		showCodeSection(!hiddenCode);
		showConsoleSection(!hiddenConsole);
	}
}

function showNavSection(show) {
	const mw = main.offsetWidth;
	let bw = (smallScreen) ? 0 : document.getElementById('side-nav').offsetWidth;
	let sw = (smallScreen) ? 0 : (show) ? 16 : 8;
	let nw = (show) ? navSection.offsetWidth : 0;
	let cw = (hiddenCode) ? 0 : codeSection.offsetWidth;
	if (show) {
		navSection.style.display = 'unset';
		navSection.classList.add('cut-left');
		if (smallScreen) {
			navSection.style.width = '100%';
			main.style.paddingRight = '0.5rem';
			document.getElementById('separator1').style.display = 'none';
		} else {
			document.getElementById('separator1').style.display = 'unset';
			codeSection.classList.remove('cut-left');
		}
		if (document.getElementById('files-pane').style.display != 'none') {
			document.getElementById('files-button').classList.add('nb-active');
			document.getElementById('settings-button').classList.remove('nb-active');
			document.getElementById('help-button').classList.remove('nb-active');
		}
		if (document.getElementById('settings-pane').style.display != 'none') {
			document.getElementById('files-button').classList.remove('nb-active');
			document.getElementById('settings-button').classList.add('nb-active');
			document.getElementById('help-button').classList.remove('nb-active');
		}
		if (document.getElementById('help-pane').style.display != 'none') {
			document.getElementById('files-button').classList.remove('nb-active');
			document.getElementById('settings-button').classList.remove('nb-active');
			document.getElementById('help-button').classList.add('nb-active');
		}
	} else {
		navSection.style.display = 'none';
		document.getElementById('separator1').style.display = 'none';
		document.getElementById('files-button').classList.remove('nb-active');
		document.getElementById('settings-button').classList.remove('nb-active');
		document.getElementById('help-button').classList.remove('nb-active');
		if (!hiddenCode) {
			codeSection.classList.add('cut-left');
		}
	}
	const newCodeWidth = (hiddenCode) ? 0 : cw * 100 / (mw - bw - sw - nw);
	codeSection.style.width = newCodeWidth + '%';
}

function showCodeSection(show) {
	if (show) {
		codeSection.style.display = 'unset';
		if (smallScreen) {
			codeSection.style.width = '100%';
			main.style.paddingRight = '0.5rem';
		} else if (hiddenNav) {
			codeSection.classList.add('cut-left');
		}
		document.getElementById('code-button').classList.add('nb-active');
	} else {
		codeSection.style.display = 'none';
		document.getElementById('code-button').classList.remove('nb-active');
	}
}

function showConsoleSection(show) {
	if (show) {
		consoleSection.style.display = 'unset';
		main.style.paddingRight = '0.5rem';
		if (smallScreen) {
			consoleSection.classList.add('cut-left');
		} else {
			consoleSection.classList.remove('cut-left');
		}
		document.getElementById('console-button').classList.add('nb-active');
		resizeInput();
	} else {
		consoleSection.style.display = 'none';
		main.style.paddingRight = '0';
		document.getElementById('console-button').classList.remove('nb-active');
	}
}

function toggleMainNav() {
	if (document.getElementById('toggle-main-nav').checked) {
		document.getElementById('pullout').style.width = '16rem';
		document.getElementById('modal').style.backgroundColor = darkMode ?
			'rgba(63, 63, 63, 0.5)' : 'rgba(127, 127, 127, 0.5)';
		document.getElementById('modal').style.zIndex = '99';
		document.getElementById('modal').style.left = '16rem';
		document.getElementById('modal').style.width = 'calc(100% - 16rem)';
		preventTab(false);
	} else {
		document.getElementById('pullout').style.width = '0';
		document.getElementById('modal').style.backgroundColor = darkMode ?
			'rgba(63, 63, 63, 0)' : 'rgba(127, 127, 127, 0)';
		document.getElementById('modal').style.zIndex = '-1';
		document.getElementById('modal').style.left = '0';
		document.getElementById('modal').style.width = '100%';
		restoreTab();
	}
	document.getElementById('toggle-main-nav-label').blur();
}

function hideMainNav() {
	if ((document.getElementById('modal').style.zIndex != '') && (document.getElementById('modal').style.zIndex >= 0)) {
		document.getElementById('toggle-main-nav').click();
	}
}

function keyDown(ev) {
	document.onmousedown = null;
	if (['Enter', ' '].includes(ev.key)) {
		ev.target.click();
		ev.preventDefault();
		ev.stopPropagation();
	}
}

function preventTab(hideNav) {
	let focusable = document.getElementsByClassName('focusable');
	for (let i = 0; i < focusable.length; i++) {
		if (hideNav || (document.getElementById('toggle-main-nav-label') !== focusable[i])) {
			focusable[i].setAttribute('tabindex', '-1');
		}
	}
}

function restoreTab() {
	let focusable = document.getElementsByClassName('focusable');
	for (let i = 0; i < focusable.length; i++) {
		focusable[i].setAttribute('tabindex', '1');
	}
}

function dragSeparators() {
	var md;
	var deltaX;
	document.getElementById('separator1').onmousedown = onMouseDown;
	document.getElementById('separator2').onmousedown = onMouseDown;
	document.getElementById('separator1').ontouchstart = onTouchStart;
	document.getElementById('separator2').ontouchstart = onTouchStart;

	function onMouseDown(ev) {
		if (ev.button == 0) {
			ev.preventDefault();
			md = {
				ev: ev,
				clientX: ev.clientX,
				leftWidth: ev.target.previousElementSibling.offsetWidth,
				rightWidth: ev.target.nextElementSibling.offsetWidth
			};
			document.onmousemove = onMouseMove;
			document.onmouseup = function() {
				document.onmousemove = null;
				document.onmouseup = null;
			}
		}
	}
	
	function onTouchStart(ev) {
		ev.preventDefault();
		md = {
			ev: ev,
			clientX: ev.touches[0].clientX,
			leftWidth: ev.target.previousElementSibling.offsetWidth,
			rightWidth: ev.target.nextElementSibling.offsetWidth
		};
		document.ontouchmove = onTouchMove;
		document.ontouchend = function() {
			document.ontouchmove = null;
			document.ontouchend = null;
			document.ontouchcancel = null;
		}
		document.ontouchcancel = document.ontouchend;
	}
	
	function onMouseMove(ev) {
		if (ev.button == 0) {
			ev.preventDefault();
			deltaX = ev.clientX - md.clientX;
			mouseMove(ev);
		}
	}
	
	function onTouchMove(ev) {
		ev.preventDefault();
		deltaX = ev.touches[0].clientX - md.clientX;
		mouseMove(ev);
	}

	function mouseMove(ev) {
		const mw = main.offsetWidth;
		let newLeftWidth;
		let newRightWidth;
		if (md.ev.target.id == 'separator1') {
			if (md.leftWidth + deltaX < 160) {
				showNavSection(false);
				hiddenNav = true;
				document.onmousemove = null;
				document.onmouseup = null;
				document.ontouchmove = null;
				document.ontouchend = null;
				document.ontouchcancel = null;
			} else if ((deltaX > 0) && (md.rightWidth - deltaX < 16) && !hiddenCode) {
				showCodeSection(false);
				hiddenCode = true;
				newLeftWidth = (md.leftWidth + md.rightWidth) * 100 / (mw - 64);
				navSection.style.width = newLeftWidth + '%';
				document.onmousemove = null;
				document.onmouseup = null;
				document.ontouchmove = null;
				document.ontouchend = null;
				document.ontouchcancel = null;
			} else if ((deltaX < 0) && hiddenCode) {
				showCodeSection(true);
				hiddenCode = false;
				newLeftWidth = (md.leftWidth - 16) * 100 / (mw - 64);
				newRightWidth = 16 * 100 / (mw - 64);
				md.leftWidth -= 16;
				md.rightWidth = 16;
				navSection.style.width = newLeftWidth + '%';
				codeSection.style.width = newRightWidth + '%';
			} else {
				newLeftWidth = (md.leftWidth + deltaX) * 100 / (mw - 64);
				newRightWidth = (md.rightWidth - deltaX) * 100 / (mw - 64);
				navSection.style.width = newLeftWidth + '%';
				codeSection.style.width = newRightWidth + '%';
			}
		} else if (md.ev.target.id == 'separator2') {
			if ((deltaX > 0) && (md.rightWidth - deltaX < 16) && !hiddenConsole) {
				showConsoleSection(false);
				hiddenConsole = true;
				if (hiddenCode) {
					navSection.style.flex = '1 1 0%';
				} else {
					codeSection.style.flex = '1 1 0%';
				}
			} else if ((deltaX < -16) && hiddenConsole) {
				navSection.style.flex = 'unset';
				codeSection.style.flex = 'unset';
				showConsoleSection(true);
				hiddenConsole = false;
			} else if ((deltaX < 0) && (md.leftWidth + deltaX < 16) && !hiddenCode) {
				showCodeSection(false);
				hiddenCode = true;
			} else if ((deltaX > 16) && hiddenCode) {
				showCodeSection(true);
				hiddenCode = false;
			} else {
				newLeftWidth = (md.leftWidth + deltaX) * 100 / (mw - 64);
				codeSection.style.width = newLeftWidth + '%';
				resizeInput();
			}
			if ((consoleSection.offsetWidth < 60) || !brythonLoaded) {
				document.getElementById('clear-console').style.display = 'none';
			} else {
				document.getElementById('clear-console').style.display = 'inline-block';
			}
		}
	}
}

function showFiles() {
	document.getElementById('files-button').blur();
	if (navSection.style.display == 'none') {
		if (smallScreen) {
			showCodeSection(false);
			showConsoleSection(false);
		}
		showNavSection(true);
		hiddenNav = false;
		document.getElementById('code-button').classList.remove('nb-active');
		document.getElementById('console-button').classList.remove('nb-active');
	}
	document.getElementById('settings-pane').style.display = 'none';
	document.getElementById('help-pane').style.display = 'none';
	document.getElementById('files-pane').style.display = 'unset';
	document.getElementById('files-button').classList.add('nb-active');
	document.getElementById('settings-button').classList.remove('nb-active');
	document.getElementById('help-button').classList.remove('nb-active');
}

function showSettings() {
	document.getElementById('settings-button').blur();
	if (navSection.style.display == 'none') {
		if (smallScreen) {
			showCodeSection(false);
			showConsoleSection(false);
		}
		showNavSection(true);
		hiddenNav = false;
		document.getElementById('code-button').classList.remove('nb-active');
		document.getElementById('console-button').classList.remove('nb-active');
	}
	document.getElementById('files-pane').style.display = 'none';
	document.getElementById('help-pane').style.display = 'none';
	document.getElementById('settings-pane').style.display = 'unset';
	document.getElementById('files-button').classList.remove('nb-active');
	document.getElementById('settings-button').classList.add('nb-active');
	document.getElementById('help-button').classList.remove('nb-active');
}

function showHelp() {
	document.getElementById('help-button').blur();
	if (navSection.style.display == 'none') {
		if (smallScreen) {
			showCodeSection(false);
			showConsoleSection(false);
		}
		showNavSection(true);
		hiddenNav = false;
		document.getElementById('code-button').classList.remove('nb-active');
		document.getElementById('console-button').classList.remove('nb-active');
	}
	document.getElementById('files-pane').style.display = 'none';
	document.getElementById('settings-pane').style.display = 'none';
	document.getElementById('help-pane').style.display = 'unset';
	document.getElementById('files-button').classList.remove('nb-active');
	document.getElementById('settings-button').classList.remove('nb-active');
	document.getElementById('help-button').classList.add('nb-active');
}

function showCode() {
	document.getElementById('code-button').blur();
	if (codeSection.style.display == 'none') {
		showNavSection(false);
		showConsoleSection(false);
		showCodeSection(true);
		document.getElementById('files-button').classList.remove('nb-active');
		document.getElementById('code-button').classList.add('nb-active');
		document.getElementById('console-button').classList.remove('nb-active');
		document.getElementById('settings-button').classList.remove('nb-active');
		document.getElementById('help-button').classList.remove('nb-active');
	}
}

function showConsole() {
	document.getElementById('console-button').blur();
	if (consoleSection.style.display == 'none') {
		showNavSection(false);
		showCodeSection(false);
		showConsoleSection(true);
		document.getElementById('files-button').classList.remove('nb-active');
		document.getElementById('code-button').classList.remove('nb-active');
		document.getElementById('console-button').classList.add('nb-active');
		document.getElementById('settings-button').classList.remove('nb-active');
		document.getElementById('help-button').classList.remove('nb-active');
	}
}

function createItem(node) {
	const li = document.createElement('li');
	if (node != tree) {
		li.style.paddingLeft = '1rem';
	}
	const item = document.createElement('div');
	item.classList.add('file-item');
	item.classList.add('focusable');
	item.setAttribute('tabindex', '1');
	const icon = document.createElement('span');
	icon.classList.add('fa-li');
	item.appendChild(icon);
	const input = document.createElement('input');
	input.setAttribute('type', 'text');
	input.classList.add('file-input');
	input.classList.add('focusable');
	input.setAttribute('tabindex', '1');
	input.onkeypress = function(ev) {
		if (invalidFileNameChars.includes(ev.key)) {
			return false;
		}
	}
	item.appendChild(input);
	li.appendChild(item);
	node.appendChild(li);
	return li;
}

function renameFile(item, name, newFile) {
	const ext = name.slice(name.lastIndexOf('.') + 1);
	switch(ext) {
		case 'py':
			item.firstElementChild.innerHTML = '<i class="fab fa-python"></i>';
			break;
		case 'txt':
			item.firstElementChild.innerHTML = '<i class="far fa-file-alt"></i>';
			break;
		default:
			item.firstElementChild.innerHTML = '<i class="far fa-file"></i>';
	}
	item.removeChild(item.children[1]);
	if (item.children[1]) {
		item.removeChild(item.children[1]);
	}
	const text = document.createElement('span');
	text.classList.add('file-name');
	text.innerText = name;
	item.appendChild(text);
	const menu = document.createElement('span');
	menu.classList.add('tricolon');
	menu.classList.add('focusable');
	menu.setAttribute('tabindex', '1');
	menu.innerHTML = '&#8942;';
	menu.onkeydown = keyDown;
	menu.onclick = function(ev) {
		showContext(ev.target.parentNode);
		ev.stopPropagation();
	}
	item.appendChild(menu);
	if (!newFile) {
		if (ext === 'py') {
			item.code.editor.session.setMode('ace/mode/python');
			item.code.editor.setOption('indentedSoftWrap', indentedSoftWrap);
			item.code.editor.setOption('displayIndentGuides', showGuides);
			item.code.editor.setOption('enableAutoIndent', autoIndent);
			item.code.editor.setOption('behavioursEnabled', addClosing);
			item.code.editor.setOption('enableLiveAutocompletion', autoCompletion);
		} else {
			item.code.editor.session.setMode('ace/mode/text');
			item.code.editor.setOption('indentedSoftWrap', false);
			item.code.editor.setOption('displayIndentGuides', false);
			item.code.editor.setOption('enableAutoIndent', false);
			item.code.editor.setOption('behavioursEnabled', false);
			item.code.editor.setOption('enableLiveAutocompletion', false);
		}
	}
}

function renameDir(item, name) {
	item.firstElementChild.innerHTML = '<i class="far fa-folder"></i>';
	item.removeChild(item.children[1]);
	if (item.children[1]) {
		item.removeChild(item.children[1]);
	}
	const text = document.createElement('span');
	text.classList.add('file-name');
	text.innerText = name;
	item.appendChild(text);
	const menu = document.createElement('span');
	menu.classList.add('tricolon');
	menu.classList.add('focusable');
	menu.setAttribute('tabindex', '1');
	menu.innerHTML = '&#8942;';
	menu.onkeydown = keyDown;
	menu.onclick = function(ev) {
		showContext(ev.target.parentNode);
		ev.stopPropagation();
	}
	item.appendChild(menu);
	item.classList.add('dir');
}

function getNode(item) {
	if (item.parentNode.getAttribute('data-type') == 'dir') {
		return item.nextSibling;
	} else {
		return item.parentNode.parentNode;
	}
}

function addFile() {
	document.getElementById('add-file').blur();
	const node = getNode(activeItem);
	if ((node != tree) && !node.previousSibling.classList.contains('dir-expanded')) {
		toggle(node.previousSibling);
	}
	const newFile = createItem(node);
	newFile.firstElementChild.firstElementChild.innerHTML = '<i class="far fa-file"></i>';
	newFile.firstElementChild.classList.add('new-file');
	newFile.setAttribute('data-type', 'file');
	newFile.firstElementChild.children[1].focus();
	document.onmousedown = function(ev) {
		if ((ev.target != newFile) && !newFile.contains(ev.target)) {
			newFile.parentNode.removeChild(newFile);
			document.onmousedown = null;
		}
	}
	newFile.firstElementChild.children[1].onkeydown = function(ev) {
		if (['Escape', 'Tab'].includes(ev.key)) {
			newFile.parentNode.removeChild(newFile);
			document.onmousedown = null;
		} else if ((ev.key == 'Enter') && (newFile.firstElementChild.children[1].value != '')) {
			if (fileExists(getNode(activeItem), newFile.firstElementChild.children[1].value)) {
				showExists(newFile.firstElementChild);
			} else {
				ev.preventDefault();
				ev.stopPropagation();
				const name = newFile.firstElementChild.children[1].value;
				renameFile(newFile.firstElementChild, name, true);
				newFile.firstElementChild.classList.remove('new-file');
				const ed = document.createElement('div');
				ed.classList.add('code');
				ed.classList.add('focusable');
				codeArea.appendChild(ed);
				newFile.firstElementChild.code = ed;
				ed.id = getPath(newFile.firstElementChild);
				initEditor(ed, name, '');
				setActive(newFile.firstElementChild);
				newFile.firstElementChild.onclick = setActiveItem;
				ev.stopPropagation();
				newFile.firstElementChild.onkeydown = function(ev) {
					if (['Enter', ' '].includes(ev.key) && (newFile.firstElementChild.childElementCount <= 3)) {
						setActive(ev.target), true;
						ev.stopPropagation();
					}
				}
				sortItems(newFile.parentNode);
				document.onmousedown = null;
				changed = true;
				saveData();
			}
		}
	}
}

function createFile(name, node, contents) {
	const li = document.createElement('li');
	if (node != tree) {
		li.style.paddingLeft = '1rem';
	}
	li.setAttribute('data-type', 'file');
	const item = document.createElement('div');
	item.classList.add('file-item');
	item.classList.add('focusable');
	item.setAttribute('tabindex', '1');
	const icon = document.createElement('span');
	icon.classList.add('fa-li');
	const ext = name.slice(name.lastIndexOf('.') + 1);
	switch(ext) {
		case 'py':
			icon.innerHTML = '<i class="fab fa-python"></i>';
			break;
		case 'txt':
			icon.innerHTML = '<i class="far fa-file-alt"></i>';
			break;
		default:
			icon.innerHTML = '<i class="far fa-file"></i>';
	}
	item.appendChild(icon);
	const text = document.createElement('span');
	text.classList.add('file-name');
	text.innerText = name;
	item.appendChild(text);
	const menu = document.createElement('span');
	menu.classList.add('tricolon');
	menu.classList.add('focusable');
	menu.setAttribute('tabindex', '1');
	menu.innerHTML = '&#8942;';
	menu.onkeydown = keyDown;
	menu.onclick = function(ev) {
		showContext(ev.target.parentNode);
		ev.stopPropagation();
	}
	item.appendChild(menu);
	const ed = document.createElement('div');
	ed.classList.add('code');
	ed.classList.add('focusable');
	ed.style.display = 'none';
	codeArea.appendChild(ed);
	item.code = ed;
	item.onclick = setActiveItem;
	item.onkeydown = function(ev) {
		if (['Enter', ' '].includes(ev.key) && (item.childElementCount <= 3)) {
			setActive(ev.target, true);
			ev.stopPropagation();
		}
	}
	li.appendChild(item);
	node.appendChild(li);
	ed.id = getPath(item);
	initEditor(ed, name, contents);
	return li;
}

function fileExists(node, name) {
	for (let i = 0; i < node.childElementCount; i++) {
		if (node.children[i].firstElementChild.children[1].innerHTML == name) {
			return true;
		}
	}
	return false;
}

function getPath(item) {
	let path = item.children[1].innerText;
	let el = item;
	while (el.parentNode.parentNode != tree) {
		el = el.parentNode.parentNode.previousSibling;
		path = el.children[1].innerText + '/' + path;
	}
	return path;
}

async function setActive(item, load = false, focus = true) {
	if (activeItem != item) {
		if (activeItem) {
			activeItem.classList.remove('file-active');
			activeItem.classList.remove('file-focus');
		}
		if (item.parentNode.getAttribute('data-type') == 'file') {
			if (load && (item.code.editor.getValue() == '') && (user != 'anonymous')) {
				const text = await window.downloadFile(defaultPortal + '/' + importPath + '/' + getPath(item));
				item.code.editor.setValue(text);
				item.code.editor.navigateFileStart();
			}
			if (editingItem) {
				editingItem.code.style.display = 'none';
			}
			item.code.style.display = 'inline-block';
			editingItem = item;
			document.getElementById('code-file-name').innerText = getPath(item);
		}
	}
	item.classList.add('file-active');
	activeItem = item;
	if (editingItem && focus) {
		editingItem.code.editor.focus();
	}
}

function setActiveItem(ev) {
	let el = ev.target;
	el.blur();
	while (el.tagName != 'DIV')  {
		el = el.parentNode;
	}
	setActive(el, true);
}

function toggle(item) {
	if (item.parentNode.getAttribute('data-type') == 'dir') {
		if (item.classList.contains('dir-expanded')) {
			item.classList.remove('dir-expanded');
			item.nextSibling.style.display = 'none';
		} else {
			item.classList.add('dir-expanded');
			item.nextSibling.style.display = 'unset';
		}
	}
}

function toggleItem(ev) {
	let el = ev.target;
	el.blur();
	while (el.tagName != 'DIV')  {
		el = el.parentNode;
	}
	toggle(el);
	setActive(el);
}

function sortItems(node) {
	let i;
	let start = 0;
	if (node == tree) {
		start = 1;
	}
	const li = node.children;
	let switching = true;
	let shouldSwitch;
	while (switching) {
		switching = false;
		for (i = start; i < li.length - 1; i++) {
			shouldSwitch = false;
			if (li[i].firstElementChild.children[1].innerHTML.toLowerCase() >
				li[i + 1].firstElementChild.children[1].innerHTML.toLowerCase()) {
				shouldSwitch = true;
				break;
			}
		}
		if (shouldSwitch) {
			node.insertBefore(li[i + 1], li[i]);
			switching = true;
		}
	}
}

function showContext(item) {
	let li;
	let height = 0;
	if (item != activeItem) {
		item.classList.add('file-focus');
	}
	const menu = document.createElement('ul');
	menu.classList.add('context-menu');
	menu.setAttribute('tabindex', '1');
	if (item.children[1].innerText != 'main.py') {
		li = document.createElement('li');
		li.setAttribute('tabindex', '1');
		li.innerText = 'Rename';
		li.onkeydown = keyDown;
		li.onclick = renameItem;
		menu.appendChild(li);
		height += 28.25;
	}
	if (item.parentNode.getAttribute('data-type') == 'file') {
		li = document.createElement('li');
		li.setAttribute('tabindex', '1');
		li.innerText = 'Open';
		li.onkeydown = keyDown;
		li.onclick = function(ev) {
			ev.stopPropagation();
			document.onmousedown = null;
			setActive(ev.target.parentNode.parentNode, true);
			activeItem.removeChild(ev.target.parentNode);
		}
		menu.appendChild(li);
		height += 28.25;
		if (user != 'anonymous') {
			li = document.createElement('li');
			li.setAttribute('tabindex', '1');
			li.innerText = 'Copy Link';
			li.onkeydown = keyDown;
			li.onclick = function(ev) {
				ev.stopPropagation();
				const copy = document.getElementById('copy-buffer');
				copy.value = defaultPortal + '/' + importPath + '/' + getPath(ev.target.parentNode.parentNode);
				copy.focus();
				document.execCommand('selectAll', false);
				document.execCommand('copy', false);
				copy.blur();
				ev.target.classList.add('highlight');
				setTimeout(() => {ev.target.classList.remove('highlight')}, 500);
			}
			menu.appendChild(li);
			height += 28.25;
		}
	} else {
		li = document.createElement('li');
		li.setAttribute('tabindex', '1');
		li.innerText = 'Add File';
		li.onkeydown = keyDown;
		li.onclick = function(ev) {
			ev.stopPropagation();
			document.onmousedown = null;
			setActive(ev.target.parentNode.parentNode, false, false);
			activeItem.removeChild(ev.target.parentNode);
			addFile();
		}
		menu.appendChild(li);
		li = document.createElement('li');
		li.setAttribute('tabindex', '1');
		li.innerText = 'Add Folder';
		li.onkeydown = keyDown;
		li.onclick = function(ev) {
			ev.stopPropagation();
			document.onmousedown = null;
			setActive(ev.target.parentNode.parentNode, false, false);
			activeItem.removeChild(ev.target.parentNode);
			addDir();
		}
		menu.appendChild(li);
		height += 56.5;
	}
	if (item.children[1].innerText != 'main.py') {
		li = document.createElement('li');
		li.setAttribute('tabindex', '1');
		li.innerText = 'Delete';
		li.classList.add('delete');
		li.onkeydown = keyDown;
		li.onclick = function(ev) {
			document.onmousedown = null;
			showDelete(ev);
		}
		menu.appendChild(li);
		height += 28.25;
	}
	if (item.parentNode.offsetTop + height - 40 <= document.getElementById('files-list').offsetHeight) {
		menu.style.top = '0.5rem';
	} else {
		menu.style.bottom = '0.5rem';
	}
	item.appendChild(menu);
	menu.focus();
	document.onmousedown = function(ev) {
		if ((ev.target != menu) && !menu.contains(ev.target)) {
			item.removeChild(menu);
			item.classList.remove('file-focus');
			document.onmousedown = null;
		}
	}
	const firstKeyDown = menu.firstElementChild.onkeydown;
	const lastKeyDown = menu.lastElementChild.onkeydown;
	menu.firstElementChild.onkeydown = function(ev) {
		if ((ev.key == 'Tab') && ev.shiftKey) {
			ev.stopPropagation();
			item.removeChild(menu);
			item.classList.remove('file-focus');
			document.onmousedown = null;
		} else {
			firstKeyDown(ev);
		}
	}
	menu.lastElementChild.onkeydown = function(ev) {
		if ((ev.key == 'Tab') && !ev.shiftKey) {
			ev.stopPropagation();
			item.removeChild(menu);
			item.classList.remove('file-focus');
			document.onmousedown = null;
		} else {
			lastKeyDown(ev);
		}
	}
	menu.onkeydown = function(ev) {
		if ((ev.key == 'Tab') && ev.shiftKey && (ev.target == menu)) {
			ev.stopPropagation();
			item.removeChild(menu);
			item.classList.remove('file-focus');
			document.onmousedown = null;
		}
		if (ev.key == 'Escape') {
			item.removeChild(menu);
			item.classList.remove('file-focus');
			document.onmousedown = null;
		}
	}
}

function showExists(item) {
	const error = document.createElement('ul');
	error.classList.add('context-menu');
	const li = document.createElement('li');
	li.innerText = 'file ' + "'" + item.children[1].value + "'" + ' already exists';
	error.appendChild(li);
	if (item.parentNode.offsetTop + 16 <= document.getElementById('files-list').offsetHeight) {
		error.style.top = '2.5rem';
	} else {
		error.style.bottom = '2.5rem';
	}
	item.appendChild(error);
	setTimeout(function() { item.removeChild(error); }, 1000);
}

function renameItem(ev) {
	ev.stopPropagation();
	const item = ev.target.parentNode.parentNode;
	item.removeChild(ev.target.parentNode);
	const oldName = item.children[1].innerText;
	item.removeChild(item.children[1]);
	item.removeChild(item.children[1]);
	const input = document.createElement('input');
	input.setAttribute('type', 'text');
	input.classList.add('file-input');
	if (item == activeItem) {
		input.style.color = '#ffffff';
	}
	input.classList.add('focusable');
	input.setAttribute('tabindex', '1');
	input.onkeypress = function(ev) {
		if (invalidFileNameChars.includes(ev.key)) {
			return false;
		}
	}
	input.value = oldName;
	item.appendChild(input);
	item.classList.add('new-file');
	input.focus();
	document.onmousedown = function(ev) {
		if ((ev.target != item) && !item.contains(ev.target)) {
			if (item.parentNode.getAttribute('data-type') == 'file') {
				renameFile(item, oldName, false);
			} else {
				renameDir(item, oldName);
			}
			item.classList.remove('new-file');
			item.classList.remove('file-focus');
			document.onmousedown = null;
		}
	}
	input.onkeydown = function(ev) {
		if (['Escape', 'Tab'].includes(ev.key)) {
			if (item.parentNode.getAttribute('data-type') == 'file') {
				renameFile(item, oldName, false);
			} else {
				renameDir(item, oldName);
			}
			item.classList.remove('new-file');
			item.classList.remove('file-focus');
			document.onmousedown = null;
		} else if ((ev.key == 'Enter') && (input.value != '')) {
			if (fileExists(item.parentNode.parentNode, input.value)) {
				showExists(item);
				input.focus();
				ev.stopPropagation();
			} else {
				if (item.parentNode.getAttribute('data-type') == 'file') {
					renameFile(item, input.value, false);
					item.code.id = getPath(item);
				} else {
					renameDir(item, input.value);
				}
				item.classList.remove('new-file');
				sortItems(item.parentNode.parentNode);
				document.onmousedown = null;
				ev.stopPropagation();
				saveData();
			}
		}
	}
}

function showDelete(ev) {
	ev.stopPropagation();
	const item = ev.target.parentNode.parentNode;
	itemToDelete = item;
	item.removeChild(ev.target.parentNode);
	if (item.parentNode.getAttribute('data-type') == 'file') {
		document.getElementById('file-type').innerText = 'file';
	} else {
		document.getElementById('file-type').innerText = 'folder';
	}
	document.getElementById('file-name').innerText = item.children[1].innerText;
	document.getElementById('login-screen').style.display = 'block';
	document.getElementById('delete').style.display = 'flex';
	preventTab(true);
}

function hideDelete() {
	itemToDelete.classList.remove('file-focus');
	itemToDelete = null;
	document.getElementById('login-screen').style.display = 'none';
	document.getElementById('delete').style.display = 'none';
	restoreTab();
}

function deleteFile(item) {
	if (item.code) {
		codeArea.removeChild(item.code);
	}
	if (item.parentNode.getAttribute('data-type') == 'dir') {
		for (let i = item.nextElementSibling.childElementCount - 1; i >= 0; i--) {
			deleteFile(item.nextElementSibling.children[i].firstElementChild);
		}
	}
	item.parentNode.parentNode.removeChild(item.parentNode);
}

async function deleteItem() {
	const item = itemToDelete;
	if (item.parentNode.contains(activeItem)) {
		setActive(tree.firstElementChild.firstElementChild, true);
	}
	deleteFile(item);
	hideDelete();
	await saveData();
}

function addDir() {
	document.getElementById('add-dir').blur();
	const node = getNode(activeItem);
	if ((node != tree) && !node.previousSibling.classList.contains('dir-expanded')) {
		toggle(node.previousSibling);
	}
	const newDir = createItem(node);
	newDir.firstElementChild.firstElementChild.innerHTML = '<i class="far fa-folder"></i>';
	newDir.firstElementChild.classList.add('new-file');
	newDir.setAttribute('data-type', 'dir');
	newDir.firstElementChild.children[1].focus();
	document.onmousedown = function(ev) {
		if ((ev.target != newDir) && !newDir.contains(ev.target)) {
			newDir.parentNode.removeChild(newDir);
			document.onmousedown = null;
		}
	}
	newDir.firstElementChild.children[1].onkeydown = function(ev) {
		if (['Escape', 'Tab'].includes(ev.key)) {
			newDir.parentNode.removeChild(newDir);
			document.onmousedown = null;
		} else if ((ev.key == 'Enter') && (newDir.firstElementChild.children[1].value != '')) {
			if (fileExists(getNode(activeItem), newDir.firstElementChild.children[1].value)) {
				showExists(newDir.firstElementChild);
			} else {
				ev.preventDefault();
				ev.stopPropagation();
				const name = newDir.firstElementChild.children[1].value;
				renameDir(newDir.firstElementChild, name);
				newDir.firstElementChild.classList.remove('new-file');
				const ul = document.createElement('ul');
				ul.classList.add('fa-ul');
				newDir.appendChild(ul);
				newDir.firstElementChild.onclick = toggleItem;
				toggle(newDir.firstElementChild);
				setActive(newDir.firstElementChild);
				ev.stopPropagation();
				newDir.firstElementChild.onkeydown = function(ev) {
					if (['Enter', ' '].includes(ev.key)) {
						toggleItem(ev);
						ev.stopPropagation();
					}
				}
				sortItems(newDir.parentNode);
				document.onmousedown = null;
				saveData();
			}
		}
	}
}

function createDir(name, node, files) {
	const li = document.createElement('li');
	if (node != tree) {
		li.style.paddingLeft = '1rem';
	}
	li.setAttribute('data-type', 'dir');
	const item = document.createElement('div');
	item.classList.add('file-item');
	item.classList.add('focusable');
	item.setAttribute('tabindex', '1');
	const icon = document.createElement('span');
	icon.classList.add('fa-li');
	const ext = name.slice(name.lastIndexOf('.') + 1);
	icon.innerHTML = '<i class="far fa-folder"></i>';
	item.appendChild(icon);
	const text = document.createElement('span');
	text.classList.add('file-name');
	text.innerText = name;
	item.appendChild(text);
	const menu = document.createElement('span');
	menu.classList.add('tricolon');
	menu.classList.add('focusable');
	menu.setAttribute('tabindex', '1');
	menu.innerHTML = '&#8942;';
	menu.onkeydown = keyDown;
	menu.onclick = function(ev) {
		showContext(ev.target.parentNode);
		ev.stopPropagation();
	}
	item.appendChild(menu);
	item.classList.add('dir');
	item.classList.add('dir-expanded');
	li.appendChild(item);
	const ul = document.createElement('ul');
	ul.classList.add('fa-ul');
	li.appendChild(ul);
	item.onclick = toggleItem;
	item.onkeydown = function(ev) {
		if (['Enter', ' '].includes(ev.key)) {
			toggleItem(ev);
			ev.stopPropagation();
		}
	}
	node.appendChild(li);
	for (let i = 0; i < files.length; i++) {
		if (files[i].type == 'file') {
			createFile(files[i].name, ul, files[i].text);
		} else {
			createDir(files[i].name, ul, files[i].contents);
		}
	}
	return li;
}

function clearErrors() {
	let errors = document.getElementsByClassName('error');
	for (let i = 0; i < errors.length; i++) {
		errors[i].style.visibility = 'hidden';
		errors[i].style.opacity = '0';
	}
}


async function logout() {
	if (running) {
		running = false;
		stopRunning();
	}
	if (changed) {
		await saveData();
	}
	localStorage.removeItem(appId);
	localStorage.removeItem(appId + '-data');
	clearData();
	document.getElementById('repo-list').innerHTML = '';
	seed = '';
	user = 'anonymous';
	importPath = '';
	createNewUser();
	document.getElementById('user-text').innerText = user;
	document.getElementById('repo-text').innerHTML = '&#8942;&nbsp;' + repo;
	document.getElementById('logout-text').innerText = 'Sign in\xa0';
	document.getElementById('logout-icon').innerHTML = '<i class="fas fa-sign-in-alt"></i>';
	document.getElementById('clear-console').click();
}

async function signIn() {
	document.getElementById('signin-button').blur();
	let username = document.getElementById('username').value;
	let usernameError = document.getElementById('username-error');
	let password = document.getElementById('password').value;
	let passwordError = document.getElementById('password-error');
	if (username == '') {
		clearErrors();
		usernameError.innerText = 'username empty';
		usernameError.style.visibility = 'visible';
		usernameError.style.opacity = '1';
		return;
	}
	if (password == '') {
		clearErrors();
		passwordError.innerText = 'password empty';
		passwordError.style.visibility = 'visible';
		passwordError.style.opacity = '1';
		return;
	}
	document.getElementById('signin-button').disabled = true;
	document.getElementById('cancel-button').disabled = true;
	document.getElementById('signin-button').innerText = '...';
	clearErrors();
	document.getElementById('new-user').style.visibility = 'hidden';
	document.getElementById('forgot').style.visibility = 'hidden';
	let tempSeed = await window.generateSeed(username, password);
	let {data} = await window.fromRegistry(tempSeed);
	if (!data) {
		document.getElementById('signin-button').disabled = false;
		document.getElementById('cancel-button').disabled = false;
		document.getElementById('signin-button').innerText = 'Sign In';
		clearErrors();
		passwordError.innerText = 'wrong username/password combination';
		passwordError.style.visibility = 'visible';
		passwordError.style.opacity = '1';
		document.getElementById('new-user').style.visibility = 'visible';
		document.getElementById('forgot').style.visibility = 'visible';
		return;
	}
	clearData();
	seed = tempSeed;
	user = username;
	document.getElementById('user-text').innerText = 'retrieving data...';
	document.getElementById('repo-text').innerHTML = '';
	await loadData(user);
	document.getElementById('user-text').innerText = user;
	document.getElementById('repo-text').innerHTML = '&#8942;&nbsp;' + repo;
	document.getElementById('logout-text').innerText = 'Sign out\xa0';
	document.getElementById('logout-icon').innerHTML = '<i class="fas fa-sign-out-alt"></i>';
	localStorage.setItem(window.appId, seed);
	document.getElementById('signin-button').disabled = false;
	document.getElementById('cancel-button').disabled = false;
	document.getElementById('signin-button').innerText = 'Sign In';
	document.getElementById('new-user').style.visibility = 'visible';
	document.getElementById('forgot').style.visibility = 'visible';
	clearErrors();
	hideSignIn();
}

async function signUp() {
	document.getElementById('signup-button').blur();
	document.getElementById('signup-button').disabled = false;
	document.getElementById('cancel-button0').disabled = false;
	document.getElementById('signup-button').innerText = 'Sign Up';
	let username = document.getElementById('username0').value;
	let usernameError = document.getElementById('username-error0');
	let password = document.getElementById('password0').value;
	let passwordError = document.getElementById('password-error0');
	let repeatPassword = document.getElementById('repeat-password0').value;
	let repeatPasswordError = document.getElementById('repeat-password-error0');
	if (username == '') {
		clearErrors();
		usernameError.innerText = 'username empty';
		usernameError.style.visibility = 'visible';
		usernameError.style.opacity = '1';
		return;
	}
	if (username.length < 3) {
		clearErrors();
		usernameError.innerText = 'username too short';
		usernameError.style.visibility = 'visible';
		usernameError.style.opacity = '1';
		return;
	}
	if (/[`'"{},<>]/.test(username)) {
		clearErrors();
		usernameError.innerText = 'username contains invalid characters';
		usernameError.style.visibility = 'visible';
		usernameError.style.opacity = '1';
		return;
	}
	if (username.length > 25) {
		clearErrors();
		usernameError.innerText = 'username too long (max. 25 characters allowed)';
		usernameError.style.visibility = 'visible';
		usernameError.style.opacity = '1';
		return;
	}
	if (password.length < 6) {
		clearErrors();
		passwordError.innerText = 'password shorter than 6 characters';
		passwordError.style.visibility = 'visible';
		passwordError.style.opacity = '1';
		return;
	}
	if (username.length + password.length > 31) {
		clearErrors();
		passwordError.innerText = 'username+password longer than 31 character';
		passwordError.style.visibility = 'visible';
		passwordError.style.opacity = '1';
		return;
	}
	if (password != repeatPassword) {
		clearErrors();
		repeatPasswordError.innerText = 'the passwords do not match';
		repeatPasswordError.style.visibility = 'visible';
		repeatPasswordError.style.opacity = '1';
		return;
	}
	document.getElementById('signup-button').disabled = true;
	document.getElementById('cancel-button0').disabled = true;
	document.getElementById('signup-button').innerText = '...';
	document.getElementById('already').style.visibility = 'hidden';
	clearErrors();
	if ((username == 'anonymous') || (await window.keyExists(username))) {
		document.getElementById('signup-button').disabled = false;
		document.getElementById('cancel-button0').disabled = false;
		document.getElementById('signup-button').innerText = 'Sign Up';
		clearErrors();
		usernameError.innerText = 'username already occupied';
		usernameError.style.visibility = 'visible';
		usernameError.style.opacity = '1';
		document.getElementById('already').style.visibility = 'visible';
		return;
	}
	document.getElementById('user-text').innerText = 'registering user...';
	document.getElementById('repo-text').innerHTML = '';
	seed = await window.generateSeed(username, password);
	const result = await window.appendKey(username);
	document.getElementById('seed0').value = seed;
	document.getElementById('seed0').style.color = '#000000';
	document.getElementById('copy-button').disabled = false;
	clearData();
	user = username;
	await createNewUser();
	document.getElementById('done-button').disabled = false;
	clearErrors();
	document.getElementById('user-text').innerText = user;
	document.getElementById('repo-text').innerHTML = '&#8942;&nbsp;' + repo;
	document.getElementById('logout-text').innerText = 'Sign out\xa0';
	document.getElementById('logout-icon').innerHTML = '<i class="fas fa-sign-out-alt"></i>';
	localStorage.setItem(window.appId, seed);
}

function copySeed() {
	document.getElementById('copy-button').blur();
	document.getElementById('seed0').select();
	document.execCommand('copy');
	setTimeout(() => {
		document.getElementById('copy-button').innerHTML = '<i class="fas fa-check" style="color: #00af00"></i> Copied';
	}, 500);
}

function done() {
	document.getElementById('done-button').blur();
	hideSignUp();
}

async function recover() {
	document.getElementById('recover-button').blur();
	let s = document.getElementById('seed').value;
	let seedError = document.getElementById('seed-error');
	if (s == '') {
		seedError.innerText = 'seed is empty';
		seedError.style.visibility = 'visible';
		seedError.style.opacity = '1';
		return;
	}
	if (!s.match(/^[a-z ]+$/)) {
		seedError.innerText = 'seed contains invalid characters';
		seedError.style.visibility = 'visible';
		seedError.style.opacity = '1';
		return;
	}
	clearErrors();
	document.getElementById('recover-button').disabled = true;
	document.getElementById('recover-button').innerText = '...';
	let {username, password} = await window.recoverPassword(s);
	if ((username != '') && (password != '')) {
		if (await window.keyExists(username)) {
			document.getElementById('username1').innerText = username;
			document.getElementById('password1').innerText = password;
			document.getElementById('username1').style.visibility = 'visible';
			document.getElementById('password1').style.visibility = 'visible';
		} else {
			seedError.innerText = 'seed does not exist';
			seedError.style.visibility = 'visible';
			seedError.style.opacity = '1';
		}
	} else {
		seedError.innerText = 'wrong seed';
		seedError.style.visibility = 'visible';
		seedError.style.opacity = '1';
	}
	document.getElementById('recover-button').disabled = false;
	document.getElementById('recover-button').innerText = 'Recover';
}

function toSignIn() {
	document.getElementById('tosignin-button').blur();
	if (document.getElementById('signup').style.display != 'none') {
		hideSignUp();
	}
	if (document.getElementById('recover').style.display != 'none') {
		hideRecover();
	}
	showSignIn();
}

function toSignUp() {
	if (document.getElementById('signin').style.display != 'none') {
		hideSignIn();
	}
	showSignUp();
}

function toRecover() {
	hideSignIn();
	showRecover();
}

function showSignIn() {
	document.getElementById('login-screen').style.display = 'block';
	document.getElementById('signin').style.display = 'flex';
	document.getElementById('username').focus();
	preventTab(true);
}

function hideSignIn() {
	document.getElementById('login-screen').style.display = 'none';
	document.getElementById('signin').style.display = 'none';
	document.getElementById('username').value = '';
	document.getElementById('password').value = '';
	document.getElementById('new-user').style.visibility = 'visible';
	document.getElementById('forgot').style.visibility = 'visible';
	clearErrors();
	restoreTab();
}

function showSignUp() {
	document.getElementById('signup-button').disabled = false;
	document.getElementById('cancel-button0').disabled = false;
	document.getElementById('signup-button').innerText = 'Sign Up';
	document.getElementById('login-screen').style.display = 'block';
	document.getElementById('signup').style.display = 'flex';
	document.getElementById('username0').focus();
	preventTab(true);
}

function hideSignUp() {
	document.getElementById('login-screen').style.display = 'none';
	document.getElementById('signup').style.display = 'none';
	document.getElementById('username0').value = '';
	document.getElementById('password0').value = '';
	document.getElementById('repeat-password0').value = '';
	clearErrors();
	document.getElementById('seed0').value = 'Username and password are used to generate a 24-word seed. This seed can later be used to recover your username and password.';
	document.getElementById('seed0').style.color = '#7f7f7f';
	document.getElementById('copy-button').disabled = true;
	document.getElementById('done-button').disabled = true;
	document.getElementById('signup-button').disabled = false;
	document.getElementById('copy-button').innerText = 'Copy Seed';
	document.getElementById('already').style.visibility = 'visible';
	restoreTab();
}

function showRecover() {
	document.getElementById('login-screen').style.display = 'block';
	document.getElementById('recover').style.display = 'flex';
	document.getElementById('seed').focus();
	preventTab(true);
}

function hideRecover() {
	document.getElementById('login-screen').style.display = 'none';
	document.getElementById('recover').style.display = 'none';
	document.getElementById('seed').value = '';
	clearErrors();
	document.getElementById('username1').style.visibility = 'hidden';
	document.getElementById('password1').style.visibility = 'hidden';
	restoreTab();
}

async function logoutClick(ev) {
	document.getElementById('logout-button').blur();
	if (user == 'anonymous') {
		showSignIn();
	} else {
		document.getElementById('login-screen').style.display = 'block';
		document.getElementById('wait').style.display = 'flex';
		preventTab(true);
		await logout();
		document.getElementById('wait').style.display = 'none';
		document.getElementById('login-screen').style.display = 'none';
		restoreTab();
	}
}

function listDir(node) {
	let files = [];
	let item;
	for (let i = 0; i < node.children.length; i++) {
		if (node.children[i].firstElementChild.children[1].tagName != 'INPUT') {
			item = {};
			item.name = node.children[i].firstElementChild.children[1].innerText;
			item.type = node.children[i].getAttribute('data-type');
			if (item.type == 'file') {
				item.text = node.children[i].firstElementChild.code.editor.getValue();
				item.path = getPath(node.children[i].firstElementChild);
			} else {
				item.contents = listDir(node.children[i].lastElementChild);
			}
			files.push(item);
		}
	}
	return files;
}

function listFiles(dir, files) {
	for (let i = 0; i < dir.length; i++) {
		if (dir[i].type == 'file') {
			const text = (dir[i].text == '') ? '\n' : dir[i].text;
			const file = new File([text], dir[i].name,
				{type: 'text/plain', path: dir[i].path, webkitRelativePath: dir[i].path});
			files[dir[i].path] = file;
		} else {
			files = listFiles(dir[i].contents,  files);
		}
	}
	return files;
}

function listDirForSave(node) {
	let files = [];
	let item;
	for (let i = 0; i < node.children.length; i++) {
		if (node.children[i].firstElementChild.children[1].tagName != 'INPUT') {
			item = {};
			item.name = node.children[i].firstElementChild.children[1].innerText;
			item.type = node.children[i].getAttribute('data-type');
			if (item.type == 'file') {
				if (user == 'anonymous') {
					item.text = node.children[i].firstElementChild.code.editor.getValue();
					item.path = getPath(node.children[i].firstElementChild);
				}
			} else {
				item.contents = listDirForSave(node.children[i].lastElementChild);
			}
			files.push(item);
		}
	}
	return files;
}

async function saveData() {
	const save = document.getElementById('save');
	save.blur();
	save.firstElementChild.classList.remove('fas');
	save.firstElementChild.classList.add('far');
	let userData = {};
	userData.softwareTabs = softwareTabs;
	userData.atomicSoftTabs = atomicSoftTabs;
	userData.tabSize = tabSize;
	userData.softWrap = softWrap;
	userData.indentedSoftWrap = indentedSoftWrap;
	userData.showMargin = showMargin;
	userData.marginOffset = marginOffset;
	userData.showInvisibles = showInvisibles;
	userData.showGuides = showGuides;
	userData.autoIndent = autoIndent;
	userData.addClosing = addClosing;
	userData.autoCompletion = autoCompletion;
	userData.keyBindings = keyBindings;
	userData.darkMode = darkMode;
	userData.autoSave = autoSave;
	userData.current = currentRepo;
	repos[currentRepo].lastModified = new Date();
	const dir = (user == 'anonymous') ? listDirForSave(tree) : listDir(tree);
	repos[currentRepo].files = dir;
	if (user == 'anonymous') {
		repos[currentRepo].path = '';
		userData.repos = repos;
		const data = JSON.stringify(userData);
		localStorage.setItem(window.appId + '-data', data);
		save.firstElementChild.classList.remove('far');
		save.firstElementChild.classList.add('fas');
		changed = false;
	} else {
		if (changed || (importPath == '')) {
			const files = listFiles(dir, {});
			const name = repos[currentRepo].name;
			importPath = await window.uploadDirectory(files, name);
			repos[currentRepo].path = importPath;
			userData.repos = repos;
			const data = JSON.stringify(userData);
			await window.toRegistry(seed, userData);
			save.firstElementChild.classList.remove('far');
			save.firstElementChild.classList.add('fas');
			changed = false;
		} else {
			repos[currentRepo].path = importPath;
			userData.repos = repos;
			const data = JSON.stringify(userData);
			await window.toRegistry(seed, userData);
			save.firstElementChild.classList.remove('far');
			save.firstElementChild.classList.add('fas');
			changed = false;
		}
	}
}

async function saveChanges() {
	if (changed && (autoSave > 0)) {
		await saveData();
	}
}

async function loadDataFromStorage() {
	user = 'anonymous';
	document.getElementById('user-text').innerText = user;
	const load = localStorage.getItem(window.appId + '-data');
	if (!load) {
		await createNewUser();
		setActive(tree.firstElementChild.firstElementChild);
	} else {
		const userData = JSON.parse(load);
		softwareTabs = (userData.softwareTabs !== undefined) ? userData.softwareTabs : false;
		atomicSoftTabs = (userData.atomicSoftTabs !== undefined) ? userData.atomicSoftTabs : true;
		tabSize = (userData.tabSize !== undefined) ? userData.tabSize : 4;
		softWrap = (userData.softWrap !== undefined) ? userData.softWrap : true;
		indentedSoftWrap = (userData.indentedSoftWrap !== undefined) ? userData.indentedSoftWrap : false;
		showMargin = (userData.showMargin !== undefined) ? userData.showMargin : true;
		marginOffset = (userData.marginOffset !== undefined) ? userData.marginOffset : 80;
		showInvisibles = (userData.showInvisibles !== undefined) ? userData.showInvisibles : false;
		showGuides = (userData.showGuides !== undefined) ? userData.showGuides : true;
		autoIndent = (userData.autoIndent !== undefined) ? userData.autoIndent : true;
		addClosing = (userData.addClosing !== undefined) ? userData.addClosing : true;
		autoCompletion = (userData.autoCompletion !== undefined) ? userData.autoCompletion : false;
		keyBindings = (userData.keyBindings !== undefined) ? userData.keyBindings : 'default';
		darkMode = (userData.darkMode !== undefined) ? userData.darkMode : false;
		autoSave = (userData.autoSave !== undefined) ? userData.autoSave : 30;
		initSettings();
		repos = userData.repos;
		currentRepo = userData.current;
		repo = repos[currentRepo].name;
		let li;
		const list = document.getElementById('repo-list');
		list.innerHTML = '';
		for (let i = repos.length - 1; i >= 0; i--) {
			li = document.createElement('li');
			li.setAttribute('tabindex', '1');
			if (i == currentRepo) {
				li.classList.add('current-repo');
			}
			li.innerText = repos[i].name;
			li.onmouseover = showDesc;
			li.onmouseout = hideDesc;
			li.onfocus = function(ev) {
				li.onmouseout = null;
				showDesc(ev);
			}
			li.onblur = function() {
				li.onmouseout = hideDesc;
				hideDesc();
			}
			li.onkeydown = keyDown;
			li.onclick = makeCurrent;
			list.appendChild(li);
		}
		const files = repos[currentRepo].files;
		for (let i = 0; i < files.length; i++) {
			if (files[i].type == 'file') {
				createFile(files[i].name, tree, files[i].text);
			} else {
				createDir(files[i].name, tree, files[i].contents);
			}
		}
		document.getElementById('repo-text').innerHTML = '&#8942;&nbsp;' + repo;
		setActive(tree.firstElementChild.firstElementChild);
	}
}

async function createNewUser() {
	repos = [];
	currentRepo = 0;
	document.getElementById('repo-list').innerHTML = '';
	await createRepo();
	initSettings();
}

async function createRepo() {
	if (repos.length != 0) {
		await saveData();
	}
	const list = document.getElementById('repo-list');
	if (list.childElementCount > 0) {
		list.children[list.childElementCount - currentRepo - 1].classList.remove('current-repo');
	}
	repo = await window.generateRepoName();
	clearData();
	createFile('main.py', tree, '');
	setActive(tree.firstElementChild.firstElementChild);
	const date = new Date();
	repos.push({name: repo, desc: '', created: date, lastModified: date, files:
		((user == 'anonymous') ? listDir(tree) : listDirForSave(tree)), path: ''});
	importPath = '';
	document.getElementById('repo-text').innerHTML = '&#8942;&nbsp;' + repo;
	currentRepo = repos.length - 1;
	const li = document.createElement('li');
	li.setAttribute('tabindex', '1');
	li.classList.add('current-repo');
	li.innerText = repo;
	li.onmouseover = showDesc;
	li.onmouseout = hideDesc;
	li.onfocus = function(ev) {
		li.onmouseout = null;
		showDesc(ev);
	}
	li.onblur = function() {
		li.onmouseout = hideDesc;
		hideDesc();
	}
	li.onkeydown = keyDown;
	li.onclick = makeCurrent;
	list.insertBefore(li, list.children[0]);
	hideMainNav();
	changed = true;
	await saveData();
}

function clearData() {
	tree.innerHTML = '';
	codeArea.innerHTML = '';
}

function showDesc(ev) {
	const list = document.getElementById('repo-list');
	let ind = 0;
	while ((ind < list.childElementCount) && (ev.target != list.children[ind])) {
		ind++;
	}
	const created = new Date(repos[list.childElementCount - ind - 1].created);
	const lastModified = new Date(repos[list.childElementCount - ind - 1].lastModified);
	document.getElementById('repo-description').value = repos[list.childElementCount - ind - 1].desc;
	document.getElementById('created').innerText = 'Created: ' +
		created.toLocaleDateString() +	' ' + created.toLocaleTimeString();
	document.getElementById('last-modified').innerText = 'Last updated: ' +
		lastModified.toLocaleDateString() + ' ' + lastModified.toLocaleTimeString();
}

function hideDesc() {
	document.getElementById('repo-description').value = '';
	document.getElementById('created').innerText = '';
	document.getElementById('last-modified').innerText = '';
}

async function makeCurrent(ev) {
	const list = document.getElementById('repo-list');
	let ind = 0;
	let _new = 0;
	while (ind < list.childElementCount) {
		if (ev.target == list.children[ind]) {
			_new = ind;
		}
		ind++;
	}
	const old = list.childElementCount - currentRepo - 1;
	if (_new != old) {
		if (changed) {
			await saveData();
		}
		list.children[old].classList.remove('current-repo');
		list.children[_new].classList.add('current-repo');
		currentRepo = list.childElementCount - _new - 1; 
		repo = repos[currentRepo].name;
		clearData();
		const files = repos[currentRepo].files;
		for (let i = 0; i < files.length; i++) {
			if (files[i].type == 'file') {
				createFile(files[i].name, tree, files[i].text);
			} else {
				createDir(files[i].name, tree, files[i].contents);
			}
		}
		setActive(tree.firstElementChild.firstElementChild, true);
		document.getElementById('repo-text').innerHTML = '&#8942;&nbsp;' + repo;
		await saveData();
	}
	hideMainNav();
}

async function loadData(user) {
	const {data} = await window.fromRegistry(seed);
	if (!data) {
		await createNewUser();
		document.getElementById('repo-text').innerHTML = '&#8942;&nbsp;' + repo;
		setActive(tree.firstElementChild.firstElementChild);
	} else {
		softwareTabs = (data.softwareTabs !== undefined) ? data.softwareTabs : false;
		atomicSoftTabs = (data.atomicSoftTabs !== undefined) ? data.atomicSoftTabs : true;
		tabSize = (data.tabSize !== undefined) ? data.tabSize : 4;
		softWrap = (data.softWrap !== undefined) ? data.softWrap : true;
		indentedSoftWrap = (data.indentedSoftWrap !== undefined) ? data.indentedSoftWrap : false;
		showMargin = (data.showMargin !== undefined) ? data.showMargin : true;
		marginOffset = (data.marginOffset !== undefined) ? data.marginOffset : 80;
		showInvisibles = (data.showInvisibles !== undefined) ? data.showInvisibles : false;
		showGuides = (data.showGuides !== undefined) ? data.showGuides : true;
		autoIndent = (data.autoIndent !== undefined) ? data.autoIndent : true;
		addClosing = (data.addClosing !== undefined) ? data.addClosing : true;
		autoCompletion = (data.autoCompletion !== undefined) ? data.autoCompletion : false;
		keyBindings = (data.keyBindings !== undefined) ? data.keyBindings : 'default';
		darkMode = (data.darkMode !== undefined) ? data.darkMode : false;
		autoSave = (data.autoSave !== undefined) ? data.autoSave : 30;
		initSettings();
		repos = data.repos;
		currentRepo = data.current;
		repo = repos[currentRepo].name;
		importPath = repos[currentRepo].path;
		let li;
		const list = document.getElementById('repo-list');
		list.innerHTML = '';
		for (let i = repos.length - 1; i >= 0; i--) {
			li = document.createElement('li');
			li.setAttribute('tabindex', '1');
			if (i == currentRepo) {
				li.classList.add('current-repo');
			}
			li.innerText = repos[i].name;
			li.onmouseover = showDesc;
			li.onmouseout = hideDesc;
			li.onfocus = function(ev) {
				li.onmouseout = null;
				showDesc(ev);
			}
			li.onblur = function() {
				li.onmouseout = hideDesc;
				hideDesc();
			}
			li.onkeydown = keyDown;
			li.onclick = makeCurrent;
			list.appendChild(li);
		}
		const files = repos[currentRepo].files;
		if (files.length > 0) {
			clearData();
		}
		for (let i = 0; i < files.length; i++) {
			if (files[i].type == 'file') {
				createFile(files[i].name, tree, (user == 'anonymous') ? files[i].text : '');
			} else {
				createDir(files[i].name, tree, files[i].contents);
			}
		}
		document.getElementById('repo-text').innerHTML = '&#8942;&nbsp;' + repo;
		setActive(tree.firstElementChild.firstElementChild, true);
	}
	document.getElementById('user-text').innerText = user;
}

function select(el, num) {
	el.children[num].setAttribute('selected', true);
}

function initSettings() {
	document.getElementById('software-tabs').checked = softwareTabs;
	document.getElementById('atomic-soft-tabs').checked = atomicSoftTabs;
	document.getElementById('atomic-soft-tabs').disabled = !softwareTabs;
	document.getElementById('tab-size').value = tabSize;
	document.getElementById('word-wrap').checked = softWrap;
	document.getElementById('indented-wrap').checked = indentedSoftWrap;
	document.getElementById('indented-wrap').disabled = !softWrap;
	document.getElementById('show-margin').checked = showMargin;
	document.getElementById('margin-offset').value = marginOffset;
	document.getElementById('margin-offset').disabled = !showMargin;
	document.getElementById('show-invisibles').checked = showInvisibles;
	document.getElementById('show-guides').checked = showGuides;
	document.getElementById('auto-indent').checked = autoIndent;
	document.getElementById('add-closing').checked = addClosing;
	document.getElementById('completion').checked = autoCompletion;
	switch (keyBindings) {
		case 'Vim':
			select(document.getElementById('key-bindings'), 1);
			break;
		case 'Emacs':
			select(document.getElementById('key-bindings'), 2);
			break;
		case 'Sublime':
			select(document.getElementById('key-bindings'), 3);
			break;
		case 'VSCode':
			select(document.getElementById('key-bindings'), 4);
			break;
		default:
			select(document.getElementById('key-bindings'), 0);
	}
	document.getElementById('dark-mode').checked = darkMode;
	switch(autoSave) {
		case 0:
			select(document.getElementById('auto-save'), 0);
			break;
		case 30:
			select(document.getElementById('auto-save'), 1);
			break;
		case 60:
			select(document.getElementById('auto-save'), 2);
			break;
		case 300:
			select(document.getElementById('auto-save'), 3);
			break;
	}
}

function validateNumber(ev) {
	if (!['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(ev.key)) {
		ev.preventDefault();
		return false;
	}
}

function processNode(node, action) {
	for (let i = 0; i < node.children.length; i++) {
		if (node.children[i].getAttribute('data-type') === 'file') {
			action(node.children[i].firstElementChild);
		} else {
			processNode(node.children[i].lastElementChild, action);
		}
	}
}

function setSoftwareTabs(tabs) {
	softwareTabs = tabs;
	tabCharacter = tabs ? ' '.repeat(tabSize) : '\t';
	for (let i = 0; i < codeArea.childElementCount; i++) {
		codeArea.children[i].editor.setOption('useSoftTabs', tabs);
	}
	document.getElementById('atomic-soft-tabs').disabled = !tabs;
	saveData();
}

function setAtomicSoftTabs(atomic) {
	atomicSoftTabs = atomic;
	for (let i = 0; i < codeArea.childElementCount; i++) {
		codeArea.children[i].editor.setOption('navigateWithinSoftTabs', atomic);
	}
	saveData();
}

function setTabSize(size) {
	if ((size <= 0) || (size > 64)) {
		document.getElementById('tab-size').value = tabSize;
		return false;
	}
	tabSize = document.getElementById('tab-size').value;
	tabCharacter = softwareTabs ? ' '.repeat(tabSize) : '\t';
	let pos;
	for (let i = 0; i < codeArea.childElementCount; i++) {
		pos = codeArea.children[i].editor.getCursorPosition();
		codeArea.children[i].editor.setOption('tabSize', tabSize);
		codeArea.children[i].editor.navigateLineStart();
		codeArea.children[i].editor.navigateTo(pos.row, pos.column);
	}
	terminalInput.style.tabSize = tabSize;
	output.style.tabSize = tabSize;
	saveData();
}

function setSoftWrap(wrap) {
	softWrap = wrap;
	for (let i = 0; i < codeArea.childElementCount; i++) {
		codeArea.children[i].editor.setOption('wrap', wrap ? 'free' : 'off');
	}
	document.getElementById('indented-wrap').disabled = !wrap;
	saveData();
}

function setIndentedWrap(wrap) {
	indentedSoftWrap = wrap;
	processNode(tree, function(item) {
		if (item.children[1].innerText.slice(
			item.children[1].innerText.lastIndexOf('.') + 1) === 'py') {
			item.code.editor.setOption('indentedSoftWrap', wrap);
		}
	});
	saveData();
}

function setShowMargin(show) {
	showMargin = show;
	for (let i = 0; i < codeArea.childElementCount; i++) {
		codeArea.children[i].editor.setOption('showPrintMargin', show);
	}
	document.getElementById('margin-offset').disabled = !show;
	saveData();
}

function setMarginOffset(size) {
	if ((size <= 0) || (size > 2048)) {
		document.getElementById('margin-offset').value = marginOffset;
		return false;
	}
	marginOffset = document.getElementById('margin-offset').value;
	for (let i = 0; i < codeArea.childElementCount; i++) {
		codeArea.children[i].editor.setOption('printMarginColumn', marginOffset);
	}
	saveData();
}

function setShowInvisibles(show) {
	showInvisibles = show;
	for (let i = 0; i < codeArea.childElementCount; i++) {
		codeArea.children[i].editor.setOption('showInvisibles', show);
	}
	saveData();
}

function setShowGuides(show) {
	showGuides = show;
	processNode(tree, function(item) {
		if (item.children[1].innerText.slice(
			item.children[1].innerText.lastIndexOf('.') + 1) === 'py') {
			item.code.editor.setOption('displayIndentGuides', show);
		}
	});
	saveData();
}

function setAutoIndent(enable) {
	autoIndent = enable;
	processNode(tree, function(item) {
		if (item.children[1].innerText.slice(
			item.children[1].innerText.lastIndexOf('.') + 1) === 'py') {
			item.code.editor.setOption('enableAutoIndent', enable);
		}
	});
	saveData();
}

function setAddClosing(enable) {
	addClosing = enable;
	processNode(tree, function(item) {
		if (item.children[1].innerText.slice(
			item.children[1].innerText.lastIndexOf('.') + 1) === 'py') {
			item.code.editor.setOption('behavioursEnabled', enable);
		}
	});
	saveData();
}

function setCompletion(enable) {
	autoCompletion = enable;
	processNode(tree, function(item) {
		if (item.children[1].innerText.slice(
			item.children[1].innerText.lastIndexOf('.') + 1) === 'py') {
			item.code.editor.setOption('enableLiveAutocompletion', enable);
		}
	});
	saveData();
}

function setKeyBindings(el) {
	keyBindings = el.value;
	switch (keyBindings) {
		case 'Vim':
			for (let i = 0; i < codeArea.childElementCount; i++) {
				codeArea.children[i].editor.setKeyboardHandler('ace/keyboard/vim');
			}
			break;
		case 'Emacs':
			for (let i = 0; i < codeArea.childElementCount; i++) {
				codeArea.children[i].editor.setKeyboardHandler('ace/keyboard/emacs');
			}
			break;
		case 'Sublime':
			for (let i = 0; i < codeArea.childElementCount; i++) {
				codeArea.children[i].editor.setKeyboardHandler('ace/keyboard/sublime');
			}
			break;
		case 'VSCode':
			for (let i = 0; i < codeArea.childElementCount; i++) {
				codeArea.children[i].editor.setKeyboardHandler('ace/keyboard/vscode');
			}
			break;
		default:
			for (let i = 0; i < codeArea.childElementCount; i++) {
				codeArea.children[i].editor.setKeyboardHandler(null);
			}
	}
	saveData();
}

function setDarkMode(dark) {
	darkMode = dark;
	if (dark) {
		document.body.classList.add('dark-theme');
	} else {
		document.body.classList.remove('dark-theme');
	}
	for (let i = 0; i < codeArea.childElementCount; i++) {
		if (dark) {
			codeArea.children[i].editor.setTheme('ace/theme/monokai');
		} else {
			codeArea.children[i].editor.setTheme('ace/theme/chrome');
		}
	}
	saveData();
}

function setAutoSave(el) {
	switch(el.value) {
		case 'disabled':
			autoSave = 0;
			break;
		case '30 seconds':
			autoSave = 30;
			break;
		case '1 minute':
			autoSave = 60;
			break;
		case '5 minutes':
			autoSave = 300;
			break;
	}
	saveData();
}

function repoData() {
	const dataForm = document.getElementById('repo-data');
	document.getElementById('repo-name').value = repo;
	document.getElementById('repo-desc').value = repos[currentRepo].desc;
	dataForm.style.display = 'unset';
	document.getElementById('repo-name').focus();
	document.getElementById('repo-name').onkeypress = function(ev) {
		if (invalidFileNameChars.includes(ev.key)) {
			return false;
		}
	}
	document.onmousedown = function(ev) {
		if (!dataForm.contains(ev.target)) {
			dataForm.style.display = 'none';
			document.onmousedown = null;
		}
	}
	document.getElementById('repo-delete').onkeydown = function(ev) {
		if (!ev.shiftKey && (ev.key === 'Tab')) {
			dataForm.style.display = 'none';
			document.onmousedown = null;
		}
	}
	document.getElementById('repo-name').onkeydown = function(ev) {
		if (ev.shiftKey && (ev.key === 'Tab')) {
			dataForm.style.display = 'none';
			document.onmousedown = null;
		}
	}
}

async function changeRepoName() {
	const list = document.getElementById('repo-list');
	const name = document.getElementById('repo-name');
	const dataForm = document.getElementById('repo-data');
	let exists = false;
	for (let i = 0; i < repos.length; i++) {
		if (name.value == repos[i].name) {
			exists = true;
		}
	}
	if (exists) {
		document.getElementById('repo-data').style.display = 'unset';
		name.focus();
		document.onmousedown = function(ev) {
			if (!dataForm.contains(ev.target)) {
				dataForm.style.display = 'none';
				document.onmousedown = null;
			}
		}
		document.getElementById('repo-delete').onkeydown = function(ev) {
			if (!ev.shiftKey && (ev.key === 'Tab')) {
				dataForm.style.display = 'none';
				document.onmousedown = null;
			}
		}
		document.getElementById('repo-name').onkeydown = function(ev) {
			if (ev.shiftKey && (ev.key === 'Tab')) {
				dataForm.style.display = 'none';
				document.onmousedown = null;
			}
		}
		name.value = 'This repository already exists';
		name.style.color = '#7f0000';
		setTimeout(function() {
			name.value = repo;
			name.style.color = '#7f7f7f';
		}, 1000);
		return false;
	} else {
		repos[currentRepo].name = document.getElementById('repo-name').value;
		repo = repos[currentRepo].name;
		document.getElementById('repo-text').innerHTML = '&#8942;&nbsp;' + repo;
		list.children[list.childElementCount - currentRepo - 1].innerText = repo;
		changed = true;
		await saveData();
	}
}

async function changeRepoDesc() {
	repos[currentRepo].desc = document.getElementById('repo-desc').value;
	await saveData();
}

function showDeleteRepo() {
	document.onmousedown = null;
	document.getElementById('repo-data').style.display = 'none';
	document.getElementById('login-screen').style.display = 'block';
	document.getElementById('delete-repo').style.display = 'flex';
	preventTab(true);
}

function hideDeleteRepo() {
	document.getElementById('login-screen').style.display = 'none';
	document.getElementById('delete-repo').style.display = 'none';
	restoreTab();
}

async function deleteRepo() {
	clearData();
	const list = document.getElementById('repo-list');
	if (repos.length > 1) {
		list.removeChild(list.children[list.childElementCount - currentRepo - 1]);
		repos.splice(currentRepo, 1);
		if (currentRepo > 0) {
			currentRepo--;
		}
		list.children[list.childElementCount - currentRepo - 1].classList.add('current-repo');
		repo = repos[currentRepo].name;
		importPath = repos[currentRepo].path;
		const files = repos[currentRepo].files;
		for (let i = 0; i < files.length; i++) {
			if (files[i].type == 'file') {
				createFile(files[i].name, tree, (user == 'anonymous') ? files[i].text : '');
			} else {
				createDir(files[i].name, tree, files[i].contents);
			}
		}
		setActive(tree.firstElementChild.firstElementChild, true);
		document.getElementById('repo-text').innerHTML = '&#8942;&nbsp;' + repo;
		hideDeleteRepo();
		await saveData();
	} else {
		repos = [];
		currentRepo = 0;
		list.innerHTML = '';
		await createRepo();
		document.getElementById('repo-text').innerHTML = '&#8942;&nbsp;' + repo;
		hideDeleteRepo();
	}
}

function resizeInput() {
	if (terminalInput) {
		terminalInput.style.height = (Math.ceil((terminalInput.value.length + 4) *
			7.83 / terminalInput.offsetWidth) * 16) + 'px';
	}
}

function toPrompt() {
	if (terminalInput) {
		terminalInput.focus();
		consoleFocus = true;
	}
}

async function run(ev) {
	const runButton =	document.getElementById('run-button');
	runButton.blur();
	if (executing || !brythonLoaded) {
		ev.preventDefault();
		return;
	}
	if (runClicked) {
		stopRunning();
	} else {
		if (editingItem && (editingItem.code.value !== '')) {
			__BRYTHON__.path = [defaultPortal + '/' + importPath];
			__BRYTHON__.imported = imported;
			runButton.classList.add('run');
			runButton.firstElementChild.innerHTML = 'Stop&nbsp;';
			runButton.lastElementChild.classList.remove('fa-play');
			runButton.lastElementChild.classList.add('fa-stop');
			runClicked = true;
		}
	}
}

function stopRunning() {
	const runButton =	document.getElementById('run-button');
	runButton.classList.remove('run');
	runButton.firstElementChild.innerHTML = 'Run&nbsp;';
	runButton.lastElementChild.classList.add('fa-play');
	runButton.lastElementChild.classList.remove('fa-stop');
	runClicked = false;
}

function clearConsole() {
	document.getElementById('clear-console').blur();
}

async function login() {
	seed = localStorage.getItem(window.appId);
	if (seed) {
		const {username, password} = await window.recoverPassword(seed);
		user = username;
		await loadData(user);
		document.getElementById('logout-text').innerText = 'Sign out\xa0';
		document.getElementById('logout-icon').innerHTML = '<i class="fas fa-sign-out-alt"></i>';
	} else {
		loadDataFromStorage();
	}
	if (darkMode) {
		document.body.classList.add('dark-theme');
	} else {
		document.body.classList.remove('dark-theme');
	}
	if (autoSave > 0) {
		window.setInterval(saveChanges, autoSave * 1000);
	}
	terminalInput.style.tabSize = tabSize;
	output.style.tabSize = tabSize;
}

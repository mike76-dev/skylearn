import sys
import builtins
import tb as traceback
from browser import document, window, worker, console

_credits = """Thanks to CWI, CNRI, BeOpen.com, Zope Corporation and a cast of thousands
  for supporting Python development.  See www.python.org for more information."""

_copyright = """Copyright (c) 2020-2021 mike76 https://github.com/mike76-dev/skylearn
All Rights Reserved.
Copyright (c) 2012, Pierre Quentel pierre.quentel@gmail.com
All Rights Reserved.
Copyright (c) 2001-2013 Python Software Foundation.
All Rights Reserved.
Copyright (c) 2000 BeOpen.com.
All Rights Reserved.
Copyright (c) 1995-2001 Corporation for National Research Initiatives.
All Rights Reserved.
Copyright (c) 1991-1995 Stichting Mathematisch Centrum, Amsterdam.
All Rights Reserved."""

_license = """Copyright (c) 2012, Pierre Quentel pierre.quentel@gmail.com
All rights reserved.
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
Redistributions of source code must retain the above copyright notice, this
list of conditions and the following disclaimer. Redistributions in binary
form must reproduce the above copyright notice, this list of conditions and
the following disclaimer in the documentation and/or other materials provided
with the distribution.
Neither the name of the <ORGANIZATION> nor the names of its contributors may
be used to endorse or promote products derived from this software without
specific prior written permission.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE."""

class Info:

	def __init__(self, msg):
		self.msg = msg

	def __repr__(self):
		return self.msg

# execution namespace
editor_ns = {
	'credits': Info(_credits),
	'copyright': Info(_copyright),
	'license': Info(_license),
	'__annotations__': {},
	'__builtins__': builtins,
	'__doc__': None,
	'__name__': '__main__'
}

class Trace:

	def __init__(self, parent=None):
		self.buf = ""
		self.parent = parent

	def write(self, data):
		self.buf += str(data)
		if self.parent is not None and len(self.buf) > 256:
			self.parent.flush()

	def format(self):
		"""Remove calls to function in this script from the traceback."""
		lines = self.buf.split("\n")
		stripped = [lines[0]]
		for i in range(1, len(lines), 2):
			if __file__ in lines[i]:
				continue
			stripped += lines[i: i+2]
		return "\n".join(stripped)

class Interactive:
	"""Add a Python interactive interpreter in a textarea."""

	def __init__(self, globals=None, locals=None):
		"""Create the interpreter.
			- "globals" and "locals" are the namespaces the REPL runs in
		"""
		self.terminal = document["terminal"]
		self.input = document["terminal-input"]
		v = sys.implementation.version
		text = document.createTextNode(f"Brython {v[0]}.{v[1]}.{v[2]} on " +
			f"{window.navigator.appName} {window.navigator.appVersion}\n")
		self.terminal.replaceChild(text, self.terminal.firstChild)
		self.insert_prompt()
		self._status = "main"
		self.current = 0
		self.history = []
		self.block = ""
		self.console = Trace(self)
		sys.stdout = self.console
		self.globals = {} if globals is None else globals
		self.globals.update(editor_ns)
		self.locals = self.globals if locals is None else locals
		self.runner = worker.Worker("worker")
		self.runner.bind("message", self.onmessage)
		self.input.bind("keypress", self.keypress)
		self.input.bind("keydown", self.keydown)
		self.input.bind("mouseup", self.mouseup)
		document["clear-console"].bind("click", self.clear)
		document["run-button"].bind("click", self.run)
		self.input.style.display = "inline-block"
		document["clear-console"].style.display = "inline-block"
		window.brythonLoaded = True
		if window.consoleFocus:
			self.input.focus()

	def flush(self):
		if self.console.buf != "":
			text = document.createTextNode(self.console.buf)
			self.terminal.insertBefore(text, self.input)
			self.console.buf = ""

	def clear(self, event):
		if window.executing or window.running:
			self.runner.terminate()
			self.runner = worker.Worker("worker")
			self.runner.bind("message", self.onmessage)
			window.executing = False
			if window.running:
				window.running = False
				window.stopRunning()
		self.input.value = ""
		while self.terminal.firstChild != self.input:
			self.terminal.removeChild(self.terminal.firstChild)
		self.insert_prompt()
		self._status = "main"
		self.current = 0
		self.history = []
		self.block = ""
		for g in list(self.globals):
			if g[0:2] != "__":
				del self.globals[g]
		del g
		self.globals.update(editor_ns)
		if window.consoleFocus:
			self.input.focus()
		console.clear()

	def cursor_to_end(self, *args):
		pos = len(self.input.value)
		self.input.setSelectionRange(pos, pos)
		self.terminal.scrollTop = self.terminal.scrollHeight

	def insert_prompt(self, multi_line=False):
		s = "... " if multi_line else ">>> "
		prompt = document.createElement("span")
		prompt.classList.add("prompt")
		prompt <= s
		self.terminal.insertBefore(prompt, self.input)

	def keypress(self, event):
		if event.keyCode == 13:  # return
			if window.running or window.executing:
				event.preventDefault()
				return
			window.__BRYTHON__.path = [window.defaultPortal + '/' + window.importPath]
			sel_start = self.input.selectionStart
			sel_end = self.input.selectionEnd
			if sel_end > sel_start:
				# If text was selected by the mouse, copy to clipboard
				document.execCommand("copy")
				self.cursor_to_end()
				event.preventDefault() # don't insert line feed
				return
			currentLine = self.input.value
			self.input.value = ""
			if self._status == 'main' and not currentLine.strip():
				text = document.createTextNode("\n")
				self.terminal.insertBefore(text, self.input)
				self.insert_prompt()
				event.preventDefault()
				return
			text = document.createTextNode(currentLine + "\n")
			self.terminal.insertBefore(text, self.input)
			self.history.append(currentLine)
			self.current = len(self.history)
			if self._status in ["main", "3string"]:
				try:
					_ = self.globals['_'] = eval(currentLine, self.globals, self.locals)
					if _ is not None:
						text = document.createTextNode(repr(_) + "\n")
						self.terminal.insertBefore(text, self.input)
					self.flush()
					self.insert_prompt()
					self._status = "main"
				except IndentationError:
					self.insert_prompt(True)
					self._status = "block"
					if self.block != "":
						self.block += "\n"
					self.block += currentLine
				except SyntaxError as msg:
					if str(msg) == 'invalid syntax : triple string end not found' or \
						str(msg).startswith('Unbalanced bracket'):
						self.insert_prompt(True)
						self._status = "3string"
					elif str(msg) == 'eval() argument must be an expression':
						window.executing = True
						self.input.blur()
						self.runner.send([window.defaultPortal + '/' + window.importPath, currentLine, True])
						self._status = "main"
					elif str(msg) == 'decorator expects function':
						self.insert_prompt(True)
						self._status = "block"
						if self.block != "":
							self.block += "\n"
						self.block += currentLine
					else:
						self.syntax_error(msg.args)
						self.insert_prompt()
						self._status = "main"
				except:
					# the full traceback includes the call to eval(); to
					# remove it, it is stored in a buffer and the 2nd and 3rd
					# lines are removed
					self.print_tb()
					self.insert_prompt()
					self._status = "main"
			elif currentLine == "":  # end of block
				# status must be set before executing code in globals()
				self._status = "main"
				window.executing = True
				self.input.blur()
				self.runner.send([window.defaultPortal + '/' + window.importPath, self.block, True])
				self.block = ""
			else:
				self.insert_prompt(True)
				if self.block != "":
					self.block += "\n"
				self.block += currentLine
			self.cursor_to_end()
			event.preventDefault()
		window.resizeInput()

	def keydown(self, event):
		if event.keyCode == 9:  # tab key
			event.preventDefault()
			document.execCommand("insertText", False, window.tabCharacter)
			window.resizeInput()
		elif event.keyCode == 38:  # up
			if self.current > 0:
				self.current -= 1
				self.input.value = self.history[self.current]
			event.preventDefault()
		elif event.keyCode == 40:  # down
			if self.current < len(self.history) - 1:
				self.current += 1
				self.input.value = self.history[self.current]
			event.preventDefault()
		elif event.ctrlKey and event.keyCode in [35, 36]: # ctrl+home, ctrl+end
			event.preventDefault()
		elif event.keyCode in [33, 34]: # page up, page down
			event.preventDefault()

	def mouseup(self, ev):
		"""If nothing was selected by the mouse, set cursor to prompt."""
		sel_start = self.input.selectionStart
		sel_end = self.input.selectionEnd
		if sel_end == sel_start:
			self.cursor_to_end()

	def print_tb(self):
		trace = Trace()
		traceback.print_exc(file=trace)
		tb = document.createElement("span")
		tb.classList.add("traceback")
		tb <= trace.format()
		self.terminal.insertBefore(tb, self.input)

	def syntax_error(self, args):
		info, [filename, lineno, offset, line] = args
		trace = Trace()
		print(f"  File {filename}, line {lineno}", file=trace)
		print("    " + line, file=trace)
		print("    " + offset * " " + "^", file=trace)
		print("SyntaxError:", info, file=trace)
		tb = document.createElement("span")
		tb.classList.add("traceback")
		tb <= trace.format()
		self.terminal.insertBefore(tb, self.input)

	def run(self, evt):
		if not window.brythonLoaded:
			return
		if window.executing:
			return
		if window.running:
			self.runner.terminate()
			self.runner = worker.Worker("worker")
			self.runner.bind("message", self.onmessage)
			window.running = False
			tb = document.createElement("span")
			tb.classList.add("traceback")
			tb <= "<execution terminated>\n"
			self.terminal.insertBefore(tb, self.input)
			self.insert_prompt()
			window.stopRunning()
			if window.consoleFocus:
				self.input.focus()
			self.cursor_to_end()
			return
		if window.editingItem is not None:
			if window.changed:
				window.saveData()
			text = document.createTextNode("\n")
			self.terminal.insertBefore(text, self.input)
			window.running = True
			self.runner.send([window.defaultPortal + '/' + window.importPath, window.editingItem.code.editor.getValue(), False])

	def onmessage(self, evt):
		if len(evt.data[0]) != 0:
			out = document.createTextNode(evt.data[0])
			self.terminal.insertBefore(out, self.input)
		if len(evt.data[1]) != 0:
			tb = document.createElement("span")
			tb.classList.add("traceback")
			tb <= evt.data[1]
			self.terminal.insertBefore(tb, self.input)
		if evt.data[2]:
			self.insert_prompt()
			if window.running:
				window.running = False
				window.stopRunning()
			if window.executing:
				window.executing = False
			if window.consoleFocus:
				self.input.focus()
		self.cursor_to_end()

Interactive()

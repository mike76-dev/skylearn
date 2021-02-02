from browser import bind, self
import sys
import time
import tb as traceback

class cConsole:

	def __init__(self):
		self.value = ""

class cOutput:
	encoding = "utf-8"

	def __init__(self, parent):
		self.cons = cConsole()
		self.parent = parent

	def write(self, data):
		self.cons.value += data
		if len(self.cons.value) > 256:
			self.parent.send([self.cons.value, "", False])
			self.cons.value = ""

class cError:
	encoding = "utf-8"

	def __init__(self, parent):
		self.cons = cConsole()
		self.parent = parent

	def write(self, data):
		self.cons.value += data
		if len(self.cons.value) > 256:
			self.parent.send(["", self.cons.value, False])
			self.cons.value = ""

cOut = cOutput(self)
cErr = cError(self)
sys.stdout = cOut
sys.stderr = cErr

@bind(self, "message")
def message(evt):
	global cOut, cErr, __BRYTHON__
	cOut.cons.value = cErr.cons.value = ""
	__BRYTHON__.path = [evt.data[0]]
	__BRYTHON__.imported = {}
	t0 = time.perf_counter()
	try:
		ns = {"__name__":"__main__"}
		exec(evt.data[1], ns)
		if not evt.data[2]:
			print("<completed in %6.2f ms>" % ((time.perf_counter() - t0) * 1000.0))
	except Exception as exc:
		traceback.print_exc(file=sys.stderr)
	finally:
		self.send([cOut.cons.value, cErr.cons.value, True])

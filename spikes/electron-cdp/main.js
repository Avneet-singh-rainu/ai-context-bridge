const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const results = {
	startedAt: new Date().toISOString(),
	lifecycle: [],
	cdpEvents: [],
	cdpErrors: [],
	responseBodies: [],
	webRequest: [],
	dom: null,
	isolation: {
		nodeIntegration: false,
		contextIsolation: true,
		sandbox: true
	}
};

let server = null;
let finished = false;
let watchdog = null;

function record(message) {
	results.lifecycle.push(message);
	console.log('SPIKE_LOG=' + message);
}

function finishSpike(reason) {
	if (finished) return;
	finished = true;
	if (watchdog) clearTimeout(watchdog);
	results.finishedAt = new Date().toISOString();
	results.reason = reason;
	fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
	console.log('SPIKE_RESULT=' + JSON.stringify(results));
	if (server) server.close();
	app.quit();
}

function startServer() {
	return new Promise((resolve, reject) => {
		const httpServer = http.createServer((req, res) => {
			record('http request ' + req.url);
			if (req.url === '/data.json') {
				res.setHeader('Content-Type', 'application/json; charset=utf-8');
				res.end(JSON.stringify({ ok: true, items: [10, 20, 30] }));
				return;
			}
			res.setHeader('Content-Type', 'text/html; charset=utf-8');
			res.end(`<!doctype html>
<html>
  <head><title>Bridge CDP Test</title></head>
  <body>
    <h1>Bridge CDP Test</h1>
    <p>Structured data: <span id="result">loading</span></p>
    <script>
      fetch('/data.json')
        .then((response) => response.json())
        .then((data) => { document.getElementById('result').textContent = JSON.stringify(data); });
    </script>
  </body>
</html>`);
		});
		httpServer.on('error', reject);
		httpServer.listen(PORT, '127.0.0.1', () => resolve(httpServer));
	});
}

function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

app.whenReady().then(async () => {
	try {
		record('app ready');
		server = await startServer();
		record('server listening');
		watchdog = setTimeout(() => finishSpike('watchdog'), 25000);

		const win = new BrowserWindow({
			width: 900,
			height: 600,
			show: true,
			webPreferences: {
				nodeIntegration: false,
				contextIsolation: true,
				sandbox: true
			}
		});
		record('browser window created');

		win.webContents.on('did-start-loading', () => record('did-start-loading'));
		win.webContents.on('did-finish-load', async () => {
			record('did-finish-load');
			await wait(500);
			try {
				results.dom = await win.webContents.executeJavaScript(`({
          title: document.title,
          heading: document.querySelector('h1') ? document.querySelector('h1').textContent : null,
          result: document.getElementById('result') ? document.getElementById('result').textContent : null
        })`);
				record('dom extracted');
			} catch (error) {
				results.cdpErrors.push(`DOM extraction: ${error.message}`);
			}
			record('window visible for 8 more seconds');
			await wait(8000);
			finishSpike('load');
		});
		win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
			results.cdpErrors.push(`did-fail-load ${errorCode} ${errorDescription} ${validatedURL}`);
			finishSpike('load-failed');
		});
		win.webContents.on('render-process-gone', (event, details) => {
			results.cdpErrors.push(`render-process-gone ${details.reason} ${details.exitCode}`);
			finishSpike('renderer-gone');
		});
		win.webContents.session.webRequest.onCompleted(
			{ urls: [`http://127.0.0.1:${PORT}/*`] },
			(details) => {
				results.webRequest.push({
					url: details.url,
					method: details.method,
					statusCode: details.statusCode,
					mimeType: details.mimeType,
					responseHeaders: details.responseHeaders
				});
			}
		);

		const debuggerClient = win.webContents.debugger;
		try {
			debuggerClient.attach('1.3');
			record('debugger attached');
		} catch (error) {
			results.cdpErrors.push(`attach: ${error.message}`);
		}

		debuggerClient.on('message', async (event, method, params) => {
			if (method === 'Network.requestWillBeSent') {
				results.cdpEvents.push({
					type: 'request',
					requestId: params.requestId,
					url: params.request.url,
					method: params.request.method,
					typeHint: params.type
				});
			}
			if (method === 'Network.responseReceived') {
				results.cdpEvents.push({
					type: 'response',
					requestId: params.requestId,
					url: params.response.url,
					status: params.response.status,
					mimeType: params.response.mimeType
				});
				if (params.response.url.endsWith('/data.json')) {
					try {
						const body = await debuggerClient.sendCommand('Network.getResponseBody', {
							requestId: params.requestId
						});
						results.responseBodies.push({
							url: params.response.url,
							body: body.body,
							base64Encoded: body.base64Encoded
						});
						record('response body captured');
					} catch (error) {
						results.cdpErrors.push(`getResponseBody: ${error.message}`);
					}
				}
			}
			if (method === 'Network.loadingFailed') {
				results.cdpEvents.push({
					type: 'failed',
					requestId: params.requestId,
					errorText: params.errorText
				});
			}
		});

		debuggerClient.sendCommand('Network.enable')
			.then(() => record('Network.enable sent'))
			.catch((error) => results.cdpErrors.push(`Network.enable: ${error.message}`));

		try {
			await win.loadURL(`http://127.0.0.1:${PORT}/`);
			record('loadURL resolved');
		} catch (error) {
			results.cdpErrors.push(`loadURL: ${error.message}`);
			finishSpike('load-url-error');
		}
	} catch (error) {
		results.cdpErrors.push(`spike error: ${error.stack || error.message}`);
		finishSpike('error');
	}
}).catch((error) => {
	results.cdpErrors.push(`whenReady rejected: ${error.stack || error.message}`);
	finishSpike('when-ready-rejected');
});

app.on('window-all-closed', () => app.quit());

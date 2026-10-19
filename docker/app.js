#!/usr/bin/env node
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { startService } from 'kugoumusicapi';
import packageJson from './package.json' with { type: 'json' };

const { name, version } = packageJson;

const app = express();

if(Number(process.env.set_custom_headers || 1) !== 0) app.use((req, res, next) => {
	res.set({
		Server: `${name}/${version}`,
		'X-Powered-By': name
	});
	next();
});

app.use(express.static('dist'));

app.use('/api', createProxyMiddleware({
	target: 'http://127.0.0.1:6521'
}));

app.use((req, res) => {
	res.status(403).send({ status: 403, message: 'Forbidden' });
	return;
});

startService().then(() => {
	app.listen(8080, () => {
		console.log('(OwO) MoeKoe Music Docker running @ http://127.0.0.1:8080');
	});
}).catch(e => { throw e; });

process.once('uncaughtException', (e, o) => {
	console.error('(XwX) Oops, a fatal error occurred. process will be close', e, o);
	process.exit(1);
});

process.on('SIGINT', () => {
	console.log('(u.u) See you next time');
	process.exit(0);
});

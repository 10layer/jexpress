const config = require('config');
const Ws = require("ws");

class Websocket {
	constructor() {
		this.connect();
	}
	connect() {
		const self = this;
		this.connected = false;
		this.ws = new Ws(config.websocket);
		this.ws.on("open", () => {
			console.log("Connected to WebSocket " + config.websocket);
			self.connected = true;
		});
		this.ws.on("close", () => {
			self.connected = false;
			console.log("Websocket closed");
			self.connect();
		});
	}
	emit(model, action, _id) {
		var data = {
			type: "broadcast",
			action,
			model,
			_id,
			room: model + "s"
		};
		this.ws.send(JSON.stringify(data));
	}
}


module.exports = Websocket;
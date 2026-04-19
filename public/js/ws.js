export class WebSocketManager {
  constructor(url) {
    this._url = url;
    this._reconnectDelay = 1_000;
    this._intentionalClose = false;
    this.roomCode = null;
    this.playerName = null;
    this.isHost = false;
    this._reconnectToken = null;
    this.messageHandlers = {};
    this._connect();
  }

  _connect() {
    this.ws = new WebSocket(this._url);
    this.ws.onopen = this._onOpen.bind(this);
    this.ws.onmessage = this._onMessage.bind(this);
    this.ws.onclose = this._onClose.bind(this);
    this.ws.onerror = (e) => console.error("WS error", e);
  }

  _onOpen() {
    this._reconnectDelay = 1_000;
    if (!this.roomCode || !this.playerName) return;

    if (this._reconnectToken) {
      this.sendMessage({
        type: "reconnect",
        roomCode: this.roomCode,
        playerName: this.playerName,
        reconnectToken: this._reconnectToken,
      });
    } else {
      this.sendMessage({
        type: "get-data-from-db",
        roomCode: this.roomCode,
        name: this.playerName,
      });
    }
  }

  _onMessage(event) {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    const handler = this.messageHandlers[data.type];
    if (handler) {
      handler(data);
    } else {
      console.warn(`No handler for message type: ${data.type}`);
    }
  }

  _onClose(event) {
    if (this._intentionalClose) return;
    console.warn(`WS closed (${event.code}), reconnecting in ${this._reconnectDelay}ms`);
    setTimeout(() => this._connect(), this._reconnectDelay);
    this._reconnectDelay = Math.min(this._reconnectDelay * 2, 30_000);
  }

  init(roomCode, playerName, isHost, reconnectToken = null) {
    this.roomCode = roomCode;
    this.playerName = playerName;
    this.isHost = isHost;
    this._reconnectToken = reconnectToken;
  }

  on(type, handler) {
    this.messageHandlers[type] = handler;
  }

  sendMessage(message) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WS not open, message dropped:", message.type);
    }
  }

  destroy() {
    this._intentionalClose = true;
    this.ws.close();
  }
}

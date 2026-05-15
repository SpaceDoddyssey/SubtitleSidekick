export class VLCSync {
    constructor(password, port, onTimeUpdate, onStatus) {
        this.password = password;
        this.port = port || 8080;

        this.onTimeUpdate = onTimeUpdate;
        this.onStatus = onStatus;

        this.timer = null;
        this.lastError = null;
        this.connected = false;
    }

    start() {
        if (this.timer) return;

        this.setStatus("Connecting...");

        this.timer = setInterval(() => {
            this.poll();
        }, 200);
    }

    stop() {
        clearInterval(this.timer);
        this.timer = null;

        this.connected = false;
        this.setStatus("Disconnected");
    }

    setStatus(msg) {
        if (this.onStatus) this.onStatus(msg);
    }

    getState() {
        return {
            connected: this.connected,
            running: !!this.timer,
            passwordSet: !!this.password
        };
    }

    async poll() {
        try {
            const auth = btoa(`:${this.password || ""}`);

            const response = await fetch(`http://localhost:${this.port}/requests/status.json`, {
                headers: {
                    Authorization: `Basic ${auth}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.connected = false;
                    this.setStatus("Auth failed (check VLC password)");
                    return;
                }

                this.setStatus(`HTTP error ${response.status}`);
                return;
            }

            const data = await response.json();

            this.connected = true;
            this.setStatus("Connected");

            if (this.onTimeUpdate) {
                this.onTimeUpdate((data.time || 0) * 1000);
            }
        }
        catch (err) {
            this.connected = false;

            if (err instanceof TypeError) {
                this.setStatus("No response (VLC not reachable)");
                return;
            }

            this.setStatus("Unknown error");
            console.warn(err);
        }
    }
}
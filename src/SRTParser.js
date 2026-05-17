export class SRTPlayer {
    constructor(onSubtitleChange, onTimeUpdate) {
        this.subtitles = [];
        this.currentTime = 0;
        this.isPlaying = false;
        this.timer = null;
        this.onSubtitleChange = onSubtitleChange;
        this.onTimeUpdate = onTimeUpdate;
    }

    loadFromText(content) {
        this.subtitles = this.parseSRT(content);
        this.currentTime = 0;
        this.updateSubtitle();
    }

    play() {
        if (this.isPlaying || this.subtitles.length === 0) return;

        this.isPlaying = true;
        let lastTick = performance.now();

        this.timer = setInterval(() => {
            const now = performance.now();
            const delta = now - lastTick;
            lastTick = now;

            this.currentTime += delta;
            this.updateSubtitle();

            if (this.currentTime > this.getDuration()) {
                this.pause();
                this.currentTime = 0;
                this.updateSubtitle();
            }
        }, 100);
    }

    reset() {
        this.pause();
        this.currentTime = 0;
        this.updateSubtitle();
    }

    setTime(ms) {
        this.currentTime = ms;
        this.updateSubtitle();
    }

    scrub(deltaMs) {
        this.currentTime += deltaMs;

        this.currentTime = Math.max(0, Math.min(this.currentTime, this.getDuration()));

        this.updateSubtitle();
    }

    pause() {
        this.isPlaying = false;

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    toggle() {
        this.isPlaying ? this.pause() : this.play();
    }

    getDuration() {
        if (this.subtitles.length === 0) return 0;
        return this.subtitles[this.subtitles.length - 1].end;
    }

    updateSubtitle() {
        const subtitle = this.subtitles.find(s =>
            this.currentTime >= s.start &&
            this.currentTime <= s.end
        );

        this.onSubtitleChange(subtitle?.text ?? "");

        if (this.onTimeUpdate) {
            this.onTimeUpdate(this.currentTime);
        }
    }

    parseTimecode(timecode) {
        const [h, m, rest] = timecode.split(':');
        const [s, ms] = rest.split(',');

        return (
            parseInt(h) * 3600000 +
            parseInt(m) * 60000 +
            parseInt(s) * 1000 +
            parseInt(ms)
        );
    }

    parseSRT(content) {
        return content
            .trim()
            .split(/\r?\n\r?\n/)
            .map(block => {
                const lines = block.split(/\r?\n/);
                const [start, end] = lines[1].split(' --> ');

                return {
                    start: this.parseTimecode(start),
                    end: this.parseTimecode(end),
                    text: lines.slice(2).join('\n')
                };
            });
    }
}
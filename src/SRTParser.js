export class SRTPlayer {
    constructor(onSubtitleChange, onTimeUpdate) {
        this.subtitles = [];
        this.currentIndex = 0;
        this.currentTime = 0;
        this.isPlaying = false;
        this.timer = null;
        this.lastText = "";
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

    setTime(timeMs) {
        this.currentTime = Math.max(0, Math.min(timeMs, this.getDuration()));

        this.currentIndex = this.subtitles.findIndex(s => s.end >= this.currentTime);
        if (this.currentIndex === -1) {
            this.currentIndex = this.subtitles.length;
        }

        this.updateSubtitle();
    }

    scrub(deltaMs) {
        this.setTime(this.currentTime + deltaMs);
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

    timeInRange(subtitle){
        return subtitle 
               && this.currentTime >= subtitle.start
               && this.currentTime <= subtitle.end;
    }

    updateSubtitle() {
        if (this.subtitles.length === 0) return;

        this.currentIndex = this.binarySearch(this.currentTime);

        const subtitle = this.subtitles[this.currentIndex];

        if (subtitle && this.timeInRange(subtitle)) {
            if (subtitle.text !== this.lastText) {
                this.lastText = subtitle.text;
                this.onSubtitleChange(subtitle.text);
            }
        } else {
            this.onSubtitleChange("");
        }

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
                if (!lines[1]) return null;
                if (!lines[1].includes('-->')) return null;
                const [start, end] = lines[1].split(' --> ');

                return {
                    start: this.parseTimecode(start),
                    end: this.parseTimecode(end),
                    text: lines.slice(2).join('\n')
                };
            });
    }

    binarySearch(time) {
        let low = 0, high = this.subtitles.length - 1;

        while (low <= high) {
            const mid = (low + high) >> 1;
            const sub = this.subtitles[mid];

            if (time < sub.start) high = mid - 1;
            else if (time > sub.end) low = mid + 1;
            else return mid;
        }

        return low;
    }
}
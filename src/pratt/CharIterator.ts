import Iterator from "./Iterator.js";

export default class CharIterator extends Iterator<string> {
    previousPosition: [number, number]
    currentPosition: [number, number]

    constructor (str) {
        super (str);
        this.previousPosition = [0, 0];
        this.currentPosition = [0, 0];
    }
    next () {
        const ret = super.next();
        const { value, done } = ret;

        this.previousPosition[0] = this.currentPosition[0];
        this.previousPosition[1] = this.currentPosition[1];

        if (!done) {
            if (value === "\n") {
                this.currentPosition[0]++;
                this.currentPosition[1] = 0;
            }
            else {
                this.currentPosition[1]++;
            }
        }

        return ret;
    }
    position (): [number, number] {
        const pos = this.currentPosition;
        return [pos[0], pos[1]];
    }
    back () {
        super.back();

        const temp = this.currentPosition;
        this.currentPosition = this.previousPosition;
        this.previousPosition = temp;
    }
}
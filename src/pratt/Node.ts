export default class Node {
    type: string
    data: unknown
    start: [number, number]
    end: [number, number]

    constructor (type: string, start: [number, number], end: [number, number], data: unknown) {
        this.type = type;
        this.data = data;
        this.start = start;
        this.end = end;
    }
    toString () {
        return `(${this.type} ${this.data})`;
    }
}
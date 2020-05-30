export default class Node<T = unknown> {
    type: string
    data: T
    start: [number, number]
    end: [number, number]

    constructor (type: string, start: [number, number], end: [number, number], data: T) {
        this.type = type;
        this.data = data;
        this.start = start;
        this.end = end;
    }
    toString () {
        return `(${this.type} ${this.data})`;
    }
}
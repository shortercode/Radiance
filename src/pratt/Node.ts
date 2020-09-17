export default class Node<T = unknown, Name extends string = string> {
	type: Name
	data: T
	start: [number, number]
	end: [number, number]

	constructor(type: Name, start: [number, number], end: [number, number], data: T) {
		this.type = type;
		this.data = data;
		this.start = start;
		this.end = end;
	}
	toString() {
		return `(${this.type} ${this.data})`;
	}
}
import { Writer } from "./Writer";

export class ModuleContext {
	readonly writer: Writer
	readonly function_index_map: Map<number, number> = new Map
	readonly memory_index_map: Map<number, number> = new Map
	
	constructor(writer: Writer) {
		this.writer = writer;
	}
}
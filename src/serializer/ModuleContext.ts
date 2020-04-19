import { Writer } from "./Writer";
import { PrimativeTypes, AtiumType } from "../compiler/AtiumType";

export class ModuleContext {
	readonly writer: Writer
	readonly type_index_map: Map<string, {
		result: AtiumType,
		parameters: Array<AtiumType>
		index: number
	}> = new Map
	readonly function_index_map: Map<number, number> = new Map
	readonly memory_index_map: Map<number, number> = new Map
	readonly global_index_map: Map<number, number> = new Map
	
	constructor(writer: Writer) {
		this.writer = writer;
	}
}
import { Writer } from "./Writer";
import { LangType } from "../compiler/LangType";
import { WASTDataNode } from "../WASTNode";

export class ModuleContext {
	readonly writer: Writer
	readonly type_index_map: Map<string, {
		result: LangType,
		parameters: Array<LangType>
		index: number
	}> = new Map
	readonly function_index_map: Map<number, number> = new Map
	readonly memory_index_map: Map<number, number> = new Map
	readonly global_index_map: Map<number, number> = new Map
	readonly data_index_map: Map<WASTDataNode, number> = new Map
	
	constructor(writer: Writer) {
		this.writer = writer;
	}
}
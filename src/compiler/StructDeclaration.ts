import { LangType, StructLangType } from "./LangType";
import { Ref } from "../WASTNode";

const size_map: WeakMap<StructDeclaration, number> = new WeakMap();
export class StructDeclaration {
	readonly name: string
	readonly type: StructLangType
	readonly fields: Map<string, LangType>
	readonly source: Ref
	
	get size(): number {
		const cached = size_map.get(this);
		if (typeof cached !== "undefined") {
			return cached;
		}
		let size = 0;
		for (const type of this.fields.values()) {
			size += type.size;
		}
		size_map.set(this, size);
		return size;
	}

	constructor (ref: Ref, name: string, fields: Map<string, LangType>) {
		this.source = ref;
		this.name = name;
		this.fields = fields;
		this.type = new StructLangType(fields, name);
	}
}
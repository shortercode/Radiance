import { StructLangType, EnumLangType, EnumCaseLangType } from "./LangType";
import { Ref } from "../WASTNode";

export class EnumDeclaration {
	readonly name: string
	readonly type: EnumLangType
	readonly size: number
	readonly cases: Map<string, EnumCaseDeclaration> = new Map
	readonly source: Ref
	
	constructor (ref: Ref, name: string, size: number) {
		this.source = ref;
		this.name = name;
		this.size = size;
		this.type = new EnumLangType(name);
	}

	add_variant (name: string, variant: EnumCaseDeclaration) {
		this.cases.set(name, variant);
		this.type.add_variant(name, variant.type);
	}
}

export class EnumCaseDeclaration {
	readonly name: string
	readonly type: EnumCaseLangType
	readonly size: number
	readonly source: Ref
	readonly index: number
	readonly parent: EnumDeclaration
	
	constructor (ref: Ref, name: string, parent: EnumDeclaration, struct_type: StructLangType, size: number, case_index: number) {
		this.source = ref;
		this.name = name;
		this.parent = parent;
		this.type = new EnumCaseLangType(name, parent.type, struct_type, case_index);
		this.size = size;
		this.index = case_index;
	}
}
import { StructLangType, EnumLangType, EnumCaseLangType } from "./LangType";
import { Ref } from "../WASTNode";

export class EnumDeclaration {
	readonly name: string
	readonly type: EnumLangType
	readonly size: number
	readonly cases: Map<string, EnumCaseDeclaration>
	readonly source: Ref
	
	constructor (ref: Ref, name: string, cases: Map<string, EnumCaseDeclaration>, size: number) {
		this.source = ref;
		this.name = name;
		this.cases = cases;
		this.size = size;

		const types: Map<string, EnumCaseLangType> = new Map;

		for (const [name, cse] of cases.entries()) {
			types.set(name, cse.type);
		}

		this.type = new EnumLangType(name, types);
	}
}

export class EnumCaseDeclaration {
	readonly name: string
	readonly type: EnumCaseLangType
	readonly size: number
	readonly source: Ref
	readonly index: number
	
	constructor (ref: Ref, name: string, struct_type: StructLangType, size: number, case_index: number) {
		this.source = ref;
		this.name = name;
		this.type = new EnumCaseLangType(name, struct_type, case_index);
		this.size = size;
		this.index = case_index;
	}
}
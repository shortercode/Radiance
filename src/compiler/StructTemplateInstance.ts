import { LangType, StructLangType } from "./LangType";

export interface StructTemplateInstance {
	readonly type: StructLangType
	readonly generics: LangType[]
	readonly size: number
	readonly fields: Map<string, LangType>
	readonly name: string
}
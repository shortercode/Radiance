import { LangType } from "./LangType";

export interface StructTemplateInstance {
	readonly type: LangType
	readonly generics: LangType[]
	readonly size: number
	readonly fields: Map<string, LangType>
	readonly name: string
}
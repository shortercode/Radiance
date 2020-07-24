import { LangType, EnumCaseLangType, EnumLangType } from "./LangType";

export interface EnumTemplateInstance {
	readonly cases: Map<string, EnumCaseTemplateInstance>
	readonly type: EnumLangType
	readonly generics: LangType[]
}

export interface EnumCaseTemplateInstance {
	readonly name: string
	readonly parent: EnumTemplateInstance
	readonly type: EnumCaseLangType
}
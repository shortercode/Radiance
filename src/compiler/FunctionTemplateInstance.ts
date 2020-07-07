import { LangType } from "./LangType";
import { Variable } from "./Variable";
import { AST } from "./core";

export interface FunctionTemplateInstance {
	readonly type: LangType
	readonly generics: LangType[]
	readonly parameters: Variable[]
	readonly id: Symbol
	readonly name: string
	readonly body: AST[]
}
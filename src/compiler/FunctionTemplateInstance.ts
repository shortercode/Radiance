import { LangType } from "./LangType";
import { Variable } from "./Variable";
import { AST } from "./core";
import { Frame } from "./Frame";

export interface FunctionTemplateInstance {
	readonly type: LangType
	readonly generic_names: string[]
	readonly scope: Frame[]
	readonly generics: LangType[]
	readonly parameters: Variable[]
	readonly id: Symbol
	readonly name: string
	readonly body: AST[]
}
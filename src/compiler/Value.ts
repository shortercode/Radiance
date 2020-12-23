import { LangType } from "./LangType";

export interface Value {
	type: LangType;
	readonly mutable: boolean;
	readonly constant: boolean;
}
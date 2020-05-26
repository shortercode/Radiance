import { WASTConstNode, WASTExpressionNode, Ref } from "../WASTNode";
import { compiler_error } from "./error";
import { LangType } from "./LangType";

export function default_initialiser(ref: Ref, value_type: LangType): WASTExpressionNode {
	if (value_type.is_boolean() || value_type.is_numeric()) {
		return new WASTConstNode(ref, value_type, "0");
	}

	compiler_error(ref, `Unable to zero initialise`);
}
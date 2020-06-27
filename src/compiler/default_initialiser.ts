import { WASTConstNode, WASTExpressionNode, Ref } from "../WASTNode";
import { compiler_error } from "./error";
import { LangType } from "./LangType";

export function default_initialiser(ref: Ref, value_type: LangType): WASTExpressionNode {
	if (value_type.is_boolean() || value_type.is_numeric()) {
		return zero_initialiser(ref, value_type);
	}

	compiler_error(ref, `Unable to zero initialise`);
}

export function zero_initialiser(ref: Ref, value_type: LangType): WASTExpressionNode {
	return new WASTConstNode(ref, value_type, "0");
}
import { WASTConstNode, WASTExpressionNode, Ref } from "../WASTNode";
import { compiler_error } from "./error";
import { AtiumType } from "./AtiumType";

export function default_initialiser(ref: Ref, value_type: AtiumType): WASTExpressionNode {
	if (value_type.is_boolean() || value_type.is_numeric()) {
		return new WASTConstNode(ref, value_type, "0");
	}

	compiler_error(ref, `Unable to zero initialise`);
}
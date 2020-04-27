import { WASTConstNode, WASTExpressionNode } from "../WASTNode";
import { compiler_error } from "./error";
import { AST } from "./core";
import { AtiumType } from "./AtiumType";

export function default_initialiser(node: AST, value_type: AtiumType): WASTExpressionNode {
	if (value_type.is_boolean() || value_type.is_numeric()) {
		return new WASTConstNode(node, value_type, "0");
	}

	compiler_error(node, `Unable to zero initialise`);
}
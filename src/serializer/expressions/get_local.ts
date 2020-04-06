import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTGetLocalNode } from "../../WASTNode";
import { Opcode } from "../OpCode";

export function write_get_local_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const get_local_node = node as WASTGetLocalNode;
	const local_id = ctx.variable_lookup.get(get_local_node.id);

	if (typeof local_id !== "number")
		throw new Error(`Cannot find local ${get_local_node.name}`);

	ctx.push_value(get_local_node.value_type);
	
	ctx.writer.writeUint8(Opcode.local_get);
	ctx.writer.writeUVint(local_id);
}
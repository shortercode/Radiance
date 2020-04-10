import { write_expression } from "./expression";
import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTTeeLocalNode } from "../../WASTNode";
import { Opcode } from "../OpCode";

export function write_tee_local_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const tee_local_node = node as WASTTeeLocalNode;
	const local_id = ctx.variable_lookup.get(tee_local_node.id);

	if (typeof local_id !== "number")
		throw new Error(`Cannot find local ${tee_local_node.name}`);
	
	const subnode = tee_local_node.value;
	write_expression(ctx, subnode);

	ctx.consume_value(subnode.value_type);

	ctx.writer.writeUint8(Opcode.local_tee);
	ctx.writer.writeUVint(local_id);

	ctx.push_value(subnode.value_type);
}
import { write_expression } from "./expression";
import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTSetLocalNode } from "../../WASTNode";
import { Opcode } from "../OpCode";

export function write_set_local_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const set_local_node = node as WASTSetLocalNode;
	const local_id = ctx.variable_lookup.get(set_local_node.id);
	
	if (typeof local_id !== "number") {
		throw new Error(`Cannot find local ${set_local_node.name}`);
	}
	
	const subnode = set_local_node.value;
	write_expression(ctx, subnode);
	
	ctx.consume_value(subnode.value_type);
	
	ctx.writer.writeUint8(Opcode.local_set);
	ctx.writer.writeUVint(local_id);
}
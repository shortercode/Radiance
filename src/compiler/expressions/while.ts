import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTBlockNode, WASTNodeList, WASTSetLocalNode, WASTLoopNode, WASTConditionalBranchNode, WASTBranchNode, WASTGetLocalNode } from "../../WASTNode";
import { BOOL_TYPE } from "../AtiumType";
import { invert_boolean_expression } from "./boolean";
import { default_initialiser } from "../default_initialiser";

function read_node_data (node: AST) {
	return node.data as {
		condition: AST
		block: AST
	};
}

export function visit_while_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const data = read_node_data(node);
	const ctx = compiler.ctx;
	
	/*
	NOTE WASM doesn't have a "while" instruction only a "loop". Curiously loops
	exit after each iteration by default, so to continue a "branch" operation
	must be executed. To emulate a while loop we use the following structure
	
	(local temp)
	(block (void)
	(loop (void)
	(if_br (eqz CONDITION) 1)
	(local.set BLOCK)
	(br 0)
	)
	)
	(local.get temp)
	*/
	
	// NOTE before starting we must know if the inner body returns a value
	const while_body = compiler.visit_expression(data.block, type_hint) as WASTBlockNode;
	const return_value_type = while_body.value_type;
	const emits_value = return_value_type.is_void() === false;
	
	const node_list = new WASTNodeList(node);
	
	// NOTE if we do return a value we need to add a temporary var to hold it
	let temp_variable = null;
	if (emits_value) {
		temp_variable = ctx.environment!.declare_hidden(node, "while_temp_variable", while_body.value_type);
		const init_value_node = default_initialiser(node, return_value_type);
		const init_node = new WASTSetLocalNode(node, temp_variable.id, temp_variable.name, init_value_node);
		node_list.nodes.push(init_node);
	}
	
	{
		const block_node = new WASTBlockNode(node);
		const loop_block = new WASTLoopNode(node);
		block_node.body.nodes.push(loop_block);
		
		// NOTE we need to massage the condition a bit to get what we want
		{
			let condition = compiler.visit_expression(data.condition, BOOL_TYPE);
			condition = invert_boolean_expression(node, condition);
			
			// NOTE finally wrap the condition in a conditional branch Op
			condition = new WASTConditionalBranchNode(node, condition, 1);
			loop_block.body.push(condition);
		}
		
		// NOTE if we're emitting a value wrap the block in a set local
		// to stash it in our temp var
		if (emits_value) {
			const set_temp_node = new WASTSetLocalNode(node, temp_variable!.id, temp_variable!.name, while_body);
			loop_block.body.push(set_temp_node);
		}
		else {
			loop_block.body.push(while_body)
		}
		
		// NOTE we need to add a branch 0 here to ensure the loop continues
		loop_block.body.push(new WASTBranchNode(node, 0));
		
		node_list.nodes.push(block_node);
	}
	
	// NOTE finally if we're emitting a value then read back our output
	// from the temp variable
	if (emits_value) {
		const get_temp_node = new WASTGetLocalNode(node, temp_variable!.id, temp_variable!.name, return_value_type);
		node_list.nodes.push(get_temp_node);
		node_list.value_type = get_temp_node.value_type;
	}
	
	return node_list;
}
import { Variable } from "./compiler/Variable.js";
import { AtiumType, VOID_TYPE, BOOL_TYPE } from "./compiler/AtiumType.js";
import ParserNode from "./pratt/Node.js";

export interface WASTNode {
	type: WASTNodeType
	source: SourceReference
}

type Position = [number, number]

export class SourceReference {
	readonly start: Position
	readonly end: Position
	readonly name: string = "unknown"
	
	constructor (start: Position, end: Position) {
		this.start = start;
		this.end = end;
	}

	static from_node(node: ParserNode) {
		return new SourceReference(node.start, node.end);
	}

	static unknown () {
		const blank: [number, number] = [NaN, NaN];
		return new SourceReference(blank, blank);
	}
}

export type WASTExpressionNode = WASTBlockNode | 
WASTNodeList |
WASTConstNode |
WASTGetLocalNode |
WASTTeeLocalNode |
WASTSetLocalNode |
WASTLoadNode |
WASTStoreNode |
WASTCallNode |
WASTConditionalNode |
WASTLoopNode |
WASTBranchNode |
WASTConditionalBranchNode |
WASTNotNode |
WASTBinaryExpressionNode;

export type WASTBinaryExpressionNode = WASTEqualsNode |
WASTNotEqualsNode |
WASTLessThanEqualsNode |
WASTGreaterThanEqualsNode |
WASTLessThanNode | 
WASTGreaterThanNode |
WASTAddNode |
WASTSubNode |
WASTMultiplyNode |
WASTModuloNode |
WASTDivideNode |
WASTLeftShiftNode |
WASTRightShiftNode |
WASTBitwiseAndNode |
WASTBitwiseOrNode;

export type WASTNodeType = WASTStatementType | 
WASTExpressionType |
"module";

export type WASTStatementType = "function" | 
"memory" |
"export";

export type WASTExpressionType = WASTBinaryExpressionType |
"@list" |

"block" |
"const" |
"get_local" |
"tee_local" |
"set_local" |
"load" |
"store" |
"if" |
"loop" |
"br" |
"br_if" |
"not" |
"call";

export type WASTBinaryExpressionType = "equals" |
"not_equals" |
"less_than" |
"less_than_equals" |
"greater_than" |
"greater_than_equals" |
"add" |
"sub" |
"multiply" |
"divide" |
"modulo" |
"left_shift" |
"right_shift" |
"bitwise_or" |
"bitwise_and";

export type WASTStatementNode = WASTExportNode |
WASTFunctionNode |
WASTMemoryNode;

export class WASTModuleNode implements WASTNode {
	type: "module" = "module"
	source: SourceReference
	
	statements: Array<WASTStatementNode> = []
	
	constructor (source: SourceReference) {
		this.source = source;
	}
}

type ExportType = "function" | "table" | "memory" | "global";

export class WASTExportNode implements WASTNode {
	type: "export" = "export"
	source: SourceReference
	
	name: string
	target: number
	target_type: ExportType
	
	constructor (source: SourceReference, type: ExportType, name: string, target: number) {
		this.source = source;
		this.name = name;
		this.target = target;
		this.target_type = type;
	}
}

export class WASTFunctionNode implements WASTNode {
	type: "function" = "function"
	source: SourceReference
	
	name: string
	id: number
	parameters: Array<Variable> = []
	result: AtiumType
	body: WASTNodeList
	locals: Array<Variable> = []
	
	constructor (source: SourceReference, id: number, name: string, result: AtiumType) {
		this.source = source;
		this.name = name;
		this.id = id;
		this.result = result;
		this.body = new WASTNodeList(source);
	}
}

export class WASTMemoryNode implements WASTNode {
	type: "memory" = "memory"
	source: SourceReference
	
	name: string
	size: number
	id: number
	
	constructor (source: SourceReference, id: number, name: string, size: number) {
		this.id = id;
		this.source = source;
		this.name = name;
		this.size = size;
	}
}

export class WASTBlockNode implements WASTNode {
	type: "block" = "block"
	source: SourceReference
	
	body: WASTNodeList

	constructor (source: SourceReference) {
		this.source = source;
		this.body = new WASTNodeList(source);
	}
	
	get value_type () {
		return this.body.value_type;
	}
	
	set value_type (v: AtiumType) {
		this.body.value_type = v;
	}
	
	get does_return_value () {
		return this.value_type.is_void();
	}
	
	disable_return_value () {
		this.value_type = VOID_TYPE;
	}
}

export class WASTEqualsNode implements WASTNode {
	type: "equals" = "equals"
	source: SourceReference
	
	readonly value_type: AtiumType = BOOL_TYPE
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.left = left;
		this.right = right;
	}
}

export class WASTNotEqualsNode implements WASTNode {
	type: "not_equals" = "not_equals"
	source: SourceReference
	
	readonly value_type: AtiumType = BOOL_TYPE
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.left = left;
		this.right = right;
	}
}

export class WASTLessThanNode implements WASTNode {
	type: "less_than" = "less_than"
	source: SourceReference
	
	readonly value_type: AtiumType = BOOL_TYPE
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.left = left;
		this.right = right;
	}
}

export class WASTGreaterThanNode implements WASTNode {
	type: "greater_than" = "greater_than"
	source: SourceReference
	
	readonly value_type: AtiumType = BOOL_TYPE
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.left = left;
		this.right = right;
	}
}

export class WASTLessThanEqualsNode implements WASTNode {
	type: "less_than_equals" = "less_than_equals"
	source: SourceReference
	
	readonly value_type: AtiumType = BOOL_TYPE
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.left = left;
		this.right = right;
	}
}

export class WASTGreaterThanEqualsNode implements WASTNode {
	type: "greater_than_equals" = "greater_than_equals"
	source: SourceReference
	
	readonly value_type: AtiumType = BOOL_TYPE
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.left = left;
		this.right = right;
	}
}

export class WASTConstNode implements WASTNode {
	type: "const" = "const"
	source: SourceReference
	
	value_type: AtiumType
	value: string
	
	constructor (source: SourceReference, type: AtiumType, value: string) {
		if (isNaN(parseFloat(value))) {
			throw new Error(`Constant must be a valid numeric value`);
		}
		
		this.source = source;
		this.value_type = type;
		this.value = value;
	}
}

export class WASTAddNode implements WASTNode {
	type: "add" = "add"
	source: SourceReference
	
	value_type: AtiumType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTSubNode implements WASTNode {
	type: "sub" = "sub"
	source: SourceReference
	
	value_type: AtiumType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTMultiplyNode implements WASTNode {
	type: "multiply" = "multiply"
	source: SourceReference
	
	value_type: AtiumType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTDivideNode implements WASTNode {
	type: "divide" = "divide"
	source: SourceReference
	
	value_type: AtiumType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTModuloNode implements WASTNode {
	type: "modulo" = "modulo"
	source: SourceReference
	
	value_type: AtiumType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTGetLocalNode implements WASTNode {
	type: "get_local" = "get_local"
	source: SourceReference
	
	value_type: AtiumType
	
	id: number
	name: string
	
	constructor (source: SourceReference, id: number, name: string, type: AtiumType) {
		this.source = source;
		this.id = id;
		this.name = name;
		this.value_type = type;
	}
}

export class WASTTeeLocalNode implements WASTNode {
	type: "tee_local" = "tee_local"
	source: SourceReference
	
	value_type: AtiumType
	
	id: number
	name: string
	value: WASTExpressionNode
	
	constructor (source: SourceReference, id: number, name: string, value: WASTExpressionNode, type: AtiumType) {
		this.source = source;
		this.id = id;	
		this.name = name;
		this.value = value;
		this.value_type = type;
	}
}

export class WASTSetLocalNode implements WASTNode {
	type: "set_local" = "set_local"
	source: SourceReference
	
	value_type: AtiumType = VOID_TYPE
	
	id: number
	name: string
	value: WASTExpressionNode
	
	constructor (source: SourceReference, id: number, name: string, value: WASTExpressionNode) {
		this.source = source;
		this.id = id;	
		this.name = name;
		this.value = value;
	}
}

export class WASTLoadNode implements WASTNode {
	type: "load" = "load"
	source: SourceReference
	
	value_type: AtiumType
	location: WASTExpressionNode
	
	constructor (source: SourceReference, type: AtiumType, location: WASTExpressionNode) {
		this.source = source;
		this.value_type = type;
		this.location = location;
	}
}

export class WASTStoreNode implements WASTNode {
	type: "store" = "store"
	source: SourceReference
	
	value_type: AtiumType
	location: WASTExpressionNode
	value: WASTExpressionNode
	
	constructor (source: SourceReference, type: AtiumType, location: WASTExpressionNode, value: WASTExpressionNode) {
		this.source = source;
		this.value_type = type;
		this.location = location;
		this.value = value;
	}
}

export class WASTCallNode implements WASTNode {
	type: "call" = "call"
	source: SourceReference
	
	value_type: AtiumType
	name: string
	id: number
	arguments: Array<WASTExpressionNode>
	
	constructor (source: SourceReference, id: number, name: string, type: AtiumType, args: Array<WASTExpressionNode>) {
		this.source = source;
		this.id = id;
		this.name = name;
		this.value_type = type;
		this.arguments = args;
	}
}

export class WASTConditionalNode implements WASTNode {
	type: "if" = "if"
	source: SourceReference
	
	value_type: AtiumType
	condition: WASTExpressionNode
	then_branch: WASTNodeList
	else_branch: WASTNodeList
	
	constructor(source: SourceReference, type: AtiumType, condition: WASTExpressionNode, then_branch: WASTNodeList, else_branch: WASTNodeList) {
		this.source = source;
		this.value_type = type;
		this.condition = condition;
		this.then_branch = then_branch;
		this.else_branch = else_branch;
	}
}

export class WASTLoopNode implements WASTNode {
	type: "loop" = "loop"
	source: SourceReference
	
	value_type: AtiumType = VOID_TYPE
	body: Array<WASTExpressionNode> = []

	constructor (source: SourceReference) {
		this.source = source;
	}
}

export class WASTBranchNode implements WASTNode {
	type: "br" = "br"
	source: SourceReference
	
	value_type: AtiumType = VOID_TYPE
	index: number
	
	constructor (source: SourceReference, index: number) {
		this.source = source;
		this.index = index;
	}
}

export class WASTConditionalBranchNode implements WASTNode {
	type: "br_if" = "br_if"
	source: SourceReference
	
	value_type: AtiumType = VOID_TYPE
	index: number = 0
	condition: WASTExpressionNode
	
	constructor (source: SourceReference, condition: WASTExpressionNode, index: number) {
		this.source = source;
		this.condition = condition;
		this.index = index;
	}
}

export class WASTNotNode implements WASTNode {
	type: "not" = "not"
	source: SourceReference
	
	readonly value_type: AtiumType = BOOL_TYPE
	inner: WASTExpressionNode
	
	constructor (source: SourceReference, inner: WASTExpressionNode) {
		this.source = source;

		// TODO verify that the inner returns a boolean
		this.inner = inner;
	}
}

export class WASTNodeList implements WASTNode {
	type: "@list" = "@list"
	source: SourceReference
	
	value_type: AtiumType = VOID_TYPE;
	nodes: Array<WASTExpressionNode> = []

	constructor (source: SourceReference) {
		this.source = source;
	}
	
	get does_return_value () {
		return this.value_type.is_void();
	}
	
	consume_return_value () {
		this.value_type = VOID_TYPE;
	}
}

export class WASTLeftShiftNode implements WASTNode {
	type: "left_shift" = "left_shift"
	source: SourceReference
	
	value_type: AtiumType
	
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTRightShiftNode implements WASTNode {
	type: "right_shift" = "right_shift"
	source: SourceReference
	
	value_type: AtiumType
	
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTBitwiseOrNode implements WASTNode {
	type: "bitwise_or" = "bitwise_or"
	source: SourceReference
	
	value_type: AtiumType
	
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTBitwiseAndNode implements WASTNode {
	type: "bitwise_and" = "bitwise_and"
	source: SourceReference

	value_type: AtiumType
	
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (source: SourceReference, type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = source;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}
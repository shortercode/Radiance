import { Variable } from "./compiler/Variable";
import { LangType, VOID_TYPE, BOOL_TYPE, NEVER_TYPE } from "./compiler/LangType";
import ParserNode from "./pratt/Node";
import { compiler_assert } from "./compiler/error";

export interface WASTNode {
	type: WASTNodeType
	source: Ref
}

type Position = [number, number]

export class Ref {
	readonly start: Position
	readonly end: Position
	readonly name: string = "unknown"
	
	constructor (start: Position, end: Position) {
		this.start = start;
		this.end = end;
	}

	static from_node(node: ParserNode) {
		return new Ref(node.start, node.end);
	}

	static relative(start: Position, length: Position = [0, 0]) {
		const end: Position = [
			start[0] + length[0],
			start[1] + length[1]
		];
		return new Ref(start, end);
	}

	static unknown () {
		const blank: [number, number] = [NaN, NaN];
		return new Ref(blank, blank);
	}
}

export type WASTExpressionNode = WASTBlockNode | 
WASTNodeList |
WASTConstNode |
WASTGetVarNode |
WASTSetVarNode |
WASTVarRestoreNode |
WASTTeeVarNode |
WASTLoadNode |
WASTStoreNode |
WASTCallNode |
WASTConditionalNode |
WASTLoopNode |
WASTBranchNode |
WASTConditionalBranchNode |
WASTNotNode |
WASTConvertToFloat |
WASTConvertToInt |
WASTUnsafeCast |
WASTTrapNode |
WASTDataRefNode |
WASTReturnNode |
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
"table" |
"global_expression" |
"data" |
"memory" |
"global" |
"export" |
"import_function";

export type WASTExpressionType = WASTBinaryExpressionType |
"@list" |

"block" |
"const" |
"get" |
"set" |
"var_restore" |
"tee" |
"load" |
"store" |
"if" |
"loop" |
"br" |
"br_if" |
"not" |
"call" |
"data_ref" |
"convert_int" |
"convert_float" |
"unsafe_cast" |
"trap" | 
"return";

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
WASTGlobalExpression |
WASTDataNode |
WASTImportFunctionNode |
WASTTableNode |
WASTGlobalNode |
WASTFunctionNode |
WASTMemoryNode;

export class WASTModuleNode implements WASTNode {
	type: "module" = "module"
	source: Ref
	
	statements: Array<WASTStatementNode> = []
	initialiser: Symbol | null = null
	readonly static_data_top: Variable
	
	constructor (ref: Ref, static_data_top: Variable) {
		this.source = ref;
		this.static_data_top = static_data_top;
	}
}

export class WASTGlobalExpression implements WASTNode {
	type: "global_expression" = "global_expression"
	source: Ref
	expression: WASTExpressionNode

	constructor (ref: Ref, expr: WASTExpressionNode) {
		this.source = ref
		this.expression = expr;
	}
}

type ExportType = "function" | "table" | "memory" | "global";

export class WASTExportNode implements WASTNode {
	type: "export" = "export"
	source: Ref
	
	name: string
	target: Symbol
	target_type: ExportType
	
	constructor (ref: Ref, type: ExportType, name: string, target: Symbol) {
		this.source = ref;
		this.name = name;
		this.target = target;
		this.target_type = type;
	}
}

export class WASTImportFunctionNode implements WASTNode {
	type: "import_function" = "import_function"
	source: Ref

	id: Symbol
	name: string
	parameters: Array<LangType>
	result: LangType

	constructor (ref: Ref, id: Symbol, name: string, result: LangType, parameters: Array<LangType>) {
		this.source = ref;
		this.id = id;
		this.name = name;
		this.result = result;
		this.parameters = parameters;
	}
}

export class WASTTableNode implements WASTNode {
	type: "table" = "table"
	source: Ref

	elements: Array<WASTFunctionNode>
	offset_expr: WASTExpressionNode 

	constructor (ref: Ref, offset: WASTExpressionNode, elements: Array<WASTFunctionNode>) {
		this.source = ref;
		this.elements = elements;
		this.offset_expr = offset;
	}
}

export class WASTDataNode implements WASTNode {
	type: "data" = "data"
	source: Ref

	bytes: Uint8Array

	constructor (ref: Ref, data: Uint8Array) {
		this.source = ref;
		this.bytes = data;
	}
}

export class WASTGlobalNode implements WASTNode {
	type: "global" = "global"
	source: Ref

	value_type: LangType
	mutable: boolean = true
	id: Symbol
	initialiser: WASTExpressionNode

	constructor (ref: Ref, id: Symbol, type: LangType, init: WASTExpressionNode) {
		this.source = ref;
		this.id = id;
		this.value_type = type;
		this.initialiser = init;
	}
}

export class WASTFunctionNode implements WASTNode {
	type: "function" = "function"
	source: Ref
	
	name: string
	id: Symbol
	parameters: Array<Variable> = []
	result: LangType
	body: WASTNodeList
	locals: Array<Variable> = []
	
	constructor (ref: Ref, id: Symbol, name: string, result: LangType) {
		this.body = new WASTNodeList(ref);
		this.source = ref;
		this.name = name;
		this.id = id;
		this.result = result;
	}
}

export class WASTMemoryNode implements WASTNode {
	type: "memory" = "memory"
	source: Ref
	
	name: string
	size: number
	id: Symbol
	
	constructor (ref: Ref, name: string, size: number) {
		this.id = Symbol(name);
		this.source = ref;
		this.name = name;
		this.size = size;
	}
}

export class WASTBlockNode implements WASTNode {
	type: "block" = "block"
	source: Ref
	
	body: WASTNodeList

	constructor (ref: Ref) {
		this.source = ref;
		this.body = new WASTNodeList(ref);
	}
	
	get value_type () {
		return this.body.value_type;
	}
	
	set value_type (v: LangType) {
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
	source: Ref
	
	readonly value_type: LangType = BOOL_TYPE
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.left = left;
		this.right = right;
	}
}

export class WASTNotEqualsNode implements WASTNode {
	type: "not_equals" = "not_equals"
	source: Ref
	
	readonly value_type: LangType = BOOL_TYPE
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.left = left;
		this.right = right;
	}
}

export class WASTLessThanNode implements WASTNode {
	type: "less_than" = "less_than"
	source: Ref
	
	readonly value_type: LangType = BOOL_TYPE
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.left = left;
		this.right = right;
	}
}

export class WASTGreaterThanNode implements WASTNode {
	type: "greater_than" = "greater_than"
	source: Ref
	
	readonly value_type: LangType = BOOL_TYPE
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.left = left;
		this.right = right;
	}
}

export class WASTLessThanEqualsNode implements WASTNode {
	type: "less_than_equals" = "less_than_equals"
	source: Ref
	
	readonly value_type: LangType = BOOL_TYPE
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.left = left;
		this.right = right;
	}
}

export class WASTGreaterThanEqualsNode implements WASTNode {
	type: "greater_than_equals" = "greater_than_equals"
	source: Ref
	
	readonly value_type: LangType = BOOL_TYPE
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.left = left;
		this.right = right;
	}
}

export class WASTConstNode implements WASTNode {
	type: "const" = "const"
	source: Ref
	
	value_type: LangType
	value: string
	
	constructor (ref: Ref, type: LangType, value: string) {
		if (isNaN(parseFloat(value))) {
			throw new Error(`Constant must be a valid numeric value`);
		}
		
		this.source = ref;
		this.value_type = type;
		this.value = value;
	}
}

export class WASTAddNode implements WASTNode {
	type: "add" = "add"
	source: Ref
	
	value_type: LangType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, type: LangType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTSubNode implements WASTNode {
	type: "sub" = "sub"
	source: Ref
	
	value_type: LangType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, type: LangType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTMultiplyNode implements WASTNode {
	type: "multiply" = "multiply"
	source: Ref
	
	value_type: LangType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, type: LangType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTDivideNode implements WASTNode {
	type: "divide" = "divide"
	source: Ref
	
	value_type: LangType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, type: LangType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTModuloNode implements WASTNode {
	type: "modulo" = "modulo"
	source: Ref
	
	value_type: LangType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, type: LangType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTTeeVarNode implements WASTNode {
	type: "tee" = "tee"
	source: Ref
	
	value_type: LangType
	
	id: Symbol
	name: string
	value: WASTExpressionNode
	is_global: boolean
	
	constructor (variable: Variable, value: WASTExpressionNode, ref: Ref = value.source) {
		this.source = ref;
		this.id = variable.id;	
		this.name = variable.name;
		this.is_global = variable.is_global;
		this.value = value;
		this.value_type = value.value_type;
	}
}

export class WASTVarRestoreNode implements WASTNode {
	type: "var_restore" = "var_restore"
	source: Ref

	value_type: LangType = VOID_TYPE

	id: Symbol
	name: string
	is_global: boolean

	expr: WASTExpressionNode

	constructor (variable: Variable, expr: WASTExpressionNode, ref: Ref = expr.source) {
		compiler_assert(expr.value_type.is_void(), expr.source, "Expected inner type of restore node to be void, cannot pass a value out of a restore node.");

		this.source = ref;
		this.id = variable.id;	
		this.name = variable.name;
		this.is_global = variable.is_global;
		this.expr = expr;
	}
}	

export class WASTGetVarNode implements WASTNode {
	type: "get" = "get"
	source: Ref
	
	value_type: LangType = VOID_TYPE
	
	id: Symbol
	name: string
	is_global: boolean
	
	constructor (variable: Variable, ref: Ref = variable.source) {
		this.source = ref;
		this.id = variable.id;	
		this.name = variable.name;
		this.value_type = variable.type;
		this.is_global = variable.is_global;
	}
}

export class WASTSetVarNode implements WASTNode {
	type: "set" = "set"
	source: Ref
	
	value_type: LangType = VOID_TYPE
	
	id: Symbol
	name: string
	value: WASTExpressionNode
	is_global: boolean
	
	constructor (variable: Variable, value: WASTExpressionNode, ref: Ref = value.source) {
		this.source = ref;
		this.id = variable.id;	
		this.name = variable.name;
		this.is_global = variable.is_global;
		
		this.value = value;
	}
}

export class WASTLoadNode implements WASTNode {
	type: "load" = "load"
	source: Ref
	
	value_type: LangType
	location: WASTExpressionNode
	offset: number
	
	constructor (ref: Ref, type: LangType, location: WASTExpressionNode, offset: number) {
		this.source = ref;
		this.value_type = type;
		this.location = location;
		this.offset = offset;
	}
}

export class WASTStoreNode implements WASTNode {
	type: "store" = "store"
	source: Ref
	
	value_type: LangType = VOID_TYPE
	location: WASTExpressionNode
	value: WASTExpressionNode
	offset: number
	
	constructor (ref: Ref, location: WASTExpressionNode, offset: number, value: WASTExpressionNode) {
		this.source = ref;
		this.location = location;
		this.value = value;
		this.offset = offset;
	}
}

export class WASTCallNode implements WASTNode {
	type: "call" = "call"
	source: Ref
	
	value_type: LangType
	name: string
	id: Symbol
	arguments: Array<WASTExpressionNode>
	
	constructor (ref: Ref, id: Symbol, name: string, type: LangType, args: Array<WASTExpressionNode>) {
		this.source = ref;
		this.id = id;
		this.name = name;
		this.value_type = type;
		this.arguments = args;
	}
}

export class WASTConditionalNode implements WASTNode {
	type: "if" = "if"
	source: Ref
	
	value_type: LangType
	condition: WASTExpressionNode
	then_branch: WASTNodeList
	else_branch: WASTNodeList
	
	constructor(ref: Ref, type: LangType, condition: WASTExpressionNode, then_branch: WASTNodeList, else_branch: WASTNodeList) {
		this.source = ref;
		this.value_type = type;
		this.condition = condition;
		this.then_branch = then_branch;
		this.else_branch = else_branch;
	}
}

export class WASTLoopNode implements WASTNode {
	type: "loop" = "loop"
	source: Ref
	
	value_type: LangType = VOID_TYPE
	body: Array<WASTExpressionNode> = []

	constructor (ref: Ref) {
		this.source = ref;
	}
}

export class WASTBranchNode implements WASTNode {
	type: "br" = "br"
	source: Ref
	
	value_type: LangType = VOID_TYPE
	index: number
	
	constructor (ref: Ref, index: number) {
		this.source = ref;
		this.index = index;
	}
}

export class WASTConditionalBranchNode implements WASTNode {
	type: "br_if" = "br_if"
	source: Ref
	
	value_type: LangType = VOID_TYPE
	index: number = 0
	condition: WASTExpressionNode
	
	constructor (ref: Ref, condition: WASTExpressionNode, index: number) {
		this.source = ref;
		this.condition = condition;
		this.index = index;
	}
}

export class WASTNotNode implements WASTNode {
	type: "not" = "not"
	source: Ref
	
	readonly value_type: LangType = BOOL_TYPE
	inner: WASTExpressionNode
	
	constructor (ref: Ref, inner: WASTExpressionNode) {
		this.source = ref;

		// TODO verify that the inner returns a boolean
		this.inner = inner;
	}
}

export class WASTReturnNode implements WASTNode {
	type: "return" = "return"
	source: Ref

	value_type: LangType = NEVER_TYPE
	value: WASTExpressionNode | null

	constructor (ref: Ref, value: WASTExpressionNode | null) {
		this.source = ref;
		this.value = value;
	}
}

export class WASTNodeList implements WASTNode {
	type: "@list" = "@list"
	source: Ref
	
	value_type: LangType = VOID_TYPE;
	nodes: Array<WASTExpressionNode> = []

	constructor (ref: Ref) {
		this.source = ref;
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
	source: Ref
	
	value_type: LangType
	
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, type: LangType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTRightShiftNode implements WASTNode {
	type: "right_shift" = "right_shift"
	source: Ref
	
	value_type: LangType
	
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, type: LangType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTBitwiseOrNode implements WASTNode {
	type: "bitwise_or" = "bitwise_or"
	source: Ref
	
	value_type: LangType
	
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, type: LangType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTBitwiseAndNode implements WASTNode {
	type: "bitwise_and" = "bitwise_and"
	source: Ref

	value_type: LangType
	
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (ref: Ref, type: LangType, left: WASTExpressionNode, right: WASTExpressionNode) {
		this.source = ref;
		this.value_type = type;
		this.left = left;
		this.right = right;
	}
}

export class WASTConvertToFloat implements WASTNode {
	type: "convert_float" = "convert_float"
	source: Ref

	value_type: LangType

	input: WASTExpressionNode

	constructor (ref: Ref, type: LangType, input: WASTExpressionNode) {
		this.source = ref;
		this.value_type = type;
		this.input = input;
	}
}

export class WASTConvertToInt implements WASTNode {
	type: "convert_int" = "convert_int"
	source: Ref

	value_type: LangType

	input: WASTExpressionNode

	constructor (ref: Ref, type: LangType, input: WASTExpressionNode) {
		this.source = ref;
		this.value_type = type;
		this.input = input;
	}
}

export class WASTUnsafeCast implements WASTNode {
	type: "unsafe_cast" = "unsafe_cast"
	source: Ref
	value_type: LangType
	input: WASTExpressionNode

	constructor (ref: Ref, output_type: LangType, value: WASTExpressionNode) {
		this.source = ref;
		this.value_type = output_type;
		this.input = value;
	}
}

export class WASTTrapNode implements WASTNode {
	type: "trap" = "trap"
	source: Ref
	value_type: LangType = VOID_TYPE

	constructor (ref: Ref) {
		this.source = ref;
	}
}

export class WASTDataRefNode implements WASTNode {
	type: "data_ref" = "data_ref"
	source: Ref
	value_type: LangType
	data_node: WASTDataNode

	constructor (ref: Ref, type: LangType, data_node: WASTDataNode) {
		this.source = ref;
		this.value_type = type;
		this.data_node = data_node;
	}
}
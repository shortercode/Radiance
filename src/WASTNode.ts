import { Variable } from "./compiler/Variable";
import { AtiumType } from "./compiler/AtiumType";

export interface WASTNode {
  type: WASTNodeType
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

	statements: Array<WASTStatementNode> = []
}

type ExportType = "function" | "table" | "memory" | "global";

export class WASTExportNode implements WASTNode {
    type: "export" = "export"

    name: string
    target: string
    target_type: ExportType

    constructor (type: ExportType, name: string, target: string) {
        this.name = name;
        this.target = target;
        this.target_type = type;
    }
}

export class WASTFunctionNode implements WASTNode {
    type: "function" = "function"

    name: string
    parameters: Array<Variable> = []
    result: AtiumType
		body: WASTNodeList = new WASTNodeList
		locals: Array<Variable> = []

    constructor (name: string, result: AtiumType) {
        this.name = name;
				this.result = result;
    }
}

export class WASTMemoryNode implements WASTNode {
    type: "memory" = "memory"

    name: string
    size: number

    constructor (name: string, size: number) {
        this.name = name;
        this.size = size;
    }
}

export class WASTBlockNode implements WASTNode {
		type: "block" = "block"

		body: WASTNodeList = new WASTNodeList
		
		get value_type () {
			return this.body.value_type;
		}

		set value_type (v: AtiumType) {
			this.body.value_type = v;
		}

		get does_return_value () {
			return this.value_type === "void"
		}
	
		disable_return_value () {
			this.value_type = "void";
		}
}

export class WASTEqualsNode implements WASTNode {
		type: "equals" = "equals"

		readonly value_type: AtiumType = "boolean"
		left: WASTExpressionNode
		right: WASTExpressionNode
		
		constructor (left: WASTExpressionNode, right: WASTExpressionNode) {
			this.left = left;
			this.right = right;
		}
}

export class WASTNotEqualsNode implements WASTNode {
	type: "not_equals" = "not_equals"

	readonly value_type: AtiumType = "boolean"
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (left: WASTExpressionNode, right: WASTExpressionNode) {
		this.left = left;
		this.right = right;
	}
}

export class WASTLessThanNode implements WASTNode {
	type: "less_than" = "less_than"

	readonly value_type: AtiumType = "boolean"
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (left: WASTExpressionNode, right: WASTExpressionNode) {
		this.left = left;
		this.right = right;
	}
}

export class WASTGreaterThanNode implements WASTNode {
	type: "greater_than" = "greater_than"

	readonly value_type: AtiumType = "boolean"
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (left: WASTExpressionNode, right: WASTExpressionNode) {
		this.left = left;
		this.right = right;
	}
}

export class WASTLessThanEqualsNode implements WASTNode {
	type: "less_than_equals" = "less_than_equals"

	readonly value_type: AtiumType = "boolean"
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (left: WASTExpressionNode, right: WASTExpressionNode) {
		this.left = left;
		this.right = right;
	}
}

export class WASTGreaterThanEqualsNode implements WASTNode {
	type: "greater_than_equals" = "greater_than_equals"

	readonly value_type: AtiumType = "boolean"
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (left: WASTExpressionNode, right: WASTExpressionNode) {
		this.left = left;
		this.right = right;
	}
}

export class WASTConstNode implements WASTNode {
    type: "const" = "const"

    value_type: AtiumType
    value: string

    constructor (type: AtiumType, value: string) {
        if (isNaN(parseFloat(value)))
            throw new Error(`Constant must be a valid numeric value`);

        this.value_type = type;
        this.value = value;
    }
}

export class WASTAddNode implements WASTNode {
    type: "add" = "add"

    value_type: AtiumType
    left: WASTExpressionNode
    right: WASTExpressionNode

    constructor (type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
        this.value_type = type;
        this.left = left;
        this.right = right;
    }
}

export class WASTSubNode implements WASTNode {
	type: "sub" = "sub"

	value_type: AtiumType
	left: WASTExpressionNode
	right: WASTExpressionNode

	constructor (type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
			this.value_type = type;
			this.left = left;
			this.right = right;
	}
}

export class WASTMultiplyNode implements WASTNode {
    type: "multiply" = "multiply"

    value_type: AtiumType
    left: WASTExpressionNode
    right: WASTExpressionNode

    constructor (type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
        this.value_type = type;
        this.left = left;
        this.right = right;
    }
}

export class WASTDivideNode implements WASTNode {
	type: "divide" = "divide"

	value_type: AtiumType
	left: WASTExpressionNode
	right: WASTExpressionNode

	constructor (type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
			this.value_type = type;
			this.left = left;
			this.right = right;
	}
}

export class WASTModuloNode implements WASTNode {
	type: "modulo" = "modulo"

	value_type: AtiumType
	left: WASTExpressionNode
	right: WASTExpressionNode

	constructor (type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
			this.value_type = type;
			this.left = left;
			this.right = right;
	}
}

export class WASTGetLocalNode implements WASTNode {
		type: "get_local" = "get_local"
		value_type: AtiumType

		id: number
		name: string

    constructor (id: number, name: string, type: AtiumType) { 
				this.id = id;
				this.name = name;
				this.value_type = type;
    }
}

export class WASTTeeLocalNode implements WASTNode {
	type: "tee_local" = "tee_local"
	value_type: AtiumType

	id: number
	name: string
	value: WASTExpressionNode

	constructor (id: number, name: string, value: WASTExpressionNode, type: AtiumType) {
			this.id = id;	
			this.name = name;
			this.value = value;
			this.value_type = type;
	}
}

export class WASTSetLocalNode implements WASTNode {
		type: "set_local" = "set_local"
		value_type: AtiumType = "void"

		id: number
		name: string
    value: WASTExpressionNode

    constructor (id: number, name: string, value: WASTExpressionNode) {
				this.id = id;	
				this.name = name;
				this.value = value;
    }
}

export class WASTLoadNode implements WASTNode {
    type: "load" = "load"

    value_type: AtiumType
    location: WASTExpressionNode

    constructor (type: AtiumType, location: WASTExpressionNode) {
        this.value_type = type;
        this.location = location;
    }
}

export class WASTStoreNode implements WASTNode {
    type: "store" = "store"

    value_type: AtiumType
    location: WASTExpressionNode
    value: WASTExpressionNode

    constructor (type: AtiumType, location: WASTExpressionNode, value: WASTExpressionNode) {
        this.value_type = type;
        this.location = location;
        this.value = value;
    }
}

export class WASTCallNode implements WASTNode {
    type: "call" = "call"

		value_type: AtiumType
    name: string
    arguments: Array<WASTExpressionNode>

    constructor (name: string, type: AtiumType, args: Array<WASTExpressionNode>) {
				this.name = name;
				this.value_type = type;
				this.arguments = args;
    }
}

export class WASTConditionalNode implements WASTNode {
		type: "if" = "if"

		value_type: AtiumType
		condition: WASTExpressionNode
		then_branch: WASTNodeList
		else_branch: WASTNodeList

		constructor(type: AtiumType, condition: WASTExpressionNode, then_branch: WASTNodeList, else_branch: WASTNodeList) {
			this.value_type = type;
			this.condition = condition;
			this.then_branch = then_branch;
			this.else_branch = else_branch;
		}
}

export class WASTLoopNode implements WASTNode {
		type: "loop" = "loop"

		value_type: AtiumType = "void"
    body: Array<WASTExpressionNode> = []
}

export class WASTBranchNode implements WASTNode {
	type: "br" = "br"
	value_type: AtiumType = "void"
	index: number

	constructor (index: number) {
		this.index = index;
	}
}

export class WASTConditionalBranchNode implements WASTNode {
	type: "br_if" = "br_if"
	value_type: AtiumType = "void"
	index: number = 0
	condition: WASTExpressionNode

	constructor (condition: WASTExpressionNode, index: number) {
		this.condition = condition;
		this.index = index;
	}
}

export class WASTNotNode implements WASTNode {
	type: "not" = "not"
	readonly value_type: AtiumType = "boolean"
	inner: WASTExpressionNode

	constructor (inner: WASTExpressionNode) {
		// TODO verify that the inner returns a boolean
		this.inner = inner;
	}
}

export class WASTNodeList implements WASTNode {
	type: "@list" = "@list"
	value_type: AtiumType = "void"
	nodes: Array<WASTExpressionNode> = []

	get does_return_value () {
		return this.value_type === "void"
	}

	consume_return_value () {
		this.value_type = "void";
	}
}

export class WASTLeftShiftNode implements WASTNode {
	type: "left_shift" = "left_shift"
	value_type: AtiumType

	left: WASTExpressionNode
	right: WASTExpressionNode

	constructor (type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
			this.value_type = type;
			this.left = left;
			this.right = right;
	}
}

export class WASTRightShiftNode implements WASTNode {
	type: "right_shift" = "right_shift"
	value_type: AtiumType
	
	left: WASTExpressionNode
	right: WASTExpressionNode

	constructor (type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
			this.value_type = type;
			this.left = left;
			this.right = right;
	}
}

export class WASTBitwiseOrNode implements WASTNode {
	type: "bitwise_or" = "bitwise_or"
	value_type: AtiumType
	
	left: WASTExpressionNode
	right: WASTExpressionNode

	constructor (type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
			this.value_type = type;
			this.left = left;
			this.right = right;
	}
}

export class WASTBitwiseAndNode implements WASTNode {
	type: "bitwise_and" = "bitwise_and"
	value_type: AtiumType
	
	left: WASTExpressionNode
	right: WASTExpressionNode

	constructor (type: AtiumType, left: WASTExpressionNode, right: WASTExpressionNode) {
			this.value_type = type;
			this.left = left;
			this.right = right;
	}
}
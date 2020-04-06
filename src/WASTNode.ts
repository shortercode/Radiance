import { Variable } from "./compiler/Variable";
import { AtiumType } from "./compiler/AtiumType";

export interface WASTNode {
  type: WASTNodeType
}

export type WASTExpressionNode = WASTBlockNode | 
	WASTConstNode |
	WASTGetLocalNode |
	WASTSetLocalNode |
	WASTLoadNode |
	WASTStoreNode |
	WASTCallNode |
	WASTConditionalNode |
	WASTBinaryExpressionNode;

export type WASTBinaryExpressionNode = WASTEqualsNode |
	WASTNotEqualsNode |
	WASTLessThanEqualsNode |
	WASTGreaterThanEqualsNode |
	WASTLessThanNode | 
	WASTGreaterThanNode |
	WASTAddNode |
	WASTSubNode |
	WASTMultiplyNode;

export type WASTNodeType = WASTStatementType | 
	WASTExpressionType |
	"module";

export type WASTStatementType = "function" | 
	"memory" |
	"export";

export type WASTExpressionType = WASTBinaryExpressionType |
	"block" |
	"const" |
	"get_local" |
	"set_local" |
	"load" |
	"store" |
	"if" |
	"call";
	
export type WASTBinaryExpressionType = "equals" |
	"not_equals" |
	"less_than" |
	"less_than_equals" |
	"greater_than" |
	"greater_than_equals" |
	"add" |
	"sub" |
	"multiply";

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
		body: Array<WASTExpressionNode> = []
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
		value_type: AtiumType = "void"

    body: Array<WASTExpressionNode> = []
}

export class WASTEqualsNode implements WASTNode {
		type: "equals" = "equals"

		value_type: AtiumType
		left: WASTExpressionNode
		right: WASTExpressionNode
		
		constructor (left: WASTExpressionNode, right: WASTExpressionNode) {
			this.value_type = left.value_type;
			this.left = left;
			this.right = right;
		}
}

export class WASTNotEqualsNode implements WASTNode {
	type: "not_equals" = "not_equals"

	value_type: AtiumType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (left: WASTExpressionNode, right: WASTExpressionNode) {
		this.value_type = left.value_type;
		this.left = left;
		this.right = right;
	}
}

export class WASTLessThanNode implements WASTNode {
	type: "less_than" = "less_than"

	value_type: AtiumType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (left: WASTExpressionNode, right: WASTExpressionNode) {
		this.value_type = left.value_type;
		this.left = left;
		this.right = right;
	}
}

export class WASTGreaterThanNode implements WASTNode {
	type: "greater_than" = "greater_than"

	value_type: AtiumType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (left: WASTExpressionNode, right: WASTExpressionNode) {
		this.value_type = left.value_type;
		this.left = left;
		this.right = right;
	}
}

export class WASTLessThanEqualsNode implements WASTNode {
	type: "less_than_equals" = "less_than_equals"

	value_type: AtiumType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (left: WASTExpressionNode, right: WASTExpressionNode) {
		this.value_type = left.value_type;
		this.left = left;
		this.right = right;
	}
}

export class WASTGreaterThanEqualsNode implements WASTNode {
	type: "greater_than_equals" = "greater_than_equals"

	value_type: AtiumType
	left: WASTExpressionNode
	right: WASTExpressionNode
	
	constructor (left: WASTExpressionNode, right: WASTExpressionNode) {
		this.value_type = left.value_type;
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

export class WASTSetLocalNode implements WASTNode {
		type: "set_local" = "set_local"
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
		then_branch: WASTBlockNode
		else_branch: WASTBlockNode | null

		constructor(type: AtiumType, condition: WASTExpressionNode, then_branch: WASTBlockNode, else_branch: WASTBlockNode | null) {
			this.value_type = type;
			this.condition = condition;
			this.then_branch = then_branch;
			this.else_branch = else_branch;
		}
}
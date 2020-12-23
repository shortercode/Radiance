import { execute_string } from "./index"

describe("factorial", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	test("compiles", async () => {
		mod = await execute_string(`export fn factorial (count: i32) -> i32 {
			let result: i32 = 1;
			let i: i32 = 0
			if count == 0 {
				1
			}
			else {
				while i < count {
					i = i + 1
					result = result * i
					result
				}
			}
		}`);
	});

	test("export factorial", () => {
		expect(mod).toHaveProperty("factorial");
		expect(mod.factorial).toBeInstanceOf(Function);
	});

	test("return values", () => {
		const factorial = mod.factorial as (a: number) => number;
		const expected = [
			1,
			1,
			2,
			6,
			24,
			120,
			720,
			5040,
			40320,
			362880,
			3628800,
			39916800,
			479001600
		];

		for (const [i, value] of expected.entries()) {
			expect(factorial(i)).toBe(value);
		}
	});
});

describe("cast tuple", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	test("compiles", async () => {
		mod = await execute_string(`export fn cast_int_tuple (a: i32, b: i32, c: i32) -> f64 {
			let tuple_a = ((a, b), c)
			let tuple_b = tuple_a as ((f64, f64), f64)
			tuple_b.0.0 / tuple_b.0.1 + tuple_b.1
		}`);
	});

	test("export cast_int_tuple", () => {
		expect(mod).toHaveProperty("cast_int_tuple");
		expect(mod.cast_int_tuple).toBeInstanceOf(Function);
	});

	test("return values", () => {
		const cast_int_tuple = mod.cast_int_tuple as (a: number, b: number, c: number) => number;

		expect(cast_int_tuple(6, 5, 1)).toBeCloseTo(6/5 + 1);
	});
});

describe("fibonacci", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	test("compiles", async () => {
		mod = await execute_string(`export fn fibonacci(n: i32) -> i32 {
			if n <= 1 {
				n
			}
			else {
				fibonacci(n - 2) + fibonacci(n - 1)
			}
		}`);
	});

	test("export fibonacci", () => {
		expect(mod).toHaveProperty("fibonacci");
		expect(mod.fibonacci).toBeInstanceOf(Function);
	});

	test("return values", () => {
		const fibonacci = mod.fibonacci as (a: number) => number;
		const expected = [
			0,
			1,
			1,
			2,
			3,
			5,
			8,
			13,
			21,
			34,
			55,
			89,
			144
		];

		for (const [i, value] of expected.entries()) {
			expect(fibonacci(i)).toBe(value);
		}
	});
});

describe("draw points", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	const mock_set_color = jest.fn();
	const mock_draw_rect = jest.fn();

	test("compiles", async () => {
		mod = await execute_string(`
		import fn set_color (r: f64, g: f64, b: f64)
		import fn draw_rect (x: f64, y: f64, width: f64, height: f64)

		struct Color {
			r: f64, g: f64, b: f64
		}
		
		struct Point {
			x: f64, y: f64
		}
		
		fn create_color (r: f64, g: f64, b: f64) -> Color {
			Color { r, g, b }
		}
		
		fn create_point (x: f64, y: f64) -> Point {
			Point { x, y }
		}
		
		fn draw_point (point: Point, color: Color) {
			set_color(color.r, color.g, color.b)
			draw_rect(point.x - 0.5, point.y - 0.5, 1, 1)
		}
		
		export fn main {
			let red = create_color(1, 0, 0)
			let i = 0
			while i < 12 {
				let pt = create_point(i as f64, (i * i) as f64);
				draw_point(pt, red);
				i = i + 1
			}
		}`, {
			set_color: mock_set_color,// (r:number, g:number, b:number)
			draw_rect: mock_draw_rect // (x:number,y:number,width:number,height:number)
		});
	});

	test("export main", () => {
		expect(mod).toHaveProperty("main");
		expect(mod.main).toBeInstanceOf(Function);
	});

	test("return values", () => {
		const main = mod.main as () => void;

		main();

		expect(mock_draw_rect).toBeCalledTimes(12);
		expect(mock_set_color).toBeCalledTimes(12);

		for (let i = 0; i < 12; i++) {
			const ii = i * i;
			expect(mock_set_color.mock.calls[i]).toEqual([1, 0, 0])
			expect(mock_draw_rect.mock.calls[i]).toEqual([i - 0.5, ii - 0.5, 1, 1]);
		}
	});
});

describe("say hi", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	const str = "hello world!!";

	test("compiles", async () => {
		mod = await execute_string(`export fn say_hi -> str {
			"${str}"
		}`);
	});

	test("export say_hi", () => {
		expect(mod).toHaveProperty("say_hi");
		expect(mod.say_hi).toBeInstanceOf(Function);
	});

	test("export memory", () => {
		expect(mod).toHaveProperty("memory");
		expect(mod.memory).toBeInstanceOf(WebAssembly.Memory);
	});

	test("return value", () => {
		const say_hi = mod.say_hi as () => number;
		const memory = mod.memory as WebAssembly.Memory;

		const ptr = say_hi();

		expect(read_i32(memory, ptr)).toBe(str.length);
		expect(read_string(memory, ptr)).toBe(str);
	});
});

describe("array test", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	test("compiles", async () => {
		mod = await execute_string(`export fn array_test (index: i32) -> i32 {
			let array: i32[] = [0,1,2,3,4,5,6];
			array = [7, 8, 9]
			array[index]
		}`);
	});

	test("export array_test", () => {
		expect(mod).toHaveProperty("array_test");
		expect(mod.array_test).toBeInstanceOf(Function);
	});

	test("return value", () => {
		const array_test = mod.array_test as (i: number) => number;
		const values = [7, 8, 9];

		for (let i = 0; i < 3; i++) {
			expect(array_test(i)).toBe(values[i]);
		}

		expect(() => array_test(3)).toThrowError();
	});

	test("throw out of bounds", () => {
		const array_test = mod.array_test as (i: number) => number;

		expect(() => array_test(-1)).toThrowError();
		expect(() => array_test(3)).toThrowError();
	});
});

describe("enum test", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	test("compiles", async () => {
		mod = await execute_string(`
		enum Test {
			case A,
			case B { a: i32, b: i32 },
			case C { str: string }
		}
		
		export fn a -> Test.A {
			Test.A {}
		}
		
		export fn b -> Test.B {
			Test.B { a: 42, b: 193 }
		}
		
		export fn c -> Test {
			Test.C { str: "Hello world"}
		}
		
		export fn abc -> Test[3] { 
			// uses the return type as a hint for the array
			[ a(), b(), c() ]
		}
		
		export fn alt_abc -> Test[3] {
			// downgrades to common type due to inconsistent types
			let arr = [ a(), b(), c() ]
			arr
		}`);
	});

	test("export functions", () => {
		expect(mod).toHaveProperty("a");
		expect(mod).toHaveProperty("b");
		expect(mod).toHaveProperty("c");
		expect(mod).toHaveProperty("abc");
		expect(mod).toHaveProperty("alt_abc");
		expect(mod.a).toBeInstanceOf(Function);
		expect(mod.b).toBeInstanceOf(Function);
		expect(mod.c).toBeInstanceOf(Function);
		expect(mod.abc).toBeInstanceOf(Function);
		expect(mod.alt_abc).toBeInstanceOf(Function);
	});

	test("return value a", () => {
		const a = mod.a as () => number;
		const memory = mod.memory as WebAssembly.Memory;

		const ptr = a();
		expect(read_i32(memory, ptr)).toBe(0);
	});

	test("return value b", () => {
		const b = mod.b as () => number;
		const memory = mod.memory as WebAssembly.Memory;

		const ptr = b();
		expect(read_i32(memory, ptr)).toBe(1);
		expect(read_i32(memory, ptr + 4)).toBe(42);
		expect(read_i32(memory, ptr + 8)).toBe(193);
	});

	test("return value c", () => {
		const c = mod.c as () => number;
		const memory = mod.memory as WebAssembly.Memory;

		const ptr = c();
		expect(read_i32(memory, ptr)).toBe(2);
		expect(read_string(memory, read_i32(memory, ptr + 4))).toBe("Hello world");
	});

	test("return value abc", () => {
		const abc = mod.abc as () => number;
		const memory = mod.memory as WebAssembly.Memory;

		const ptr_arr = abc();
		const arr_count = read_i32(memory, ptr_arr);

		expect(arr_count).toBe(3);

		{
			const ptr_a = read_i32(memory, ptr_arr + 4);

			expect(read_i32(memory, ptr_a)).toBe(0);
		}

		{
			const ptr_b = read_i32(memory, ptr_arr + 8);

			expect(read_i32(memory, ptr_b)).toBe(1);
			expect(read_i32(memory, ptr_b + 4)).toBe(42);
			expect(read_i32(memory, ptr_b + 8)).toBe(193);
		}

		{
			const ptr_c = read_i32(memory, ptr_arr + 12);

			expect(read_i32(memory, ptr_c)).toBe(2);
			const str_ptr = read_i32(memory, ptr_c + 4);
			expect(read_string(memory, str_ptr)).toBe("Hello world");
		}
	});

	test("return value alt_abc", () => {
		const alt_abc = mod.alt_abc as () => number;
		const memory = mod.memory as WebAssembly.Memory;

		const ptr_arr = alt_abc();
		const arr_count = read_i32(memory, ptr_arr);

		expect(arr_count).toBe(3);

		{
			const ptr_a = read_i32(memory, ptr_arr + 4);

			expect(read_i32(memory, ptr_a)).toBe(0);
		}

		{
			const ptr_b = read_i32(memory, ptr_arr + 8);

			expect(read_i32(memory, ptr_b)).toBe(1);
			expect(read_i32(memory, ptr_b + 4)).toBe(42);
			expect(read_i32(memory, ptr_b + 8)).toBe(193);
		}

		{
			const ptr_c = read_i32(memory, ptr_arr + 12);

			expect(read_i32(memory, ptr_c)).toBe(2);
			const str_ptr = read_i32(memory, ptr_c + 4);
			expect(read_string(memory, str_ptr)).toBe("Hello world");
		}
	});
});

describe("loose typing", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	test("compiles", async () => {
		mod = await execute_string(`enum Example {
			case A, case B, case C
		}
		
		let a = [
			[
				Example.A {},
				Example.A {}
			],
			[
				Example.B {},
				Example.A {},
				Example.A {}
			],
			[
				Example.A {}
			]
		]
		
		export fn get_a -> Example[][3] {
			a
		}
		
		export fn get_a_member (i: i32) -> Example[] {
			a[i]
		}`);
	});

	test("export functions", () => {
		expect(mod).toHaveProperty("get_a");
		expect(mod.get_a).toBeInstanceOf(Function);
		expect(mod).toHaveProperty("get_a_member");
		expect(mod.get_a_member).toBeInstanceOf(Function);
	});

	test("return value get_a", () => {
		const get_a = mod.get_a as () => number;
		const memory = mod.memory as WebAssembly.Memory;

		const ptr = get_a();
		expect(read_i32(memory, ptr)).toBe(3);
	});

	test("return value get_a_member", () => {
		const get_a_member = mod.get_a_member as (i:number) => number;
		const memory = mod.memory as WebAssembly.Memory;

		expect(read_i32(memory, get_a_member(0))).toBe(2);
		expect(read_i32(memory, get_a_member(1))).toBe(3);
		expect(read_i32(memory, get_a_member(2))).toBe(1);
	});
})

describe("return test", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	test("compiles", async () => {
		mod = await execute_string(`

		type num = u32
		
		export fn implicit (val: num) -> num {
			val
		}
		
		export fn explicit (val: num) -> num {
			return val
		}
		
		export fn conditional (val: num) -> num {
			if val > 42 {
				return val
			}
			42
		}
		
		export fn explicit_branch (val: num) -> num {
			if val > 42 {
				return val
			}
			else {
				return 42
			}
		}
		
		export fn implicit_branch (val: num) -> num {
			if val > 42 {
				val
			}
			else {
				42
			}
		}
		`);
	});

	test("exports functions", () => {
		expect(mod).toHaveProperty("implicit");
		expect(mod).toHaveProperty("explicit");
		expect(mod).toHaveProperty("conditional");
		expect(mod).toHaveProperty("explicit_branch");
		expect(mod).toHaveProperty("implicit_branch");


		expect(mod.implicit).toBeInstanceOf(Function);
		expect(mod.explicit).toBeInstanceOf(Function);
		expect(mod.conditional).toBeInstanceOf(Function);
		expect(mod.explicit_branch).toBeInstanceOf(Function);
		expect(mod.implicit_branch).toBeInstanceOf(Function);
	});

	test("return value", () => {
		const implicit = mod.implicit as (i: number) => number;
		const explicit = mod.explicit as (i: number) => number;
		const conditional = mod.conditional as (i: number) => number;
		const explicit_branch = mod.explicit_branch as (i: number) => number;
		const implicit_branch = mod.implicit_branch as (i: number) => number;


		expect(implicit(12)).toBe(12);
		expect(implicit(91)).toBe(91);

		expect(explicit(12)).toBe(12);
		expect(explicit(91)).toBe(91);

		expect(conditional(12)).toBe(42);
		expect(conditional(91)).toBe(91);

		expect(explicit_branch(12)).toBe(42);
		expect(explicit_branch(91)).toBe(91);

		expect(implicit_branch(12)).toBe(42);
		expect(implicit_branch(91)).toBe(91);
	});
});

describe("generic func", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	test("compiles", async () => {
		mod = await execute_string(`

		fn add<T> (a: T, b: T) -> T {
			a + b
		}

		export fn main {
			add:<u32>(12, 90)
			add:<f32>(80, 1)
			add:<f64>(10.1, 6.9)
		}
		`);
	});

	test("exports functions", () => {
		expect(mod).toHaveProperty("main");

		expect(mod.main).toBeInstanceOf(Function);
	});

	test("return value", () => {
		const main = mod.main as () => void;
		main();
	});
});

describe("generic struct", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	test("compiles", async () => {
		mod = await execute_string(`

		struct Vec3<T> {
			x: T, y: T, z: T
		}

		fn add<T> (a: Vec3:<T>, b: Vec3:<T>) -> Vec3:<T> {
			Vec3:<T> {
				x: a.x + b.x,
				y: a.y + b.y,
				z: a.z + b.z
			}
		}

		export fn main {
			let a_f32: Vec3:<f32> = Vec3:<f32> { x: 12, y: 42, z: 0.1 }
			let b_f32: Vec3:<f32> = Vec3:<f32> { x: 9, y: 4, z: 3.14 }

			let a_f64: Vec3:<f64> = Vec3:<f64> { x: 12, y: 42, z: 0.1 }
			let b_f64: Vec3:<f64> = Vec3:<f64> { x: 9, y: 4, z: 3.14 }
			add:<f32>(a_f32, b_f32)
			add:<f64>(a_f64, b_f64)
		}
		`);
	});

	test("exports functions", () => {
		expect(mod).toHaveProperty("main");

		expect(mod.main).toBeInstanceOf(Function);
	});

	test("return value", () => {
		const main = mod.main as () => void;
		main();
	});
});

describe("enum with generics", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	test("compiles", async () => {
		mod = await execute_string(`enum Optional<T> {
			case Some { value: T },
			case None
		}
				
		fn some<T> (value: T) -> Optional.Some:<T> { 
			Optional.Some:<T> { value: value }
		}
	
		fn none<T> () -> Optional.None:<T> {
			Optional.None:<T> {}
		}
	
		export fn main {
			let a: Optional:<str> = some:<str>("hello world")
			let b: Optional:<str> = none:<str>()
			let c: Optional:<i32> = some:<i32>(12)
			let d: Optional:<i32> = none:<i32>()
		}
		`);
	});

	test("exports functions", () => {
		expect(mod).toHaveProperty("main");

		expect(mod.main).toBeInstanceOf(Function);
	});
});

describe("simple enum switch", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	test("compiles", async () => {
		mod = await execute_string(`enum CompassPoint {
			case North,
			case South,
			case East,
			case West
		}

		export fn north -> u32 {
			main(CompassPoint.North {})
		}

		export fn south -> u32 {
			main(CompassPoint.South {})
		}

		export fn east -> u32 {
			main(CompassPoint.East {})
		}

		export fn west -> u32 {
			main(CompassPoint.West {})
		}
	
		fn main (dir: CompassPoint) -> u32 {
			switch dir {
				case North {
					return 1
				}
				case South {
					return 2
				}
				case East {
					return 3
				}
				case West {
					return 4
				}
			}
		}
		`);
	});

	test("exports functions", () => {
		expect(mod).toHaveProperty("north");
		expect(mod).toHaveProperty("south");
		expect(mod).toHaveProperty("east");
		expect(mod).toHaveProperty("west");

		expect(mod.north).toBeInstanceOf(Function);
		expect(mod.south).toBeInstanceOf(Function);
		expect(mod.east).toBeInstanceOf(Function);
		expect(mod.west).toBeInstanceOf(Function);
	});

	test("functions return expected variant index", () => {
		const north = mod.north as () => number;
		const south = mod.south as () => number;
		const east = mod.east as () => number;
		const west = mod.west as () => number;

		expect(north()).toBe(1);
		expect(south()).toBe(2);
		expect(east()).toBe(3);
		expect(west()).toBe(4);
	});
});

describe("complex enum with generics and switch ", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	test("compiles", async () => {
		mod = await execute_string(`enum Operation<T> {
			case Add { a: T, b: T },
			case Sub { a: T, b: T },
			case Div { a: T, b: T },
			case Mul { a: T, b: T }
		}

		enum Optional<T> {
			case Some { value: T },
			case None
		}

		fn perform_op<T> (op: Operation:<T>) -> T {
			switch op {
				case Add as { a, b } {
					return a + b
				}
				case Sub as sub_op {
					sub_op.a - sub_op.b
				}
				case Div as { a, b } {
					a / b
				}
				case Mul as op {
					return op.a * op.b
				}
			}
		}

		fn create_op<T> (opcode: u32, a: T, b: T) -> Optional:<Operation:<T> > {
			switch opcode {
				case 0 {
					Optional.Some:<Operation:<T> > {
						value: Operation.Add:<T> {
							a: a, b: b
						}
					};
				}
				case 1 {
					Optional.Some:<Operation:<T> > {
						value: Operation.Sub:<T> {
							a: a, b: b
						}
					};
				}
				case 2 {
					Optional.Some:<Operation:<T> > {
						value: Operation.Mul:<T> {
							a: a, b: b
						}
					};
				}
				case 3 {
					Optional.Some:<Operation:<T> > {
						value: Operation.Div:<T> {
							a: a, b: b
						}
					};
				}
				default {
					Optional.None:<Operation:<T> > {};
				}
			}
		}

		fn do_thing<T> (opcode: u32, a: T, b: T) -> T {
			switch create_op:<T>(opcode, a, b) {
				case Some as { value } {
					return perform_op(value)
				}
				case None {
					return 0
				}
			}
		}

		export fn do_thing_f64 (opcode: u32, a: f64, b: f64) -> f64 {
			do_thing(opcode, a, b)
		}

		export fn do_thing_i32 (opcode: u32, a: i32, b: i32) -> i32 {
			do_thing(opcode, a, b)
		}
		`);
	});

	test("exports functions", () => {
		expect(mod).toHaveProperty("do_thing_f64");
		expect(mod).toHaveProperty("do_thing_i32");

		expect(mod.do_thing_i32).toBeInstanceOf(Function);
		expect(mod.do_thing_f64).toBeInstanceOf(Function);
	});
});

function read_i32 (memory: WebAssembly.Memory, ptr: number) {
	const buffer = memory.buffer;
	const view = new DataView(buffer);
	return view.getInt32(ptr, true);
}

function read_string (memory: WebAssembly.Memory, ptr: number) {
	const buffer = memory.buffer;
	const view = new DataView(buffer);
	const length = view.getInt32(ptr, true);
	const u8_view = new Uint8Array(buffer, ptr + 4, length);
	const decoder = new TextDecoder;
	return decoder.decode(u8_view);
}
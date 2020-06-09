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

describe("return test", () => {
	let mod: Record<string, WebAssembly.ExportValue>;

	test("compiles", async () => {
		mod = await execute_string(`
		
		export fn implicit (val: u32) -> u32 {
			val
		}
		
		export fn explicit (val: u32) -> u32 {
			return val
		}
		
		export fn conditional (val: u32) -> u32 {
			if val > 42 {
				return val
			}
			42
		}
		
		export fn explicit_branch (val: u32) -> u32 {
			if val > 42 {
				return val
			}
			else {
				return 42
			}
		}
		
		export fn implicit_branch (val: u32) -> u32 {
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
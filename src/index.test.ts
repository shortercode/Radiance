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

	test("compiles", async () => {
		mod = await execute_string(`export fn say_hi -> str {
			"hello world!"
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

		expect(read_i32(memory, ptr)).toBe(12);
		expect(read_string(memory, ptr)).toBe("hello world!");
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
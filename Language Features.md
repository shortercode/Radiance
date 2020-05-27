# Language Features

## Inbuilt primative types
Radiance supports a number of primative types. 64 bit integers cannot be shared with the host program, this is because JS cannot represent these values as it's numerical type ( which is f64 ).

- `i32` Signed 32 bit integer
- `u32` Unsigned 32 bit integer
- `i64` Signed 64 bit integer ( cannot be exported to host )
- `u64` Unsigned 64 bit integer ( cannot be exported to host )
- `f32` 32 bit floating point number
- `f64` 64 bit floating point number
- `bool` Boolean ( exports as an i32 )
- `str` String 
- `number` Alias for `f64`
- `string` Alias for `str`
- `boolean` Alias for `bool`

## Tuples
Tuples can be instantiated using the tuple literal expression, which has the following syntax.

```
let value: (i32, i32) = (0, 0);
```

Values can then be read back like so `value.0`. At the moment you can only read from tuples, this will change in a future update. Tuples can be used as parameters and return values for functions.

## Structs
Structs require a declaration, they can then be instantiated using the constructor literal expression.

```
struct Person {
	name: i32
}

let value = Person {
	name: "Arthur"
}
```

Values can then be read back like so `value.name`. At the moment you can only read from structs, this will change in a future update. Methods are not supported at this time, but structs can be used as parameters and return values for functions.

## Arrays
Arrays can be created with array literal expressions.
```
let people: Person[] = [
	Person {
		name: "Arthur"
	},
	Person {
		name: "Jenny"
	},
	Person {
		name: "Forest"
	}
]
```
Array type signatures can either be sized or unsized. Unsized will allow assignement of an array of any size, but sized will not.

Arrays can be read using `people[1]`. It's not currently possible to write values back to an array, but this will change in future. Accessing an array includes bounds checks, and will cause a panic if the index is out of bounds. A panic cannot be caught within Radiance, but the host can with a try...catch.

The length of the array can be read back using `people.length`.

## Statements

Statements in Radiance are effectively limited to declarations, everything else is an expression.

### Variables: let
The let statement decalres a new variable. A type can be optionally specified with the variable, which is passed to the initialiser expression as a hint. If no type is given the type will attempt to be inferred from the initialiser expression. The initialiser expression is not optional at this time. Variables can only be declared locally to a function, not at the global scope.

```
let a: i32 = 0
let b = 0
let c: f32 = 0 // 0 is interpreted as a f32 here
```

### Functions: fn
The fn statement declares a new function. Both the parameters block and the return type are optional. In the abscense of a parameter block the function will have no parameters. In the abscense of a return type the function will return void.

```
fn main {

}

fn add (a: i32, b: i32) -> i32 {
 a + b
}
```

Radiance uses implicit return at the moment, this means the return value is the value of the last expression. While this may seem like an awkward restriction it's worth remembering that both `if`, blocks and `while` expressions all return a value, so in practice it doesn't restrict the logical flow of your function by much.

Functions can only be declared in the root scope, not locally. Additionally functions cannot be passed as values.

### Integrating with the host: import/export
Functions can be imported from the host using the import statement, and exported to the host using the export statement.

Import statements include the name of the function followed by the function signature.
Export statements contain a function statement, the function can still be called within the module using it's name.

```
import fn print_i32 (val: i32) -> void

fn print_0 {

}

export fn print_42 {
	print_i32(42)
}
```

### Conditional expressions: if
Conditional logic can be written using `if` expressions which have the following syntax.

```
if a > 12 {
	a - 12
}
else {
	12 - a
}
```

Parenthesis are not required around the condition. If you use them it's parsed as a grouping operator ( similar to `a * (b + c)` ). The clauses of the expression **must** be blocks, hence the braces are compulsary. The else clause is optional, `else if` is not supported at this time but can be reproduced by having another conditional expression within the else clause. The value of the expression is the value of the evaluated clause. As such the type of both clauses are expected to match, if they do not the expression will instead evaluate to void.

### Loop expressions: while
Loops can be implemented using the `while` expression. Parenthesis are not required around the condition. If you use them it's parsed as a grouping operator ( similar to `a * (b + c)` ). The clause of the expression **must** be a block, hence the braces are compulsary. The value of the while expression is the value of the last execution of the clause. If the clause is not executed it will return a default value ( normally 0 ), as such while expression cannot return complex types at the moment ( because they cannot have a default value ).
```
let i = 0;
let r = 0;
while i < 10 {
	r = r + i;
}
```

### Block expressions: {}
Blocks are useful in that they create a new scope, but they also emit the value of their last statement.
```
let a: (bool, str) = {
	(true, "hello")
}
```

### Binary operators
The following binary operators are supported, in order of precedence:
- `and`,`or`: logical AND/OR operator
- `==`, `!=` equality operators
- `<`, `>`, `<=`, `>=` comparison operators
- `+`, `-` addition and subtraction operators
- `|` binary OR operator
- `*`, `/`, `%` multiplication, division and remainder operators
- `&` binary AND operator
- `<<`, `>>` bitshift operators

## Documentation TODO

Logical not operator
Typecast operator
Member access operator
Subscript operator
Grouping operator

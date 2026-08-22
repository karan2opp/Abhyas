# Arrow Functions in JavaScript

In the previous blog, **[Mastering Functions in
JS](https://karan2opp.hashnode.dev/mastering-functions-in-js)**, we
studied functions in JavaScript. For a better understanding of this
topic, it is helpful to understand the basics of functions first.

Arrow functions are a shorter way to write functions using the arrow
(`=>`) symbol.

We assign an arrow function to a variable.

------------------------------------------------------------------------

# Arrow Function Syntax

``` javascript
const variable_name = () => {
    // function body
    // write task here
};
```

Here, `variable_name` is the name of the function.

------------------------------------------------------------------------

# Creating a Simple Arrow Function

Let's create a simple arrow function that prints `"Namaste"`.

``` javascript
const greet = () => {
    console.log("Namaste");
};

greet(); // Function call
```

### Output

``` text
Namaste
```

The function is stored inside the variable `greet`.

We call the function using:

``` javascript
greet();
```

------------------------------------------------------------------------

# Arrow Function with Parameters

Let's create an arrow function that adds two numbers.

``` javascript
const add = (a, b) => {
    return a + b;
};

const result = add(7, 5);

console.log(result);
```

### Output

``` text
12
```

Here:

-   `add` is the function name.
-   `a` and `b` are parameters.
-   `a + b` performs the addition.
-   `return` sends the result back to the caller.

------------------------------------------------------------------------

# Arrow Function with One Parameter

Let's create an arrow function that calculates the square of a number.

``` javascript
const square = x => x * x;

console.log(square(4)); // 16
```

### Output

``` text
16
```

### Explanation

-   `square` is the name of the function.
-   `x` is the parameter.
-   `x * x` calculates the square of the number.

When an arrow function has only **one parameter**, the parentheses
around the parameter can be omitted:

``` javascript
const square = x => x * x;
```

Instead of:

``` javascript
const square = (x) => x * x;
```

Both are valid.

------------------------------------------------------------------------

# Arrow Function with Multiple Parameters

When an arrow function has multiple parameters, we use parentheses
around them.

``` javascript
const multiply = (a, b) => a * b;

const result = multiply(5, 6);

console.log(result);
```

### Output

``` text
30
```

------------------------------------------------------------------------

# Implicit and Explicit Return

One of the useful features of arrow functions is that they support two
ways of returning a value:

-   Explicit return
-   Implicit return

Let's understand both.

------------------------------------------------------------------------

# Explicit Return

When we manually use the `return` keyword, it is called an **explicit
return**.

### Example

``` javascript
const square = (x) => {
    return x * x;
};

console.log(square(4));
```

### Output

``` text
16
```

### Explanation

-   Curly braces `{}` are used.
-   We explicitly write the `return` keyword.
-   The value after `return` is returned to the caller.

For example:

``` javascript
const square = (x) => {
    return x * x;
};
```

The function calculates:

``` text
4 × 4 = 16
```

and returns `16`.

------------------------------------------------------------------------

## What Happens Without `return`?

If we use curly braces but don't write `return`, the function does not
automatically return the expression.

``` javascript
const square = (x) => {
    x * x;
};

console.log(square(4));
```

### Output

``` text
undefined
```

This is an important difference.

When curly braces `{}` are used for the function body, you need to
explicitly use `return` if you want to return a value.

------------------------------------------------------------------------

# Implicit Return

When an arrow function contains a single expression without curly
braces, that expression is automatically returned.

This is called an **implicit return**.

### Example

``` javascript
const square = x => x * x;

console.log(square(4));
```

### Output

``` text
16
```

### Explanation

There is no `{}` and no `return` keyword.

``` javascript
x => x * x
```

automatically returns the result of:

``` javascript
x * x
```

So:

``` javascript
const square = x => x * x;
```

is effectively returning the result of the expression.

------------------------------------------------------------------------

# Explicit Return vs Implicit Return

  Explicit Return                   Implicit Return
  --------------------------------- ------------------------------
  Uses the `return` keyword         Does not use `return`
  Usually uses `{}`                 Usually written without `{}`
  Useful for multiple statements    Best for a single expression
  More suitable for complex logic   Shorter and concise

### Explicit Return

``` javascript
const square = (x) => {
    return x * x;
};
```

### Implicit Return

``` javascript
const square = x => x * x;
```

Both functions produce the same result.

------------------------------------------------------------------------

# Multiple Statements in an Arrow Function

If you need multiple statements, use curly braces.

``` javascript
const calculate = (a, b) => {
    const sum = a + b;
    const result = sum * 2;

    return result;
};

console.log(calculate(5, 10));
```

### Output

``` text
30
```

Here, multiple statements are required, so we use `{}` and an explicit
`return`.

------------------------------------------------------------------------

# Arrow Functions and `this`

One of the most important differences between arrow functions and
regular functions is how they handle the `this` keyword.

**Arrow functions do not have their own `this`.**

Instead, they inherit `this` from their surrounding **lexical scope**.

Regular functions, on the other hand, can have their own `this`
depending on how they are called.

Let's understand this with an example.

------------------------------------------------------------------------

# `this` in an Arrow Function

Consider an object:

``` javascript
const bill = {
    amount: 1000,

    showAmount: () => {
        console.log(this.amount);
    }
};

bill.showAmount();
```

### Output

``` text
undefined
```

Why?

The arrow function does not create its own `this`.

It takes `this` from its surrounding lexical scope.

In this example, the surrounding scope does not have the `amount`
property belonging to the `bill` object, so:

``` javascript
this.amount
```

does not give us `1000`.

This is why arrow functions are generally not suitable when we need a
method to use the object as its `this` value.

------------------------------------------------------------------------

# `this` in a Regular Function

Now let's use a regular function as the object method.

``` javascript
const bill = {
    amount: 1000,

    showAmount: function () {
        console.log(this.amount);
    }
};

bill.showAmount();
```

### Output

``` text
1000
```

Here, `showAmount` is called as a method of the `bill` object:

``` javascript
bill.showAmount();
```

Therefore, inside the regular function:

``` javascript
this
```

refers to the `bill` object.

So:

``` javascript
this.amount
```

is equivalent to:

``` javascript
bill.amount
```

and the output is:

``` text
1000
```

------------------------------------------------------------------------

# Arrow Function vs Regular Function

The main difference discussed here is the behavior of `this`.

  -----------------------------------------------------------------------
  Arrow Function                      Regular Function
  ----------------------------------- -----------------------------------
  Does not have its own `this`        Has its own `this` depending on how
                                      it is called

  Inherits `this` from the            `this` is determined by the call
  surrounding lexical scope           context

  Concise syntax                      Traditional function syntax

  Supports implicit return            Requires `return` for returned
                                      values

  Commonly useful for callbacks and   Useful for methods and situations
  short functions                     requiring dynamic `this`
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# When Should You Use Arrow Functions?

Arrow functions are especially useful when:

-   You need a short function.
-   You have a simple calculation.
-   You are working with callbacks.
-   You are using array methods such as `map()`, `filter()`, and
    `forEach()`.
-   You want to use lexical `this`.

### Example

``` javascript
const numbers = [1, 2, 3, 4, 5];

const squares = numbers.map(number => number * number);

console.log(squares);
```

### Output

``` text
[1, 4, 9, 16, 25]
```

The arrow function makes the callback concise and easy to read.

------------------------------------------------------------------------

# When Should You Use Regular Functions?

Regular functions can be preferable when:

-   You need a function's own `this` behavior.
-   You are defining object methods that need the calling object as
    `this`.
-   You need a traditional function declaration or expression for a
    particular use case.

For example:

``` javascript
const user = {
    name: "Aman",

    greet: function () {
        console.log(this.name);
    }
};

user.greet();
```

### Output

``` text
Aman
```

------------------------------------------------------------------------

# Quick Revision

### Basic Arrow Function

``` javascript
const greet = () => {
    console.log("Namaste");
};
```

### Arrow Function with Parameters

``` javascript
const add = (a, b) => {
    return a + b;
};
```

### One Parameter

``` javascript
const square = x => x * x;
```

### Multiple Parameters

``` javascript
const multiply = (a, b) => a * b;
```

### Explicit Return

``` javascript
const square = (x) => {
    return x * x;
};
```

### Implicit Return

``` javascript
const square = x => x * x;
```

### Object Method with Regular Function

``` javascript
const bill = {
    amount: 1000,

    showAmount: function () {
        console.log(this.amount);
    }
};
```

### Arrow Function Does Not Have Its Own `this`

``` javascript
const bill = {
    amount: 1000,

    showAmount: () => {
        console.log(this.amount);
    }
};
```

------------------------------------------------------------------------

# Important Points to Remember

-   Arrow functions use the `=>` syntax.
-   Arrow functions provide a shorter syntax for writing functions.
-   One parameter can be written without parentheses.
-   Multiple parameters require parentheses.
-   Arrow functions can use explicit or implicit returns.
-   An expression without `{}` is implicitly returned.
-   When `{}` are used, you need `return` to return a value.
-   Arrow functions do not have their own `this`.
-   Arrow functions inherit `this` from their lexical scope.
-   Regular functions can have their own `this` depending on how they
    are called.
-   Arrow functions are commonly used for callbacks and concise
    functions.
-   Regular functions are often useful for object methods that need
    `this`.

------------------------------------------------------------------------

# Conclusion

Arrow functions are a modern and concise way to write functions in
JavaScript. They make code shorter and easier to read, especially when
writing simple functions or callbacks.

With features like **implicit return**, developers can write clean
one-line functions when only a single expression is required.

However, arrow functions behave differently from regular functions when
it comes to the `this` keyword.

Arrow functions do not have their own `this`. Instead, they inherit
`this` from their surrounding lexical scope. Because of this behavior,
arrow functions are generally not the best choice for object methods
when the method needs `this` to refer to the object.

In practice, arrow functions are commonly used for small utility
functions, callbacks, and array methods because of their simplicity and
readability. Regular functions are useful when working with object
methods or situations where the function needs its own `this` behavior.

Understanding when to use arrow functions and when to use regular
functions helps developers write cleaner, more predictable, and more
maintainable JavaScript code.

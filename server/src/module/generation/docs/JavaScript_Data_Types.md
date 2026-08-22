# JavaScript Data Types

## What is a Data Type?

While writing JavaScript programs, variables can store different kinds
of values.

For example:

``` javascript
let age = 29;
let username = "John";
let isLoggedIn = true;
```

Here:

-   `29` is a number.
-   `"John"` is a string.
-   `true` is a boolean.

The type of value stored in a variable is called its **data type**.

JavaScript has **8 fundamental data types**:

1.  Number
2.  String
3.  Boolean
4.  Undefined
5.  Null
6.  BigInt
7.  Symbol
8.  Object

The first seven are **primitive types**. `Object` is the
non-primitive/reference category.

------------------------------------------------------------------------

# Primitive Data Types

Primitive values are the basic building blocks of JavaScript data.

Primitive values are generally:

-   Immutable
-   Compared by their value
-   Copied as values

### What does Immutable mean?

**Immutable** means that the primitive value itself cannot be changed.

For example, strings are immutable:

``` javascript
let name = "Aman";

name = "Riya";
```

The original string `"Aman"` was not modified. Instead, `name` was
reassigned to a different string value.

> **Important:** `let` allows a variable to be reassigned. This does not
> mean that the primitive value itself is being mutated.

------------------------------------------------------------------------

# 1. Number

The `number` type is used for both integer and floating-point numbers.

``` javascript
let age = 29;
const pi = 3.14;

console.log(typeof age);
console.log(typeof pi);
```

### Output

``` text
number
number
```

JavaScript uses the same `number` type for integers and decimal values.

``` javascript
let marks = 95;
let price = 99.99;
let temperature = -5;
```

JavaScript also has special numeric values such as:

``` javascript
Infinity
-Infinity
NaN
```

------------------------------------------------------------------------

# 2. String

A string is a sequence of characters used to represent text.

Strings can be written using:

-   Double quotes `" "`
-   Single quotes `' '`
-   Backticks `` ` ` ``

### Example

``` javascript
let username = "john doe";

console.log(username);
```

### Output

``` text
john doe
```

Strings can also contain numbers, but they are still strings:

``` javascript
let age = "19";

console.log(typeof age);
```

### Output

``` text
string
```

### Template Literals

Backticks allow us to insert variables directly into strings.

``` javascript
let name = "Aman";
let age = 20;

console.log(`My name is ${name} and I am ${age} years old.`);
```

### Output

``` text
My name is Aman and I am 20 years old.
```

------------------------------------------------------------------------

# 3. Boolean

The Boolean type has only two values:

-   `true`
-   `false`

Boolean values are commonly used to represent yes/no or true/false
conditions.

``` javascript
let isAdmin = false;
let isLoggedIn = true;

console.log(isAdmin);
console.log(typeof isAdmin);

console.log(isLoggedIn);
console.log(typeof isLoggedIn);
```

### Output

``` text
false
boolean
true
boolean
```

Booleans are commonly used with conditional statements:

``` javascript
let isLoggedIn = true;

if (isLoggedIn) {
    console.log("Welcome!");
}
```

------------------------------------------------------------------------

# 4. Null

`null` represents an intentional absence of a value.

``` javascript
let age = null;
```

You can think of `null` as saying:

> "There is intentionally no value here."

For example:

``` javascript
let selectedUser = null;
```

This can mean that currently no user has been selected.

### Important JavaScript Detail

There is a historical JavaScript behavior:

``` javascript
console.log(typeof null);
```

### Output

``` text
object
```

Although `typeof null` returns `"object"`, `null` is treated as a
distinct primitive value. The `typeof null` behavior is a long-standing
JavaScript quirk.

------------------------------------------------------------------------

# 5. Undefined

`undefined` means that a value has not been assigned.

``` javascript
let age;

console.log(age);
```

### Output

``` text
undefined
```

A variable declared without an initial value contains `undefined`.

``` javascript
let username;

console.log(typeof username);
```

### Output

``` text
undefined
```

We can also explicitly assign `undefined`:

``` javascript
let value = undefined;
```

However, in normal code, it is usually better to let JavaScript use
`undefined` naturally rather than manually assigning it.

------------------------------------------------------------------------

# 6. BigInt

`BigInt` is used for integers larger than the safe range of JavaScript's
`Number` type.

A BigInt literal ends with `n`:

``` javascript
const bigNumber = 123456789012345678901234567890n;

console.log(bigNumber);
console.log(typeof bigNumber);
```

### Output

``` text
123456789012345678901234567890n
bigint
```

You cannot directly mix `BigInt` and `Number` in arithmetic:

``` javascript
const a = 10n;
const b = 5;

// console.log(a + b); // ❌ TypeError
```

You must convert them when necessary.

------------------------------------------------------------------------

# 7. Symbol

A `Symbol` creates a unique value.

``` javascript
const id = Symbol("id");

console.log(typeof id);
```

### Output

``` text
symbol
```

Even if two Symbols have the same description, they are different
values:

``` javascript
const a = Symbol("id");
const b = Symbol("id");

console.log(a === b);
```

### Output

``` text
false
```

Symbols are often used as unique property keys in objects.

------------------------------------------------------------------------

# 8. Object

Objects are used to store collections of related data.

``` javascript
const user = {
    name: "Aman",
    age: 20,
    isLoggedIn: true
};

console.log(user);
```

An object can contain multiple properties.

``` javascript
console.log(user.name);
console.log(user.age);
```

### Output

``` text
Aman
20
```

Objects can also be modified:

``` javascript
const user = {
    name: "Aman"
};

user.name = "Riya";

console.log(user.name);
```

### Output

``` text
Riya
```

This works even though `user` was declared using `const`.

Why?

Because `const` prevents **reassignment of the variable**, not mutation
of the object.

This is not allowed:

``` javascript
user = {}; // ❌ TypeError
```

------------------------------------------------------------------------

# Arrays Are Objects

Arrays are commonly used to store lists of values.

``` javascript
const fruits = ["Apple", "Banana", "Mango"];

console.log(fruits);
```

Although arrays have their own useful behavior, JavaScript considers
them objects:

``` javascript
console.log(typeof fruits);
```

### Output

``` text
object
```

You can verify that a value is specifically an array using:

``` javascript
console.log(Array.isArray(fruits));
```

### Output

``` text
true
```

------------------------------------------------------------------------

# Primitive vs Object

The eight fundamental types can be organized like this:

### Primitive Types

-   Number
-   String
-   Boolean
-   Undefined
-   Null
-   BigInt
-   Symbol

### Non-Primitive / Reference Category

-   Object
    -   Arrays
    -   Functions
    -   Dates
    -   Maps
    -   Sets
    -   and many other objects

A common way to understand the difference is through copying.

## Primitive Copy

Primitive values are copied by value:

``` javascript
let a = 10;
let b = a;

b = 20;

console.log(a);
console.log(b);
```

### Output

``` text
10
20
```

Changing `b` does not change `a`.

------------------------------------------------------------------------

## Object Copy

Variables containing objects hold a reference to the object.

``` javascript
const user1 = {
    name: "Aman"
};

const user2 = user1;

user2.name = "Riya";

console.log(user1.name);
console.log(user2.name);
```

### Output

``` text
Riya
Riya
```

Both variables refer to the same object.

> **Important:** Saying "objects are passed by reference" is a useful
> beginner shortcut, but technically JavaScript always passes arguments
> by value. When the value is an object reference, the copied value
> refers to the same object.

------------------------------------------------------------------------

# Checking Data Types with `typeof`

JavaScript provides the `typeof` operator to check the type of a value.

``` javascript
console.log(typeof 10);
console.log(typeof "Hello");
console.log(typeof true);
console.log(typeof undefined);
console.log(typeof 10n);
console.log(typeof Symbol("id"));
console.log(typeof {});
```

### Output

``` text
number
string
boolean
undefined
bigint
symbol
object
```

Remember the special case:

``` javascript
console.log(typeof null);
```

Output:

``` text
object
```

This is a historical JavaScript quirk.

------------------------------------------------------------------------

# Quick Revision

  Data Type   Example              Purpose
  ----------- -------------------- ------------------------------
  Number      `42`, `3.14`         Numeric values
  String      `"Hello"`            Text
  Boolean     `true`               True/false values
  Undefined   `undefined`          Value not assigned
  Null        `null`               Intentional absence of value
  BigInt      `123n`               Very large integers
  Symbol      `Symbol("id")`       Unique identifiers
  Object      `{ name: "Aman" }`   Collections of data

------------------------------------------------------------------------

# Conclusion

In this topic, we learned about the **8 fundamental JavaScript data
types**:

-   Number
-   String
-   Boolean
-   Undefined
-   Null
-   BigInt
-   Symbol
-   Object

We learned that the first seven are **primitive types**, while objects
belong to the **non-primitive/reference category**.

We also learned the important difference between **primitive values and
objects**, including how primitive values are copied independently while
object variables can refer to the same object.

Finally, we learned how to use the `typeof` operator to inspect data
types and discussed special JavaScript behavior such as `typeof null`
returning `"object"`.

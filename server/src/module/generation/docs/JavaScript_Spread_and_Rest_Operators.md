# JavaScript Spread and Rest Operators

The **spread (`...`)** and **rest (`...`)** operators look exactly the
same, but they perform different tasks depending on where they are used.

Let's understand them step by step.

------------------------------------------------------------------------

# Spread Operator

As the name **spread** suggests, the spread operator is used to **spread
or expand values**.

The **spread operator (`...`)** is used to expand or "spread" elements
of an array or properties of an object.

It is commonly used to:

-   Copy arrays
-   Merge arrays
-   Copy objects
-   Merge objects
-   Pass array values as individual arguments

------------------------------------------------------------------------

# Spreading an Array

Suppose we have two arrays:

``` javascript
let arr1 = [1, 2];
let arr2 = [3, 4];
```

We can merge them using the spread operator:

``` javascript
let merged = [...arr1, ...arr2];

console.log(merged);
```

### Output

``` text
[1, 2, 3, 4]
```

Here:

``` javascript
...arr1
```

spreads the values of `arr1`:

``` text
1, 2
```

and:

``` javascript
...arr2
```

spreads the values of `arr2`:

``` text
3, 4
```

So the final array becomes:

``` text
[1, 2, 3, 4]
```

------------------------------------------------------------------------

# Spread Operator Creates a Shallow Copy

The spread operator can be used to create a **shallow copy** of an
array.

``` javascript
let arr = [1, 2, 3];

let copy = [...arr];

copy[0] = 99;

console.log(copy[0]);
console.log(arr[0]);
```

### Output

``` text
99
1
```

Here:

``` javascript
let copy = [...arr];
```

creates a new array.

So changing:

``` javascript
copy[0]
```

does not change:

``` javascript
arr[0]
```

The two arrays are separate at the top level.

------------------------------------------------------------------------

# Why Is It Called a Shallow Copy?

The spread operator creates a new array or object at the **top level**,
but nested objects or arrays can still share references.

Consider this example:

``` javascript
let house = {
    location: "Mumbai",

    roomInfo: {
        bedroom: 2,
        bathroom: 1
    }
};

let copy = { ...house };

copy.roomInfo.bedroom = 3;

console.log(house.roomInfo.bedroom);
```

### Output

``` text
3
```

Why did changing `copy` also change `house`?

Because the spread operator copied the outer object, but the nested
`roomInfo` object is still referenced by both objects.

Conceptually:

``` text
house
  |
  +-- roomInfo ───────┐
                      |
copy                  |
  |                   |
  +-- roomInfo ───────┘
```

Both `house.roomInfo` and `copy.roomInfo` refer to the same nested
object.

Therefore:

``` javascript
copy.roomInfo.bedroom = 3;
```

also affects:

``` javascript
house.roomInfo.bedroom
```

This is why spread creates a **shallow copy**, not a deep copy.

------------------------------------------------------------------------

# Spread with Objects

The spread operator can also copy object properties.

``` javascript
const user = {
    name: "Karan",
    age: 20
};

const newUser = { ...user };

console.log(newUser);
```

### Output

``` text
{ name: "Karan", age: 20 }
```

Here, the properties of `user` are spread into the new object.

------------------------------------------------------------------------

# Merging Objects

We can also use spread to merge objects.

``` javascript
const userInfo = {
    name: "Karan"
};

const address = {
    city: "Delhi"
};

const user = {
    ...userInfo,
    ...address
};

console.log(user);
```

### Output

``` text
{
    name: "Karan",
    city: "Delhi"
}
```

The properties from both objects are copied into the new object.

------------------------------------------------------------------------

# Rest Operator

The **rest operator (`...`)** looks exactly like the spread operator,
but its job is different.

The rest operator is used to **collect multiple values into a
collection**.

Think of it like this:

> **Spread → expands values**

> **Rest → collects values**

------------------------------------------------------------------------

# Rest Operator in Array Destructuring

Consider this array:

``` javascript
const [user1, ...users] = [
    "Karan",
    "Hayat",
    "Sudo",
    "Abhishek"
];

console.log(user1);
console.log(users);
```

### Output

``` text
Karan
["Hayat", "Sudo", "Abhishek"]
```

Here:

``` javascript
user1
```

gets the first value.

The rest operator:

``` javascript
...users
```

collects all remaining values into the `users` array.

So:

``` text
user1 → "Karan"

users → ["Hayat", "Sudo", "Abhishek"]
```

------------------------------------------------------------------------

# Rest Operator in Function Parameters

The rest operator is very useful when a function can receive a variable
number of arguments.

For example:

``` javascript
function add(...numbers) {
    return numbers.reduce((acc, val) => acc + val, 0);
}

console.log(add(4, 5, 6, 7));
```

### Output

``` text
22
```

Here:

``` javascript
...numbers
```

collects all arguments into an array.

So when we call:

``` javascript
add(4, 5, 6, 7);
```

inside the function:

``` javascript
numbers
```

becomes:

``` text
[4, 5, 6, 7]
```

Then `reduce()` adds all the values.

------------------------------------------------------------------------

# Rest Operator in Object Destructuring

The rest operator can also collect remaining properties from an object.

``` javascript
const user = {
    name: "Karan",
    age: 20,
    city: "Delhi"
};

const { name, ...others } = user;

console.log(name);
console.log(others);
```

### Output

``` text
Karan
{ age: 20, city: "Delhi" }
```

Here:

``` javascript
name
```

gets the `name` property.

The rest operator:

``` javascript
...others
```

collects all remaining properties.

So:

``` text
name → "Karan"

others → {
    age: 20,
    city: "Delhi"
}
```

------------------------------------------------------------------------

# Rest Operator with a Main Parameter

We can combine a normal parameter with a rest parameter.

``` javascript
function logUsers(mainUser, ...others) {
    console.log(mainUser);
    console.log(others);
}

logUsers("Karan", "Hayat", "Sudo", "Abhishek");
```

### Output

``` text
Karan
["Hayat", "Sudo", "Abhishek"]
```

Here:

``` javascript
mainUser
```

gets the first argument.

The rest operator collects all remaining arguments:

``` javascript
...others
```

------------------------------------------------------------------------

# Spread vs Rest

Even though they look identical:

``` javascript
...
```

their behavior depends on **where they are used**.

  ------------------------------------------------------------------------
  Feature                 Spread Operator         Rest Operator
  ----------------------- ----------------------- ------------------------
  Purpose                 Expands values          Collects values

  Main idea               Unpack / expand         Gather / collect

  Common usage            Arrays and objects      Destructuring and
                                                  function parameters

  Example                 `[...arr]`              `[first, ...rest]`

  Function example        `fn(...args)`           `function fn(...args)`
  ------------------------------------------------------------------------

A useful mental model is:

``` text
Spread:
[1, 2, 3] → 1, 2, 3

Rest:
1, 2, 3 → [1, 2, 3]
```

The syntax is the same, but the operation is opposite.

------------------------------------------------------------------------

# Practical Use Cases

## Spread Operator

### 1. Copying Arrays

``` javascript
const arr = [1, 2, 3];

const copy = [...arr];

console.log(copy);
```

### Output

``` text
[1, 2, 3]
```

------------------------------------------------------------------------

### 2. Merging Arrays

``` javascript
const a = [1, 2];
const b = [3, 4];

const merged = [...a, ...b];

console.log(merged);
```

### Output

``` text
[1, 2, 3, 4]
```

------------------------------------------------------------------------

### 3. Copying Objects

``` javascript
const user = {
    name: "Karan"
};

const newUser = {
    ...user
};

console.log(newUser);
```

### Output

``` text
{ name: "Karan" }
```

------------------------------------------------------------------------

### 4. Updating Objects

Spread is commonly used to create a new object while changing one
property.

``` javascript
const user = {
    name: "Karan",
    age: 20
};

const updatedUser = {
    ...user,
    age: 21
};

console.log(updatedUser);
```

### Output

``` text
{
    name: "Karan",
    age: 21
}
```

The later `age: 21` property overrides the earlier `age: 20`.

------------------------------------------------------------------------

### 5. Passing Array Values as Arguments

Spread can also be used when calling a function.

``` javascript
function add(a, b, c) {
    return a + b + c;
}

const numbers = [10, 20, 30];

console.log(add(...numbers));
```

### Output

``` text
60
```

Here:

``` javascript
...numbers
```

expands the array into separate arguments:

``` javascript
add(10, 20, 30);
```

------------------------------------------------------------------------

# Rest Operator

### 1. Array Destructuring

``` javascript
const [first, ...rest] = [1, 2, 3, 4];

console.log(first);
console.log(rest);
```

### Output

``` text
1
[2, 3, 4]
```

------------------------------------------------------------------------

### 2. Object Destructuring

``` javascript
const user = {
    name: "Karan",
    age: 20,
    city: "Delhi"
};

const { name, ...others } = user;

console.log(others);
```

### Output

``` text
{
    age: 20,
    city: "Delhi"
}
```

------------------------------------------------------------------------

### 3. Function Parameters

``` javascript
function add(...numbers) {
    return numbers.reduce((a, b) => a + b, 0);
}

console.log(add(1, 2, 3, 4));
```

### Output

``` text
10
```

------------------------------------------------------------------------

### 4. Handling Dynamic Arguments

``` javascript
function logUsers(mainUser, ...others) {
    console.log("Main user:", mainUser);
    console.log("Other users:", others);
}

logUsers("Karan", "Hayat", "Sudo", "Abhishek");
```

### Output

``` text
Main user: Karan
Other users: ["Hayat", "Sudo", "Abhishek"]
```

------------------------------------------------------------------------

# Important Points to Remember

-   Spread and rest both use the `...` syntax.
-   **Spread expands** values.
-   **Rest collects** values.
-   Spread is commonly used when creating arrays or objects, or when
    passing values to a function.
-   Rest is commonly used in destructuring and function parameters.
-   Spread creates a **shallow copy**.
-   Nested objects and arrays can still share references after
    spreading.
-   Rest parameters collect remaining function arguments into an array.
-   In array destructuring, rest collects the remaining elements.
-   In object destructuring, rest collects the remaining properties.
-   In a function call, spread can turn an array into individual
    arguments.

------------------------------------------------------------------------

# Conclusion

The **spread (`...`)** and **rest (`...`)** operators may look exactly
the same, but they serve different purposes.

The **spread operator** is used to **expand or unpack values**. It is
commonly used for copying and merging arrays and objects, updating
objects without modifying the original top-level object, and passing
array elements as individual function arguments.

The **rest operator** is used to **collect multiple values into a single
collection**. It is commonly used with array and object destructuring
and with function parameters that can receive a variable number of
arguments.

The easiest way to remember the difference is:

> **Spread → expands**

> **Rest → collects**

Understanding this difference will make it much easier to work with
arrays, objects, destructuring, and functions in modern JavaScript.

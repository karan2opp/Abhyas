# Understanding Object-Oriented Programming (OOP) in JavaScript

When we start learning programming, we usually write code using
variables and functions. But as programs grow bigger, managing
everything becomes difficult.

This is where **Object-Oriented Programming (OOP)** helps us organize
code in a better and cleaner way.

Let's understand it step by step.

------------------------------------------------------------------------

# What Object-Oriented Programming (OOP) Means

Object-Oriented Programming is a programming approach where we structure
our code using **objects and classes**.

Instead of writing separate variables and functions, we combine **data
and behavior** into one unit called an **object**.

In simple words:

> **OOP = Data + Functions bundled together**

This helps us write code that is:

-   Easier to understand
-   Easier to maintain
-   Reusable

Languages like **Java, C++, Python, and JavaScript** support OOP
concepts.

------------------------------------------------------------------------

# Real-World Analogy: Blueprint → Objects

To understand OOP better, think about building a **house**.

Before building houses, an architect creates a **blueprint**.

The blueprint describes:

-   Number of rooms
-   Color
-   Size
-   Structure

Using the same blueprint, we can build **many houses**.

Here:

``` text
Blueprint → Class
House → Object
```

So:

-   A **class** is like a blueprint.
-   An **object** is a real thing created using that blueprint.

------------------------------------------------------------------------

# What is a Class in JavaScript?

A **class** is a template used to create objects.

It defines:

-   Properties (data)
-   Methods (functions)

Example:

``` javascript
class Car {
    brand = "Toyota";
}
```

Here, `Car` is a **class**.

It defines the structure of car objects.

------------------------------------------------------------------------

# Creating Objects Using Classes

Objects are created using the **`new` keyword**.

Example:

``` javascript
class Car {
    brand = "Toyota";
}

let car1 = new Car();
let car2 = new Car();

console.log(car1.brand);
```

### Output

``` text
Toyota
```

Here:

-   `car1` and `car2` are **objects**.
-   Both are created from the `Car` class.

Each object is a separate instance of the class.

------------------------------------------------------------------------

# Constructor Method

A **constructor** is a special method that runs automatically when an
object is created.

It is mainly used to **initialize values**.

Example:

``` javascript
class Car {
    constructor(brand, color) {
        this.brand = brand;
        this.color = color;
    }
}

let car1 = new Car("Toyota", "Red");

console.log(car1.brand);
console.log(car1.color);
```

### Output

``` text
Toyota
Red
```

Here:

-   `constructor()` runs automatically when `new Car(...)` creates an
    object.
-   `this` refers to the current object.
-   The constructor sets the object's properties.
-   `"Toyota"` is assigned to `brand`.
-   `"Red"` is assigned to `color`.

------------------------------------------------------------------------

# Methods Inside a Class

Classes can also contain **methods (functions)**.

Methods define the **behavior of objects**.

Example:

``` javascript
class Car {
    constructor(brand) {
        this.brand = brand;
    }

    start() {
        console.log(this.brand + " is starting...");
    }
}

let car1 = new Car("BMW");

car1.start();
```

### Output

``` text
BMW is starting...
```

Here, `start()` is a **method** inside the class.

The method can access the object's data using `this`.

------------------------------------------------------------------------

# Properties and Methods

It is useful to understand the difference between properties and
methods.

### Property

A property stores information about an object.

``` javascript
class Car {
    constructor(brand) {
        this.brand = brand;
    }
}
```

Here:

``` javascript
this.brand
```

is a property.

### Method

A method defines an action or behavior.

``` javascript
start() {
    console.log("Car is starting...");
}
```

Here:

``` javascript
start()
```

is a method.

So you can think of it as:

``` text
Object
  |
  +-- Properties → Data
  |
  +-- Methods    → Behavior
```

------------------------------------------------------------------------

# Basic Idea of Encapsulation

**Encapsulation** means **hiding internal details and controlling access
to data**.

Instead of directly changing values from outside, we can use methods to
control how the data is modified.

Example:

``` javascript
class BankAccount {
    constructor(balance) {
        this.balance = balance;
    }

    deposit(amount) {
        this.balance += amount;
    }
}

let account = new BankAccount(1000);

account.deposit(500);

console.log(account.balance);
```

### Output

``` text
1500
```

Here, we control the balance using the `deposit()` method instead of
directly changing it.

This helps keep data **organized and controlled**.

> **Note:** This is a basic introduction to the idea of encapsulation.
> In JavaScript, stronger access control can also be implemented using
> features such as private class fields (`#field`), which can be studied
> later.

------------------------------------------------------------------------

# Multiple Objects from One Class

One of the biggest advantages of classes is that we can create many
objects from the same class.

``` javascript
class Car {
    constructor(brand, color) {
        this.brand = brand;
        this.color = color;
    }

    start() {
        console.log(`${this.brand} is starting...`);
    }
}

let car1 = new Car("BMW", "Black");
let car2 = new Car("Toyota", "Red");
let car3 = new Car("Audi", "White");

car1.start();
car2.start();
car3.start();
```

### Output

``` text
BMW is starting...
Toyota is starting...
Audi is starting...
```

All three objects use the same class structure, but each object contains
its own data.

------------------------------------------------------------------------

# Quick Revision

  -----------------------------------------------------------------------
  Concept                             Meaning
  ----------------------------------- -----------------------------------
  Class                               A template or blueprint for
                                      creating objects

  Object                              An instance created from a class

  Property                            Data stored on an object

  Method                              Function that defines object
                                      behavior

  Constructor                         Special method used to initialize
                                      an object

  `new`                               Used to create an object from a
                                      class

  `this`                              Refers to the current object in the
                                      constructor/method context
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# Important Points to Remember

-   **OOP** stands for Object-Oriented Programming.
-   OOP helps organize code around objects and their behavior.
-   A **class** acts like a blueprint.
-   An **object** is an instance created from a class.
-   The `new` keyword is used to create objects from classes.
-   A **constructor** runs automatically when an object is created.
-   Properties represent data.
-   Methods represent behavior.
-   `this` is commonly used to access the current object's properties
    and methods.
-   Encapsulation helps control how data is accessed and modified.
-   One class can be used to create many objects.

------------------------------------------------------------------------

# Conclusion

Object-Oriented Programming helps us organize code in a structured and
reusable way.

In JavaScript, we can implement OOP using **classes and objects**.

Key concepts we learned:

-   Classes act like blueprints.
-   Objects are created from classes.
-   Constructors initialize values.
-   Properties store data.
-   Methods define behavior.
-   Encapsulation helps control access to data.

Understanding OOP is an important step toward writing **clean, scalable,
and maintainable JavaScript applications**.

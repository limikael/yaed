yaed
====

Yet Another Event Dispatcher

* [Introduction](#introduction)
* [Installation](#installation)
* [Basic usage](#basic-usage)
* [Multiple inheritance](#multiple-inheritance)
* [Function name aliases](#function-name-aliases)
* [Event object vs. event name and parameters](#event-object-vs-event-name-and-parameters)
* [Associate scope with listeners](#associate-scope-with-listeners)

Introduction
------------

This is an implementation of an EventDispatcher in javascript. Admitably, it is one of many such
implementations. It has some unique features which other implementations lack, which is why
I created this one. I will outline how this implementation is used here below, as well as provide
a motivation for these features.

For reference documentation see: http://limikael.altervista.org/yaeddoc/

Installation
------------

This is a NPM package, so it is intented to be used inside a NPM project. There are tutorials available on how to set up
a NPM project, but a mini tutorial is here. First, create and cd to a folder for your project.

````sh
    mkdir myproject
    cd myproject
````

The initialize this folder as a npm project:

````sh
    npm init
````

This will create a package.json file. Then, install yaed as a dependency:

````sh
    npm install --save-dev yaed
````

This will create a `node_modules` directory for the dependencies of your project and put yaed there. It will also
add a reference to yaed in the package.json file, so that if you distribute your code, someone else can do:

````sh
    npm install
````

And install all dependencies for your project. For this reason, if you use a source repository such as git, 
you should _not_ put the `node_modules` there. Instead, add node_modules to your `.gitignore` file.

Basic usage
-----------

The basic usage is like this. If we have something that should be able to dispatch events,
we make it inherit the EventDispatcher class.

````javascript
    var EventDispatcher = require("yaed");
    var inherits = require("inherits");

    function MyObservable() {
    }

    inherits(MyObservable, EventDispatcher);
````

We can then add a listener and dispatch events:

````javascript
    var observable = new MyObservable();
    observable.on("the_event",function() {
        console.log("The event was tirggered!");
    });

    observable.trigger("the_event");
````

Multiple inheritance
--------------------

There are situations where the thing that should dispatch events is already something else.
For example, if we have a button created in PIXI.js, then we might want this button to be
able to dispatch click events, but we also want the button to be a PIXI.DisplayObjectContainer.

Multiple inheritance to the rescue!

````javascript
    function Button() {
    }

    inherits(Button, PIXI.DispayObjectContainer);
    EventDispatcher.init(Button);
````

Function name aliases
---------------------

I cannot decide if I like the HTML DOM and Actionscript names, i.e. `addEventListener`, 
`removeEventListener` and `dispatchEvent` better, or the shorter style used by jquery, i.e.
`on`, `off` and `trigger`. I'm leaning towards the latter, but I'm not sure.

However, in order to have to avoid making a decision about this, I made it support both. The 
funtions are aliases for each other, and work exactly the same way.

Event object vs. event name and parameters
------------------------------------------

I have seen two slightly different ways how event parameters are passed to listening functions.
Again, the first one is favoured by Actionscript and the second by jquery.

The first method uses an event object, and the type of the event we want to dispatch is
specified in the `type` field of that object. The second method accepts the event name
as a string, and then the `dispatchEvent`/`trigger` behaves as a variadic function and
passes further parameters along to the listening function.

I decided to support both methods, so the
`dispatchEvent`/`trigger` function will check the type of the first parameter to see if
it is an object or a string.

If it is an object, the `dispatchEvent`/`trigger` function will let the `type` field of
the object determine the type of event and it will pass the event object to the listening
function. If it is a string, the string will determine the event type, and the listener
will be called with the remaining arguments passed to the `dispatchEvent`/`trigger` function.

The code to send and handle an event sent with an event object would be:

````javascript
    var observable=new EventDispatcher();

    observable.on("someEvent", function(ev) {
        console.log("a is: " + ev.a + " and b is: " + ev.b);
        console.log("the event type is: " + ev.type + " and was sent from: " + ev.target);
    });

    observable.trigger({
        type: "someEvent",
        a: 1,
        b: 2
    });
````

And to send and handle events using a string for the event type:

````javascript
    var observable=new EventDispatcher();

    observable.on("someEvent", function(a, b) {
        console.log("a is: " + ev.a + " and b is: " + ev.b);
    });

    observable.trigger("someEvent", 1, 2);
````

As mentioned before, there are pros and cons with both. The second style is shorter, while
the first style enables the event dispatcher to add a `target` field to the event object
to indicate which object that sent the event.

Associate scope with listeners
------------------------------

Because of how scoping works in javascript, special care has to be taken when using callbacks. We cannot
use a member function as a callback, and automatically expect this method to be able to access other
members of the object.

Therefore, the `on` and `off` functions take one more parameter, which is the scope that will be used
when calling the listeners. So we can do like this:

````javascript
    var src=new EventDispatcher();
    src.on("event", obj.func, obj);
    /* ... */
    src.off("event", obj.func, obj);
````

For an explanation why this is necesarry, first consider this code:

````javascript
    var obj={};
    obj.x=10;
    obj.func=function() {
        console.log(this.x);
    }
````

Now, if would call `obj.func`:

````javascript
    obj.func();
````

This would trace 10 as expected. However, if we would use this function as a callback or listener, things
would not work as expected. I.e., this code:

````javascript
    var src=new EventDispatcher();
    src.on("event", obj.func);
    src.trigger("event");
````

Would _not_ print 10. Why? Because the `this` variable referenced inside `obj.func` will no longer
point to the `obj` object, since only the member function is passed as a listener, there is no reference
to the object associated with this function. Javascript has a solution for this, namely the `bind` function.
We could use code likte the following to get things to work as expected:

````javascript
    var src=new EventDispatcher();
    src.on("event", obj.func.bind(obj));
    src.trigger("event");
````

There is one problem with this approach however. This is when we later want to remove the listener. A naive
approach would be to do:

````javascript
    var src=new EventDispatcher();
    src.on("event", obj.func.bind(obj));
    /* ... */
    src.off("event", obj.func.bind(obj));
````

But this would not work since there are actualy two separate calls to the bind function and the values
returned are two separate objects. What we could do is save the bound function in a member variable:

````javascript
    var src=new EventDispatcher();
    var boundFunction=obj.func.bind(obj);
    src.on("event", boundFunction);
    /* ... */
    src.off("event", boundFunction);
````

But this would bloat our precious variable namespace. Our code will probably be complex enough even
without the system adding unneccesary complexity for us.

That's where the extra `scope` parameter is useful.

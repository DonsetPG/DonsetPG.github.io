---
layout: post
title: What's a PDE? (an intro to math)
---
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-145347384-1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'UA-145347384-1');
</script>

<style TYPE="text/css">
code.has-jax {font: inherit; font-size: 100%; background: inherit; border: inherit;}
</style>
<script type="text/x-mathjax-config">
MathJax.Hub.Config({
    tex2jax: {
        inlineMath: [['$','$'], ['\\(','\\)']],
        skipTags: ['script', 'noscript', 'style', 'textarea', 'pre'] // removed 'code' entry
    }
});
MathJax.Hub.Queue(function() {
    var all = MathJax.Hub.getAllJax(), i;
    for(i = 0; i < all.length; i += 1) {
        all[i].SourceElement().parentNode.className += ' has-jax';
    }
});
</script>
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.4/MathJax.js?config=TeX-AMS_HTML-full"></script>


More and more as time goes by, I find myself explaining some basic math concepts while talking about what I do or what I am interested in.
I'm not here to criticize the knowledge of physics or mathematics of the average person you might meet, but just to take some time to try to explain how very basic math
concepts work together. And eventually, build important physics concepts. (and eventually rule the world we live in?)

This is mostly inspired by talks with members of my family. One could not understand what equations and derivatives were. Another had no idea how position and velocity were related.
Finally, the last one didn't know what a PDE (as if it wasn't complicated enough without acronyms) was, and God forbid what Navier-Stokes could even be.

I did write some of this down, mostly how I wanted the math to work together. Apart from this, this would be a pretty accurate transcription of how I would explain this
orally to whoever's climbing next to me during an easy multi-pitch where you join more for the views and the discussion than the climbing itself.

# Equations

It's pretty bold to start what I'm calling an intro to mathematics with such an intimidating word as equation. I think that for most people who have grown further and further from math,
the word equation kind of crystallizes everything they hate about math. Let's change that.

In its simplest form:

$$x=2 (1)$$

is an equation. Some will argue with you that it's not (mostly boring and annoying people), but let's say it is. Let's take a step back. In this equation, $x$ is what
we call the unknown, and we could call $2$ the known part. When solving an equation, you simply want to find what the unknown is, given what you know. Here, it's pretty simple.
I am sure 99% of you can do it: $x$ must be equal to $2$.

> By the way, that $(1)$ is simply here to give a name (or a number) to our equation. This means that if later on I say something like "wait, this looks exactly like equation $(1)$", you know what I'm talking about.

Another way to look at it would be:

$$x-2=0$$

Obviously, if we say that $x=2$, we do have $2-2=0$, so that works. Yeah! In fact, in an equation, we can add the same number to both sides of the equation, and
the result holds true. For example:

$$x-2 = 0 \rightarrow x-2 +2 = 0 + 2 \rightarrow x=2$$

> I'm writing $\rightarrow$ more to symbolize a chain of thought. Given the audience, I don't want to use other symbols that may have other significations in other contexts.

So, you solved an equation. Yeah again. We can also multiply (or divide) the two sides of our equation (we can't divide by 0 though, you remember that, right?). 
For example:

$$3 \times x = 6 \rightarrow \frac{3 \times x}{3} = \frac{6}{3} \rightarrow x=2 (2)$$

$x$ is equal to $2$, again. (Quickly realize in your head that indeed, 3 times 2 does equal 6). 

Let's take it up a notch: 

$$x^2 = x \times x = 4 (3)$$ 

Yes, you are right. $x$ is again equal to $2$ (because 2 times 2 equals 4, yeah). But, what is $-2$ times $-2$? 4. Yes. Yeah? Does that mean that some equations
have more than one solution? Yes, absolutely. A super interesting way to think about equations is to plot them on a graph. For example, let's get back to equation $(2)$:

![png]({{ site.url }}/imgs/2024-06-05-whats-a-pde/plot-linear.png)

We can see that our line crosses the number 6 at $x=2$, which solves our equation!

Same for equation $(3)$, we have: 

![png]({{ site.url }}/imgs/2024-06-05-whats-a-pde/plot-squared.png)

Obviously our 2 solutions, at $x = 2$ and $x=-2$. So yeah, equations can have more than one solution. Worse than that, if you take a look at the plot above, you can see that the $-1$ line does not have any solution. It never crosses our equation. So the following equation:

$$x^2 = -1$$ does not have any solution. 

> Well, hm, in fact, it does have solutions. But they're not real so they can't hurt you. And it's probably better if we don't talk about them here. 

Equations can be as complex as you want them to be. In our case here, we don't want that complexity. We simply want to understand the concept of unknown, and what it means to solve an equation. However, as you may have noticed here, our unknown is a number. It can be equal to 2, or to anything, as long as it solves the problem we were given.

But what if this unknown was now a function?

# Functional Equations 

## What the heck is a function?

Let's take a box and call it $f$. That box is pretty simple: you give it a number and it returns another number to you. For example, if that box is your government, you give it $x$ your salary, and it returns to you $0.5x$, your new salary! (Yeah?) Let's say that box is a time converter for New York: you give it 10 and it returns 16 (the current time in Paris). 
Well, those are functions. In the first case, we had $f(x) = 0.5x$.

> Notice how I did not write the second one as it would be too complex for any reader actually reading what the heck a function is.

Here, $x$ is not the unknown anymore, it's a *variable*. It represents any number. You write $f(x) = 0.5x$ so that you can write $f(0) = 0$ or $f(2) = 1$. 

Let's imagine a super simple functional equation. That is, the unknown is now a function itself! 

$$ f(x) -2 = 0$$

Well, you guessed it. Our function here is very, very, very simple: $f(x) = 2$. That means that this box will always return 2, no matter what we give it.

A more complex one could be:

$$f(x+y) = f(x) + f(y)$$

where $x$ and $y$ are both variables. This means that we have $f(0) = f(0+0) = f(0) + f(0) = 2f(0)$. Or: $f(0) = f(1 + -1) = f(1) + f(-1)$. And so on and so on. Let's keep that in the back of our mind, and talk about something crucial: derivatives.

## Deri-what?

The derivative of a function is also a function. Yes. More specifically, it's the function that tells us how our original function is "evolving". You remember $x^2 = 4$, right? We had the following plot:

![png]({{ site.url }}/imgs/2024-06-05-whats-a-pde/plot-squared.png)

Well, on the left of 0, our function seems to decrease. After that, it increases. Well, the derivative of $x^2$ tells us exactly that. 

Let's introduce an almost rigorous definition, just for the sake of simple calculations. We can define the derivative of $f$ by:

$$\frac{f(x+h) - f(x)}{h}$$

when $h$ gets super small. Like smaller than the smallest number you can think of. (Yes, it always exists). Let's investigate the function $f(x) = 2x$ and plot it:

![png]({{ site.url }}/imgs/2024-06-05-whats-a-pde/plot-derivativ.png)

We can see that this function is negative before $0$ and positive after. It actually tells us how our main function $x^2$ is moving: it's decreasing before $0$, and increasing after. Why, you ask? Because $f(x) = 2x$ is the derivative of $x^2$! Let's show it quickly:

$$\frac{f(x+h) - f(x)}{h} = \frac{(x+h)^2 - x^2}{h} = \frac{x^2+2xh+h^2 - x^2}{h} = \frac{2xh+h^2}{h} = 2x +h$$

which is equal to $2x$ when $h$ gets closer and closer to 0.

But why do we have this relationship between the sign of the derivative and how the main function is evolving? One way to look at it is to represent the derivative as a simple linear function. Let's plot the line that goes through $f(x+h)$ and $f(x)$, and let's reduce $h$:

![png]({{ site.url }}/imgs/2024-06-05-whats-a-pde/tangent.gif)

We can see that as $h$ gets smaller and smaller (and thus B gets closer and closer to A), the line becomes the tangent to our function at point A. This is the best straight-line approximation to our function at that point. Because of that, it makes sense that if our function is decreasing, then our line is decreasing as well. But for such a simple function, one can easily say if it's decreasing or not, thanks to the sign of its director coefficient. But in this case, you may ask what its coefficient is? Well... $$\frac{f(x+h) - f(x)}{h}$$ of course, our derivative! 

And here you are, you see how its sign and the main function shape are related. 

## Derivatives? In equations??

Yes, that is also possible. As a side note, we denote the derivative of a function with a prime: $f'$. One of the most famous differential equations is $f' = f$ (and f(0) = 1). Yes, we also add those extra conditions because differential equations can have an infinity of solutions. So by adding a small extra constraint, we can define exactly one solution.

In this case, it's $f(x) = e^x$ where $e$ is the Euler constant.

Differential equations can be more complex than regular equations, but they still live (mostly) in the realm where one can find and define solutions. It gets more tricky when we start to be even more challenging:

One can define a function with more than one variable. For example: $f(x,y) = x^2+3y$. It's a simple 2-variable function, but it can already lead to more complex equations. First of all, how do you define its derivative? What variable do you use? That's why we defined partial derivatives... 

A partial derivative of a function of several variables is its derivative with respect to one of those variables, with the others held constant: $\frac{\partial f}{\partial x}$ is the partial derivative of $f$ with respect to $x$. In the very simple previous case, we had:

$$\frac{\partial f}{\partial x} = 2x, \frac{\partial f}{\partial y} = 3$$

and now we have it...

## Partial differential equation

You take an equation, you add functions in the mix, you put some of their partial derivatives on the side and there you have it: a proper PDE (partial differential equation). For example:

$$\frac{\partial f}{\partial x} + \frac{\partial f}{\partial y} = 0$$

(with some initial conditions as well, of course). 

But you can still be more complex: your function could be 2 or 3 dimensional. That is to say, your function could return a vector (or list of numbers if you want) instead of just a single number. 

That's the case of the velocity in fluid dynamics, for example. Velocity is defined across the $x$, $y$ and $z$ axes, and thus is a 3-dimensional vector. Pressure is not; it's simply a number (still defined in 1, 2, or 3 dimensions depending on our use case). We could define more and more operations such as $\frac{\partial f}{\partial x}$ but it would take a lot of time. You can just keep in mind that any sign you don't recognize is most of the time a mix of additions and partial derivatives. 

Knowing all of that, you can reach the king of all PDEs: the flow motion of incompressible Newtonian fluids is described by the Navier-Stokes (NS) equations: 

$$\rho\ (\frac{\partial \vec{v}}{\partial t} + \vec{v} \cdot \nabla \vec{v}) -\nabla \cdot \left( 2 \eta \vec{\epsilon}(\vec{v}) - p \vec{I} \right)  = \vec{f} $$

$$\nabla \cdot \vec{v} = 0$$

where $t \in [0,T]$ is the time, $\vec{v}(x,t)$ the velocity, $p(x,t)$ the pressure, $\rho$ the fluid density, $\eta$ the dynamic viscosity and $\vec{I}$ the identity tensor. 

Even now, we don't always know if a smooth solution to this equation exists. So how do we solve it? How can Formula 1 racing teams make super precise simulations to improve their cars? 

Well... you think outside the box and you don't solve it. You just try to find a solution that is close enough, and that isn't too bad. 

But more on that in the next article.
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
I'm not here to dunk on the knowledge in physics or mathematics of the regular person you can meet, but just to take some time to try to explain how very basic math
concepts work together. And eventually, build important physics concepts. (and eventually rule the world we live in?)

This is mostly inspired from talks with member of my family. One could not understand equations and derivatives was. The other had no idea how position and velocity were related.
Finally, the last one, didn't know what a PDE (as if it was not complicated enough without acronyms) was, and god forbid what Navier-Stokes even could be.

I did wrote some of this down, mostly how I wanted the math the work together. Appart from this, this would be a pretty accurate transcription of how I would explain this
orally to whoever's climbing next to me during an easy multi-pitch where you join more for the views and the discussion than the climbing itself.

# Equations

Pretty ballsy to start what i'm calling an intro to mathematics with such a mean word as equation. I think that for most people that grew further and further to math,
the word equation kind of crystalize everything they hate about math. let's change that.

In its most simplest form:

$$x=2 (1)$$

is an equation. Some will argue with you that it's not (mostly boring and annoying people), but let's say it is. Let's take a step back. In this equation, $x$ is what *
we call the unknown, and we could call $2$ the known part. When solving an equation, you simply want to find what is the unknown, given what you know. Here, it's pretty simple.
I am sure 99% of you can do it: $x$, must be, equal, to, $2$.

> By the way, that $(1)$ is simply here to give a name (or a number) to our equation. This means that if later on I say something like "wait, this looks exactly like equation $(1)$", you know what i'm talking about.

Another way to look at it would be:

$$x-2=0$$$

Obviously, if we say that $x=2$, we do have $2-2=0$, so that works. yeah ! In fact, in an equation, we can add the same number on both side of the equation, and
the result holds true. For example:

$$x-2 = 0 \rightarrow x-2 +2 = 0 + 2 \rightarrow x=2$$

> I'm writing $\rightarrow$ more to symbolize a chain of thought. Given the audience, i don't want to use other symbol that may have other signification in other context.

So, you solved an equation. yeah again. We can also multiply (or divide) the two sides of our equation (we can't divide by 0 though, you rememember that right?). 
For example:

$$3 \times x = 6 \rightarrow \frac{3 \times x}{3} = \frac{6}{3} \rightarrow x=2 (2)$$

$x$ is equal to $2$, again. (Quickly in your head realize that indeed, 3 times 2 does equal 6). 

Let's take it up a notch: 

$$x^2 = x \times x = 4 (3)$$ 

Yes, you are right. $x$ is again equal to $2$ (because 2 times 2 equals 4, yeah). But, what is $-2$ times $-2$ ? 4. Yes. Yeah? Does that mean that some equation
has more than one solution? Yes, absolutely. A super interesting way to think about equation is to plot them on a graph. For example, let's get back to equation $(2)$:

![png]({{ site.url }}/imgs/2024-06-05-whats-a-pde/plot-linear.png)

We can see that our line crosses the number 6 at $x=2$, which solves our equation !

Same for the equation $(3)$, we have: 

![png]({{ site.url }}/imgs/2024-06-05-whats-a-pde/plot-squared.png)

obiously our 2 solutions, at $x = 2$ and $x=-2$. So yeah, equations can have more than one solution. Worst than that, if you take a look at the plot above, you can see that the $-1$ line does, not, have any solution. It never crosses our equation. So the following equation:

$$x^2 = -1$$ does not have any solution. 

> Well, hm, in fact, it does have solutions. But, they're not real so they can't hurt you. And it's probably better if we don't talk about them here. 

Equations can be as complex as you want them to be. In our case here, we don't. We simply want to understand the concept of unknown, and what it means to solve an equation. However, as you may have noticed here, our unknown is a number. It can be equal to 2, or to anything, as long as it solves the problem we were given.

But what if, this unknown, was now a function?

# Functional Equations 

## wtf is a function

Let's take a box, and call it $f$. That box is pretty simple, you give it a number and it returns to you another number. For example, if that box is your government, you give it $x$ your salary, and it returns to you $0.5x$, your new salary ! (yeah?). Let's say that box is a time converter for New-York: you give it 10 and it returns 16 (the current time in paris). 
Well, those are functions. In the first case, we had $f(x) = 0.5x$.

> Notice how I did not write the second one as it would be too complex for any reader actually reading what the hell a function is

Here, $x$ is not the unkown anymore, it's a *variable*. It represents any number. You write $f(x) = 0.5x$ so that you can write $f(0) = 0$ or $f(2) = 1$. 

Let's imagine a super simple functional equation. That is, the unkown is now a function itself ! 

$$ f(x) -2 = 0$$

Well, you guessed it. Our function is here very, very, very simple: $f(x) = 2$. That means that this box will always return 2, no matter what we give it.

A more complex one could be:

$$f(x+y) = f(x) + f(y)$$

where $x$ and $y$ are both variables. This means that we have $f(0) = f(0+0) = f(0) + f(0) = 2f(0)$. Or: $f(0) = f(1 + -1) = f(1) + f(-1)$. And so on and so on. Let's keep that in the back of our mind, and talk about something crucial: derivatives.

## deri what?

The derivative of a function, is, also a function. yes. More specifically, it's the function the tells us how are original function is "evolving". You remember $x^2 = 4$ right? We had the following plot:

![png]({{ site.url }}/imgs/2024-06-05-whats-a-pde/plot-squared.png)

Well, on the right of 0, our function seems to decrease. After, it increase. Well, the derivative of $x^2$ tells us exactly that. 
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

$$x-2 = 0 \leftarrow x-2 +2 = 0 + 2 \leftarrow x=2$$

> I'm writing $\leftarrow$ more to symbolize a chain of thought. Given the audience, i don't want to use other symbol that may have other signification in other context.

So, you solved an equation. yeah again. We can also multiply (or divide) the two sides of our equation (we can't divide by 0 though, you rememember that right?). 
For example:

$$3 \times x = 6 \leftarrow \frac{3 \times x}{3} = \frac{6}{3} \leftarrow x=2 (2)$$

$x$ is equal to $2$, again. (Quickly in your head realize that indeed, 3 times 2 does equal 6). 

Let's take it up a notch: 

$$x^2 = x \times x = 4$$ 

Yes, you are right. $x$ is again equal to $2$ (because 2 times 2 equals 4, yeah). But, what is $-2$ times $-2$ ? 4. Yes. Yeah? Does that mean that some equation
has more than one solution? Yes, absolutely. A super intersting way to think about equation is to plot them on a graph. For example, let's get back to equation $(2)$:

![png]({{ site.url }}/imgs/2024-06-05-whats-a-pde/plot-linear.png)
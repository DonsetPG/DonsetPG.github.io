---
layout: post
title: Graph Neural Networks for Finite Element Methods
---

<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-145347384-1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'UA-145347384-1');
</script>

This blog post contains a small introduction to Finite Element Methods and Graph Neural Networks. This may or may not be to serve as future support for a paper.

**Videos of predictions from our models are available [here](#predictions).**

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/intro.gif">
</p>

# Finite Element Methods

Partial differential equations can be very, very complicated. To some extent, they are still one of the biggest mystery in physics and mathematics. We often do not know the exact solution for a particular equation, and are thus forced to find a way to approximate it.

A popular method to achieve this is the finite element method. It consists of subdividing a domain into small parts, called finite elements. This space discretization produces an object called a mesh: a set of points and edges similar to a graph.

Instead of considering the equation in a continuous domain, we consider it instead on our mesh: on each node lives some values of interests (such as the velocity, the pressure, etc).

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/animations-graph-1.gif">
</p>

The easiest way to create a mesh is to simply create a uniform grid. For example, let's take a simple rectangle, and create on mesh on it:

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/animations-graph-2.gif">
</p>

We also print each nodes with different colors based on certain values (let's say the pressure for example). One can immediately see why a uniform grid may not be the best way to create a mesh: a lot of the orange nodes are redundant. On the other hand, some pair of nodes display a huge gap in values: we should add extra points between those.

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/animations-graph-3.gif">
</p>

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/animations-graph-4.gif">
</p>

Another important consideration is the fact that in order for the information to flow between each node, it could be interesting to add extra-edges between nodes.

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/animations-graph-5.gif">
</p>

This leads to the creation of a much more optimized mesh than a simple uniform grid. This mesh is then used as a support to approximate a solution of the partial differential equation. It means that we minimize an approximation error, on each node, of a candidate function into the equation.

While this method now offers very strong results in a vast variety of fields (fluid flow, heat transfers, electromagnetism, etc), it can also be very slow. The action of meshing a domain can be tedious, especially if it needs to take place at each temporal time step, and the iterative process of reducing the approximation error can take a long time as well.

Given those considerations, one can start to wonder if Neural Network Models could help achieve similar accuracy, while being much faster at inference time. As an example, let's consider a triplet of nodes from our original mesh:

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/animations-graph-6.gif">
</p>

We then build a dataset by placing this triplet in various conditions, and solving our equation using the Finite Element Method:

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/animations-graph-7.gif">
</p>

In each case, we actually get a vector for each node and edge. Those vector can then be considered as inputs for a Neural Network such as a Multilayer Perceptron:

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/animations-graph-8.gif">
</p>

# Graph Neural Network

Given a graph (i.e. a set of nodes and edges), we need to imagine a process that let's us updates the vectors living on each node and edge. One way to do so is to consider each edge, concatenate their values with the one from the nodes attached to it, and process those into a new vector. 

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/animations-graph-9.gif">
</p>

Similarly, one can also process the value of a node by selecting edges connected to it and then process those in a Multilayer Perceptron.

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/animations-graph-10.gif">
</p>

This process is called a Message Passing step. The information flow from each node into connected edges, and then from all edges to all connected nodes. To put it simply, information travels from all node to their direct neighbours.

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/animations-graph-11.gif">
</p>

But one may ask, what will happend if we repeat this operation? Will we transfer information to more distant neighbours? Well yes, each message passing step expands the information flow to neighbours distant of one more step. That means that in theory, if the 2 most distant neighbours are linked by 10 edges, 10 message passing steps will allow each node of the graph to receive information from every other nodes.

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/animations-graph-12.gif">
</p>

We saw earlier how we used the Finite Element Method to create a dataset of different use cases. Let's go back to our rectangular mesh, and use them to train a Graph Neural Network. In practive, a Graph Neural Network is simply $n$ Message Passing steps, one after the other.

On each node and edge of our mesh (or graph) lives a vector that encapsulates a lot of information. We updates all of those vectors with our Message Passing steps and get an update mesh: this is our prediction.

We then compare this prediction to the ground truth and compute a loss by substracting the values on each node:

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/animations-graph-13.gif">
</p>

This method lets us train a Graph Neural Network to copy the results from the Finite Element Method. While the training can be long, the inference time is much quicker than it's classical counterpart (100 to 1000 times quicker !). If we take into account the initial cost of training a model, this means that after around 100 simulations, it start to be more interesting to train a Graph Neural Network !

Speaking of inference, the network makes its predictions in an autoregressive fashion:

<p align="center">
  <img src="{{ site.url }}/imgs/2024-05-13-multigrid-gnn/animations-graph-14.gif">
</p>

It means that at each step, the output of the model is now used as the input to generate the next prediction. This process is then repeated for the number of desired time steps.

# Conclusion

You can find videos of predictions from our models in the section below. You can also read a much more detailed paper about our models here: [Multi-grid Graph Neural Networks](https://)

While it is obviously more dense than this overly simplified blog post, we hope it is easily understandable even for people that does not gravitate around either CFD, Finite Element Methods or Graph Neural Networks. 

# Predictions

<iframe src="https://drive.google.com/file/d/1zU1JSmPzobJz6O0ut7waIaKpoe-gvWS_/preview" width="640" height="480" allow="autoplay"></iframe>

<iframe src="https://drive.google.com/file/d/1zDhHHtTkuCSKcZRydOxnbes9JInJR7yx/preview" width="640" height="480" allow="autoplay"></iframe>

<iframe src="https://drive.google.com/file/d/1joLY-pQedQikt2OltIVrDLWrXNW3m_ss/preview" width="640" height="480" allow="autoplay"></iframe>


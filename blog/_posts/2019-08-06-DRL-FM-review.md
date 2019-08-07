---
layout: post
title: A review on Deep Reinforcement Learning for Fluid Mechanics
---
When I started an Internship at the [CEMEF](http://www.cemef.mines-paristech.fr), I've already worked with both Deep Reinforcement Learning (DRL) and Fluid Mechanics, but never used one with the other. I knew that several people already went down that lane (cf refs), some where even currently working at the [CEMEF](http://www.cemef.mines-paristech.fr) when I arrived. However, I (and my tutor Elie) still had several questions/goals on my mind :

* How was DRL applied to Fluid Mechanics?
* To improve in both subject, I wanted to try a test case on my own;
* How could we code something as general as possible?

The results of these questions are available [here](arxiv link), with the help of a fantastic team.

# Applications of DRL to Fluid mechanics :

Several Fluid Mechanics problems have already been tackled with the help of DRL. They always (mostly) follow the same pattern, using DRL tools on one side (such as [Gym](), [Tensorforce]() or [stables-baselines](), etc) and Computational Fluid Dynamics (CFD) on the other ([Fenics](), [Openfoam](), etc).

-- add graph --

Currently, most of the seen cases always consider an object (a cylinder, a square, a fish, etc.) in a 2D/3D fluid. The DRL agent will then be able to perform several tasks :

* Move the object
* Change the geometry or size of the object
* Change the fluid directly

This agent can perform these tasks at two key moments : (i) when the experiment is done, and you want to start a new one, (ii) during the experiment (i.e., during the CFD time). One is about direct optimization; the other one is about continuous control. A few examples can be seen below :

-- add examples and videos --

# My own test case :

In order to dive deeper into the subject, I wanted to try a test case on my own (and with the help of [Jonathan](GitHub) at the beginning though). We took inspiration from [this paper](meliga) and considered a simple case: a laminar flow past a square. Now, it is convenient to compute the drag of this square (in this very set-up).

encadré laminar

encadré drag

encadré Reynolds number

However, the question asked by [this paper](meliga) was: if we add a tiny cylinder, somewhere close to the square, could we be able to reduce the total drag of both the square and the small cylinder?

The answer is yes, and the results are shown below for several Reynolds number :

ad figure Re = 40 and Re = 100

Now, of course solving this case with DRL was interesting, but I wanted to see if more was possible (since the case was already settled technically). Several ideas were possible (thanks to discussions with peoples from the [CEMEF](a) and the review I did previously) :

1. Was there any difference between direct optimization and continuous control?
2. Was the use of an autoencoder possible easy?
3. Was Transfer Learning possible, and performant?
4. Could we make a code as clear as possible?

Regarding the first point, I found no particular difference between direct optimization and continuous control. Both agents converge and find almost the same optimal final positions.

add direct optimization from paper

add 2 giff (40 and 100)

I used an autoencoder but had no time no compare results with and without it. I do have to explain why an autoencoder could be of any help here. The agent needs observations, and when dealing with fluid mechanics, the fluid characteristics are significant observations. However, they can be of very high dimensions (more than 10,000). The Neural Network (NN) we would deal with would then be extremely vast. In order to surpass this issue, an autoencoder could be used to extract simple features from high-dimensional fluid fields. However, it does seem like using as many fluid features as possible (which is possible with the autoencoder) is the best thing to do: add ref JR probes.

In total, I trained six agents, as shown below :

<table>
  <thead>
    <tr>
      <th>Agent</th>
      <th>Reynolds Number - $$Re$$</th>
      <th>Goal</th>
      <th>Details</th>
    </tr>
  </thead>
  <tfoot>
    <tr>
      <td>Agent 1.1</td>
      <td>$$Re=10$$</td>
      <td>Continuous control</td>
      <td>Trained from scratch</td>
    </tr>
  </tfoot>
  <tbody>
    <tr>
      <td>Agent 1.2</td>
      <td>$$Re=10$$</td>
      <td>Direct optimization</td>
      <td>Trained from scratch</td>
    </tr>
    <tr>
      <td>Agent 2.1</td>
      <td>$$Re=40$$</td>
      <td>Continuous control</td>
      <td>Transfer learning from Agent 1.1</td>
    </tr>
    <tr>
      <td>Agent 2.2</td>
      <td>$$Re=40$$</td>
      <td>Direct optimization</td>
      <td>Transfer learning from Agent 1.2</td>
    </tr>
<tr>
      <td>Agent 3.1</td>
      <td>$$Re=100$$</td>
      <td>Continuous control</td>
      <td>Transfer learning from Agent 1.1</td>
    </tr>
<tr>
      <td>Agent 3.2</td>
      <td>$$Re=100$$</td>
      <td>Direct optimization</td>
      <td>Transfer learning from Agent 1.2</td>
    </tr>
  </tbody>
</table>

As you can see, I used transfer learning and obtained excellent results from it: the agent was learning from 5 to 10 times faster than the agent trained from scratch. This is an exciting feature in general, but especially for Fluid Dynamics, where CFD is computationally expensive.

# A DRL-fluid mechanics library?

At the beginning, my goal was to find out if such a library could be built (in a reasonable amount of time). During the creation of my test case, I realized the biggest issue with such a library was coming from the CFD solver : not only no one is really using the same, but they all are pretty different.

---
layout: post
title: A review on Deep Reinforcement Learning for Fluid Mechanics
---

<a href="https://github.com/nicoelayda/celeste/issues/new">Open an issue.</a>


When I started an Internship at the [CEMEF](http://www.cemef.mines-paristech.fr), I've already worked with both Deep Reinforcement Learning (DRL) and Fluid Mechanics, but never used one with the other. I knew that several people already went down that lane (cf refs), some where even currently working at the [CEMEF](http://www.cemef.mines-paristech.fr) when I arrived. However, I (and my tutor Elie) still had several questions/goals on my mind :

* How was DRL applied to Fluid Mechanics?
* To improve in both subject, I wanted to try a test case on my own;
* How could we code something as general as possible?

The results of these questions are available [here](arxiv link), with the help of a fantastic team.

# Applications of DRL to Fluid mechanics :

Several Fluid Mechanics problems have already been tackled with the help of DRL. They always (mostly) follow the same pattern, using DRL tools on one side (such as [Gym](https://gym.openai.com), [Tensorforce](https://github.com/tensorforce/tensorforce) or [stables-baselines](https://stable-baselines.readthedocs.io).
), etc) and Computational Fluid Dynamics (CFD) on the other ([Fenics](https://fenicsproject.org), [Openfoam](https://www.openfoam.com), etc).

Currently, most of the seen cases always consider an object (a cylinder, a square, a fish, etc.) in a 2D/3D fluid. The DRL agent will then be able to perform several tasks :

* Move the object
* Change the geometry or size of the object
* Change the fluid directly

This agent can perform these tasks at two key moments : (i) when the experiment is done, and you want to start a new one, (ii) during the experiment (i.e., during the CFD time). One is about direct optimization; the other one is about continuous control. A few examples can be seen below :

![fish_article]({{ site.url }}/imgs/2019-08-06-DRL-FM-review/fish_article.png)

<center>
<em>
Leader and Follower swimmer reproduced from <a href="https://iopscience.iop.org/article/10.1088/1748-3190/aa6311/pdf">Novati et al. (2017)</a>, with the displacement and the orientation between the leader and the follower.
 </em>
 </center>

![flow_control_jet_article]({{ site.url }}/imgs/2019-08-06-DRL-FM-review/flow_control_jet_article.png)


<center>
<em>
Comparison of the velocity magnitude without (top) and with (bottom) active flow control, reproduced from <a href="https://arxiv.org/abs/1808.07664">Rabault et al. (2019)</a>. This active flow control being linked to a DRL agent.
 </em>
 </center>

![fluid_solid_article]({{ site.url }}/imgs/2019-08-06-DRL-FM-review/fluid_solid_article.png)

<center>
<em>
Fluid jets to control rigid body reproduced from <a href="https://dl.acm.org/citation.cfm?id=3201334">Ma et al. (2018)</a>. The position and orientation of the jet are DRL controlled.
 </em>
 </center>

and even [this video](https://www.youtube.com/watch?v=O8QtAi2cHBI).

# My own test case :

In order to dive deeper into the subject, I wanted to try a test case on my own (and with the help of [Jonathan](https://github.com/jviquerat) at the beginning though). We took inspiration from [this paper](https://hal.archives-ouvertes.fr/hal-01082600v2) and considered a simple case: a laminar flow past a square. Now, it is convenient to compute the drag of this square (in this very set-up).

<div class="message">
encadré laminar
</div>
<div class="message">
encadré drag
</div>
<div class="message">
encadré Reynolds number
</div>

However, the question asked by [this paper](https://hal.archives-ouvertes.fr/hal-01082600v2) was: if we add a tiny cylinder, somewhere close to the square, could we be able to reduce the total drag of both the square and the small cylinder?

The answer is yes, and the results are shown below for several Reynolds number :

![meliga_40]({{ site.url }}/imgs/2019-08-06-DRL-FM-review/meliga_40.png)

<center>
<em>
Variation of drag induced by a small control cylinder at Reynolds = 40, reproduced from <a href="https://hal.archives-ouvertes.fr/hal-01082600v2">Meliga et al. (2014)</a>.
 </em>
 </center>

![meliga_100]({{ site.url }}/imgs/2019-08-06-DRL-FM-review/meliga_100.png)

<center>
<em>
Variation of drag induced by a small control cylinder at Reynolds = 100, reproduced from <a href="https://hal.archives-ouvertes.fr/hal-01082600v2">Meliga et al. (2014)</a>.
 </em>
 </center>

Now, of course solving this case with DRL was interesting, but I wanted to see if more was possible (since the case was already settled technically). Several ideas were possible (thanks to discussions with peoples from the [CEMEF](http://www.cemef.mines-paristech.fr) and the review I did previously) :

1. Was there any difference between direct optimization and continuous control?
2. Was the use of an autoencoder possible easy?
3. Was Transfer Learning possible, and performant?
4. Could we make a code as clear as possible?

Regarding the first point, I found no particular difference between direct optimization and continuous control. Both agents converge and find almost the same optimal final positions.

![R40-GIF]({{ site.url }}/imgs/2019-08-06-DRL-FM-review/R40-GIF.gif)

<center>
<em>
Continuous control over 17 time-steps at Reynolds = 40, from a random position.
 </em>
 </center>

![R100-GIF]({{ site.url }}/imgs/2019-08-06-DRL-FM-review/R100-GIF.gif)

<center>
<em>
Continuous control over 17 time-steps at Reynolds = 100, from a random position.
 </em>
 </center>

I used an autoencoder but had no time no compare results with and without it. I do have to explain why an autoencoder could be of any help here. The agent needs observations, and when dealing with fluid mechanics, the fluid characteristics are significant observations. However, they can be of very high dimensions (more than 10,000). The Neural Network (NN) we would deal with would then be incredibly vast. In order to surpass this issue, an autoencoder could be used to extract simple features from high-dimensional fluid fields. However, it does seem like using as many fluid features as possible (which is possible with the autoencoder) is the best thing to do:

![test fish8]({{ site.url }}/imgs/2019-08-06-DRL-FM-review/probes-JR.png)

<center>
<em>
Value of the drag coefficient with active flow control reproduced from <a href="https://arxiv.org/abs/1808.07664">Rabault et al. (2019)</a>. It is important to see that the more informations we give about the fluid (i.e. the more probes we give the agent), the more performant it will be. Being able to give everything without exploding the size of the neural network is therefore super valuable.
 </em>
 </center>

In total, I trained six agents, as shown below :

<table>
  <thead>
    <tr>
      <th>Agent</th>
      <th>Reynolds Number - Re</th>
      <th>Goal</th>
      <th>Details</th>
    </tr>
  </thead>
  <tfoot>
    <tr>
      <td>Agent 1.1</td>
      <td> Re=10 </td>
      <td>Continuous control</td>
      <td>Trained from scratch</td>
    </tr>
  </tfoot>
  <tbody>
    <tr>
      <td>Agent 1.2</td>
      <td> Re=10 </td>
      <td>Direct optimization</td>
      <td>Trained from scratch</td>
    </tr>
    <tr>
      <td>Agent 2.1</td>
      <td> Re=40 </td>
      <td>Continuous control</td>
      <td>Transfer learning from Agent 1.1</td>
    </tr>
    <tr>
      <td>Agent 2.2</td>
      <td> Re=40 </td>
      <td>Direct optimization</td>
      <td>Transfer learning from Agent 1.2</td>
    </tr>
<tr>
      <td>Agent 3.1</td>
      <td> Re=100 </td>
      <td>Continuous control</td>
      <td>Transfer learning from Agent 1.1</td>
    </tr>
<tr>
      <td>Agent 3.2</td>
      <td> Re=100 </td>
      <td>Direct optimization</td>
      <td>Transfer learning from Agent 1.2</td>
    </tr>
  </tbody>
</table>

As you can see, I used transfer learning and obtained excellent results from it: the agent was learning from 5 to 10 times faster than the agent trained from scratch. This is an exciting feature in general, but especially for Fluid Dynamics, where CFD is computationally expensive.

# A DRL-fluid mechanics library?

At the beginning, my goal was to find out if such a library could be built (in a reasonable amount of time). During the creation of my test case, I realized the biggest issue with such a library was coming from the CFD solver: not only no one is using the same, but they all are pretty different.

For my test case, I based my code on [Fenics](https://fenicsproject.org), an easy-to-use solver (and super convenient since you can use it directly in Python). The code is available [here](https://github.com/DonsetPG/fenics-DRL). It is supposed to be as clear and re-usable as possible. It is based on [Gym](https://gym.openai.com) and [stable-baselines](https://stable-baselines.readthedocs.io).

I used Gym to build custom environment, always following the same pattern :

```python
class FluidMechanicsEnv_(gym.Env):
    metadata = {'render.modes': ['human']}
    def __init__(self,
                    **kwargs):
        ...
        self.problem = self._build_problem()
        self.reward_range = (-1,1)
        self.observation_space = spaces.Box(low=np.array([]), high=np.array([]), dtype=np.float16)
        self.action_space = spaces.Box(low=np.array([]), high=np.array([]), dtype=np.float16)     
    def _build_problem(self,main_drag):
        ...
        return problem                
    def _next_observation(self):
        ...      
    def step(self, action):
        ...
        return obs, reward, done, {}   
    def reset(self):
        ...
```

With stable-baselines, I used their DRL algorithms implementations, and finally, as I said earlier, I used Fenics to build my test case using custom class that I hope will be re-used for other test cases. They use 3 main class : Channel, Obstacles and Problem :

### Channel :

```python
class Channel:

    """
    Object computing where our problem will take place.
    At the moment, we restraint ourself to the easier domain possible : a rectangle.
    :min_bounds:    (tuple (x_min,y_min))   The lower corner of the domain
    :max_bounds:    (tuple (x_max,y_max))   The upper corner of the domain
    :Channel:       (Channel)               Where the simulation will take place
    """
    def __init__(self,
                min_bounds,
                max_bounds,
                type='Rectangle'):
```

### Obstacles :

```python
class Obstacles:

    """
    These are the obstacles we will add to our domain.
    You can add as much as you want.
    At the moment, we only take care of squares and circles and polygons
    :size_obstacles:    (int)           The amount of obstacle you wanna add
    :coords:            (python list)   List of tuples, according to 'fenics_utils.py : add_obstacle'
    :Obstacles:         (Obstacles)     An Obstacles object containing every shape we wanna add to our domain
    """


    def __init__(self,
                size_obstacles=0,
                coords = []):
```

### Problem :

```python
class Problem:

    def __init__(self,
                min_bounds,
                max_bounds,
                import_mesh_path = None,
                types='Rectangle',
                size_obstacles=0,
                coords_obstacle = [],
                size_mesh = 64,
                cfl=5,
                final_time=20,
                meshname='mesh_',
                filename='img_',
                **kwargs):

        """
        We build here a problem Object, that is to say our simulation.
        :min_bounds:                (tuple      (x_min,y_min)) The lower corner of the domain
        :max_bounds:                (tuple      (x_max,y_max)) The upper corner of the domain
        :import:import_mesh_path:   (String)    If you want to import a problem from a mesh, and not built it with mshr
        :types:                     (String)    Forced to Rectangle at the moment
        :size_obstacle:             (int)       The amount of shape you wanna add to your domain
        :coords_obstacle:           (tuple)     the parameters for the shape creation
        :size_mesh:                 (int)       Size of the mesh you wanna create
        :cfl:                       (int)
        :final_time:                (int)       Length of your simulation
        :mesh_name:                 (String)    Name of the file you wanna save your mesh in
        :filename:                  (String)    Name of the file you wanna save the imgs in
        """
```

However, this is not getting even close to a true DRL-fluid mechanics library, the issue being Fenics. While being very easy to use, it is a slow solver, and it would be impracticable to use it for a challenging problem.  This is why, with other people working at the CEMEF, the goal is to build this library, linking DRL with other CFD libraries, most of them being C++ based.

# Conlusion

- concl
- thanks

# References

- JR
- articles review dont images
- meliga
- our paper
- ...

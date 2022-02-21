---
layout: post
title: Why virtualization is the future for education
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

We released our first version of [Flaneer](https://www.flaneer.com/) in mid-March 2021.
Since then, we have conducted several tests with small entities, such as Game Development or Post-production Studios and signed several clients.
We also launched a test with a French engineering University: [MINES Paristech - PSL](https://en.wikipedia.org/wiki/Mines_ParisTech).
While this test took place 9 month ago, we believe this is an amazing example to show for a few reasons:

* It showcases how students and teachers can work and collaborate together remotely, without investing in expansive laptops,
* A good user experience is everything: students worked much more in a simple, ready to use and powerful environment,
* By using heavy software and GPUs in the cloud, we show how students, but more generally, engineers, can work and reduce their IT costs,

The goal was simple: give access to engineering software ([Fusion360](https://www.autodesk.fr/products/fusion-360/overview), [Abaqus](https://www.3ds.com/fr/produits-et-services/simulia/produits/abaqus/abaqusstandard/), [3DExperience](https://www.3ds.com/fr/3dexperience), [Paraview](https://www.paraview.org/), internal tools & python scripts) with the computing power needed (32GB RAM & a GPU per student) everywhere.
Given the sanitary context in Paris at the time, this last point was crucial: students had to work even if the school was closed.

The mission of each students group was to build a drone, from its conception to making it fly!

![]({{ site.url }}/imgs/2022-01-18-why-virtualization-is-the-future-for-education/1.png)

The solution we provided was for each student to remotely access a Virtual Machine running on Windows via a streaming protocol. Software were already installed, and files & folders were managed with our custom file system management.

While each beta test so far was a success, we use the example of MINES Paristech - PSL to dive deep into the usage & feedbacks of each student, mainly because this is the first one that was conducted at length (from March 24 to April 28) and at scale (~100 students & teachers).

## Usage

First, let's have a look at the raw numbers. Students launched 1584 streaming sessions, each of them lasting 3.2 hours on average. Overall, students used Flaneer for more than 5000 hours, with around 10% of the usage during the weekend. Even if the students' official hours were from 9 am to 5 pm, we still record many sessions outside of this time range.

![]({{ site.url }}/imgs/2022-01-18-why-virtualization-is-the-future-for-education/2.png)

A large portion of the sessions took place on Wednesday & Monday when working with professors or tutored. However, on Friday (personal project time) or during the rest of the week (even weekends), we can observe a lot of sessions being streamed. (40% of them!)

It shows that a tool like Flaneer allows students to work more freely and when they need to (or where they need to).

![]({{ site.url }}/imgs/2022-01-18-why-virtualization-is-the-future-for-education/3.png)

We believe Flaneer is the right tool to allow collaboration between students or between a student & a teacher. In our case, one can join the session of someone else & start working with him directly. Even more, if a student gets stuck using software, someone can immediately help him no matter where he is.

We counted 229 requests to join the session of another person, aka. 229 times where Flaneer helped two people work together.

![]({{ site.url }}/imgs/2022-01-18-why-virtualization-is-the-future-for-education/4.png)
*Number of invocation of the "join another session" function*

![]({{ site.url }}/imgs/2022-01-18-why-virtualization-is-the-future-for-education/5.png)
![]({{ site.url }}/imgs/2022-01-18-why-virtualization-is-the-future-for-education/6.png)

We strongly believe that sharing a session, and software per se, is the right way to collaborate. This solves hundreds of use cases, especially in a hybrid era when more & more will want to work from wherever they want.

One could ask if Flaneer was used by the entire batch of students or not; let's dive into that matter. We launched sessions for 77 distinct students, each launching between 1 & 55 sessions, streaming between 3 & 212 (!) hours. On average, students used Flaneer for 61 hours, launching on average 19 sessions

![]({{ site.url }}/imgs/2022-01-18-why-virtualization-is-the-future-for-education/7.png)

* 75% of the students used Flaneer for more than 20 hours
* 90% of the students used Flaneer for more than 10 hours.
* 25% of the students spent more than 85 hours on Flaneer!

## Bugs & Reports

We used a slack channel & a live chat on our web app to talk directly with teachers & students. Everyone at Flaneer is a firm believer in self-onboarding & direct customer relations.

That means that using Flaneer should be as simple as it can get and that whenever something is not going according to plan, anyone can directly talk to use and get an answer (yes, that's even true at 3 in the morning - we have pretty loud alarms & slack bots).

Most of the requests were solved in under 5 minutes, but we present here the requests that took above 5 minutes to get resolved or answered:

![]({{ site.url }}/imgs/2022-01-18-why-virtualization-is-the-future-for-education/8.png)

Only one issue took more than 20 minutes to get solved (we found a significant bug with the reset_password function that time). The other issues are available below:

![]({{ site.url }}/imgs/2022-01-18-why-virtualization-is-the-future-for-education/9.png)

→ No sessions were available: the student had to wait for ~10/15 minutes before a new one was available. This did not happen very often. (cf image below)
→ The session freeze. This was easy to solve most of the time, simply by closing the browser tab & reopening it.
→ Some files were deleted from the student session. That is the most problematic bug we had.

## Feedbacks

We received over fifty feedbacks from this beta test, and 95% of them were super positive. Regarding the overall quality of Flaneer:

* 50% of the students rated it a 5 out of 5
* 44% a 4 out of 5
* 6% a 1,2, or 3 out of 5.

We can also dive deeper into what the students liked & disliked. The most significant pain points we solved for the students are:

* The file management system, allowing them to keep & store files outside of their computer
* A life-saving solution when the laptop is a Chromebook or not good enough
* Using software without downloading & managing them
* How easy it was to use Flaneer
* Being able to work anywhere & to switch computers seamlessly

**Flaneer lets us achieve the type of teaching we want to do. We are not limited anymore by hardware or by long & complex talks with the IT department. Every teacher can now set up a workspace for their class in a matter of minutes. - Elie Hachem, Head of the Computing & Fluids Research Group @CEMEF - MINES Paristech**

Now, we also have to look at what went wrong:

* Some issues with the file management system, resulting in files being deleted for some users
* Some latency issues
* The streaming quality was sometimes too low (480p)

We were aware of some of these issues; we also believe that we still have a lot to work on regarding the sessions' shortcuts while it did not come out. We were limited by streaming only in a browser, but the client version of our protocol now solves that!

We also worked closely with several professors working on this test and solved license server issues for them.

## Conclusion

9 months later, we are still using the same recipe:

* The simplest user experience we can provide
* Software in the cloud, for everyone
* Collaboration, no matter the tools or the software people are using
* Providing support and feedbacks to our customers minutes or seconds after they need them

and are going for a lot more!

What’s your opinion about education & virtualization ? Feel free to comment or send me an email, I would love to have a chat with you!

Stay tuned for exciting Flaneer updates in the near future 🚀

You can also read more about us here: https://www.flaneer.com/blog/join-flaneer-engineering-team
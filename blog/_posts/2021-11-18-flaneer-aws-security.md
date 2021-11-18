---
layout: post
title: Flaneer + AWS, a story of Security
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

![]({{ site.url }}/imgs/2021-11-18-flaneer-aws-security/intro.png)

Most of Flaneer services are hosted on AWS. That means that whether it is user data, files, or virtual workstation, it will be hosted on an AWS server. This article will dive into how we do it, how we make sure it is as secure as it can be, and how it will evolve over time.

Saying that everyone is concerned about their data and privacy seems obvious. At Flaneer, we’re working with multiple layers of sensitive data:

* a company’s files system, such as Google Drive or One Drive
* a team’s data and connection information
* a user’s virtual workstation, aka its work, streaming over the internet
  
It is a necessity to build a safe and secure place for users to work.

The goals of this article are multiple. First, what is AWS and why do we consider it as a secure option? Then, how do we make it even safer? Finally, when will we switch to another cloud provider, especially a European one?

## How do we work with AWS?

### How do we work with AWS?

When you want to code something, be it a SaaS or a website, you will need to write code that will interact with a server. This server can store data or run some code. The critical part here is understanding where this particular server is and who is taking care of it. Most of the time, two solutions are possible (and being a startup working in infrastructure, trust me, it is not always an easy choice).

**Solution 1:** The company (here Flaneer, yours truly) will buy and manage its own hardware. This is a self-hosting solution.
**Solution 2:** The company (still Flaneer) will rent servers from someone else (a cloud provider). This is a cloud solution. While another company is renting you servers, they cannot access them. Only you are allowed to access and interact with them.

At this point, you probably guessed it: AWS was one of the possible cloud-provider we could go with. Other candidates are often:
* GCP (Google Cloud Platform)
* Azure (Microsoft)
and less often:
* AliCloud (Alibaba)
* Oracle
* OVH
and even some very small and local ones. However, the smaller the provider, the less reliable and flexible it will be. It will also be much harder to scale up (or down, that happens sometimes).

![]({{ site.url }}/imgs/2021-11-18-flaneer-aws-security/middle.png)

This is why we went with AWS. It is the biggest cloud provider in the world and the one we felt the most comfortable to start with. Before diving into how we work with AWS, we think this might be a good time to answer some of the questions we often get asked while onboarding customers.

### Why AWS and not another cloud provider?

* AWS is probably the safest cloud provider out there. Security being our number one priority, it seemed like a no-brainer, and it still seems like it.
* AWS is the most reliable cloud provider globally, with less than 2 hours of downtime per year. This is huge and can directly remove some cloud providers from the equation (looking at you OVH).
* The amount of services AWS offers is massive. This allows our engineering team to quickly (that means less time than to make lunch — although that would depend on where you live and what you consider a good lunch (looking at my co-founder and his healthy Burger King habit here)) try and iterate on new solutions.
* While not European, AWS has a lot of data centers in the world (cf Image 1). This allows us: 1. to easily use the closest servers to our customers; 2. to make sure these closest servers are actually close to the customer. On that note, since: Flaneer uses a French entity in Europe, and that most Flaneer users are European: this forces AWS to respect GDPR.

### Why are we not self-hosting?

When you think about it, this makes a lot of sense, especially for a startup building a new infrastructure service from scratch. This would allow us to offer much lower prices and to customize much more the hardware we can offer.

However, this is extremely [CapEx](https://www.investopedia.com/terms/c/capitalexpenditure.asp) intensive and requires many skills that two recently graduated engineers did not have at the beginning. [Messing with RaspberryPI](https://paulgrn.medium.com/the-pi-mobile-an-autonomous-car-made-with-lego-raspberrypi-and-deep-learning-629426feadbc), and [building small clusters](https://twitter.com/Paul_Grn/status/1384975623005908993?s=20) will not allow you to build massive infrastructure, trust me on that one.

However (trust our geeky side on that), we will work on that at some point during Flaneer’s life.

### Why are my data safe & secure?

You can read extensively about why AWS is secure here: https://aws.amazon.com/security/?nc=sn&loc=0.

As an example:

> AWS supports more security standards and compliance certifications than any other offering, including PCI-DSS, HIPAA/HITECH, FedRAMP, GDPR, FIPS 140–2, and NIST 800–171, helping satisfy compliance requirements for virtually every regulatory agency around the globe.

We talked a lot about how AWS is safe. But it is as safe as you make it. If you make a mistake, AWS will not save you: this is why we are extra cautious with every service we use. We’ll dive more into this subject in the next part.

## What do we do with AWS?

At Flaneer, we use a lot (and by a lot, I mean it) of AWS services. We want to give a brief overview of the main ones and how they are related to our user’s data and privacy.

You can read more about how we use AWS and we make it as secure as possible here in

* the rest of this [blog post](https://www.flaneer.com/blog/flaneer-aws-a-security-story)

If you are interested in working with us at [Flaneer](https://www.flaneer.com), we are looking for talented engineers. Feel free to [drop-by!](https://flaneer.notion.site/Careers-at-Flaneer-add020b854aa4bb498bd4d8455edb16c)

![png]({{ site.url }}/imgs/2021-10-28-serverless-shared-layers/flaneer.gif)
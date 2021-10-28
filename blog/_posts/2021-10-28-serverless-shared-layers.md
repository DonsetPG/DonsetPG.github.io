---
layout: post
title: Narya - Tracking and Evaluating Soccer Players
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

![]({{ site.url }}/imgs/2021-10-28-serverless-shared-layers/intro.png)

At Flaneer, we are working on a new kind of workplace: a digital and remote one. Thanks to Flaneer, everyone can now turn its workstation (be it a laptop, a tablet or even a phone) into a powerful cloud-computer (or DaaS).

If you’d rather work with teammates, you can join their session and collaborate seamlessly. Talk with each other, annotate each other’s work live, send snapshots… Flaneer is much more than a simple VDI/virtualization service.

To make our platform as fast and scalable as possible, we built most of it on top of the Serverless Framework, with the help of AWS Lambda. You can find the code related to this article in the following [Github repository](https://github.com/Flaneer/serverless-layer-builder).

[AWS Lambda](https://aws.amazon.com/fr/lambda/) lets you run code in response to events and automatically manages the underlying compute resources for you. You can use it to create and deploy application back-ends quickly and seamlessly integrate other AWS services. You won't have to manage any servers, and can simply focus on the code.

If your lambda functions are written in Python, you may need to use public libraries or private custom package. The goal of this article is to focus on [AWS Lambda Shared Layers](https://docs.aws.amazon.com/serverlessrepo/latest/devguide/sharing-lambda-layers.html), a common place where you can store common functions and libraries for all of your lambda functions. We provide an overview of how to build such layers in this article! Our shared layers will be based on both public libraries, and on custom internal code. Let's start with the architecture of shared layers!

# Serverless & Shared Layers Architecture

Our shared layer will follow the simple structure:

```
python
│   requirements.txt
└───internal_lib_1
│		│    code1.py
│		│    code2.py
└───internal_lib_2
│		│    code1.py
│		│    code2.py
└───lib
│    └───python3.8
│    │   └───site-packages
│    │   │    └───package1
```

We will then package this python folder as a shared layer that each lambda function will be able to use in the following manner:

```python
from internal_lib_1.code1 import f1
from internal_lib_2.code1 import f1_bis

import package1
def lambda_handler(event,context):
	 ...
```

## Add External Libraries to Serverless Projects

Installing the external libraries is pretty easy, you can use 2 methods. The first one is to directly install them in the right location with the following command:

```
#pip3 install PACKAGE -t ./python/lib/python3.8/site-packages

#For example with stripe:
pip3 install stripe -t ./python/lib/python3.8/site-packages
```

You will have to repeat this operation for each python version your lambda functions will have to use. You can also make this process quicker by building a requirements.txt file like the following one:

```
pandas==1.2.4
stripe==2.56.0
```

and install them with

```
pip3 install -r requirements.txt -t ./python/lib/python3.8/site-packages
```

### Add Internal codes to Serverless Projects

You can build internal library as you would build any usual python project: simply use the folder "internal_lib" as the root folder of your project. You will then be able to use it in your lambda functions without any troubles.

This is is something that is super useful when your project starts to get bigger and bigger. Most of your lambda functions will start to reuse the same objects or functions. It can also allow you to make custom class for other AWS services, such as DynamoDB or Cognito for example.

## Publish your Shared Layer

You can read more about how to publish your shared layer in:
* the rest of this [blog post](https://www.flaneer.com/blog/aws-lambda-shared-layers-for-python)
* our [Github repository](https://github.com/Flaneer/serverless-layer-builder)

If you are interested in working with us at [Flaneer](https://www.flaneer.com), we are looking for talented engineers. Feel free to [drop-by!](https://flaneer.notion.site/Careers-at-Flaneer-add020b854aa4bb498bd4d8455edb16c)

![png]({{ site.url }}/imgs/2021-10-28-serverless-shared-layers/flaneer.gif)
CiclaMi is one way to monitor the work in progress for the bicycle paths in Milan. The project started during a "Mobile and Networks" course, where web technologies and Android sensors (like geolocation) were explored.

CiclaMi now has *one codebase* that has both *web* and *mobile* functionalities.

CiclaMi Web App
===============

Shows a google map with markers. Allows you to navigate between markers, and see a detailed page.

How to run?
-----------

You will need a web server first: 

[mongoose](http://code.google.com/p/mongoose/ "Moongose") is a good choice.

Once you cloned the repository just run in the root:

    mongoose

Now you can open a browser window with:

    http://localhost:8080/index.html

CiclaMi Mobile (Hybrid) App
===========================

Shows a map with a crosshair and a marker at the user's position. Allows you to take a photo and upload it to a couchdb instance with current position and some description data.

How to run?
-----------

The android mobile project can be found here: [ciclami-android](https://github.com/colmarius/ciclami-android)
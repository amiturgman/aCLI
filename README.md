Anode Command Line Interface
=============================
ACLI is a command line interface, developed mainly for the use in the [anode project](http://anodejs.org).  
Before starting to work on this module, few other existing open source CLI (command line interface) components were evaluated, like

* [GCLI](https://github.com/mozilla/gcli)
* [JQuery Terminal](http://terminal.jcubic.pl/examples.php)
* [JQuery Console](http://neocotic.com/jquery-console)
* [JS Sandbox Console](http://josscrowcroft.github.com/javascript-sandbox-console)
* and more...

Each of the above components and the others that were examined had some of the required functionality, but did not support other features that we needed.  
The most suitable library for this task was the [GCLI](https://github.com/mozilla/gcli) component, which was the main inspiration for implementing ACLI, mostly at the area of the commands structure.  

Main Requirements
-----------------
In addition to the obvious requirements like adding commands, executing commands, command line history and so on, the following are the main requirements from this component

8. __Basic Commands__  
	Basic implementation for the `help`, `clear`, `cls` commands should be available in the component.

2. __Command Response__  
	A command can return any type of data like `html`, `text`, `json` or `jquery` object.

4. __Generic json view control__
	1. Provide a generic json-view control that visualizes a json object as an html table, that will be used when commands return `json` object as the execution result.
	2. The json view control will auto collapse data items that are deeper than a defined environment variable.
	
8. __Context__  
	The prompt label which is the label on the left side of the input text box, will show the current context of the console.  
	The context itself will be set by the code hosting acli, and will be copied to the results panel on each command execution to indicate the context in which the command was executed in.

1. __Manage environment variables__  
	Using the known `set` command 
	1. Publish/Subscribe to environment variables `Change` event.
	2. Use these variables as part of commands, using the `$` sign.
	3. Define these variables as default values for command arguments.
	4. User can define new environment variables.
	5. User can not delete environment variables not created by him.
	6. Environment variables can be _read-only_ to users, which means that the user will not be able to change them.
	7. Environment variable can be defined to be auto added to web requests when executing commands.

5. __Persistency__
	1. Command line history is persistent and loaded whenever the console is started, to reflect last history state.
	2. Plugins should be persistent, allowing each developer to plug-in his own commands.
	3. Environment variables should be persistent, and loaded when the console is started to reflect the last settings state.
	
3. __Extending the console with remote APIs exposing [docRouter](https://github.com/anodejs/node-docrouter) metadata__
	1. Provide the ability to integrate server-side commands (plugins) exposing docRouter meta data into the console.
		1. Plugins expose meta data with all required information for the console to compile it into a command.
		2. Commands can be invoked using `GET` or `POST` methods.
		3. Commands can define parameters that are sent as part of the `url template`, `query string` or in the `body`.
		2. Plugin commands can return any type of value (json, html).
		3. Plugin commands can define a client side handler method that will get the execution result and do some more processing before sending the result to be shown in the console.
		4. Plugin commands can define their style classes, if they return `html` result by either providing the style classes as part of the meta data, or providing the url to a `css` file.
	2. Manage plugins (install/uninstall) with persistency.		

6. __Tabs__
	1. A user will be able to work with few tabs _(sessions)_ of the console in parallel.
	2. All persistent data is stored per session.
	3. Sessions(and their persistent data) can be restored easilty based on the session id.
	4. Session can be created by opening a new browser tab, or by a programatically initialize another `acli` jquery plugin, with a new session id.
	
7. __Broadcast requrests__  
	[anode](http://anodejs.org) hosts its apps on top of azure, distributing the apps runing on top of it to all servers on the farm.  
	We need a way to invoke requests to all instances of the farm, collect the data and present it after it is collected.  
	This feature will mostly be used when collecting performance statistics, when we want to know the state of the app on all servers all together, and so.  
	
8. __My Board panel__  
	Sometimes, we would want to keep some of the results in front of us, rather than let them scroll out of the window and dissapear.  
	We need a way to dock such desired command results to keep them _always on_ screen.
	
	
Read more in the design document!

	
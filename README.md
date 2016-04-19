Anode Command Line Interface
=============================
ACLI is a command line interface, developed mainly for the use in the [anode project](http://anodejs.org).  

__A [Polymer](https://www.polymer-project.org/1.0/) control wrapping this component is now available [here](https://github.com/amiturgman/web-cli)__ 

Why developing a new CLI component?
-----------------------------------
Before starting to work on this module, few other existing open source CLI (command line interface) components were evaluated, like

* [GCLI](https://github.com/mozilla/gcli)
* [JQuery Terminal](http://terminal.jcubic.pl/examples.php)
* [JQuery Console](http://neocotic.com/jquery-console)
* [JS Sandbox Console](http://josscrowcroft.github.com/javascript-sandbox-console)
* and more...

Each of the above components and the others that were examined had some of the required functionality, but did not support other features that we needed.  
The most suitable library for this task was the [GCLI](https://github.com/mozilla/gcli) component, which was the main inspiration for implementing ACLI, mostly at the area of the commands structure.  

Features
--------
* Manages environment variables and use them as part of the command line.
* Supports plugins- remote commands integrated into the console, using [docRouter](https://github.com/anodejs/node-docrouter) metadata.  
	Supporting plugins with client side processing and styling.  
* Keeps command line history, plugins and environment variables in offline storage.
* _My Board_ feature to keep command execution results on-screen.
* Visualizes json data as an html table with auto collapsing deep elements.
* Supports working in parallel with few instances/tabs of the console.
* Supports broadcasting requests when working on a farm.


![Example for 'My Board' feature](https://github.com/amiturgman/aCLI/raw/master/cli_myboard.jpg "aCLI with My Board")

Getting Started
---------------
The following is an example of how to quickly start using the component.  
See the `basic` sample under the `samples` directory.  

html file:
	
	<body>

		<div class="cli-output" id="cliOutput"></div>
		<div class="cli-my-board" id="cliMyBoard">
			<div class="cli-my-board-close"></div>
			<div class="cli-my-board-title">My Board</div>
		</div>
		<div class="cli-input-container">
			<span class="cli-promptText" id="cliPrompt">></span>
			<input id="cliInput" class="cli-input" type="text">
		</div>

	</body>

js file:

    var cli =  $("#cliInput").cli(
           {
               resultsContainer: $("#cliOutput"),
               promptControl: $("#cliPrompt"),
               myBoard: $("#cliMyBoard"),
               environment: {user: { type: 'string', value: '', description: 'The current user' }},
               commands: getCommands(),
			   context: { some: 'object' },
               welcomeMessage: "Welcome to anode console!<br/>. Type <b>help</b> to start exploring the commands currently supported!<br/>"
           }
       );
	   
	// create default commands
    function getCommands() {
        var commands = [];

        var addCommand = {
            name: 'add',
            description: 'add two numbers',
            usage: 'add num1 num2',
            example: 'add 4 5',
            params: [
                {
                    name: 'num1',
                    description: 'first number',
                    type: 'number'
                },
                {
                    name: 'num2',
                    description: 'second number',
                    type: 'number'
                }
            ],
            exec: function(args, context) {
                return args.num1 + args.num2;
            }
        }

        var asyncCommand = {
            name: 'async',
            description: 'simulates async command',
            usage: 'async [text]',
            example: 'async',
            params: [
                {
                    name: 'text',
                    description: 'some text to show',
                    type: 'string',
                    defaultValue: null // make this an optional  argument
                }
            ],
            exec: function(args, context) {
                var promise = context.createPromise();

                // simulating some async long-processing action
                setTimeout(function(){
                    var result = args.text || "you didn't enter text";
                    promise.resolve(result);
                }, 1000);

                return promise;
            }
        }
		
		commands.push(addCommand);
		commands.push(asyncCommand);
		
        return commands;
    }

	
Advanced Use
------------
See `plugins` under `samples` folder for a node JS sample application that extends the console with commands from the server (plug-ins)!


Main Requirements
-----------------
Main requirements and detailed design can be found in the design.md file.

Enjoy!


	
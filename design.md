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
	
Design Solution
---------------
The `acli` component will be based on the jquery common library and will be implemented as a jquery plugin.  
Please refer to [this page](http://docs.jquery.com/Plugins/Authoring) to read on best practices for authoring jQuery plugins.
The following option arguments will be provided when initializing the plugin:

* `resultsContainer`- the container that will be used to display the commands execution result.
* `promptControl`- the control that will be used to display the prompt text.
* `myBoard`- the control that will be used to display the _My Board_ panel.
* `environment`- a collection of a pre-defined set of environment variables.
* `commands`- a collection of commands to add to the console.
* `welcomeMessage`- a message that will appear whenever the console starts.
* `sid`- the session id, used to partition session's persistent state.
* `plugins`- a collection of a pre-defined urls for plugins to load.
* `broadcastUrlGenerator`- a handler that will be called before invoking a _broadcast_ command. It gets a `url` as input, and returns an array of urls to call.
* `descriptionHandler`- a handler that is called whenever rendering a command help. It can do any manipultion on the description that will be displayed to the user.
* `context`- a context object that will be transferred to any execution method of the commands.

The following is an example for a basic initialization:

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

See more commands in the cli code under the addDefaultCommands() method.  
Advanced scenarios using plugins can be found under the adavanced sample folder.  

ACLI API
--------
All APIs exposed by ACLI plugin should be consumed according to the jQuery best practices as the following:

	initializeCliControl.cli('methodName', [arguments]);

The following APIs will be exposed to the application hosting the component:

* `env(setting, val, appOriginated, isEmpty)`- used to control the environment variables.  
	When called with no parameters, returns a copy of the current variables collection.  
	* `setting`- the name of the environment variable. When this is the only parameter that is passed, this is a `get` action which returns the variable value.
	* `val`- the value of the environment variable. Used to set an existing environment variable or create a new one.
	* `appOriginated`- applicative flag indicating whether the environment value was set by the application code or by the user. This is used to prevent users from changing _read-only_ environment variables.
	* `isEmpty`- applicative flag indicating if the value should be set to an empty value.
* `envEventsBroker()`- returns an events emitter object used to subscribe to `change` events of environment variables: 

		
		// get environment events broker
		var ebEnv = cli.cli('envEventsBroker');
		
		// bind to environment variable 'user' change events
		$(ebEnv).bind({
				userChanged: function(e, newUserValue) {
					// do something with the new user value
				}
		});

* `prompt(val)`- used to change the cli's prompt value.

* `writeMessage(type, msg)`- used to write messages on the screen, without connection executing a command:
	* `type`- should be one of the following: `info`, `warn` or `error`.
	* `msg`- the message to display.

Commands
--------

### Writing a command

A command contains the following properties:

* `name`- the name of the command. When a command is part of a group of commands, the name of the command will be preceded by the group name : 'commandGroupName commandName' (example in the above code).
* `description`- description of the command, which will be displayed when the user view the command help.
* `usage`- description of how to use the command.
* `example`- an example of a concrete command execution.
* `params`- a hash of parameters the command supports (detailed explanation later).
* `exec`- the function that will be called when the command was invoked by the user, passing the parsed arguments and context.
* `hidden`- boolean value indicates whether the command is listed when runing `help`.

#### The _params_ property
Each parameter defines the following properties:

* `name`- the name of the parameter.
* `short`- an optional switch that will be used to reference the parameter.
* `description`- description for the parameter.
* `type`- the type of the parameter, now supporting `string`, `number` and `boolean`.
* `defaultValue`- a default value for an argument, in case it was not provided in the command line  
	__Notes__
	* `boolean` parameter always defaults to `false` and ignores `defaultValue` property.
	* A parameter with no `defaultValue` is considered as `required`, while by providing a `defaultValue`, a parameter is considered as `optional`. 

#### The _exec_ method
The exec method is the handler that is called to handle the command execution, and have two arguments:

* `args`- a collection of the arguments and their values, after parsing the command line and validating their type.
* `context`- contains the following objects and methods
	* `appcontext`- the context that the `cli` component was initialized with.
	* `command`- a copy of the command object.
	* `env`- a copy of the environment variables collection.
	* `createPromise`- returns an object that supports long-processing/async commands, contains the following methods
		* `setProgress(progress)`- sets an indicator with a number in the range [0, 100] to indicate the progress.
		* `resolve(result)`- when the process completes, this methods trasfers the final result to be displayed on the results panel.  
		The result can be `text`, `html`, `jquery object` which will be displayed as is, or a `json` object which will be displayed using a generic internal json-view control.
	
#### Group of commands
To add a group of commands, we define a virtual _parent_ command, containing the group command name, and then all the sub-commands' name, will be preceeded by the group command name.
The following is an example for a group command with two subcommands:

	// this is a group of commands, under the `group` name 
	var groupCommand = {
		name: 'group',
		description: 'some group command'
	}
	var subCommand1 = {
		name: 'group command1',
		description: 'first command in group',
		usage: 'group command [param]',
		example: 'group command someParamValue',
		params: [{
			name: 'param',
			type: 'string',
			defaultValue: null // make it optional argument
		}],
		exec: function(args, context) {
			return args.param || 'param not provided';
		}
	}
	var subCommand2 = {
		name: 'group command2',
		description: 'second command in group',
		usage: 'group command2',
		example: 'group command2',
		exec: function(args, context) {
			return 'no parameters here, hello from exec method!';
		}
	}
	
	// add commands to array
	commands.push(groupCommand);
	commands.push(subCommand1);
	commands.push(subCommand2);
	
The following command will be used in further discussions and examples. It is also part of the basic sample package.  
	
	var sampleCommand = {
		name: 'sample',
		description: 'Sample command',
		usage: 'sample [requiredString1] [requiredString2]  [requiredNumber1] [optionalNumber1] [optionalNumber2]',
		example: 'sample aa bb 444 333 -l ffff -r',
		params: [
			{
				name: 'requiredString1',
				description: 'required string 1',
				type: 'string'
			},
			{
				name: 'requiredString2',
				description: 'required string 2',
				type: 'string'
			},
			{
				name: 'requiredNumber1',
				description: 'required number 1',
				type: 'number'
			},
			{
				name: 'optString1',
				description: 'optional string 1',
				type: 'string',
				defaultValue: 'optString1'
			},
			{
				name: 'optString2',
				short: 'a',
				description: 'optional string 2',
				type: 'string',
				defaultValue: 'optString2'
			},
			{
				name: 'optionalNumber1',
				short: 'b',
				description: 'optional number 1',
				type: 'number',
				defaultValue: 1234
			},
			{
				name: 'optionalNumber2',
				short: 'c',
				description: 'optional number 2',
				type: 'number',
				defaultValue: 222
			},
			{
				name: 'optionalNullNumber',
				short: 'd',
				description: 'optional null number 1',
				type: 'number',
				defaultValue: null
			},
			{
				name: 'switchBool1',
				short: 'e',
				description: 'boolean switch',
				type: 'boolean'
			},
			{
			   name: 'switchBool2',
			   short: 'f',
			   description: 'boolean switch',
			   type: 'boolean'
		   }

		],
		exec: function(args, context) {
			return "sample command args: " + JSON.stringify(args);
		}
	}

### Displaying a command execution result

Text, html or jquery objects returned from command execution methods are automatically added to a container that was pre-allocated for the 
command execution and was placed on the DOM where we would expect the result to be displayed.  
This cli should also support `json` result (hash object) to be returned from a command execution method. In this case, a generic json-view control should display the json object.  

The json-view control logic:  

* for each property, create a new table line with a name and value cells.
* if the value is another hash object, it recursively calls the same method for the value and displays the result table in the value cell, otherwise, it prints the value.
	
In addition to that, there's a pre-defined environment variable called `jsonViewCollapseLevel` which can be set, and controls the level of depth, 
after which the results in a json-view control are collapsed automatically.
	
### Executing a command

To execute a command, simply type its name, ie. `clear`. If the command has sub-commands, the name will be composed of the command name and the sub-command name, ie. `GroupCommandName subCommand`.
Following the command name, type the values for the command parameters, as described in the command's help parameters list.  

There are several ways to provide parameters to a command- 

* __By parameter index__- base on the order of the parameters defined for a command, type the command name and after that provide the values for each parameter, for example `sample aa bb 444` will match the `aa` to the `requiredString1` parameter, the `bb` to the `requiredString2` parameter, and the `444` to the `requiredNumber1` parameter. __Indexed values should always be provided first after the command name__.
* __By the parameter name__- base on the parameter's name, type `--`+parameter name to provide its value. This can be anywhere in the command line, but always after the indexed parameters values if provided.
* __By the parameter switch__- base on the parameter's switch, type `-`+parameter switch to provide its value. This can be anywhere in the command line, but always after the indexed parameters values if provided.

The following commands are equivalent:

	sample aa bb 444 cc -e --optionalNumber1 10 --switchBool2
	sample aa bb 444 -b 10 --optString1 cc -e -f
	sample aa bb --requiredNumber1 444 -b 10 --optString1 cc -e -f
	
* A `boolean` parameter is always optional and defaults to `false`. 
To set an optional parameter to `true`, simply add `--`+parameter name or `-`+parameter switch to the command line. No need to provide `true` after that. 
for example `set envParam -c` or `set envParam --clear` will clear the envParam environment value, by setting the `clear` boolean parameter to `true`.
* A string value containing space charachters can be provided by wrapping it with the `"` or `'` charachters as the following  


	sample 'string 1' "string 2" 444


Environment
-----------
The console maintains environment variables, used to control its behaviour as well as by the different commands.  
The following list is the current predefined environment variables designed to be included in the cli:

* `maxResults` used to control the max number of results being displayed.
* `maxHistory` used to control the max number of commands kept in history.
* `jsonViewCollapseLevel` used to control the level of depth after which the result in a json-view control are collapsed automatically.	

### Managing environment variables
The idea is to use the known `set` command from other consoles. For that, an internal `set` command will be implemented in the cli component.
The `set` command will work in 3 modes, _list_, _set_ and _get_:
* `set`- get list of all existing environment variables
* `set varname varvalue`- create a new environment variables `varname` and set it to `varvalue`.
* `set varname`- display the current value of `varname`.

More options in the `set command`
* use `set varname -c`, `set varname --clear` or `set varname ''` to clear an environment variable.  
* use `set varname -d` or `set varname --delete` to remove an environment variable from the list.  
* use `set -r` or `set --restore` to restore the environment variables collection to the original values.  
* use `set -o` or `set --online` to get a settings panel that gets updated online when an environment variable is changed.
* use `set -x` or `set --extend` to get an extended version of the settings collection.

### Environment variables as inputs for the command line
Environment variables will also be used as inputs for a command line parameter values.  
For example, the following will use the `str1` environment variable as a value for the `sample` command

	set str1 "some string"
	sample $str1 "string 2" 444

### Environment Variables Options
When the cli is initialized, a pre-defined set of environment variables can be provided. Each of the environment variable can contain the following properties:

* `type`- one of the following `string`, `number` or `boolean`.
* `value`- the initial value.
* `description`- short description for the use of this variable.
* `options`- an array of valid options which will be validated before changing the setting value, mostly used with `string` variables.
* `min`- minimum value for a `number` variable.
* `max`- maximum value for a `number` variable.
* `userReadOnly`- indicates that the user will not be able to change the value of this setting, and its value is managed by the application itself.
* `useAtQuery`- indicates that the value, if not empty or null, will be added to the query string when calling a plugin API via a web request.

### Persistency
The environment variables will be persistent. Whenever the console is started, the environment variables will be initialized with the last state from the
browser's local storage.

### Context
It is reasonable that the console's context will be dependant on the environment values.  
For that, after the application starts the cli component, it will be able to register for environment settings state change events, and then construct the `prompt` label based on them.
The following code shows an example for doing this:

	// get environment events broker
    var ebEnv = cli.cli('envEventsBroker');

    // bind to environment change events
    $(ebEnv).bind({
            userChanged: function(e, state) {
                updatePrompt();
            }
    });

    function updatePrompt() {
		// get current user from cli's environment variables
        var prompt = cli.cli('env', 'user') + '>';
		
		// set new prompt label
        cli.cli('prompt', prompt);
    }

The environment variables events broker triggers the following events

* `state`- whenever the state of the environment collection is changed / on every environment variable change.
* `xChanged`- where `x` is the environment variable- when the value of the environment variable `x` is changed.

In the example above, we would be able to subscribe to the `state` event, instead of subscribing to the `userChanged` event.


Tabs / Sessions and Persistency
-------------------------------
As any other jQuery component, ACLI should support initializing few parallel controls at the same time, on the same page.  
Since the component persists its state (command line history, environment variables and plugins data) in the browser's local storage, it needs a way to partition this data per each component instance.  
For that, when initializing a component, we can transfer a unique `sid` options variable for each instance, and it will be used to partition the offline storage data.  
This will be mostly used when creating few instances of the component on the same page.  

In addition to that, in cases that there's only one ACLI component initialized on a page, the component will support an internal command named `tab` 
that will use a new browser tab for creating a new session, passing the session id value as part of the command.
The new page will look for the value provided in the query string, and use this value for partitioning the offline data as described above.
Having this value on the query string, gives the developer the option to keep the session in his browser's favourites, and create different sessions for different applications.  


Docking Elements
----------------
Sometimes, we want to keep command execution results on screen. For that, a panel called `My Board` will be implemented as part of the CLI.  
An example for such use is the `set --online` command that results in the environment variables table, which is updated on every environment state change.  
The internal command `myboard` will toggle the _My Board_ panel, which will be positioned on the right side of the screen.  

There should be two ways of docking items in the _My Board_ panel:
* run `myboard --put` to take the last command result and move it into the _My Board_ panel.
* _experimental_- use the `CTRL` + mouse double click to make any command result draggable, and then drag it into the _My Board_ panel.

To close an item in the _My Board_ pannel, `CTRL` + mouse double click the item.

Clicking the _My Board_ title, will maximize/minimize the panel, while keeping it on screen.
To close _My Board_, click the `X` button, that will appear when hovering the panel.

An example:

	myboard
	set --online
	myboard --put


Plugins
-------
The console will enable extending it with commands generated out of metadata defined by the docRouter decorating a server side API.  

The sample package contains a `plugins` directory, with a _node_ application, using ACLI and extending it with a `someplugin` command.  
run `node index.js` and navigate your browser to `localhost:4000`, which will open the command line.  

The following scenarios and examples are taken from the sample application:

### Adding Simple Commands

Simple commands are commands that get parameters and return json/html to be displayed in the console as a result of executing the command with the provided parameters.
These commands do not require any client side logics. They are called by the console with the neccessary parameters provided, process the request and return the __final__ result which is displayed as is.
A command that returns a `json` result, will use a generic json-view control to display the object, any other result will be displayed as is (`html`).

In this manual we will refer to the `someplugin.js` file as an example to extending the console.

As can be seen, the file begins with the docRouter definition:
	
	app.use(docRouter(express.router, '/api/someplugin', function(app) {


Each method in the api file defines 

* a Verb- `GET` or `POST`- The console uses this info to invoke the method
* a set of parameters- Parameters are optional. Each parameter defines its 
	* `type`- The parameter type: `string`, `int`, `bool`.
	* `required`- `true`/`false`.
	* `style`- `template`- this parameter is expected to be provided as part if the url, `query`- as part of the querystring or `body`- as part of the post body.
	* `short`- an optional switch that will be used to refer that parameter in the command line.
	* `defaultValue`- a value that will be used if the parameter was not provided as part of the command line. In this case, the value is automatically considered as an optional parameter.
	* `defaultEnvVar`- defines an environment variable parameter name that will be used as a default value if the parameter was not provided. If it does not exist or empty, the default value will be used if provided as described above.
	
#### Sample 1:

The following is an example for a command that gets 3 parameters: `tparam1` and `tparam2` which are defined as a `template` parameters, and `qparam` which is defined as a `qurtystring` parameter.
The `tparam2` parameter has a `defaultValue` set, which means that as far of the console's concern, this is an optional parameter that will get the value provided in the `defaultValue` if not provided
in the command line.

	    app.get('/json/:tparam1/:tparam2', function(req, res) {
            var tparam1 = req.params.tparam1;
            var tparam2 = req.params.tparam2;
            var qparam = req.query['qparam'];

            var o = {tparam1: tparam1, tparam2: tparam2, qparam: qparam};
            res.writeHead(200, {'Content-Type': 'application/json' });
            res.end(JSON.stringify(o));
        },
        {
            id: 'sample_json',
			name: 'json',
			usage: 'json tparam1 qparam [tparam2]',
			example: 'json tparam1 qparamValue',
			doc: 'sample for a GET command getting template params and a query param',
			params: {
				"tparam1" : {
					"short": "b",
					"type": "string",
					"doc": "template param",
					"style": "template",
					"required": "true"
					},
				"qparam" : {
					"short": "q",
					"type": "string",
					"doc": "querty string param",
					"style": "query",
					"required": "true"
					},
				tparam2 : {
					"short": "a",
					"type": "string",
					"doc": "template param",
					"style": "template",
					"required": "true",
					"defaultValue": "someTemplateValue"
				}
			}
        }
    );

	
* The following command: `someplugin json 1 2` calls `GET /api/someplugin/json/1/someTemplateValue?qparam=2` and returns the result `{"tparam1":"1","tparam2":"someTemplateValue","qparam":"2"}`.  
* The following command: `someplugin json 1 2 3` calls `GET /api/someplugin/json/1/3?qparam=2` and returns the following result `{"tparam1":"1","tparam2":"3","qparam":"2"}`.  

__Required parameters should always be provided at the begining of the command__
		
#### Sample 2:

The following `someplugin html` command defines a required body parameter `bparam` and also an optional boolean parameter `flag`.  
Boolean parameters are always considered as optional and defaults to `false`. To set them to `true`, we should only add them to the command line.  
Notice that this time, the method uses the `POST` verb, and that the `bparam` parameter will be sent as part of the request's body.   

	    app.post('/html', function(req, res) {
                var flag = req.query.flag;
                res.writeHead(200, {'Content-Type': 'text/html' });
                res.end("<div style='background-color: red;'>HTML output: Template Param: "+req.params.tparam+
                    " Flag: " + flag +"</div>");
        },
            {
                id: 'sample_html',
                name: 'html',
                usage: 'html tparam qparam',
                example: 'html tparam qparam',
                doc: 'sample for a POST command getting a template param returning html',
                params: {
                    "bparam" : {
                            "short": "b",
                            "type": "string",
                            "doc": "template param",
                            "style": "body",
                            "required": "true"
                        },
                    "flag" : {
                        "short": "f",
                        "type": "bool",
                        "doc": "some boolean flag",
                        "style": "query",
                        "required": "true"
                    },

                }
            }
    );

* The following command: `someplugin html 1 -f` calls `POST /api/someplugin/html?flag=true` with a body `{bparam: 1}` and returns the result `<div style='background-color: red;'>HTML output: Template Param: 1 Flag: true</div>`.  
* The following command: `someplugin html 1` calls `/api/someplugin/html` with a body `{bparam: 1}` and returns the following result `<div style='background-color: red;'>HTML output: Template Param: 1 Flag: undefined</div>`.  

### Broadcasting Commands

A command also supports _broadcasting_, which means that the command will be executed on all servers of the farm, and the retrieved result collection will be displayed using the json-view control.
In this case, the returned result is expected to be a `json` object.

The following `someplugin bcast` command which defines the `broadcast` attribute as `true`, makes it a `broadcast` command. The result of this command will be a json-view of all instance id on the farm, go ahead and try it!.  

    app.get('/bcast', function(req, res) {
		res.writeHead(200, {'Content-Type': 'application/json' });
		res.end(JSON.stringify({server: req.query['server']}));
	},
	{
		id: 'sample_bcast',
		name: 'bcast',
		usage: 'sample bcast',
		example: 'sample bcast',
		doc: 'sample for a broadcasting command',
		broadcast: true
	});
	
On the client side, when initializing the ACLI component, it is important to provide the `broadcastUrlGenerator` 
which is responsible to get a url and return an array of urls to be used for collecting results from all servers in the farm.
	
### Advanced Commands

Commands that need any processing on the client side, are considered as advanced commands.
Such commands may be for example, commands that get `json` and present charts, or any other command that gets the results and make some further processing before displaying it to the user.  

Advanced command will define a `controller` attribute, in which a javascript file and a handler method name will be set.
The following `sample handler` command, will get two parameters, and the returned result will be transfered to the `handler` method in the `/plugins/someplugin.js` file.
The `controller.handler` attribute is optional and will override the default handler name which is the command name if defined.  


	    app.get('/handler/:tparam', function(req, res) {
                var tparam = req.params.tparam;
                var qparam = req.query['qparam'];

                var o = {tparam: tparam};
                res.writeHead(200, {'Content-Type': 'application/json' });
                res.end(JSON.stringify(o));
            },
            {
                id: 'sample_handler',
                name: 'handler',
                usage: 'handler',
                example: 'handler',
                doc: 'sample for a GET command using external handler',
                params: {
                    "tparam" : {
                        "short": "t",
                        "type": "string",
                        "doc": "template param",
                        "style": "template",
                        "required": "true"
                    }
                },
                controller: {
                    url: '../../plugins/someplugin.js',
                    handler: 'handler' // this is optional, the default will be the command name
                }
            }
    );

The following is the `/plugins/someplugin.js` file.  

    console.info('sample handler loaded');

    this.handler = function(error, response){
        if ($.query.get('debug')) debugger;
        var args = response.args;
        var context = response.context;
        var url = context.url;
        var env = context.env;
        var command = context.command;
        var data = response.data;

        var progress = 0;
        var intrvl = setInterval(function(){
            response.promise.setProgress(progress);
            if(progress==100) {
                clearInterval(intrvl);
                response.promise.resolve(
                        $("<div>").addClass('anode-sample').html(
                            'this is the client side plugin handler speaking.. got the following parametrs:' + JSON.stringify(args) +
                            '. got the following response: ' + JSON.stringify(data)));
            }
            progress+=10;
        }, 200);
    }
	
When the script is loaded, it is wrapped in a function and called with a `call` method, providing the context object. All handlers will be added to this context when executing the wrapped code.  
Since the script is loaded dynamically, you wan't be able to see it in the developer tools of Chrome/FireFox. One solution for this issue, is adding `if ($.query.get('debug')) debugger;`
statement to the begining of the method, and load the console with `?debug` at the query string. This will make the browser to stop at this line and allow you to debug it.  
When the script is loaded, it is attached as the command execute method.
When the console calls this method, it will pass an `error` and a `response` object.
The `response` object contains the following parameters:

* `args`- contains all arguments provided as part of the command line.
* `data`- contains the data returned from the api call.
* `promise`- an object that helps us manage the command response. This object contains the following methods:
	* `setProgress(percent)`- set a percentage indicator, use when the processing might be long and we would like to update the user on the progress that is made.
	* `resolve(res)`- used to end the command processing by passing the final result to the console. The result may be any string or html element.
* `context`- contains command execution related objects such as 
	* `url`- the url that was called .
	* `env`- a copy of the environment variable collection (so it won't be able to change it).
	* `command`- a copy of the command object if there's any need for details from it.
	 
Try executing `someplugin handler val` to see how it behaves.
	 
### Adding A Command Custom Style

If the controller needs any special stylesheet, on the server side, use the `cssUrl` or the `css` attributes as can be seen in the sample file for the `htmlbcast` and `handler` commands.

	controller: {
		css: '.anode-sample-class{ background-color: green; }'
	}
	
	controller: {
		url: '../../plugins/someplugin.js',
		cssUrl: '../../plugins/someplugin.css'
	}


__Note:__ It is very important to namespace your css classes to avoid impact on other elements in the DOM. In the example above, the style is namespaced with the `anode-sample` class.

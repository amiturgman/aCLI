Extending The Console
=====================
__Extending the console is easy!__

The console uses metadata defined by the docRouter module to generate the commands.  
In order to create another command, add a new file under the `repo/sys/console/api` folder. The command will be named after the new api file name.  

The api file should expose the following structure:

	module.exports =  { console: { autoLoad: true, router: expressRouter } };

When the `autoLoad` flag is set to `true`, it will make the plugin to be automatically integrated into the console when it is started.  
The `router` parameter is the express `router` object. Look at the api files for an example of how the apis are exposed.
	
Each API can contain any number of commands, all namespaced by the api file name. The console will generate a command for each of the methods in the api file. 
To execute a method (command), type the api file name and then the method name. ie, to execute `command1` in file `api1`, type `api1 command1` and then provide the params if required.

Adding Simple Commands
----------------------
Simple commands are commands that get parameters and return json/html to be displayed in the console as a result of executing the command with the provided parameters.
These commands do not require any client side logics. They are called by the console with the neccessary parameters provided, process the request and return the __final__ result which is displayed as is.
A command that returns a `json` result, will use a generic json-view control to display the object, any other result will be displayed as is (`html`).

Most of the commands currently implemented are _simple_ commands.

In this manual we will refer to the `sample.js` file as an example to extending the console.

As can be seen, the file begins with the docRouter definition, defining `/api/sample` as the root for this api:
	
	docRouter(router, '/api/sample', function (router) {


Each method in the api file defines 

* a Verb- `GET` or `POST`- The console uses this info to invoke the method
* a set of parameters- Parameters are optional. Each parameter defines its 
	* `type`- The parameter type: `string`, `int`, `bool`.
	* `required`- `true`/`false`.
	* `style`- `template`- this parameter is expected to be provided as part if the url, `query`- as part of the querystring or `body`- as part of the post body.
	* `short`- an optional switch that will be used to refer that parameter in the command line.
	* `defaultValue`- a value that will be used if the parameter was not provided as part of the command line. In this case, the value is automatically considered as an optional parameter.
	* `defaultEnvVar`- defines an environment variable parameter name that will be used as a default value if the parameter was not provided. If it does not exist or empty, the default value will be used if provided as described above.
	An example to using this option can be found in the `log.js` api file.
		

Sample 1:
---------
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

	
* The following command: `sample json 1 2` calls `GET /api/sample/json/1/someTemplateValue?qparam=2` and returns the result `{"tparam1":"1","tparam2":"someTemplateValue","qparam":"2"}`.  
* The following command: `sample json 1 2 3` calls `GET /api/sample/json/1/3?qparam=2` and returns the following result `{"tparam1":"1","tparam2":"3","qparam":"2"}`.  

__Required parameters should always be provided at the begining of the command__
		
Sample 2:
---------
The following `sample html` command defines a required bosy parameter `bparam` and also an optional boolean parameter `flag`.  
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

* The following command: `sample html 1 -f` calls `POST /api/sample/html?flag=true` with a body `{bparam: 1}` and returns the result `<div style='background-color: red;'>HTML output: Template Param: 1 Flag: true</div>`.  
* The following command: `sample html 1` calls `/api/sample/html` with a body `{bparam: 1}` and returns the following result `<div style='background-color: red;'>HTML output: Template Param: 1 Flag: undefined</div>`.  

Advanced Commands
=================
Commands that need any processing on the client side, are considered as advanced commands.
Such commands may be for example, commands that get `json` and present charts, or the current log command that gets the results and make some further processing before displaying it to the user.  

Advanced command will define a `controller` attribute, in which a javascript file and a handler method name will be set.
The following `sample handler` command, will get two parameters, and the returned result will be transfered to the `handler` method in the `/plugins/sample.js` file.
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
                    url: '../../plugins/sample.js',
                    handler: 'handler' // this is optional, the default will be the command name
                }
            }
    );

The following is the `/plugins/sample.js` file.  
The `anode.loadCss` and `anode.addCss` are discussed later on in the _Adding A Command Custom Style_ section.  

		console.info('sample handler loaded');

		// the following 2 lines are possible. in this case, the css are defined on the server side
		//anode.loadCss('plugins/sample.css');
		//anode.addCss(".anode-sample {width: 300px;border: 1px solid gray;background-color: rgba(236, 255, 117, 0.60);padding: 4px;}")

		// anode will always be in the global context in this stage as this script always loaded after anode is already initialized
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
	 
Try executing `sample handler val` to see how it behaves.
	 
Adding A Command Custom Style
-----------------------------
If the controller needs any special stylesheet, it can do so in few ways

* Use the `anode.loadCss(url)` command to load a css file and add it to the DOM.
* Use the `anode.addCss(style)` command to embed style classes.
* On the server side, use the `cssUrl` or the `css` attributes as can be seen in the sample file for the `htmlbcast` and `handler` commands.


	controller: {
		css: '.anode-sample-class{ background-color: green; }'
	}
	
	controller: {
		url: '../../plugins/sample.js',
		cssUrl: '../../plugins/sample.css'
	}


__Note:__ It is very important to namespace your css classes to avoid impact on other elements in the DOM. In the example above, the style is namespaced with the `anode-sample` class.


Adding Remote Management API
============================
Please type `man plugins` for information about how to create your own remote management API and integrate it into the console.


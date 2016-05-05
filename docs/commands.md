Command Line
============
Each command has its own format based on the command definition.  
A command may have a single action, such as the `log` command that gets logs, or multiple actions (sub-commands) such as the `pipeline` command (`pipeline trigger`, `pipeline rescore` and more).		
To see the list of parameters for a command, type `help commandName`, or `help commandName subCommand` for commands with more than one action.  
Typing `help command` on a command with more than one actions, will display the list of sub commands.

Command Parameters
------------------
Each command may define parameters, used by the command to execute an action.  	
Each parameter defines 

* `name`- the name of the parameter.
* `description`- short description for the parameter.
* `type`- currently supporting `string`, `number` and `boolean` types.
* an optional `default value`- if defined, the parameter is automatically considered as optional, otherwise it is required.
* an optional `Default Environment Variable`- if defined, the environment variable defined will be used to get the value needed for the command. If it does not exist in the environment variables, the `default value` will be used as described above.

Executing a Command
-------------------
To execute a command, simply type its name, ie. `log`. If the command has sub-commands, the name will be composed of the command name and the sub-command name, ie. `deploy status`.
Following the command name, type the values for the command parameters, as described in the command's help parameters list.  

There are several ways to provide parameters to a command- 

* __By parameter index__- base on the order of the parameters defined for a command, type the command name and after that provide the values for each parameter, for example `log rp.sys warn anodejs.cloudapp.net` will match the `rp.sys` to the `app` parameter, the `warn` to the `level` parameter, and the `anodejs` to the `farm` parameter. Indexed values should always be provided first after the command name.
* __By the parameter name__- base on the parameter's name, type `--`+parameter name to provide its value. This can be anywhere in the command line, but always after the indexed parameters values if provided.
* __By the parameter switch__- base on the parameter's switch, type `-`+parameter switch to provide its value. This can be anywhere in the command line, but always after the indexed parameters values if provided.

The following commands are equivalent:

	plugins install plugin1 api/plugin1/!! --persist
	plugins install --url api/plugin1/!! --name plugin1 -p
	
* A `boolean` parameter is always optional and defaults to `false`. 
To set an optional parameter to `true`, simply add `--`+parameter name or `-`+parameter switch to the command line. No need to provide `true` after that. 
for example `set farm -c` or `set farm --clear` will clear the farm environment value, by setting the `clear` boolean parameter to `true`.
* A string value containing space charachters can be provided by wrapping it with the `"` or `'` charachters as the following 

	log --message "some text to filter"
	log --message 'some text to filter'

Using Environment Variables
---------------------------
Providing a value for a command line parameter is easy as typing `$`+environment variable name.  
For example, the following will use the `mytop` environment variable as a value for the log command

	set mytop 10
	log --top $mytop


Environment Variables
=====================
The console maintains environment variables, used to control its behaviour as well as by the different commands.  
The following list is the current predefined environment variables, type `set` to see it:

* `maxResults` used to control the max number of results being displayed.
* `maxHistory` used to control the max number of commands kept in history.
* `jsonViewCollapseLevel` used to control the level of depth after which the result in a json-view control are collapsed automatically.
* `liveIterationsCount` used to control the number of command refreshes when using the `---live` flag.
* `app` defines the application on which we would like to act upon; used by most of the app-related commands as a default value.

Console's Context
-----------------
The prompt label on the left side of the command line, is the __context__ of the commands invoked.

For example, a command which defines a required parameter named `app`, will automatically use the value 
from the environment variable if available, without the need to provide it as part of the command line.
If the environment variable is not present or contains an empty value, a value will have to be provided
as part of the command line.

`
There's currently no validations for the environment values.
`

Adding Environment Variables
----------------------------
You can create new environment variables by simply typing `set name value`.  
Using environment values as part of a command is easy as typing `$varname`, for example `log --top $mytop` will use the `mytop` value from 
the environment variable when parsing and executing the command.

Managing Environment Variables
------------------------------
Type `set varname -c`, `set varname --clear` or `set varname ''` to clear an environment variable.  
Type `set varname -d` or `set varname --delete` to remove an environment variable from the list.  
Type `set -r` or `set --restore` to restore the environment variables collection to the original values.  

Persistency
-----------
The environment variables are persistent. Whenever the console is started, the environment variables are initialized with the last state from the
browser's local storage, keeping the context used last time.


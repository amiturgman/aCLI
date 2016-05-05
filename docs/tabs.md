Managing Parallel Console Sessions
==================================
As you probably already know by now, the console keeps the commands history, environment variables and the installed plugins in the browser's local storage, used to restore its state when initialized.  

The `tabs` feature allows you to open few console `sessions`. Each such session will keep all of the storage data listed above, partitioned by the optional `name` argument.  
Any time, you can go back to a session by just executing the command with the same session name.  
This way you will be able to create few sessions, each with its own set of environment variables, history and plugins related to it.  

For example, the following commands will create two sessions

```
tabs app1
tabs app2

```

Now, in each _session_ you are now able to create your own set of environment variables and install plugins.


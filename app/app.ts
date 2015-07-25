/// <reference path="../definitions/Q.d.ts"/>
/// <reference path="../definitions/node.d.ts"/>
import fs = require('fs');
import path = require('path');
import loader = require('./lib/loader');
import cm = require('./lib/common');
import am = require('./lib/auth');
import cnm = require('./lib/connection');

var minimist = require('minimist');

var mopts = {
  boolean: 'help',
  default: { help: false, username: '', password: '', authtype: 'pat' }
};

var options = minimist(process.argv.slice(2), mopts);
var args: string[] = options['_'];
delete options['_'];

var execPath = path.join(__dirname, 'exec');

var loaded = loader.load(execPath, args, 'help.js');
if (!loaded) {
    // should never get here since falls back to help.js
    console.error('no command found for: ' + args.toString());
    process.exit(1);
}

var cmdm = loaded.module;

if (!options.json && !cmdm.hideBanner) {
    console.log('Copyright Microsoft Corporation');
    console.log();
}

var cmd = cmdm.getCommand();

if (!cmd) {
    // implementation, list show help
    var scope = loaded.name == 'help' ? '' : loaded.name;
    console.log('showing help for scope: ' + scope);
    loader.getHelp(execPath, scope, options.all || false);
    process.exit(0);
}

// remove the args for the cmd - pass everything else to cmd
var csegs = loaded.name.split('-');
csegs.forEach((seg) => {
    args.splice(args.indexOf(seg), 1);
});

if (!cmdm.isServerOperation) {
    cmd.exec(args, options)
    .fail((err) => {
        console.error('Error: ' + err.message);
        process.exit(1);
    })    
}
else {
    var connection: cnm.TfsConnection;
    var collectionUrl: string;

    cnm.getCollectionUrl()
    .then((url: string) => {
        collectionUrl = url;
        
        return am.getCredentials(url, options.authtype);
    })
    .then((creds: am.ICredentials) => {
        connection = new cnm.TfsConnection(collectionUrl, creds);
        cmd.connection = connection;
        return cmd.exec(args, options);
    })
    .then((result: any) => {
        if (!result) {
            console.error('Error: did not return results');
            process.exit(1);
        }

        if (options.json && result) {
            console.log(JSON.stringify(result, null, 2));
        }
        else {
            cmd.output(result);
            console.log();
        }   
    })
    .fail((err) => {
        console.error('Error: ' + err.message);
        process.exit(1);
    })    
}

